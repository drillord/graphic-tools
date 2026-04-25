window.Exporter = (() => {
  'use strict';

  // Export canvas as PNG.
  // If addWatermark=true, draw a subtle "ASCINATOR" text in bottom-right corner.
  function exportPNG(canvas, filename, addWatermark) {
    let src = canvas;

    if (addWatermark) {
      const tmp   = document.createElement('canvas');
      tmp.width   = canvas.width;
      tmp.height  = canvas.height;
      const tctx  = tmp.getContext('2d');
      tctx.drawImage(canvas, 0, 0);

      const size = Math.max(10, Math.round(canvas.width * 0.012));
      tctx.font         = `bold ${size}px 'SF Mono', 'Fira Code', monospace`;
      tctx.fillStyle    = 'rgba(255,255,255,0.2)';
      tctx.textAlign    = 'right';
      tctx.textBaseline = 'bottom';
      tctx.fillText('ASCINATOR', canvas.width - 10, canvas.height - 8);
      src = tmp;
    }

    const a      = document.createElement('a');
    a.href       = src.toDataURL('image/png');
    a.download   = filename || 'ascinator.png';
    a.click();
  }

  // Export canvas as SVG with embedded PNG.
  function exportSVG(canvas, bgColor, filename) {
    const w      = canvas.width;
    const h      = canvas.height;
    const data   = canvas.toDataURL('image/png');
    const svg    = [
      `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${w}" height="${h}">`,
      `  <rect width="${w}" height="${h}" fill="${bgColor || '#000000'}"/>`,
      `  <image href="${data}" x="0" y="0" width="${w}" height="${h}"/>`,
      `</svg>`,
    ].join('\n');

    const blob   = new Blob([svg], { type: 'image/svg+xml' });
    const url    = URL.createObjectURL(blob);
    const a      = document.createElement('a');
    a.href       = url;
    a.download   = filename || 'ascinator.svg';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  return { exportPNG, exportSVG };
})();
