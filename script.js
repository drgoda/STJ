// Year in footer
const yearEl = document.getElementById('year');
if (yearEl) {
  yearEl.textContent = new Date().getFullYear();
}

function whenInView(element, callback) {
  if (!('IntersectionObserver' in window)) return callback();
  const obs = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        obs.disconnect();
        callback();
      }
    });
  }, { rootMargin: '0px 0px -30% 0px' });
  obs.observe(element);
}

async function ensureBookDataLoaded() {
  if (window.BOOK_PDF_BASE64) return;
  await new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = '/assets/bookData.js';
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

// PDF.js setup using embedded base64 (no direct file URL)
async function loadPdfFromBase64() {
  await ensureBookDataLoaded();
  const base64 = (window.BOOK_PDF_BASE64 || '').trim();
  if (!base64) throw new Error('Missing embedded PDF data');
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);

  const pdfjsLib = window['pdfjs-dist/build/pdf'] || window.pdfjsLib;
  if (!pdfjsLib) throw new Error('PDF.js library not available');
  if (pdfjsLib.GlobalWorkerOptions) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.2.67/pdf.worker.min.js';
  }
  const task = pdfjsLib.getDocument({ data: bytes });
  return task.promise;
}

function createPageContainer(width, height) {
  const page = document.createElement('div');
  page.className = 'page';
  page.style.width = width + 'px';
  page.style.height = height + 'px';
  return page;
}

async function renderPdfToFlipbook() {
  const root = document.getElementById('flipbook-root');
  if (!root) return;

  const pdf = await loadPdfFromBase64();
  const firstPage = await pdf.getPage(1);
  const scaleForWidth = 1.5;
  const vp = firstPage.getViewport({ scale: scaleForWidth });

  const pageWidth = vp.width;
  const pageHeight = vp.height;

  const pageFlip = new St.PageFlip(root, {
    width: Math.round(pageWidth),
    height: Math.round(pageHeight),
    size: 'stretch',
    minWidth: 320,
    maxWidth: 1600,
    minHeight: 320,
    maxHeight: 1800,
    showPageCorners: true,
    mobileScrollSupport: true,
    useMouseEvents: true,
  });

  const total = pdf.numPages;
  const pages = new Array(total).fill(null);

  async function renderPageToCanvas(index) {
    if (pages[index]) return pages[index];
    const page = await pdf.getPage(index + 1);
    const viewport = page.getViewport({ scale: scaleForWidth });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');
    await page.render({ canvasContext: ctx, viewport }).promise;
    pages[index] = canvas;
    return canvas;
  }

  const pageElements = [];
  for (let i = 0; i < total; i++) {
    const container = createPageContainer(pageWidth, pageHeight);
    const inner = document.createElement('div');
    inner.style.width = '100%';
    inner.style.height = '100%';
    inner.style.display = 'flex';
    inner.style.alignItems = 'center';
    inner.style.justifyContent = 'center';
    inner.style.background = '#fff';
    inner.textContent = 'Loading…';
    container.appendChild(inner);
    pageElements.push(container);
  }

  pageFlip.loadFromHTML(pageElements);

  async function ensureRenderCurrent() {
    const current = pageFlip.getCurrentPageIndex();
    const spread = pageFlip.getPageCount() > 1 ? [current, current + 1] : [current];
    for (const idx of spread) {
      if (idx < 0 || idx >= total) continue;
      const container = pageFlip.pages[idx].element;
      if (!container) continue;
      if (container.dataset.rendered) continue;
      const canvas = await renderPageToCanvas(idx);
      container.innerHTML = '';
      container.appendChild(canvas);
      container.dataset.rendered = '1';
    }
  }

  pageFlip.on('flip', (e) => {
    const indicator = document.getElementById('pageIndicator');
    if (indicator) indicator.textContent = `Page ${e.data + 1}`;
    ensureRenderCurrent();
  });

  await ensureRenderCurrent();

  const prev = document.getElementById('prevPage');
  const next = document.getElementById('nextPage');
  prev && prev.addEventListener('click', () => pageFlip.flipPrev());
  next && next.addEventListener('click', () => pageFlip.flipNext());

  window.addEventListener('resize', () => pageFlip.update());
}

const flipbookSection = document.getElementById('flipbook');
if (flipbookSection) {
  whenInView(flipbookSection, () => {
    renderPdfToFlipbook().catch((err) => {
      const root = document.getElementById('flipbook-root');
      if (root) root.innerHTML = '<div style="padding:24px">Unable to load preview.</div>';
      console.error(err);
    });
  });
}