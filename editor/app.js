/* EditaYa — editor de video móvil (vanilla JS, sin dependencias).
 * Línea de tiempo con pista principal (videos/fotos), textos/stickers y audio.
 * Vista previa en <canvas>; exportación con canvas.captureStream + MediaRecorder + WebAudio.
 */
'use strict';
(() => {
  // ---------- utilidades ----------
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const bridge = window.AndroidBridge || null;
  function fmt(t, dec = true) {
    t = Math.max(0, t || 0);
    const m = Math.floor(t / 60), s = Math.floor(t % 60);
    let r = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    if (dec) r += '.' + Math.floor((t * 10) % 10);
    return r;
  }
  const easeOutBack = (p) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2); };

  // ---------- iconos ----------
  const ICONS = {
    plus: '<path d="M12 5v14M5 12h14"/>',
    play: '<path d="M7 4.5v15l12.5-7.5z" fill="currentColor" stroke="none"/>',
    pause: '<path d="M6.5 4.5h4v15h-4zM13.5 4.5h4v15h-4z" fill="currentColor" stroke="none"/>',
    undo: '<path d="M9 14L4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-4"/>',
    redo: '<path d="M15 14l5-5-5-5"/><path d="M20 9H9a5 5 0 0 0 0 10h4"/>',
    newp: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M12 12v6M9 15h6"/>',
    media: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="M7 4v16M17 4v16M2 9h5M2 15h5M17 9h5M17 15h5"/>',
    music: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
    text: '<path d="M4 7V4h16v3M9 20h6M12 4v16"/>',
    smile: '<circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01"/>',
    ratio: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
    image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/>',
    edit: '<path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
    scissors: '<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M20 4L8.1 15.9M14.5 14.5L20 20M8.1 8.1L12 12"/>',
    speed: '<path d="M12 14l4-4"/><path d="M3.3 19a10 10 0 1 1 17.4 0"/>',
    volume: '<path d="M11 5L6 9H2v6h4l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14"/>',
    filter: '<circle cx="9" cy="9" r="6"/><circle cx="15" cy="9" r="6"/><circle cx="12" cy="15" r="6"/>',
    sliders: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
    crop: '<path d="M6 2v14a2 2 0 0 0 2 2h14M18 22V8a2 2 0 0 0-2-2H2"/>',
    transition: '<rect x="3" y="5" width="8" height="14" rx="1.5"/><rect x="13" y="5" width="8" height="14" rx="1.5"/><path d="M10 12h4"/>',
    trSmall: '<path d="M5 12h14"/>',
    trOn: '<path d="M4 6l8 6-8 6zM20 6l-8 6 8 6z" fill="currentColor"/>',
    copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
    trash: '<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>',
    left: '<path d="M15 18l-6-6 6-6"/>',
    right: '<path d="M9 18l6-6-6-6"/>',
    close: '<path d="M18 6L6 18M6 6l12 12"/>',
    check: '<path d="M20 6L9 17l-5-5"/>',
    back: '<path d="M19 12H5M12 19l-7-7 7-7"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
    share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/>',
    rotate: '<path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/>',
    flip: '<path d="M12 3v18M8 7l-5 5 5 5zM16 7l5 5-5 5z"/>',
    reset: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>',
    film: '<path d="M7 4.5v15l12.5-7.5z"/>',
    layers: '<path d="M12 2l10 5-10 5L2 7z"/><path d="M2 17l10 5 10-5M2 12l10 5 10-5"/>',
    up: '<path d="M12 19V5M5 12l7-7 7 7"/>',
    down: '<path d="M12 5v14M5 12l7 7 7-7"/>',
    opacity: '<circle cx="12" cy="12" r="9"/><path d="M12 3v18" /><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor"/>',
    stepB: '<path d="M6 5v14"/><path d="M19 5v14l-10-7z" fill="currentColor"/>',
    stepF: '<path d="M18 5v14"/><path d="M5 5v14l10-7z" fill="currentColor"/>',
    zoomIn: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3M8 11h6M11 8v6"/>',
    zoomOut: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3M8 11h6"/>',
  };
  const ic = (n) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS[n] || ''}</svg>`;

  // ---------- constantes ----------
  const RATIOS = {
    '9:16': [720, 1280], '16:9': [1280, 720], '1:1': [720, 720],
    '4:5': [720, 900], '3:4': [720, 960], '4:3': [960, 720],
  };
  const FILTERS = [
    { id: 'none', name: 'Original', css: '' },
    { id: 'vivid', name: 'Vívido', css: 'saturate(1.45) contrast(1.08)' },
    { id: 'warm', name: 'Cálido', css: 'sepia(.25) saturate(1.3) brightness(1.03)' },
    { id: 'cool', name: 'Frío', css: 'hue-rotate(-12deg) saturate(1.15) brightness(1.04)' },
    { id: 'bw', name: 'B y N', css: 'grayscale(1) contrast(1.1)' },
    { id: 'noir', name: 'Noir', css: 'grayscale(1) contrast(1.6) brightness(.9)' },
    { id: 'sepia', name: 'Sepia', css: 'sepia(.85)' },
    { id: 'vintage', name: 'Vintage', css: 'sepia(.45) contrast(.9) brightness(1.1) saturate(.85)' },
    { id: 'faded', name: 'Desvaído', css: 'contrast(.8) brightness(1.15) saturate(.7)' },
    { id: 'drama', name: 'Drama', css: 'contrast(1.45) saturate(.8)' },
    { id: 'pop', name: 'Pop', css: 'saturate(2) contrast(1.15)' },
    { id: 'dream', name: 'Sueño', css: 'brightness(1.12) saturate(1.2) blur(.6px)' },
    { id: 'night', name: 'Noche', css: 'hue-rotate(190deg) saturate(.6) brightness(.85)' },
    { id: 'invert', name: 'Negativo', css: 'invert(1)' },
  ];
  const TRANSITIONS = [
    { id: 'none', name: 'Ninguna' }, { id: 'fade', name: 'Fundido' }, { id: 'flash', name: 'Destello' },
    { id: 'zoom', name: 'Zoom' }, { id: 'slide', name: 'Deslizar' }, { id: 'blur', name: 'Desenfoque' },
  ];
  const TR_DUR = 0.5;
  const TEXT_ANIMS = [
    { id: 'none', name: 'Ninguna' }, { id: 'fade', name: 'Aparecer' }, { id: 'pop', name: 'Pop' },
    { id: 'slide', name: 'Subir' }, { id: 'type', name: 'Máquina' },
  ];
  const TEXT_STYLES = [{ id: 'plain', name: 'Sombra' }, { id: 'outline', name: 'Contorno' }, { id: 'box', name: 'Caja' }];
  const FONTS = {
    sans: { name: 'Moderna', f: 'system-ui,-apple-system,"Segoe UI",Roboto,sans-serif', w: 800 },
    serif: { name: 'Clásica', f: 'Georgia,"Times New Roman",serif', w: 700 },
    mono: { name: 'Mono', f: 'ui-monospace,"Roboto Mono",Menlo,monospace', w: 700 },
    hand: { name: 'Divertida', f: '"Comic Sans MS","Comic Neue","Chalkboard SE",cursive', w: 700 },
    impact: { name: 'Impacto', f: 'Impact,"Arial Black","Roboto Condensed",sans-serif', w: 900 },
  };
  const COLORS = ['#ffffff', '#000000', '#ff3d7f', '#ffcc00', '#2ee59d', '#22d3ee', '#3b82f6', '#a259ff', '#ff8a00', '#ef4444'];
  const STICKERS = ['😀', '😂', '😍', '🥳', '😎', '🤩', '😭', '😱', '🤯', '👍', '👏', '🙌', '💪', '🙏', '👀', '🔥', '✨', '💯', '❤️', '💥', '⭐', '🎉', '🎵', '📍', '🌈', '☀️', '🌙', '⚡', '🍕', '🚀', '➡️', '⬇️', '✅', '❌', '💬', '🎬'];
  const TILE = 44;
  const LS_KEY = 'editaya.project.v1';

  // ---------- estado ----------
  const newProject = () => ({ v: 1, ratio: '9:16', bg: { type: 'blur', color: '#000000' }, clips: [], overlays: [], texts: [], audios: [] });
  let S = newProject();
  const media = new Map(); // id -> {id, kind, url, name, duration, el, w, h, thumbs[], wave}
  let sel = null; // {type:'clip'|'text'|'audio', id}
  let t = 0, playing = false, dirty = true, lastNow = 0, activeClipId = null, stallSince = 0;
  let pps = 60; // píxeles por segundo en la línea de tiempo
  let pad = 180;
  let trimPreview = null;
  let exporting = null;
  let exportScale = 1;
  let hist = [], hi = -1;
  let importDest = 'main';
  let textBoxes = [], ovBoxes = [];

  // ---------- DOM ----------
  const cv = $('#canvas'), ctx = cv.getContext('2d');
  const stage = $('#stage'), tl = $('#timeline'), inner = $('#tl-inner');
  const ruler = $('#ruler'), rowsEl = $('#rows');
  const toolbar = $('#toolbar'), sheet = $('#sheet'), sheetBody = $('.sheet-body', sheet), pool = $('#pool');
  const fileMedia = $('#file-media'), fileAudio = $('#file-audio');

  // ---------- IndexedDB (guardar archivos para recuperar el proyecto) ----------
  const DB = {
    db: null,
    open() {
      if (this.db) return Promise.resolve(this.db);
      return new Promise((res, rej) => {
        const r = indexedDB.open('editaya', 1);
        r.onupgradeneeded = () => r.result.createObjectStore('media');
        r.onsuccess = () => { this.db = r.result; res(this.db); };
        r.onerror = () => rej(r.error);
      });
    },
    async tx(mode, fn) {
      const db = await this.open();
      return new Promise((res, rej) => {
        const tr = db.transaction('media', mode); const st = tr.objectStore('media');
        const req = fn(st); tr.oncomplete = () => res(req && req.result); tr.onerror = () => rej(tr.error); tr.onabort = () => rej(tr.error);
      });
    },
    put(k, v) { return this.tx('readwrite', (s) => s.put(v, k)); },
    get(k) { return this.tx('readonly', (s) => s.get(k)); },
    del(k) { return this.tx('readwrite', (s) => s.delete(k)); },
    keys() { return this.tx('readonly', (s) => s.getAllKeys()); },
    clear() { return this.tx('readwrite', (s) => s.clear()); },
  };

  // ---------- helpers de línea de tiempo ----------
  const clipLen = (c) => (c.out - c.in) / c.speed;
  function layout() {
    let s = 0;
    return S.clips.map((c, idx) => { const o = { clip: c, idx, start: s, len: clipLen(c) }; s += o.len; return o; });
  }
  const mainDur = () => S.clips.reduce((a, c) => a + clipLen(c), 0);
  const ovLen = (c) => (c.out - c.in) / c.speed;
  const maxTrack = () => S.overlays.reduce((m, c) => Math.max(m, c.track), -1);
  const isOverlay = (c) => c && typeof c.track === 'number';
  function trackFree(tr, start, len, except) {
    return !S.overlays.some((o) => o !== except && o.track === tr && o.start < start + len - 1e-3 && start < o.start + ovLen(o) - 1e-3);
  }
  function freeTrack(start, len, from = 0, except) {
    for (let tr = from; ; tr++) if (trackFree(tr, start, len, except)) return tr;
  }
  /** Coloca una superposición en una pista libre y compacta las pistas vacías. */
  function placeOverlay(it) {
    if (!trackFree(it.track, it.start, ovLen(it), it)) it.track = freeTrack(it.start, ovLen(it), it.track, it);
    normTracks();
  }
  function normTracks() {
    const used = [...new Set(S.overlays.map((o) => o.track))].sort((a, b) => a - b);
    S.overlays.forEach((o) => { o.track = used.indexOf(o.track); });
  }
  function overlaysAt(time) {
    return S.overlays.filter((c) => time >= c.start && time < c.start + ovLen(c)).sort((a, b) => a.track - b.track);
  }
  function totalDur() {
    const m = mainDur();
    if (m > 0) return m;
    let e = 0;
    for (const x of S.texts) e = Math.max(e, x.start + x.dur);
    for (const a of S.audios) e = Math.max(e, a.start + (a.out - a.in));
    for (const c of S.overlays) e = Math.max(e, c.start + ovLen(c));
    return e;
  }
  function clipAt(time) {
    const L = layout();
    if (trimPreview) {
      const c = findItem('clip', trimPreview.id) || findItem('overlay', trimPreview.id);
      if (c) return { clip: c, idx: -1, start: 0, len: clipLen(c), local: 0, src: trimPreview.src };
    }
    for (let i = 0; i < L.length; i++) {
      const o = L[i];
      if (time < o.start + o.len || i === L.length - 1) {
        if (time > o.start + o.len + 1e-3) return null;
        return { ...o, local: clamp(time - o.start, 0, o.len) };
      }
    }
    return null;
  }
  function srcTimeOf(a, m) {
    const mx = (m && isFinite(m.duration) ? m.duration : Infinity) - 0.04;
    if (a.src != null) return clamp(a.src, 0, Math.max(0, mx));
    const st = a.clip.in + a.local * a.clip.speed;
    const max = Math.min(a.clip.out, (m && isFinite(m.duration) ? m.duration : Infinity) - 0.04);
    return clamp(st, a.clip.in, Math.max(a.clip.in, max));
  }
  function findItem(kind, id) {
    const arr = kind === 'clip' ? S.clips : kind === 'overlay' ? S.overlays : kind === 'text' ? S.texts : S.audios;
    return arr.find((x) => x.id === id);
  }
  const selItem = () => (sel ? findItem(sel.type, sel.id) : null);

  // ---------- historial ----------
  function commit() {
    const snap = JSON.stringify(S);
    if (hist[hi] === snap) { refresh(); return; }
    hist = hist.slice(0, hi + 1); hist.push(snap);
    if (hist.length > 80) hist.shift();
    hi = hist.length - 1;
    save(); refresh();
  }
  function histMove(d) {
    closeSheet(true); pause();
    restoreSnap(hi + d);
  }
  function restoreSnap(i) {
    if (i < 0 || i >= hist.length) return;
    hi = i; S = JSON.parse(hist[hi]);
    if (sel && !selItem()) sel = null;
    t = clamp(t, 0, totalDur());
    save(); refresh(); seekPreview();
  }
  let saveTimer = 0;
  function save() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => { try { localStorage.setItem(LS_KEY, JSON.stringify(S)); } catch (e) { /* sin espacio */ } }, 300);
  }

  // ---------- UI general ----------
  let toastTimer = 0;
  function toast(msg, ms = 2200, action) {
    const el = $('#toast');
    el.innerHTML = `<span>${esc(msg)}</span>` + (action ? `<button class="toast-act">${esc(action.label)}</button>` : '');
    if (action) $('.toast-act', el).onclick = () => { el.classList.remove('show'); action.fn(); };
    el.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('show'), action ? Math.max(ms, 4000) : ms);
  }
  const vibrate = (ms = 20) => { try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) { /* */ } };

  // Menú emergente / diálogo propio (no depende de confirm() del navegador)
  function closeMenu() { const m = $('#menu'); if (m) m.parentNode.removeChild(m); }
  function showMenu({ title, text, items, anchor }) {
    closeMenu();
    const wrap = document.createElement('div');
    wrap.id = 'menu'; wrap.className = 'menu-wrap' + (anchor ? '' : ' center');
    wrap.innerHTML = `<div class="menu" role="dialog" aria-modal="true">` +
      (title ? `<div class="menu-title">${esc(title)}</div>` : '') + (text ? `<div class="menu-text">${esc(text)}</div>` : '') +
      items.map((it, i) => `<button class="menu-item${it.danger ? ' danger' : ''}${it.muted ? ' muted' : ''}" data-i="${i}">${it.icon ? ic(it.icon) : ''}<span>${esc(it.label)}</span></button>`).join('') +
      `</div>`;
    document.body.appendChild(wrap);
    const menu = $('.menu', wrap);
    if (anchor) {
      const mw = menu.offsetWidth, mh = menu.offsetHeight;
      const x = clamp(anchor.left + anchor.width / 2 - mw / 2, 12, innerWidth - mw - 12);
      let y = anchor.top - mh - 10;
      if (y < 12) y = Math.min(innerHeight - mh - 12, anchor.bottom + 10);
      menu.style.left = x + 'px'; menu.style.top = y + 'px';
    }
    wrap.addEventListener('click', (e) => {
      const b = e.target.closest('.menu-item');
      if (b) { closeMenu(); const it = items[+b.dataset.i]; if (it.fn) it.fn(); return; }
      if (!e.target.closest('.menu')) { closeMenu(); const c = items.find((x) => x.muted); if (c && c.fn) c.fn(); }
    });
  }
  function confirmDlg(title, text, okLabel, danger) {
    return new Promise((res) => showMenu({ title, text, items: [
      { label: okLabel, danger, icon: danger ? 'trash' : 'check', fn: () => res(true) },
      { label: 'Cancelar', muted: true, fn: () => res(false) },
    ] }));
  }
  function busy(msg) { $('#busy-msg').textContent = msg || ''; $('#busy').classList.toggle('hidden', msg == null); }

  function applyCanvasSize() {
    const [w, h] = RATIOS[S.ratio] || RATIOS['9:16'];
    const W = Math.round((w * exportScale) / 2) * 2, H = Math.round((h * exportScale) / 2) * 2;
    if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
    fitStage(); dirty = true;
  }
  function fitStage() {
    const r = stage.getBoundingClientRect();
    const aw = Math.max(40, r.width - 20), ah = Math.max(40, r.height - 12);
    const ar = cv.width / cv.height;
    let w = aw, h = w / ar;
    if (h > ah) { h = ah; w = h * ar; }
    cv.style.width = Math.floor(w) + 'px'; cv.style.height = Math.floor(h) + 'px';
  }
  function fmtC(x) { x = Math.max(0, x || 0); return `${fmt(x, false)}.${String(Math.floor((x * 100) % 100)).padStart(2, '0')}`; }
  function updateLabels() {
    $('#time').textContent = fmtC(t);
    $('#dur').textContent = fmt(totalDur());
  }
  function updatePlayBtn() { $('#btn-play').innerHTML = ic(playing ? 'pause' : 'play'); }
  function updateHistBtns() { $('#btn-undo').disabled = hi <= 0; $('#btn-redo').disabled = hi >= hist.length - 1; }
  function refresh() {
    applyCanvasSize();
    gcOverlays();
    t = clamp(t, 0, totalDur());
    renderTimeline(); renderToolbar(); updateLabels(); updateHistBtns();
    const empty = !S.clips.length && !S.overlays.length && !S.texts.length && !S.audios.length;
    $('#empty').classList.toggle('hidden', !empty);
    $('#btn-export').disabled = empty;
    dirty = true;
  }

  // ---------- medios ----------
  function once(el, ev, ms = 15000) {
    return new Promise((res, rej) => {
      let to = 0;
      const ok = () => { clean(); res(); };
      const bad = () => { clean(); rej(new Error('No se pudo leer el archivo')); };
      const clean = () => { clearTimeout(to); el.removeEventListener(ev, ok); el.removeEventListener('error', bad); };
      el.addEventListener(ev, ok); el.addEventListener('error', bad);
      to = setTimeout(() => { clean(); rej(new Error('timeout')); }, ms);
    });
  }
  async function fixDuration(el) {
    if (isFinite(el.duration) && el.duration > 0) return;
    // Archivos WebM grabados con MediaRecorder no traen duración: forzarla.
    await new Promise((res) => {
      const h = () => { if (isFinite(el.duration)) { el.removeEventListener('durationchange', h); res(); } };
      el.addEventListener('durationchange', h);
      el.currentTime = 1e7;
      setTimeout(res, 4000);
    });
    el.currentTime = 0;
  }
  function kindOf(f) {
    const ty = f.type || '', n = (f.name || '').toLowerCase();
    if (ty.startsWith('video/')) return 'video';
    if (ty.startsWith('image/')) return 'image';
    if (ty.startsWith('audio/')) return 'audio';
    if (/\.(mp4|webm|mov|mkv|3gp|m4v)$/.test(n)) return 'video';
    if (/\.(png|jpe?g|gif|webp|bmp|avif)$/.test(n)) return 'image';
    if (/\.(mp3|m4a|aac|wav|ogg|oga|opus|flac|amr)$/.test(n)) return 'audio';
    return null;
  }
  async function loadMedia(id, blob, kind, name) {
    const url = URL.createObjectURL(blob);
    const m = { id, kind, url, name, duration: Infinity, el: null, w: 0, h: 0, thumbs: [], wave: null };
    try {
      if (kind === 'image') {
        const img = new Image(); img.src = url; await img.decode();
        m.el = img; m.w = img.naturalWidth; m.h = img.naturalHeight;
        m.thumbs = [{ t: 0, url: await thumbOf(img, m.w, m.h) }];
      } else {
        const el = document.createElement(kind === 'video' ? 'video' : 'audio');
        el.preload = 'auto'; el.playsInline = true; el.setAttribute('playsinline', ''); el.src = url;
        pool.appendChild(el);
        await once(el, 'loadedmetadata');
        await fixDuration(el);
        m.el = el; m.duration = el.duration || 0;
        if (kind === 'video') { m.w = el.videoWidth; m.h = el.videoHeight; }
        el.addEventListener('seeked', () => {
          if (el._pending != null) { const p = el._pending; el._pending = null; el.currentTime = p; }
          dirty = true;
        });
        el.addEventListener('loadeddata', () => { dirty = true; });
        if (kind === 'video') genThumbs(m); else genWave(m, blob);
      }
    } catch (e) {
      URL.revokeObjectURL(url);
      if (m.el && m.el.remove) m.el.remove();
      throw e;
    }
    media.set(id, m);
    routeAudio(m);
    return m;
  }
  function thumbOf(src, w, h) {
    const c = document.createElement('canvas'); const H = 96; c.height = H; c.width = Math.max(8, Math.round((H * w) / (h || 1)));
    c.getContext('2d').drawImage(src, 0, 0, c.width, c.height);
    return new Promise((res) => c.toBlob((b) => res(b ? URL.createObjectURL(b) : c.toDataURL('image/jpeg', 0.6)), 'image/jpeg', 0.65));
  }
  async function genThumbs(m) {
    const v = document.createElement('video');
    v.muted = true; v.preload = 'auto'; v.playsInline = true; v.src = m.url;
    try {
      await once(v, 'loadeddata', 10000);
      const n = clamp(Math.round(m.duration / 1.5), 2, 30);
      for (let i = 0; i < n; i++) {
        const tt = ((i + 0.5) * m.duration) / n;
        v.currentTime = tt;
        try { await once(v, 'seeked', 5000); } catch (e) { continue; }
        m.thumbs.push({ t: tt, url: await thumbOf(v, m.w || v.videoWidth, m.h || v.videoHeight) });
        if (i === 0 || i % 4 === 3 || i === n - 1) scheduleTimeline();
      }
    } catch (e) { /* sin miniaturas */ }
    v.removeAttribute('src'); v.load();
  }
  async function genWave(m, blob) {
    try {
      const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
      const ac = new OAC(1, 44100, 44100);
      const ab = await ac.decodeAudioData(await blob.arrayBuffer());
      const data = ab.getChannelData(0);
      const perSec = 25, N = Math.max(1, Math.ceil(ab.duration * perSec)), step = Math.floor(data.length / N) || 1;
      const c = document.createElement('canvas'); c.width = N * 2; c.height = 40;
      const g = c.getContext('2d'); g.fillStyle = 'rgba(46,229,157,.55)';
      for (let i = 0; i < N; i++) {
        let peak = 0;
        for (let j = i * step; j < (i + 1) * step && j < data.length; j += 8) peak = Math.max(peak, Math.abs(data[j]));
        const h = Math.max(1, peak * 38); g.fillRect(i * 2, 20 - h / 2, 1.4, h);
      }
      m.wave = await new Promise((res) => c.toBlob((b) => res(b ? URL.createObjectURL(b) : c.toDataURL())));
      scheduleTimeline();
    } catch (e) { /* sin forma de onda */ }
  }
  function thumbFor(m, st) {
    if (!m || !m.thumbs.length) return '';
    let best = m.thumbs[0];
    for (const th of m.thumbs) if (Math.abs(th.t - st) < Math.abs(best.t - st)) best = th;
    return best.url;
  }

  // ---------- audio (WebAudio para mezclar y exportar) ----------
  let actx = null, master = null, recDest = null;
  function ensureAudioCtx() {
    if (!actx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      actx = new AC();
      master = actx.createGain(); master.connect(actx.destination);
      recDest = actx.createMediaStreamDestination(); master.connect(recDest);
      for (const m of media.values()) routeAudio(m);
      for (const r of ovEls.values()) routeAudio(r);
    }
    if (actx.state === 'suspended') actx.resume().catch(() => {});
  }
  function routeAudio(m) {
    if (!actx || m.gain || m.kind === 'image' || !m.el) return;
    try {
      m.srcNode = actx.createMediaElementSource(m.el);
      m.gain = actx.createGain(); m.srcNode.connect(m.gain); m.gain.connect(master);
    } catch (e) { console.warn('audio', e); }
  }
  function setGain(m, v) {
    if (m.gain) m.gain.gain.value = v; else if (m.el) m.el.volume = clamp(v, 0, 1);
  }

  // Cada superposición de video tiene su propio <video>, para poder reproducirse
  // a la vez que el clip principal (aunque usen el mismo archivo).
  const ovEls = new Map(); // clipId -> {kind, el, gain}
  function ovRec(c) {
    const m = media.get(c.mediaId);
    if (!m || m.kind !== 'video') return null;
    let rec = ovEls.get(c.id);
    if (!rec || rec.mediaId !== c.mediaId) {
      if (rec) dropOv(c.id);
      const el = document.createElement('video');
      el.preload = 'auto'; el.playsInline = true; el.setAttribute('playsinline', ''); el.src = m.url;
      el.addEventListener('seeked', () => {
        if (el._pending != null) { const p = el._pending; el._pending = null; el.currentTime = p; }
        dirty = true;
      });
      el.addEventListener('loadeddata', () => { dirty = true; });
      pool.appendChild(el);
      rec = { kind: 'video', el, mediaId: c.mediaId };
      ovEls.set(c.id, rec);
      routeAudio(rec);
    }
    return rec;
  }
  function dropOv(id) {
    const rec = ovEls.get(id); if (!rec) return;
    try { rec.el.pause(); } catch (e) { /* */ }
    if (rec.gain) { try { rec.gain.disconnect(); } catch (e) { /* */ } }
    rec.el.removeAttribute('src'); rec.el.load(); rec.el.parentNode && rec.el.parentNode.removeChild(rec.el);
    ovEls.delete(id);
  }
  function gcOverlays() { for (const id of [...ovEls.keys()]) if (!findItem('overlay', id)) dropOv(id); }
  function elFor(c) {
    const m = media.get(c.mediaId); if (!m) return null;
    if (isOverlay(c) && m.kind === 'video') { const r = ovRec(c); return r && r.el; }
    return m.el;
  }

  // ---------- importación ----------
  function insertionIndex() {
    const a = clipAt(t);
    if (!a) return S.clips.length;
    return a.local > a.len / 2 ? a.idx + 1 : a.idx;
  }
  function closestRatio(w, h) {
    const ar = w / h; let best = '9:16', d = Infinity;
    for (const [k, [rw, rh]] of Object.entries(RATIOS)) { const dd = Math.abs(Math.log(ar / (rw / rh))); if (dd < d) { d = dd; best = k; } }
    return best;
  }
  async function importFiles(files, dest) {
    files = [...files];
    if (!files.length) return;
    busy('Importando…');
    const wasEmpty = !S.clips.length;
    let at = dest === 'main' ? insertionIndex() : 0, added = 0, firstMedia = null, dbFail = false;
    for (const f of files) {
      let kind = kindOf(f);
      if (!kind) { toast(`Formato no soportado: ${f.name}`); continue; }
      if (dest === 'audio') { if (kind === 'image') { toast('Elige un archivo de audio'); continue; } kind = 'audio'; }
      try {
        const id = uid();
        const m = await loadMedia(id, f, kind, f.name || 'archivo');
        try { await DB.put(id, { blob: f, name: m.name, kind }); } catch (e) { dbFail = true; }
        if (dest === 'overlay' && kind !== 'audio') {
          const len = kind === 'image' ? 3 : m.duration;
          S.overlays.push({
            id: uid(), mediaId: id, kind, in: 0, out: len, speed: 1, volume: 1, start: t, track: freeTrack(t, len),
            filter: 'none', adj: { b: 0, c: 0, s: 0, h: 0, w: 0, v: 0 }, fit: 'fit', zoom: 0.5, rot: 0, flip: false, px: 0, py: 0,
            opacity: 1, fadeIn: 0, fadeOut: 0,
          });
          sel = { type: 'overlay', id: S.overlays[S.overlays.length - 1].id };
        } else if (kind === 'audio') {
          S.audios.push({ id: uid(), mediaId: id, name: m.name, start: dest === 'audio' ? t : 0, in: 0, out: m.duration, volume: 1, fadeIn: 0, fadeOut: 0 });
        } else {
          S.clips.splice(at++, 0, {
            id: uid(), mediaId: id, kind, in: 0, out: kind === 'image' ? 3 : m.duration, speed: 1, volume: 1,
            filter: 'none', adj: { b: 0, c: 0, s: 0, h: 0, w: 0, v: 0 }, fit: 'fit', zoom: 1, rot: 0, flip: false, px: 0, py: 0, trans: 'none',
          });
          if (!firstMedia) firstMedia = m;
        }
        added++;
      } catch (e) {
        console.error(e); toast(`No se pudo abrir ${f.name}`);
      }
    }
    busy(null);
    if (dbFail) toast('Aviso: sin espacio para guardar una copia del proyecto');
    if (added) {
      if (wasEmpty && firstMedia && firstMedia.w) S.ratio = closestRatio(firstMedia.w, firstMedia.h);
      commit(); seekPreview();
      let seen = false;
      try { seen = !!localStorage.getItem('editaya.tip1'); localStorage.setItem('editaya.tip1', '1'); } catch (e) { /* */ }
      if (!seen) setTimeout(() => toast('Consejo: toca un clip para editarlo. Mantenlo presionado 2 s para eliminarlo.', 6000), 400);
    }
  }

  // ---------- reproducción ----------
  function pauseAll() {
    for (const m of media.values()) if (m.el && m.kind !== 'image' && !m.el.paused) m.el.pause();
    for (const r of ovEls.values()) if (!r.el.paused) r.el.pause();
  }
  function play() {
    if (totalDur() <= 0) return;
    ensureAudioCtx();
    if (t >= totalDur() - 0.05) setTime(0);
    playing = true; activeClipId = null; lastNow = performance.now(); stallSince = 0;
    updatePlayBtn();
  }
  function pause() {
    if (!playing) return;
    playing = false; pauseAll(); updatePlayBtn(); seekPreview(); updateLabels();
  }
  function setTime(nt) {
    t = clamp(nt, 0, totalDur());
    tl.scrollLeft = t * pps;
    updateLabels();
    if (!playing) seekPreview();
  }
  function seekEl(el, st) {
    if (Math.abs(el.currentTime - st) < 0.015) return;
    if (el.seeking) { el._pending = st; return; }
    el.currentTime = st;
  }
  function seekPreview() {
    if (!playing) pauseAll();
    const a = clipAt(t);
    if (a && a.clip.kind === 'video') {
      const m = media.get(a.clip.mediaId), el = elFor(a.clip);
      if (m && el) seekEl(el, srcTimeOf(a, m));
    }
    if (!trimPreview) for (const c of overlaysAt(t)) {
      if (c.kind !== 'video') continue;
      const r = ovRec(c); if (r) seekEl(r.el, c.in + (t - c.start) * c.speed);
    }
    dirty = true;
  }
  function step(now) {
    const dt = Math.min(0.1, Math.max(0, (now - lastNow) / 1000)); lastNow = now;
    const total = totalDur();
    const a = clipAt(t);
    let nt = t + dt, activeMedia = null;
    if (a) {
      const c = a.clip, m = media.get(c.mediaId);
      if (m && c.kind === 'video') {
        activeMedia = m; const el = m.el; const want = srcTimeOf(a, m);
        if (activeClipId !== c.id) {
          activeClipId = c.id; stallSince = 0;
          if (Math.abs(el.currentTime - want) > 0.12) el.currentTime = want;
        }
        if (el.playbackRate !== c.speed) el.playbackRate = c.speed;
        setGain(m, c.volume);
        const atEnd = el.ended || el.currentTime >= m.duration - 0.03;
        if (!atEnd) {
          if (el.paused) el.play().catch(() => {});
          if (el.seeking || el.readyState < 3 || el.paused) {
            // esperar a que el video tenga datos (con límite para no bloquearse)
            if (!stallSince) stallSince = now;
            if (now - stallSince < 1500) nt = t;
          } else {
            stallSince = 0;
            const vt = a.start + (el.currentTime - c.in) / c.speed;
            if (Math.abs(vt - t) > 0.45) { el.currentTime = want; nt = t; } else nt = Math.max(vt, t);
          }
        }
      } else activeClipId = c.id;
    } else activeClipId = null;
    for (const m of media.values()) if (m.kind === 'video' && m !== activeMedia && !m.el.paused) m.el.pause();

    // superposiciones de video (sincronizadas al reloj principal)
    const activeOv = new Set();
    for (const c of S.overlays) {
      if (c.kind !== 'video') continue;
      const local = nt - c.start, len = ovLen(c);
      if (local < 0 || local >= len) continue;
      const r = ovRec(c); if (!r) continue;
      activeOv.add(r);
      const el = r.el, want = c.in + local * c.speed;
      if (el.playbackRate !== c.speed) el.playbackRate = c.speed;
      if (!el.seeking && Math.abs(el.currentTime - want) > 0.3) el.currentTime = want;
      if (el.paused) el.play().catch(() => {});
      let f = 1;
      if (c.fadeIn > 0) f = Math.min(f, local / c.fadeIn);
      if (c.fadeOut > 0) f = Math.min(f, (len - local) / c.fadeOut);
      setGain(r, c.volume * clamp(f, 0, 1));
    }
    for (const r of ovEls.values()) if (!activeOv.has(r) && !r.el.paused) r.el.pause();

    // pistas de audio
    const activeAudio = new Map();
    for (const au of S.audios) {
      const len = au.out - au.in;
      if (nt >= au.start && nt < au.start + len) activeAudio.set(au.mediaId, au);
    }
    for (const m of media.values()) {
      if (m.kind !== 'audio') continue;
      const au = activeAudio.get(m.id);
      if (!au) { if (!m.el.paused) m.el.pause(); continue; }
      const local = nt - au.start, want = au.in + local, len = au.out - au.in;
      if (Math.abs(m.el.currentTime - want) > 0.3) m.el.currentTime = want;
      if (m.el.paused) m.el.play().catch(() => {});
      let f = 1;
      if (au.fadeIn > 0) f = Math.min(f, local / au.fadeIn);
      if (au.fadeOut > 0) f = Math.min(f, (len - local) / au.fadeOut);
      setGain(m, au.volume * clamp(f, 0, 1));
    }

    if (nt >= total) {
      t = total;
      if (exporting) { draw(); finishExport(false); } else pause();
      return;
    }
    t = nt;
  }
  function loop(now) {
    if (playing) step(now); else lastNow = now;
    if (playing || dirty) {
      draw(); dirty = false;
      if (playing) {
        tl.scrollLeft = t * pps; updateLabels();
        if (exporting) {
          const p = Math.round((t / Math.max(0.01, totalDur())) * 100);
          $('#ex-bar').style.width = p + '%'; $('#ex-pct').textContent = p + '%';
        }
      }
    }
    requestAnimationFrame(loop);
  }

  // ---------- render del canvas ----------
  const bgSmall = document.createElement('canvas'), bgMid = document.createElement('canvas');
  function filterCss(c) {
    const f = FILTERS.find((x) => x.id === c.filter);
    let s = (f && f.css) || '';
    const a = c.adj || {};
    if (a.b) s += ` brightness(${(1 + a.b / 200).toFixed(3)})`;
    if (a.c) s += ` contrast(${(1 + a.c / 150).toFixed(3)})`;
    if (a.s) s += ` saturate(${(1 + a.s / 100).toFixed(3)})`;
    if (a.h) s += ` hue-rotate(${a.h}deg)`;
    return s.trim() || 'none';
  }
  function srcSize(m) {
    if (m.kind === 'image') return [m.el.naturalWidth, m.el.naturalHeight];
    return [m.el.videoWidth || m.w, m.el.videoHeight || m.h];
  }
  function drawMedia(src, sw, sh, W, H, c, extraScale, dx) {
    const rot = ((c.rot || 0) % 360 + 360) % 360;
    const [iw, ih] = rot % 180 ? [sh, sw] : [sw, sh];
    const s = c.fit === 'fill' ? Math.max(W / iw, H / ih) : Math.min(W / iw, H / ih);
    const k = s * (c.zoom || 1) * extraScale;
    ctx.save();
    ctx.translate(W / 2 + (c.px || 0) * W + dx, H / 2 + (c.py || 0) * H);
    ctx.rotate((rot * Math.PI) / 180);
    if (c.flip) ctx.scale(-1, 1);
    ctx.drawImage(src, (-sw * k) / 2, (-sh * k) / 2, sw * k, sh * k);
    ctx.restore();
    const bw = iw * k, bh = ih * k, cx = W / 2 + (c.px || 0) * W + dx, cy = H / 2 + (c.py || 0) * H;
    return { x: cx - bw / 2, y: cy - bh / 2, w: bw, h: bh };
  }
  function elSize(m, el) {
    if (m.kind === 'image') return [el.naturalWidth, el.naturalHeight];
    return [el.videoWidth || m.w, el.videoHeight || m.h];
  }
  function drawOverlays(W, H) {
    ovBoxes = [];
    if (trimPreview) return;
    for (const c of overlaysAt(t)) {
      const m = media.get(c.mediaId), el = m && elFor(c);
      if (!el) continue;
      if (m.kind === 'image' ? !el.complete : el.readyState < 2) continue;
      const [sw, sh] = elSize(m, el);
      if (!sw || !sh) continue;
      const local = t - c.start, len = ovLen(c);
      let a = c.opacity == null ? 1 : c.opacity;
      if (c.fadeIn > 0) a *= clamp(local / c.fadeIn, 0, 1);
      if (c.fadeOut > 0) a *= clamp((len - local) / c.fadeOut, 0, 1);
      ctx.save(); ctx.globalAlpha = a; ctx.filter = filterCss(c);
      const box = drawMedia(el, sw, sh, W, H, c, 1, 0);
      ctx.restore();
      ovBoxes.push({ id: c.id, ...box });
      if (!exporting && sel && sel.type === 'overlay' && sel.id === c.id) {
        const k = Math.min(W, H) / 720;
        ctx.save(); ctx.lineWidth = 3 * k; ctx.strokeStyle = '#22d3ee'; ctx.strokeRect(box.x, box.y, box.w, box.h); ctx.restore();
      }
    }
  }
  function drawBlurBg(src, sw, sh, W, H) {
    const sW = Math.max(8, Math.round(W / 28)), sH = Math.max(8, Math.round(H / 28));
    if (bgSmall.width !== sW || bgSmall.height !== sH) { bgSmall.width = sW; bgSmall.height = sH; }
    const mW = sW * 4, mH = sH * 4;
    if (bgMid.width !== mW || bgMid.height !== mH) { bgMid.width = mW; bgMid.height = mH; }
    const g = bgSmall.getContext('2d');
    const s = Math.max(sW / sw, sH / sh) * 1.1;
    g.drawImage(src, (sW - sw * s) / 2, (sH - sh * s) / 2, sw * s, sh * s);
    const g2 = bgMid.getContext('2d'); g2.imageSmoothingQuality = 'high';
    g2.drawImage(bgSmall, 0, 0, mW, mH);
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bgMid, 0, 0, W, H);
    ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(0, 0, W, H);
  }
  function draw() {
    const W = cv.width, H = cv.height;
    const a = clipAt(t);
    let m = null, src = null, ready = false;
    if (a) {
      m = media.get(a.clip.mediaId);
      if (m) src = elFor(a.clip);
      if (m && src) ready = m.kind === 'image' ? src.complete : src.readyState >= 2;
      // si el video aún no tiene cuadro, mantener el cuadro anterior en vez de parpadear en negro
      if (m && !ready && m.kind === 'video' && draw.hasFrame) return;
    }
    ctx.save();
    ctx.globalAlpha = 1; ctx.filter = 'none';
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    if (a && m && ready) {
      const c = a.clip;
      const [sw, sh] = elSize(m, src);
      let alpha = 1, scale = 1, dx = 0, flash = 0, blur = 0;
      const apply = (kind, p, dir) => {
        if (kind === 'fade') alpha *= p;
        else if (kind === 'flash') flash = Math.max(flash, 1 - p);
        else if (kind === 'zoom') scale *= 1 + 0.35 * (1 - p);
        else if (kind === 'slide') dx += dir * (1 - p) * W;
        else if (kind === 'blur') blur = Math.max(blur, (1 - p) * 18);
      };
      if (a.src == null && a.idx > 0 && c.trans && c.trans !== 'none' && a.local < TR_DUR / 2) apply(c.trans, a.local / (TR_DUR / 2), 1);
      const next = a.src == null ? S.clips[a.idx + 1] : null;
      if (next && next.trans && next.trans !== 'none' && a.len - a.local < TR_DUR / 2) apply(next.trans, (a.len - a.local) / (TR_DUR / 2), -1);
      if (sw && sh) {
        ctx.globalAlpha = alpha;
        if (S.bg.type === 'blur') drawBlurBg(src, sw, sh, W, H);
        else { ctx.fillStyle = S.bg.color || '#000'; ctx.fillRect(0, 0, W, H); }
        let f = filterCss(c);
        if (blur) f = (f === 'none' ? '' : f + ' ') + `blur(${blur.toFixed(1)}px)`;
        ctx.filter = f || 'none';
        drawMedia(src, sw, sh, W, H, c, scale, dx);
        ctx.filter = 'none';
        const adj = c.adj || {};
        if (adj.w) {
          ctx.globalCompositeOperation = 'soft-light';
          ctx.fillStyle = adj.w > 0 ? `rgba(255,140,30,${(adj.w / 100) * 0.6})` : `rgba(40,120,255,${(-adj.w / 100) * 0.6})`;
          ctx.fillRect(0, 0, W, H);
          ctx.globalCompositeOperation = 'source-over';
        }
        if (adj.v) {
          const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.hypot(W, H) / 2);
          g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(0,0,0,${adj.v / 100})`);
          ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
        }
        ctx.globalAlpha = 1;
        if (flash > 0) { ctx.fillStyle = `rgba(255,255,255,${flash})`; ctx.fillRect(0, 0, W, H); }
        draw.hasFrame = true;
      }
    }
    ctx.restore();
    drawOverlays(W, H);
    if (!trimPreview) drawTexts(W, H); else textBoxes = [];
  }
  function rrect(x, y, w, h, r) {
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
    else { ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  }
  function drawTexts(W, H) {
    textBoxes = [];
    const k = Math.min(W, H) / 720;
    for (const x of S.texts) {
      if (t < x.start || t > x.start + x.dur) continue;
      const local = t - x.start, AD = 0.45, p = clamp(local / AD, 0, 1), pe = 1 - Math.pow(1 - p, 3);
      let alpha = 1, sc = 1, dy = 0, chars = Infinity;
      switch (x.anim) {
        case 'fade': alpha = Math.min(p, clamp((x.dur - local) / AD, 0, 1)); break;
        case 'pop': sc = p < 1 ? Math.max(0.01, easeOutBack(p)) : 1; alpha = Math.min(1, p * 3); break;
        case 'slide': dy = (1 - pe) * H * 0.06; alpha = p; break;
        case 'type': chars = Math.floor((x.text || '').length * clamp(local / clamp(x.dur * 0.5, 0.4, 1.5), 0, 1)); break;
      }
      const fs = x.size * k, F = FONTS[x.font] || FONTS.sans;
      ctx.save();
      ctx.font = `${F.w} ${fs}px ${F.f}`; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
      const lines = (x.text || ' ').split('\n');
      const lh = fs * 1.22;
      const widths = lines.map((l) => ctx.measureText(l).width);
      const bw = Math.max(fs * 0.6, ...widths) + fs * 0.7, bh = lines.length * lh + fs * 0.35;
      const cx = x.x * W, cy = x.y * H + dy;
      ctx.globalAlpha = alpha; ctx.translate(cx, cy); ctx.scale(sc, sc);
      if (x.style === 'box') { ctx.fillStyle = x.bg; rrect(-bw / 2, -bh / 2, bw, bh, fs * 0.25); ctx.fill(); }
      let left = chars;
      lines.forEach((line, i) => {
        let s = line;
        if (left !== Infinity) { s = line.slice(0, Math.max(0, left)); left -= line.length + 1; }
        if (!s) return;
        const y = -((lines.length - 1) * lh) / 2 + i * lh, lx = -widths[i] / 2;
        if (x.style === 'outline') {
          ctx.lineWidth = Math.max(2, fs * 0.16); ctx.strokeStyle = x.bg; ctx.lineJoin = 'round';
          ctx.strokeText(s, lx, y);
        } else if (x.style === 'plain' && !x.sticker) {
          ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = fs * 0.18; ctx.shadowOffsetY = fs * 0.04;
        }
        ctx.fillStyle = x.color; ctx.fillText(s, lx, y);
        ctx.shadowColor = 'transparent';
      });
      ctx.restore();
      const box = { id: x.id, x: cx - (bw * sc) / 2, y: cy - (bh * sc) / 2, w: bw * sc, h: bh * sc };
      textBoxes.push(box);
      if (!exporting && sel && sel.type === 'text' && sel.id === x.id) {
        ctx.save(); ctx.setLineDash([10 * k, 8 * k]); ctx.lineWidth = 2.5 * k; ctx.strokeStyle = '#fff';
        ctx.strokeRect(box.x - 6 * k, box.y - 6 * k, box.w + 12 * k, box.h + 12 * k); ctx.restore();
      }
    }
  }

  // ---------- línea de tiempo ----------
  // Filas (de arriba a abajo): superposiciones (la de más arriba se dibuja encima), video principal, textos, audio.
  const ROW_OV = 46, LANE = 28, HW = 22;
  let tlRaf = 0;
  function scheduleTimeline() { if (!tlRaf) tlRaf = requestAnimationFrame(() => { tlRaf = 0; renderTimeline(); }); }
  function fmtRuler(s) { return s < 60 ? (Number.isInteger(s) ? s + 's' : s.toFixed(1) + 's') : fmt(s, false); }

  /** Geometría de un elemento: tiempo en la línea (t0) donde comienza su "in", rango de origen y velocidad. */
  function geoOf(kind, it) {
    if (kind === 'clip') { const o = layout().find((x) => x.clip.id === it.id); return { t0: o ? o.start : 0, in: it.in, out: it.out, speed: it.speed }; }
    if (kind === 'text') return { t0: it.start, in: it.start, out: it.start + it.dur, speed: 1 };
    return { t0: it.start, in: it.in, out: it.out, speed: it.speed || 1 };
  }
  function trimLimits(kind, it, g) {
    if (kind === 'text') return { minIn: 0, maxOut: Infinity };
    const m = media.get(it.mediaId);
    const dur = it.kind === 'image' ? it.in + 3600 : m ? m.duration : g.out;
    let minIn = 0;
    if (kind !== 'clip') minIn = Math.max(0, g.in - g.t0 * g.speed); // no empezar antes del segundo 0
    return { minIn, maxOut: dur };
  }
  function snapTargets(excludeId, kind) {
    const s = [0, t];
    if (kind !== 'clip') for (const o of layout()) s.push(o.start, o.start + o.len);
    for (const c of S.overlays) if (c.id !== excludeId) s.push(c.start, c.start + ovLen(c));
    for (const x of S.texts) if (x.id !== excludeId) s.push(x.start, x.start + x.dur);
    for (const a of S.audios) if (a.id !== excludeId) s.push(a.start, a.start + (a.out - a.in));
    return s;
  }

  function tilesHTML(m, a, w, speed) {
    let h = '';
    const n = Math.min(200, Math.ceil(w / TILE));
    for (let j = 0; j < n; j++) {
      const u = thumbFor(m, a + ((j * TILE + TILE / 2) / pps) * speed);
      h += `<div class="tile"${u ? ` style="background-image:url('${u}')"` : ''}></div>`;
    }
    return h;
  }
  /** HTML de un bloque con soporte de recorte en vivo: zona sombreada (se elimina) y zona extendida. */
  function blockHTML(kind, it, g, o) {
    const isSel = sel && sel.type === kind && sel.id === it.id;
    const d = drag && drag.id === it.id && drag.moved ? drag : null;
    let t0 = g.t0;
    if (d && d.mode === 'move') t0 = d.pstart + (kind === 'text' ? 0 : 0);
    const gin = kind === 'text' && d && d.mode === 'move' ? d.pstart : g.in;
    const gout = kind === 'text' && d && d.mode === 'move' ? d.pstart + (g.out - g.in) : g.out;
    const pin = d && d.mode !== 'move' ? d.pin : gin, pout = d && d.mode !== 'move' ? d.pout : gout;
    const a = Math.min(gin, pin), b = Math.max(gout, pout);
    const X = (s) => pad + t0 * pps + ((s - gin) / g.speed) * pps;
    const left = X(a), width = Math.max(4, X(b) - left);
    let inner = o.content(a, width);
    const seg = (cls, s1, s2) => (s2 - s1 > 1e-4 ? `<div class="${cls}" style="left:${X(s1) - left}px;width:${X(s2) - X(s1)}px"></div>` : '');
    inner += seg('shade', gin, Math.max(gin, pin)) + seg('shade', Math.min(gout, pout), gout);
    inner += seg('ext', pin, Math.min(pin, gin)) + seg('ext', Math.max(gout, pout), pout);
    if (isSel) {
      const kl = X(pin) - left, kw = X(pout) - X(pin);
      inner += `<div class="keep" style="left:${kl}px;width:${kw}px"></div>` +
        `<div class="h l" style="left:${kl}px"></div><div class="h r" style="left:${kl + kw - (kind === 'clip' || kind === 'overlay' ? HW : 16)}px"></div>`;
    }
    const cls = `${o.cls}${isSel ? ' sel' : ''}${d ? ' dragging' : ''}`;
    return `<div class="${cls}" data-kind="${kind}" data-id="${it.id}" style="left:${left}px;width:${width}px;${o.style || ''}">${inner}</div>`;
  }
  function lanesOf(items) {
    const lanes = [];
    [...items].sort((p, q) => p.s - q.s).forEach((it) => {
      let li = lanes.findIndex((end) => end <= it.s + 1e-3);
      if (li < 0) { li = lanes.length; lanes.push(0); }
      lanes[li] = it.s + it.len; it.lane = li;
    });
    return Math.max(1, lanes.length);
  }

  function renderTimeline() {
    const W = tl.clientWidth || 360; pad = Math.round(W / 2);
    const L = layout(), total = totalDur();
    const mainEnd = L.length ? L[L.length - 1].start + L[L.length - 1].len : 0;
    let end = total;
    for (const c of S.overlays) end = Math.max(end, c.start + ovLen(c));
    for (const x of S.texts) end = Math.max(end, x.start + x.dur);
    for (const a of S.audios) end = Math.max(end, a.start + a.out - a.in);
    inner.style.width = pad * 2 + Math.max(end * pps, 1) + 90 + 'px';

    // regla con marcas mayores y menores
    const steps = [0.1, 0.25, 0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300];
    const stp = steps.find((s) => s * pps >= 60) || 600;
    const minor = stp / 5;
    let r = '';
    for (let s = 0; s <= end + stp; s += stp) {
      r += `<div class="tick" style="left:${pad + s * pps}px">${fmtRuler(+s.toFixed(2))}</div>`;
      if (minor * pps >= 8) for (let k = 1; k < 5; k++) r += `<div class="mtick" style="left:${pad + (s + k * minor) * pps}px"></div>`;
    }
    ruler.innerHTML = r;

    let h = '';
    // --- superposiciones ---
    let nTr = S.overlays.length ? maxTrack() + 1 : 0;
    if (drag && drag.kind === 'overlay' && drag.mode === 'move' && drag.moved) nTr = Math.max(nTr, drag.ptrack + 1);
    for (let tr = nTr - 1; tr >= 0; tr--) {
      let row = '';
      for (const c of S.overlays) {
        const isD = drag && drag.id === c.id && drag.mode === 'move' && drag.moved;
        if ((isD ? drag.ptrack : c.track) !== tr) continue;
        const m = media.get(c.mediaId);
        row += blockHTML('overlay', c, geoOf('overlay', c), {
          cls: 'clip ov',
          content: (a, w) => tilesHTML(m, a, w, c.speed) + `<span class="meta">${fmt(ovLen(c))}</span>`,
        });
      }
      h += `<div class="row ov" style="height:${ROW_OV}px"><div class="row-label">${ic('layers')}<i>${tr + 1}</i></div>${row}</div>`;
    }
    if (!nTr) h += `<div class="row ghost-row"><div class="row-label">${ic('layers')}</div><button class="ghost" data-act="overlay" style="left:${pad + 6}px">+ Superposición</button></div>`;

    // --- pista principal ---
    let v = '';
    L.forEach((o, i) => {
      const c = o.clip, m = media.get(c.mediaId);
      const badges = [c.speed !== 1 ? c.speed + 'x' : '', c.filter !== 'none' ? '✦' : '', c.volume === 0 ? '🔇' : ''].filter(Boolean).join(' ');
      v += blockHTML('clip', c, { t0: o.start, in: c.in, out: c.out, speed: c.speed }, {
        cls: 'clip',
        content: (a, w) => tilesHTML(m, a, w, c.speed) + `<span class="meta">${fmt(o.len)}</span>${badges ? `<span class="badge">${badges}</span>` : ''}`,
      });
      if (i > 0) v += `<button class="tr-btn${c.trans !== 'none' ? ' on' : ''}" data-tr="${c.id}" style="left:${pad + o.start * pps}px" aria-label="Transición">${ic(c.trans !== 'none' ? 'trOn' : 'trSmall')}</button>`;
    });
    v += `<button class="add-clip" data-act="add" style="left:${pad + mainEnd * pps + 12}px" aria-label="Agregar">${ic('plus')}</button>`;
    h += `<div class="row main"><div class="row-label">${ic('film')}</div>${v}</div>`;

    // --- textos y audio (con carriles si se superponen) ---
    const laneRow = (kind, arr, mk, ghost, act, icon) => {
      const items = arr.map((x) => {
        const d = drag && drag.id === x.id && drag.moved && drag.mode === 'move' ? drag : null;
        const g = geoOf(kind, x);
        return { x, s: d ? d.pstart : g.t0, len: (g.out - g.in) / g.speed };
      });
      const n = lanesOf(items);
      let row = '';
      for (const it of items) {
        const o = mk(it.x); o.style = (o.style || '') + `top:${it.lane * LANE}px;`;
        row += blockHTML(kind, it.x, geoOf(kind, it.x), o);
      }
      if (!arr.length) row += `<button class="ghost" data-act="${act}" style="left:${pad + 6}px">${ghost}</button>`;
      return `<div class="row lanes ${kind}" style="height:${n * LANE - 2}px"><div class="row-label">${ic(icon)}</div>${row}</div>`;
    };
    h += laneRow('text', S.texts, (x) => ({
      cls: 'item text', content: () => `<span>${esc((x.sticker ? '' : 'T  ') + (x.text || '').replace(/\n/g, ' '))}</span>`,
    }), '+ Añadir texto', 'text', 'text');
    h += laneRow('audio', S.audios, (au) => {
      const m = media.get(au.mediaId);
      return {
        cls: 'item audio', content: (a) => {
          const st = m && m.wave ? ` style="background-image:url('${m.wave}');background-size:${m.duration * pps}px 100%;background-position:${-a * pps}px 0"` : '';
          return `<div class="wave"${st}></div><span>♪  ${esc(au.name)}</span>`;
        },
      };
    }, '+ Añadir audio', 'audio', 'music');

    if (drag && drag.moved && drag.snapT != null) h += `<div class="snap-line" style="left:${pad + drag.snapT * pps}px"></div>`;
    rowsEl.innerHTML = h;
    if (!playing && !drag) tl.scrollLeft = t * pps;
  }

  // scroll = mover el cabezal
  tl.addEventListener('scroll', () => {
    if (playing || drag || exporting) return;
    const nt = tl.scrollLeft / pps;
    if (Math.abs(nt - t) * pps < 0.75) return;
    t = clamp(nt, 0, totalDur()); updateLabels(); seekPreview();
  }, { passive: true });
  tl.addEventListener('pointerdown', () => { if (playing && !exporting) pause(); });

  // zoom con pellizco, botones o Ctrl+rueda
  let pinchTl = null;
  const tdist = (ts) => Math.hypot(ts[0].clientX - ts[1].clientX, ts[0].clientY - ts[1].clientY);
  tl.addEventListener('touchstart', (e) => { if (e.touches.length === 2) pinchTl = { d: tdist(e.touches), pps }; }, { passive: true });
  tl.addEventListener('touchmove', (e) => {
    if (pinchTl && e.touches.length === 2) {
      e.preventDefault();
      pps = clamp((pinchTl.pps * tdist(e.touches)) / pinchTl.d, 6, 800); renderTimeline();
    }
  }, { passive: false });
  tl.addEventListener('touchend', (e) => { if (e.touches.length < 2) pinchTl = null; });
  function zoomTl(f) { pps = clamp(pps * f, 6, 800); renderTimeline(); }
  $('#zoom-in').innerHTML = ic('zoomIn'); $('#zoom-out').innerHTML = ic('zoomOut');
  $('#zoom-in').addEventListener('click', () => zoomTl(1.5));
  $('#zoom-out').addEventListener('click', () => zoomTl(1 / 1.5));
  tl.addEventListener('wheel', (e) => {
    if (!e.ctrlKey) return;
    e.preventDefault(); zoomTl(e.deltaY < 0 ? 1.12 : 0.89);
  }, { passive: false });

  // selección
  let dragEndedAt = 0;
  inner.addEventListener('click', (e) => {
    if (performance.now() - dragEndedAt < 250) return;
    const b = e.target.closest('[data-act]');
    if (b) { act(b.dataset.act); return; }
    const tr = e.target.closest('[data-tr]');
    if (tr) { select('clip', tr.dataset.tr); act('transition'); return; }
    const it = e.target.closest('[data-kind]');
    if (it) { if (!(sel && sel.id === it.dataset.id)) select(it.dataset.kind, it.dataset.id); return; }
    if (sel) select(null);
  });

  // pulsación larga (2 s) sobre un elemento: menú para eliminarlo
  const LONG_MS = 2000;
  let lp = null;
  function clearLP() {
    if (!lp) return;
    clearTimeout(lp.timer);
    $$('.pressing', inner).forEach((x) => x.classList.remove('pressing'));
    lp = null;
  }
  function itemTitle(kind, it) {
    if (kind === 'clip') return `${it.kind === 'image' ? 'Foto' : 'Clip'} ${S.clips.indexOf(it) + 1} · ${fmt(clipLen(it))}`;
    if (kind === 'overlay') return `Superposición · pista ${it.track + 1} · ${fmt(ovLen(it))}`;
    if (kind === 'text') return it.sticker ? `Sticker ${it.text}` : `Texto «${(it.text || '').replace(/\n/g, ' ').slice(0, 22)}»`;
    return `Audio «${it.name.slice(0, 22)}»`;
  }
  function longPress(kind, id) {
    const it = findItem(kind, id); if (!it) return;
    dragEndedAt = performance.now(); drag = null; trimPreview = null;
    if (playing) pause();
    vibrate(35);
    select(kind, id);
    const el = $(`[data-kind="${kind}"][data-id="${id}"]`, inner);
    showMenu({
      title: itemTitle(kind, it),
      anchor: el ? el.getBoundingClientRect() : null,
      items: [
        { label: 'Eliminar', icon: 'trash', danger: true, fn: () => { if (findItem(kind, id)) { sel = { type: kind, id }; delSel(); } } },
        { label: 'Duplicar', icon: 'copy', fn: () => { if (findItem(kind, id)) { sel = { type: kind, id }; dupSel(); } } },
        { label: 'Cancelar', muted: true },
      ],
    });
  }
  inner.addEventListener('pointerdown', (e) => {
    clearLP();
    const it = e.target.closest('[data-kind]');
    if (!it || e.target.closest('.h, button')) return;
    const kind = it.dataset.kind, id = it.dataset.id;
    it.classList.add('pressing');
    lp = { x: e.clientX, y: e.clientY, pid: e.pointerId, sl: tl.scrollLeft, st: tl.scrollTop, timer: setTimeout(() => { clearLP(); longPress(kind, id); }, LONG_MS) };
  });
  window.addEventListener('pointermove', (e) => { if (lp && e.pointerId === lp.pid && Math.hypot(e.clientX - lp.x, e.clientY - lp.y) > 10) clearLP(); });
  window.addEventListener('pointerup', clearLP);
  window.addEventListener('pointercancel', clearLP);
  tl.addEventListener('scroll', () => { if (lp && Math.abs(tl.scrollLeft - lp.sl) + Math.abs(tl.scrollTop - lp.st) > 10) clearLP(); }, { passive: true });
  inner.addEventListener('contextmenu', (e) => e.preventDefault());

  // ----- arrastre: recortar (manijas) y mover superposiciones/textos/audio -----
  // Durante el recorte el clip NO se mueve: la parte que se quitará queda sombreada
  // y el cambio se aplica recién al soltar.
  let drag = null;
  inner.addEventListener('pointerdown', (e) => {
    const el = e.target.closest('[data-kind]');
    if (!el || !el.classList.contains('sel')) return;
    const h = e.target.closest('.h'), kind = el.dataset.kind;
    if (!h && kind === 'clip') return; // el cuerpo del clip principal sirve para desplazar la línea
    e.preventDefault();
    if (playing) pause();
    const it = findItem(kind, el.dataset.id);
    if (!it) return;
    const g = geoOf(kind, it);
    drag = {
      kind, id: it.id, mode: h ? (h.classList.contains('l') ? 'l' : 'r') : 'move', pid: e.pointerId,
      x0: e.clientX + tl.scrollLeft, y0: e.clientY, cx: e.clientX, cy: e.clientY, sl0: tl.scrollLeft,
      g, pin: g.in, pout: g.out, pstart: g.t0, ptrack: it.track, moved: false, snapT: null,
    };
    requestAnimationFrame(autoScrollTick);
  });
  function dragUpdate() {
    const d = drag; if (!d) return;
    const it = findItem(d.kind, d.id); if (!it) return;
    const dxp = d.cx + tl.scrollLeft - d.x0;
    if (!d.moved) { if (Math.abs(dxp) < 4 && Math.abs(d.cy - d.y0) < 6) return; d.moved = true; }
    const g = d.g, ds = dxp / pps;
    const targets = snapTargets(d.id, d.kind), tol = 10 / pps;
    const snap = (T) => { let best = null, bd = tol; for (const s of targets) { const q = Math.abs(s - T); if (q < bd) { bd = q; best = s; } } return best; };
    let snapT = null;
    if (d.mode === 'move') {
      const len = (g.out - g.in) / g.speed;
      let st = Math.max(0, g.t0 + ds);
      const s1 = snap(st), s2 = snap(st + len);
      if (s1 != null) { st = s1; snapT = s1; } else if (s2 != null && s2 - len >= 0) { st = s2 - len; snapT = s2; }
      d.pstart = st;
      if (d.kind === 'overlay') d.ptrack = clamp(it.track + Math.round((d.y0 - d.cy) / ROW_OV), 0, maxTrack() + 1);
    } else {
      const lim = trimLimits(d.kind, it, g), minSrc = 0.1 * g.speed;
      const T = (p) => g.t0 + (p - g.in) / g.speed, P = (T2) => g.in + (T2 - g.t0) * g.speed;
      if (d.mode === 'l') {
        let p = clamp(g.in + ds * g.speed, lim.minIn, g.out - minSrc);
        const s = snap(T(p)); if (s != null && P(s) >= lim.minIn && P(s) <= g.out - minSrc) { p = P(s); snapT = s; }
        d.pin = p;
      } else {
        let p = clamp(g.out + ds * g.speed, g.in + minSrc, lim.maxOut);
        const s = snap(T(p)); if (s != null && P(s) >= g.in + minSrc && P(s) <= lim.maxOut) { p = P(s); snapT = s; }
        d.pout = p;
      }
      if (d.kind === 'clip' || d.kind === 'overlay') {
        trimPreview = { id: d.id, src: d.mode === 'l' ? d.pin : Math.max(d.pin, d.pout - 0.05) };
        const el = elFor(it); if (el && it.kind === 'video') seekEl(el, trimPreview.src);
      }
    }
    if (snapT !== d.snapT) { if (snapT != null) vibrate(8); d.snapT = snapT; }
    scheduleTimeline(); dirty = true; dragInfo();
  }
  function dragInfo() {
    const d = drag, info = $('#sel-info'); if (!d || !d.moved) return;
    const g = d.g, oldLen = (g.out - g.in) / g.speed;
    if (d.mode === 'move') {
      info.innerHTML = `<b>Inicio ${fmt(d.pstart)}${d.kind === 'overlay' ? ` · pista ${d.ptrack + 1}` : ''}</b><span>Suelta para colocarlo aquí</span>`;
    } else {
      const nl = (d.pout - d.pin) / g.speed, diff = nl - oldLen;
      const msg = diff < -0.005 ? `Se quitará ${Math.abs(diff).toFixed(2)} s (zona sombreada)` : diff > 0.005 ? `Se agregarán ${diff.toFixed(2)} s` : 'Sin cambios';
      info.innerHTML = `<b>Duración ${fmt(nl)}</b><span>${msg} · suelta para aplicar</span>`;
    }
    info.classList.remove('hidden');
  }
  function autoScrollTick() {
    if (!drag) return;
    if (drag.moved) {
      const r = tl.getBoundingClientRect(), zone = 48;
      let v = 0;
      if (drag.cx < r.left + zone) v = -Math.ceil((r.left + zone - drag.cx) / 3);
      else if (drag.cx > r.right - zone) v = Math.ceil((drag.cx - (r.right - zone)) / 3);
      if (v) { const before = tl.scrollLeft; tl.scrollLeft += v; if (tl.scrollLeft !== before) dragUpdate(); }
    }
    requestAnimationFrame(autoScrollTick);
  }
  window.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.pid) return;
    drag.cx = e.clientX; drag.cy = e.clientY; dragUpdate();
  });
  function applyDrag(d) {
    const it = findItem(d.kind, d.id); if (!it) return '';
    const g = d.g, oldLen = (g.out - g.in) / g.speed;
    if (d.mode === 'move') {
      it.start = d.pstart;
      if (d.kind === 'overlay') { it.track = d.ptrack; placeOverlay(it); }
      return '';
    }
    if (d.kind === 'clip') { it.in = d.pin; it.out = d.pout; }
    else if (d.kind === 'text') { it.start = d.pin; it.dur = d.pout - d.pin; }
    else { it.start = g.t0 + (d.pin - g.in) / g.speed; it.in = d.pin; it.out = d.pout; if (d.kind === 'overlay') placeOverlay(it); }
    const diff = (d.pout - d.pin) / g.speed - oldLen;
    return diff < -0.005 ? `Recortado: se quitaron ${Math.abs(diff).toFixed(2)} s` : diff > 0.005 ? `Alargado ${diff.toFixed(2)} s` : '';
  }
  const endDrag = (e) => {
    if (!drag || e.pointerId !== drag.pid) return;
    const d = drag; drag = null; trimPreview = null;
    if (!d.moved) { scheduleTimeline(); return; }
    dragEndedAt = performance.now();
    const msg = applyDrag(d);
    if (Math.abs(tl.scrollLeft - d.sl0) > 1) t = Math.max(0, tl.scrollLeft / pps);
    commit(); seekPreview();
    if (msg) { vibrate(15); toast(msg, 2500, { label: 'Deshacer', fn: () => histMove(-1) }); }
  };
  window.addEventListener('pointerup', endDrag);
  window.addEventListener('pointercancel', endDrag);

  // ---------- interacción con la vista previa ----------
  const ptrs = new Map(); let gest = null;
  function cvPt(e) { const r = cv.getBoundingClientRect(); return { x: ((e.clientX - r.left) / r.width) * cv.width, y: ((e.clientY - r.top) / r.height) * cv.height }; }
  function hitText(p) {
    for (let i = textBoxes.length - 1; i >= 0; i--) {
      const b = textBoxes[i], m = 14;
      if (p.x >= b.x - m && p.x <= b.x + b.w + m && p.y >= b.y - m && p.y <= b.y + b.h + m) return b;
    }
    return null;
  }
  function hitOverlay(p) {
    for (let i = ovBoxes.length - 1; i >= 0; i--) {
      const b = ovBoxes[i];
      if (p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h) return b;
    }
    return null;
  }
  const pdist = () => { const [a, b] = [...ptrs.values()]; return Math.hypot(a.x - b.x, a.y - b.y); };
  cv.addEventListener('pointerdown', (e) => {
    if (exporting) return;
    try { cv.setPointerCapture(e.pointerId); } catch (er) { /* */ }
    const p = cvPt(e); ptrs.set(e.pointerId, p);
    if (ptrs.size === 1) {
      if (playing) pause();
      const hit = hitText(p);
      if (hit) {
        const x = findItem('text', hit.id);
        const wasSel = sel && sel.type === 'text' && sel.id === hit.id;
        if (!wasSel) select('text', hit.id);
        gest = { type: 'text', id: hit.id, p0: p, orig: { x: x.x, y: x.y, size: x.size }, moved: false, wasSel };
      } else if (hitOverlay(p)) {
        const hb = hitOverlay(p), c = findItem('overlay', hb.id);
        const wasSel = sel && sel.type === 'overlay' && sel.id === c.id;
        if (!wasSel) select('overlay', c.id);
        gest = { type: 'overlay', id: c.id, p0: p, orig: { px: c.px || 0, py: c.py || 0, zoom: c.zoom || 1 }, moved: false, wasSel };
      } else {
        const a = clipAt(t);
        if (sel && sel.type === 'clip' && a && a.clip.id === sel.id) {
          const c = a.clip; gest = { type: 'clip', id: c.id, p0: p, orig: { px: c.px || 0, py: c.py || 0, zoom: c.zoom || 1 }, moved: false };
        } else gest = { type: 'tap', p0: p, moved: false };
      }
    } else if (ptrs.size === 2 && gest && gest.type !== 'tap') {
      const o = findItem(gest.type, gest.id);
      gest.pinch = { d0: pdist(), v0: gest.type === 'text' ? o.size : o.zoom || 1 };
    }
  });
  cv.addEventListener('pointermove', (e) => {
    if (!gest || !ptrs.has(e.pointerId)) return;
    const p = cvPt(e); ptrs.set(e.pointerId, p);
    const o = gest.type !== 'tap' ? findItem(gest.type, gest.id) : null;
    if (gest.pinch && ptrs.size >= 2 && o) {
      const r = pdist() / gest.pinch.d0;
      if (gest.type === 'text') o.size = clamp(gest.pinch.v0 * r, 12, 400); else o.zoom = clamp(gest.pinch.v0 * r, 0.2, 5);
      gest.moved = true; dirty = true; return;
    }
    const dx = (p.x - gest.p0.x) / cv.width, dy = (p.y - gest.p0.y) / cv.height;
    if (Math.hypot(p.x - gest.p0.x, p.y - gest.p0.y) > 6) gest.moved = true;
    if (!gest.moved || !o || ptrs.size > 1) return;
    if (gest.type === 'text') {
      let nx = clamp(gest.orig.x + dx, 0, 1), ny = clamp(gest.orig.y + dy, 0, 1);
      if (Math.abs(nx - 0.5) < 0.015) nx = 0.5;
      if (Math.abs(ny - 0.5) < 0.012) ny = 0.5;
      o.x = nx; o.y = ny;
    } else { o.px = gest.orig.px + dx; o.py = gest.orig.py + dy; }
    dirty = true;
  });
  const cvUp = (e) => {
    if (!ptrs.has(e.pointerId)) return;
    ptrs.delete(e.pointerId);
    if (ptrs.size || !gest) return;
    const g = gest; gest = null;
    if (g.moved) { commit(); return; }
    if (g.type === 'text' && g.wasSel) act('editText');
    else if (g.type === 'tap') {
      const a = clipAt(t);
      if (sel) select(null); else if (a) select('clip', a.clip.id);
    } else if (g.type === 'clip') select(null);
  };
  cv.addEventListener('pointerup', cvUp);
  cv.addEventListener('pointercancel', cvUp);

  // ---------- barra de herramientas ----------
  const TOOLS = {
    main: [['edit', 'edit', 'Editar clip'], ['add', 'media', 'Agregar'], ['overlay', 'layers', 'Superponer'], ['audio', 'music', 'Audio'], ['text', 'text', 'Texto'], ['sticker', 'smile', 'Stickers'], ['ratio', 'ratio', 'Formato'], ['bg', 'image', 'Fondo']],
    clip: [['split', 'scissors', 'Dividir'], ['speed', 'speed', 'Velocidad'], ['volume', 'volume', 'Volumen'], ['filter', 'filter', 'Filtros'], ['adjust', 'sliders', 'Ajustes'], ['transform', 'crop', 'Encuadre'], ['transition', 'transition', 'Transición'], ['toOverlay', 'layers', 'A capa'], ['dup', 'copy', 'Duplicar'], ['moveL', 'left', 'A la izq.'], ['moveR', 'right', 'A la der.'], ['del', 'trash', 'Eliminar']],
    image: [['split', 'scissors', 'Dividir'], ['duration', 'speed', 'Duración'], ['filter', 'filter', 'Filtros'], ['adjust', 'sliders', 'Ajustes'], ['transform', 'crop', 'Encuadre'], ['transition', 'transition', 'Transición'], ['toOverlay', 'layers', 'A capa'], ['dup', 'copy', 'Duplicar'], ['moveL', 'left', 'A la izq.'], ['moveR', 'right', 'A la der.'], ['del', 'trash', 'Eliminar']],
    overlay: [['split', 'scissors', 'Dividir'], ['transform', 'crop', 'Encuadre'], ['opacity', 'opacity', 'Opacidad'], ['speed', 'speed', 'Velocidad'], ['volume', 'volume', 'Volumen'], ['filter', 'filter', 'Filtros'], ['adjust', 'sliders', 'Ajustes'], ['layerUp', 'up', 'Subir capa'], ['layerDown', 'down', 'Bajar capa'], ['toMain', 'film', 'A principal'], ['dup', 'copy', 'Duplicar'], ['del', 'trash', 'Eliminar']],
    text: [['editText', 'edit', 'Editar'], ['split', 'scissors', 'Dividir'], ['dup', 'copy', 'Duplicar'], ['del', 'trash', 'Eliminar']],
    audio: [['volume', 'volume', 'Volumen'], ['split', 'scissors', 'Dividir'], ['dup', 'copy', 'Duplicar'], ['del', 'trash', 'Eliminar']],
  };
  function renderToolbar() {
    const it = selItem();
    let set = TOOLS.main, h = '';
    if (it) {
      set = sel.type === 'clip' ? (it.kind === 'image' ? TOOLS.image : TOOLS.clip) : TOOLS[sel.type];
      if (sel.type === 'overlay' && it.kind === 'image') set = set.filter(([a]) => a !== 'speed' && a !== 'volume');
      h += `<button class="tool back" data-act="back">${ic('check')}<span>Listo</span></button>`;
    }
    h += set.map(([a, i, l]) => `<button class="tool${a === 'del' ? ' danger' : ''}" data-act="${a}">${ic(i)}<span>${l}</span></button>`).join('');
    toolbar.innerHTML = h; toolbar.scrollLeft = 0;
    const info = $('#sel-info');
    if (it) {
      const tip = sel.type === 'clip' ? 'Arrastra los bordes blancos para recortar'
        : sel.type === 'overlay' ? 'Arrastra para mover (también entre pistas) · bordes para recortar'
          : 'Arrastra para mover · bordes para recortar o alargar';
      info.innerHTML = `<b>${esc(itemTitle(sel.type, it))}</b><span>${tip}</span>`;
      info.classList.remove('hidden');
    } else info.classList.add('hidden');
  }
  toolbar.addEventListener('click', (e) => { const b = e.target.closest('[data-act]'); if (b) act(b.dataset.act); });

  function select(kind, id) {
    if (!sel || sel.id !== id) closeSheet(true);
    sel = kind ? { type: kind, id } : null;
    renderTimeline(); renderToolbar(); dirty = true;
  }

  function act(name) {
    const it = selItem();
    switch (name) {
      case 'back': select(null); break;
      case 'add': importDest = 'main'; fileMedia.click(); break;
      case 'overlay': importDest = 'overlay'; fileMedia.click(); break;
      case 'opacity': if (it) sheetOpacity(it); break;
      case 'toOverlay': toOverlay(); break;
      case 'toMain': toMain(); break;
      case 'layerUp': case 'layerDown': moveLayer(name === 'layerUp' ? 1 : -1); break;
      case 'audio': fileAudio.click(); break;
      case 'text': addText(); break;
      case 'sticker': sheetStickers(); break;
      case 'ratio': sheetRatio(); break;
      case 'bg': sheetBg(); break;
      case 'edit': { const a = clipAt(t); if (a) select('clip', a.clip.id); else toast('Agrega un video o foto primero'); break; }
      case 'split': splitSel(); break;
      case 'speed': if (it) sheetSpeed(it); break;
      case 'duration': if (it) sheetDuration(it); break;
      case 'volume': if (it) sheetVolume(it); break;
      case 'filter': if (it) sheetFilter(it); break;
      case 'adjust': if (it) sheetAdjust(it); break;
      case 'transform': if (it) sheetTransform(it); break;
      case 'transition':
        if (!it) break;
        if (S.clips.indexOf(it) === 0) { toast('La transición va entre dos clips: selecciona el segundo'); break; }
        sheetTransition(it); break;
      case 'dup': dupSel(); break;
      case 'moveL': case 'moveR': moveSel(name === 'moveL' ? -1 : 1); break;
      case 'del': delSel(); break;
      case 'editText': if (it) sheetText(it); break;
    }
  }

  // ---------- operaciones ----------
  function splitSel() {
    const it = selItem();
    if (!it) return;
    if (sel.type === 'clip') {
      const o = layout().find((x) => x.clip.id === it.id);
      const local = t - o.start;
      if (local < 0.1 || o.len - local < 0.1) { toast('Mueve el cabezal dentro del clip para dividir'); return; }
      const cut = it.in + local * it.speed;
      const b = { ...clone(it), id: uid(), in: cut, trans: 'none' };
      it.out = cut;
      S.clips.splice(S.clips.indexOf(it) + 1, 0, b);
      sel = { type: 'clip', id: b.id };
    } else if (sel.type === 'overlay') {
      const local = t - it.start;
      if (local < 0.1 || ovLen(it) - local < 0.1) { toast('Mueve el cabezal dentro de la capa para dividir'); return; }
      const cut = it.in + local * it.speed;
      const b = { ...clone(it), id: uid(), in: cut, start: t, fadeIn: 0 };
      it.out = cut; it.fadeOut = 0; S.overlays.push(b); sel = { type: 'overlay', id: b.id };
    } else if (sel.type === 'text') {
      const local = t - it.start;
      if (local < 0.1 || it.dur - local < 0.1) { toast('Mueve el cabezal dentro del texto'); return; }
      const b = { ...clone(it), id: uid(), start: t, dur: it.dur - local };
      it.dur = local; S.texts.push(b); sel = { type: 'text', id: b.id };
    } else {
      const local = t - it.start, len = it.out - it.in;
      if (local < 0.1 || len - local < 0.1) { toast('Mueve el cabezal dentro del audio'); return; }
      const b = { ...clone(it), id: uid(), start: t, in: it.in + local };
      it.out = it.in + local; S.audios.push(b); sel = { type: 'audio', id: b.id };
    }
    commit(); vibrate(15); toast('Dividido en dos partes');
  }
  function dupSel() {
    const it = selItem(); if (!it) return;
    const b = { ...clone(it), id: uid() };
    if (sel.type === 'clip') S.clips.splice(S.clips.indexOf(it) + 1, 0, b);
    else if (sel.type === 'overlay') { b.start = it.start + ovLen(it); S.overlays.push(b); placeOverlay(b); }
    else if (sel.type === 'text') { b.start = it.start + it.dur; S.texts.push(b); }
    else { b.start = it.start + (it.out - it.in); S.audios.push(b); }
    sel = { type: sel.type, id: b.id }; commit(); toast('Duplicado');
  }
  function moveSel(dir) {
    const it = selItem(); if (!it || sel.type !== 'clip') return;
    const i = S.clips.indexOf(it), j = i + dir;
    if (j < 0 || j >= S.clips.length) { toast(dir < 0 ? 'Ya es el primer clip' : 'Ya es el último clip'); return; }
    [S.clips[i], S.clips[j]] = [S.clips[j], S.clips[i]];
    commit();
    const o = layout().find((x) => x.clip.id === it.id); setTime(o.start + 0.01);
  }
  function delSel() {
    const it = selItem(); if (!it) return;
    const arr = sel.type === 'clip' ? S.clips : sel.type === 'overlay' ? S.overlays : sel.type === 'text' ? S.texts : S.audios;
    arr.splice(arr.indexOf(it), 1);
    if (sel.type === 'overlay') normTracks();
    if (sel.type === 'clip' && S.clips[0]) S.clips[0].trans = 'none';
    const what = sel.type === 'clip' ? 'Clip eliminado' : sel.type === 'overlay' ? 'Capa eliminada' : sel.type === 'text' ? (it.sticker ? 'Sticker eliminado' : 'Texto eliminado') : 'Audio eliminado';
    sel = null; commit(); seekPreview(); vibrate(25);
    toast(what, 4000, { label: 'Deshacer', fn: () => histMove(-1) });
  }
  function toOverlay() {
    const it = selItem(); if (!it || sel.type !== 'clip') return;
    const o = layout().find((x) => x.clip.id === it.id);
    S.clips.splice(S.clips.indexOf(it), 1);
    if (S.clips[0]) S.clips[0].trans = 'none';
    const c = { ...clone(it), start: o.start, opacity: 1, fadeIn: 0, fadeOut: 0, zoom: 0.5, fit: 'fit', px: 0, py: 0 };
    delete c.trans;
    c.track = freeTrack(c.start, ovLen(c));
    S.overlays.push(c); normTracks();
    sel = { type: 'overlay', id: c.id };
    commit(); seekPreview(); toast('Movido a una capa encima del video principal');
  }
  function toMain() {
    const it = selItem(); if (!it || sel.type !== 'overlay') return;
    S.overlays.splice(S.overlays.indexOf(it), 1); normTracks();
    const c = { ...clone(it), trans: 'none', zoom: 1, px: 0, py: 0 };
    ['track', 'start', 'opacity', 'fadeIn', 'fadeOut'].forEach((k) => delete c[k]);
    let idx = 0;
    for (const o of layout()) if (o.start + o.len / 2 <= it.start) idx = o.idx + 1;
    S.clips.splice(idx, 0, c);
    if (S.clips[0]) S.clips[0].trans = 'none';
    sel = { type: 'clip', id: c.id };
    commit(); seekPreview(); toast('Movido a la pista principal');
  }
  function moveLayer(dir) {
    const it = selItem(); if (!it || sel.type !== 'overlay') return;
    const target = it.track + dir;
    if (target < 0) { toast('Ya es la capa más baja'); return; }
    if (trackFree(target, it.start, ovLen(it), it)) it.track = target;
    else {
      // intercambiar con las capas que ocupan ese lugar en la otra pista
      const blocking = S.overlays.filter((o) => o !== it && o.track === target && o.start < it.start + ovLen(it) && it.start < o.start + ovLen(o));
      const from = it.track;
      blocking.forEach((o) => { o.track = from; });
      it.track = target;
      blocking.forEach((o) => { if (!trackFree(o.track, o.start, ovLen(o), o)) o.track = freeTrack(o.start, ovLen(o), 0, o); });
    }
    normTracks(); commit(); toast(dir > 0 ? 'Capa subida' : 'Capa bajada');
  }
  function addText(sticker) {
    const total = totalDur();
    const start = total > 0 && t >= total - 0.2 ? Math.max(0, total - 3) : t;
    const x = {
      id: uid(), text: sticker || 'Escribe tu texto', start, dur: 3, x: 0.5, y: sticker ? 0.35 : 0.5, size: sticker ? 150 : 64,
      color: '#ffffff', bg: '#000000', style: sticker ? 'plain' : 'outline', font: 'sans', anim: 'pop', sticker: !!sticker,
    };
    S.texts.push(x); sel = { type: 'text', id: x.id };
    if (t < start || t > start + x.dur) t = start + 0.5;
    commit(); setTime(t);
    if (!sticker) sheetText(x, true);
  }

  // ---------- hojas (paneles inferiores) ----------
  let sheetClose = null;
  function openSheet(title, html, mount, onClose) {
    closeSheet(true);
    $('.sheet-title', sheet).textContent = title;
    sheetBody.innerHTML = html; sheetBody.scrollTop = 0;
    sheet.classList.add('open'); sheet.setAttribute('aria-hidden', 'false');
    sheetClose = onClose || (() => commit());
    if (mount) mount();
  }
  function closeSheet(silent) {
    if (!sheet.classList.contains('open')) return false;
    sheet.classList.remove('open'); sheet.setAttribute('aria-hidden', 'true');
    const f = sheetClose; sheetClose = null;
    const ae = document.activeElement; if (ae && sheet.contains(ae)) ae.blur();
    if (f) f(silent);
    return true;
  }
  $('.sheet-ok', sheet).addEventListener('click', () => closeSheet());

  const ui = {
    slider: (id, label, min, max, stp, val, f) =>
      `<label class="row"><span>${label}</span><input type="range" id="${id}" min="${min}" max="${max}" step="${stp}" value="${val}"><output id="${id}-o">${f ? f(val) : val}</output></label>`,
    chips: (name, opts, cur) => `<div class="chips" data-name="${name}">${opts.map((o) => `<button class="chip${String(o.id) === String(cur) ? ' on' : ''}" data-v="${o.id}">${o.name}</button>`).join('')}</div>`,
    swatches: (name, cur) => `<div class="swatches" data-name="${name}">${COLORS.map((c) => `<button class="sw${c === cur ? ' on' : ''}" data-v="${c}" style="background:${c}" aria-label="${c}"></button>`).join('')}</div>`,
  };
  function bindSlider(id, fn, f) {
    const el = $('#' + id, sheetBody);
    el.addEventListener('input', () => { const v = +el.value; $('#' + id + '-o', sheetBody).textContent = f ? f(v) : v; fn(v); dirty = true; });
  }
  function setSlider(id, v, f) { const el = $('#' + id, sheetBody); if (el) { el.value = v; $('#' + id + '-o', sheetBody).textContent = f ? f(v) : v; } }
  function bindChips(name, fn, cls = '.chip, .sw') {
    const box = $(`[data-name="${name}"]`, sheetBody);
    box.addEventListener('click', (e) => {
      const b = e.target.closest(cls); if (!b) return;
      $$(cls, box).forEach((x) => x.classList.toggle('on', x === b));
      fn(b.dataset.v); dirty = true;
    });
  }

  function sheetSpeed(c) {
    const f = (v) => v.toFixed(2) + 'x';
    openSheet('Velocidad',
      ui.chips('sp', [0.25, 0.5, 1, 1.5, 2, 3, 4].map((v) => ({ id: v, name: v + 'x' })), c.speed) +
      ui.slider('sp-s', 'Personalizada', 0.1, 5, 0.05, c.speed, f) + `<p class="hint" id="sp-h"></p>`,
      () => {
        const hint = () => { $('#sp-h').textContent = `Duración del clip: ${fmt(clipLen(c))}`; };
        const upd = (v) => { c.speed = clamp(+v, 0.1, 5); setSlider('sp-s', c.speed, f); hint(); scheduleTimeline(); updateLabels(); seekPreview(); };
        bindChips('sp', upd); bindSlider('sp-s', upd, f); hint();
      });
  }
  function sheetDuration(c) {
    const f = (v) => v.toFixed(1) + 's';
    openSheet('Duración de la foto', ui.slider('du', 'Duración', 0.5, 15, 0.1, c.out - c.in, f), () => {
      bindSlider('du', (v) => { c.out = c.in + v; scheduleTimeline(); updateLabels(); }, f);
    });
  }
  function sheetVolume(it) {
    const f = (v) => v + '%';
    let html = ui.slider('vo', 'Volumen', 0, 200, 1, Math.round(it.volume * 100), f);
    if (sel.type === 'audio') {
      const g = (v) => v.toFixed(1) + 's';
      html += ui.slider('fi', 'Entrada', 0, 5, 0.1, it.fadeIn || 0, g) + ui.slider('fo', 'Salida', 0, 5, 0.1, it.fadeOut || 0, g);
    } else html += `<div class="btn-row"><button class="btn" id="mute">${ic('volume')} Silenciar clip</button></div>`;
    openSheet('Volumen', html, () => {
      bindSlider('vo', (v) => { it.volume = v / 100; }, f);
      if (sel.type === 'audio') {
        const g = (v) => v.toFixed(1) + 's';
        bindSlider('fi', (v) => { it.fadeIn = v; }, g); bindSlider('fo', (v) => { it.fadeOut = v; }, g);
      } else $('#mute').onclick = () => { it.volume = 0; setSlider('vo', 0, f); };
    });
  }
  function sheetFilter(c) {
    const grid = FILTERS.map((x) => `<button class="fbtn${c.filter === x.id ? ' on' : ''}" data-v="${x.id}"><canvas width="96" height="96"></canvas>${x.name}</button>`).join('');
    openSheet('Filtros', `<div class="fgrid" data-name="fl">${grid}</div><div class="btn-row"><button class="btn" id="fl-all">Aplicar a todos</button></div>`, () => {
      const m = media.get(c.mediaId);
      if (m && m.el) {
        const [sw, sh] = srcSize(m);
        $$('.fbtn', sheetBody).forEach((b) => {
          const g = b.querySelector('canvas').getContext('2d');
          const f = FILTERS.find((x) => x.id === b.dataset.v);
          if (!sw) return;
          const s = Math.max(96 / sw, 96 / sh);
          g.filter = (f && f.css) || 'none';
          try { g.drawImage(m.el, (96 - sw * s) / 2, (96 - sh * s) / 2, sw * s, sh * s); } catch (e) { /* */ }
        });
      }
      bindChips('fl', (v) => { c.filter = v; }, '.fbtn');
      $('#fl-all').onclick = () => { S.clips.forEach((x) => { x.filter = c.filter; }); toast('Filtro aplicado a todos los clips'); dirty = true; };
    });
  }
  function sheetAdjust(c) {
    c.adj = Object.assign({ b: 0, c: 0, s: 0, h: 0, w: 0, v: 0 }, c.adj);
    const rows = [['b', 'Brillo', -100, 100], ['c', 'Contraste', -100, 100], ['s', 'Saturación', -100, 100], ['w', 'Temperatura', -100, 100], ['h', 'Tono', -180, 180], ['v', 'Viñeta', 0, 100]];
    openSheet('Ajustes', rows.map(([k, l, a, b]) => ui.slider('ad-' + k, l, a, b, 1, c.adj[k])).join('') +
      `<div class="btn-row"><button class="btn" id="ad-reset">${ic('reset')} Restablecer</button></div>`, () => {
      rows.forEach(([k]) => bindSlider('ad-' + k, (v) => { c.adj[k] = v; }));
      $('#ad-reset').onclick = () => { rows.forEach(([k]) => { c.adj[k] = 0; setSlider('ad-' + k, 0); }); dirty = true; };
    });
  }
  function sheetTransform(c) {
    const f = (v) => Math.round(v * 100) + '%';
    openSheet('Encuadre',
      ui.chips('fit', [{ id: 'fit', name: 'Ajustar' }, { id: 'fill', name: 'Llenar' }], c.fit) +
      ui.slider('zo', 'Zoom', 0.2, 5, 0.01, c.zoom || 1, f) +
      `<div class="btn-row"><button class="btn" id="tf-rot">${ic('rotate')} Rotar</button><button class="btn" id="tf-flip">${ic('flip')} Espejo</button><button class="btn" id="tf-reset">${ic('reset')}</button></div>` +
      `<p class="hint">Arrastra el video en la vista previa para moverlo; pellizca para hacer zoom.</p>`, () => {
      bindChips('fit', (v) => { c.fit = v; });
      bindSlider('zo', (v) => { c.zoom = v; }, f);
      $('#tf-rot').onclick = () => { c.rot = ((c.rot || 0) + 90) % 360; dirty = true; };
      $('#tf-flip').onclick = () => { c.flip = !c.flip; dirty = true; };
      $('#tf-reset').onclick = () => { Object.assign(c, { zoom: 1, rot: 0, flip: false, px: 0, py: 0 }); setSlider('zo', 1, f); dirty = true; };
    });
  }
  function sheetOpacity(c) {
    const f = (v) => v + '%', g = (v) => v.toFixed(1) + 's';
    openSheet('Opacidad y fundidos',
      ui.slider('op', 'Opacidad', 0, 100, 1, Math.round((c.opacity == null ? 1 : c.opacity) * 100), f) +
      ui.slider('ofi', 'Aparecer', 0, 3, 0.1, c.fadeIn || 0, g) + ui.slider('ofo', 'Desaparecer', 0, 3, 0.1, c.fadeOut || 0, g) +
      `<p class="hint">La capa se dibuja encima del video principal. Arrástrala en la vista previa para moverla y pellizca para cambiar su tamaño.</p>`, () => {
      bindSlider('op', (v) => { c.opacity = v / 100; }, f);
      bindSlider('ofi', (v) => { c.fadeIn = v; }, g);
      bindSlider('ofo', (v) => { c.fadeOut = v; }, g);
    });
  }
  function sheetTransition(c) {
    openSheet('Transición', ui.chips('tr', TRANSITIONS, c.trans) +
      `<div class="btn-row"><button class="btn" id="tr-all">Aplicar a todos</button></div><p class="hint">Se aplica entre el clip anterior y este (${TR_DUR}s).</p>`, () => {
      bindChips('tr', (v) => {
        c.trans = v; scheduleTimeline();
        const o = layout().find((x) => x.clip.id === c.id);
        if (o) { setTime(Math.max(0, o.start - 0.6)); play(); setTimeout(() => { if (playing && !exporting) pause(); }, 1300); }
      });
      $('#tr-all').onclick = () => { S.clips.forEach((x, i) => { x.trans = i ? c.trans : 'none'; }); scheduleTimeline(); toast('Transición aplicada a todos'); };
    });
  }
  function sheetText(x, isNew) {
    const f = (v) => Math.round(v);
    openSheet(x.sticker ? 'Sticker' : 'Texto',
      `<textarea id="tx" rows="2" maxlength="300" placeholder="Escribe aquí">${esc(x.text)}</textarea>` +
      `<div class="label">Fuente</div>` + ui.chips('tf', Object.entries(FONTS).map(([id, v]) => ({ id, name: v.name })), x.font) +
      `<div class="label">Color</div>` + ui.swatches('tc', x.color) +
      `<div class="label">Estilo</div>` + ui.chips('ts', TEXT_STYLES, x.style) +
      `<div class="label">Color de contorno / caja</div>` + ui.swatches('tb', x.bg) +
      ui.slider('tz', 'Tamaño', 12, 300, 1, x.size, f) +
      `<div class="label">Animación</div>` + ui.chips('ta', TEXT_ANIMS, x.anim),
      () => {
        const ta = $('#tx');
        ta.addEventListener('input', () => { x.text = ta.value; dirty = true; scheduleTimeline(); });
        if (isNew) { setTimeout(() => { ta.focus(); ta.select(); }, 250); }
        bindChips('tf', (v) => { x.font = v; });
        bindChips('tc', (v) => { x.color = v; });
        bindChips('ts', (v) => { x.style = v; });
        bindChips('tb', (v) => { x.bg = v; });
        bindSlider('tz', (v) => { x.size = v; }, f);
        bindChips('ta', (v) => { x.anim = v; setTime(x.start); play(); setTimeout(() => { if (playing && !exporting) pause(); }, 1200); });
      },
      () => { if (!x.text.trim()) { S.texts.splice(S.texts.indexOf(x), 1); sel = null; } commit(); });
  }
  function sheetStickers() {
    openSheet('Stickers', `<div class="egrid">${STICKERS.map((s) => `<button data-v="${s}">${s}</button>`).join('')}</div>`, () => {
      $('.egrid', sheetBody).onclick = (e) => { const b = e.target.closest('button'); if (!b) return; closeSheet(true); addText(b.dataset.v); };
    }, () => {});
  }
  function sheetRatio() {
    const opts = Object.entries(RATIOS).map(([k, [w, h]]) => {
      const s = 16 / Math.max(w, h);
      return { id: k, name: `<i class="shape" style="width:${Math.round(w * s)}px;height:${Math.round(h * s)}px"></i>${k}` };
    });
    openSheet('Formato', ui.chips('ra', opts, S.ratio) + `<p class="hint">9:16 para TikTok, Reels y Shorts · 16:9 para YouTube · 1:1 y 4:5 para publicaciones.</p>`, () => {
      bindChips('ra', (v) => { S.ratio = v; applyCanvasSize(); });
    });
  }
  function sheetBg() {
    openSheet('Fondo', ui.chips('bt', [{ id: 'blur', name: 'Desenfocado' }, { id: 'color', name: 'Color' }], S.bg.type) +
      `<div class="label">Color</div>` + ui.swatches('bc', S.bg.color) + `<p class="hint">Se ve en los bordes cuando el clip no llena el formato.</p>`, () => {
      bindChips('bt', (v) => { S.bg.type = v; });
      bindChips('bc', (v) => { S.bg.color = v; S.bg.type = 'color'; $$('[data-name="bt"] .chip', sheetBody).forEach((b) => b.classList.toggle('on', b.dataset.v === 'color')); });
    });
  }

  // ---------- exportación ----------
  function pickMime() {
    if (!window.MediaRecorder) return null;
    const list = ['video/mp4;codecs="avc1.42E01F,mp4a.40.2"', 'video/mp4;codecs=avc1,mp4a', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];
    return list.find((m) => { try { return MediaRecorder.isTypeSupported(m); } catch (e) { return false; } }) || null;
  }
  function sheetExport() {
    const mime = pickMime();
    let res = 1080, fps = 30;
    openSheet('Exportar',
      `<div class="label">Resolución</div>` + ui.chips('er', [{ id: 720, name: '720p' }, { id: 1080, name: '1080p' }], res) +
      `<div class="label">Cuadros por segundo</div>` + ui.chips('ef', [{ id: 24, name: '24' }, { id: 30, name: '30' }, { id: 60, name: '60' }], fps) +
      `<p class="hint">Duración: ${fmt(totalDur())} · Formato: ${mime ? (mime.includes('mp4') ? 'MP4' : 'WebM') : 'no disponible'}. La exportación tarda lo mismo que dura el video.</p>` +
      `<div class="btn-row"><button class="btn accent" id="ex-go">${ic('download')} Exportar video</button></div>`, () => {
      bindChips('er', (v) => { res = +v; });
      bindChips('ef', (v) => { fps = +v; });
      $('#ex-go').onclick = () => { closeSheet(true); startExport(res, fps); };
    }, () => {});
  }
  let wakeLock = null;
  async function startExport(res, fps) {
    const mime = pickMime();
    if (!mime || !cv.captureStream) { toast('Tu navegador no permite exportar video'); return; }
    if (totalDur() <= 0) return;
    pause(); sel = null; renderToolbar(); renderTimeline();
    exportScale = res / 720; applyCanvasSize();
    ensureAudioCtx();
    try { await actx.resume(); } catch (e) { /* */ }
    const vstream = cv.captureStream(fps);
    const tracks = [...vstream.getVideoTracks()];
    if (recDest) tracks.push(...recDest.stream.getAudioTracks());
    const stream = new MediaStream(tracks);
    let rec;
    try {
      rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: Math.round(cv.width * cv.height * fps * 0.2), audioBitsPerSecond: 160000 });
    } catch (e) {
      try { rec = new MediaRecorder(stream); } catch (e2) { toast('No se pudo iniciar la exportación'); exportScale = 1; applyCanvasSize(); return; }
    }
    const chunks = [];
    rec.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
    exporting = { rec, chunks, mime: rec.mimeType || mime, vstream };
    $('#ex-bar').style.width = '0%'; $('#ex-pct').textContent = '0%';
    $('#exportov').classList.remove('hidden');
    try { if (navigator.wakeLock) wakeLock = await navigator.wakeLock.request('screen'); } catch (e) { /* */ }
    if (bridge && bridge.keepScreenOn) bridge.keepScreenOn(true);
    setTime(0);
    // esperar a que el primer cuadro esté listo
    const a = clipAt(0);
    if (a && a.clip.kind === 'video') {
      const el = media.get(a.clip.mediaId).el;
      const t0 = performance.now();
      while ((el.seeking || el.readyState < 2) && performance.now() - t0 < 3000) await new Promise((r) => setTimeout(r, 50));
    }
    draw();
    rec.start(1000);
    play();
  }
  function finishExport(cancel) {
    const ex = exporting; if (!ex) return;
    playing = false; pauseAll(); updatePlayBtn();
    ex.rec.onstop = () => {
      ex.vstream.getTracks().forEach((tr) => tr.stop());
      exporting = null; exportScale = 1; applyCanvasSize();
      $('#exportov').classList.add('hidden');
      try { if (wakeLock) wakeLock.release(); } catch (e) { /* */ }
      wakeLock = null;
      if (bridge && bridge.keepScreenOn) bridge.keepScreenOn(false);
      if (!cancel) {
        const type = ex.mime.split(';')[0];
        showResult(new Blob(ex.chunks, { type }), type.includes('mp4') ? 'mp4' : 'webm');
      } else toast('Exportación cancelada');
      seekPreview();
    };
    try { if (ex.rec.state !== 'inactive') ex.rec.stop(); else ex.rec.onstop(); } catch (e) { ex.rec.onstop(); }
  }
  $('#ex-cancel').addEventListener('click', () => finishExport(true));

  function stamp() {
    const d = new Date(), p = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
  }
  function blobToB64(b) {
    return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1] || ''); r.onerror = () => rej(r.error); r.readAsDataURL(b); });
  }
  async function saveToDevice(blob, name) {
    if (bridge && bridge.beginSave) {
      busy('Guardando en la galería…');
      try {
        const tok = bridge.beginSave(name, blob.type);
        if (!tok) throw new Error('beginSave');
        const CH = 3 * 256 * 1024;
        for (let off = 0; off < blob.size; off += CH) {
          if (!bridge.appendChunk(tok, await blobToB64(blob.slice(off, off + CH)))) throw new Error('append');
          $('#busy-msg').textContent = `Guardando… ${Math.round((Math.min(blob.size, off + CH) / blob.size) * 100)}%`;
        }
        const uri = bridge.finishSave(tok);
        busy(null);
        if (!uri) throw new Error('finish');
        toast('Guardado en Galería › Movies/EditaYa');
        return true;
      } catch (e) { busy(null); toast('No se pudo guardar el video'); return false; }
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 60000);
    toast('Descargando video…');
    return true;
  }
  function showResult(blob, ext) {
    const name = `EditaYa_${stamp()}.${ext}`;
    const url = URL.createObjectURL(blob);
    const mb = (blob.size / 1048576).toFixed(1);
    let saved = false;
    openSheet('¡Video listo!',
      `<video class="result-video" src="${url}" controls playsinline></video>` +
      `<p class="hint">${name} · ${mb} MB</p>` +
      `<div class="btn-row"><button class="btn accent" id="rs-save">${ic('download')} Guardar</button><button class="btn" id="rs-share">${ic('share')} Compartir</button></div>`,
      () => {
        $('#rs-save').onclick = async () => { saved = (await saveToDevice(blob, name)) || saved; };
        $('#rs-share').onclick = async () => {
          const file = new File([blob], name, { type: blob.type });
          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            try { await navigator.share({ files: [file], title: 'Mi video' }); } catch (e) { /* cancelado */ }
          } else if (bridge && bridge.shareLast) {
            if (!saved) saved = await saveToDevice(blob, name);
            if (saved) bridge.shareLast();
          } else { toast('Compartir no está disponible: usa Guardar'); }
        };
      },
      () => { const v = $('.result-video', sheetBody); if (v) v.pause(); setTimeout(() => URL.revokeObjectURL(url), 1000); });
  }

  // ---------- proyecto ----------
  async function resetProject() {
    pause(); closeSheet(true);
    for (const m of media.values()) {
      URL.revokeObjectURL(m.url); m.thumbs.forEach((th) => th.url.startsWith('blob:') && URL.revokeObjectURL(th.url));
      if (m.el && m.el.remove) { try { m.el.pause && m.el.pause(); } catch (e) { /* */ } m.el.remove(); }
    }
    media.clear();
    for (const id of [...ovEls.keys()]) dropOv(id);
    try { await DB.clear(); } catch (e) { /* */ }
    S = newProject(); sel = null; t = 0; draw.hasFrame = false;
    hist = [JSON.stringify(S)]; hi = 0; save(); refresh();
  }
  async function restore() {
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem(LS_KEY) || 'null'); } catch (e) { /* */ }
    if (saved && saved.v === 1) {
      busy('Abriendo tu proyecto…');
      const ids = new Set([...(saved.clips || []), ...(saved.overlays || []), ...(saved.audios || [])].map((x) => x.mediaId));
      for (const id of ids) {
        try { const rec = await DB.get(id); if (rec) await loadMedia(id, rec.blob, rec.kind, rec.name); } catch (e) { console.warn(e); }
      }
      saved.clips = (saved.clips || []).filter((c) => media.has(c.mediaId));
      saved.audios = (saved.audios || []).filter((a) => media.has(a.mediaId));
      saved.overlays = (saved.overlays || []).filter((c) => media.has(c.mediaId));
      S = Object.assign(newProject(), saved);
      busy(null);
      try { const keys = await DB.keys(); for (const k of keys) if (!ids.has(k)) DB.del(k); } catch (e) { /* */ }
    }
    hist = [JSON.stringify(S)]; hi = 0;
    refresh(); seekPreview();
  }

  // ---------- eventos globales ----------
  $('#btn-new').innerHTML = ic('newp');
  $('#btn-undo').innerHTML = ic('undo');
  $('#btn-redo').innerHTML = ic('redo');
  $('.sheet-ok', sheet).innerHTML = ic('check');
  $('.empty-icon').innerHTML = ic('film');
  updatePlayBtn();

  $('#btn-play').addEventListener('click', () => (playing ? pause() : play()));
  $('#btn-prev').innerHTML = ic('stepB'); $('#btn-next').innerHTML = ic('stepF');
  $('#btn-prev').addEventListener('click', () => { pause(); setTime(Math.round(t * 30 - 1) / 30); });
  $('#btn-next').addEventListener('click', () => { pause(); setTime(Math.round(t * 30 + 1) / 30); });
  $('#btn-undo').addEventListener('click', () => histMove(-1));
  $('#btn-redo').addEventListener('click', () => histMove(1));
  $('#btn-export').addEventListener('click', () => { pause(); sheetExport(); });
  $('#btn-start').addEventListener('click', () => { importDest = 'main'; fileMedia.click(); });
  $('#btn-new').addEventListener('click', () => {
    const empty = !S.clips.length && !S.overlays.length && !S.texts.length && !S.audios.length;
    if (empty) { resetProject(); return; }
    confirmDlg('¿Empezar un proyecto nuevo?', 'Se borrará el proyecto actual y no se podrá recuperar.', 'Borrar y empezar', true)
      .then((ok) => { if (ok) resetProject(); });
  });
  fileMedia.addEventListener('change', () => { const f = [...fileMedia.files]; fileMedia.value = ''; importFiles(f, importDest); importDest = 'main'; });
  fileAudio.addEventListener('change', () => { const f = [...fileAudio.files]; fileAudio.value = ''; importFiles(f, 'audio'); });

  document.addEventListener('keydown', (e) => {
    if (e.target.matches('textarea,input') || $('#menu')) { if (e.key === 'Escape') closeMenu(); return; }
    if (e.code === 'Space') { e.preventDefault(); playing ? pause() : play(); }
    else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); histMove(e.shiftKey ? 1 : -1); }
    else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') { e.preventDefault(); histMove(1); }
    else if (e.key === 'Delete' || e.key === 'Backspace') { if (sel) delSel(); }
    else if (e.key === 'Escape') { if ($('#menu')) closeMenu(); else if (!closeSheet()) select(null); }
    else if (e.key === 'ArrowLeft') setTime(t - 1 / 30);
    else if (e.key === 'ArrowRight') setTime(t + 1 / 30);
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden && playing && !exporting) pause(); });
  let rzT = 0;
  window.addEventListener('resize', () => { clearTimeout(rzT); rzT = setTimeout(() => { fitStage(); renderTimeline(); }, 60); });
  // Botón "atrás" de Android (lo llama la app nativa)
  window.__onAndroidBack = () => {
    if (exporting) return true;
    if ($('#menu')) { closeMenu(); return true; }
    if (closeSheet()) return true;
    if (sel) { select(null); return true; }
    return false;
  };

  if ('serviceWorker' in navigator && !bridge && /^https:|^http:\/\/localhost/.test(location.href)) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }

  // API mínima para pruebas / depuración
  window.EditaYa = { get state() { return S; }, get time() { return t; }, setTime, play, pause, importFiles, act, select, startExport };

  requestAnimationFrame(loop);
  restore();
})();
