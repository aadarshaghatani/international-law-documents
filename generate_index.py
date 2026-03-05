import os
import json

data_folder = "data"  # relative to where this script runs
output_file = "docs.json"

index = []

for root, dirs, files in os.walk(data_folder):
    for file in files:
        if file.endswith(".json"):
            full_path = os.path.join(root, file)
            # Get category from folder name (e.g., "foundations")
            category = os.path.basename(os.path.dirname(full_path))
            # Read the JSON to extract title (optional but nice)
            try:
                with open(full_path, 'r', encoding='utf-8') as f:
                    doc_data = json.load(f)
                    title = doc_data.get("title", file[:-5])
                    year = doc_data.get("year", None)
            except:
                title = file[:-5]
                year = None

            index.append({
                "title": title,
                "year": year,
                "category": category,
                "path": full_path.replace("\\", "/")  # use forward slashes for web
            })

# Write the index
with open(output_file, 'w', encoding='utf-8') as f:
    json.dump(index, f, indent=2, ensure_ascii=False)

print(f"Index created with {len(index)} documents.")