window.Renderer = (() => {
  'use strict';

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

  // Returns the character string for a given sequence key.
  // Falls back to standard if key not found.
  function getChars(seqKey, customValue) {
    if (seqKey === 'custom') return (customValue && customValue.length > 0) ? customValue : SEQUENCES.standard;
    return SEQUENCES[seqKey] || SEQUENCES.standard;
  }

  // Renders ASCII art from source ImageData onto ctx.
  // srcImageData: ImageData from source image (any size)
  // srcW, srcH: dimensions of srcImageData
  // ctx: CanvasRenderingContext2D to draw onto
  // canvasW, canvasH: dimensions of the output canvas
  // opts: {
  //   chars: string — character sequence to use (from getChars)
  //   fontSize: number — font size in px (e.g. 12)
  //   fontFamily: string — CSS font family string
  //   charSpacing: number — multiplier for cell width (1.0 = normal, 2.0 = double spacing)
  //   lineHeight: number — multiplier for cell height (1.0 = tight, 1.5 = spacious)
  //   contrast: number — 0-3, applied as power curve (1 = neutral)
  //   brightness: number — 0-2, additive shift (1 = neutral, >1 = brighter)
  //   invert: boolean — invert luminance mapping
  //   color: string — CSS color for ASCII chars (e.g. '#ffffff')
  //   useOriginalColor: boolean — if true, sample color from source image per cell
  //   bgColor: string — CSS background color (e.g. '#000000')
  // }
  function render(srcImageData, srcW, srcH, ctx, canvasW, canvasH, opts) {
    const {
      chars, fontSize, fontFamily, charSpacing, lineHeight,
      contrast, brightness, invert, color, useOriginalColor, bgColor,
    } = opts;

    // Cell dimensions — monospace chars are ~0.55x as wide as tall
    const cellW = Math.max(1, Math.round(fontSize * 0.55 * charSpacing));
    const cellH = Math.max(1, Math.round(fontSize * lineHeight));
    const cols  = Math.floor(canvasW / cellW);
    const rows  = Math.floor(canvasH / cellH);

    // Clear with background
    ctx.fillStyle = bgColor || '#000000';
    ctx.fillRect(0, 0, canvasW, canvasH);

    if (!chars || chars.length === 0) return;

    ctx.font         = `${fontSize}px ${fontFamily}`;
    ctx.textBaseline = 'top';
    ctx.textAlign    = 'left';

    const src = srcImageData.data;

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        // Map canvas cell to source pixel (nearest neighbour)
        const sx = Math.min(srcW - 1, Math.floor((col / cols) * srcW));
        const sy = Math.min(srcH - 1, Math.floor((row / rows) * srcH));
        const si = (sy * srcW + sx) * 4;

        const r = src[si];
        const g = src[si + 1];
        const b = src[si + 2];

        // Perceived luminance (BT.601)
        let lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

        // Brightness shift (1.0 = neutral)
        lum = Math.min(1, Math.max(0, lum + (brightness - 1)));

        // Contrast as power curve (1.0 = neutral)
        if (contrast !== 1 && contrast > 0) {
          lum = Math.min(1, Math.max(0, Math.pow(lum, 1 / contrast)));
        }

        // Invert
        if (invert) lum = 1 - lum;

        // Map luminance to character index
        const charIdx = Math.min(chars.length - 1, Math.floor(lum * chars.length));
        const ch = chars[charIdx];

        // Skip spaces (transparent bg already drawn)
        if (!ch || ch === ' ') continue;

        // Set fill color
        if (useOriginalColor) {
          ctx.fillStyle = `rgb(${r},${g},${b})`;
        } else {
          ctx.fillStyle = color;
        }

        ctx.fillText(ch, col * cellW, row * cellH);
      }
    }
  }

  return { render, getChars, SEQUENCES };
})();
