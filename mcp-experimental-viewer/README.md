# Experimental Project Viewer (Read-Only MCP Server)

Strictly **Read-Only** Model Context Protocol (MCP) server designed to give **Qwen** (and other AI models) full view and research access to the **EduConnect LMS Experimental Project** (`D:\Collage project\EduConnect-LMS-Experimental`) without any ability to copy, edit, delete, or execute code.

---

## 1. Security & Read-Only Guarantees

As requested: **"it can not copy code it can not do anything it can just view the files"**.

1. **Strict Path Jail:**
   - Locked entirely to `D:\Collage project\EduConnect-LMS-Experimental`.
   - Any attempt to escape via path traversal (`../`) or absolute paths outside the project is immediately rejected with a `SECURITY ACCESS DENIED` error.
   - Symlinks resolving outside the root directory are detected and blocked.

2. **Zero Modification & Zero Copying:**
   - **No file writing:** The server contains zero code or tools to create, modify, rename, or delete files.
   - **No copying to disk:** The server does not provide any `copy_file` or export capability. Content is only streamed as text responses for research analysis in the chat context.
   - **No shell / process execution:** The server cannot run bash, PowerShell, or command-line scripts.
   - **No network calls:** The server runs offline on stdio without external network capabilities.

3. **Context-Safe Pagination:**
   - `view_file` supports line slices (`start_line`, `end_line`) with a 300-line safety cap per slice, ensuring Qwen never exhausts its context window when inspecting large experiment logs or codebases.
   - Binary files (.pt, .png, .onnx, .pyc, etc.) are detected and safely guarded against corrupting the model's context.

---

## 2. Available Tools for Qwen

| Tool | Purpose |
| :--- | :--- |
| `get_project_summary` | Instant overview of the research project, key directories, research goals, and experiment index (EXP-0001 to EXP-0071). |
| `list_experiments` | Groups and lists experiment packages by number range (e.g. `min_id: 60, max_id: 71`) or topic (`blind`, `fusion`, `crag`, `nli`). |
| `list_directory` | Browses folder contents, file sizes, and subdirectories (with optional recursive depth and filter). |
| `view_file` | Reads source code and reports line-by-line with line numbers and pagination (`start_line`, `end_line`). |
| `search_files` | Finds files across the repository matching a name pattern or keyword. |
| `grep_content` | Fast text or regex search across code and Markdown files to locate terms, metrics, or function definitions. |

---

## 3. Pre-Configured Integrations

This server has already been connected and tested across your environments:

### A. Qoder (Qwen)
Already registered in:
`C:\Users\Mukul\AppData\Roaming\Qoder\SharedClientCache\extension\local\mcp.json`
```json
"experimental-project-viewer": {
    "identifier": "exp-project-viewer-01",
    "command": "node",
    "args": [
        "D://Collage project//mcp-experimental-viewer//index.js"
    ],
    "source": "user",
    "description": "Strict Read-Only Viewer for EduConnect-LMS-Experimental research project"
}
```

### B. VS Code MCP
Already registered in:
`C:\Users\Mukul\AppData\Roaming\Code\User\mcp.json`
```json
"experimental-project-viewer": {
  "type": "stdio",
  "command": "node",
  "args": [
    "d:\\Collage project\\mcp-experimental-viewer\\index.js"
  ]
}
```

### C. Antigravity & AI Agents
Already registered in:
`C:\Users\Mukul\.gemini\config\mcp_config.json`
and tool schemas generated in:
`C:\Users\Mukul\.gemini\antigravity\mcp\experimental_viewer\`

---

## 4. How to Test & Verify

You can run the built-in test suite anytime:

```powershell
cd "d:\Collage project\mcp-experimental-viewer"
node test-client.js
```

This verifies:
1. `initialize` protocol handshake (2024-11-05).
2. Tool registration (all 6 research tools).
3. Viewing summaries, listing experiments, file searches, and line-slice viewing.
4. Security boundary violation tests (verifies that `../../` path traversal and `C:\Windows` access are blocked).
