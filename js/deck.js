/* ==========================================================================
   Логіка презентації: навігація, переходи, анімації появи, лічильники, нахил.
   ========================================================================== */
(() => {
  const stage = document.getElementById('stage');
  const slides = [...stage.querySelectorAll('.slide')];
  const N = slides.length;
  const $ = id => document.getElementById(id);
  const pad = n => String(n).padStart(2, '0');
  let cur = -1, leaveTimers = new Map();

  /* ---------- Масштаб сцени 1920×1080 ---------- */
  function fit() {
    const s = Math.min(innerWidth / 1920, innerHeight / 1080);
    stage.style.setProperty('--s', s);
  }
  addEventListener('resize', fit); fit();

  /* ---------- Розбивка заголовків на слова ---------- */
  function splitWords(el) {
    let idx = 0;
    const walk = node => {
      [...node.childNodes].forEach(ch => {
        if (ch.nodeType === 3) {
          const frag = document.createDocumentFragment();
          ch.textContent.split(/(\s+)/).forEach(p => {
            if (!p) return;
            if (/^\s+$/.test(p)) { frag.appendChild(document.createTextNode(' ')); return; }
            const w = document.createElement('span'); w.className = 'w';
            const i = document.createElement('span'); i.className = 'wi'; i.textContent = p;
            i.style.setProperty('--w', idx++);
            w.appendChild(i); frag.appendChild(w);
          });
          ch.replaceWith(frag);
        } else if (ch.nodeType === 1 && ch.tagName !== 'BR') walk(ch);
      });
    };
    walk(el);
  }
  stage.querySelectorAll('[data-split]').forEach(splitWords);

  /* ---------- Порядок каскаду в кожному слайді ---------- */
  slides.forEach(s => {
    s.querySelectorAll('[data-a], [data-split]').forEach((el, i) => el.style.setProperty('--i', i));
  });

  /* ---------- Точки, огляд ---------- */
  const dots = $('dots'), ov = $('ovGrid');
  slides.forEach((s, i) => {
    const d = document.createElement('button');
    d.setAttribute('aria-label', `Слайд ${i + 1}`);
    d.onclick = () => go(i); dots.appendChild(d);

    const b = document.createElement('button');
    b.className = 'glass'; b.style.setProperty('--k', i);
    b.innerHTML = `<span class="n">${pad(i + 1)}</span><span class="t">${s.dataset.title || 'Слайд'}</span>`;
    b.onclick = () => { toggleOverview(false); go(i); };
    ov.appendChild(b);
  });
  $('tot').textContent = pad(N);

  /* ---------- Лінза в навігації розділів ---------- */
  const seg = $('sections'), lens = seg.querySelector('.lens');
  const segBtns = [...seg.querySelectorAll('button')];
  const starts = segBtns.map(b => +b.dataset.go);
  segBtns.forEach(b => b.onclick = () => go(+b.dataset.go));
  function updateLens(i) {
    let k = 0; starts.forEach((s, j) => { if (i >= s) k = j; });
    segBtns.forEach((b, j) => b.classList.toggle('on', j === k));
    const b = segBtns[k];
    lens.style.width = b.offsetWidth + 'px';
    lens.style.transform = `translateX(${b.offsetLeft}px)`;
  }

  /* ---------- Лічильники ---------- */
  function countUp(el) {
    const to = parseFloat(el.dataset.count), dec = +(el.dataset.dec || 0);
    const dur = 1800, t0 = performance.now() + 350;
    const fmt = v => dec ? v.toFixed(dec).replace('.', ',') : Math.round(v).toLocaleString('uk-UA');
    el.textContent = fmt(0);
    const tick = now => {
      const p = Math.min(1, Math.max(0, (now - t0) / dur));
      const e = p === 1 ? 1 : 1 - Math.pow(2, -10 * p);
      el.textContent = fmt(to * e);
      if (p < 1 && el.closest('.slide').classList.contains('is-in')) requestAnimationFrame(tick);
      else if (p >= 1) el.textContent = fmt(to);
    };
    requestAnimationFrame(tick);
  }

  /* ---------- Перехід між слайдами ---------- */
  function go(i, instant) {
    i = Math.max(0, Math.min(N - 1, i));
    if (i === cur) return;
    const dir = i > cur ? 'fwd' : 'back';
    const prev = slides[cur], next = slides[i];

    if (prev) {
      prev.classList.remove('is-current', 'fwd', 'back');
      prev.classList.add('is-leaving', dir);
      clearTimeout(leaveTimers.get(prev));
      prev.classList.remove('settled');
      leaveTimers.set(prev, setTimeout(() => prev.classList.remove('is-leaving', 'is-in', 'fwd', 'back'), 1100));
    }

    clearTimeout(leaveTimers.get(next));
    next.classList.remove('is-leaving', 'is-in', 'fwd', 'back', 'settled');
    next.classList.add('is-current');
    void next.offsetWidth; // фіксуємо стартовий стан, щоб переходи запустилися
    next.classList.add('is-in');
    next.querySelectorAll('[data-count]').forEach(countUp);
    // після появи знімаємо маску слів, щоб діакритика (ї, й) не обрізалась
    clearTimeout(next._settle);
    next._settle = setTimeout(() => next.classList.contains('is-current') && next.classList.add('settled'), 2600);

    cur = i;
    window.BG && BG.setScene(next.dataset.scene, instant);
    $('cur').textContent = pad(i + 1);
    stage.querySelector('.progress').style.setProperty('--p', (i + 1) / N);
    [...dots.children].forEach((d, j) => d.classList.toggle('on', j === i));
    [...ov.children].forEach((d, j) => d.classList.toggle('on', j === i));
    updateLens(i);
    history.replaceState(null, '', '#' + (i + 1));
    document.title = (next.dataset.title || '') + ' · ' + pad(i + 1) + '/' + pad(N);
  }
  const next = () => go(cur + 1), prev = () => go(cur - 1);

  /* ---------- Огляд і повний екран ---------- */
  const ovEl = $('overview');
  function toggleOverview(force) {
    const open = force ?? !ovEl.classList.contains('open');
    ovEl.classList.toggle('open', open);
  }
  function toggleFS() {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
    else document.exitFullscreen?.();
  }
  $('prev').onclick = prev; $('next').onclick = next;
  $('gridBtn').onclick = () => toggleOverview(); $('fsBtn').onclick = toggleFS;
  stage.querySelectorAll('[data-next]').forEach(b => b.onclick = next);
  stage.querySelectorAll('[data-goto]').forEach(b => b.onclick = () => go(+b.dataset.goto));

  /* ---------- Клавіатура ---------- */
  addEventListener('keydown', e => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const k = e.key;
    if (ovEl.classList.contains('open') && (k === 'Escape' || k === 'g' || k === 'G' || k === 'п' || k === 'П')) { toggleOverview(false); return; }
    if (['ArrowRight', 'ArrowDown', 'PageDown', ' ', 'Enter'].includes(k)) { e.preventDefault(); next(); }
    else if (['ArrowLeft', 'ArrowUp', 'PageUp', 'Backspace'].includes(k)) { e.preventDefault(); prev(); }
    else if (k === 'Home') go(0);
    else if (k === 'End') go(N - 1);
    else if (k === 'g' || k === 'G' || k === 'п' || k === 'П' || k === 'Escape') toggleOverview();
    else if (k === 'f' || k === 'F' || k === 'а' || k === 'А') toggleFS();
    hideHint();
  });

  /* ---------- Колесо миші / тачпад ---------- */
  let wheelAcc = 0, wheelLock = 0;
  addEventListener('wheel', e => {
    if (ovEl.classList.contains('open')) return;
    e.preventDefault();
    const now = performance.now();
    if (now < wheelLock) return;
    wheelAcc += Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
    if (Math.abs(wheelAcc) > 60) { wheelAcc > 0 ? next() : prev(); wheelAcc = 0; wheelLock = now + 900; }
  }, { passive: false });

  /* ---------- Свайпи ---------- */
  let tx = 0, ty = 0;
  addEventListener('touchstart', e => { tx = e.touches[0].clientX; ty = e.touches[0].clientY; }, { passive: true });
  addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - tx, dy = e.changedTouches[0].clientY - ty;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 50) return;
    (Math.abs(dx) > Math.abs(dy) ? dx : dy) < 0 ? next() : prev();
  }, { passive: true });

  /* ---------- Відблиск скла + нахил за курсором ---------- */
  let tiltEl = null;
  stage.addEventListener('pointermove', e => {
    const g = e.target.closest('.glass');
    if (g) {
      const r = g.getBoundingClientRect();
      g.style.setProperty('--mx', ((e.clientX - r.left) / r.width * 100) + '%');
      g.style.setProperty('--my', ((e.clientY - r.top) / r.height * 100) + '%');
    }
    const t = e.target.closest('.tilt');
    if (tiltEl && tiltEl !== t) resetTilt(tiltEl);
    tiltEl = t;
    if (t) {
      const r = t.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - .5, py = (e.clientY - r.top) / r.height - .5;
      t.classList.add('is-tilting');
      t.style.setProperty('--ry', (px * 9) + 'deg');
      t.style.setProperty('--rx', (-py * 9) + 'deg');
    }
  });
  function resetTilt(t) { t.classList.remove('is-tilting'); t.style.setProperty('--rx', '0deg'); t.style.setProperty('--ry', '0deg'); }
  stage.addEventListener('pointerleave', () => tiltEl && resetTilt(tiltEl));

  /* ---------- Приховування курсора й підказки ---------- */
  let idleT;
  addEventListener('pointermove', () => {
    document.body.classList.remove('idle');
    clearTimeout(idleT); idleT = setTimeout(() => document.body.classList.add('idle'), 2800);
  }, { passive: true });
  const hint = $('hint');
  let hintT = setTimeout(hideHint, 7000);
  function hideHint() { clearTimeout(hintT); hint.classList.add('gone'); }

  /* ---------- Декоративний QR ---------- */
  const qr = $('qr');
  if (qr) {
    let seed = 7;
    const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
    for (let y = 0; y < 9; y++) for (let x = 0; x < 9; x++) {
      const i = document.createElement('i');
      const corner = (x < 3 && y < 3) || (x > 5 && y < 3) || (x < 3 && y > 5);
      const ring = corner && !((x % 6 === 1) && (y % 6 === 1));
      if (corner ? !ring && !((x % 6 === 1) && (y % 6 === 1)) : rnd() > .55) i.className = 'o';
      qr.appendChild(i);
    }
  }

  /* ---------- Старт ---------- */
  const start = parseInt(location.hash.slice(1), 10);
  go(Number.isFinite(start) ? start - 1 : 0, true);
  // після завантаження шрифтів ширина кнопок змінюється — переміряємо лінзу
  document.fonts && document.fonts.ready.then(() => updateLens(cur));
  addEventListener('load', () => updateLens(cur));
  addEventListener('hashchange', () => {
    const h = parseInt(location.hash.slice(1), 10);
    if (Number.isFinite(h)) go(h - 1);
  });

  window.deck = { go, next, prev, get index() { return cur; }, count: N };
})();
