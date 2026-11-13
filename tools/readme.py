#!/usr/bin/env python3
"""Regenerate the README gallery: one thumbnail per piece plus the table.

    python3 tools/readme.py

Reads pieces.json, screenshots tools/render.html#NN-slug with headless Chrome
into thumbs/NN-slug.png, removes thumbnails of pieces that are gone, and
rewrites the block between the <!-- pieces:start --> and <!-- pieces:end -->
markers in README.md. Needs only Python 3 and Google Chrome (set CHROME to
the browser's path if it isn't in the default macOS location).
"""

import functools
import http.server
import json
import os
import pathlib
import subprocess
import threading

ROOT = pathlib.Path(__file__).resolve().parent.parent
THUMBS = ROOT / "thumbs"
README = ROOT / "README.md"
SITE = "https://onediv.akashsrma.com/"
SIZE = 600
CHROME = os.environ.get(
    "CHROME", "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
)
START, END = "<!-- pieces:start -->", "<!-- pieces:end -->"


def serve():
    handler = functools.partial(
        type("Quiet", (http.server.SimpleHTTPRequestHandler,), {"log_message": lambda *a: None}),
        directory=str(ROOT),
    )
    server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    return server


def shoot(port, key):
    subprocess.run(
        [
            CHROME,
            "--headless=new",
            "--disable-gpu",
            "--hide-scrollbars",
            "--force-device-scale-factor=1",
            "--virtual-time-budget=3000",
            f"--window-size={SIZE},{SIZE}",
            f"--screenshot={THUMBS / (key + '.png')}",
            f"http://127.0.0.1:{port}/tools/render.html#{key}",
        ],
        check=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )


def table(pieces):
    rows = [
        "| | # | Drawing | Level | CSS |",
        "|---|---|---|---|---|",
    ]
    for p in pieces:
        key = f"{p['n']:02d}-{p['slug']}"
        thumb = f'<a href="{SITE}#{key}"><img src="thumbs/{key}.png" width="120" alt="{p["title"]}"></a>'
        rows.append(
            f"| {thumb} | {p['n']:02d} | [{p['title']}]({SITE}#{key}) | {p['level']} | [{p['file']}]({p['file']}) |"
        )
    return "\n".join(rows)


def main():
    pieces = sorted(json.loads((ROOT / "pieces.json").read_text()), key=lambda p: p["n"])
    keys = {f"{p['n']:02d}-{p['slug']}" for p in pieces}
    THUMBS.mkdir(exist_ok=True)

    server = serve()
    try:
        for key in sorted(keys):
            shoot(server.server_address[1], key)
            print("thumb", key)
    finally:
        server.shutdown()

    for png in THUMBS.glob("*.png"):
        if png.stem not in keys:
            png.unlink()
            print("removed", png.name)

    text = README.read_text()
    head, rest = text.split(START, 1)
    _, tail = rest.split(END, 1)
    README.write_text(f"{head}{START}\n{table(pieces)}\n{END}{tail}")
    print(f"README: {len(pieces)} pieces")


if __name__ == "__main__":
    main()
