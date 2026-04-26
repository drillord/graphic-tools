(function () {
  'use strict';

  /* ── State ── */
  const state = {
    srcImage:     null,
    srcImageData: null,
    srcW: 0,
    srcH: 0,

    seqKey:       'standard',
    customSeq:    'ASASQWREQ',

    fontFamily:   "'Courier New', monospace",
    fontSize:     12,

    charSpacing:  1.0,
    lineHeight:   1.2,
    contrast:     1.0,
    brightness:   0.1,
    invert:       false,

    overlayEnabled: true,
    overlayOpacity: 0.5,
    overlayBlur:    0,

    edgeEnabled:    true,
    edgeIntensity:  0.5,

    asciiColor:        '#ffffff',
    useOriginalColor:  false,
    bgColor:           '#000000',
    charBgEnabled:     false,
    toneMapEnabled:    false,
  };

  const PALETTE = [
    '#ffffff','#111111','#00d4ff','#00ff88','#44dd44','#88cc00',
    '#cccc00','#cc8800','#ff7700','#cc2200','#cc0044','#8800cc',
    '#4444dd','#0066cc','#558888','#996633',
  ];

  const $ = id => document.getElementById(id);
  const canvas      = $('main-canvas');
  const ctx         = canvas.getContext('2d');
  const placeholder = $('canvas-placeholder');

  /* ── Render pipeline ── */
  function render() {
    if (!state.srcImageData) return;

    const maxW   = window.innerWidth - 300 - 24;
    const maxH   = window.innerHeight - 24;
    const aspect = state.srcW / state.srcH;
    let cw = maxW;
    let ch = Math.round(maxW / aspect);
    if (ch > maxH) { ch = maxH; cw = Math.round(maxH * aspect); }
    cw = Math.max(1, cw);
    ch = Math.max(1, ch);

    canvas.width  = cw;
    canvas.height = ch;

    let imgData = state.srcImageData;
    if (state.edgeEnabled && state.edgeIntensity > 0) {
      imgData = Processor.edgeDetect(imgData, state.srcW, state.srcH, state.edgeIntensity);
    }

    Renderer.render(imgData, state.srcW, state.srcH, ctx, cw, ch, {
      chars:            Renderer.getChars(state.seqKey, state.customSeq),
      fontSize:         state.fontSize,
      fontFamily:       state.fontFamily,
      charSpacing:      state.charSpacing,
      lineHeight:       state.lineHeight,
      contrast:         state.contrast,
      brightness:       state.brightness,
      invert:           state.invert,
      color:            state.asciiColor,
      useOriginalColor: state.useOriginalColor,
      bgColor:          state.bgColor,
    });

    if (state.overlayEnabled && state.srcImage) {
      Processor.drawOverlay(state.srcImage, ctx, cw, ch, state.overlayOpacity, state.overlayBlur);
    }
  }

  /* ── Image loading ── */
  function loadImage(file) {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const maxSrc = 1200;
      const scale  = Math.min(1, maxSrc / img.naturalWidth);
      const sw     = Math.round(img.naturalWidth  * scale);
      const sh     = Math.round(img.naturalHeight * scale);

      const off     = document.createElement('canvas');
      off.width     = sw;
      off.height    = sh;
      const octx    = off.getContext('2d');
      octx.drawImage(img, 0, 0, sw, sh);

      state.srcImage     = img;
      state.srcImageData = octx.getImageData(0, 0, sw, sh);
      state.srcW         = sw;
      state.srcH         = sh;

      placeholder.hidden = true;
      canvas.hidden      = false;
      render();
      URL.revokeObjectURL(url);
    };
    img.onerror = () => URL.revokeObjectURL(url);
    img.src = url;
  }

  /* ── Color palette builder ── */
  function buildPalette(containerId, onSelect, includeTransparent) {
    const container = $(containerId);
    container.innerHTML = '';

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
      sw.className  = 'color-swatch';
      sw.style.background = c;
      sw.title = c;
      sw.addEventListener('click', () => {
        container.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
        sw.classList.add('active');
        onSelect(c);
      });
      container.appendChild(sw);
    });

    const first = container.querySelector('.color-swatch');
    if (first) first.classList.add('active');
  }

  /* ── UI bindings ── */
  function bindUI() {
    /* Upload */
    $('btn-upload').addEventListener('click', () => $('file-input').click());
    $('file-input').addEventListener('change', e => {
      if (e.target.files[0]) loadImage(e.target.files[0]);
    });

    /* Drag & drop */
    const area = document.querySelector('.canvas-area');
    area.addEventListener('dragover', e => { e.preventDefault(); area.style.opacity = '0.7'; });
    area.addEventListener('dragleave', () => { area.style.opacity = ''; });
    area.addEventListener('drop', e => {
      e.preventDefault();
      area.style.opacity = '';
      const f = e.dataTransfer.files[0];
      if (f && f.type.startsWith('image/')) loadImage(f);
    });

    /* Export */
    $('btn-export').addEventListener('click', () => {
      if (!state.srcImageData) return;
      Exporter.exportPNG(canvas, `ascinator-${Date.now()}.png`, true);
    });

    /* Mode tabs */
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });

    /* Character sequence */
    document.querySelectorAll('[data-seq]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('[data-seq]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.seqKey = btn.dataset.seq;
        const ci = $('custom-seq');
        if (ci) ci.classList.toggle('visible', state.seqKey === 'custom');
        render();
      });
    });
    const customSeqEl = $('custom-seq');
    if (customSeqEl) {
      customSeqEl.addEventListener('input', e => {
        state.customSeq = e.target.value;
        if (state.seqKey === 'custom') render();
      });
    }

    /* Font presets */
    document.querySelectorAll('[data-font]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('[data-font]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.fontFamily = btn.dataset.font;
        FontSystem.setSystemFont(state.fontFamily);
        render();
      });
    });

    /* Font file upload */
    $('btn-font-upload').addEventListener('click', () => $('font-file').click());
    $('font-file').addEventListener('change', e => {
      const f = e.target.files[0];
      if (!f) return;
      FontSystem.loadFromFile(f).then(({ displayName }) => {
        state.fontFamily = FontSystem.getCurrentFont();
        const lbl = $('font-name-label');
        if (lbl) lbl.textContent = displayName;
        document.querySelectorAll('[data-font]').forEach(b => b.classList.remove('active'));
        render();
      }).catch(() => {
        const lbl = $('font-name-label');
        if (lbl) lbl.textContent = 'Load error';
      });
    });

    /* Google Fonts */
    const gInput   = $('gfonts-input');
    const gResults = $('gfonts-results');
    if (gInput && gResults) {
      gInput.addEventListener('input', e => {
        const q = e.target.value.trim();
        if (q.length < 2) { gResults.hidden = true; return; }
        const results = FontSystem.searchFonts(q);
        if (!results.length) { gResults.hidden = true; return; }
        gResults.innerHTML = results
          .map(f => `<div class="gfonts-item" data-gfont="${f}">${f}</div>`)
          .join('');
        gResults.hidden = false;
      });
      gResults.addEventListener('click', e => {
        const item = e.target.closest('.gfonts-item');
        if (!item) return;
        const name = item.dataset.gfont;
        gResults.hidden = true;
        gInput.value = name;
        FontSystem.loadGoogleFont(name).then(() => {
          state.fontFamily = FontSystem.getCurrentFont();
          const lbl = $('font-name-label');
          if (lbl) lbl.textContent = name;
          document.querySelectorAll('[data-font]').forEach(b => b.classList.remove('active'));
          render();
        });
      });
      document.addEventListener('click', e => {
        if (!gResults.contains(e.target) && e.target !== gInput) gResults.hidden = true;
      });
    }

    /* Sliders */
    function bindSlider(id, valId, getVal, setVal) {
      const el = $(id);
      if (!el) return;
      el.addEventListener('input', e => {
        const v = parseFloat(e.target.value);
        setVal(v);
        const badge = $(valId);
        if (badge) badge.textContent = getVal();
        render();
      });
    }

    bindSlider('font-scale', 'font-scale-val',
      () => (state.fontSize / 12).toFixed(2) + 'x',
      v => { state.fontSize = Math.round(12 * v); }
    );
    bindSlider('char-spacing',  'char-spacing-val',  () => state.charSpacing.toFixed(1),  v => { state.charSpacing = v; });
    bindSlider('line-height',   'line-height-val',   () => state.lineHeight.toFixed(1),   v => { state.lineHeight = v; });
    bindSlider('contrast',      'contrast-val',      () => state.contrast.toFixed(1),     v => { state.contrast = v; });
    bindSlider('brightness',    'brightness-val',    () => state.brightness.toFixed(1),   v => { state.brightness = v; });

    /* Toggles */
    const invertEl = $('invert-toggle');
    if (invertEl) invertEl.addEventListener('change', e => { state.invert = e.target.checked; render(); });

    const overlayEl = $('overlay-toggle');
    if (overlayEl) {
      overlayEl.addEventListener('change', e => {
        state.overlayEnabled = e.target.checked;
        const oc = $('overlay-controls');
        if (oc) oc.style.display = e.target.checked ? 'block' : 'none';
        render();
      });
    }
    bindSlider('overlay-opacity', 'overlay-opacity-val', () => state.overlayOpacity.toFixed(1), v => { state.overlayOpacity = v; });
    bindSlider('overlay-blur',    'overlay-blur-val',    () => state.overlayBlur.toFixed(1),    v => { state.overlayBlur = v; });

    const edgeEl = $('edge-toggle');
    if (edgeEl) {
      edgeEl.addEventListener('change', e => {
        state.edgeEnabled = e.target.checked;
        const ec = $('edge-controls');
        if (ec) ec.style.display = e.target.checked ? 'block' : 'none';
        render();
      });
    }
    bindSlider('edge-intensity', 'edge-intensity-val', () => state.edgeIntensity.toFixed(2), v => { state.edgeIntensity = v; });

    /* Color palette */
    buildPalette('color-palette', c => {
      state.asciiColor = c;
      state.useOriginalColor = false;
      const ob = $('btn-original-color');
      if (ob) ob.classList.remove('active');
      render();
    });

    const origBtn = $('btn-original-color');
    if (origBtn) {
      origBtn.addEventListener('click', () => {
        state.useOriginalColor = !state.useOriginalColor;
        origBtn.classList.toggle('active', state.useOriginalColor);
        render();
      });
    }

    /* Background palette */
    buildPalette('bg-palette', c => {
      state.bgColor = c === 'transparent' ? 'rgba(0,0,0,0)' : c;
      render();
    }, true);

    /* PRO toggles (no gate) */
    const charBgEl = $('char-bg-toggle');
    if (charBgEl) charBgEl.addEventListener('change', e => { state.charBgEnabled = e.target.checked; render(); });
    const toneEl = $('tone-map-toggle');
    if (toneEl) toneEl.addEventListener('change', e => { state.toneMapEnabled = e.target.checked; render(); });

    /* Right-click protection */
    canvas.addEventListener('contextmenu', e => e.preventDefault());

    /* Resize */
    window.addEventListener('resize', () => { if (state.srcImageData) render(); });
  }

  /* ── Init ── */
  function init() {
    bindUI();
  }

  document.fonts.ready.then(init);

})();
