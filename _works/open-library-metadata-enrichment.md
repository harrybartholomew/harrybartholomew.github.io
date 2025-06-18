---
title: "Metadata enrichment with Open Library"
subtitle: "Retrieving metadata from ISBNs using the Open Library API"
thumbnail: "../images/label_1f3f7-fe0f.png"
---
[😻 Github link](https://github.com/harrybartholomew/Open-Library-metadata-enrichment)


Chatham House Library uses a non-MARC cataloguing format, with each bibliographic record created by a librarian from scratch without copy-cataloguing.
The older records on the catalogue were lacking core metadata fields, severely hindering their discoverability. I conducted 
a project to enrich records with two data elements: (1) abstracts and (2) languages.


Without the control numbers, system codes, and other identifiers that might be present in an imported MARC record, systematic
metadata enrichment was done using ISBNs only; pre-1970 records (and post-1970 records without ISBNs) could not therefore be included.


The ISBN of a record was passed to the [Open Library API](https://openlibrary.org/dev/docs/api/books) alongside my email address
and project name, which are requested by Open Library in case they need more information about one's use of the API.
The ISBN API retrieves metadata for the specific edition in JSON format; e.g., for `9780745661636`, one retrieves:
```
{
  "title": "Africa Emerges: Consummate Challenges, Abundant Opportunities",
  "number_of_pages": 288,
  "isbn_13": [
    "9780745661636"
  ],
  "isbn_10": [
    "0745661637"
  ],
  "publish_date": "Jun 17, 2013",
  "key": "/books/OL26861841M",
  "authors": [
    {
      "key": "/authors/OL2815667A"
    }
  ],
  "works": [
    {
      "key": "/works/OL19641753W"
    }
  ],
  "type": {
    "key": "/type/edition"
  },
  "lc_classifications": [
    "DT20",
    "HC800 .R68 2013",
    "HC800 .R675 2013"
  ],
  "oclc_numbers": [
    "811963330",
    "850056150"
  ],
}
```
The above (abridged) Open Library data is for the "edition" type. To get the abstract/description and language data, you need to 
access the "work" record using the work ID, which is retrieved as follows:

```python
# Configuration
APPLICATION_NAME = ""  # to identify your project to Open Library
CONTACT_EMAIL = ""  # in case Open Library needs to contact you

HEADERS = {
    "User-Agent": f"{APPLICATION_NAME} ({CONTACT_EMAIL})"
}


def get_description(isbn):

    def get_work_id(isbn):
        try:
            response = requests.get(url=f"http://openlibrary.org/isbn/{isbn}.json", timeout=10, headers=HEADERS)
            data = response.json()
            works = data.get("works")
            if works:
                return works[0]["key"]

    work_id = get_work_id(isbn)
```

Then, the work ID (for the *Africa Emerges* example above, `OL19641753W`) is passed back to the API to retrieve the description field:

```
  "description": {
    "type": "/type/text",
    "value": "\"Sub-Saharan Africa is no longer a troubled 'dark continent.' Most of its constituent countries are now 
    enjoying significant economic growth and political progress. The new Africa has begun to banish the miseries of the 
    past, and appears ready to play an important role in world affairs. Thanks to shifts in leadership and governance, 
    an African renaissance could be at hand. Yet the road ahead is not without obstacles. As world renowned expert on 
    African affairs, Robert Rotberg, expertly shows, Africa today may be poised to deliver real rewards to its long 
    suffering citizens but it faces critical new crises as well as abundant new opportunities. Africa Emerges draws on a
     wealth of empirical data to explore the key challenges Africa must overcome in the coming decades. From 
     peacekeeping to health and disease, from energy needs to education, this illuminating analysis diagnoses the
     remaining impediments Africa will need to surmount if it is to emerge in 2050 as a prosperous, peaceful, dynamic 
     collection of robust large and small nations. Africa Emerges offers an unparalleled guide for all those interested 
     in the dynamics of modern Africa's political, economic, and social development.\"--Publisher's note."
  },
```

The "description" in Open Library work records can have either a string or, as above, key-value pairs as its value, so 
the below code accounts for the different data types:

```python
try:
    response = requests.get(url=f"http://openlibrary.org{work_id}.json", timeout=10, headers=HEADERS)
    data = response.json()
    description_data = data.get("description")
    if isinstance(description_data, str):
        description = description_data
    elif isinstance(description_data, dict):
        description = description_data.get("value")
```