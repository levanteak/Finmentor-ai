import chromadb

client = chromadb.PersistentClient(path="./chroma_data")

print("=== КОЛЛЕКЦИИ ===")
for col in client.list_collections():
    print(f"  {col.name}: {col.count()} чанков")

print("\n=== STATIC KNOWLEDGE (первые 3 чанка) ===")
static = client.get_collection("static_knowledge")
result = static.get(limit=3, include=["documents", "metadatas", "embeddings"])
for doc, meta, vec in zip(result["documents"], result["metadatas"], result["embeddings"]):
    print(f"  [{meta['source']}] {doc[:100]}...")
    print(f"    Вектор: dim={len(vec)}, первые 5 значений: {[round(v,4) for v in vec[:10]]}")

print("\n=== USER DOCUMENTS ===")
user = client.get_collection("user_documents")
print(f"  Всего чанков: {user.count()}")
if user.count() > 0:
    result = user.get(limit=3, include=["documents", "metadatas"])
    for doc, meta in zip(result["documents"], result["metadatas"]):
        print(f"  [doc_id={meta['document_id']} user_id={meta['user_id']}] {doc[:100]}...")
