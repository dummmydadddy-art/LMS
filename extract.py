import os, re, json

data_dir = r'D:\Collage project\EduConnect-LMS-Experimental'

output = {}

for root, _, files in os.walk(data_dir):
    for file in files:
        if file.endswith('.md'):
            path = os.path.join(root, file)
            with open(path, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
                
            # match anything like EXP-0014 or EXP0014
            for m in re.finditer(r'(?i)EXP[-_]?(\d{4})', content):
                exp_id = f'EXP-{int(m.group(1)):04d}'
                if exp_id not in output:
                    output[exp_id] = []
                
                # Extract paragraph surrounding it
                start = max(0, m.start() - 200)
                end = min(len(content), m.end() + 1000)
                snippet = content[start:end]
                
                output[exp_id].append({
                    'file': file,
                    'snippet': snippet
                })

# To make it readable, maybe just write a script that looks for "Hypothesis", "Baseline", etc.
