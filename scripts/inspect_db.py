import sqlite3
import json

conn = sqlite3.connect(r'd:\Collage project\EduConnect-LMS-Experimental\backend\storage\vectors.sqlite')
cur = conn.cursor()

print("=== TABLES IN VECTORS.SQLITE ===")
cur.execute("SELECT name, sql FROM sqlite_master WHERE type='table'")
for row in cur.fetchall():
    print(f"Table: {row[0]}")
    print(row[1])
    print("-" * 50)

print("\n=== SAMPLE ROWS IN MATERIAL_CHUNKS ===")
cur.execute("SELECT count(*) FROM material_chunks")
count = cur.fetchone()[0]
print(f"Total existing chunks: {count}")

cur.execute("SELECT id, material_id, course_id, batch_id, chunk_index, title, length(content), length(embedding), metadata FROM material_chunks LIMIT 2")
for r in cur.fetchall():
    print(f"ID: {r[0]}, MaterialID: {r[1]}, Index: {r[4]}")
    print(f"Title: {r[5]}")
    print(f"Content Length: {r[6]}, Embedding Blob Length: {r[7]}")
    print(f"Metadata: {r[8]}")
    print("-" * 50)

conn.close()
