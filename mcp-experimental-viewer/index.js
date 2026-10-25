#!/usr/bin/env node
/**
 * Experimental Project Viewer MCP Server
 * 
 * Strict Read-Only Model Context Protocol (MCP) server providing view-only access
 * to the EduConnect-LMS-Experimental project for Qwen and other LLM assistants.
 * 
 * Security & Sandbox Guarantees:
 * 1. Root Jailed: Locked strictly to D:\Collage project\EduConnect-LMS-Experimental.
 * 2. Read-Only: Absolutely NO file creation, deletion, editing, or copying capabilities.
 * 3. No Execution: No shell execution, no command execution, no network access.
 * 4. Token Safe: Line-ranged pagination and byte-limits for viewing large files.
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Target directory to lock access to
const TARGET_ROOT = path.resolve('D:/Collage project/EduConnect-LMS-Experimental');

// Ensure all console.log output goes to stderr so stdio JSON-RPC is never corrupted
console.log = (...args) => {
  process.stderr.write('[MCP-LOG] ' + args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' ') + '\n');
};
console.error = (...args) => {
  process.stderr.write('[MCP-ERR] ' + args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' ') + '\n');
};

/**
 * Check if a path is strictly inside the target root directory
 */
function isInsideTargetRoot(targetPath) {
  const normRoot = path.normalize(TARGET_ROOT).toLowerCase();
  const normTarget = path.normalize(targetPath).toLowerCase();
  if (normTarget === normRoot) return true;
  return normTarget.startsWith(normRoot + path.sep);
}

/**
 * Resolve and validate user path against project root jail
 */
function resolveSafePath(userPath = '') {
  let clean = String(userPath || '').trim();
  // Strip leading slashes
  clean = clean.replace(/^[/\\]+/, '');

  const resolved = path.resolve(TARGET_ROOT, clean);

  if (!isInsideTargetRoot(resolved)) {
    throw new Error(`SECURITY ACCESS DENIED: Path "${userPath}" is outside the allowed project directory.`);
  }

  // If path exists on disk, check for symlink escapes
  if (fs.existsSync(resolved)) {
    const real = fs.realpathSync(resolved);
    if (!isInsideTargetRoot(real)) {
      throw new Error(`SECURITY ACCESS DENIED: Symlink target "${real}" resolves outside the allowed project directory.`);
    }
    return real;
  }

  return resolved;
}

/**
 * Known binary file extensions
 */
const BINARY_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.ico', '.svg', '.webp',
  '.pdf', '.zip', '.tar', '.gz', '.7z', '.rar',
  '.pt', '.bin', '.onnx', '.safetensors', '.pkl', '.npy', '.npz',
  '.exe', '.dll', '.so', '.dylib', '.pyc', '.class',
  '.db', '.sqlite', '.sqlite3', '.wal', '.shm'
]);

function isBinaryFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return BINARY_EXTENSIONS.has(ext);
}

/**
 * Tool: list_directory
 */
function handleListDirectory(args) {
  const dirPath = resolveSafePath(args.path || '.');
  const recursive = Boolean(args.recursive);
  const filter = (args.filter || '').trim().toLowerCase();

  if (!fs.existsSync(dirPath)) {
    throw new Error(`Directory not found: "${args.path || '.'}"`);
  }

  const stat = fs.statSync(dirPath);
  if (!stat.isDirectory()) {
    throw new Error(`Path is not a directory: "${args.path || '.'}"`);
  }

  const entries = [];
  const MAX_ENTRIES = 250;

  function scan(currentDir, currentDepth) {
    if (entries.length >= MAX_ENTRIES) return;
    const items = fs.readdirSync(currentDir, { withFileTypes: true });

    for (const item of items) {
      if (entries.length >= MAX_ENTRIES) break;

      // Skip noise
      if (item.name === '.git' || item.name === 'node_modules' || item.name === '__pycache__' || item.name === '.pytest_cache') {
        continue;
      }

      const fullPath = path.join(currentDir, item.name);
      const relPath = path.relative(TARGET_ROOT, fullPath).replace(/\\/g, '/');

      if (filter && !item.name.toLowerCase().includes(filter) && !relPath.toLowerCase().includes(filter)) {
        if (item.isDirectory() && recursive && currentDepth < 3) {
          scan(fullPath, currentDepth + 1);
        }
        continue;
      }

      try {
        const itemStat = fs.statSync(fullPath);
        entries.push({
          name: item.name,
          path: relPath,
          isDirectory: item.isDirectory(),
          sizeBytes: item.isDirectory() ? null : itemStat.size,
          lastModified: itemStat.mtime.toISOString().split('T')[0]
        });
      } catch (e) {
        // Skip unreadable files
      }

      if (item.isDirectory() && recursive && currentDepth < 3) {
        scan(fullPath, currentDepth + 1);
      }
    }
  }

  scan(dirPath, 1);

  const displayList = entries.map(e => {
    const typeLabel = e.isDirectory ? '[DIR] ' : '      ';
    const sizeLabel = e.isDirectory ? '<DIR>' : `${(e.sizeBytes / 1024).toFixed(1)} KB`;
    return `${typeLabel} ${e.path.padEnd(50, ' ')} | ${sizeLabel.padStart(10, ' ')} | ${e.lastModified}`;
  }).join('\n');

  const header = `Listing: ${path.relative(TARGET_ROOT, dirPath).replace(/\\/g, '/') || '.'} (Total items: ${entries.length}${entries.length >= MAX_ENTRIES ? ' [Capped at 250 items]' : ''})\n` +
                 `Type   Path                                               |       Size | Modified\n` +
                 `--------------------------------------------------------------------------------------\n`;

  return header + (displayList || '(Empty directory)');
}

/**
 * Tool: view_file
 */
function handleViewFile(args) {
  if (!args.path) {
    throw new Error('Argument "path" is required for view_file.');
  }

  const filePath = resolveSafePath(args.path);

  if (!fs.existsSync(filePath)) {
    throw new Error(`File does not exist: "${args.path}"`);
  }

  const stat = fs.statSync(filePath);
  if (stat.isDirectory()) {
    throw new Error(`Path "${args.path}" is a directory. Use list_directory to view folders.`);
  }

  const relPath = path.relative(TARGET_ROOT, filePath).replace(/\\/g, '/');

  if (isBinaryFile(filePath)) {
    return `[Binary file: "${relPath}", size: ${stat.size} bytes (${(stat.size / 1024).toFixed(1)} KB)]\n` +
           `This is a binary file (such as a model weight, image, or database file) and cannot be viewed as plain text.\n` +
           `Inspect associated metadata, documentation, or JSON/Markdown experiment reports instead.`;
  }

  // Read content as utf-8
  const rawContent = fs.readFileSync(filePath, 'utf8');
  const lines = rawContent.split(/\r?\n/);
  const totalLines = lines.length;

  const startLine = Math.max(1, parseInt(args.start_line, 10) || 1);
  const maxLinesAllowed = 300;
  const defaultEndLine = Math.min(totalLines, startLine + maxLinesAllowed - 1);
  const endLine = Math.min(totalLines, Math.max(startLine, parseInt(args.end_line, 10) || defaultEndLine));

  // Slice lines (1-indexed)
  const slicedLines = lines.slice(startLine - 1, endLine);

  const formattedLines = slicedLines.map((lineText, idx) => {
    const lineNum = startLine + idx;
    return `${String(lineNum).padStart(5, ' ')} | ${lineText}`;
  }).join('\n');

  let output = `File: ${relPath}\n`;
  output += `Total Lines: ${totalLines} | File Size: ${(stat.size / 1024).toFixed(1)} KB | Viewing: Lines ${startLine} to ${endLine}\n`;
  output += `================================================================================\n`;
  output += formattedLines + '\n';
  output += `================================================================================\n`;

  if (endLine < totalLines) {
    output += `[Viewing truncated at line ${endLine} of ${totalLines}. Call view_file with path: "${relPath}", start_line: ${endLine + 1} to continue reading.]\n`;
  }

  return output;
}

/**
 * Tool: search_files
 */
function handleSearchFiles(args) {
  const query = (args.query || args.pattern || '').trim().toLowerCase();
  if (!query) {
    throw new Error('Argument "query" is required for search_files.');
  }

  const maxResults = Math.min(100, Math.max(1, parseInt(args.max_results, 10) || 40));
  const results = [];

  function scan(currentDir) {
    if (results.length >= maxResults) return;
    const items = fs.readdirSync(currentDir, { withFileTypes: true });

    for (const item of items) {
      if (results.length >= maxResults) break;

      if (item.name === '.git' || item.name === 'node_modules' || item.name === '__pycache__' || item.name === '.pytest_cache') {
        continue;
      }

      const fullPath = path.join(currentDir, item.name);
      const relPath = path.relative(TARGET_ROOT, fullPath).replace(/\\/g, '/');

      if (item.name.toLowerCase().includes(query) || relPath.toLowerCase().includes(query)) {
        try {
          const stat = fs.statSync(fullPath);
          results.push({
            path: relPath,
            isDirectory: item.isDirectory(),
            size: item.isDirectory() ? null : stat.size
          });
        } catch (e) {}
      }

      if (item.isDirectory()) {
        scan(fullPath);
      }
    }
  }

  scan(TARGET_ROOT);

  if (results.length === 0) {
    return `No files or directories matching query "${query}" found in project.`;
  }

  const lines = results.map(r => {
    const typeLabel = r.isDirectory ? '[DIR] ' : '      ';
    const size = r.isDirectory ? '' : ` (${(r.size / 1024).toFixed(1)} KB)`;
    return `- ${typeLabel}${r.path}${size}`;
  });

  return `Found ${results.length} matches for "${query}":\n` + lines.join('\n');
}

/**
 * Tool: grep_content
 */
function handleGrepContent(args) {
  const query = (args.query || '').trim();
  if (!query) {
    throw new Error('Argument "query" is required for grep_content.');
  }

  const extFilter = (args.extension || '').trim().toLowerCase();
  const maxResults = Math.min(100, Math.max(1, parseInt(args.max_results, 10) || 30));
  const isRegex = Boolean(args.is_regex);

  let searchRegex;
  try {
    searchRegex = isRegex ? new RegExp(query, 'i') : new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  } catch (err) {
    throw new Error(`Invalid search pattern: ${err.message}`);
  }

  const matches = [];

  function scan(currentDir) {
    if (matches.length >= maxResults) return;
    const items = fs.readdirSync(currentDir, { withFileTypes: true });

    for (const item of items) {
      if (matches.length >= maxResults) break;

      if (item.name === '.git' || item.name === 'node_modules' || item.name === '__pycache__' || item.name === '.pytest_cache' || item.name === 'logs') {
        continue;
      }

      const fullPath = path.join(currentDir, item.name);
      if (item.isDirectory()) {
        scan(fullPath);
      } else {
        const ext = path.extname(item.name).toLowerCase();
        if (BINARY_EXTENSIONS.has(ext)) continue;
        if (extFilter && ext !== extFilter && !item.name.toLowerCase().endsWith(extFilter)) continue;

        try {
          const content = fs.readFileSync(fullPath, 'utf8');
          const lines = content.split(/\r?\n/);
          const relPath = path.relative(TARGET_ROOT, fullPath).replace(/\\/g, '/');

          for (let i = 0; i < lines.length; i++) {
            if (searchRegex.test(lines[i])) {
              matches.push({
                file: relPath,
                lineNumber: i + 1,
                lineText: lines[i].trim()
              });
              if (matches.length >= maxResults) break;
            }
          }
        } catch (e) {
          // Skip unreadable files
        }
      }
    }
  }

  scan(TARGET_ROOT);

  if (matches.length === 0) {
    return `No content matching "${query}" found${extFilter ? ` with extension "${extFilter}"` : ''}.`;
  }

  const output = [`Found ${matches.length} matches for "${query}":`];
  for (const m of matches) {
    output.push(`${m.file}:${m.lineNumber}: ${m.lineText}`);
  }

  if (matches.length >= maxResults) {
    output.push(`\n[Results capped at ${maxResults} matches. Refine your query or specify an extension.]`);
  }

  return output.join('\n');
}

/**
 * Tool: list_experiments
 */
function handleListExperiments(args) {
  const minId = parseInt(args.min_id, 10) || 0;
  const maxId = parseInt(args.max_id, 10) || 9999;
  const topicFilter = (args.topic || '').trim().toLowerCase();

  const expMap = new Map(); // expNumber -> { idStr, reports: [], data: [], scripts: [] }

  const files = fs.readdirSync(TARGET_ROOT);
  for (const f of files) {
    const match = f.match(/^EXP-(\d+)/i);
    if (match) {
      const expNum = parseInt(match[1], 10);
      if (expNum >= minId && expNum <= maxId) {
        if (!expMap.has(expNum)) {
          expMap.set(expNum, { idStr: `EXP-${String(expNum).padStart(4, '0')}`, files: [] });
        }
        expMap.get(expNum).files.push(f);
      }
    }
  }

  // Also check research/ directory for experiment analyzers
  const researchDir = path.join(TARGET_ROOT, 'research');
  if (fs.existsSync(researchDir)) {
    const rFiles = fs.readdirSync(researchDir);
    for (const rf of rFiles) {
      const match = rf.match(/exp(\d+)/i);
      if (match) {
        const expNum = parseInt(match[1], 10);
        if (expNum >= minId && expNum <= maxId) {
          if (!expMap.has(expNum)) {
            expMap.set(expNum, { idStr: `EXP-${String(expNum).padStart(4, '0')}`, files: [] });
          }
          expMap.get(expNum).files.push(`research/${rf}`);
        }
      }
    }
  }

  // Sort by expNum ascending
  const sortedExpNums = Array.from(expMap.keys()).sort((a, b) => a - b);
  const result = [];

  for (const num of sortedExpNums) {
    const exp = expMap.get(num);
    const allFilesStr = exp.files.join(' ');
    if (topicFilter && !allFilesStr.toLowerCase().includes(topicFilter)) {
      continue;
    }

    const keyReport = exp.files.find(f => f.endsWith('.md') && (f.includes('REPORT') || f.includes('ANALYSIS'))) || exp.files.find(f => f.endsWith('.md')) || exp.files[0];

    result.push({
      experiment: exp.idStr,
      keyReport: keyReport,
      totalFiles: exp.files.length,
      sampleFiles: exp.files.slice(0, 5)
    });
  }

  if (result.length === 0) {
    return `No experiments found in range [${minId} - ${maxId}]${topicFilter ? ` matching topic "${topicFilter}"` : ''}.`;
  }

  let out = `Found ${result.length} Experiment Sets in EduConnect-LMS-Experimental:\n`;
  out += `================================================================================\n`;
  for (const r of result) {
    out += `\n[${r.experiment}] (Total files: ${r.totalFiles})\n`;
    out += `  Primary Report: ${r.keyReport}\n`;
    out += `  Files: ${r.sampleFiles.join(', ')}${r.totalFiles > 5 ? `, ... (+${r.totalFiles - 5} more)` : ''}\n`;
  }

  out += `\nTip: Use view_file with path: "<Primary Report>" to read the experimental hypothesis, methodology, and verified results.`;
  return out;
}

/**
 * Tool: get_project_summary
 */
function handleGetProjectSummary() {
  const summary = `
================================================================================
  EDUCONNECT LMS EXPERIMENTAL RESEARCH PROJECT - MCP VIEW-ONLY ACCESS
================================================================================
Location: D:\\Collage project\\EduConnect-LMS-Experimental
Permissions: STRICTLY READ-ONLY (Viewing & Researching only - No file writes/copies)

1. PROJECT RESEARCH GOAL:
   This repository contains the rigorous empirical research, benchmarking, and
   architectural evolution of an AI-native Educational Platform with Advanced RAG,
   Corrective Retrieval (CRAG), Tier-2 Semantic Contradiction/NLI Verification,
   Multi-modal Visual Retrieval (ColSmol), and Strict Groundedness Audits.

2. KEY REPOSITORY SECTIONS:
   - Root Experiment Reports: EXP-0001 through EXP-0071 Markdown and JSON reports
     documenting hypothesis tests, blind benchmarks, and ablation studies.
   - research/:
     * research/benchmarks/          - Quantitative evaluation suites
     * research/retrieval_adapters/  - Vector and BM25 hybrid retrieval logic
     * research/local_inference/     - Ollama & local LLM adapters
     * research/orchestration/       - CRAG routing and verification pipelines
     * research/exp00*_analyzer.py   - Specialized analysis scripts
   - backend/: PHP REST API services and test harnesses.
   - database/: Supabase/PostgreSQL schema, seed data, and migration files.
   - scratch/: Diagnostic benchmark scripts, trace logs, and verification runs.

3. LATEST EXPERIMENT HIGHLIGHTS:
   - EXP-0064: Phase 2 Sealed Blind Validation of Text+Visual Fusion Candidate B2 (N=500)
   - EXP-0065 to EXP-0070: Advanced routing, error transitions, and state audits
   - EXP-0071: Novelty correction, state logs, integrity audit, and final report

4. HOW TO RESEARCH USING THESE MCP TOOLS:
   - list_experiments: Browse experiment sequences by ID range or topic (e.g. topic: "blind", "fusion").
   - search_files: Find specific reports, metrics JSONs, or code files by keyword.
   - view_file: Read reports or code line-by-line (supports pagination with start_line/end_line).
   - grep_content: Search for specific functions, metrics (e.g., "Macro F1", "McNemar"), or terms across files.
================================================================================
`;
  return summary.trim();
}

/**
 * Tool definitions exposed to the LLM
 */
const TOOLS = [
  {
    name: 'get_project_summary',
    description: 'Get an instant structured overview of the EduConnect-LMS-Experimental research project, its research goals, latest experiments (up to EXP-0071), key subdirectories, and research guidance.',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false
    }
  },
  {
    name: 'list_directory',
    description: 'Inspect files and subdirectories within the Experimental project. Shows file sizes, modification dates, and folder hierarchy. Strict read-only view.',
    inputSchema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Relative path from the experimental project root (e.g. "." for root, "research", "backend", "database")'
        },
        recursive: {
          type: 'boolean',
          description: 'If true, recursively lists subdirectories up to depth 3 (default: false)'
        },
        filter: {
          type: 'string',
          description: 'Optional filter substring to match filenames (e.g. "EXP-0064", ".py", ".md")'
        }
      },
      additionalProperties: false
    }
  },
  {
    name: 'view_file',
    description: 'View the contents of a file within the Experimental project. Supports line-range pagination (start_line, end_line) with line numbering to read reports, code, and configurations safely.',
    inputSchema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Relative path to the file from the experimental project root (e.g. "EXP-0071-FINAL-REPORT.md", "research/exp0071_analyzer.py")'
        },
        start_line: {
          type: 'integer',
          description: '1-indexed start line number (default: 1)'
        },
        end_line: {
          type: 'integer',
          description: '1-indexed end line number (default: start_line + 250, max 300 lines per slice)'
        }
      },
      required: ['path'],
      additionalProperties: false
    }
  },
  {
    name: 'search_files',
    description: 'Search for files by filename or relative path across the Experimental project (e.g. find all files related to "blind", "gate", "EXP-0064", or "*.py").',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Filename or path substring to search for'
        },
        max_results: {
          type: 'integer',
          description: 'Maximum number of results to return (default: 40, max: 100)'
        }
      },
      required: ['query'],
      additionalProperties: false
    }
  },
  {
    name: 'grep_content',
    description: 'Search for text or regex pattern inside code and markdown files across the Experimental project. Returns matching files, line numbers, and line contents.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Text string or regex pattern to search for inside files'
        },
        extension: {
          type: 'string',
          description: 'Optional file extension filter (e.g. ".md", ".py", ".json", ".php")'
        },
        max_results: {
          type: 'integer',
          description: 'Maximum matching lines to return (default: 30, max: 100)'
        },
        is_regex: {
          type: 'boolean',
          description: 'Set to true if query is a regular expression (default: false)'
        }
      },
      required: ['query'],
      additionalProperties: false
    }
  },
  {
    name: 'list_experiments',
    description: 'Browse all experiment packages (EXP-0001 through EXP-0071) in the Experimental project. Groups reports, metrics, and code together by experiment number.',
    inputSchema: {
      type: 'object',
      properties: {
        min_id: {
          type: 'integer',
          description: 'Minimum experiment number (e.g. 50)'
        },
        max_id: {
          type: 'integer',
          description: 'Maximum experiment number (e.g. 71)'
        },
        topic: {
          type: 'string',
          description: 'Optional topic or keyword filter (e.g. "blind", "fusion", "crag", "nli")'
        }
      },
      additionalProperties: false
    }
  }
];

/**
 * Handle tools/call
 */
function callTool(name, args = {}) {
  switch (name) {
    case 'get_project_summary':
      return handleGetProjectSummary();
    case 'list_directory':
      return handleListDirectory(args);
    case 'view_file':
      return handleViewFile(args);
    case 'search_files':
      return handleSearchFiles(args);
    case 'grep_content':
      return handleGrepContent(args);
    case 'list_experiments':
      return handleListExperiments(args);
    default:
      throw new Error(`Tool not found: "${name}". Available tools: ${TOOLS.map(t => t.name).join(', ')}`);
  }
}

/**
 * Send JSON-RPC response to stdout
 */
function sendResponse(responseObj) {
  const jsonStr = JSON.stringify(responseObj);
  process.stdout.write(jsonStr + '\n');
}

/**
 * Main JSON-RPC request dispatcher
 */
function handleMessage(msg) {
  if (!msg || typeof msg !== 'object') return;

  const { jsonrpc, id, method, params } = msg;

  // Handle Notifications (no response needed if id is undefined/null)
  if (method === 'notifications/initialized' || method === 'initialized') {
    return;
  }

  if (!id && id !== 0) {
    // Notification without id
    return;
  }

  // Methods
  if (method === 'initialize') {
    sendResponse({
      jsonrpc: '2.0',
      id,
      result: {
        protocolVersion: '2024-11-05',
        capabilities: {
          tools: {
            listChanged: false
          }
        },
        serverInfo: {
          name: 'experimental-project-viewer',
          version: '1.0.0'
        },
        instructions: 'You have STRICT READ-ONLY VIEW access to the EduConnect-LMS-Experimental research project. You can inspect project structure, read experiment reports, search code and analysis docs. You cannot modify, delete, execute, or copy code outside this project.'
      }
    });
    return;
  }

  if (method === 'ping') {
    sendResponse({
      jsonrpc: '2.0',
      id,
      result: {}
    });
    return;
  }

  if (method === 'tools/list') {
    sendResponse({
      jsonrpc: '2.0',
      id,
      result: {
        tools: TOOLS
      }
    });
    return;
  }

  if (method === 'tools/call') {
    const toolName = params?.name;
    const toolArgs = params?.arguments || {};

    try {
      const outputText = callTool(toolName, toolArgs);
      sendResponse({
        jsonrpc: '2.0',
        id,
        result: {
          content: [
            {
              type: 'text',
              text: outputText
            }
          ],
          isError: false
        }
      });
    } catch (err) {
      sendResponse({
        jsonrpc: '2.0',
        id,
        result: {
          content: [
            {
              type: 'text',
              text: `Error executing ${toolName}: ${err.message}`
            }
          ],
          isError: true
        }
      });
    }
    return;
  }

  // Default: method not found
  sendResponse({
    jsonrpc: '2.0',
    id,
    error: {
      code: -32601,
      message: `Method not found: ${method}`
    }
  });
}

// Start stdio reader
const rl = readline.createInterface({
  input: process.stdin,
  terminal: false
});

rl.on('line', (line) => {
  const trimmed = line.trim();
  if (!trimmed) return;
  try {
    const parsed = JSON.parse(trimmed);
    handleMessage(parsed);
  } catch (err) {
    sendResponse({
      jsonrpc: '2.0',
      id: null,
      error: {
        code: -32700,
        message: `Parse error: ${err.message}`
      }
    });
  }
});

// Keep process alive — don't exit when stdin closes or on errors
rl.on('close', () => {
  process.exit(0);
});

process.on('SIGINT', () => {
  process.exit(0);
});

process.on('SIGTERM', () => {
  process.exit(0);
});

process.on('uncaughtException', (err) => {
  process.stderr.write('[MCP-FATAL] ' + err.message + '\n');
});

process.stderr.write('[MCP] experimental-project-viewer started on stdio. Root: ' + TARGET_ROOT + '\n');
