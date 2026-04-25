window.FontSystem = (() => {
  'use strict';

  let currentFont = "'Courier New', monospace";

  const POPULAR_MONO = [
    'Roboto Mono', 'Source Code Pro', 'Fira Code', 'JetBrains Mono',
    'IBM Plex Mono', 'Space Mono', 'Inconsolata', 'Oxygen Mono',
    'Share Tech Mono', 'Cutive Mono', 'Nova Mono', 'VT323',
    'Anonymous Pro', 'Overpass Mono', 'Ubuntu Mono', 'PT Mono',
  ];

  function loadFromFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = ev => {
        const name = 'AscFont_' + Date.now();
        const face = new FontFace(name, ev.target.result);
        face.load().then(loaded => {
          document.fonts.add(loaded);
          currentFont = `'${name}', monospace`;
          resolve({
            name: currentFont,
            displayName: file.name.replace(/\.[^.]+$/, ''),
          });
        }).catch(reject);
      };
      reader.onerror = () => reject(new Error('File read failed'));
      reader.readAsArrayBuffer(file);
    });
  }

  function loadGoogleFont(fontName) {
    return new Promise(resolve => {
      const id = 'gf-' + fontName.replace(/\s+/g, '-').toLowerCase();
      if (!document.getElementById(id)) {
        const link = document.createElement('link');
        link.id   = id;
        link.rel  = 'stylesheet';
        link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontName)}&display=swap`;
        document.head.appendChild(link);
      }
      document.fonts.ready.then(() => {
        currentFont = `'${fontName}', monospace`;
        resolve(fontName);
      });
    });
  }

  function searchFonts(query) {
    const q = query.toLowerCase();
    return POPULAR_MONO.filter(f => f.toLowerCase().includes(q)).slice(0, 8);
  }

  function setSystemFont(cssValue) {
    currentFont = cssValue;
  }

  function getCurrentFont() {
    return currentFont;
  }

  return { loadFromFile, loadGoogleFont, searchFonts, setSystemFont, getCurrentFont };
})();
