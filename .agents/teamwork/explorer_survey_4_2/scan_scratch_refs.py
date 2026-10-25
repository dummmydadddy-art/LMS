import os
import re
import json

repo_root = r"d:\Collage project\EduConnect-LMS-Experimental"
pattern = re.compile(r"scratch[/\\]", re.IGNORECASE)

ignore_dirs = {".git", ".agents", "node_modules", "scratch", "archive"}

matches = {}

for root, dirs, files in os.walk(repo_root):
    dirs[:] = [d for d in dirs if d not in ignore_dirs and not d.startswith(".")]
    for f in files:
        if f.endswith((".png", ".pdf", ".safetensors", ".pyc", ".sqlite", ".db", ".log", ".bin")):
            continue
        p = os.path.join(root, f)
        rel = os.path.relpath(p, repo_root).replace("\\", "/")
        try:
            with open(p, "r", encoding="utf-8", errors="ignore") as fp:
                for idx, line in enumerate(fp, 1):
                    if pattern.search(line):
                        if rel not in matches:
                            matches[rel] = []
                        matches[rel].append({"line": idx, "content": line.strip()})
        except Exception:
            pass

out_path = r"d:\Collage project\EduConnect-LMS-Experimental\.agents\teamwork\explorer_survey_4_2\scratch_refs.json"
with open(out_path, "w", encoding="utf-8") as out:
    json.dump(matches, out, indent=2, ensure_ascii=False)

print(f"Total files referencing scratch/: {len(matches)}")
for f, items in sorted(matches.items()):
    print(f"{f}: {len(items)} references")
