window.Processor = (() => {
  'use strict';

  function edgeDetect(imageData, w, h, intensity) {
    const src = imageData.data;
    const out = new Uint8ClampedArray(src.length);

    const kX = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
    const kY = [-1,-2,-1,  0, 0, 0,  1, 2, 1];

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const di = (y * w + x) * 4;

        // Border pixels: copy original
        if (x === 0 || x === w - 1 || y === 0 || y === h - 1) {
          const origLum = src[di] * 0.299 + src[di+1] * 0.587 + src[di+2] * 0.114;
          out[di] = out[di+1] = out[di+2] = Math.round(origLum);
          out[di+3] = 255;
          continue;
        }

        let gx = 0, gy = 0;
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const si = ((y + ky) * w + (x + kx)) * 4;
            const lum = src[si] * 0.299 + src[si+1] * 0.587 + src[si+2] * 0.114;
            const ki = (ky + 1) * 3 + (kx + 1);
            gx += lum * kX[ki];
            gy += lum * kY[ki];
          }
        }

        const mag = Math.min(255, Math.sqrt(gx * gx + gy * gy));
        const origLum = src[di] * 0.299 + src[di+1] * 0.587 + src[di+2] * 0.114;
        const mixed = origLum * (1 - intensity) + mag * intensity;

        out[di] = out[di+1] = out[di+2] = Math.round(Math.min(255, mixed));
        out[di+3] = 255;
      }
    }

    return new ImageData(out, w, h);
  }

  function drawOverlay(srcImg, ctx, canvasW, canvasH, opacity, blurPx) {
    ctx.save();
    if (blurPx > 0) ctx.filter = `blur(${blurPx}px)`;
    ctx.globalAlpha = opacity;
    ctx.drawImage(srcImg, 0, 0, canvasW, canvasH);
    ctx.filter = 'none';
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  return { edgeDetect, drawOverlay };
})();
