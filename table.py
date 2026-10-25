import os
import re

files = [
    'EXP-0014-ADVANCED-RAG-CERTIFICATION-REPORT.md',
    'EXP-0015-RAG-WEAKNESS-AUDIT-REPORT.md',
    'EXP-0016-HARDENING-REPORT.md',
    'EXP-0018-HARDENED-RAG-REPORT.md',
    'EXP-0019-INDEPENDENT-VERIFICATION-REPORT.md',
    'EXP-0020-HARDENED-RAG-REPORT.md',
    'EXP-0021-PRODUCTION-READINESS-CERTIFICATION.md',
    'EXP-0022-SAFETY-REMEDIATION-REPORT.md',
    'EXP-0023-FINAL-CERTIFICATION.md',
    'EXP-0024-FINAL-REPORT.md',
    'EXP-0025-FINAL-REPORT.md',
    'EXP-0026-FINAL-REPORT.md',
    'EXP-0027-S1-FINAL-REPORT.md',
    'EXP-0028-EVALUATION-REPORT.md',
    'EXP-0029-ERROR-ANALYSIS.md',
    'EXP-0030-RESEARCH-REPORT.md',
    'EXP-0031-RESEARCH-REPORT.md',
    'EXP-0032-BENCHMARK-REPORT.md',
    'EXP-0033-RESEARCH-REPORT.md',
    'EXP-0034-RESEARCH-REPORT.md',
    'EXP-0035-FINAL-RESEARCH-REPORT.md',
    'EXP-0036-BLIND-ANALYSIS.md',
    'EXP-0037-BLIND-ANALYSIS.md',
    'EXP-0038-DEVELOPMENT-ANALYSIS.md',
    'EXP-0039-RECONCILIATION-REPORT.md',
    'EXP-0040-BLIND-ANALYSIS.md'
]
import glob
print("| Exp | Hypothesis | Baseline | Candidate | Dataset | Metric | p-value/Test | Decision | Live |")
print("|---|---|---|---|---|---|---|---|---|")
for f in files:
    try:
        path = os.path.join(r'D:\Collage project\EduConnect-LMS-Experimental', f)
        with open(path, 'r', encoding='utf-8') as file:
            text = file.read().replace('\n', ' ')
            
            exp = re.search(r'EXP-\d{4}', f).group(0)
            
            hyp = re.search(r'Hypothesis(.*?)(?:\*\*|[#])', text, re.I)
            hyp = hyp.group(1).strip()[:50] if hyp else 'N/A'
            
            base = re.search(r'Baseline(.*?)(?:\*\*|[#])', text, re.I)
            base = base.group(1).strip()[:50] if base else 'N/A'
            
            cand = re.search(r'Candidate(.*?)(?:\*\*|[#])', text, re.I)
            cand = cand.group(1).strip()[:50] if cand else 'N/A'
            
            data = re.search(r'Dataset(.*?)(?:\*\*|[#])', text, re.I)
            data = data.group(1).strip()[:50] if data else 'N/A'
            
            metric = re.search(r'Metric(.*?)(?:\*\*|[#])', text, re.I)
            metric = metric.group(1).strip()[:50] if metric else 'N/A'
            
            stat = re.search(r'p-value(.*?)(?:\*\*|[#])', text, re.I)
            stat = stat.group(1).strip()[:50] if stat else 'N/A'
            
            dec = re.search(r'Decision(.*?)(?:\*\*|[#])', text, re.I)
            dec = dec.group(1).strip()[:50] if dec else 'N/A'
            
            print(f"| {exp} | {hyp} | {base} | {cand} | {data} | {metric} | {stat} | {dec} | N/A |")
    except:
        pass
