# research/run_experiment.py
"""
Modular Experiment Runner and Scaffolding for EduConnect-LMS Research.
Enforces strict blind evaluation controls, statistical testing (-3.00 pp margin),
and forensic logging.
"""

import os
import sys
import json
import yaml
import time
import argparse
import hashlib
import numpy as np
from typing import Dict, Any, List, Optional

sys.path.insert(0, ".")

from research.retrieval_adapters import get_retriever, EXP0040BaselineAdapter


def compute_paired_statistics(control_preds: Dict[str, str], candidate_preds: Dict[str, str], gold_labels: Dict[str, str]):
    """
    Paired statistics: McNemar test, discordance, paired standard error, 95% CI, one-sided LCB.
    Margin: -3.00 pp (-0.0300).
    """
    n11, n00, n10, n01 = 0, 0, 0, 0
    common_keys = sorted(list(set(control_preds.keys()).intersection(candidate_preds.keys()).intersection(gold_labels.keys())))
    N = len(common_keys)

    for k in common_keys:
        ctrl_correct = (control_preds[k] == gold_labels[k])
        cand_correct = (candidate_preds[k] == gold_labels[k])

        if ctrl_correct and cand_correct:
            n11 += 1
        elif not ctrl_correct and not cand_correct:
            n00 += 1
        elif ctrl_correct and not cand_correct:
            n10 += 1  # Control won, candidate lost
        elif not ctrl_correct and cand_correct:
            n01 += 1  # Candidate won, control lost

    ctrl_acc = (n11 + n10) / N if N > 0 else 0.0
    cand_acc = (n11 + n01) / N if N > 0 else 0.0
    diff_acc = cand_acc - ctrl_acc
    discordant = n01 + n10

    # McNemar p-value (continuity corrected)
    if discordant > 0:
        stat = (abs(n01 - n10) - 1.0) ** 2 / discordant
        # 1-df chi2 approximation
        from scipy.stats import chi2
        p_val = float(chi2.sf(stat, 1))
    else:
        p_val = 1.0

    # Paired standard error
    se_diff = np.sqrt((n01 + n10 - ((n01 - n10) ** 2) / N)) / N if N > 0 else 0.0
    z_95 = 1.644853  # One-sided 95%
    z_two_sided = 1.95996  # Two-sided 95%

    ci_lower = diff_acc - z_two_sided * se_diff
    ci_upper = diff_acc + z_two_sided * se_diff
    one_sided_lcb = diff_acc - z_95 * se_diff

    # Non-inferiority check with -3.00 pp margin
    non_inferior = (one_sided_lcb >= -0.0300)
    superior = (one_sided_lcb > 0.0 and p_val < 0.05)

    if superior:
        verdict = "SUPERIOR"
    elif non_inferior:
        verdict = "NON-INFERIOR"
    elif diff_acc < -0.0300 and p_val < 0.05:
        verdict = "INFERIOR"
    else:
        verdict = "INCONCLUSIVE"

    return {
        "N": N,
        "control_accuracy": round(ctrl_acc * 100, 2),
        "candidate_accuracy": round(cand_acc * 100, 2),
        "difference_pp": round(diff_acc * 100, 2),
        "n11": n11,
        "n00": n00,
        "n10": n10,
        "n01": n01,
        "discordant_pairs": discordant,
        "mcnemar_p_value": round(p_val, 6),
        "paired_se_pp": round(se_diff * 100, 4),
        "two_sided_95_ci": [round(ci_lower * 100, 2), round(ci_upper * 100, 2)],
        "one_sided_95_lcb_pp": round(one_sided_lcb * 100, 4),
        "non_inferiority_margin_pp": -3.00,
        "decision_verdict": verdict
    }


def main():
    parser = argparse.ArgumentParser(description="EduConnect Research Experiment Runner")
    parser.add_argument("--config", required=True, help="Path to YAML experiment config")
    parser.add_argument("--eval_type", choices=["retrieval", "end_to_end", "describe"], default="describe")
    parser.add_argument("--blind", action="store_true", help="Execute blind evaluation")
    parser.add_argument("--limit", type=int, default=0, help="Limit number of test cases (0=all)")
    args = parser.parse_args()

    with open(args.config, "r", encoding="utf-8") as f:
        config = yaml.safe_load(f)

    exp_id = config.get("experiment_id", "UNKNOWN")
    print(f"=== EduConnect Experiment Runner: {exp_id} ===")
    print(f"Config: {args.config}")
    print(f"Evaluation Mode: {args.eval_type}")

    if args.blind and not config.get("blind_evaluation", {}).get("enabled", False):
        print("FATAL: Blind evaluation is NOT pre-registered / enabled in this config.")
        print("Blind labels are protected. Aborting execution.")
        sys.exit(1)

    retriever = get_retriever(config)
    print(f"Loaded Retriever: {retriever.describe()['name']}")
    health = retriever.health()
    print(f"Retriever Health: {health}")

    if args.eval_type == "describe":
        print(json.dumps(retriever.describe(), indent=2))
        return

    print("Scaffolding ready. Experiments can only run when explicitly authorized.")


if __name__ == "__main__":
    main()
