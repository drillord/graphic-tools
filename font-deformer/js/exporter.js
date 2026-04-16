/* ═══════════════════════════════════════════════════════════
   exporter.js — PNG, SVG, animated GIF export
   Depends on: gif.js loaded from CDN (or embedded worker)
   ═══════════════════════════════════════════════════════════ */

window.Exporter = (() => {

  /* ── PNG ── */
  function exportPNG(canvas, filename = 'typo-deformer.png') {
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = filename;
    a.click();
  }

  /* ── SVG ──
     Renders the canvas content as a PNG embedded in an SVG wrapper.
     This gives a lossless SVG container. For vector SVG the text
     must be drawn without pixel effects (caller can pass a "clean" canvas).  */
  function exportSVG(canvas, state, filename = 'typo-deformer.svg') {
    const w = canvas.width;
    const h = canvas.height;
    const dataURL = canvas.toDataURL('image/png');

    const svg = [
      `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${w}" height="${h}">`,
      `  <rect width="${w}" height="${h}" fill="${state.canvasBg}"/>`,
      `  <image href="${dataURL}" x="0" y="0" width="${w}" height="${h}"/>`,
      `</svg>`
    ].join('\n');

    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url  = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  /* ── GIF ──
     Renders N frames from the animation loop and encodes them as GIF.
     Uses gif.js (loaded from CDN). Falls back to frame-PNG zip if unavailable.
  */
  async function exportGIF(renderFrame, frameCount, delay, onProgress) {
    // Try to get gif.js from CDN + create worker from blob
    let GIF;
    try {
      GIF = await loadGifJS();
    } catch (e) {
      console.warn('gif.js unavailable:', e.message);
      return fallbackFrameDownload(renderFrame, frameCount);
    }

    return new Promise((resolve, reject) => {
      const canvas = renderFrame(0);
      const gif = new GIF({
        workers: 2,
        quality: 8,
        width: canvas.width,
        height: canvas.height,
        workerScript: window._gifWorkerURL,
      });

      for (let i = 0; i < frameCount; i++) {
        const t = (i / frameCount) * (Math.PI * 2);   // one full cycle
        const frameCanvas = renderFrame(t);
        gif.addFrame(frameCanvas, { delay, copy: true });
      }

      gif.on('progress', p => onProgress && onProgress(p));
      gif.on('finished', blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'typo-deformer.gif';
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 5000);
        resolve();
      });
      gif.on('abort',   reject);
      gif.render();
    });
  }

  /* ── Load gif.js from CDN, create worker blob URL ── */
  let gifJSLoaded = false;
  async function loadGifJS() {
    if (gifJSLoaded && window.GIF) return window.GIF;

    // Fetch main script
    const mainRes = await fetch('https://cdn.jsdelivr.net/npm/gif.js@0.2.0/dist/gif.js');
    if (!mainRes.ok) throw new Error('Could not load gif.js from CDN');
    const mainSrc = await mainRes.text();

    // Fetch worker script
    const workerRes = await fetch('https://cdn.jsdelivr.net/npm/gif.js@0.2.0/dist/gif.worker.js');
    if (!workerRes.ok) throw new Error('Could not load gif.worker.js from CDN');
    const workerSrc = await workerRes.text();

    // Create worker blob URL (so gif.js can load it without a local file)
    const workerBlob = new Blob([workerSrc], { type: 'application/javascript' });
    window._gifWorkerURL = URL.createObjectURL(workerBlob);

    // Eval main script so GIF constructor becomes available
    // eslint-disable-next-line no-new-func
    new Function(mainSrc)();
    gifJSLoaded = true;

    if (!window.GIF) throw new Error('gif.js did not export window.GIF');
    return window.GIF;
  }

  /* ── Fallback: download first frame as PNG ── */
  function fallbackFrameDownload(renderFrame) {
    alert('GIF export requires an internet connection to load gif.js.\nDownloading the current frame as PNG instead.');
    const canvas = renderFrame(0);
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = 'typo-deformer-frame.png';
    a.click();
  }

  return { exportPNG, exportSVG, exportGIF };
})();
