/* Portfolio Nguyễn Quang Khải — "Sáu dây"
   Dây đàn gảy được (Karplus–Strong bằng Web Audio), hợp âm, vòng kết,
   khung xem ảnh, tab tác vụ, lọc nguồn, video YouTube tải khi bấm. */
(() => {
  'use strict';

  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const OPEN = [82.41, 110.0, 146.83, 196.0, 246.94, 329.63]; // dây 6 → dây 1
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  /* ---------------- Âm thanh ---------------- */
  let ctx = null, master = null, unlocked = false;
  const buffers = new Map();
  let soundOn = true;
  try { soundOn = localStorage.getItem('qk-sound') !== 'off'; } catch (e) { /* bộ nhớ trình duyệt bị chặn */ }

  // Trình duyệt chỉ cho phát tiếng sau khi người xem chạm hoặc bấm phím lần đầu.
  const unlock = () => { unlocked = true; };
  addEventListener('pointerdown', unlock, { capture: true, once: true });
  addEventListener('keydown', unlock, { capture: true, once: true });

  function audio() {
    if (!soundOn || !unlocked) return null;
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.5;
      const tone = ctx.createBiquadFilter();
      tone.type = 'lowpass';
      tone.frequency.value = 5200;
      const comp = ctx.createDynamicsCompressor();
      master.connect(tone); tone.connect(comp); comp.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  // Tổng hợp tiếng dây gảy: vòng trễ chứa nhiễu, mỗi vòng được lọc trung bình và tắt dần.
  function stringBuffer(freq) {
    const key = Math.round(freq * 10);
    if (buffers.has(key)) return buffers.get(key);
    const sr = ctx.sampleRate;
    const n = Math.max(2, Math.round(sr / freq));
    const seconds = freq < 120 ? 3.2 : freq < 260 ? 2.6 : 2.0;
    const len = Math.floor(sr * seconds);
    const buf = ctx.createBuffer(1, len, sr);
    const out = buf.getChannelData(0);
    const ring = new Float32Array(n);
    let prev = 0;
    for (let i = 0; i < n; i++) { prev = prev * 0.45 + (Math.random() * 2 - 1) * 0.55; ring[i] = prev; }
    const decay = freq > 260 ? 0.9958 : 0.9968;
    let j = 0;
    for (let i = 0; i < len; i++) {
      const k = j + 1 === n ? 0 : j + 1;
      const v = ring[j];
      out[i] = v;
      ring[j] = (v + ring[k]) * 0.5 * decay;
      j = k;
    }
    const fade = Math.floor(sr * 0.25);
    for (let i = 0; i < fade; i++) out[len - 1 - i] *= i / fade;
    buffers.set(key, buf);
    return buf;
  }

  function pluckSound(freq, delay = 0, vel = 1) {
    const c = audio();
    if (!c) return;
    const src = c.createBufferSource();
    src.buffer = stringBuffer(freq);
    const g = c.createGain();
    g.gain.value = 0.55 * vel;
    src.connect(g); g.connect(master);
    src.start(c.currentTime + delay);
  }

  const fretHz = (stringIndex, fret) => OPEN[stringIndex] * Math.pow(2, fret / 12);
  const midiHz = (m) => 440 * Math.pow(2, (m - 69) / 12);

  // frets: 6 số từ dây 6 → dây 1, -1 là dây không gảy
  function playChord(frets, delay = 0, gap = 0.045) {
    let n = 0;
    frets.forEach((f, i) => { if (f >= 0) pluckSound(fretHz(i, f), delay + (n++) * gap, 0.8); });
  }

  // Ba câu dạo ngắn cho ba dòng nhạc (giai điệu tự đặt, chỉ để minh họa màu sắc)
  const MOTIFS = {
    pentatonic: { notes: [[67, 0], [69, 0.28], [72, 0.56], [69, 0.98], [67, 1.26], [64, 1.54], [62, 1.82], [60, 2.24]], ms: 2900 },
    march: { notes: [[60, 0], [60, 0.3], [64, 0.45], [67, 0.75], [67, 1.05], [72, 1.2], [67, 1.65], [72, 1.95]], ms: 2700 },
    pop: { chords: [[[-1, 0, 2, 2, 1, 0], 0], [[1, 3, 3, 2, 1, 1], 0.62], [[-1, 3, 2, 0, 1, 0], 1.24], [[3, 2, 0, 0, 0, 3], 1.86]], ms: 3000 },
  };
  function playMotif(name) {
    const m = MOTIFS[name];
    if (!m) return 0;
    (m.notes || []).forEach(([note, t]) => pluckSound(midiHz(note), t, 0.9));
    (m.chords || []).forEach(([frets, t]) => playChord(frets, t, 0.03));
    return m.ms;
  }

  /* ---------------- Dây đàn ---------------- */
  class GuitarString {
    constructor(el) {
      this.el = el;
      this.n = Number(el.dataset.string) || 1;           // 6 = dây trầm nhất
      this.hz = Number(el.dataset.hz) || OPEN[6 - this.n];
      const ns = 'http://www.w3.org/2000/svg';
      this.svg = document.createElementNS(ns, 'svg');
      this.svg.setAttribute('preserveAspectRatio', 'none');
      this.path = document.createElementNS(ns, 'path');
      this.path.setAttribute('fill', 'none');
      this.path.setAttribute('stroke', 'currentColor');
      this.path.setAttribute('stroke-width', (0.9 + (this.n - 1) * 0.55).toFixed(2));
      this.svg.appendChild(this.path);
      el.appendChild(this.svg);
      this.px = 0.5; this.amp = 0; this.t0 = 0; this.raf = 0; this.last = 0;
      this.measure();
    }
    measure() {
      const r = this.el.getBoundingClientRect();
      this.w = Math.max(1, r.width); this.h = Math.max(1, r.height);
      this.svg.setAttribute('viewBox', `0 0 ${this.w} ${this.h}`);
      this.draw(0);
    }
    draw(offset) {
      const y = this.h / 2;
      this.path.setAttribute('d', `M0 ${y} Q ${this.px * this.w} ${y + offset * 2} ${this.w} ${y}`);
    }
    pluck(px = 0.5, withSound = true, vel = 1) {
      const now = performance.now();
      if (now - this.last < 90) return;
      this.last = now;
      if (withSound) pluckSound(this.hz, 0, vel);
      if (reduceMotion) return;
      this.px = Math.min(0.9, Math.max(0.1, px));
      this.amp = (8 + this.n * 1.7) * vel;
      this.t0 = now;
      if (!this.raf) this.tick();
    }
    tick() {
      const t = (performance.now() - this.t0) / 1000;
      const a = this.amp * Math.exp(-t * 3.1);
      if (a < 0.3) { this.draw(0); this.raf = 0; return; }
      const wobble = 8 + (7 - this.n) * 1.3;
      this.draw(a * Math.cos(t * wobble * Math.PI * 2));
      this.raf = requestAnimationFrame(() => this.tick());
    }
  }

  const strings = new Map();
  $$('.string').forEach((el) => strings.set(el, new GuitarString(el)));
  const ratioX = (el, e) => { const r = el.getBoundingClientRect(); return (e.clientX - r.left) / Math.max(1, r.width); };

  strings.forEach((s, el) => el.addEventListener('qk-shake', (e) => s.pluck(0.2 + Math.random() * 0.6, false, e.detail || 0.6)));
  strings.forEach((s, el) => {
    if (el.classList.contains('string-row')) return; // dây trong hàng bài tập do cả hàng điều khiển
    el.addEventListener('pointerenter', (e) => s.pluck(ratioX(el, e)));
    el.addEventListener('pointerdown', (e) => s.pluck(ratioX(el, e)));
  });

  // Vuốt ngón tay qua nhiều dây trên màn hình cảm ứng
  $$('[data-strings]').forEach((box) => {
    box.addEventListener('touchmove', (e) => {
      for (const t of e.touches) {
        const hit = document.elementFromPoint(t.clientX, t.clientY);
        const el = hit && hit.closest('.string');
        if (el && strings.has(el)) strings.get(el).pluck(ratioX(el, t));
      }
    }, { passive: true });
  });

  // Hàng bài tập: rê chuột hoặc focus vào hàng thì dây của hàng đó rung
  $$('.row').forEach((row) => {
    const el = row.querySelector('.string');
    if (!el) return;
    const s = strings.get(el);
    row.addEventListener('pointerenter', (e) => s.pluck(ratioX(el, e)));
    row.addEventListener('focus', () => s.pluck(0.3));
  });

  let resizeTimer = 0;
  addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(() => strings.forEach((s) => s.measure()), 120); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => strings.forEach((s) => s.measure()));
  addEventListener('load', () => strings.forEach((s) => s.measure()));

  // Gảy cả sáu dây ở trang đầu
  const heroStrings = $$('.hero-strings .string').map((el) => strings.get(el));
  function strum(withSound = true) {
    heroStrings.forEach((s, i) => setTimeout(() => s.pluck(0.3 + i * 0.05, withSound, 0.9), i * 75));
  }
  $$('[data-strum]').forEach((b) => b.addEventListener('click', () => strum(true)));
  if (heroStrings.length) setTimeout(() => strum(false), 650); // một lần rung chào khi mở trang, không có tiếng

  /* ---------------- Nút tiếng đàn ---------------- */
  $$('[data-sound-toggle]').forEach((btn) => {
    const label = btn.querySelector('[data-sound-label]');
    const paint = () => {
      btn.setAttribute('aria-pressed', String(soundOn));
      if (label) label.textContent = soundOn ? 'Tiếng đàn bật' : 'Tiếng đàn tắt';
    };
    paint();
    btn.addEventListener('click', () => {
      soundOn = !soundOn;
      try { localStorage.setItem('qk-sound', soundOn ? 'on' : 'off'); } catch (e) { /* không lưu được thì thôi */ }
      paint();
      if (soundOn) pluckSound(OPEN[2], 0, 0.8);
    });
  });

  /* ---------------- Hợp âm, vòng kết, dòng nhạc ---------------- */
  const flash = (el, ms = 700) => { el.classList.add('is-playing'); setTimeout(() => el.classList.remove('is-playing'), ms); };
  const parseFrets = (el) => el.dataset.chord.split(',').map(Number);

  $$('[data-chord]').forEach((btn) => btn.addEventListener('click', () => { playChord(parseFrets(btn)); flash(btn); }));

  $$('[data-cadence-play]').forEach((btn) => btn.addEventListener('click', () => {
    $$('[data-cadence] [data-chord]').forEach((c, i) => {
      playChord(parseFrets(c), i * 0.95);
      setTimeout(() => flash(c, 850), i * 950);
    });
  }));

  $$('[data-motif]').forEach((btn) => btn.addEventListener('click', () => { flash(btn, playMotif(btn.dataset.motif) || 600); }));

  /* ---------------- Khung xem ảnh ---------------- */
  const box = document.querySelector('[data-lightbox]');
  if (box) {
    const img = box.querySelector('[data-lb-img]');
    const cap = box.querySelector('[data-lb-cap]');
    let group = [], at = 0, opener = null;
    const show = (i) => {
      at = (i + group.length) % group.length;
      const a = group[at];
      img.src = a.getAttribute('href');
      img.alt = a.dataset.cap || '';
      cap.textContent = `${a.dataset.cap || ''} (${at + 1}/${group.length})`;
    };
    const close = () => { box.hidden = true; document.body.style.overflow = ''; img.removeAttribute('src'); if (opener) opener.focus(); };
    $$('a[data-zoom]').forEach((a) => a.addEventListener('click', (e) => {
      e.preventDefault();
      // chỉ lấy ảnh đang hiển thị (bỏ qua ảnh nằm trong tab đang ẩn)
      group = $$(`a[data-zoom="${a.dataset.zoom}"]`).filter((x) => x.offsetParent !== null);
      opener = a;
      box.hidden = false;
      document.body.style.overflow = 'hidden';
      show(Math.max(0, group.indexOf(a)));
      box.querySelector('[data-lb-close]').focus();
    }));
    box.querySelector('[data-lb-close]').addEventListener('click', close);
    box.querySelector('[data-lb-prev]').addEventListener('click', () => show(at - 1));
    box.querySelector('[data-lb-next]').addEventListener('click', () => show(at + 1));
    box.addEventListener('click', (e) => { if (e.target === box) close(); });
    addEventListener('keydown', (e) => {
      if (box.hidden) return;
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowLeft') show(at - 1);
      if (e.key === 'ArrowRight') show(at + 1);
    });
  }

  /* ---------------- Tab tác vụ (bài 3) ---------------- */
  $$('[data-tabs]').forEach((root) => {
    const tabs = $$('[role="tab"]', root);
    const select = (tab) => {
      tabs.forEach((t) => {
        const on = t === tab;
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
        document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
      });
    };
    tabs.forEach((t, i) => {
      t.tabIndex = t.getAttribute('aria-selected') === 'true' ? 0 : -1;
      t.addEventListener('click', () => select(t));
      t.addEventListener('keydown', (e) => {
        if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
        const next = tabs[(i + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length];
        select(next); next.focus();
      });
    });
  });

  /* ---------------- Lọc nguồn tài liệu (bài 2) ---------------- */
  $$('.filter').forEach((bar) => {
    const buttons = $$('button', bar);
    const items = $$('.src', bar.parentElement);
    buttons.forEach((b) => b.addEventListener('click', () => {
      buttons.forEach((x) => x.classList.toggle('is-on', x === b));
      items.forEach((it) => { it.hidden = b.dataset.filter !== 'all' && it.dataset.type !== b.dataset.filter; });
    }));
  });

  /* ---------------- Video YouTube: chỉ tải khi bấm ---------------- */
  $$('[data-yt]').forEach((wrap) => {
    const btn = wrap.querySelector('.video-play');
    if (!btn) return;
    btn.addEventListener('click', () => {
      const f = document.createElement('iframe');
      f.src = `https://www.youtube-nocookie.com/embed/${wrap.dataset.yt}?autoplay=1&rel=0`;
      f.title = 'Video sản phẩm của nhóm';
      f.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
      f.allowFullscreen = true;
      f.referrerPolicy = 'strict-origin-when-cross-origin';
      wrap.replaceChildren(f);
    });
  });
})();

/* ---------------- Chuyển động theo cuộn trang ---------------- */
(() => {
  'use strict';
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  // 1) Hé lộ từng khối khi cuộn tới
  const REVEAL = [
    ['.h-big, .product-h, .stage-title', 'rv-wipe'],
    ['.belief, .belief-by, .hobbies-text, .genres-lead, .rest-cap, .goals-head, .pgoals-lead, .six-lead, .six-more, .product-lead, .idline, .topic, .tree-block, .video, .recap, .formula, .frame-lead, .cadence-lead, .quote-end, .source, .essay > *, .report > h4, .report-id, .table-wrap, .tools-dl > div, .collab > h3, .collab > p, .task-material', ''],
    ['.hobbies li, .rows > li, .band li, .src, .staff-line, .pgoals-list li', 'rv-left'],
    ['.genre, .stage-cols > div, .brief-grid > div, .channels-list li, .collab-list li, .timeline > li, .trouble, .wu, .crit > li, .ans, .b4-table, .frame-grid section, .step, .ver, .pager a', ''],
    ['.chord, .cad', 'rv-pop'],
    ['.rest figure, .shot', 'rv-img'],
  ];
  const items = [];
  REVEAL.forEach(([sel, cls]) => $$(sel).forEach((el) => {
    if (el.classList.contains('rv')) return;
    el.classList.add('rv'); if (cls) el.classList.add(cls);
    const sibs = Array.from(el.parentElement.children).filter((x) => x.classList.contains('rv') || x === el);
    el.style.setProperty('--i', Math.min(sibs.indexOf(el), 6));
    items.push(el);
  }));
  const show = (el) => {
    el.classList.add('in');
    // gỡ lớp hiệu ứng sau khi chạy xong để không ảnh hưởng hiệu ứng rê chuột
    setTimeout(() => { el.classList.remove('rv', 'rv-left', 'rv-right', 'rv-pop', 'rv-wipe', 'rv-img', 'in'); el.style.removeProperty('--i'); }, 2400);
  };
  // Khối bị cắt bằng clip-path không tự báo "đã vào màn hình", nên theo dõi phần tử cha của nó.
  const watched = new Map();
  const io = new IntersectionObserver((entries) => entries.forEach((e) => {
    if (!e.isIntersecting) return;
    io.unobserve(e.target);
    (watched.get(e.target) || []).forEach(show);
    watched.delete(e.target);
  }), { rootMargin: '0px 0px -10% 0px', threshold: 0 });
  items.forEach((el) => {
    const clipped = el.classList.contains('rv-wipe') || el.classList.contains('rv-img');
    const target = clipped ? el.parentElement : el;
    if (!watched.has(target)) { watched.set(target, []); io.observe(target); }
    watched.get(target).push(el);
  });
  $$('.hero-strings .string').forEach((el, i) => el.style.setProperty('--s', i));

  // 2) Các lớp chuyển động theo vị trí và tốc độ cuộn
  const root = document.documentElement;
  const hero = document.querySelector('.hero');
  const phead = document.querySelector('.phead');
  const stage = document.querySelector('.stage');
  const steps = document.querySelector('.steps');
  const drift = $$('.rest-a, .rest-b').map((el, i) => ({ el, k: i ? -0.09 : 0.07 }));
  const heads = $$('.h-big');
  const marquees = $$('[data-marquee]').map((el) => ({ el, track: el.querySelector('.marquee-track'), x: 0, dir: Number(el.dataset.dir) || 1, w: 0 }));
  const measure = () => marquees.forEach((m) => { m.w = m.track.scrollWidth / 2; });
  measure(); addEventListener('resize', measure); addEventListener('load', measure);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);

  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  let lastY = scrollY, vel = 0, lastPluck = 0, lastT = performance.now();
  const plucked = $$('.hero-strings .string, .string-head');

  function frame(now) {
    const y = scrollY, vh = innerHeight;
    const dt = Math.min(64, now - lastT); lastT = now;
    const dy = y - lastY; lastY = y;
    vel += (dy - vel) * 0.18;                       // tốc độ cuộn đã làm mượt

    const max = root.scrollHeight - vh;
    root.style.setProperty('--p', max > 0 ? (y / max).toFixed(4) : 0);
    if (hero) hero.style.setProperty('--h', clamp(y / hero.offsetHeight).toFixed(4));
    if (phead) phead.style.setProperty('--ph', clamp(y / phead.offsetHeight).toFixed(4));
    if (stage) { const r = stage.getBoundingClientRect(); stage.style.setProperty('--sp', clamp((vh - r.top) / (vh + r.height)).toFixed(4)); }
    if (steps) { const r = steps.getBoundingClientRect(); steps.style.setProperty('--prog', clamp((vh * 0.6 - r.top) / r.height).toFixed(4)); }
    drift.forEach(({ el, k }) => { const r = el.getBoundingClientRect(); if (r.bottom > -200 && r.top < vh + 200) el.style.setProperty('--py', ((r.top + r.height / 2 - vh / 2) * k).toFixed(1) + 'px'); });
    heads.forEach((el) => { const r = el.getBoundingClientRect(); if (r.bottom > 0 && r.top < vh) el.style.setProperty('--hx', ((r.top - vh * 0.5) * 0.06).toFixed(1)); });

    // dải chữ: tự trôi, cuộn càng nhanh trôi càng nhanh, đổi chiều theo chiều cuộn
    marquees.forEach((m) => {
      if (!m.w) return;
      const push = (0.045 * dt + Math.abs(vel) * 0.9) * (vel < -0.5 ? -1 : 1) * m.dir;
      m.x = ((m.x - push) % m.w + m.w) % m.w;
      m.track.style.transform = `translate3d(${-m.x}px,0,0)`;
    });

    // cuộn nhanh thì dây đàn đang thấy trên màn hình rung theo (không phát tiếng)
    if (Math.abs(vel) > 14 && now - lastPluck > 260) {
      lastPluck = now;
      plucked.forEach((el, i) => {
        const r = el.getBoundingClientRect();
        if (r.bottom < 0 || r.top > vh) return;
        setTimeout(() => el.dispatchEvent(new CustomEvent('qk-shake', { detail: clamp(Math.abs(vel) / 60, 0.35, 1) })), i * 40);
      });
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
