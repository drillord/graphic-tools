/* ═══════════════════════════════════════════════════════════
   effects.js — all canvas pixel effects
   Each effect receives (imageData, width, height, intensity 0-1, time seconds)
   and returns a new ImageData.
   ═══════════════════════════════════════════════════════════ */

window.Effects = (() => {

  /* ── helpers ── */

  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

  // simple hash / noise
  function hash(x, y, seed) {
    let n = Math.sin(x * 127.1 + y * 311.7 + seed * 74.3) * 43758.5453;
    return n - Math.floor(n);
  }

  // bilinear sample from Uint8ClampedArray
  function sample(src, w, h, fx, fy) {
    fx = clamp(fx, 0, w - 1);
    fy = clamp(fy, 0, h - 1);
    const x0 = Math.floor(fx), y0 = Math.floor(fy);
    const x1 = Math.min(x0 + 1, w - 1), y1 = Math.min(y0 + 1, h - 1);
    const tx = fx - x0, ty = fy - y0;
    const i00 = (y0 * w + x0) * 4;
    const i10 = (y0 * w + x1) * 4;
    const i01 = (y1 * w + x0) * 4;
    const i11 = (y1 * w + x1) * 4;
    const out = new Array(4);
    for (let c = 0; c < 4; c++) {
      out[c] = (src[i00 + c] * (1 - tx) + src[i10 + c] * tx) * (1 - ty)
             + (src[i01 + c] * (1 - tx) + src[i11 + c] * tx) * ty;
    }
    return out;
  }

  function copy(src) {
    return new Uint8ClampedArray(src.data);
  }

  /* ─────────────────────────────────────────────────────────
     GLITCH — horizontal slice displacement + channel offset
     ───────────────────────────────────────────────────────── */
  function glitch(imgData, w, h, intensity, time) {
    const src = imgData.data;
    const out = copy(imgData);

    // 1. Horizontal slices
    const t = Math.floor(time * 10); // discretize: max 10 state changes per animation-second
    const numSlices = Math.max(2, Math.floor(intensity * 24));
    for (let i = 0; i < numSlices; i++) {
      const noise1 = hash(i, 0, t + 1);
      const noise2 = hash(i, 1, t + 7);
      const sliceY  = Math.floor(noise1 * h);
      const sliceH  = Math.max(1, Math.floor(Math.abs(Math.sin(t * 0.1 + i)) * 18 * intensity));
      const shiftX  = Math.floor((noise2 - 0.5) * 2 * w * 0.3 * intensity);

      const colorShift = Math.max(1, Math.round(intensity * 8));
      for (let y = sliceY; y < Math.min(sliceY + sliceH, h); y++) {
        for (let x = 0; x < w; x++) {
          const rX = ((x - shiftX - colorShift) % w + w) % w;
          const gX = ((x - shiftX)              % w + w) % w;
          const bX = ((x - shiftX + colorShift) % w + w) % w;
          const di = (y * w + x) * 4;
          out[di]   = src[(y * w + rX) * 4];
          out[di+1] = src[(y * w + gX) * 4 + 1];
          out[di+2] = src[(y * w + bX) * 4 + 2];
          out[di+3] = src[(y * w + gX) * 4 + 3];
        }
      }
    }

    return new ImageData(out, w, h);
  }

  /* ─────────────────────────────────────────────────────────
     WAVE — sine-based row displacement
     ───────────────────────────────────────────────────────── */
  function wave(imgData, w, h, intensity, time) {
    const src = imgData.data;
    const out = new Uint8ClampedArray(src.length);
    const amp  = intensity * w * 0.08;
    const freq = 0.02 + intensity * 0.02;
    const speed = time * 2;

    for (let y = 0; y < h; y++) {
      const offset = Math.sin(y * freq + speed) * amp
                   + Math.sin(y * freq * 2.3 + speed * 0.7) * amp * 0.3;
      for (let x = 0; x < w; x++) {
        const sx = clamp(x + offset, 0, w - 1);
        const s  = sample(src, w, h, sx, y);
        const di = (y * w + x) * 4;
        out[di]   = s[0]; out[di+1] = s[1]; out[di+2] = s[2]; out[di+3] = s[3];
      }
    }
    return new ImageData(out, w, h);
  }

  /* ─────────────────────────────────────────────────────────
     DISTORTION — 2D noise-based displacement
     ───────────────────────────────────────────────────────── */
  function distortion(imgData, w, h, intensity, time) {
    const src = imgData.data;
    const out = new Uint8ClampedArray(src.length);
    const amp = intensity * 30;
    const t = time * 0.5;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const nx = hash(x * 0.04, y * 0.04, t)       * 2 - 1;
        const ny = hash(x * 0.04 + 100, y * 0.04, t) * 2 - 1;
        const s  = sample(src, w, h, x + nx * amp, y + ny * amp);
        const di = (y * w + x) * 4;
        out[di]   = s[0]; out[di+1] = s[1]; out[di+2] = s[2]; out[di+3] = s[3];
      }
    }
    return new ImageData(out, w, h);
  }

  /* ─────────────────────────────────────────────────────────
     NOISE — grain overlay
     ───────────────────────────────────────────────────────── */
  function noise(imgData, w, h, intensity, time) {
    const out = copy(imgData);
    const seed = Math.floor(time * 30);   // grain changes ~30fps

    for (let i = 0; i < out.length; i += 4) {
      const p = i >> 2;
      const n = (hash(p % w, Math.floor(p / w), seed) - 0.5) * 2 * intensity * 120;
      out[i]   = clamp(out[i]   + n, 0, 255);
      out[i+1] = clamp(out[i+1] + n, 0, 255);
      out[i+2] = clamp(out[i+2] + n, 0, 255);
    }
    return new ImageData(out, w, h);
  }

  /* ─────────────────────────────────────────────────────────
     CHROMATIC ABERRATION — R/G/B channel split
     ───────────────────────────────────────────────────────── */
  function chromaticAberration(imgData, w, h, intensity, time) {
    const src = imgData.data;
    const out = copy(imgData);
    const shift = intensity * 18;
    // Add a slight oscillation over time
    const osc = Math.sin(time * 1.5) * shift * 0.4;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const di = (y * w + x) * 4;
        const rX = clamp(x + shift + osc, 0, w - 1);
        const bX = clamp(x - shift - osc, 0, w - 1);
        const rY = clamp(y + osc * 0.3, 0, h - 1);
        const bY = clamp(y - osc * 0.3, 0, h - 1);
        out[di]   = sample(src, w, h, rX, rY)[0];
        // green stays, blue shifts other direction
        out[di+2] = sample(src, w, h, bX, bY)[2];
      }
    }
    return new ImageData(out, w, h);
  }

  /* ─────────────────────────────────────────────────────────
     VHS — scanlines + color bleed + jitter + vignette
     ───────────────────────────────────────────────────────── */
  function vhs(imgData, w, h, intensity, time) {
    const src = imgData.data;
    const out = new Uint8ClampedArray(src.length);

    // 1. Horizontal color bleed
    for (let y = 0; y < h; y++) {
      let rAcc = 0, gAcc = 0, bAcc = 0;
      const bleedLen = Math.floor(intensity * 12) + 1;
      for (let x = 0; x < w; x++) {
        const si = (y * w + x) * 4;
        rAcc = rAcc * (1 - 1/bleedLen) + src[si]   / bleedLen;
        gAcc = gAcc * (1 - 1/bleedLen) + src[si+1] / bleedLen;
        bAcc = bAcc * (1 - 1/bleedLen) + src[si+2] / bleedLen;
        const di = si;
        out[di]   = clamp(src[si]   * (1 - intensity * 0.5) + rAcc * intensity * 0.5, 0, 255);
        out[di+1] = clamp(src[si+1] * (1 - intensity * 0.5) + gAcc * intensity * 0.5, 0, 255);
        out[di+2] = clamp(src[si+2] * (1 - intensity * 0.5) + bAcc * intensity * 0.5, 0, 255);
        out[di+3] = src[si+3];
      }
    }

    // 2. Vertical jitter per line
    const jitter = Math.floor(intensity * 6);
    if (jitter > 0) {
      const jOut = new Uint8ClampedArray(out);
      for (let y = 0; y < h; y++) {
        const shift = Math.floor((hash(y, 0, Math.floor(time * 10)) - 0.5) * 2 * jitter * intensity);
        for (let x = 0; x < w; x++) {
          const srcX = ((x + shift) % w + w) % w;
          const si = (y * w + srcX) * 4;
          const di = (y * w + x)    * 4;
          jOut[di] = out[si]; jOut[di+1] = out[si+1]; jOut[di+2] = out[si+2]; jOut[di+3] = out[si+3];
        }
      }
      out.set(jOut);
    }

    // 3. Scanlines + color tint + noise
    for (let y = 0; y < h; y++) {
      const scanDark = (y % 2 === 0) ? (0.85 - intensity * 0.2) : 1.0;
      const seed = Math.floor(time * 24);
      for (let x = 0; x < w; x++) {
        const di = (y * w + x) * 4;
        const grain = (hash(x, y, seed) - 0.5) * intensity * 40;
        out[di]   = clamp(out[di]   * scanDark + grain, 0, 255);
        out[di+1] = clamp(out[di+1] * scanDark + grain + intensity * 5, 0, 255); // slight green tint
        out[di+2] = clamp(out[di+2] * scanDark * (1 - intensity * 0.1) + grain, 0, 255);
      }
    }

    return new ImageData(out, w, h);
  }

  /* ─────────────────────────────────────────────────────────
     Public API
     ───────────────────────────────────────────────────────── */
  return { glitch, wave, distortion, noise, chromaticAberration, vhs };

})();
