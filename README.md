# Single-div practice

Akash's hand-coded solutions to the single-div workbook (50 exercises, 7 levels). Every solution is stored here so a landing page can show them all later.

## Layout

```
single-div/
├── index.html         the site: a gallery of every piece
├── assets/
│   ├── site.css
│   └── site.js        reads pieces.json, draws each piece in its own shadow root
├── pieces.json        one entry per solution: the record the site reads
└── pieces/
    └── 01-tricolour.html
```

## The site

A static page, no build step. It fetches `pieces.json` and the piece files, so it needs a web server, not `file://`:

```sh
cd ~/Desktop/LABS/single-div && python3 -m http.server 8765
# open http://localhost:8765
```

To host it, upload the whole folder as-is. A new piece shows up as soon as its file and its pieces.json entry exist. `#06-mountain` in the URL opens that drawing.

## A piece

Each file holds exactly what was written: the markup and the CSS, unchanged. A header comment records the exercise.

```html
<!--
  01 · Tricolour · level 1
  Submitted: 2026-10-21
  CodePen: https://codepen.io/…
-->
<div class="single-div-stage">
  <div class="single-div"></div>
</div>

<style>
/* the CSS, exactly as written */
</style>
```

- `.single-div` is the drawing: the only element the CSS draws with.
- `.single-div-stage` is a wrapper the landing page uses to size and frame each piece. It's not part of the drawing.
- A rule for `body` (a sky, a night background) belongs to the piece too; the landing page applies it to the stage.

Each piece is a complete page fragment, so the landing page can show it in an iframe or a shadow root without one piece's CSS affecting another.

## pieces.json

```json
[
  {
    "n": 1,
    "slug": "tricolour",
    "title": "Tricolour",
    "level": 1,
    "tags": [],
    "file": "pieces/01-tricolour.html",
    "codepen": "https://codepen.io/…",
    "submitted": "2026-10-21",
    "revised": null,
    "animated": false
  }
]
```

A resubmission replaces the file and sets `revised` to its date.
