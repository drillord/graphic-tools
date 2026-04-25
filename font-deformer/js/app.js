/* ═══════════════════════════════════════════════════════════
   app.js — main application controller
   ═══════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  /* ── State ── */
  const state = {
    text:          'GLITCH',
    fontSize:      128,
    fontWeight:    700,
    letterSpacing: 0,
    fontFamily:    'system-ui, Arial, sans-serif',
    customFont:    null,

    scheme: 'neon',
    schemes: {
      neon:   { bg: '#06060f', fg: '#00ff88',  glow: '#00ff88' },
      retro:  { bg: '#160800', fg: '#ff9500',  glow: '#ff9500' },
      dark:   { bg: '#000000', fg: '#ffffff',  glow: '#ffffff' },
      light:  { bg: '#f8f8f8', fg: '#111111',  glow: '#111111' },
      vapor:  { bg: '#0d0221', fg: '#ff71ce',  glow: '#ff71ce' },
      matrix: { bg: '#001100', fg: '#00ff41',  glow: '#00ff41' },
    },

    effects: {
      glitch:    { enabled: false, intensity: 0.5 },
      wave:      { enabled: false, intensity: 0.5 },
      distortion:{ enabled: false, intensity: 0.5 },
      noise:     { enabled: false, intensity: 0.5 },
      chromatic: { enabled: false, intensity: 0.5 },
      vhs:       { enabled: false, intensity: 0.5 },
    },

    effectMeta: {
      glitch:    { label: 'Glitch',              fn: 'glitch' },
      wave:      { label: 'Wave',                fn: 'wave' },
      distortion:{ label: 'Distortion',          fn: 'distortion' },
      noise:     { label: 'Film Grain',          fn: 'noise' },
      chromatic: { label: 'Chromatic Aberration',fn: 'chromaticAberration' },
      vhs:       { label: 'VHS',                 fn: 'vhs' },
    },

    anim: {
      enabled: false,
      speed:   1.0,
      time:    0,
    },

    canvas: { w: 800, h: 400 },
    gifFrames: 16,
  };

  /* ── DOM refs ── */
  const $ = id => document.getElementById(id);
  const mainCanvas  = $('main-canvas');
  const ctx         = mainCanvas.getContext('2d', { willReadFrequently: true });

  /* ── Offscreen source canvas (uneffected text) ── */
  const srcCanvas   = document.createElement('canvas');
  const srcCtx      = srcCanvas.getContext('2d', { willReadFrequently: true });

  /* ── RAF state ── */
  let rafId = null;
  let lastTs = null;
  let frameCount = 0;
  let fpsTs = 0;
  let fps = 0;

  /* ═══════════════════════════════════════════════════════ */
  /*  EFFECTS DEFINITION                                     */
  /* ═══════════════════════════════════════════════════════ */

  function buildEffectsList() {
    const list = $('effects-list');
    list.innerHTML = '';

    for (const [key, meta] of Object.entries(state.effectMeta)) {
      const eff = state.effects[key];

      const row = document.createElement('div');
      row.className = 'effect-row';
      row.id = `eff-row-${key}`;

      row.innerHTML = `
        <div class="effect-header">
          <label class="checkbox-wrap">
            <input type="checkbox" data-effect="${key}" ${eff.enabled ? 'checked' : ''}>
            <div class="checkbox-visual"></div>
          </label>
          <span class="effect-name" data-toggle="${key}">${meta.label}</span>
        </div>
        <div class="effect-controls">
          <div class="row-control">
            <label>Intensity</label>
            <input type="range" min="0" max="1" step="0.01"
                   value="${eff.intensity}" data-effect-intensity="${key}">
            <span class="val-badge" id="eff-val-${key}">${Math.round(eff.intensity * 100)}%</span>
          </div>
        </div>`;

      list.appendChild(row);

      // checkbox
      row.querySelector(`input[data-effect="${key}"]`).addEventListener('change', e => {
        state.effects[key].enabled = e.target.checked;
        row.classList.toggle('active', e.target.checked);
        renderOnce();
      });

      // name click → toggle controls open (not enable)
      row.querySelector(`[data-toggle="${key}"]`).addEventListener('click', () => {
        row.classList.toggle('open');
        const ctl = row.querySelector('.effect-controls');
        if (ctl) ctl.style.display = row.classList.contains('open') ? 'block' : 'none';
      });

      // intensity slider
      row.querySelector(`[data-effect-intensity="${key}"]`).addEventListener('input', e => {
        const v = parseFloat(e.target.value);
        state.effects[key].intensity = v;
        $(`eff-val-${key}`).textContent = Math.round(v * 100) + '%';
        renderOnce();
      });
    }
  }

  /* ═══════════════════════════════════════════════════════ */
  /*  RENDERING                                              */
  /* ═══════════════════════════════════════════════════════ */

  function resizeCanvases() {
    const { w, h } = state.canvas;
    mainCanvas.width  = w;
    mainCanvas.height = h;
    srcCanvas.width   = w;
    srcCanvas.height  = h;
    $('canvas-size-label').textContent = `${w} × ${h} px`;
  }

  function drawSourceText() {
    const { w, h } = state.canvas;
    const scheme = state.schemes[state.scheme];
    const lines  = state.text.split('\n');

    // background
    srcCtx.fillStyle = scheme.bg;
    srcCtx.fillRect(0, 0, w, h);

    // text settings
    const font = `${state.fontWeight} ${state.fontSize}px ${state.fontFamily}`;
    srcCtx.font        = font;
    srcCtx.fillStyle   = scheme.fg;
    srcCtx.textAlign   = 'center';
    srcCtx.textBaseline= 'middle';
    srcCtx.letterSpacing = state.letterSpacing + 'px';

    // glow shadow
    srcCtx.shadowColor = scheme.glow;
    srcCtx.shadowBlur  = state.scheme === 'light' ? 0 : 18;

    // measure and place multi-line
    const lineH = state.fontSize * 1.2;
    const totalH = lines.length * lineH;
    const startY = (h - totalH) / 2 + lineH / 2;

    lines.forEach((line, i) => {
      srcCtx.fillText(line, w / 2, startY + i * lineH);
    });

    srcCtx.shadowBlur = 0;
  }

  function applyEffects(time) {
    const { w, h } = state.canvas;
    let imgData = srcCtx.getImageData(0, 0, w, h);

    for (const [key, meta] of Object.entries(state.effectMeta)) {
      const eff = state.effects[key];
      if (!eff.enabled) continue;
      const fn = Effects[meta.fn];
      if (fn) {
        imgData = fn(imgData, w, h, eff.intensity, time);
      }
    }

    ctx.putImageData(imgData, 0, 0);
  }

  function renderOnce() {
    drawSourceText();
    applyEffects(state.anim.time);
  }

  /* ── Animation loop ── */
  function animLoop(ts) {
    if (!state.anim.enabled) return;

    if (lastTs === null) lastTs = ts;
    const dt = (ts - lastTs) / 1000;
    lastTs = ts;

    state.anim.time += dt * state.anim.speed;

    drawSourceText();
    applyEffects(state.anim.time);

    // FPS counter
    frameCount++;
    if (ts - fpsTs > 500) {
      fps = Math.round(frameCount / ((ts - fpsTs) / 1000));
      frameCount = 0;
      fpsTs = ts;
      $('fps-label').textContent = fps + ' fps';
    }

    rafId = requestAnimationFrame(animLoop);
  }

  function startAnim() {
    if (rafId) cancelAnimationFrame(rafId);
    lastTs = null;
    fpsTs  = performance.now();
    frameCount = 0;
    rafId = requestAnimationFrame(animLoop);
  }

  function stopAnim() {
    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
    $('fps-label').textContent = '— fps';
    renderOnce();
  }

  /* ═══════════════════════════════════════════════════════ */
  /*  EXPORT HELPERS                                         */
  /* ═══════════════════════════════════════════════════════ */

  // Returns a canvas with a given anim time rendered (for GIF frames)
  function makeFrameCanvas(time) {
    drawSourceText();      // always draws into srcCanvas
    const fc = document.createElement('canvas');
    fc.width  = state.canvas.w;
    fc.height = state.canvas.h;
    const fctx = fc.getContext('2d');
    const { w, h } = state.canvas;

    let imgData = srcCtx.getImageData(0, 0, w, h);
    for (const [key, meta] of Object.entries(state.effectMeta)) {
      const eff = state.effects[key];
      if (!eff.enabled) continue;
      const fn = Effects[meta.fn];
      if (fn) imgData = fn(imgData, w, h, eff.intensity, time);
    }
    fctx.putImageData(imgData, 0, 0);
    return fc;
  }

  /* ═══════════════════════════════════════════════════════ */
  /*  UI BINDINGS                                            */
  /* ═══════════════════════════════════════════════════════ */

  function bindUI() {
    /* Text */
    $('text-input').addEventListener('input', e => {
      state.text = e.target.value || ' ';
      renderOnce();
    });

    /* Font size */
    const fsSlider = $('font-size');
    fsSlider.addEventListener('input', e => {
      state.fontSize = parseInt(e.target.value);
      $('font-size-val').textContent = state.fontSize;
      renderOnce();
    });

    /* Font weight */
    $('font-weight').addEventListener('input', e => {
      state.fontWeight = parseInt(e.target.value);
      $('font-weight-val').textContent = state.fontWeight;
      renderOnce();
    });

    /* Letter spacing */
    $('letter-spacing').addEventListener('input', e => {
      state.letterSpacing = parseInt(e.target.value);
      $('letter-spacing-val').textContent = state.letterSpacing;
      renderOnce();
    });

    /* Font upload */
    $('btn-upload-font').addEventListener('click', () => $('font-file').click());
    $('font-file').addEventListener('change', handleFontUpload);

    // Drag & drop on font button area
    const dropZone = $('font-drop-zone');
    dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.style.opacity = '0.7'; });
    dropZone.addEventListener('dragleave', ()  => { dropZone.style.opacity = ''; });
    dropZone.addEventListener('drop', e => {
      e.preventDefault();
      dropZone.style.opacity = '';
      const file = e.dataTransfer.files[0];
      if (file) loadFontFile(file);
    });

    /* Scheme buttons */
    document.querySelectorAll('.scheme-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.scheme-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.scheme = btn.dataset.scheme;
        document.body.className = `scheme-${state.scheme}`;
        renderOnce();
      });
    });

    /* Animation */
    $('anim-toggle').addEventListener('change', e => {
      state.anim.enabled = e.target.checked;
      state.anim.enabled ? startAnim() : stopAnim();
    });

    $('anim-speed').addEventListener('input', e => {
      state.anim.speed = parseFloat(e.target.value);
      $('anim-speed-val').textContent = state.anim.speed.toFixed(1) + '×';
    });

    /* Canvas size presets */
    document.querySelectorAll('.size-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.size-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.canvas.w = parseInt(btn.dataset.w);
        state.canvas.h = parseInt(btn.dataset.h);
        resizeCanvases();
        renderOnce();
      });
    });

    /* GIF frames */
    $('gif-frames').addEventListener('input', e => {
      state.gifFrames = parseInt(e.target.value);
      $('gif-frames-val').textContent = state.gifFrames;
      $('gif-frames-badge').textContent = state.gifFrames + 'f';
    });

    /* Export PNG */
    $('export-png').addEventListener('click', () => {
      Exporter.exportPNG(mainCanvas, `typo-${Date.now()}.png`);
    });

    /* Export SVG */
    $('export-svg').addEventListener('click', () => {
      Exporter.exportSVG(mainCanvas, { canvasBg: state.schemes[state.scheme].bg });
    });

    /* Export GIF */
    $('export-gif').addEventListener('click', async () => {
      const wasAnimating = state.anim.enabled;
      if (wasAnimating) stopAnim();

      const prog = $('export-progress');
      const fill = $('progress-fill');
      const label = $('progress-label');
      prog.hidden = false;
      fill.style.width = '0%';
      label.textContent = 'Rendering frames…';

      const nFrames = state.gifFrames;
      const duration = 2000; // ms for full loop
      const delay = Math.round(duration / nFrames);

      try {
        await Exporter.exportGIF(
          t => makeFrameCanvas(t),
          nFrames,
          delay,
          p => {
            fill.style.width = (p * 100).toFixed(0) + '%';
            label.textContent = `Encoding… ${(p * 100).toFixed(0)}%`;
          }
        );
        label.textContent = 'Done!';
        setTimeout(() => { prog.hidden = true; }, 2000);
      } catch (err) {
        label.textContent = 'Error: ' + err.message;
        setTimeout(() => { prog.hidden = true; }, 4000);
      }

      if (wasAnimating) startAnim();
    });
  }

  /* ── Font loading ── */
  function handleFontUpload(e) {
    const file = e.target.files[0];
    if (file) loadFontFile(file);
  }

  function loadFontFile(file) {
    const reader = new FileReader();
    reader.onload = ev => {
      const fontName = 'CustomFont_' + Date.now();
      const fontFace = new FontFace(fontName, ev.target.result);
      fontFace.load().then(loaded => {
        document.fonts.add(loaded);
        state.fontFamily = `'${fontName}', sans-serif`;
        state.customFont = fontName;
        $('font-name-label').textContent = file.name.replace(/\.[^.]+$/, '');
        renderOnce();
      }).catch(err => {
        console.error('Font load error:', err);
        $('font-name-label').textContent = 'Load error';
      });
    };
    reader.readAsArrayBuffer(file);
  }

  /* ═══════════════════════════════════════════════════════ */
  /*  INIT                                                   */
  /* ═══════════════════════════════════════════════════════ */

  function init() {
    resizeCanvases();
    buildEffectsList();
    bindUI();
    renderOnce();
  }

  // Wait for fonts to be ready
  document.fonts.ready.then(init);

})();
