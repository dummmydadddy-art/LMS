const fs = require('fs');
const path = require('path');

const targetDir = 'C:\\Users\\Mukul\\.gemini\\antigravity\\mcp\\experimental_viewer';
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

const instructions = `# EduConnect-LMS-Experimental Research Project Viewer

Strictly READ-ONLY viewer for inspecting, researching, and referencing the EduConnect LMS Experimental research project located at:
\`D:\\Collage project\\EduConnect-LMS-Experimental\`

### Capabilities:
- View any source code file, experiment report (EXP-0001 through EXP-0071), benchmark metrics JSON, or architecture doc.
- Safely slice files with \`start_line\` and \`end_line\` pagination to avoid large token footprints.
- Search for experiment reports, analyze CRAG / ColSmol / NLI findings, and grep for key identifiers or metrics.
- STRICT SAFETY: Cannot modify, create, copy, or delete files. Jailed to the experimental project root.`;

fs.writeFileSync(path.join(targetDir, 'instructions.md'), instructions, 'utf8');

const tools = [
  {
    name: 'get_project_summary',
    description: 'Get an instant structured overview of the EduConnect-LMS-Experimental research project, its research goals, latest experiments (up to EXP-0071), key subdirectories, and research guidance.',
    parameters: {
      type: 'object',
      properties: {},
      additionalProperties: false
    }
  },
  {
    name: 'list_directory',
    description: 'Inspect files and subdirectories within the Experimental project. Shows file sizes, modification dates, and folder hierarchy. Strict read-only view.',
    parameters: {
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
    parameters: {
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
    parameters: {
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
    parameters: {
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
    parameters: {
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

for (const tool of tools) {
  const filePath = path.join(targetDir, `${tool.name}.json`);
  fs.writeFileSync(filePath, JSON.stringify(tool, null, 2), 'utf8');
}

console.log(`Successfully generated ${tools.length} tool schemas in ${targetDir}`);
