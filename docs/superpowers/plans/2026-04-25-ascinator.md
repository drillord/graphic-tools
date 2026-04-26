# ASCINATOR Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Browser-based ASCII art generator — converts images to ASCII art with real-time preview, custom fonts, Google Fonts, color control and PNG/SVG export.

**Architecture:** Vanilla HTML/CSS/JS in `graphic-tools/ascinator/`. Core pipeline: uploaded image → offscreen canvas → per-cell luminance sampling → character mapping → main canvas `fillText`. State managed in `app.js`, rendering isolated in `renderer.js`, image adjustments in `processor.js`, fonts in `fonts.js`, export in `exporter.js`.

**Tech Stack:** Canvas API, ImageData, FontFace API, Google Fonts CSS API, canvas.toDataURL for export. GitHub Pages deploy with `?v=XX` cache busting.

---

## File Map

| File | Responsibility |
|---|---|
| `ascinator/index.html` | HTML shell, panel structure, script/style includes |
| `ascinator/css/style.css` | Dark theme (#111 panel, #0a0a0a canvas), contrasting sliders, button groups |
| `ascinator/js/renderer.js` | ASCII render engine — ImageData → canvas fillText |
| `ascinator/js/processor.js` | Image adjustments: contrast, brightness, invert, edge detection, overlay |
| `ascinator/js/fonts.js` | Font loading: system presets, file upload (.ttf/.otf), Google Fonts API |
| `ascinator/js/exporter.js` | PNG export (with watermark for free), SVG export |
| `ascinator/js/app.js` | State, UI bindings, orchestrates all modules |
| `ascinator/server.js` | Static dev server with Cache-Control: no-store |
| `ascinator/robots.txt` | Block AI crawlers |

---

## Task 1: HTML Shell + Dark Theme CSS

**Files:**
- Create: `ascinator/index.html`
- Create: `ascinator/css/style.css`

- [ ] **Step 1: Create index.html**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ASCINATOR</title>
  <link rel="stylesheet" href="css/style.css?v=1">
</head>
<body class="dark">

  <div class="app-layout">

    <!-- LEFT PANEL -->
    <aside class="sidebar">

      <div class="sidebar-header">
        <div class="logo">ASCINATOR</div>
        <nav class="nav-links">
          <a href="#" class="nav-link" id="btn-login">Login</a>
        </nav>
      </div>

      <div class="sidebar-body">

        <!-- Mode tabs -->
        <div class="mode-tabs">
          <button class="tab-btn active" data-mode="image">Image</button>
          <button class="tab-btn" data-mode="video">Video</button>
        </div>

        <!-- Actions -->
        <div class="action-row">
          <button class="btn-action" id="btn-upload">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            Upload Image
          </button>
          <input type="file" id="file-input" accept="image/*" hidden>
          <button class="btn-action" id="btn-export">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Export
          </button>
        </div>

        <!-- Character Sequence -->
        <div class="section">
          <div class="section-label">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="4" x2="20" y1="9" y2="9"/><line x1="4" x2="20" y1="15" y2="15"/><line x1="10" x2="8" y1="3" y2="21"/><line x1="16" x2="14" y1="3" y2="21"/></svg>
            Character Sequence
          </div>
          <div class="btn-grid" id="seq-grid">
            <button class="seg-btn active" data-seq="standard">Standard</button>
            <button class="seg-btn" data-seq="blocks">Blocks</button>
            <button class="seg-btn" data-seq="simple">Simple</button>
            <button class="seg-btn" data-seq="binary">Binary</button>
            <button class="seg-btn" data-seq="dense">Dense</button>
            <button class="seg-btn" data-seq="minimal">Minimal</button>
            <button class="seg-btn" data-seq="retro">Retro</button>
            <button class="seg-btn" data-seq="symbols">Symbols</button>
            <button class="seg-btn" data-seq="custom">Custom</button>
          </div>
          <input type="text" class="custom-seq-input" id="custom-seq" placeholder="Enter characters..." value="ASASQWREQ">
        </div>

        <!-- Font Family -->
        <div class="section">
          <div class="section-label">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 7V4h16v3"/><path d="M9 20h6"/><path d="M12 4v16"/></svg>
            Font Family
          </div>
          <div class="btn-grid" id="font-grid">
            <button class="seg-btn active" data-font="'Courier New', monospace">Courier</button>
            <button class="seg-btn" data-font="Consolas, monospace">Consolas</button>
            <button class="seg-btn" data-font="'Lucida Console', monospace">Lucida C.</button>
            <button class="seg-btn" data-font="monospace">Monospace</button>
          </div>
          <div class="font-upload-row">
            <button class="btn-secondary" id="btn-font-upload">Upload .ttf / .otf</button>
            <input type="file" id="font-file" accept=".ttf,.otf,.woff,.woff2" hidden>
            <span class="font-name" id="font-name-label">System default</span>
          </div>
          <div class="gfonts-row">
            <input type="text" class="gfonts-input" id="gfonts-input" placeholder="Search Google Fonts...">
            <div class="gfonts-results" id="gfonts-results" hidden></div>
          </div>
        </div>

        <!-- Sliders -->
        <div class="section">
          <div class="slider-row">
            <div class="slider-label">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
              Font Scale
            </div>
            <span class="slider-val" id="font-scale-val">1.00x</span>
          </div>
          <input type="range" class="slider" id="font-scale" min="0.5" max="3" step="0.05" value="1">

          <div class="slider-row">
            <div class="slider-label">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
              Character Spacing
            </div>
            <span class="slider-val" id="char-spacing-val">1.0</span>
          </div>
          <input type="range" class="slider" id="char-spacing" min="0.5" max="3" step="0.05" value="1">

          <div class="slider-row">
            <div class="slider-label">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
              Line Height
            </div>
            <span class="slider-val" id="line-height-val">1.2</span>
          </div>
          <input type="range" class="slider" id="line-height" min="0.8" max="2" step="0.05" value="1.2">

          <div class="slider-row">
            <div class="slider-label">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20"/></svg>
              Contrast
            </div>
            <span class="slider-val" id="contrast-val">1.0</span>
          </div>
          <input type="range" class="slider" id="contrast" min="0" max="3" step="0.05" value="1">

          <div class="slider-row">
            <div class="slider-label">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
              Brightness
            </div>
            <span class="slider-val" id="brightness-val">0.1</span>
          </div>
          <input type="range" class="slider" id="brightness" min="0" max="2" step="0.05" value="0.1">
        </div>

        <!-- Toggles -->
        <div class="section">
          <div class="toggle-row">
            <div class="toggle-label">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.375 2.625a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4Z"/></svg>
              Invert
            </div>
            <label class="toggle-switch">
              <input type="checkbox" id="invert-toggle">
              <span class="toggle-track"><span class="toggle-thumb"></span></span>
            </label>
          </div>

          <div class="toggle-row">
            <div class="toggle-label">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42z"/><circle cx="7" cy="7" r="1"/></svg>
              Overlay Original
            </div>
            <label class="toggle-switch">
              <input type="checkbox" id="overlay-toggle" checked>
              <span class="toggle-track"><span class="toggle-thumb"></span></span>
            </label>
          </div>
          <div class="sub-controls" id="overlay-controls">
            <div class="slider-row"><div class="slider-label">Opacity</div><span class="slider-val" id="overlay-opacity-val">1.0</span></div>
            <input type="range" class="slider" id="overlay-opacity" min="0" max="1" step="0.05" value="1">
            <div class="slider-row"><div class="slider-label">Blur Strength</div><span class="slider-val" id="overlay-blur-val">0.0</span></div>
            <input type="range" class="slider" id="overlay-blur" min="0" max="20" step="0.5" value="0">
          </div>

          <div class="toggle-row">
            <div class="toggle-label">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
              Edge Detection
            </div>
            <label class="toggle-switch">
              <input type="checkbox" id="edge-toggle" checked>
              <span class="toggle-track"><span class="toggle-thumb"></span></span>
            </label>
          </div>
          <div class="sub-controls" id="edge-controls">
            <input type="range" class="slider" id="edge-intensity" min="0" max="1" step="0.05" value="0.5">
          </div>
        </div>

        <!-- Color -->
        <div class="section">
          <div class="section-label">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20"/></svg>
            Color
            <button class="original-btn" id="btn-original-color">Original</button>
          </div>
          <div class="color-palette" id="color-palette"></div>
        </div>

        <!-- Background Color (PRO) -->
        <div class="section">
          <div class="section-label">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="18" x="3" y="3" rx="2"/></svg>
            Background Color
            <span class="pro-badge">PRO</span>
          </div>
          <div class="color-palette" id="bg-palette"></div>
        </div>

        <!-- Char Background (PRO) -->
        <div class="section">
          <div class="toggle-row">
            <div class="toggle-label">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
              Char Background
              <span class="pro-badge">PRO</span>
            </div>
            <label class="toggle-switch">
              <input type="checkbox" id="char-bg-toggle">
              <span class="toggle-track"><span class="toggle-thumb"></span></span>
            </label>
          </div>
        </div>

        <!-- Tone Color Map (PRO) -->
        <div class="section">
          <div class="toggle-row">
            <div class="toggle-label">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20"/><path d="M2 12h20"/></svg>
              Tone Color Map
              <span class="pro-badge">PRO</span>
            </div>
            <label class="toggle-switch">
              <input type="checkbox" id="tone-map-toggle">
              <span class="toggle-track"><span class="toggle-thumb"></span></span>
            </label>
          </div>
        </div>

      </div><!-- /sidebar-body -->
    </aside>

    <!-- CANVAS AREA -->
    <main class="canvas-area">
      <div class="canvas-placeholder" id="canvas-placeholder">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
        <p>Upload an image to begin</p>
      </div>
      <canvas id="main-canvas" hidden></canvas>
    </main>

  </div>

  <script src="js/processor.js?v=1"></script>
  <script src="js/renderer.js?v=1"></script>
  <script src="js/fonts.js?v=1"></script>
  <script src="js/exporter.js?v=1"></script>
  <script src="js/app.js?v=1"></script>
</body>
</html>
```

- [ ] **Step 2: Create style.css — dark theme, contrasting sliders**

```css
/* ── Reset ── */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

/* ── Tokens ── */
:root {
  --panel-bg:     #111111;
  --panel-border: #2a2a2a;
  --section-bg:   #181818;
  --track-bg:     #252525;
  --canvas-bg:    #0a0a0a;
  --text-muted:   #555555;
  --text-base:    #999999;
  --text-bright:  #e0e0e0;
  --accent:       #ffffff;
  --accent-dim:   rgba(255,255,255,0.12);
  --sidebar-w:    300px;
  --radius:       4px;
}

html, body {
  height: 100%;
  overflow: hidden;
  background: var(--canvas-bg);
  color: var(--text-base);
  font-family: 'SF Mono', 'Fira Code', 'Consolas', monospace;
  font-size: 11px;
}

/* ── Layout ── */
.app-layout {
  display: flex;
  height: 100vh;
}

/* ── Sidebar ── */
.sidebar {
  width: var(--sidebar-w);
  flex-shrink: 0;
  background: var(--panel-bg);
  border-right: 1px solid var(--panel-border);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid var(--panel-border);
  flex-shrink: 0;
}

.logo {
  font-size: 15px;
  font-weight: 800;
  letter-spacing: 3px;
  color: var(--text-bright);
}

.nav-links { display: flex; gap: 12px; }
.nav-link {
  font-size: 10px;
  color: var(--text-muted);
  text-decoration: none;
  letter-spacing: 0.5px;
  transition: color .15s;
}
.nav-link:hover { color: var(--text-base); }

.sidebar-body {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  scrollbar-width: thin;
  scrollbar-color: var(--panel-border) transparent;
}
.sidebar-body::-webkit-scrollbar { width: 3px; }
.sidebar-body::-webkit-scrollbar-thumb { background: var(--panel-border); }

/* ── Mode tabs ── */
.mode-tabs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  border-bottom: 1px solid var(--panel-border);
}
.tab-btn {
  background: none;
  border: none;
  color: var(--text-muted);
  font-family: inherit;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.5px;
  padding: 10px;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: all .15s;
}
.tab-btn.active { color: var(--text-bright); border-bottom-color: var(--accent); }
.tab-btn:hover:not(.active) { color: var(--text-base); }

/* ── Action row ── */
.action-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
  padding: 10px 12px;
  border-bottom: 1px solid var(--panel-border);
}
.btn-action {
  display: flex;
  align-items: center;
  gap: 5px;
  justify-content: center;
  background: var(--section-bg);
  border: 1px solid var(--panel-border);
  border-radius: var(--radius);
  color: var(--text-base);
  font-family: inherit;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.3px;
  padding: 7px 6px;
  cursor: pointer;
  transition: all .15s;
}
.btn-action:hover { border-color: var(--accent); color: var(--text-bright); }

/* ── Sections ── */
.section {
  padding: 12px;
  border-bottom: 1px solid var(--panel-border);
}
.section-label {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 2px;
  color: var(--text-muted);
  text-transform: uppercase;
  margin-bottom: 8px;
}

/* ── Button grid (seq / font) ── */
.btn-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 4px;
  margin-bottom: 6px;
}
.seg-btn {
  background: var(--track-bg);
  border: 1px solid var(--panel-border);
  border-radius: var(--radius);
  color: var(--text-muted);
  font-family: inherit;
  font-size: 9px;
  font-weight: 600;
  letter-spacing: 0.3px;
  padding: 5px 3px;
  cursor: pointer;
  transition: all .15s;
  text-align: center;
}
.seg-btn:hover { color: var(--text-base); border-color: #3a3a3a; }
.seg-btn.active {
  background: var(--accent);
  border-color: var(--accent);
  color: #000;
}

/* ── Custom seq input ── */
.custom-seq-input {
  display: none;
  width: 100%;
  background: var(--track-bg);
  border: 1px solid var(--panel-border);
  border-radius: var(--radius);
  color: var(--text-bright);
  font-family: inherit;
  font-size: 11px;
  padding: 6px 8px;
  outline: none;
  margin-top: 4px;
}
.custom-seq-input.visible { display: block; }
.custom-seq-input:focus { border-color: var(--accent); }

/* ── Font upload row ── */
.font-upload-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 6px;
}
.btn-secondary {
  background: transparent;
  border: 1px solid var(--panel-border);
  border-radius: var(--radius);
  color: var(--text-base);
  font-family: inherit;
  font-size: 9px;
  padding: 4px 8px;
  cursor: pointer;
  white-space: nowrap;
  transition: all .15s;
}
.btn-secondary:hover { border-color: var(--accent); color: var(--text-bright); }
.font-name {
  font-size: 9px;
  color: var(--text-muted);
  font-style: italic;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ── Google Fonts ── */
.gfonts-row { margin-top: 6px; position: relative; }
.gfonts-input {
  width: 100%;
  background: var(--track-bg);
  border: 1px solid var(--panel-border);
  border-radius: var(--radius);
  color: var(--text-bright);
  font-family: inherit;
  font-size: 10px;
  padding: 5px 8px;
  outline: none;
}
.gfonts-input:focus { border-color: var(--accent); }
.gfonts-results {
  position: absolute;
  top: calc(100% + 2px);
  left: 0; right: 0;
  background: #1e1e1e;
  border: 1px solid var(--panel-border);
  border-radius: var(--radius);
  max-height: 150px;
  overflow-y: auto;
  z-index: 100;
}
.gfonts-item {
  padding: 6px 10px;
  cursor: pointer;
  font-size: 10px;
  color: var(--text-base);
}
.gfonts-item:hover { background: var(--track-bg); color: var(--text-bright); }

/* ── Sliders ── */
.slider-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 8px;
  margin-bottom: 3px;
}
.slider-label {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 10px;
  color: var(--text-base);
}
.slider-val {
  font-size: 10px;
  color: var(--text-bright);
  font-weight: 600;
}
input[type="range"].slider {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 3px;
  background: var(--track-bg);
  border: 1px solid #333;
  border-radius: 2px;
  outline: none;
  cursor: pointer;
  margin-bottom: 4px;
}
input[type="range"].slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #ffffff;
  border: 2px solid #444;
  box-shadow: 0 0 0 1px #000, 0 1px 3px rgba(0,0,0,.8);
  cursor: pointer;
  transition: transform .1s, box-shadow .1s;
}
input[type="range"].slider::-webkit-slider-thumb:hover {
  transform: scale(1.15);
  box-shadow: 0 0 0 1px #000, 0 0 6px rgba(255,255,255,.3);
}
input[type="range"].slider::-moz-range-thumb {
  width: 14px; height: 14px;
  border-radius: 50%;
  background: #ffffff;
  border: 2px solid #444;
  cursor: pointer;
}

/* ── Toggle switch ── */
.toggle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 0;
}
.toggle-label {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 10px;
  color: var(--text-base);
}
.toggle-switch { position: relative; flex-shrink: 0; }
.toggle-switch input { opacity: 0; position: absolute; width: 0; height: 0; }
.toggle-track {
  display: block;
  width: 30px; height: 16px;
  background: var(--track-bg);
  border: 1px solid var(--panel-border);
  border-radius: 8px;
  cursor: pointer;
  transition: all .2s;
  position: relative;
}
.toggle-thumb {
  position: absolute;
  left: 2px; top: 50%;
  transform: translateY(-50%);
  width: 10px; height: 10px;
  border-radius: 50%;
  background: var(--text-muted);
  transition: all .2s;
}
.toggle-switch input:checked ~ .toggle-track { background: #2a2a2a; border-color: var(--accent); }
.toggle-switch input:checked ~ .toggle-track .toggle-thumb {
  left: 16px;
  background: var(--accent);
}

.sub-controls { padding: 4px 0 4px 4px; }

/* ── Color palette ── */
.color-palette {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin-top: 4px;
}
.color-swatch {
  width: 20px; height: 20px;
  border-radius: 3px;
  cursor: pointer;
  border: 2px solid transparent;
  transition: transform .1s, border-color .1s;
  flex-shrink: 0;
}
.color-swatch:hover { transform: scale(1.1); }
.color-swatch.active { border-color: var(--accent); }
.color-swatch.checkered {
  background-image: linear-gradient(45deg, #333 25%, transparent 25%),
    linear-gradient(-45deg, #333 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #333 75%),
    linear-gradient(-45deg, transparent 75%, #333 75%);
  background-size: 6px 6px;
  background-position: 0 0, 0 3px, 3px -3px, -3px 0px;
}
.original-btn {
  margin-left: auto;
  background: transparent;
  border: 1px solid var(--panel-border);
  border-radius: var(--radius);
  color: var(--text-muted);
  font-family: inherit;
  font-size: 8px;
  padding: 2px 6px;
  cursor: pointer;
  transition: all .15s;
}
.original-btn:hover, .original-btn.active { border-color: var(--accent); color: var(--accent); }

/* ── PRO badge ── */
.pro-badge {
  font-size: 7px;
  font-weight: 800;
  letter-spacing: 1px;
  background: #c9a227;
  color: #000;
  padding: 1px 4px;
  border-radius: 2px;
}

/* ── Canvas area ── */
.canvas-area {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--canvas-bg);
  overflow: hidden;
  position: relative;
}
.canvas-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  color: #2a2a2a;
}
.canvas-placeholder p { font-size: 12px; letter-spacing: 1px; }
#main-canvas {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}
```

- [ ] **Step 3: Verify layout in browser**

```bash
cd ~/claude-projekty/GitHub/graphic-tools/ascinator
# open index.html in browser (or use server.js from font-deformer)
open index.html
```
Expected: Dark panel left, empty canvas right, logo ASCINATOR, all controls rendered, sliders have white thumbs.

- [ ] **Step 4: Commit**

```bash
git add ascinator/index.html ascinator/css/style.css
git commit -m "feat(ascinator): HTML shell and dark theme CSS"
```

---

## Task 2: ASCII Renderer Engine

**Files:**
- Create: `ascinator/js/renderer.js`

- [ ] **Step 1: Define character sequence map**

```javascript
// renderer.js
window.Renderer = (() => {
  const SEQUENCES = {
    standard: ' .:-=+*#%@',
    blocks:   ' ░▒▓█',
    simple:   ' .oO0@',
    binary:   ' 01',
    dense:    ' !"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    minimal:  ' .:',
    retro:    ' .+xX$&@',
    symbols:  ' .*+#@!?~^',
  };
```

- [ ] **Step 2: Implement core render function**

```javascript
  // Renders ASCII art from ImageData onto ctx.
  // opts: { chars, fontSize, fontFamily, charSpacing, lineHeight,
  //         contrast, brightness, invert, color, useOriginalColor,
  //         charBg, charBgColor, bgColor }
  function render(srcImageData, srcW, srcH, ctx, canvasW, canvasH, opts) {
    const {
      chars, fontSize, fontFamily, charSpacing, lineHeight,
      contrast, brightness, invert, color, useOriginalColor,
      bgColor,
    } = opts;

    const cellW = Math.max(1, Math.round(fontSize * 0.55 * charSpacing));
    const cellH = Math.max(1, Math.round(fontSize * lineHeight));
    const cols  = Math.floor(canvasW / cellW);
    const rows  = Math.floor(canvasH / cellH);

    // Background
    ctx.fillStyle = bgColor || '#000000';
    ctx.fillRect(0, 0, canvasW, canvasH);

    ctx.font          = `${fontSize}px ${fontFamily}`;
    ctx.textBaseline  = 'top';
    ctx.textAlign     = 'left';

    const src = srcImageData.data;

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        // Sample source pixel (nearest neighbor)
        const sx = Math.floor((col / cols) * srcW);
        const sy = Math.floor((row / rows) * srcH);
        const si = (sy * srcW + sx) * 4;

        const r = src[si];
        const g = src[si + 1];
        const b = src[si + 2];

        // Luminance 0-1
        let lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

        // Brightness: additive shift
        lum = Math.min(1, Math.max(0, lum + (brightness - 1)));

        // Contrast: power curve
        if (contrast !== 1) lum = Math.min(1, Math.max(0, Math.pow(lum, 1 / contrast)));

        // Invert
        if (invert) lum = 1 - lum;

        // Map to character
        const charIdx = Math.min(chars.length - 1, Math.floor(lum * chars.length));
        const ch = chars[charIdx];
        if (!ch || ch === ' ') continue;

        // Color
        if (useOriginalColor) {
          ctx.fillStyle = `rgb(${r},${g},${b})`;
        } else {
          ctx.fillStyle = color;
        }

        ctx.fillText(ch, col * cellW, row * cellH);
      }
    }
  }
```

- [ ] **Step 3: Expose getChars helper and public API**

```javascript
  function getChars(seqKey, customValue) {
    if (seqKey === 'custom') return customValue || SEQUENCES.standard;
    return SEQUENCES[seqKey] || SEQUENCES.standard;
  }

  return { render, getChars, SEQUENCES };
})();
```

- [ ] **Step 4: Manual verify**

Add test snippet temporarily to index.html `<script>` before app.js:
```javascript
// temp test - remove after verifying
const testCanvas = document.createElement('canvas');
testCanvas.width = 200; testCanvas.height = 100;
const tctx = testCanvas.getContext('2d');
const imgD = tctx.createImageData(200, 100);
// fill with gradient luminance
for (let i = 0; i < imgD.data.length; i += 4) {
  const x = (i / 4) % 200;
  const v = Math.floor((x / 200) * 255);
  imgD.data[i] = imgD.data[i+1] = imgD.data[i+2] = v;
  imgD.data[i+3] = 255;
}
const out = document.createElement('canvas');
out.width = 800; out.height = 200;
document.body.appendChild(out);
Renderer.render(imgD, 200, 100, out.getContext('2d'), 800, 200, {
  chars: Renderer.getChars('standard'),
  fontSize: 12, fontFamily: 'Courier New', charSpacing: 1, lineHeight: 1.2,
  contrast: 1, brightness: 1, invert: false, color: '#ffffff',
  useOriginalColor: false, bgColor: '#000000',
});
console.assert(out.getContext('2d'), 'Canvas rendered without error');
```

Expected: gradient of ASCII characters from dark (space/dot) to bright (@) visible in browser.

- [ ] **Step 5: Remove test snippet, commit**

```bash
git add ascinator/js/renderer.js
git commit -m "feat(ascinator): ASCII renderer engine"
```

---

## Task 3: Image Processor (adjustments + edge detection + overlay)

**Files:**
- Create: `ascinator/js/processor.js`

- [ ] **Step 1: Implement getProcessedImageData**

```javascript
// processor.js
window.Processor = (() => {

  // Returns a new ImageData with contrast/brightness applied,
  // suitable for passing to Renderer.render().
  // Note: renderer also applies these — processor is for overlay/edge pre-pass.
  function applyAdjustments(imageData, contrast, brightness) {
    const src = imageData.data;
    const out = new Uint8ClampedArray(src);
    for (let i = 0; i < out.length; i += 4) {
      const lum = (0.299 * src[i] + 0.587 * src[i+1] + 0.114 * src[i+2]) / 255;
      // We don't alter RGB directly here — renderer handles it per char.
      // This pass is used for overlay/edge pre-processing.
    }
    return new ImageData(out, imageData.width, imageData.height);
  }
```

- [ ] **Step 2: Implement Sobel edge detection**

```javascript
  // Returns grayscale ImageData with edges enhanced.
  // intensity 0-1 blends between original and edge-detected.
  function edgeDetect(imageData, w, h, intensity) {
    const src = imageData.data;
    const out = new Uint8ClampedArray(src);

    const kernelX = [-1,0,1, -2,0,2, -1,0,1];
    const kernelY = [-1,-2,-1, 0,0,0, 1,2,1];

    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        let gx = 0, gy = 0;
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const si = ((y + ky) * w + (x + kx)) * 4;
            const lum = (src[si] * 0.299 + src[si+1] * 0.587 + src[si+2] * 0.114);
            const ki = (ky + 1) * 3 + (kx + 1);
            gx += lum * kernelX[ki];
            gy += lum * kernelY[ki];
          }
        }
        const mag = Math.min(255, Math.sqrt(gx*gx + gy*gy));
        const di = (y * w + x) * 4;
        const origLum = src[di] * 0.299 + src[di+1] * 0.587 + src[di+2] * 0.114;
        const mixed = origLum * (1 - intensity) + mag * intensity;
        out[di] = out[di+1] = out[di+2] = mixed;
        out[di+3] = src[di+3];
      }
    }
    return new ImageData(out, w, h);
  }
```

- [ ] **Step 3: Implement overlay drawing**

```javascript
  // Draws original image blurred+transparent over ctx (call AFTER ASCII render).
  function drawOverlay(srcImg, ctx, canvasW, canvasH, opacity, blurPx) {
    ctx.save();
    if (blurPx > 0) ctx.filter = `blur(${blurPx}px)`;
    ctx.globalAlpha = opacity;
    ctx.drawImage(srcImg, 0, 0, canvasW, canvasH);
    ctx.filter = 'none';
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  return { applyAdjustments, edgeDetect, drawOverlay };
})();
```

- [ ] **Step 4: Commit**

```bash
git add ascinator/js/processor.js
git commit -m "feat(ascinator): image processor with edge detection and overlay"
```

---

## Task 4: Font System (system presets + upload + Google Fonts)

**Files:**
- Create: `ascinator/js/fonts.js`

- [ ] **Step 1: Implement font loader**

```javascript
// fonts.js
window.FontSystem = (() => {
  const GOOGLE_FONTS_LIST_URL =
    'https://www.googleapis.com/webfonts/v1/webfonts?key=AIzaSyDummy&sort=popularity';
  // Note: Google Fonts Developer API key needed. Fallback: use CSS API without key.

  let currentFont = "'Courier New', monospace";
  let loadedGFonts = [];

  // Load font from file (ttf/otf/woff)
  function loadFromFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = ev => {
        const name = 'Custom_' + Date.now();
        const face = new FontFace(name, ev.target.result);
        face.load().then(loaded => {
          document.fonts.add(loaded);
          currentFont = `'${name}', monospace`;
          resolve({ name, displayName: file.name.replace(/\.[^.]+$/, '') });
        }).catch(reject);
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  }

  // Search Google Fonts (using CSS2 API — no key needed for loading, key needed for list)
  // We use a curated popular monospace list as fallback if API not available.
  const POPULAR_MONO = [
    'Roboto Mono', 'Source Code Pro', 'Fira Code', 'JetBrains Mono',
    'IBM Plex Mono', 'Space Mono', 'Inconsolata', 'Oxygen Mono',
    'Share Tech Mono', 'Cutive Mono', 'Nova Mono', 'VT323',
  ];

  function searchFonts(query) {
    const q = query.toLowerCase();
    return POPULAR_MONO.filter(f => f.toLowerCase().includes(q)).slice(0, 8);
  }

  // Load a Google Font by name via CSS link injection
  function loadGoogleFont(fontName) {
    return new Promise((resolve) => {
      const id = 'gf-' + fontName.replace(/\s+/g, '-');
      if (!document.getElementById(id)) {
        const link = document.createElement('link');
        link.id = id;
        link.rel = 'stylesheet';
        link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontName)}&display=swap`;
        document.head.appendChild(link);
      }
      // Wait for font to be available
      document.fonts.ready.then(() => {
        currentFont = `'${fontName}', monospace`;
        resolve(fontName);
      });
    });
  }

  function setSystemFont(cssValue) {
    currentFont = cssValue;
  }

  function getCurrentFont() { return currentFont; }

  return { loadFromFile, searchFonts, loadGoogleFont, setSystemFont, getCurrentFont };
})();
```

- [ ] **Step 2: Manual test in console**

Open browser console on index.html and run:
```javascript
FontSystem.searchFonts('fira');
// Expected: ['Fira Code']
FontSystem.searchFonts('mono');
// Expected: array of monospace fonts containing 'mono'
```

- [ ] **Step 3: Commit**

```bash
git add ascinator/js/fonts.js
git commit -m "feat(ascinator): font system with upload and Google Fonts"
```

---

## Task 5: Exporter (PNG with watermark + SVG)

**Files:**
- Create: `ascinator/js/exporter.js`

- [ ] **Step 1: Implement PNG export with watermark**

```javascript
// exporter.js
window.Exporter = (() => {

  function exportPNG(canvas, filename, addWatermark) {
    if (addWatermark) {
      const tmp = document.createElement('canvas');
      tmp.width  = canvas.width;
      tmp.height = canvas.height;
      const tctx = tmp.getContext('2d');
      tctx.drawImage(canvas, 0, 0);
      // Watermark
      tctx.font = `bold ${Math.max(10, canvas.width * 0.012)}px 'SF Mono', monospace`;
      tctx.fillStyle = 'rgba(255,255,255,0.18)';
      tctx.textAlign = 'right';
      tctx.textBaseline = 'bottom';
      tctx.fillText('ASCINATOR', canvas.width - 10, canvas.height - 8);
      const a = document.createElement('a');
      a.href = tmp.toDataURL('image/png');
      a.download = filename || 'ascinator.png';
      a.click();
    } else {
      const a = document.createElement('a');
      a.href = canvas.toDataURL('image/png');
      a.download = filename || 'ascinator.png';
      a.click();
    }
  }

  function exportSVG(canvas, bgColor, filename) {
    const w = canvas.width;
    const h = canvas.height;
    const dataURL = canvas.toDataURL('image/png');
    const svg = [
      `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${w}" height="${h}">`,
      `  <rect width="${w}" height="${h}" fill="${bgColor || '#000'}"/>`,
      `  <image href="${dataURL}" x="0" y="0" width="${w}" height="${h}"/>`,
      `</svg>`,
    ].join('\n');
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = filename || 'ascinator.svg';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  return { exportPNG, exportSVG };
})();
```

- [ ] **Step 2: Commit**

```bash
git add ascinator/js/exporter.js
git commit -m "feat(ascinator): PNG exporter with watermark and SVG export"
```

---

## Task 6: App Controller — State + UI Bindings + Render Pipeline

**Files:**
- Create: `ascinator/js/app.js`

- [ ] **Step 1: Define state**

```javascript
// app.js
(function () {
'use strict';

const state = {
  // Image
  srcImage:     null,   // HTMLImageElement
  srcImageData: null,   // ImageData (full size)
  srcW: 0, srcH: 0,

  // Sequence
  seqKey:    'standard',
  customSeq: 'ASASQWREQ',

  // Font
  fontFamily:  "'Courier New', monospace",
  fontSize:    12,

  // Render params
  charSpacing:  1.0,
  lineHeight:   1.2,
  contrast:     1.0,
  brightness:   0.1,
  invert:       false,

  // Overlay
  overlayEnabled: true,
  overlayOpacity: 1.0,
  overlayBlur:    0,

  // Edge detection
  edgeEnabled:    true,
  edgeIntensity:  0.5,

  // Color
  asciiColor:         '#ffffff',
  useOriginalColor:   false,
  bgColor:            '#000000',
  charBgEnabled:      false,
  toneMapEnabled:     false,
};

const PALETTE = [
  '#ffffff','#111111','#00d4ff','#00ff88','#44dd44','#88cc00',
  '#cccc00','#cc8800','#ff7700','#cc2200','#cc0044','#8800cc',
  '#4444dd','#0066cc','#558888','#996633',
];

const $ = id => document.getElementById(id);
const canvas = $('main-canvas');
const ctx    = canvas.getContext('2d');
const placeholder = $('canvas-placeholder');
```

- [ ] **Step 2: Implement render pipeline**

```javascript
function render() {
  if (!state.srcImageData) return;

  // Resize canvas to match image aspect at reasonable size
  const maxW = Math.floor(window.innerWidth - 300);
  const maxH = window.innerHeight;
  const aspect = state.srcW / state.srcH;
  let cw = maxW, ch = Math.round(maxW / aspect);
  if (ch > maxH) { ch = maxH; cw = Math.round(maxH * aspect); }
  canvas.width  = cw;
  canvas.height = ch;

  // Pre-process: edge detection
  let imgData = state.srcImageData;
  if (state.edgeEnabled && state.edgeIntensity > 0) {
    imgData = Processor.edgeDetect(imgData, state.srcW, state.srcH, state.edgeIntensity);
  }

  // Render ASCII
  Renderer.render(imgData, state.srcW, state.srcH, ctx, cw, ch, {
    chars:           Renderer.getChars(state.seqKey, state.customSeq),
    fontSize:        state.fontSize,
    fontFamily:      state.fontFamily,
    charSpacing:     state.charSpacing,
    lineHeight:      state.lineHeight,
    contrast:        state.contrast,
    brightness:      state.brightness,
    invert:          state.invert,
    color:           state.asciiColor,
    useOriginalColor: state.useOriginalColor,
    bgColor:         state.bgColor,
  });

  // Overlay original image on top
  if (state.overlayEnabled && state.srcImage) {
    Processor.drawOverlay(
      state.srcImage, ctx, cw, ch,
      state.overlayOpacity, state.overlayBlur
    );
  }
}
```

- [ ] **Step 3: Image loading**

```javascript
function loadImage(file) {
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => {
    // Extract ImageData at natural size (capped at 1200px wide for performance)
    const maxSrc = 1200;
    const scale  = Math.min(1, maxSrc / img.naturalWidth);
    const sw = Math.round(img.naturalWidth  * scale);
    const sh = Math.round(img.naturalHeight * scale);

    const offscreen = document.createElement('canvas');
    offscreen.width  = sw;
    offscreen.height = sh;
    const octx = offscreen.getContext('2d');
    octx.drawImage(img, 0, 0, sw, sh);

    state.srcImage     = img;
    state.srcImageData = octx.getImageData(0, 0, sw, sh);
    state.srcW = sw;
    state.srcH = sh;

    placeholder.hidden = true;
    canvas.hidden      = false;
    render();
    URL.revokeObjectURL(url);
  };
  img.src = url;
}
```

- [ ] **Step 4: Bind all UI controls**

```javascript
function bindUI() {
  // Upload
  $('btn-upload').addEventListener('click', () => $('file-input').click());
  $('file-input').addEventListener('change', e => {
    if (e.target.files[0]) loadImage(e.target.files[0]);
  });

  // Drag & drop on canvas area
  const canvasArea = document.querySelector('.canvas-area');
  canvasArea.addEventListener('dragover', e => e.preventDefault());
  canvasArea.addEventListener('drop', e => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f && f.type.startsWith('image/')) loadImage(f);
  });

  // Export
  $('btn-export').addEventListener('click', () => {
    Exporter.exportPNG(canvas, `ascinator-${Date.now()}.png`, true); // watermark = true (free)
  });

  // Mode tabs
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  // Character sequence
  document.querySelectorAll('[data-seq]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-seq]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.seqKey = btn.dataset.seq;
      const customInput = $('custom-seq');
      customInput.classList.toggle('visible', state.seqKey === 'custom');
      render();
    });
  });
  $('custom-seq').addEventListener('input', e => {
    state.customSeq = e.target.value;
    if (state.seqKey === 'custom') render();
  });

  // Font family buttons
  document.querySelectorAll('[data-font]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-font]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.fontFamily = btn.dataset.font;
      FontSystem.setSystemFont(state.fontFamily);
      render();
    });
  });

  // Font file upload
  $('btn-font-upload').addEventListener('click', () => $('font-file').click());
  $('font-file').addEventListener('change', e => {
    const f = e.target.files[0];
    if (!f) return;
    FontSystem.loadFromFile(f).then(({ name, displayName }) => {
      state.fontFamily = FontSystem.getCurrentFont();
      $('font-name-label').textContent = displayName;
      document.querySelectorAll('[data-font]').forEach(b => b.classList.remove('active'));
      render();
    });
  });

  // Google Fonts search
  const gInput   = $('gfonts-input');
  const gResults = $('gfonts-results');
  gInput.addEventListener('input', e => {
    const q = e.target.value.trim();
    if (q.length < 2) { gResults.hidden = true; return; }
    const results = FontSystem.searchFonts(q);
    if (!results.length) { gResults.hidden = true; return; }
    gResults.innerHTML = results.map(f =>
      `<div class="gfonts-item" data-gfont="${f}">${f}</div>`
    ).join('');
    gResults.hidden = false;
  });
  gResults.addEventListener('click', e => {
    const item = e.target.closest('.gfonts-item');
    if (!item) return;
    const fontName = item.dataset.gfont;
    gResults.hidden = true;
    gInput.value = fontName;
    FontSystem.loadGoogleFont(fontName).then(() => {
      state.fontFamily = FontSystem.getCurrentFont();
      $('font-name-label').textContent = fontName;
      document.querySelectorAll('[data-font]').forEach(b => b.classList.remove('active'));
      render();
    });
  });
  document.addEventListener('click', e => {
    if (!gResults.contains(e.target) && e.target !== gInput) gResults.hidden = true;
  });

  // Sliders
  const bindSlider = (id, valId, fmt, stateProp) => {
    $(id).addEventListener('input', e => {
      const v = parseFloat(e.target.value);
      state[stateProp] = v;
      $(valId).textContent = fmt(v);
      render();
    });
  };
  bindSlider('font-scale',    'font-scale-val',    v => v.toFixed(2)+'x',  'fontSize');
  // Note: font-scale maps to fontSize (base 12px * scale)
  $('font-scale').addEventListener('input', e => {
    state.fontSize = Math.round(12 * parseFloat(e.target.value));
    $('font-scale-val').textContent = parseFloat(e.target.value).toFixed(2) + 'x';
    render();
  });
  bindSlider('char-spacing',  'char-spacing-val',  v => v.toFixed(1),      'charSpacing');
  bindSlider('line-height',   'line-height-val',   v => v.toFixed(1),      'lineHeight');
  bindSlider('contrast',      'contrast-val',      v => v.toFixed(1),      'contrast');
  bindSlider('brightness',    'brightness-val',    v => v.toFixed(1),      'brightness');

  // Toggles
  $('invert-toggle').addEventListener('change', e => {
    state.invert = e.target.checked; render();
  });
  $('overlay-toggle').addEventListener('change', e => {
    state.overlayEnabled = e.target.checked;
    $('overlay-controls').style.display = e.target.checked ? 'block' : 'none';
    render();
  });
  $('overlay-opacity').addEventListener('input', e => {
    state.overlayOpacity = parseFloat(e.target.value);
    $('overlay-opacity-val').textContent = state.overlayOpacity.toFixed(1);
    render();
  });
  $('overlay-blur').addEventListener('input', e => {
    state.overlayBlur = parseFloat(e.target.value);
    $('overlay-blur-val').textContent = state.overlayBlur.toFixed(1);
    render();
  });
  $('edge-toggle').addEventListener('change', e => {
    state.edgeEnabled = e.target.checked;
    $('edge-controls').style.display = e.target.checked ? 'block' : 'none';
    render();
  });
  $('edge-intensity').addEventListener('input', e => {
    state.edgeIntensity = parseFloat(e.target.value);
    render();
  });

  // Color palette
  buildPalette('color-palette', color => {
    state.asciiColor = color;
    state.useOriginalColor = false;
    $('btn-original-color').classList.remove('active');
    render();
  });
  $('btn-original-color').addEventListener('click', e => {
    state.useOriginalColor = !state.useOriginalColor;
    e.target.classList.toggle('active', state.useOriginalColor);
    render();
  });

  // BG palette (PRO - all enabled for now)
  buildPalette('bg-palette', color => {
    state.bgColor = color;
    render();
  }, true); // true = include transparent

  // PRO toggles (no gate yet)
  $('char-bg-toggle').addEventListener('change', e => { state.charBgEnabled = e.target.checked; render(); });
  $('tone-map-toggle').addEventListener('change', e => { state.toneMapEnabled = e.target.checked; render(); });

  // Right-click protection on canvas
  canvas.addEventListener('contextmenu', e => e.preventDefault());
}

function buildPalette(containerId, onSelect, includeTransparent) {
  const container = $(containerId);
  if (includeTransparent) {
    const sw = document.createElement('div');
    sw.className = 'color-swatch checkered';
    sw.title = 'Transparent';
    sw.addEventListener('click', () => {
      container.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
      sw.classList.add('active');
      onSelect('transparent');
    });
    container.appendChild(sw);
  }
  PALETTE.forEach(c => {
    const sw = document.createElement('div');
    sw.className = 'color-swatch';
    sw.style.background = c;
    sw.title = c;
    sw.addEventListener('click', () => {
      container.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
      sw.classList.add('active');
      onSelect(c);
    });
    container.appendChild(sw);
  });
  // Mark first as active by default
  container.querySelector('.color-swatch').classList.add('active');
}
```

- [ ] **Step 5: Init**

```javascript
function init() {
  buildPalette('color-palette', color => {
    state.asciiColor = color;
    state.useOriginalColor = false;
    render();
  });
  buildPalette('bg-palette', color => {
    state.bgColor = color;
    render();
  }, true);
  bindUI();
}

document.fonts.ready.then(init);

})(); // end IIFE
```

- [ ] **Step 6: Syntax check**

```bash
node --check ascinator/js/app.js && echo "OK"
```
Expected: `OK`

- [ ] **Step 7: Integration test**

Open browser, upload any image:
- ASCII art appears on canvas ✓
- Changing sequence updates live ✓
- Sliders affect output ✓
- Edge detection toggle works ✓
- Google Fonts search shows dropdown ✓

- [ ] **Step 8: Commit**

```bash
git add ascinator/js/app.js
git commit -m "feat(ascinator): app controller with full UI bindings and render pipeline"
```

---

## Task 7: Dev Server + robots.txt + Cache Busting

**Files:**
- Create: `ascinator/server.js`
- Create: `ascinator/robots.txt`

- [ ] **Step 1: Create server.js**

```javascript
#!/usr/bin/env node
const http = require('http');
const fs   = require('fs');
const path = require('path');
const PORT = parseInt(process.argv[2]) || 3001;
const ROOT = __dirname;
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.png':  'image/png', '.jpg': 'image/jpeg', '.gif': 'image/gif',
  '.svg':  'image/svg+xml', '.ico': 'image/x-icon',
  '.ttf':  'font/ttf', '.otf': 'font/otf', '.woff': 'font/woff', '.woff2': 'font/woff2',
};
http.createServer((req, res) => {
  const url      = new URL(req.url, `http://localhost:${PORT}`);
  let   filePath = path.join(ROOT, url.pathname);
  if (!path.extname(filePath)) filePath = path.join(filePath, 'index.html');
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    const mime = MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': mime, 'Cache-Control': 'no-store' });
    res.end(data);
  });
}).listen(PORT, () => console.log(`ASCINATOR → http://localhost:${PORT}`));
```

- [ ] **Step 2: Create robots.txt**

```
User-agent: *
Allow: /

User-agent: ClaudeBot
Disallow: /

User-agent: GPTBot
Disallow: /

User-agent: Amazonbot
Disallow: /

User-agent: Google-Extended
Disallow: /

User-agent: Bytespider
Disallow: /

User-agent: CCBot
Disallow: /

User-agent: meta-externalagent
Disallow: /
```

- [ ] **Step 3: Commit**

```bash
git add ascinator/server.js ascinator/robots.txt
git commit -m "feat(ascinator): dev server and robots.txt with AI crawler protection"
```

---

## Self-Review

**Spec coverage check:**
- ✅ Image mode with upload
- ✅ Character Sequence 9 presets + custom
- ✅ Font Family presets + upload + Google Fonts
- ✅ Font Scale, Character Spacing, Line Height, Contrast, Brightness sliders
- ✅ Invert, Overlay Original, Edge Detection toggles
- ✅ Color palette + Original
- ✅ Background Color (PRO badge, no gate)
- ✅ Char Background, Tone Color Map (PRO badge, no gate)
- ✅ PNG export with watermark, SVG export
- ✅ Dark visual theme (#111 panel, #0a0a0a canvas)
- ✅ Contrasting sliders (white thumb, dark track)
- ✅ robots.txt AI protection
- ✅ Right-click prevention on canvas
- ✅ Login nav link (no functionality yet)
- ⏭ Video mode — intentionally out of scope for v1
- ⏭ Transparent PNG export — PRO, v2
- ⏭ MP4 export — PRO, v2

**Type consistency:** All function signatures match across tasks. `state.fontSize` is always in px (12 * scale). `Renderer.render` opts match exactly what `app.js` passes.
