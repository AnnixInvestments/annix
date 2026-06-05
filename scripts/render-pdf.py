#!/usr/bin/env python3
"""Render image-based PDF drawings (or any PDF page) to readable PNGs.

Many RFQ / GA drawings that flow through Nix are scanned or vector images with
no selectable text, so the built-in file reader cannot show them. This helper
renders pages to PNG via PyMuPDF so a Claude session (or a developer) can read
the drawing and its embedded Bill-of-Materials table while debugging extraction.

Requirements: ``pip install pymupdf``

Examples
--------
Render every page of one PDF at 2x zoom into ./pdf-renders/ :

    python scripts/render-pdf.py "C:/path/to/drawing.pdf"

Render only page 1, zoomed 4x, into a chosen folder:

    python scripts/render-pdf.py drawing.pdf --page 1 --zoom 4 --out ./tmp

Crop a region (fractions of the page, 0..1) — handy for a dense BOM table in
the top-right corner — at high zoom so the text is legible:

    python scripts/render-pdf.py drawing.pdf --page 1 --zoom 6 \\
        --crop 0.74 0.05 1.0 0.55

Multiple PDFs at once:

    python scripts/render-pdf.py a.pdf b.pdf c.pdf
"""

import argparse
import os
import sys

try:
    import fitz  # PyMuPDF
except ImportError:
    sys.exit("PyMuPDF is required: pip install pymupdf")


def render(path, out_dir, page_no, zoom, crop):
    if not os.path.exists(path):
        print(f"MISSING: {path}")
        return
    doc = fitz.open(path)
    stem = os.path.splitext(os.path.basename(path))[0].replace(" ", "_")
    pages = range(doc.page_count) if page_no is None else [page_no - 1]
    for i in pages:
        if i < 0 or i >= doc.page_count:
            print(f"SKIP page {i + 1}: out of range (1..{doc.page_count})")
            continue
        page = doc[i]
        clip = None
        suffix = f"_p{i + 1}"
        if crop:
            r = page.rect
            x0f, y0f, x1f, y1f = crop
            clip = fitz.Rect(
                r.x0 + x0f * r.width, r.y0 + y0f * r.height,
                r.x0 + x1f * r.width, r.y0 + y1f * r.height,
            )
            suffix += "_crop"
        pix = page.get_pixmap(matrix=fitz.Matrix(zoom, zoom), clip=clip)
        out = os.path.join(out_dir, f"{stem}{suffix}.png")
        pix.save(out)
        print(f"saved {out}  ({pix.width}x{pix.height})")
    doc.close()


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("pdfs", nargs="+", help="PDF file path(s)")
    parser.add_argument("--page", type=int, default=None, help="1-based page number (default: all pages)")
    parser.add_argument("--zoom", type=float, default=2.0, help="render scale (default: 2.0; use 4-6 for dense tables)")
    parser.add_argument("--out", default="pdf-renders", help="output directory (default: ./pdf-renders)")
    parser.add_argument(
        "--crop", nargs=4, type=float, metavar=("X0", "Y0", "X1", "Y1"),
        help="crop region as page fractions 0..1 (left top right bottom)",
    )
    args = parser.parse_args()

    os.makedirs(args.out, exist_ok=True)
    for path in args.pdfs:
        render(path, args.out, args.page, args.zoom, args.crop)


if __name__ == "__main__":
    main()
