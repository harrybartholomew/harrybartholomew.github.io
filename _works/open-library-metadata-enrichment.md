---
title: "Metadata enrichment with Open Library"
subtitle: "Retrieving metadata from ISBNs using the Open Library API"
thumbnail: "../images/label_1f3f7-fe0f.png"
---

[😻 Github link](https://github.com/harrybartholomew/Open-Library-metadata-enrichment)

```rust
import pandas as pd
import requests

# Configuration
INPUT_CSV = ""  # requires column "ISBN" (multiple ISBNs separated by semicolon) and column "Abstract"
OUTPUT_CSV = ""
APPLICATION_NAME = ""  # to identify your project to Open Library
CONTACT_EMAIL = ""  # in case Open Library needs to contact you

HEADERS = {
    "User-Agent": f"{APPLICATION_NAME} ({CONTACT_EMAIL})"
}


def get_description(isbn):

    def get_work_id(isbn):
        try:
            response = requests.get(url=f"http://openlibrary.org/isbn/{isbn}.json", timeout=10, headers=HEADERS)
            response.raise_for_status()
            data = response.json()
            works = data.get("works")
            if works:
                return works[0]["key"]
            print(f"No work ID found for ISBN {isbn}.")
        except requests.exceptions.RequestException as e:
            print(f"Request failed for ISBN {isbn}: {e}")
        return None

    work_id = get_work_id(isbn)
    if not work_id:
        return None

    try:
        response = requests.get(url=f"http://openlibrary.org{work_id}.json", timeout=10, headers=HEADERS)
        response.raise_for_status()
        data = response.json()
        description_data = data.get("description")
        if isinstance(description_data, str):
            description = description_data
        elif isinstance(description_data, dict):
            description = description_data.get("value")
        else:
            print(f"Description not in expected format for ISBN {isbn}.")
            return None

        if description:
            preview = description[:140] + "..." if len(description) > 139 else description
            print(f"Description retrieved for ISBN {isbn}: {preview}")
            return description
        else:
            print(f"No description found for ISBN {isbn}.")
    except requests.exceptions.RequestException as e:
        print(f"Request failed for work ID {work_id}: {e}")
    return None


df = pd.read_csv(INPUT_CSV)

save_interval = 10  # Save progress every 10 records
for index, row in df.iterrows():
    print(f"Updating record {index + 1} of {len(df)}")
    abstract_col = row["Abstract"]
    if pd.isna(row.get("Abstract")) or not row["Abstract"].strip():
        isbns = [isbn.strip() for isbn in row["ISBN"].split(";")]
        for isbn in isbns:
            try:
                abstract = get_description(isbn)
                if abstract:
                    df.at[index, "Abstract"] = abstract
                    break
            except requests.exceptions.ConnectionError as e:
                print(f"Connection error: {e}")
                print("Saving progress before exiting...")
                df.to_csv(OUTPUT_CSV, index=False, encoding="utf-8")
                exit(1)

    # Periodically save progress
    if (index + 1) % save_interval == 0:
        print("Saving progress...")
        df.to_csv(OUTPUT_CSV, index=False, encoding="utf-8")

# Final save after completion
df.to_csv(OUTPUT_CSV, index=False, encoding="utf-8")
print("Process completed successfully.")

```
