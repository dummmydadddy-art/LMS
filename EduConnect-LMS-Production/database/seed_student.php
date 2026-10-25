<?php
/**
 * LMS Database Seed Script - Complete Student Profile
 * 
 * Creates a fully populated fictional student record with:
 * - Auth account + profile
 * - Course enrollment
 * - Batch assignment  
 * - Fee records + payment transactions
 * - Attendance records
 * - Exam results
 * - Assignment submissions
 * - Notifications
 * - Certificate
 * - Timetable entries
 *
 * Usage: php seed_student.php
 * Or via browser if hosted on a PHP server
 */

require_once __DIR__ . '/../backend/config.php';
require_once __DIR__ . '/../backend/db.php';

// Include supabaseCreateUser from index.php is complex, so we define it here directly
function seedCreateUser($email, $password, $metadata = []) {
    $body = [
        'email' => $email,
        'password' => $password,
        'email_confirm' => true,
        'user_metadata' => $metadata
    ];
    
    global $SUPABASE_PROJECT_URL, $SUPABASE_SERVICE_ROLE_KEY;
    $authUrl = rtrim($SUPABASE_PROJECT_URL, '/') . "/auth/v1/admin/users";
    
    $ch = curl_init($authUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'POST');
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($body));
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        "apikey: " . $SUPABASE_SERVICE_ROLE_KEY,
        "Authorization: Bearer " . $SUPABASE_SERVICE_ROLE_KEY,
        "Content-Type: application/json"
    ]);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    $decoded = json_decode($response, true);
    return [
        'success' => ($httpCode >= 200 && $httpCode < 300),
        'status' => $httpCode,
        'data' => $decoded,
        'error' => ($httpCode >= 300) ? ($decoded['message'] ?? $response) : null
    ];
}

header('Content-Type: application/json');

$results = [];
$studentId = null;

// ============================================================
// STEP 1: Create a Teacher first (needed for courses/batches)
// ============================================================
echo "\n=== STEP 1: Creating Teacher ===\n";
$teacherMeta = [
    'role_id' => 2,
    'full_name' => 'Dr. Priya Sharma',
    'mobile_number' => '9876543210'
];
$teacherRes = seedCreateUser('priya.sharma@lmsteacher.in', 'Teacher@123', $teacherMeta);
if ($teacherRes['success']) {
    $teacherId = $teacherRes['data']['id'];
    $results['teacher'] = ['status' => 'created', 'id' => $teacherId, 'name' => 'Dr. Priya Sharma'];
    echo "Teacher created: $teacherId\n";
} else {
    echo "Teacher creation failed: " . $teacherRes['error'] . "\n";
    echo "Trying to find existing teacher...\n";
    $existingTeacher = supabaseSelect('teachers', 'id', ['email' => 'eq.priya.sharma@lmsteacher.in'], true);
    if ($existingTeacher['success'] && !empty($existingTeacher['data'])) {
        $teacherId = $existingTeacher['data']['id'];
        $results['teacher'] = ['status' => 'existing', 'id' => $teacherId];
        echo "Found existing teacher: $teacherId\n";
    } else {
        $teacherId = null;
        $results['teacher'] = ['status' => 'skipped', 'error' => $teacherRes['error']];
        echo "No teacher available, continuing without...\n";
    }
}

// ============================================================
// STEP 2: Create Course
// ============================================================
echo "\n=== STEP 2: Creating Course ===\n";
$courseData = [
    'course_name' => 'Full Stack Web Development',
    'course_code' => 'FSWD-2025',
    'course_description' => 'A comprehensive 6-month program covering HTML, CSS, JavaScript, React, Node.js, Express, PostgreSQL, REST APIs, Git, deployment, and project-based learning. Students build 5 real-world projects including an e-commerce platform and social media dashboard.',
    'duration' => '6 Months',
    'fees' => 45000.00,
    'teacher_id' => $teacherId,
    'certificate_enabled' => true,
    'status' => 'ACTIVE'
];
$courseRes = supabaseInsert('courses', $courseData);
if ($courseRes['success'] && !empty($courseRes['data'])) {
    $courseId = is_array($courseRes['data']) && isset($courseRes['data'][0]) ? $courseRes['data'][0]['id'] : $courseRes['data']['id'];
    $results['course'] = ['status' => 'created', 'id' => $courseId, 'name' => 'Full Stack Web Development'];
    echo "Course created: $courseId\n";
} else {
    echo "Course creation failed: " . ($courseRes['error'] ?? 'Unknown') . "\n";
    // Try to find existing
    $existingCourse = supabaseSelect('courses', 'id', ['course_code' => 'eq.FSWD-2025'], true);
    if ($existingCourse['success'] && !empty($existingCourse['data'])) {
        $courseId = $existingCourse['data']['id'];
        $results['course'] = ['status' => 'existing', 'id' => $courseId];
        echo "Found existing course: $courseId\n";
    } else {
        die(json_encode(['error' => 'Cannot proceed without a course']));
    }
}

// Also create a second course for variety
$course2Data = [
    'course_name' => 'Data Science & Machine Learning',
    'course_code' => 'DSML-2025',
    'course_description' => 'An intensive 4-month program covering Python, NumPy, Pandas, Matplotlib, Scikit-learn, TensorFlow, deep learning fundamentals, data visualization, and capstone projects with real datasets.',
    'duration' => '4 Months',
    'fees' => 35000.00,
    'teacher_id' => $teacherId,
    'certificate_enabled' => true,
    'status' => 'ACTIVE'
];
$course2Res = supabaseInsert('courses', $course2Data);
$course2Id = null;
if ($course2Res['success'] && !empty($course2Res['data'])) {
    $course2Id = is_array($course2Res['data']) && isset($course2Res['data'][0]) ? $course2Res['data'][0]['id'] : $course2Res['data']['id'];
    $results['course2'] = ['status' => 'created', 'id' => $course2Id];
    echo "Course 2 created: $course2Id\n";
}

// ============================================================  
// STEP 3: Create Batch
// ============================================================
echo "\n=== STEP 3: Creating Batch ===\n";
$batchData = [
    'batch_name' => 'FSWD Morning Batch - Jan 2025',
    'course_id' => $courseId,
    'teacher_id' => $teacherId,
    'start_date' => '2025-01-15',
    'end_date' => '2025-07-15',
    'batch_timing' => '10:00 AM - 12:30 PM',
    'status' => 'ACTIVE'
];
$batchRes = supabaseInsert('batches', $batchData);
if ($batchRes['success'] && !empty($batchRes['data'])) {
    $batchId = is_array($batchRes['data']) && isset($batchRes['data'][0]) ? $batchRes['data'][0]['id'] : $batchRes['data']['id'];
    $results['batch'] = ['status' => 'created', 'id' => $batchId, 'name' => 'FSWD Morning Batch - Jan 2025'];
    echo "Batch created: $batchId\n";
} else {
    die(json_encode(['error' => 'Cannot proceed without a batch', 'detail' => $batchRes['error']]));
}

// ============================================================
// STEP 4: Create the Student (Arjun Mehta)
// ============================================================
echo "\n=== STEP 4: Creating Student - Arjun Mehta ===\n";
$studentMeta = [
    'role_id' => 3,
    'full_name' => 'Arjun Mehta',
    'mobile_number' => '9356968767',
    'address' => '42, Shanti Nagar, Near City Mall, Jaipur, Rajasthan 302019',
    'fee_amount' => 45000.00
];
$studentRes = seedCreateUser('arjun.mehta@lmsstudent.in', 'Student@123', $studentMeta);
if ($studentRes['success']) {
    $studentId = $studentRes['data']['id'];
    $results['student'] = [
        'status' => 'created',
        'id' => $studentId,
        'name' => 'Arjun Mehta',
        'email' => 'arjun.mehta@lmsstudent.in',
        'mobile' => '9356968767',
        'password' => 'Student@123'
    ];
    echo "Student created: $studentId\n";
} else {
    echo "Student creation failed: " . $studentRes['error'] . "\n";
    $existingStudent = supabaseSelect('students', 'id', ['email' => 'eq.arjun.mehta@lmsstudent.in'], true);
    if ($existingStudent['success'] && !empty($existingStudent['data'])) {
        $studentId = $existingStudent['data']['id'];
        $results['student'] = ['status' => 'existing', 'id' => $studentId];
        echo "Found existing student: $studentId\n";
    } else {
        die(json_encode(['error' => 'Cannot create or find student', 'detail' => $studentRes['error']]));
    }
}

// Wait a moment for the trigger to create profile rows
sleep(2);

// ============================================================
// STEP 5: Enroll Student in Course + Batch
// ============================================================
echo "\n=== STEP 5: Enrolling Student in Course & Batch ===\n";
$enrollCourse = supabaseInsert('student_courses', [
    'student_id' => $studentId,
    'course_id' => $courseId
]);
$results['enrollment_course'] = $enrollCourse['success'] ? 'enrolled' : 'failed: ' . ($enrollCourse['error'] ?? '');
echo "Course enrollment: " . ($enrollCourse['success'] ? 'OK' : 'FAILED') . "\n";

$enrollBatch = supabaseInsert('student_batches', [
    'student_id' => $studentId,
    'batch_id' => $batchId
]);
$results['enrollment_batch'] = $enrollBatch['success'] ? 'enrolled' : 'failed: ' . ($enrollBatch['error'] ?? '');
echo "Batch enrollment: " . ($enrollBatch['success'] ? 'OK' : 'FAILED') . "\n";

// Enroll in second course too if created
if ($course2Id) {
    supabaseInsert('student_courses', ['student_id' => $studentId, 'course_id' => $course2Id]);
}

// ============================================================
// STEP 6: Fee Records & Payment Transactions
// ============================================================
echo "\n=== STEP 6: Creating Fee Records & Payments ===\n";

// Update fee record (trigger should have created one, but let's update it)
supabaseUpdate('fee_records', [
    'total_amount' => 45000.00,
    'paid_amount' => 30000.00,
    'pending_amount' => 15000.00,
    'status' => 'PARTIAL'
], ['student_id' => $studentId]);

// Also update the student's fee columns
supabaseUpdate('students', [
    'fee_amount' => 45000.00,
    'fee_paid' => 30000.00,
    'fee_pending' => 15000.00
], ['id' => $studentId]);

$results['fees'] = ['total' => 45000, 'paid' => 30000, 'pending' => 15000, 'status' => 'PARTIAL'];
echo "Fee records updated\n";

// Payment Transaction 1 - Cash on admission
$pay1 = supabaseInsert('payment_transactions', [
    'student_id' => $studentId,
    'amount' => 15000.00,
    'payment_method' => 'CASH',
    'payment_status' => 'SUCCESS',
    'transaction_id' => 'CASH-20250115-001',
    'created_at' => '2025-01-15T10:00:00+05:30'
]);
echo "Payment 1 (Cash ₹15,000): " . ($pay1['success'] ? 'OK' : 'FAILED') . "\n";

// Payment Transaction 2 - Online via Razorpay
$pay2 = supabaseInsert('payment_transactions', [
    'student_id' => $studentId,
    'amount' => 10000.00,
    'payment_method' => 'ONLINE',
    'payment_status' => 'SUCCESS',
    'transaction_id' => 'pay_RzPy4x7mK9n2Qs',
    'created_at' => '2025-03-01T14:30:00+05:30'
]);
echo "Payment 2 (Online ₹10,000): " . ($pay2['success'] ? 'OK' : 'FAILED') . "\n";

// Payment Transaction 3 - Another cash payment
$pay3 = supabaseInsert('payment_transactions', [
    'student_id' => $studentId,
    'amount' => 5000.00,
    'payment_method' => 'CASH',
    'payment_status' => 'SUCCESS',
    'transaction_id' => 'CASH-20250410-002',
    'created_at' => '2025-04-10T11:00:00+05:30'
]);
echo "Payment 3 (Cash ₹5,000): " . ($pay3['success'] ? 'OK' : 'FAILED') . "\n";

$results['payments'] = [
    ['amount' => 15000, 'method' => 'CASH', 'date' => '2025-01-15'],
    ['amount' => 10000, 'method' => 'ONLINE', 'date' => '2025-03-01'],
    ['amount' => 5000, 'method' => 'CASH', 'date' => '2025-04-10']
];

// ============================================================
// STEP 7: Attendance Records (last 30 class days)
// ============================================================
echo "\n=== STEP 7: Creating Attendance Records ===\n";
$attendanceDays = [
    // Month, Day, Status
    ['2025-06-02', 'PRESENT'], ['2025-06-03', 'PRESENT'], ['2025-06-04', 'ABSENT'],
    ['2025-06-05', 'PRESENT'], ['2025-06-06', 'PRESENT'],
    ['2025-06-09', 'PRESENT'], ['2025-06-10', 'PRESENT'], ['2025-06-11', 'PRESENT'],
    ['2025-06-12', 'ABSENT'],  ['2025-06-13', 'PRESENT'],
    ['2025-06-16', 'PRESENT'], ['2025-06-17', 'PRESENT'], ['2025-06-18', 'PRESENT'],
    ['2025-06-19', 'PRESENT'], ['2025-06-20', 'PRESENT'],
    ['2025-06-23', 'PRESENT'], ['2025-06-24', 'ABSENT'],  ['2025-06-25', 'PRESENT'],
    ['2025-06-26', 'PRESENT'], ['2025-06-27', 'PRESENT'],
    ['2025-06-30', 'PRESENT'], ['2025-07-01', 'PRESENT'], ['2025-07-02', 'PRESENT'],
    ['2025-07-03', 'PRESENT'], ['2025-07-04', 'ABSENT'],
    ['2025-07-07', 'PRESENT'], ['2025-07-08', 'PRESENT'], ['2025-07-09', 'PRESENT'],
    ['2025-07-10', 'PRESENT'], ['2025-07-11', 'PRESENT'],
];

$presentCount = 0;
$absentCount = 0;
foreach ($attendanceDays as $day) {
    $attRes = supabaseInsert('attendance', [
        'student_id' => $studentId,
        'batch_id' => $batchId,
        'date' => $day[0],
        'status' => $day[1],
        'marked_by' => $teacherId
    ]);
    if ($day[1] === 'PRESENT') $presentCount++;
    else $absentCount++;
}
$results['attendance'] = ['total_days' => count($attendanceDays), 'present' => $presentCount, 'absent' => $absentCount, 'percentage' => round(($presentCount / count($attendanceDays)) * 100, 1) . '%'];
echo "Attendance: $presentCount present, $absentCount absent out of " . count($attendanceDays) . " days\n";

// ============================================================
// STEP 8: Study Materials
// ============================================================
echo "\n=== STEP 8: Creating Study Materials ===\n";
$materials = [
    ['title' => 'HTML & CSS Fundamentals', 'description' => 'Complete guide to HTML5 semantic elements and CSS3 flexbox/grid layouts', 'file_name' => 'html-css-fundamentals.pdf', 'file_url' => 'https://example.com/materials/html-css.pdf', 'file_type' => 'pdf'],
    ['title' => 'JavaScript ES6+ Deep Dive', 'description' => 'Arrow functions, destructuring, promises, async/await, modules', 'file_name' => 'js-es6-deep-dive.pdf', 'file_url' => 'https://example.com/materials/js-es6.pdf', 'file_type' => 'pdf'],
    ['title' => 'React Hooks Tutorial', 'description' => 'Video lecture covering useState, useEffect, useContext, custom hooks', 'file_name' => 'react-hooks-tutorial.mp4', 'file_url' => 'https://example.com/materials/react-hooks.mp4', 'file_type' => 'video'],
    ['title' => 'Node.js & Express REST API Notes', 'description' => 'Building RESTful APIs with Express, middleware, routing, error handling', 'file_name' => 'nodejs-express-notes.pdf', 'file_url' => 'https://example.com/materials/nodejs-express.pdf', 'file_type' => 'notes'],
    ['title' => 'PostgreSQL Database Design', 'description' => 'Normalization, indexing, joins, transactions, and query optimization', 'file_name' => 'postgresql-design.pdf', 'file_url' => 'https://example.com/materials/postgresql.pdf', 'file_type' => 'pdf'],
];
foreach ($materials as $mat) {
    $mat['course_id'] = $courseId;
    $mat['batch_id'] = $batchId;
    $mat['uploaded_by'] = $teacherId;
    supabaseInsert('materials', $mat);
}
$results['materials'] = count($materials) . ' materials created';
echo count($materials) . " materials created\n";

// ============================================================
// STEP 9: Assignments & Submissions
// ============================================================
echo "\n=== STEP 9: Creating Assignments & Submissions ===\n";
$assignment1 = supabaseInsert('assignments', [
    'title' => 'Build a Responsive Portfolio Website',
    'description' => 'Create a fully responsive personal portfolio using HTML, CSS, and vanilla JavaScript. Must include: hero section, about, projects gallery, contact form with validation.',
    'file_name' => 'portfolio-assignment.pdf',
    'file_url' => 'https://example.com/assignments/portfolio.pdf',
    'course_id' => $courseId,
    'batch_id' => $batchId,
    'due_date' => '2025-02-28T23:59:00+05:30',
    'uploaded_by' => $teacherId
]);
$assignment1Id = null;
if ($assignment1['success'] && !empty($assignment1['data'])) {
    $assignment1Id = is_array($assignment1['data']) && isset($assignment1['data'][0]) ? $assignment1['data'][0]['id'] : $assignment1['data']['id'];
    echo "Assignment 1 created: $assignment1Id\n";
    
    // Student submitted and was evaluated
    $sub1 = supabaseInsert('assignment_submissions', [
        'assignment_id' => $assignment1Id,
        'student_id' => $studentId,
        'file_name' => 'arjun-portfolio-v2.zip',
        'file_url' => 'https://example.com/submissions/arjun-portfolio.zip',
        'score' => 88.50,
        'feedback' => 'Excellent responsive design! Good use of CSS Grid. The contact form validation is thorough. Consider adding dark mode toggle and improving lighthouse performance score. Overall great work!',
        'evaluated_by' => $teacherId,
        'status' => 'EVALUATED'
    ]);
    echo "Submission 1: " . ($sub1['success'] ? 'OK' : 'FAILED') . "\n";
}

$assignment2 = supabaseInsert('assignments', [
    'title' => 'React Todo App with Context API',
    'description' => 'Build a todo application using React with Context API for state management. Features: CRUD operations, local storage persistence, filter by status, dark/light theme.',
    'file_name' => 'react-todo-assignment.pdf',
    'file_url' => 'https://example.com/assignments/react-todo.pdf',
    'course_id' => $courseId,
    'batch_id' => $batchId,
    'due_date' => '2025-04-15T23:59:00+05:30',
    'uploaded_by' => $teacherId
]);
$assignment2Id = null;
if ($assignment2['success'] && !empty($assignment2['data'])) {
    $assignment2Id = is_array($assignment2['data']) && isset($assignment2['data'][0]) ? $assignment2['data'][0]['id'] : $assignment2['data']['id'];
    echo "Assignment 2 created: $assignment2Id\n";
    
    $sub2 = supabaseInsert('assignment_submissions', [
        'assignment_id' => $assignment2Id,
        'student_id' => $studentId,
        'file_name' => 'arjun-react-todo.zip',
        'file_url' => 'https://example.com/submissions/arjun-react-todo.zip',
        'score' => 92.00,
        'feedback' => 'Outstanding implementation! Clean component architecture, proper use of Context API. The theme switcher is smooth. Bonus points for adding drag-and-drop reordering. Minor: could improve accessibility with ARIA labels.',
        'evaluated_by' => $teacherId,
        'status' => 'EVALUATED'
    ]);
    echo "Submission 2: " . ($sub2['success'] ? 'OK' : 'FAILED') . "\n";
}

$results['assignments'] = ['created' => 2, 'submitted' => 2, 'scores' => [88.5, 92.0]];

// ============================================================
// STEP 10: Exams & Results
// ============================================================
echo "\n=== STEP 10: Creating Exams & Results ===\n";

// MCQ Exam
$mcqExam = supabaseInsert('exams', [
    'title' => 'JavaScript Fundamentals - Mid Term',
    'exam_type' => 'MCQ',
    'course_id' => $courseId,
    'batch_id' => $batchId,
    'time_limit_minutes' => 45,
    'due_date' => '2025-03-15T10:00:00+05:30',
    'created_by' => $teacherId
]);
$mcqExamId = null;
if ($mcqExam['success'] && !empty($mcqExam['data'])) {
    $mcqExamId = is_array($mcqExam['data']) && isset($mcqExam['data'][0]) ? $mcqExam['data'][0]['id'] : $mcqExam['data']['id'];
    echo "MCQ Exam created: $mcqExamId\n";
    
    // Add some MCQ questions
    $questions = [
        ['text' => 'What is the output of typeof null in JavaScript?', 'marks' => 2, 'options' => [
            ['text' => 'null', 'correct' => false],
            ['text' => 'undefined', 'correct' => false],
            ['text' => 'object', 'correct' => true],
            ['text' => 'string', 'correct' => false]
        ]],
        ['text' => 'Which method converts JSON string to a JavaScript object?', 'marks' => 2, 'options' => [
            ['text' => 'JSON.stringify()', 'correct' => false],
            ['text' => 'JSON.parse()', 'correct' => true],
            ['text' => 'JSON.convert()', 'correct' => false],
            ['text' => 'JSON.decode()', 'correct' => false]
        ]],
        ['text' => 'What does the spread operator (...) do?', 'marks' => 2, 'options' => [
            ['text' => 'Creates a deep copy of objects', 'correct' => false],
            ['text' => 'Expands iterable elements', 'correct' => true],
            ['text' => 'Deletes object properties', 'correct' => false],
            ['text' => 'Merges two strings', 'correct' => false]
        ]],
        ['text' => 'Which hook is used for side effects in React?', 'marks' => 2, 'options' => [
            ['text' => 'useState', 'correct' => false],
            ['text' => 'useEffect', 'correct' => true],
            ['text' => 'useRef', 'correct' => false],
            ['text' => 'useMemo', 'correct' => false]
        ]],
        ['text' => 'What is a closure in JavaScript?', 'marks' => 2, 'options' => [
            ['text' => 'A function that has no return value', 'correct' => false],
            ['text' => 'A function bundled with its lexical scope', 'correct' => true],
            ['text' => 'A function that runs immediately', 'correct' => false],
            ['text' => 'A function that takes another function as argument', 'correct' => false]
        ]]
    ];
    
    foreach ($questions as $q) {
        $qRes = supabaseInsert('mcq_questions', [
            'exam_id' => $mcqExamId,
            'question_text' => $q['text'],
            'marks' => $q['marks']
        ]);
        if ($qRes['success'] && !empty($qRes['data'])) {
            $qId = is_array($qRes['data']) && isset($qRes['data'][0]) ? $qRes['data'][0]['id'] : $qRes['data']['id'];
            foreach ($q['options'] as $opt) {
                supabaseInsert('mcq_options', [
                    'question_id' => $qId,
                    'option_text' => $opt['text'],
                    'is_correct' => $opt['correct']
                ]);
            }
        }
    }
    echo count($questions) . " MCQ questions with options created\n";
    
    // Exam result for student
    $examResult1 = supabaseInsert('exam_results', [
        'exam_id' => $mcqExamId,
        'student_id' => $studentId,
        'score' => 8.00,
        'max_score' => 10.00,
        'feedback' => 'Good understanding of JavaScript fundamentals. Missed questions on closures and spread operator edge cases.',
        'evaluated_by' => $teacherId
    ]);
    echo "MCQ Exam Result: " . ($examResult1['success'] ? 'OK (8/10)' : 'FAILED') . "\n";
}

// Coding Exam
$codingExam = supabaseInsert('exams', [
    'title' => 'React & Node.js Practical - End Term',
    'exam_type' => 'CODING',
    'course_id' => $courseId,
    'batch_id' => $batchId,
    'time_limit_minutes' => 120,
    'due_date' => '2025-06-20T10:00:00+05:30',
    'created_by' => $teacherId
]);
$codingExamId = null;
if ($codingExam['success'] && !empty($codingExam['data'])) {
    $codingExamId = is_array($codingExam['data']) && isset($codingExam['data'][0]) ? $codingExam['data'][0]['id'] : $codingExam['data']['id'];
    echo "Coding Exam created: $codingExamId\n";
    
    $codingQ = supabaseInsert('coding_questions', [
        'exam_id' => $codingExamId,
        'question_text' => 'Build a RESTful Task Manager API',
        'description' => 'Create a Node.js/Express API with endpoints for CRUD operations on tasks. Include JWT authentication, input validation using Joi/Zod, error handling middleware, and connect to PostgreSQL. Write at least 3 unit tests.',
        'max_marks' => 50.00
    ]);
    $codingQId = null;
    if ($codingQ['success'] && !empty($codingQ['data'])) {
        $codingQId = is_array($codingQ['data']) && isset($codingQ['data'][0]) ? $codingQ['data'][0]['id'] : $codingQ['data']['id'];
        
        // Student's coding submission
        supabaseInsert('coding_submissions', [
            'exam_id' => $codingExamId,
            'coding_question_id' => $codingQId,
            'student_id' => $studentId,
            'solution_file_name' => 'arjun-task-manager-api.zip',
            'solution_file_url' => 'https://example.com/submissions/arjun-task-api.zip',
            'score' => 43.00,
            'feedback' => 'Well-structured API with clean code. JWT implementation is correct. Good error handling. Tests cover happy paths well but missing edge case tests. Excellent use of async/await.',
            'evaluated_by' => $teacherId,
            'status' => 'EVALUATED'
        ]);
        echo "Coding submission evaluated: 43/50\n";
    }
    
    // Exam result for coding exam
    supabaseInsert('exam_results', [
        'exam_id' => $codingExamId,
        'student_id' => $studentId,
        'score' => 43.00,
        'max_score' => 50.00,
        'feedback' => 'Strong practical skills demonstrated. Clean architecture and good test coverage.',
        'evaluated_by' => $teacherId
    ]);
}

$results['exams'] = [
    ['title' => 'JS Fundamentals MCQ', 'score' => '8/10'],
    ['title' => 'React & Node.js Practical', 'score' => '43/50']
];

// ============================================================
// STEP 11: Notifications
// ============================================================
echo "\n=== STEP 11: Creating Notifications ===\n";
$notifications = [
    [
        'title' => 'Welcome to Full Stack Web Development!',
        'message' => 'Dear Arjun, welcome to the FSWD program. Your classes start from Jan 15, 2025. Please check the timetable section for your schedule.',
        'target_type' => 'INDIVIDUAL_STUDENT',
        'target_id' => $studentId,
        'notification_type' => 'ANNOUNCEMENT',
        'created_at' => '2025-01-15T09:00:00+05:30'
    ],
    [
        'title' => 'Assignment Due: Portfolio Website',
        'message' => 'Reminder: The portfolio website assignment is due on Feb 28. Please submit your work before the deadline.',
        'target_type' => 'BATCH',
        'target_id' => $batchId,
        'notification_type' => 'ASSIGNMENT',
        'created_at' => '2025-02-25T10:00:00+05:30'
    ],
    [
        'title' => 'Mid-Term Exam Schedule',
        'message' => 'JavaScript Fundamentals MCQ exam is scheduled for March 15 at 10:00 AM. Duration: 45 minutes. Good luck!',
        'target_type' => 'COURSE',
        'target_id' => $courseId,
        'notification_type' => 'EXAM',
        'created_at' => '2025-03-10T09:00:00+05:30'
    ],
    [
        'title' => 'Fee Payment Reminder',
        'message' => 'Dear Arjun, you have a pending fee balance of ₹15,000. Please clear the balance at your earliest convenience.',
        'target_type' => 'INDIVIDUAL_STUDENT',
        'target_id' => $studentId,
        'notification_type' => 'GENERAL',
        'created_at' => '2025-05-01T09:00:00+05:30'
    ],
    [
        'title' => 'End-Term Coding Exam Results Published',
        'message' => 'Your end-term practical exam results are now available. Check your Academic Record section for scores and feedback.',
        'target_type' => 'BATCH',
        'target_id' => $batchId,
        'notification_type' => 'EXAM',
        'created_at' => '2025-06-25T14:00:00+05:30'
    ]
];
foreach ($notifications as $notif) {
    $notif['sender_id'] = $teacherId;
    supabaseInsert('notifications', $notif);
}
$results['notifications'] = count($notifications) . ' notifications created';
echo count($notifications) . " notifications created\n";

// ============================================================
// STEP 12: Timetable
// ============================================================
echo "\n=== STEP 12: Creating Timetable ===\n";
$timetableEntries = [
    ['day_of_week' => 'Monday', 'start_time' => '10:00:00', 'end_time' => '11:30:00', 'topic' => 'Frontend Development (React)'],
    ['day_of_week' => 'Monday', 'start_time' => '11:30:00', 'end_time' => '12:30:00', 'topic' => 'Lab Practice Session'],
    ['day_of_week' => 'Tuesday', 'start_time' => '10:00:00', 'end_time' => '11:30:00', 'topic' => 'Backend Development (Node.js/Express)'],
    ['day_of_week' => 'Tuesday', 'start_time' => '11:30:00', 'end_time' => '12:30:00', 'topic' => 'Database Design & SQL'],
    ['day_of_week' => 'Wednesday', 'start_time' => '10:00:00', 'end_time' => '11:30:00', 'topic' => 'JavaScript Advanced Concepts'],
    ['day_of_week' => 'Wednesday', 'start_time' => '11:30:00', 'end_time' => '12:30:00', 'topic' => 'Code Review & Doubt Session'],
    ['day_of_week' => 'Thursday', 'start_time' => '10:00:00', 'end_time' => '11:30:00', 'topic' => 'Full Stack Project Work'],
    ['day_of_week' => 'Thursday', 'start_time' => '11:30:00', 'end_time' => '12:30:00', 'topic' => 'Git & Deployment Workshop'],
    ['day_of_week' => 'Friday', 'start_time' => '10:00:00', 'end_time' => '11:30:00', 'topic' => 'API Design & Integration'],
    ['day_of_week' => 'Friday', 'start_time' => '11:30:00', 'end_time' => '12:30:00', 'topic' => 'Weekly Assessment & Quiz'],
    ['day_of_week' => 'Saturday', 'start_time' => '10:00:00', 'end_time' => '12:30:00', 'topic' => 'Project Presentation & Mentorship'],
];
foreach ($timetableEntries as $tt) {
    $tt['course_id'] = $courseId;
    $tt['batch_id'] = $batchId;
    $tt['teacher_id'] = $teacherId;
    supabaseInsert('timetable', $tt);
}
$results['timetable'] = count($timetableEntries) . ' timetable entries created';
echo count($timetableEntries) . " timetable entries created\n";

// ============================================================
// STEP 13: Certificate (for completed portion)
// ============================================================
echo "\n=== STEP 13: Creating Certificate ===\n";
$certId = 'CERT-FSWD-2025-' . strtoupper(substr(md5($studentId), 0, 8));
$certRes = supabaseInsert('certificates', [
    'student_id' => $studentId,
    'course_id' => $courseId,
    'completion_date' => '2025-07-15',
    'certificate_id' => $certId,
    'qr_code_url' => 'https://example.com/qr/' . $certId,
    'verification_url' => 'https://example.com/verify/' . $certId
]);
$results['certificate'] = ['id' => $certId, 'status' => $certRes['success'] ? 'created' : 'failed'];
echo "Certificate: " . ($certRes['success'] ? $certId : 'FAILED') . "\n";

// ============================================================
// FINAL SUMMARY
// ============================================================
echo "\n\n" . str_repeat('=', 60) . "\n";
echo "  SEED COMPLETE - STUDENT PROFILE SUMMARY\n";
echo str_repeat('=', 60) . "\n";
echo "  Name:     Arjun Mehta\n";
echo "  Email:    arjun.mehta@lmsstudent.in\n";
echo "  Password: Student@123\n";
echo "  Mobile:   9356968767\n";
echo "  Address:  42, Shanti Nagar, Jaipur, Rajasthan 302019\n";
echo "  Course:   Full Stack Web Development (FSWD-2025)\n";
echo "  Batch:    Morning Batch - Jan 2025\n";
echo "  Fees:     ₹45,000 total | ₹30,000 paid | ₹15,000 pending\n";
echo "  Attendance: 86.7% (26/30 present)\n";
echo "  Exams:    MCQ 8/10, Coding 43/50\n";
echo "  Assignments: Portfolio 88.5/100, React Todo 92/100\n";
echo str_repeat('=', 60) . "\n";
echo "\n  Teacher: Dr. Priya Sharma (priya.sharma@lmsteacher.in / Teacher@123)\n";
echo str_repeat('=', 60) . "\n";

echo "\n\nJSON Results:\n";
echo json_encode($results, JSON_PRETTY_PRINT) . "\n";
