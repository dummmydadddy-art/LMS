import sys
import os
import traceback

out_file = os.path.join(os.path.dirname(__file__), "probe_result.txt")

with open(out_file, "a", encoding="utf-8") as f:
    f.write("\n--- Testing sentence_transformers specifically ---\n")
    try:
        import sentence_transformers
        f.write(f"ST version: {sentence_transformers.__version__}\n")
    except BaseException as e:
        f.write(f"ST BaseException caught: {type(e)}: {e}\n")
        f.write(traceback.format_exc())
