import os
import sys
import time
import torch

os.environ["KMP_DUPLICATE_LIB_OK"] = "TRUE"
os.environ["TOKENIZERS_PARALLELISM"] = "false"

log_file = os.path.join(os.path.dirname(__file__), "latency_test.log")

def write_log(text):
    with open(log_file, "a", encoding="utf-8") as f:
        f.write(text + "\n")
        f.flush()

with open(log_file, "w", encoding="utf-8") as f:
    f.write("LATENCY TEST START\n")

from transformers import AutoTokenizer, AutoModelForSequenceClassification

model_name = "cross-encoder/ms-marco-MiniLM-L-6-v2"
write_log("Loading model and tokenizer...")
t0 = time.perf_counter()
tokenizer = AutoTokenizer.from_pretrained(model_name)
model = AutoModelForSequenceClassification.from_pretrained(model_name)
model.eval()
t_load = time.perf_counter() - t0
write_log(f"Loaded in {t_load*1000:.1f}ms")

query = "How does Node.js handle asynchronous non-blocking I/O?"
passages = [
    "Node.js uses an event loop and libuv thread pool to handle asynchronous I/O operations non-blockingly.",
    "Express error-handling middleware requires four parameters: err, req, res, next.",
    "React useEffect runs after every render unless a dependency array is provided.",
    "PostgreSQL 3NF ensures that there are no transitive dependencies on the primary key.",
    "JavaScript temporal dead zone refers to accessing let or const before initialization.",
    "CSS box-sizing border-box includes padding and border within the element total width.",
    "Libuv provides the event loop and thread pool abstraction for asynchronous file and network I/O in Node.",
    "Relational database normalization eliminates redundant data across multiple tables.",
    "useRef provides a mutable reference container that persists across renders without triggering a re-render.",
    "Object.freeze prevents modification of existing properties and addition of new properties.",
    "Arrow functions establish lexical this bound to the enclosing lexical execution context.",
    "Repeatable Read isolation level in PostgreSQL guarantees that queries see snapshots from the start.",
    "HTML5 semantic tags like nav, header, main, and footer improve document structure and accessibility.",
    "Sequential scan in PostgreSQL is chosen by query planner when a high percentage of rows are retrieved.",
    "Next.js is a React framework that supports server-side rendering and static site generation."
]

pairs = [[query, p] for p in passages]
write_log(f"Testing batch of {len(pairs)} pairs...")

# Warmup run
inputs = tokenizer(pairs, padding=True, truncation=True, return_tensors="pt")
with torch.no_grad():
    _ = model(**inputs).logits

# Timed runs
timings = []
for run in range(5):
    t_start = time.perf_counter()
    inputs = tokenizer(pairs, padding=True, truncation=True, max_length=512, return_tensors="pt")
    with torch.no_grad():
        logits = model(**inputs).logits.squeeze(-1)
        probs = torch.sigmoid(logits)
    elapsed_ms = (time.perf_counter() - t_start) * 1000
    timings.append(elapsed_ms)
    write_log(f"Run {run+1}: {elapsed_ms:.2f}ms")

avg_ms = sum(timings) / len(timings)
write_log(f"Average latency for 15 pairs: {avg_ms:.2f}ms")

# Inspect top-scored and bottom-scored
scored = list(zip(passages, logits.tolist(), probs.tolist()))
scored.sort(key=lambda x: x[1], reverse=True)
write_log("\n--- Top Scored Results ---")
for p, logit, prob in scored[:3]:
    write_log(f"Prob: {prob:.4f} (logit {logit:.2f}) -> {p[:80]}")

write_log("\n--- Bottom Scored Results ---")
for p, logit, prob in scored[-3:]:
    write_log(f"Prob: {prob:.4f} (logit {logit:.2f}) -> {p[:80]}")

write_log("\nLATENCY TEST COMPLETE")
