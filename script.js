/* ============ The Koshary Theory — Interactions ============ */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const LS = {
    get(k, d) { try { const v = JSON.parse(localStorage.getItem(k)); return v ?? d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }
  };
  const money = n => 'EGP ' + Math.round(n);

  /* ---------- Theme ---------- */
  const root = document.documentElement;
  const saved = LS.get('kt_theme', null);
  root.dataset.theme = saved || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  const themeBtn = $('#themeBtn');
  const paintTheme = () => { if (themeBtn) themeBtn.textContent = root.dataset.theme === 'dark' ? '☀️' : '🌙'; };
  paintTheme();
  themeBtn?.addEventListener('click', () => {
    root.dataset.theme = root.dataset.theme === 'dark' ? 'light' : 'dark';
    LS.set('kt_theme', root.dataset.theme); paintTheme();
  });

  /* ---------- Navbar / burger / back-to-top ---------- */
  const nav = $('#nav'), links = $('#navLinks'), backTop = $('#backTop');
  const onScroll = () => {
    nav?.classList.toggle('scrolled', scrollY > 30);
    backTop?.classList.toggle('show', scrollY > 600);
  };
  addEventListener('scroll', onScroll, { passive: true }); onScroll();
  $('#burger')?.addEventListener('click', () => links.classList.toggle('open'));
  $$('#navLinks a').forEach(a => a.addEventListener('click', () => links.classList.remove('open')));
  backTop?.addEventListener('click', () => scrollTo({ top: 0, behavior: 'smooth' }));

  /* ---------- Toast ---------- */
  function toast(msg) {
    let box = $('#toasts');
    if (!box) { box = document.createElement('div'); box.id = 'toasts'; box.className = 'toasts'; document.body.append(box); }
    const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg;
    box.append(t); setTimeout(() => t.remove(), 2900);
  }

  /* ---------- Reveal on scroll ---------- */
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }), { threshold: .12 });
  $$('.reveal').forEach(el => io.observe(el));

  /* ---------- Counters ---------- */
  const cio = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    const el = e.target, end = +el.dataset.count, suffix = el.dataset.suffix || '';
    const t0 = performance.now(), dur = 1600;
    const tick = t => {
      const p = Math.min((t - t0) / dur, 1), v = Math.round(end * (1 - Math.pow(1 - p, 3)));
      el.textContent = v.toLocaleString() + suffix;
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick); cio.unobserve(el);
  }), { threshold: .5 });
  $$('[data-count]').forEach(el => cio.observe(el));

  /* ---------- Cart ---------- */
  const getCart = () => LS.get('kt_cart', []);
  const saveCart = c => { LS.set('kt_cart', c); updateBadge(); };
  function updateBadge() {
    const n = getCart().reduce((a, i) => a + i.qty, 0);
    $$('.cart-count').forEach(b => { b.textContent = n; b.classList.toggle('hidden', n === 0); b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump'); });
  }
  function addToCart(item) {
    const cart = getCart();
    const found = cart.find(i => i.key === item.key);
    if (found) found.qty += 1; else cart.push({ ...item, qty: 1 });
    saveCart(cart);
    toast('✅ ' + item.name + ' added to your cart');
  }
  updateBadge();

  // Add buttons on static menu / home cards
  document.addEventListener('click', e => {
    const btn = e.target.closest('[data-add]');
    if (!btn) return;
    const card = btn.closest('[data-item]');
    if (!card) return;
    const sel = $('.size-select', card);
    let name = card.dataset.name, price = +card.dataset.price, detail = '';
    if (sel) { price = +sel.value; detail = sel.options[sel.selectedIndex].dataset.label; }
    addToCart({ key: card.dataset.id + '|' + detail, name, detail, price, img: card.dataset.img });
  });
  $$('.size-select').forEach(sel => sel.addEventListener('change', () => {
    const card = sel.closest('[data-item]'); const p = $('.price', card);
    if (p) p.textContent = money(+sel.value);
  }));

  /* ---------- Menu: filter / search / sort ---------- */
  const grid = $('#menuGrid');
  if (grid) {
    const cards = $$('[data-item]', grid);
    let cat = 'all';
    const apply = () => {
      const q = ($('#q')?.value || '').trim().toLowerCase();
      const sort = $('#sort')?.value;
      let shown = 0;
      cards.forEach(c => {
        const ok = (cat === 'all' || c.dataset.cat === cat) && (!q || (c.dataset.name + ' ' + c.textContent).toLowerCase().includes(q));
        c.classList.toggle('hidden', !ok); if (ok) shown++;
      });
      if (sort && sort !== 'default') {
        const price = c => { const s = $('.size-select', c); return s ? +s.options[0].value : +c.dataset.price; };
        [...cards].sort((a, b) => sort === 'low' ? price(a) - price(b) : price(b) - price(a)).forEach(c => grid.append(c));
      }
      $('#noResults')?.classList.toggle('hidden', shown > 0);
    };
    $$('.tab').forEach(t => t.addEventListener('click', () => {
      $$('.tab').forEach(x => x.classList.remove('on')); t.classList.add('on'); cat = t.dataset.filter; apply();
    }));
    $('#q')?.addEventListener('input', apply); $('#sort')?.addEventListener('change', apply);
    const h = location.hash.replace('#', ''); if (h) $(`.tab[data-filter="${h}"]`)?.click();
  }

  /* ---------- Testimonials slider ---------- */
  const track = $('#slideTrack');
  if (track) {
    const slides = $$('.slide', track), dotsBox = $('#dots'); let i = 0, timer;
    slides.forEach((_, n) => { const d = document.createElement('button'); d.className = 'dot'; d.setAttribute('aria-label', 'Slide ' + (n + 1)); d.onclick = () => go(n, true); dotsBox.append(d); });
    const go = (n, user) => {
      i = (n + slides.length) % slides.length; track.style.transform = `translateX(-${i * 100}%)`;
      $$('.dot', dotsBox).forEach((d, k) => d.classList.toggle('on', k === i));
      if (user) { clearInterval(timer); timer = setInterval(() => go(i + 1), 6000); }
    };
    $('#prev').onclick = () => go(i - 1, true); $('#next').onclick = () => go(i + 1, true);
    go(0); timer = setInterval(() => go(i + 1), 6000);
  }

  /* ---------- FAQ accordion ---------- */
  $$('.faq-item').forEach(item => {
    const q = $('.faq-q', item), a = $('.faq-a', item);
    q.addEventListener('click', () => {
      const open = item.classList.toggle('open');
      a.style.maxHeight = open ? a.scrollHeight + 'px' : 0;
    });
  });

  /* ---------- Gallery filter + lightbox ---------- */
  const gItems = $$('.g-item');
  if (gItems.length) {
    $$('.tab[data-gfilter]').forEach(t => t.addEventListener('click', () => {
      $$('.tab[data-gfilter]').forEach(x => x.classList.remove('on')); t.classList.add('on');
      gItems.forEach(g => g.classList.toggle('hidden', t.dataset.gfilter !== 'all' && g.dataset.cat !== t.dataset.gfilter));
    }));
    const lb = $('#lightbox'), lbArt = $('#lbArt'), lbCap = $('#lbCap'); let cur = 0;
    const visible = () => gItems.filter(g => !g.classList.contains('hidden'));
    const show = n => {
      const v = visible(); cur = (n + v.length) % v.length;
      const img = $('img', v[cur]);
      lbArt.innerHTML = `<img src="${img.getAttribute('src')}" alt="${img.alt}">`;
      lbCap.textContent = v[cur].dataset.cap;
    };
    gItems.forEach(g => g.addEventListener('click', () => { show(visible().indexOf(g)); lb.classList.add('open'); }));
    $('#lbClose').onclick = () => lb.classList.remove('open');
    $('#lbPrev').onclick = e => { e.stopPropagation(); show(cur - 1); };
    $('#lbNext').onclick = e => { e.stopPropagation(); show(cur + 1); };
    lb.addEventListener('click', e => { if (e.target === lb) lb.classList.remove('open'); });
    addEventListener('keydown', e => {
      if (!lb.classList.contains('open')) return;
      if (e.key === 'Escape') lb.classList.remove('open');
      if (e.key === 'ArrowRight') show(cur + 1);
      if (e.key === 'ArrowLeft') show(cur - 1);
    });
  }

  /* ---------- Form validation helper ---------- */
  const rules = {
    phone: v => /^(\+20|0)?1[0125]\d{8}$/.test(v.replace(/[\s-]/g, '')),
    email: v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
  };
  function validate(form) {
    let ok = true;
    $$('.field', form).forEach(f => {
      const inp = $('input,select,textarea', f); if (!inp || inp.closest('.hidden')) return;
      const v = inp.value.trim(); let bad = false;
      if (inp.required && !v) bad = true;
      else if (v && inp.dataset.type && rules[inp.dataset.type] && !rules[inp.dataset.type](v)) bad = true;
      f.classList.toggle('err', bad); if (bad) ok = false;
    });
    if (!ok) $('.field.err input,.field.err select,.field.err textarea', form)?.focus();
    return ok;
  }
  $$('.field input,.field select,.field textarea').forEach(i => i.addEventListener('input', () => i.closest('.field').classList.remove('err')));

  /* ---------- Contact page: forms ---------- */
  const resForm = $('#resForm');
  if (resForm) {
    const d = $('#resDate'); const today = new Date(); today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
    d.min = today.toISOString().slice(0, 10);
    resForm.addEventListener('submit', e => {
      e.preventDefault(); if (!validate(resForm)) return;
      const data = Object.fromEntries(new FormData(resForm));
      const list = LS.get('kt_reservations', []); list.push({ ...data, at: Date.now() }); LS.set('kt_reservations', list);
      $('#modalTitle').textContent = 'Table reserved!';
      $('#modalText').textContent = `Thanks ${data.name}! We saved a table for ${data.guests} on ${data.date} at ${data.time}. We'll call ${data.phone} to confirm.`;
      $('#modal').classList.add('open'); resForm.reset();
    });
    const msgForm = $('#msgForm');
    msgForm.addEventListener('submit', e => {
      e.preventDefault(); if (!validate(msgForm)) return;
      toast('📨 Message sent — we\'ll reply soon!'); msgForm.reset();
    });
    const dow = new Date().getDay(); $$('.hours li').forEach(li => li.classList.toggle('today', +li.dataset.day === dow));
  }

  /* ---------- Modal ---------- */
  $$('[data-close-modal]').forEach(b => b.addEventListener('click', () => $('#modal').classList.remove('open')));
  $('#modal')?.addEventListener('click', e => { if (e.target.id === 'modal') e.target.classList.remove('open'); });

  /* ---------- Footer newsletter ---------- */
  $('#newsForm')?.addEventListener('submit', e => {
    e.preventDefault(); const i = $('input', e.target);
    if (!rules.email(i.value.trim())) return toast('⚠️ Please enter a valid email');
    toast('🎉 Subscribed! Welcome to the Theory.'); e.target.reset();
  });

  /* ---------- Build Your Bowl ---------- */
  const bPrev = $('#bPreview');
  if (bPrev) {
    const rng = s => () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
    const pts = (n, seed) => { const r = rng(seed), a = []; for (let i = 0; i < Math.round(n); i++) { const x = 58 + r() * 124, mh = 64 * (1 - Math.pow((x - 120) / 80, 2)); a.push([x, 100 - r() * mh + (r() * 6 - 3), r()]); } return a; };
    const f = n => n.toFixed(1);
    function bowl(o) {
      const { rice, pasta, lentils, chick, onions, sauce, dakka, shatta, scale } = o; let s = '<path d="M38 102 Q120 -28 202 102Z" fill="#E6CF9C"/>';
      s += pts(90 * rice, 1).map(([x, y, r]) => `<ellipse cx="${f(x)}" cy="${f(y)}" rx="4" ry="1.7" fill="#FFF6E2" transform="rotate(${r * 180 | 0} ${f(x)} ${f(y)})"/>`).join('');
      s += pts(34 * pasta, 2).map(([x, y, r]) => `<rect x="${f(x - 5)}" y="${f(y - 1.6)}" width="10" height="3.2" rx="1.6" fill="#F0C75E" transform="rotate(${r * 180 | 0} ${f(x)} ${f(y)})"/>`).join('');
      s += pts(46 * lentils, 3).map(([x, y]) => `<circle cx="${f(x)}" cy="${f(y)}" r="2.8" fill="#7A4A25"/>`).join('');
      s += pts(24 * chick, 4).map(([x, y]) => `<circle cx="${f(x)}" cy="${f(y)}" r="4.4" fill="#D9A765"/><circle cx="${f(x - 1)}" cy="${f(y - 1.2)}" r="1.3" fill="#EBC993"/>`).join('');
      if (sauce !== 'none') { const c = sauce === 'spicy' ? '#A3170E' : '#C92C1F'; s += `<path d="M82 66 Q100 38 124 44 Q154 44 158 68 Q148 88 120 84 Q92 86 82 66Z" fill="${c}" opacity=".93"/><path d="M60 86 Q76 70 98 80 Q104 96 80 98 Q62 98 60 86Z" fill="${c}" opacity=".9"/><path d="M140 82 Q164 68 180 86 Q170 98 148 96Z" fill="${c}" opacity=".9"/>`; }
      s += pts(18 * onions, 6).map(([x, y, r]) => `<path d="M${f(x - 7)} ${f(y)} q7 ${-6 - r * 5 | 0} 14 ${r * 4 - 2 | 0}" fill="none" stroke="#C07A1B" stroke-width="3.2" stroke-linecap="round"/>`).join('');
      if (dakka) s += '<path d="M70 70 Q95 56 120 70 T170 68" fill="none" stroke="#DDEBB0" stroke-width="3" stroke-linecap="round"/><path d="M78 86 Q104 74 130 86 T178 84" fill="none" stroke="#DDEBB0" stroke-width="2.4" stroke-linecap="round"/>';
      if (shatta) s += pts(16, 9).map(([x, y]) => `<circle cx="${f(x)}" cy="${f(y)}" r="2.2" fill="#5E0C07"/>`).join('');
      return `<svg viewBox="0 0 240 220" role="img" aria-label="Your custom koshary bowl"><ellipse cx="120" cy="202" rx="84" ry="9" fill="#000" opacity=".16"/><path d="M26 98 Q120 66 214 98 Q120 130 26 98Z" fill="#7d1d15"/><g transform="translate(120 100) scale(${scale}) translate(-120 -100)">${s}</g><path d="M26 98 Q120 130 214 98 Q208 192 120 192 Q32 192 26 98Z" fill="#D7352B"/><path d="M26 98 Q120 130 214 98" fill="none" stroke="#F5B82E" stroke-width="6" stroke-linecap="round"/><path d="M30 130 Q120 160 210 130" fill="none" stroke="#F5B82E" stroke-width="4"/><path d="M34 112 Q50 170 92 186" fill="none" stroke="#fff" stroke-width="5" opacity=".18" stroke-linecap="round"/></svg>`;
    }
    const form = $('#builderForm');
    const state = () => {
      const val = n => ($(`input[name="${n}"]:checked`, form) || {}).value;
      const has = (n, v) => !!$(`input[name="${n}"][value="${v}"]:checked`, form);
      const size = $('input[name="size"]:checked', form);
      let price = +size.dataset.price; const lines = [['Size ' + size.dataset.label, price]];
      $$('input[name="extra"]:checked', form).forEach(x => { price += +x.dataset.price; lines.push([x.dataset.label, +x.dataset.price]); });
      const base = $$('input[name="base"]:checked', form).map(x => x.dataset.label);
      const sauce = val('sauce');
      return { price, lines, base, sauce, size, o: {
        rice: has('base', 'rice') ? 1 : 0, pasta: has('base', 'pasta') ? 1 : 0,
        lentils: (has('base', 'lentils') ? 1 : 0) + (has('extra', 'xlentils') ? .8 : 0),
        chick: (has('base', 'chick') ? 1 : 0) + (has('extra', 'xchick') ? .8 : 0),
        onions: (has('base', 'onions') ? 1 : 0) + (has('extra', 'xonions') ? 1 : 0),
        sauce, dakka: has('extra', 'dakka'), shatta: has('extra', 'shatta'),
        scale: { S: .8, M: .92, L: 1 }[size.value]
      }};
    };
    const render = () => {
      const st = state(); bPrev.innerHTML = bowl(st.o);
      $('#bTotal').textContent = money(st.price);
      $('#bList').innerHTML = st.lines.map(([n, p]) => `<li><span>${n}</span><span>${p ? money(p) : 'Included'}</span></li>`).join('');
    };
    form.addEventListener('change', render); render();
    $('#bAdd').addEventListener('click', () => {
      const st = state();
      const detail = `${st.size.dataset.label} · ${st.base.join(', ') || 'no base'} · ${st.sauce === 'none' ? 'no sauce' : st.sauce + ' sauce'}` + ($$('input[name="extra"]:checked', form).length ? ' · +' + $$('input[name="extra"]:checked', form).map(x => x.dataset.label).join(', ') : '');
      addToCart({ key: 'custom|' + detail, name: 'Custom Bowl', detail, price: st.price, img: 'images/koshary-classic.svg' });
    });
  }

  /* ---------- Order page ---------- */
  const lines = $('#cartLines');
  if (lines) {
    let promo = LS.get('kt_promo', null);
    const fee = () => ($('input[name="type"]:checked')?.value === 'delivery' ? 20 : 0);
    const render = () => {
      const cart = getCart();
      const empty = cart.length === 0;
      $('#cartFull').classList.toggle('hidden', empty); $('#cartEmpty').classList.toggle('hidden', !empty);
      lines.innerHTML = cart.map((i, n) => `
        <div class="cart-line">
          <div class="thumb"><img src="${i.img}" alt="${i.name}"></div>
          <div><h4>${i.name}</h4><small>${i.detail || ''}</small><br>
            <div class="qty"><button data-q="-1" data-n="${n}" aria-label="Decrease">−</button><b>${i.qty}</b><button data-q="1" data-n="${n}" aria-label="Increase">+</button></div></div>
          <div class="line-price">${money(i.price * i.qty)}<br><button class="rm" data-rm="${n}">Remove</button></div>
        </div>`).join('');
      const sub = cart.reduce((a, i) => a + i.price * i.qty, 0);
      const disc = promo ? sub * .1 : 0, total = sub - disc + (empty ? 0 : fee());
      $('#sSub').textContent = money(sub);
      $('#sDisc').textContent = disc ? '− ' + money(disc) : '—';
      $('#sFee').textContent = fee() ? money(fee()) : 'Free';
      $('#sTotal').textContent = money(total);
    };
    lines.addEventListener('click', e => {
      const cart = getCart(), q = e.target.closest('[data-q]'), r = e.target.closest('[data-rm]');
      if (q) { const it = cart[+q.dataset.n]; it.qty += +q.dataset.q; if (it.qty < 1) cart.splice(+q.dataset.n, 1); }
      else if (r) cart.splice(+r.dataset.rm, 1); else return;
      saveCart(cart); render();
    });
    $('#promoBtn').addEventListener('click', () => {
      const c = $('#promoIn').value.trim().toUpperCase();
      if (c === 'KOSHARY10') { promo = c; LS.set('kt_promo', c); toast('🎟️ 10% discount applied'); } else toast('❌ Invalid promo code');
      render();
    });
    $$('input[name="type"]').forEach(r => r.addEventListener('change', () => { $('#addrField').classList.toggle('hidden', r.value !== 'delivery' || !r.checked); render(); }));
    $('#checkout').addEventListener('submit', e => {
      e.preventDefault();
      if (!getCart().length) return toast('🛒 Your cart is empty');
      if (!validate($('#checkout'))) return;
      const no = 'KT-' + Math.floor(10000 + Math.random() * 90000);
      $('#orderNo').textContent = no; $('#orderTotal').textContent = $('#sTotal').textContent;
      $('#modal').classList.add('open');
      LS.set('kt_cart', []); LS.set('kt_promo', null); promo = null; updateBadge(); $('#checkout').reset(); render();
    });
    render();
  }
})();
