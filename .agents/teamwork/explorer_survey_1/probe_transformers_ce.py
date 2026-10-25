import os
import sys

os.environ["KMP_DUPLICATE_LIB_OK"] = "TRUE"
os.environ["TOKENIZERS_PARALLELISM"] = "false"

log_file = os.path.join(os.path.dirname(__file__), "probe_hf.log")

def write_log(text):
    with open(log_file, "a", encoding="utf-8") as f:
        f.write(text + "\n")
        f.flush()

with open(log_file, "w", encoding="utf-8") as f:
    f.write("HF PROBE START\n")

try:
    write_log("Importing torch...")
    import torch
    write_log(f"Torch: {torch.__version__}")

    write_log("Importing transformers AutoTokenizer & AutoModelForSequenceClassification...")
    from transformers import AutoTokenizer, AutoModelForSequenceClassification
    write_log("Transformers imported successfully!")

    model_name = "cross-encoder/ms-marco-MiniLM-L-6-v2"
    write_log(f"Loading tokenizer for {model_name}...")
    tokenizer = AutoTokenizer.from_pretrained(model_name)
    write_log("Tokenizer loaded!")

    write_log(f"Loading model for {model_name}...")
    model = AutoModelForSequenceClassification.from_pretrained(model_name)
    model.eval()
    write_log("Model loaded successfully!")

    write_log("Running test inference...")
    inputs = tokenizer([["What is React?", "React is a JavaScript library."]], padding=True, truncation=True, return_tensors="pt")
    with torch.no_grad():
        logits = model(**inputs).logits
    write_log(f"Raw logits: {logits.tolist()}")
    prob = torch.sigmoid(logits).item()
    write_log(f"Sigmoid prob: {prob}")
    write_log("HF PROBE SUCCESSFUL!")
except Exception as e:
    import traceback
    write_log(f"HF PROBE FAILED: {e}")
    write_log(traceback.format_exc())
