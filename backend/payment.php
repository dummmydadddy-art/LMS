<?php
// Cosmos Digital LMS Payment Gateway Abstraction Layer

require_once 'db.php';

function createRazorpayOrder($amountInPaise, $receiptId) {
    global $PAYMENT_GATEWAY_KEY, $PAYMENT_GATEWAY_SECRET;
    
    $url = "https://api.razorpay.com/v1/orders";
    $auth = base64_encode($PAYMENT_GATEWAY_KEY . ":" . $PAYMENT_GATEWAY_SECRET);
    
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
        'amount' => $amountInPaise,
        'currency' => 'INR',
        'receipt' => $receiptId
    ]));
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        "Content-Type: application/json",
        "Authorization: Basic " . $auth
    ]);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);
    curl_close($ch);
    
    if ($error) {
        return ['success' => false, 'error' => $error];
    }
    
    $data = json_decode($response, true);
    if ($httpCode === 200 || $httpCode === 201) {
        return ['success' => true, 'order' => $data];
    } else {
        return ['success' => false, 'error' => $data['error']['description'] ?? $response];
    }
}

function createPayment($studentId, $amount, $paymentMethod) {
    global $PAYMENT_GATEWAY_KEY, $PAYMENT_GATEWAY_SECRET;

    if ($paymentMethod === 'ONLINE') {
        // 1. Generate local unique receipt ID
        $tempReceiptId = 'receipt_' . uniqid() . '_' . time();
        
        // 2. Create order in Razorpay (amount in paise)
        $amountInPaise = round((float)$amount * 100);
        $orderRes = createRazorpayOrder($amountInPaise, $tempReceiptId);
        
        if (!$orderRes['success']) {
            return ['success' => false, 'error' => 'Razorpay Order Error: ' . $orderRes['error'] . ' [Key: ' . $PAYMENT_GATEWAY_KEY . ', Secret: ' . substr($PAYMENT_GATEWAY_SECRET, 0, 4) . '...]'];
        }
        
        $order = $orderRes['order'];
        $orderId = $order['id']; // Razorpay Order ID
        
        // 3. Record transaction in database as PENDING, storing order_id in transaction_id column
        $transactionData = [
            'student_id' => $studentId,
            'amount' => (float)$amount,
            'payment_method' => 'ONLINE',
            'payment_status' => 'PENDING',
            'transaction_id' => $orderId, // Temp store order_id
            'invoice_url' => "/invoices/invoice_{$orderId}.json"
        ];
        
        $res = supabaseInsert('payment_transactions', $transactionData);
        if (!$res['success']) {
            return ['success' => false, 'error' => 'Database Error: ' . $res['error']];
        }
        
        $insertedTransaction = is_array($res['data']) ? $res['data'][0] : $res['data'];
        
        // 4. Retrieve student profile details for prefill
        $studentResult = supabaseSelect('students', 'full_name, email, mobile_number', ['id' => $studentId], true);
        $fullName = $studentResult['success'] && !empty($studentResult['data']) ? $studentResult['data']['full_name'] : 'Student';
        $email = $studentResult['success'] && !empty($studentResult['data']) ? $studentResult['data']['email'] : '';
        $mobile = $studentResult['success'] && !empty($studentResult['data']) ? $studentResult['data']['mobile_number'] : '';
        
        return [
            'success' => true,
            'transaction' => $insertedTransaction,
            'razorpay' => [
                'key_id' => $PAYMENT_GATEWAY_KEY,
                'amount' => $amountInPaise,
                'currency' => 'INR',
                'order_id' => $orderId,
                'transaction_id' => $insertedTransaction['id'], // Local row UUID
                'student_name' => $fullName,
                'student_email' => $email,
                'student_mobile' => $mobile
            ]
        ];
    } else {
        // Cash payment / Offline
        $transactionId = 'TXN_' . str_replace('.', '', uniqid('', true));
        $transactionData = [
            'student_id' => $studentId,
            'amount' => (float)$amount,
            'payment_method' => $paymentMethod,
            'payment_status' => 'SUCCESS',
            'transaction_id' => $transactionId,
            'invoice_url' => "/invoices/invoice_{$transactionId}.json"
        ];

        $res = supabaseInsert('payment_transactions', $transactionData);
        if (!$res['success']) {
            return ['success' => false, 'error' => $res['error']];
        }

        $insertedTransaction = is_array($res['data']) ? $res['data'][0] : $res['data'];
        updateLedgers($studentId, $amount);

        return [
            'success' => true,
            'transaction' => $insertedTransaction
        ];
    }
}

function verifyPayment($transactionId, $razorpayPaymentId = null, $razorpayOrderId = null, $razorpaySignature = null) {
    global $PAYMENT_GATEWAY_SECRET;

    // Look up transaction by ID (primary key) or transaction_id (order_id)
    $selectResult = supabaseSelect('payment_transactions', '*', ['id' => $transactionId], true);
    if (!$selectResult['success'] || empty($selectResult['data'])) {
        // Try fallback to search by order ID
        $selectResult = supabaseSelect('payment_transactions', '*', ['transaction_id' => $transactionId], true);
        if (!$selectResult['success'] || empty($selectResult['data'])) {
            return ['success' => false, 'error' => 'Transaction not found'];
        }
    }

    $transaction = $selectResult['data'];
    if ($transaction['payment_status'] === 'SUCCESS') {
        return ['success' => true, 'message' => 'Payment already verified', 'transaction' => $transaction];
    }

    // Verify signature for online payment
    if ($razorpayPaymentId !== null && $razorpayOrderId !== null && $razorpaySignature !== null) {
        $expectedSignature = hash_hmac('sha256', $razorpayOrderId . '|' . $razorpayPaymentId, $PAYMENT_GATEWAY_SECRET);
        if ($expectedSignature !== $razorpaySignature) {
            return ['success' => false, 'error' => 'Razorpay signature verification failed.'];
        }
        
        // Update status to SUCCESS, replace order ID with actual payment ID
        $updateResult = supabaseUpdate('payment_transactions', [
            'payment_status' => 'SUCCESS',
            'transaction_id' => $razorpayPaymentId
        ], ['id' => $transaction['id']]);
    } else {
        // Fallback or Cash verification
        $updateResult = supabaseUpdate('payment_transactions', ['payment_status' => 'SUCCESS'], ['id' => $transaction['id']]);
    }

    if (!$updateResult['success']) {
        return ['success' => false, 'error' => 'Failed to update transaction status'];
    }

    $updatedTransaction = is_array($updateResult['data']) ? $updateResult['data'][0] : $updateResult['data'];

    // Process ledger updates
    updateLedgers($transaction['student_id'], $transaction['amount']);

    return [
        'success' => true,
        'message' => 'Payment verified successfully',
        'transaction' => $updatedTransaction
    ];
}

function updateLedgers($studentId, $amount) {
    // 1. Update students table
    $studentResult = supabaseSelect('students', 'fee_paid, fee_pending', ['id' => $studentId], true);
    if ($studentResult['success'] && !empty($studentResult['data'])) {
        $student = $studentResult['data'];
        $newPaid = (float)$student['fee_paid'] + (float)$amount;
        $newPending = max(0.00, (float)$student['fee_pending'] - (float)$amount);
        
        supabaseUpdate('students', [
            'fee_paid' => $newPaid,
            'fee_pending' => $newPending
        ], ['id' => $studentId]);
    }

    // 2. Update fee_records table
    $feeResult = supabaseSelect('fee_records', 'total_amount, paid_amount, pending_amount', ['student_id' => $studentId], true);
    if ($feeResult['success'] && !empty($feeResult['data'])) {
        $feeRecord = $feeResult['data'];
        $newPaid = (float)$feeRecord['paid_amount'] + (float)$amount;
        $newPending = max(0.00, (float)$feeRecord['pending_amount'] - (float)$amount);
        
        $status = 'PARTIAL';
        if ($newPending <= 0.01) {
            $status = 'PAID';
        } else if ($newPaid <= 0.01) {
            $status = 'PENDING';
        }

        supabaseUpdate('fee_records', [
            'paid_amount' => $newPaid,
            'pending_amount' => $newPending,
            'status' => $status,
            'updated_at' => date('Y-m-d H:i:s')
        ], ['student_id' => $studentId]);
    }
}

function generateInvoice($studentId, $amount, $transactionId) {
    // Fetch student profile details
    $studentResult = supabaseSelect('students', 'full_name, email', ['id' => $studentId], true);
    $fullName = $studentResult['success'] ? $studentResult['data']['full_name'] : 'Student';
    $email = $studentResult['success'] ? $studentResult['data']['email'] : '';

    return [
        'invoice_id' => 'INV-' . strtoupper(substr(md5($transactionId), 0, 8)),
        'date' => date('Y-m-d'),
        'student_name' => $fullName,
        'student_email' => $email,
        'amount' => $amount,
        'transaction_id' => $transactionId,
        'status' => 'PAID',
        'item' => 'Cosmos Digital LMS Course Fee'
    ];
}

function downloadReceipt($transactionId) {
    // Return formatted receipt structure
    $txnRes = supabaseSelect('payment_transactions', '*', ['transaction_id' => $transactionId], true);
    if (!$txnRes['success'] || empty($txnRes['data'])) {
        return ['error' => 'Transaction not found'];
    }

    $txn = $txnRes['data'];
    $invoice = generateInvoice($txn['student_id'], $txn['amount'], $transactionId);
    
    return [
        'receipt_title' => 'Cosmos Digital LMS Payment Receipt',
        'invoice' => $invoice,
        'payment_method' => $txn['payment_method'],
        'payment_status' => $txn['payment_status'],
        'created_at' => $txn['created_at']
    ];
}
