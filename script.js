/* =====================================================================
   KIRISH NX INDIA PVT LTD — Landing page interactions
   Vanilla JS (ES6+) · GSAP + ScrollTrigger · Lenis
   Everything degrades gracefully if a CDN library fails to load.
   ===================================================================== */
(function () {
  'use strict';

  const doc = document;
  const html = doc.documentElement;
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // signal that JS is available (drives reveal defaults in CSS)
  html.classList.add('js');

  /* ------------------------------------------------------------------
     1. Lenis smooth scrolling (syncs with GSAP ScrollTrigger)
     ------------------------------------------------------------------ */
  let lenis = null;
  const hasGSAP = typeof window.gsap !== 'undefined';
  const hasST = hasGSAP && typeof window.ScrollTrigger !== 'undefined';

  if (hasST) gsap.registerPlugin(ScrollTrigger);

  if (typeof window.Lenis !== 'undefined' && !prefersReduced) {
    lenis = new Lenis({ duration: 1.1, smoothWheel: true, wheelMultiplier: 1, touchMultiplier: 1.6 });
    if (hasST) lenis.on('scroll', ScrollTrigger.update);
    const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
  }

  /* ------------------------------------------------------------------
     2. Smooth anchor navigation (works with or without Lenis)
     ------------------------------------------------------------------ */
  doc.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      if (id === '#' || id.length < 2) return;
      const target = doc.querySelector(id);
      if (!target) return;
      e.preventDefault();
      const y = target.getBoundingClientRect().top + window.scrollY - 64;
      if (lenis) lenis.scrollTo(y, { duration: 1.2 });
      else window.scrollTo({ top: y, behavior: prefersReduced ? 'auto' : 'smooth' });
      closeMenu();
    });
  });

  /* ------------------------------------------------------------------
     3. Header state + scroll progress bar
     ------------------------------------------------------------------ */
  const header = doc.getElementById('header');
  const progress = doc.getElementById('scrollProgress');
  const onScroll = () => {
    const y = window.scrollY;
    header.classList.toggle('is-scrolled', y > 40);
    const h = doc.documentElement.scrollHeight - window.innerHeight;
    if (progress) progress.style.width = (h > 0 ? (y / h) * 100 : 0) + '%';
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ------------------------------------------------------------------
     4. Mobile menu
     ------------------------------------------------------------------ */
  const nav = doc.getElementById('primaryNav');
  const toggle = doc.getElementById('navToggle');
  function closeMenu() {
    if (!nav) return;
    nav.classList.remove('is-open');
    toggle.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
  }
  if (toggle) {
    toggle.addEventListener('click', () => {
      const open = nav.classList.toggle('is-open');
      toggle.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', String(open));
    });
  }
  doc.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });

  /* ------------------------------------------------------------------
     5. Active section highlight in nav
     ------------------------------------------------------------------ */
  const navLinks = Array.from(doc.querySelectorAll('.nav__link'));
  const sections = navLinks
    .map((l) => doc.querySelector(l.getAttribute('href')))
    .filter(Boolean);
  if ('IntersectionObserver' in window && sections.length) {
    const spy = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) {
          const id = '#' + en.target.id;
          navLinks.forEach((l) => l.classList.toggle('is-active', l.getAttribute('href') === id));
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    sections.forEach((s) => spy.observe(s));
  }

  /* ------------------------------------------------------------------
     6. Reveal-on-scroll (GSAP if available, else IntersectionObserver)
     ------------------------------------------------------------------ */
  const revealEls = Array.from(doc.querySelectorAll('[data-reveal]'));
  if (prefersReduced) {
    revealEls.forEach((el) => el.classList.add('is-in'));
  } else if (hasST) {
    revealEls.forEach((el) => {
      gsap.fromTo(el, { autoAlpha: 0, y: 30 }, {
        autoAlpha: 1, y: 0, duration: 0.8, ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 88%' },
        onStart: () => el.classList.add('is-in'),
      });
    });
    // stagger grids for a premium cascade
    ['.cat-grid', '.prod-grid', '.why-grid', '.ind-grid', '.cert-grid', '.dl-grid', '.about__pillars', '.capabilities']
      .forEach((sel) => {
        const grid = doc.querySelector(sel);
        if (!grid) return;
        const kids = grid.querySelectorAll('[data-reveal]');
        if (!kids.length) return;
        gsap.set(kids, { clearProps: 'all' });
        gsap.fromTo(kids, { autoAlpha: 0, y: 34 }, {
          autoAlpha: 1, y: 0, duration: 0.7, ease: 'power3.out', stagger: 0.08,
          scrollTrigger: { trigger: grid, start: 'top 82%' },
          onStart: () => kids.forEach((k) => k.classList.add('is-in')),
        });
      });
  } else if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries, obs) => {
      entries.forEach((en) => {
        if (en.isIntersecting) { en.target.classList.add('is-in'); obs.unobserve(en.target); }
      });
    }, { threshold: 0.12 });
    revealEls.forEach((el) => io.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add('is-in'));
  }

  /* ------------------------------------------------------------------
     7. Hero parallax on the floating packs
     ------------------------------------------------------------------ */
  if (hasST && !prefersReduced) {
    doc.querySelectorAll('[data-parallax]').forEach((el) => {
      const depth = parseFloat(el.dataset.parallax) || 0.1;
      gsap.to(el, {
        yPercent: -depth * 100,
        ease: 'none',
        scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true },
      });
    });
  }

  /* ------------------------------------------------------------------
     7b. Three.js — golden particle globe in the hero
         A rotating sphere of gold points with drifting dust + arcs,
         echoing the "global export" logo. Degrades gracefully:
         skipped when Three.js/WebGL is unavailable or reduced motion.
     ------------------------------------------------------------------ */
  (function initHeroGlobe() {
    const canvas = doc.getElementById('heroCanvas');
    if (!canvas || typeof window.THREE === 'undefined' || prefersReduced) return;

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' });
    } catch (e) { return; } // no WebGL → silently keep the CSS-only background

    const hero = doc.getElementById('hero');
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.z = 8;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const GOLD = new THREE.Color(0xd48218);
    const GOLD_LT = new THREE.Color(0xf8dbb0);
    const BLUE = new THREE.Color(0x38bdf8);
    const GREEN = new THREE.Color(0x007a3d);

    const globe = new THREE.Group();
    scene.add(globe);

    // --- point-cloud sphere (fibonacci distribution = even, elegant) ---
    const N = 1500, R = 2.7;
    const pos = new Float32Array(N * 3);
    const phi = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < N; i++) {
      const y = 1 - (i / (N - 1)) * 2;
      const rad = Math.sqrt(1 - y * y);
      const th = phi * i;
      pos[i * 3] = Math.cos(th) * rad * R;
      pos[i * 3 + 1] = y * R;
      pos[i * 3 + 2] = Math.sin(th) * rad * R;
    }
    const sphereGeo = new THREE.BufferGeometry();
    sphereGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    globe.add(new THREE.Points(sphereGeo, new THREE.PointsMaterial({
      color: GOLD, size: 0.028, transparent: true, opacity: 0.85,
      blending: THREE.AdditiveBlending, depthWrite: false,
    })));

    // --- faint geodesic wireframe inside the points ---
    globe.add(new THREE.LineSegments(
      new THREE.WireframeGeometry(new THREE.IcosahedronGeometry(R * 0.985, 1)),
      new THREE.LineBasicMaterial({ color: BLUE, transparent: true, opacity: 0.15 })
    ));

    // --- orbit rings (trade routes) ---
    const ringGeo = new THREE.TorusGeometry(R * 1.25, 0.004, 8, 120);
    const mkRing = (rx, rz, color, op) => {
      const ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: op }));
      ring.rotation.x = rx; ring.rotation.z = rz;
      globe.add(ring);
    };
    mkRing(Math.PI / 2.15, 0.35, GOLD_LT, 0.35);
    mkRing(Math.PI / 2.6, -0.5, GREEN, 0.28);

    // --- drifting golden dust around the scene ---
    const DN = 260;
    const dpos = new Float32Array(DN * 3);
    for (let i = 0; i < DN * 3; i++) dpos[i] = (Math.random() - 0.5) * 14;
    const dustGeo = new THREE.BufferGeometry();
    dustGeo.setAttribute('position', new THREE.BufferAttribute(dpos, 3));
    const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({
      color: GOLD_LT, size: 0.02, transparent: true, opacity: 0.45,
      blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    scene.add(dust);

    // position: sits behind the product showcase on wide screens, centred on mobile
    const layout = () => {
      const wide = window.innerWidth > 900;
      globe.position.x = wide ? 2.6 : 0;
      globe.position.y = wide ? -0.2 : 0.6;
      const w = hero.clientWidth, h = hero.clientHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    layout();
    window.addEventListener('resize', layout);

    // gentle mouse parallax
    let mx = 0, my = 0;
    window.addEventListener('pointermove', (e) => {
      mx = (e.clientX / window.innerWidth - 0.5) * 0.4;
      my = (e.clientY / window.innerHeight - 0.5) * 0.25;
    }, { passive: true });

    // render only while the hero is on screen
    let visible = true, raf = 0;
    new IntersectionObserver((en) => {
      visible = en[0].isIntersecting;
      if (visible && !raf) raf = requestAnimationFrame(tick);
    }).observe(hero);

    function tick(t) {
      raf = 0;
      globe.rotation.y = t * 0.00012;
      globe.rotation.x = 0.22 + my;
      globe.rotation.z = mx * 0.2;
      dust.rotation.y = -t * 0.00003;
      renderer.render(scene, camera);
      if (visible) raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
  })();

  /* ------------------------------------------------------------------
     8. Animated counters
     ------------------------------------------------------------------ */
  const counters = Array.from(doc.querySelectorAll('.stat__num'));
  const runCount = (el) => {
    const target = parseFloat(el.dataset.count) || 0;
    const suffix = el.dataset.suffix || '';
    const dur = 1600;
    const start = performance.now();
    const step = (now) => {
      const p = Math.min((now - start) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
      el.textContent = Math.round(target * eased) + suffix;
      if (p < 1) requestAnimationFrame(step);
      else el.textContent = target + suffix;
    };
    requestAnimationFrame(step);
  };
  if ('IntersectionObserver' in window && counters.length) {
    const cio = new IntersectionObserver((entries, obs) => {
      entries.forEach((en) => {
        if (en.isIntersecting) { runCount(en.target); obs.unobserve(en.target); }
      });
    }, { threshold: 0.5 });
    counters.forEach((c) => cio.observe(c));
  } else {
    counters.forEach((c) => (c.textContent = (c.dataset.count || '') + (c.dataset.suffix || '')));
  }

  /* ------------------------------------------------------------------
     9. Product category filter
     ------------------------------------------------------------------ */
  const chips = doc.querySelectorAll('.chip');
  const cards = Array.from(doc.querySelectorAll('.prod-card'));
  const brandNotes = Array.from(doc.querySelectorAll('[data-brand-note]'));
  let activeFilter = 'crispyko';

  function matchesFilter(card) {
    return card.dataset.cat === activeFilter;
  }

  function renderCards({ animateNew = false } = {}) {
    cards.forEach((card) => {
      const shouldShow = matchesFilter(card);
      const wasHidden = card.classList.contains('is-hidden');
      card.classList.toggle('is-hidden', !shouldShow);
      if (shouldShow && wasHidden && animateNew && hasGSAP && !prefersReduced) {
        gsap.fromTo(card, { autoAlpha: 0, scale: 0.94 }, { autoAlpha: 1, scale: 1, duration: 0.4, ease: 'power2.out' });
      }
    });
    brandNotes.forEach((note) => {
      note.classList.toggle('is-visible', note.dataset.brandNote === activeFilter);
    });
    if (hasST) ScrollTrigger.refresh();
  }

  chips.forEach((chip) => {
    chip.addEventListener('click', () => {
      chips.forEach((c) => c.classList.remove('is-active'));
      chip.classList.add('is-active');
      activeFilter = chip.dataset.filter;
      renderCards({ animateNew: true });
    });
  });

  renderCards();

  /* ------------------------------------------------------------------
     9b. Product image zoom lightbox
     ------------------------------------------------------------------ */
  const lightbox = doc.getElementById('imgLightbox');
  if (lightbox) {
    const lightboxImg = lightbox.querySelector('.img-lightbox__img');
    const lightboxClose = lightbox.querySelector('.img-lightbox__close');
    let lastFocused = null;

    function openLightbox(img) {
      lastFocused = doc.activeElement;
      lightboxImg.src = img.currentSrc || img.src;
      lightboxImg.alt = img.alt || '';
      lightbox.classList.add('is-open');
      lightbox.setAttribute('aria-hidden', 'false');
      doc.body.style.overflow = 'hidden';
      lightboxClose.focus();
    }

    function closeLightbox() {
      lightbox.classList.remove('is-open');
      lightbox.setAttribute('aria-hidden', 'true');
      doc.body.style.overflow = '';
      lightboxImg.src = '';
      if (lastFocused) lastFocused.focus();
    }

    doc.addEventListener('click', (e) => {
      const img = e.target.closest('.prod-card__media img');
      if (img) openLightbox(img);
    });

    lightboxClose.addEventListener('click', closeLightbox);
    lightbox.addEventListener('click', (e) => {
      if (e.target === lightbox) closeLightbox();
    });
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && lightbox.classList.contains('is-open')) closeLightbox();
    });
  }

  /* ------------------------------------------------------------------
     9c. Product media scroll galleries (multi-image cards)
     ------------------------------------------------------------------ */
  doc.querySelectorAll('.prod-card__scroll').forEach((scrollEl) => {
    const slides = Array.from(scrollEl.children);
    if (slides.length < 2) return;

    const media = scrollEl.parentElement;

    const dotsWrap = doc.createElement('div');
    dotsWrap.className = 'prod-card__dots';
    slides.forEach((_, i) => {
      const dot = doc.createElement('span');
      dot.className = 'prod-card__dot' + (i === 0 ? ' is-active' : '');
      dotsWrap.appendChild(dot);
    });
    media.appendChild(dotsWrap);
    const dots = Array.from(dotsWrap.children);

    const prevBtn = doc.createElement('button');
    prevBtn.type = 'button';
    prevBtn.className = 'prod-card__arrow prod-card__arrow--prev is-disabled';
    prevBtn.setAttribute('aria-label', 'Previous image');
    prevBtn.innerHTML = '<i class="fa-solid fa-chevron-left" aria-hidden="true"></i>';

    const nextBtn = doc.createElement('button');
    nextBtn.type = 'button';
    nextBtn.className = 'prod-card__arrow prod-card__arrow--next';
    nextBtn.setAttribute('aria-label', 'Next image');
    nextBtn.innerHTML = '<i class="fa-solid fa-chevron-right" aria-hidden="true"></i>';

    media.appendChild(prevBtn);
    media.appendChild(nextBtn);

    function goTo(idx) {
      scrollEl.scrollTo({ left: idx * scrollEl.clientWidth, behavior: 'smooth' });
    }

    prevBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const idx = Math.round(scrollEl.scrollLeft / scrollEl.clientWidth);
      goTo(Math.max(0, idx - 1));
    });
    nextBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const idx = Math.round(scrollEl.scrollLeft / scrollEl.clientWidth);
      goTo(Math.min(slides.length - 1, idx + 1));
    });

    let ticking = false;
    scrollEl.addEventListener('scroll', () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const idx = Math.round(scrollEl.scrollLeft / scrollEl.clientWidth);
        dots.forEach((d, i) => d.classList.toggle('is-active', i === idx));
        prevBtn.classList.toggle('is-disabled', idx === 0);
        nextBtn.classList.toggle('is-disabled', idx === slides.length - 1);
        ticking = false;
      });
    });
  });

  /* ------------------------------------------------------------------
     10. Forms (demo handlers — wire to your backend / email service)
     ------------------------------------------------------------------ */
  const quoteForm = doc.getElementById('quoteForm');
  const formNote = doc.getElementById('formNote');
  if (quoteForm) {
    quoteForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = quoteForm.name.value.trim();
      const email = quoteForm.email.value.trim();
      const valid = name && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
      if (!valid) {
        formNote.textContent = 'Please enter your name and a valid email.';
        formNote.className = 'form-note err';
        return;
      }
      formNote.textContent = 'Thank you! Your quote request has been noted — our export desk will reply shortly.';
      formNote.className = 'form-note ok';
      quoteForm.reset();
    });
  }
  const newsForm = doc.getElementById('newsForm');
  if (newsForm) {
    newsForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = newsForm.querySelector('input');
      if (input.value.trim()) { input.value = ''; input.placeholder = 'Subscribed ✓'; }
    });
  }

  /* ------------------------------------------------------------------
     11. Footer year
     ------------------------------------------------------------------ */
  const yearEl = doc.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // Refresh ScrollTrigger once everything (images/fonts) has loaded
  window.addEventListener('load', () => { if (hasST) ScrollTrigger.refresh(); });

  /* ------------------------------------------------------------------
     12. Google Website Translator init (callback must be global — the
     translate.google.com script looks it up on window)
     ------------------------------------------------------------------ */
  window.googleTranslateElementInit = function () {
    new google.translate.TranslateElement({
      pageLanguage: 'en',
      includedLanguages: 'en,zh-CN,ru',
      layout: google.translate.TranslateElement.InlineLayout.HORIZONTAL,
      autoDisplay: false
    }, 'google_translate_element');
  };

  /* ------------------------------------------------------------------
     12b. Language switcher loading state + fallback
     The Google widget above can take anywhere from a few seconds to
     15+ (or fail outright if an ad-blocker strips its script). Show a
     spinner while it loads; if it isn't ready in 6s, swap in a direct
     link to Google's page-translate proxy. Keeps polling afterwards
     in case the widget still shows up late, and switches back to it.
     ------------------------------------------------------------------ */
  (function () {
    const widgetEl = doc.getElementById('google_translate_element');
    const spinnerEl = doc.getElementById('langSpinner');
    const fallbackEl = doc.getElementById('langFallback');
    const fallbackSelect = doc.getElementById('langFallbackSelect');
    if (!widgetEl || !spinnerEl || !fallbackEl || !fallbackSelect) return;

    // Page itself always stays English by default. Picking Chinese or
    // Russian opens Google's translated proxy in a new tab, then the
    // dropdown snaps back to English since the current tab didn't change.
    fallbackSelect.addEventListener('change', () => {
      const lang = fallbackSelect.value;
      if (lang !== 'en') {
        const url = `https://translate.google.com/translate?sl=en&tl=${lang}&u=${encodeURIComponent(location.href)}`;
        window.open(url, '_blank', 'noopener');
      }
      fallbackSelect.value = 'en';
    });

    let resolved = false;
    let attempts = 0;
    const poll = setInterval(() => {
      attempts++;
      // .goog-te-combo can exist in the DOM with 0 options for a long
      // time before Google actually populates it — only options.length
      // confirms the widget is genuinely usable.
      const combo = widgetEl.querySelector('.goog-te-combo');
      if (combo && combo.options.length > 0) {
        resolved = true;
        spinnerEl.hidden = true;
        fallbackEl.hidden = true;
        clearInterval(poll);
      } else if (attempts >= 150) {
        clearInterval(poll);
      }
    }, 400);

    setTimeout(() => {
      if (!resolved) {
        spinnerEl.hidden = true;
        fallbackEl.hidden = false;
      }
    }, 6000);
  })();

  /* ------------------------------------------------------------------
     13. Basic content protection (deterrent only — see note below)
     - Blocks right-click and drag anywhere on the site
     - Blocks common "view source / save / devtools" shortcuts
     Note: none of this stops a determined visitor (devtools, view-source,
     browser reading mode and screenshots all still work) — it only
     deters casual right-click "save as". Text selection and Ctrl+C
     copy are left enabled so visitors can still copy the contact
     email/phone/address.
     ------------------------------------------------------------------ */
  doc.addEventListener('contextmenu', (e) => e.preventDefault());
  doc.addEventListener('dragstart', (e) => {
    if (e.target.closest('img')) e.preventDefault();
  });
  doc.addEventListener('keydown', (e) => {
    const k = e.key;
    const blocked =
      k === 'F12' ||
      (e.ctrlKey && e.shiftKey && ['I', 'i', 'J', 'j', 'C', 'c'].includes(k)) ||
      (e.ctrlKey && ['U', 'u', 'S', 's'].includes(k)) ||
      (e.metaKey && e.altKey && ['I', 'i', 'J', 'j'].includes(k));
    if (blocked) e.preventDefault();
  });
})();
