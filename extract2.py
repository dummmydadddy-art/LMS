import os
import json

directory = r'D:\Collage project\EduConnect-LMS-Experimental'
experiments = {}

for i in range(1, 41):
    exp_id = f'EXP-{i:04d}'
    experiments[exp_id] = {'files': []}

for root, dirs, files in os.walk(directory):
    for file in files:
        if file.startswith('EXP-') and file.endswith(('.md', '.json')):
            import re
            match = re.search(r'(EXP-\d{4})', file)
            if match:
                exp_id = match.group(1)
                if exp_id in experiments:
                    experiments[exp_id]['files'].append(os.path.join(root, file))

# Find the best report
for exp_id, data in experiments.items():
    if not data['files']: continue
    
    best_file = None
    if i <= 11:
        json_files = [f for f in data['files'] if f.endswith('.json') and 'tests\\\\rag\\\\experiments' in f]
        if json_files: best_file = json_files[0]
    else:
        md_files = [f for f in data['files'] if f.endswith('.md')]
        # Prioritize REPORT, then CERTIFICATION, then ANALYSIS, then AUDIT
        for keyword in ['CERTIFICATION-REPORT', 'FINAL-REPORT', 'HARDENING-REPORT', 'WEAKNESS-AUDIT', 'RESEARCH-REPORT', 'REPORT', 'CERTIFICATION', 'ANALYSIS', 'AUDIT']:
            for f in md_files:
                if keyword in f.upper():
                    best_file = f
                    break
            if best_file: break
        if not best_file and md_files:
            best_file = md_files[0]
            
    if not best_file and data['files']:
        best_file = data['files'][0]
        
    print(f"\n--- {exp_id} : {os.path.basename(best_file)} ---")
    
    # Read the file
    try:
        with open(best_file, 'r', encoding='utf-8') as f:
            content = f.read()
            if best_file.endswith('.json'):
                # Try to parse json and print meta
                data_json = json.loads(content)
                meta = data_json.get('meta', {})
                print(f"JSON Meta: {meta}")
            else:
                # Find paragraphs with keywords
                paragraphs = content.split('\n\n')
                for p in paragraphs:
                    pl = p.lower()
                    if 'hypothesis' in pl or 'baseline' in pl or 'candidate' in pl or 'dataset' in pl or 'metric' in pl or 'p-value' in pl or 'decision' in pl or 'live' in pl or 'adopt' in pl or 'reject' in pl:
                        # only print first 200 chars of paragraph to save space
                        print(p[:200].replace('\n', ' '))
    except Exception as e:
        print(f"Error reading {best_file}: {e}")
