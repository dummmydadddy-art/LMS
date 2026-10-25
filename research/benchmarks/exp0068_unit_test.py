"""
EXP-0068 Cross-Encoder Verification Unit Test
Tests C1 and C2 on clear sanity triplets:
1. Obvious Entailment
2. Obvious Contradiction
3. Obvious Neutral
"""
import sys
import torch
from transformers import AutoTokenizer, AutoModelForSequenceClassification

SANITY_TRIPLETS = [
    {
        "name": "Obvious Entailment",
        "premise": "CSS display: flex activates flex formatting context and allows flexible child layout.",
        "hypothesis": "display: flex enables flexbox layout.",
        "expected": "ENTAILMENT"
    },
    {
        "name": "Obvious Contradiction",
        "premise": "CSS display: flex sets the main axis to either row or column direction in a Cartesian plane.",
        "hypothesis": "CSS display: flex sets the main axis to a circular rotating spiral.",
        "expected": "CONTRADICTION"
    },
    {
        "name": "Obvious Neutral",
        "premise": "React hooks must only be called at the top level of React function components.",
        "hypothesis": "PostgreSQL schema migrations require transactional DDL locks.",
        "expected": "NEUTRAL"
    }
]

def test_model(model_name_or_path, model_name):
    print(f"\n=======================================================")
    print(f"Testing Sanity Triplets for: {model_name}")
    print(f"Path: {model_name_or_path}")
    print(f"=======================================================")
    
    tokenizer = AutoTokenizer.from_pretrained(model_name_or_path)
    model = AutoModelForSequenceClassification.from_pretrained(model_name_or_path)
    model.eval()
    
    id2label = model.config.id2label
    print(f"id2label: {id2label}")
    
    # Map label names to canonical ENTAILMENT / CONTRADICTION / NEUTRAL
    norm_mapping = {}
    for idx, lbl in id2label.items():
        lbl_upper = lbl.upper()
        if "ENTAIL" in lbl_upper:
            norm_mapping[idx] = "ENTAILMENT"
        elif "CONTRADIC" in lbl_upper:
            norm_mapping[idx] = "CONTRADICTION"
        elif "NEUTR" in lbl_upper:
            norm_mapping[idx] = "NEUTRAL"
        else:
            norm_mapping[idx] = lbl_upper
    print(f"Normalized mapping: {norm_mapping}")
    
    all_passed = True
    for item in SANITY_TRIPLETS:
        inputs = tokenizer(item["premise"], item["hypothesis"], return_tensors="pt", truncation=True, max_length=512)
        with torch.no_grad():
            outputs = model(**inputs)
            logits = outputs.logits[0]
            probs = torch.softmax(logits, dim=-1)
            pred_idx = torch.argmax(probs).item()
            pred_label = norm_mapping.get(pred_idx, str(pred_idx))
            conf = probs[pred_idx].item()
            
        passed = (pred_label == item["expected"])
        status_str = "PASS" if passed else "FAIL"
        print(f"[{status_str}] {item['name']}: Predicted={pred_label} (Conf={conf:.4f}), Expected={item['expected']}")
        print(f"       Probs: { {norm_mapping[i]: round(probs[i].item(), 4) for i in range(len(probs))} }")
        if not passed:
            all_passed = False
            
    print(f"\nSanity Check Result for {model_name}: {'ALL PASSED' if all_passed else 'SOME FAILED'}")
    return all_passed, norm_mapping

if __name__ == '__main__':
    import os
    if len(sys.argv) > 1:
        p = os.path.expanduser(sys.argv[1])
        test_model(p, sys.argv[2] if len(sys.argv) > 2 else sys.argv[1])
    else:
        print("Usage: python exp0068_unit_test.py <model_path> <model_name>")
