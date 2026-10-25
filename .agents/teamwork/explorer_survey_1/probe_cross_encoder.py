import os
import sys

# Critical Windows settings
os.environ["KMP_DUPLICATE_LIB_OK"] = "TRUE"
os.environ["TOKENIZERS_PARALLELISM"] = "false"

log_file = os.path.join(os.path.dirname(__file__), "probe_ce.log")

def write_log(text):
    with open(log_file, "a", encoding="utf-8") as f:
        f.write(text + "\n")
        f.flush()

with open(log_file, "w", encoding="utf-8") as f:
    f.write("PROBE START\n")

try:
    write_log(f"Python: {sys.version}")
    import torch
    write_log(f"Torch: {torch.__version__}, CUDA: {torch.cuda.is_available()}")
    
    write_log("Importing CrossEncoder...")
    from sentence_transformers import CrossEncoder
    write_log("CrossEncoder imported successfully.")
    
    write_log("Initializing CrossEncoder('cross-encoder/ms-marco-MiniLM-L-6-v2', device='cpu')...")
    import time
    t0 = time.time()
    model = CrossEncoder("cross-encoder/ms-marco-MiniLM-L-6-v2", device="cpu")
    t_load = time.time() - t0
    write_log(f"Model loaded in {t_load:.2f}s on {model.device}")
    
    write_log("Testing inference on 2 pairs...")
    t0 = time.time()
    scores = model.predict([
        ["What is React?", "React is a JavaScript library for building user interfaces."],
        ["What is React?", "PostgreSQL is a powerful, open-source object-relational database system."]
    ])
    t_infer = time.time() - t0
    import math
    probs = [1.0 / (1.0 + math.exp(-s)) for s in scores]
    write_log(f"Inference completed in {t_infer*1000:.1f}ms")
    write_log(f"Raw logits: {scores.tolist()}")
    write_log(f"Sigmoid probabilities: {probs}")
    write_log("PROBE SUCCESSFUL!")
except Exception as e:
    import traceback
    write_log(f"PROBE FAILED with error: {e}")
    write_log(traceback.format_exc())
