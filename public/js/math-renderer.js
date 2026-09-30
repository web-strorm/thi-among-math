// math-renderer.js - Perender Rumus Matematika Linear & Canvas Coret-Coretan (Scratchpad)
class MathRenderer {
  constructor() {
    this.scratchpadCanvas = null;
    this.scratchCtx = null;
    this.isDrawing = false;
    this.currentColor = '#ffff00';
    this.currentLineWidth = 3;
    this.isEraser = false;
  }

  // Format teks LaTeX & Aljabar ke representasi HTML yang mudah dibaca
  formatMathHTML(text) {
    if (!text) return '';
    let formatted = text;

    // Format Sistem Persamaan Cases \begin{cases} ... \end{cases}
    formatted = formatted.replace(/\\begin\{cases\}([\s\S]*?)\\end\{cases\}/g, (match, body) => {
      const rows = body.split('\\\\').map(r => r.trim()).filter(Boolean);
      const rowsHTML = rows.map(r => `<div class="case-row">${this.formatInlineMath(r)}</div>`).join('');
      return `<div class="spldv-bracket"><div class="bracket-brace">{</div><div class="case-content">${rowsHTML}</div></div>`;
    });

    // Format Display Math \[ ... \]
    formatted = formatted.replace(/\\\[([\s\S]*?)\\\]/g, (match, math) => {
      return `<div class="math-block">${this.formatInlineMath(math)}</div>`;
    });

    // Format Inline Math \( ... \)
    formatted = formatted.replace(/\\\(([\s\S]*?)\\\)/g, (match, math) => {
      return `<span class="math-inline">${this.formatInlineMath(math)}</span>`;
    });

    // Replace linebreaks
    formatted = formatted.replace(/\n/g, '<br>');

    return formatted;
  }

  formatInlineMath(str) {
    let res = str;

    // Pecahan \frac{A}{B}
    res = res.replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, '<span class="frac"><span class="num">$1</span><span class="frac-bar">/</span><span class="den">$2</span></span>');

    // Simbol Pertidaksamaan
    res = res.replace(/\\le/g, '≤');
    res = res.replace(/\\ge/g, '≥');
    res = res.replace(/\\cdot/g, '·');
    res = res.replace(/\\times/g, '×');
    res = res.replace(/\\implies/g, ' ⟹ ');
    res = res.replace(/\\iff/g, ' ⟺ ');
    res = res.replace(/\\text\{([^{}]+)\}/g, '$1');

    // Himpunan \{ A, B \}
    res = res.replace(/\\\{/g, '{');
    res = res.replace(/\\\}/g, '}');

    return res;
  }

  // Inisialisasi Scratchpad Canvas (Papan Coret-Coretan)
  initScratchpad(canvasId) {
    this.scratchpadCanvas = document.getElementById(canvasId);
    if (!this.scratchpadCanvas) return;

    this.scratchCtx = this.scratchpadCanvas.getContext('2d');
    this.resizeScratchpad();

    // Event Listeners Mouse & Touch
    const canvas = this.scratchpadCanvas;

    const startDraw = (e) => {
      this.isDrawing = true;
      const pos = this.getCanvasPos(e);
      this.scratchCtx.beginPath();
      this.scratchCtx.moveTo(pos.x, pos.y);
    };

    const draw = (e) => {
      if (!this.isDrawing) return;
      e.preventDefault();
      const pos = this.getCanvasPos(e);

      this.scratchCtx.lineCap = 'round';
      this.scratchCtx.lineJoin = 'round';

      if (this.isEraser) {
        this.scratchCtx.strokeStyle = '#121927';
        this.scratchCtx.lineWidth = 18;
      } else {
        this.scratchCtx.strokeStyle = this.currentColor;
        this.scratchCtx.lineWidth = this.currentLineWidth;
      }

      this.scratchCtx.lineTo(pos.x, pos.y);
      this.scratchCtx.stroke();
    };

    const stopDraw = () => {
      this.isDrawing = false;
    };

    canvas.addEventListener('mousedown', startDraw);
    canvas.addEventListener('mousemove', draw);
    window.addEventListener('mouseup', stopDraw);

    canvas.addEventListener('touchstart', startDraw, { passive: false });
    canvas.addEventListener('touchmove', draw, { passive: false });
    window.addEventListener('touchend', stopDraw);
  }

  getCanvasPos(e) {
    const rect = this.scratchpadCanvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: (clientX - rect.left) * (this.scratchpadCanvas.width / rect.width),
      y: (clientY - rect.top) * (this.scratchpadCanvas.height / rect.height)
    };
  }

  resizeScratchpad() {
    if (!this.scratchpadCanvas) return;
    this.scratchpadCanvas.width = 450;
    this.scratchpadCanvas.height = 200;
    this.clearScratchpad();
  }

  clearScratchpad() {
    if (!this.scratchCtx) return;
    this.scratchCtx.fillStyle = '#121927';
    this.scratchCtx.fillRect(0, 0, this.scratchpadCanvas.width, this.scratchpadCanvas.height);

    // Grid halus untuk catatan
    this.scratchCtx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    this.scratchCtx.lineWidth = 1;
    for (let x = 0; x < this.scratchpadCanvas.width; x += 25) {
      this.scratchCtx.beginPath();
      this.scratchCtx.moveTo(x, 0);
      this.scratchCtx.lineTo(x, this.scratchpadCanvas.height);
      this.scratchCtx.stroke();
    }
    for (let y = 0; y < this.scratchpadCanvas.height; y += 25) {
      this.scratchCtx.beginPath();
      this.scratchCtx.moveTo(0, y);
      this.scratchCtx.lineTo(this.scratchpadCanvas.width, y);
      this.scratchCtx.stroke();
    }
  }

  setTool(tool) {
    if (tool === 'eraser') {
      this.isEraser = true;
    } else {
      this.isEraser = false;
      this.currentColor = tool; // tool bisa warna seperti '#ffff00', '#00ffcc', '#ffffff'
    }
  }
}

window.mathRenderer = new MathRenderer();
