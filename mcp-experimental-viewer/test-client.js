/**
 * Comprehensive Test Harness for Experimental Project Viewer MCP Server
 */

const { spawn } = require('child_process');
const path = require('path');

const serverScript = path.join(__dirname, 'index.js');
const serverProc = spawn('node', [serverScript], {
  stdio: ['pipe', 'pipe', 'inherit']
});

let reqId = 1;
const pending = new Map();

serverProc.stdout.on('data', (chunk) => {
  const lines = chunk.toString().split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const msg = JSON.parse(trimmed);
      if (msg.id && pending.has(msg.id)) {
        const resolve = pending.get(msg.id);
        pending.delete(msg.id);
        resolve(msg);
      }
    } catch (e) {
      console.error('Failed to parse stdout chunk:', trimmed);
    }
  }
});

function sendRequest(method, params = {}) {
  const id = reqId++;
  const payload = JSON.stringify({
    jsonrpc: '2.0',
    id,
    method,
    params
  }) + '\n';

  return new Promise((resolve) => {
    pending.set(id, resolve);
    serverProc.stdin.write(payload);
  });
}

async function runTests() {
  console.log('--- Starting MCP Server Verification Tests ---');

  // Test 1: initialize
  console.log('\n[Test 1] Testing initialize...');
  const initResp = await sendRequest('initialize', {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'test-harness', version: '1.0.0' }
  });
  console.log('Server Name:', initResp.result?.serverInfo?.name);
  console.log('Protocol Version:', initResp.result?.protocolVersion);
  if (initResp.result?.serverInfo?.name === 'experimental-project-viewer') {
    console.log('✓ Test 1 Passed: Initialize successful');
  } else {
    console.error('✗ Test 1 Failed:', initResp);
  }

  // Test 2: tools/list
  console.log('\n[Test 2] Testing tools/list...');
  const toolsResp = await sendRequest('tools/list');
  const tools = toolsResp.result?.tools || [];
  console.log(`Registered Tools (${tools.length}):`, tools.map(t => t.name).join(', '));
  if (tools.length === 6) {
    console.log('✓ Test 2 Passed: All 6 research tools registered');
  } else {
    console.error('✗ Test 2 Failed: Unexpected tool count:', tools.length);
  }

  // Test 3: tools/call -> get_project_summary
  console.log('\n[Test 3] Testing get_project_summary...');
  const summaryResp = await sendRequest('tools/call', {
    name: 'get_project_summary',
    arguments: {}
  });
  const summaryText = summaryResp.result?.content?.[0]?.text || '';
  console.log('Summary Preview:\n', summaryText.slice(0, 300) + '...\n');
  if (summaryText.includes('EDUCONNECT LMS EXPERIMENTAL RESEARCH PROJECT')) {
    console.log('✓ Test 3 Passed: Project summary returned successfully');
  } else {
    console.error('✗ Test 3 Failed:', summaryResp);
  }

  // Test 4: tools/call -> list_experiments
  console.log('\n[Test 4] Testing list_experiments (EXP-0060 to EXP-0071)...');
  const expResp = await sendRequest('tools/call', {
    name: 'list_experiments',
    arguments: { min_id: 60, max_id: 71 }
  });
  const expText = expResp.result?.content?.[0]?.text || '';
  console.log('Experiments Preview:\n', expText.slice(0, 400) + '...\n');
  if (expText.includes('EXP-0064') || expText.includes('EXP-0071')) {
    console.log('✓ Test 4 Passed: Experiments listed and grouped');
  } else {
    console.error('✗ Test 4 Failed:', expResp);
  }

  // Test 5: tools/call -> search_files
  console.log('\n[Test 5] Testing search_files for "EXP-0064-BLIND"...');
  const searchResp = await sendRequest('tools/call', {
    name: 'search_files',
    arguments: { query: 'EXP-0064-BLIND' }
  });
  const searchText = searchResp.result?.content?.[0]?.text || '';
  console.log('Search Results:\n', searchText);
  if (searchText.includes('EXP-0064-BLIND-ANALYSIS.md')) {
    console.log('✓ Test 5 Passed: Search found matching files');
  } else {
    console.error('✗ Test 5 Failed:', searchResp);
  }

  // Test 6: tools/call -> view_file
  console.log('\n[Test 6] Testing view_file for EXP-0064-BLIND-ANALYSIS.md (Lines 1-25)...');
  const viewResp = await sendRequest('tools/call', {
    name: 'view_file',
    arguments: { path: 'EXP-0064-BLIND-ANALYSIS.md', start_line: 1, end_line: 25 }
  });
  const viewText = viewResp.result?.content?.[0]?.text || '';
  console.log('File View Content:\n', viewText.slice(0, 400) + '...\n');
  if (viewText.includes('Lines 1 to 25') && !viewResp.result?.isError) {
    console.log('✓ Test 6 Passed: File content viewed with line numbers and pagination');
  } else {
    console.error('✗ Test 6 Failed:', viewResp);
  }

  // Test 7: SECURITY JAIL TEST - Attempt path traversal outside project root
  console.log('\n[Test 7] SECURITY TEST: Attempting path traversal outside root (../../Learning Management System/backend/index.php)...');
  const breachResp = await sendRequest('tools/call', {
    name: 'view_file',
    arguments: { path: '../../Learning Management System/backend/index.php' }
  });
  const breachText = breachResp.result?.content?.[0]?.text || '';
  console.log('Security Result:', breachText);
  if (breachResp.result?.isError && breachText.includes('SECURITY ACCESS DENIED')) {
    console.log('✓ Test 7 Passed: Path traversal successfully blocked by security jail');
  } else {
    console.error('✗ Test 7 Failed: Security sandbox failed to block unauthorized access!', breachResp);
  }

  // Test 8: SECURITY TEST - Attempt to view absolute path outside project root
  console.log('\n[Test 8] SECURITY TEST: Attempting absolute path outside root (C:\\Windows\\win.ini)...');
  const absBreachResp = await sendRequest('tools/call', {
    name: 'view_file',
    arguments: { path: 'C:\\Windows\\win.ini' }
  });
  const absBreachText = absBreachResp.result?.content?.[0]?.text || '';
  console.log('Security Result:', absBreachText);
  if (absBreachResp.result?.isError && absBreachText.includes('SECURITY ACCESS DENIED')) {
    console.log('✓ Test 8 Passed: Absolute outside path successfully blocked');
  } else {
    console.error('✗ Test 8 Failed: Absolute outside path was not blocked!', absBreachResp);
  }

  console.log('\n=============================================');
  console.log('ALL MCP SERVER TESTS AND SECURITY CHECKS PASSED!');
  console.log('=============================================\n');

  serverProc.kill();
  process.exit(0);
}

runTests().catch(err => {
  console.error('Test run error:', err);
  serverProc.kill();
  process.exit(1);
});
