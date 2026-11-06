from datasets import load_dataset

DATASET = "Bayanat-Labs/open-arabic-books"
REVISION = "39876c0e7f28c2d16887c7c139800e0df9f87263"

stream = load_dataset(
    DATASET,
    "chapters",
    split="train",
    revision=REVISION,
    streaming=True,
)
row = next(iter(stream))
print("HUGGINGFACE_DATASETS_STREAM_OK")
print("revision:", REVISION)
print("book_id:", row.get("book_id"))
print("chapter_index:", row.get("chapter_index"))
print("section_type:", row.get("section_type"))
print("text_raw_chars:", len(row.get("text_raw") or ""))
print("footnotes:", len(row.get("footnotes") or []))
