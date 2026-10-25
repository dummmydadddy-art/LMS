import os
import re
import json

directory = r'D:\Collage project\EduConnect-LMS-Experimental'
experiments = {}

for i in range(1, 41):
    exp_id = f'EXP-{i:04d}'
    experiments[exp_id] = {'files': [], 'md_content': ''}

for root, dirs, files in os.walk(directory):
    for file in files:
        if file.startswith('EXP-') and file.endswith(('.md', '.json')):
            match = re.search(r'(EXP-\d{4})', file)
            if match:
                exp_id = match.group(1)
                if exp_id in experiments:
                    experiments[exp_id]['files'].append(os.path.join(root, file))

# We want 14 to 40, plus 1 to 11.
def extract_fields(text):
    res = {}
    m = re.search(r'(?i)\*\*Hypothesis\*\*:(.*?)(?=\n\*\*|\n#|\Z)', text, re.DOTALL)
    if not m: m = re.search(r'(?i)Hypothesis:(.*?)(?=\n\*\*|\n#|\n\n|\Z)', text, re.DOTALL)
    res['Hypothesis'] = m.group(1).strip() if m else 'NOT_FOUND'
    
    m = re.search(r'(?i)\*\*Baseline\*\*:(.*?)(?=\n\*\*|\n#|\Z)', text, re.DOTALL)
    if not m: m = re.search(r'(?i)Baseline:(.*?)(?=\n\*\*|\n#|\n\n|\Z)', text, re.DOTALL)
    res['Baseline'] = m.group(1).strip() if m else 'NOT_FOUND'

    m = re.search(r'(?i)\*\*Candidate(?: Under Evaluation)?\*\*:(.*?)(?=\n\*\*|\n#|\Z)', text, re.DOTALL)
    if not m: m = re.search(r'(?i)Candidate:(.*?)(?=\n\*\*|\n#|\n\n|\Z)', text, re.DOTALL)
    res['Candidate'] = m.group(1).strip() if m else 'NOT_FOUND'

    m = re.search(r'(?i)\*\*Dataset\*\*:(.*?)(?=\n\*\*|\n#|\Z)', text, re.DOTALL)
    if not m: m = re.search(r'(?i)Dataset:(.*?)(?=\n\*\*|\n#|\n\n|\Z)', text, re.DOTALL)
    res['Dataset'] = m.group(1).strip() if m else 'NOT_FOUND'

    m = re.search(r'(?i)\*\*Main Metric\*\*:(.*?)(?=\n\*\*|\n#|\Z)', text, re.DOTALL)
    if not m: m = re.search(r'(?i)Metric:(.*?)(?=\n\*\*|\n#|\n\n|\Z)', text, re.DOTALL)
    res['Metric'] = m.group(1).strip() if m else 'NOT_FOUND'

    m = re.search(r'(?i)Statistical Test(?: & p-value)?\*\*:(.*?)(?=\n\*\*|\n#|\Z)', text, re.DOTALL)
    if not m: m = re.search(r'(?i)p-value:(.*?)(?=\n\*\*|\n#|\n\n|\Z)', text, re.DOTALL)
    res['StatTest'] = m.group(1).strip() if m else 'NOT_FOUND'

    m = re.search(r'(?i)\*\*Decision\*\*:(.*?)(?=\n\*\*|\n#|\Z)', text, re.DOTALL)
    if not m: m = re.search(r'(?i)Decision:(.*?)(?=\n\*\*|\n#|\n\n|\Z)', text, re.DOTALL)
    res['Decision'] = m.group(1).strip() if m else 'NOT_FOUND'

    return res

results = {}

for exp_id, data in experiments.items():
    if not data['files']: continue
    
    # Read first json in tests/rag/experiments if available
    json_data = {}
    json_files = [f for f in data['files'] if f.endswith('.json') and 'tests\\\\rag\\\\experiments' in f]
    if json_files:
        try:
            with open(json_files[0], 'r', encoding='utf-8') as f:
                json_data = json.load(f)
        except Exception:
            pass
            
    # Read md files
    md_files = [f for f in data['files'] if f.endswith('.md')]
    combined_md = ''
    for mdf in md_files:
        try:
            with open(mdf, 'r', encoding='utf-8') as f:
                combined_md += f.read() + '\n\n'
        except:
            pass
            
    extracted = extract_fields(combined_md)
    # Print it out as JSON
    results[exp_id] = {
        'files': [os.path.basename(x) for x in data['files']],
        'extracted': extracted,
        'json_info': json_data.get('meta', {}) if type(json_data) is dict else {}
    }

with open('results.json', 'w', encoding='utf-8') as f:
    json.dump(results, f, indent=2)
print("Done writing results.json")
