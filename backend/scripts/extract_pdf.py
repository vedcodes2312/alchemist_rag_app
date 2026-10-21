#!/usr/bin/env python3
"""
Extracts and formats text from 15-05-2021-084550The-Alchemist-Paulo-Coelho.pdf
into backend/data/source/the-alchemist.txt with section markers.
"""

import os
import re
import sys
import pypdf

PDF_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../15-05-2021-084550The-Alchemist-Paulo-Coelho.pdf'))
OUTPUT_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), '../data/source/the-alchemist.txt'))

def clean_page_text(text: str) -> str:
    # Remove header/footer page numbers if any
    lines = text.splitlines()
    filtered = []
    for line in lines:
        stripped = line.strip()
        # Drop standalone page numbers (e.g. "12", "13")
        if re.match(r'^\d+$', stripped):
            continue
        filtered.append(line)
    return '\n'.join(filtered)

def main():
    if not os.path.exists(PDF_PATH):
        print(f"Error: PDF not found at {PDF_PATH}", file=sys.stderr)
        sys.exit(1)

    reader = pypdf.PdfReader(PDF_PATH)
    print(f"Reading {PDF_PATH} ({len(reader.pages)} pages)...")

    sections = []

    # 1. Prologue (Page 11)
    prologue_text = clean_page_text(reader.pages[10].extract_text() or "")
    # Remove initial "Prologue" and translator line
    prologue_text = re.sub(r'^Prologue\s*\n(Translated by[^\n]+\n)?', '', prologue_text.strip(), flags=re.IGNORECASE)
    sections.append(("Prologue", prologue_text.strip()))

    # 2. Part One (Pages 14 to 44 -> 0-indexed 13 to 43)
    part_one_pages = []
    for p in range(13, 44):
        txt = clean_page_text(reader.pages[p].extract_text() or "")
        part_one_pages.append(txt.strip())
    part_one_text = "\n\n".join(part_one_pages)
    # Remove leading "PART ONE" if present
    part_one_text = re.sub(r'^PART\s+ONE\s*\n', '', part_one_text.strip(), flags=re.IGNORECASE)
    sections.append(("Part One", part_one_text.strip()))

    # 3. Part Two (Pages 46 to 123 -> 0-indexed 45 to 122)
    part_two_pages = []
    for p in range(45, 123):
        txt = clean_page_text(reader.pages[p].extract_text() or "")
        part_two_pages.append(txt.strip())
    part_two_text = "\n\n".join(part_two_pages)
    # Remove leading "PART TWO" if present
    part_two_text = re.sub(r'^PART\s+TWO\s*\n', '', part_two_text.strip(), flags=re.IGNORECASE)
    sections.append(("Part Two", part_two_text.strip()))

    # 4. Epilogue (Pages 124 to 125 -> 0-indexed 123 to 124)
    epilogue_pages = []
    for p in range(123, 125):
        txt = clean_page_text(reader.pages[p].extract_text() or "")
        epilogue_pages.append(txt.strip())
    epilogue_text = "\n\n".join(epilogue_pages)
    # Remove leading "Epilogue"
    epilogue_text = re.sub(r'^Epilogue\s*\n', '', epilogue_text.strip(), flags=re.IGNORECASE)
    sections.append(("Epilogue", epilogue_text.strip()))

    # Assemble output text with markdown section headings
    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    with open(OUTPUT_PATH, 'w', encoding='utf-8') as f:
        for title, content in sections:
            f.write(f"## {title}\n\n{content}\n\n")

    size_kb = os.path.getsize(OUTPUT_PATH) / 1024
    print(f"Successfully extracted {len(sections)} sections to {OUTPUT_PATH} ({size_kb:.1f} KB)")

if __name__ == "__main__":
    main()
