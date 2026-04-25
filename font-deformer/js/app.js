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
      chromatic:   { enabled: false, intensity: 0.5 },
      vhs:         { enabled: false, intensity: 0.5 },
      letterSplit: { enabled: false, size: 0.5, spacing: 0.3 },
    },

    effectMeta: {
      glitch:    { label: 'Glitch',              fn: 'glitch' },
      wave:      { label: 'Wave',                fn: 'wave' },
      distortion:{ label: 'Distortion',          fn: 'distortion' },
      noise:     { label: 'Film Grain',          fn: 'noise' },
      chromatic:   { label: 'Chromatic Aberration', fn: 'chromaticAberration' },
      vhs:         { label: 'VHS',                 fn: 'vhs' },
      letterSplit: { label: 'Letter Split', fn: 'letterSplit',
                     controls: [{ key: 'size', label: 'Size' }, { key: 'spacing', label: 'Spacing' }] },
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

  /* ── Offscreen canvas for letterSplit compositing ── */
  const lsCanvas    = document.createElement('canvas');
  const lsCtx       = lsCanvas.getContext('2d');

  /* ── Work canvas for reduced-resolution effect processing ── */
  const workCanvas  = document.createElement('canvas');
  const workCtx     = workCanvas.getContext('2d', { willReadFrequently: true });

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
      const eff      = state.effects[key];
      const controls = meta.controls || [{ key: 'intensity', label: 'Intensity' }];

      const ctrlsHTML = controls.map(ctrl => {
        const val = eff[ctrl.key] ?? 0.5;
        return `<div class="row-control">
          <label>${ctrl.label}</label>
          <input type="range" min="0" max="1" step="0.01"
                 value="${val}" data-eff="${key}" data-ctrl="${ctrl.key}">
          <span class="val-badge" id="eff-val-${key}-${ctrl.key}">${Math.round(val * 100)}%</span>
        </div>`;
      }).join('');

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
        <div class="effect-controls">${ctrlsHTML}</div>`;

      list.appendChild(row);

      row.querySelector(`input[data-effect="${key}"]`).addEventListener('change', e => {
        state.effects[key].enabled = e.target.checked;
        row.classList.toggle('active', e.target.checked);
        renderOnce();
      });

      row.querySelector(`[data-toggle="${key}"]`).addEventListener('click', () => {
        row.classList.toggle('open');
        const ctl = row.querySelector('.effect-controls');
        if (ctl) ctl.style.display = row.classList.contains('open') ? 'block' : 'none';
      });

      row.querySelectorAll('[data-eff][data-ctrl]').forEach(slider => {
        slider.addEventListener('input', e => {
          const k = e.target.dataset.eff;
          const c = e.target.dataset.ctrl;
          const v = parseFloat(e.target.value);
          state.effects[k][c] = v;
          const badge = $(`eff-val-${k}-${c}`);
          if (badge) badge.textContent = Math.round(v * 100) + '%';
          renderOnce();
        });
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

  function drawLetterSplitText(time) {
    const { w, h } = state.canvas;
    const scheme   = state.schemes[state.scheme];
    const eff      = state.effects.letterSplit;
    const lines    = state.text.split('\n');
    const ls       = state.letterSpacing;
    const animating = state.anim.enabled;

    lsCanvas.width  = w;
    lsCanvas.height = h;

    srcCtx.fillStyle = scheme.bg;
    srcCtx.fillRect(0, 0, w, h);

    const bigFont  = `${state.fontWeight} ${state.fontSize}px ${state.fontFamily}`;
    const cellSize = Math.max(3, Math.round(state.fontSize * (0.18 - eff.size * 0.14)));
    const lineGap  = cellSize * (1.1 + eff.spacing * 2.0);
    const colGap   = cellSize * (0.7  + eff.spacing * 1.5);
    const pad      = state.fontSize * 0.7;

    const lineH    = state.fontSize * 1.2;
    const totalH   = lines.length * lineH;
    const startY   = (h - totalH) / 2 + lineH / 2;
    const matrixSpeed = 3.0 * state.anim.speed;

    srcCtx.font          = bigFont;
    srcCtx.letterSpacing = '0px';

    lines.forEach((line, li) => {
      const lineY = startY + li * lineH;
      const chars = [...line];
      const totalW = chars.reduce((s, c) => s + srcCtx.measureText(c).width, 0)
                   + ls * Math.max(0, chars.length - 1);
      let curX = (w - totalW) / 2;

      chars.forEach(char => {
        const charW = srcCtx.measureText(char).width;
        const adv   = charW + ls;

        lsCtx.clearRect(0, 0, w, h);
        lsCtx.font          = `${state.fontWeight} ${cellSize}px ${state.fontFamily}`;
        lsCtx.textBaseline  = 'top';
        lsCtx.textAlign     = 'left';
        lsCtx.letterSpacing = '0px';
        lsCtx.shadowBlur    = 0;

        const nRows = Math.ceil((2 * pad) / lineGap) + 2;
        const nCols = Math.ceil((charW + 2 * pad) / colGap) + 2;

        if (!animating) {
          // Static — full fill
          lsCtx.fillStyle = scheme.fg;
          for (let row = 0; row < nRows; row++) {
            for (let col = 0; col < nCols; col++) {
              lsCtx.fillText(char, curX - pad + col * colGap, lineY - pad + row * lineGap);
            }
          }
        } else {
          // Matrix rain — each column has an independent falling streak
          const trailLen = Math.max(2, Math.round(nRows * 0.45));
          for (let col = 0; col < nCols; col++) {
            const phase   = (col * 3.7 + 1) % nRows;
            const headRow = Math.floor((time * matrixSpeed + phase) % nRows);
            for (let row = 0; row < nRows; row++) {
              const behind = (headRow - row + nRows) % nRows;
              if (behind >= trailLen) continue;
              const alpha = behind === 0 ? 1.0 : 1.0 - behind / trailLen;
              lsCtx.globalAlpha = alpha;
              lsCtx.fillStyle   = behind === 0 ? '#ffffff' : scheme.fg;
              lsCtx.fillText(char, curX - pad + col * colGap, lineY - pad + row * lineGap);
            }
          }
          lsCtx.globalAlpha = 1;
        }

        // Clip tiny chars to big character outline
        lsCtx.globalCompositeOperation = 'destination-in';
        lsCtx.font         = bigFont;
        lsCtx.textBaseline = 'middle';
        lsCtx.textAlign    = 'left';
        lsCtx.fillStyle    = 'white';
        lsCtx.globalAlpha  = 1;
        lsCtx.fillText(char, curX, lineY);
        lsCtx.globalCompositeOperation = 'source-over';

        srcCtx.drawImage(lsCanvas, 0, 0);
        curX += adv;
      });
    });
  }

  function drawSourceText(time = 0) {
    if (state.effects.letterSplit.enabled) { drawLetterSplitText(time); return; }

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

  function animScale() {
    const w = state.canvas.w;
    if (!state.anim.enabled) return 1.0;
    if (w <= 900)  return 1.0;
    if (w <= 1440) return 0.6;
    return 0.4;
  }

  function applyEffects(time) {
    const { w, h } = state.canvas;
    const scale = animScale();
    const rw = Math.round(w * scale);
    const rh = Math.round(h * scale);

    if (workCanvas.width !== rw || workCanvas.height !== rh) {
      workCanvas.width  = rw;
      workCanvas.height = rh;
    }

    // Scale srcCanvas down to work resolution
    workCtx.drawImage(srcCanvas, 0, 0, rw, rh);
    let imgData = workCtx.getImageData(0, 0, rw, rh);

    for (const [key, meta] of Object.entries(state.effectMeta)) {
      const eff = state.effects[key];
      if (!eff.enabled) continue;
      const fn = Effects[meta.fn];
      if (fn) imgData = fn(imgData, rw, rh, eff.intensity, time);
    }

    if (scale < 1.0) {
      workCtx.putImageData(imgData, 0, 0);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'medium';
      ctx.drawImage(workCanvas, 0, 0, w, h);
    } else {
      ctx.putImageData(imgData, 0, 0);
    }
  }

  function renderOnce() {
    drawSourceText(state.anim.time);
    applyEffects(state.anim.time);
  }

  /* ── Animation loop ── */
  function animLoop(ts) {
    if (!state.anim.enabled) return;

    if (lastTs === null) lastTs = ts;
    const dt = (ts - lastTs) / 1000;
    lastTs = ts;

    state.anim.time += dt * state.anim.speed;

    drawSourceText(state.anim.time);
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
    drawSourceText(time);  // always draws into srcCanvas
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
    const fsInput  = $('font-size-val');
    fsSlider.addEventListener('input', e => {
      state.fontSize = parseInt(e.target.value);
      fsInput.value  = state.fontSize;
      renderOnce();
    });
    fsInput.addEventListener('change', e => {
      const v = Math.max(1, parseInt(e.target.value) || 1);
      state.fontSize = v;
      fsSlider.value = Math.min(480, v);
      fsInput.value  = v;
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
