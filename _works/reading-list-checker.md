---
title: "Leganto list checker"
subtitle: "Automating bibliographic verification"
---

[😻 Github link](https://github.com/harrybartholomew/leganto_list_checker)


This project aims to allow librarians and library staff to automatically check how their holdings (on Ex
Libris’ Alma) meet the prescribed reading on reading lists made with Ex Libris’ Leganto software, taking into account
alternative edtions, enriching holdings data using the Internet Archive’s Open Library API.


# Requirements and instructions


Download both library holdings data from Alma and reading list data from Leganto in CSV format. You may need to delete
the first few lines from the Leganto CSV export that come before the table headings. Edit main.py to include your
library name, the reading list title, and the path to the 2 CSV files. Then run main.py.


# How it works


This project iterates through reading list items, checking for matches in the following ways:


1. The library's name is checked for in the holdings data contained on the reading list.
2. The ISBN on the reading list is checked for in the library holdings.
3. ISBNs of alternative editions are retrieved using the Open Library API, then each of these ISBNs is checked for in
   the library holdings.
4. The titles of the reading list items are searched for in library holdings.


# Output


The code creates an annotated, colour-coded bibliography in HTML.


# Limitations


Open Library's database does not always link different editions of the same work together, inhibiting checking for
alternative editions. Checking for text matches between normalised title strings does not account for translations or
changes in title between editions.

