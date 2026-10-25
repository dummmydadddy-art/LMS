import os
from collections import Counter

scratch_dir = r"d:\Collage project\EduConnect-LMS-Experimental\scratch"
ext_counter = Counter()
test_files = []
other_files = []

for root, dirs, files in os.walk(scratch_dir):
    for f in files:
        full_path = os.path.join(root, f)
        rel = os.path.relpath(full_path, scratch_dir)
        _, ext = os.path.splitext(f)
        ext_counter[ext.lower()] += 1
        size = os.path.getsize(full_path)
        if f.startswith('test_'):
            test_files.append((rel, size, ext.lower()))
        else:
            other_files.append((rel, size, ext.lower()))

print(f"Total files in scratch: {len(test_files) + len(other_files)}")
print(f"Extension distribution:")
for ext, count in ext_counter.most_common():
    display_ext = ext if ext else "(no ext)"
    print(f"  {display_ext}: {count}")

print(f"\ntest_* files count: {len(test_files)}")
test_exts = Counter([ext for _, _, ext in test_files])
for ext, count in test_exts.most_common():
    print(f"  test_* {ext}: {count}")

test_top_level = [f for f in test_files if os.path.dirname(f[0]) == ""]
print(f"\ntest_* files directly in root scratch/: {len(test_top_level)}")

print("\nSample test_* files directly in scratch/:")
for rel, size, ext in sorted(test_top_level)[:25]:
    print(f"  {rel} ({size} bytes)")
