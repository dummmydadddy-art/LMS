import sys
import os

out_file = os.path.join(os.path.dirname(__file__), "probe_result.txt")

def log(msg):
    with open(out_file, "a", encoding="utf-8") as f:
        f.write(str(msg) + "\n")
        f.flush()

# Clear file
with open(out_file, "w", encoding="utf-8") as f:
    f.write("=== PROBE START ===\n")

log(f"Python: {sys.version}")
log(f"Executable: {sys.executable}")
log(f"CWD: {os.getcwd()}")

log("Checking torch import...")
try:
    import torch
    log(f"Torch loaded: {torch.__version__}, CUDA: {torch.cuda.is_available()}")
except Exception as e:
    log(f"Torch error: {e}")

log("Checking transformers import...")
try:
    import transformers
    log(f"Transformers loaded: {transformers.__version__}")
except Exception as e:
    log(f"Transformers error: {e}")

log("Checking sentence_transformers import...")
try:
    import sentence_transformers
    log(f"SentenceTransformers loaded: {sentence_transformers.__version__}")
except Exception as e:
    log(f"SentenceTransformers error: {e}")

log("Done basic imports!")
