// DT클린웍스: 헤더·메뉴·요금제 캐러셀·하단 바 (스크롤 이벤트 없이 IntersectionObserver만 사용)
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const hasIO = "IntersectionObserver" in window;

  /* 헤더: 맨 위를 벗어나면 배경 표시 */
  const header = $("[data-header]");
  const sentinel = document.createElement("div");
  sentinel.style.cssText = "position:absolute;top:0;left:0;width:1px;height:48px;pointer-events:none";
  document.body.prepend(sentinel);
  if (hasIO) {
    new IntersectionObserver(([e]) => header.classList.toggle("is-scrolled", !e.isIntersecting)).observe(sentinel);
  } else header.classList.add("is-scrolled");

  /* 모바일 드로어 메뉴 */
  const drawer = $("[data-drawer]");
  const openBtn = $("[data-menu-open]");
  let lastFocus = null;
  const openMenu = () => {
    lastFocus = document.activeElement;
    drawer.hidden = false;
    document.documentElement.style.overflow = "hidden";
    openBtn.setAttribute("aria-expanded", "true");
    requestAnimationFrame(() => requestAnimationFrame(() => drawer.classList.add("is-open")));
    $(".drawer-nav a", drawer).focus({ preventScroll: true });
  };
  const closeMenu = () => {
    if (drawer.hidden) return;
    drawer.classList.remove("is-open");
    document.documentElement.style.overflow = "";
    openBtn.setAttribute("aria-expanded", "false");
    const done = () => { drawer.hidden = true; };
    matchMedia("(prefers-reduced-motion: reduce)").matches ? done() : setTimeout(done, 320);
    lastFocus?.focus?.({ preventScroll: true });
  };
  openBtn.addEventListener("click", openMenu);
  $$("[data-menu-close]", drawer).forEach((el) => el.addEventListener("click", closeMenu));
  document.addEventListener("keydown", (e) => {
    if (drawer.hidden) return;
    if (e.key === "Escape") closeMenu();
    if (e.key === "Tab") { // 포커스를 메뉴 안에 가둠
      const f = $$("a, button", drawer).filter((el) => el.offsetParent);
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });
  matchMedia("(min-width: 768px)").addEventListener("change", (m) => m.matches && closeMenu());

  /* 첫 화면 사진 슬라이드: 7초마다 넘어가고, 화살표로 직접 넘길 수 있다 */
  const shots = $$(".hero-photo");
  if (shots.length > 1) {
    const now = $("[data-hero-now]"), bar = $("[data-hero-bar]");
    const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let idx = 0, timer = null;
    const show = (i) => {
      idx = (i + shots.length) % shots.length;
      shots.forEach((el, k) => el.classList.toggle("is-active", k === idx));
      if (now) now.textContent = String(idx + 1).padStart(2, "0");
      if (bar) { bar.classList.remove("is-run"); void bar.offsetWidth; if (!still) bar.classList.add("is-run"); }
    };
    const play = () => { clearInterval(timer); if (!still) timer = setInterval(() => show(idx + 1), 7000); };
    $("[data-hero-prev]")?.addEventListener("click", () => { show(idx - 1); play(); });
    $("[data-hero-next]")?.addEventListener("click", () => { show(idx + 1); play(); });
    document.addEventListener("visibilitychange", () => (document.hidden ? clearInterval(timer) : play()));
    if (bar && !still) bar.classList.add("is-run");
    play();
  }

  if (!hasIO) return;

  /* 섹션별 등장 반응: 화면에 들어올 때 한 번만. JS·IO 가 없거나 모션 감소 설정이면 처음부터 다 보인다 */
  if (!matchMedia("(prefers-reduced-motion: reduce)").matches) {
    const rvIO = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        e.target.classList.add("is-in");
        rvIO.unobserve(e.target);
      });
    }, { threshold: 0.01 });
    const mark = (sel, cls) => $$(sel).forEach((el) => { el.classList.add(cls); rvIO.observe(el); });
    mark(".section-head, .deck, .plan-notes", "rv");
    mark(".fit-list, .faq-list, .contact-links", "rv-group");
    mark(".svc", "rv-wipe");
    mark(".steps", "rv-steps");
    // 인쇄할 때는 전부 보이게
    addEventListener("beforeprint", () => $$(".rv, .rv-group, .rv-wipe, .rv-steps").forEach((el) => el.classList.add("is-in")));
  }

  /* 현재 섹션을 내비에 표시 */
  const links = $$("[data-nav-link]");
  const navIO = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      links.forEach((a) => a.setAttribute("aria-current", String(a.getAttribute("href") === "#" + e.target.id)));
    });
  }, { rootMargin: "-45% 0px -50% 0px" });
  links.forEach((a) => { const s = $(a.getAttribute("href")); s && navIO.observe(s); });

  /* 요금제 원통: 카드 네 장이 원통 둘레에 서 있고, 넘기면 원통이 돈다. 끝에서 넘기면 처음으로 돌아온다 */
  const deck = $("[data-deck]");
  if (deck) {
    const slides = $$("[data-slide]", deck);
    const tabs = $$("[data-dot]", deck);
    const ring = $(".plans", deck);
    const n = slides.length;
    const theta = () => parseFloat(getComputedStyle(deck).getPropertyValue("--theta")) || 48;
    const angles = slides.map(() => 0);
    let cur = Math.max(0, slides.findIndex((s) => s.dataset.start === "1"));
    const place = (first) => {
      const th = theta();
      slides.forEach((s, k) => {
        // 자리: 0 앞, ±1 양옆, 그 밖은 원통 뒤쪽
        let o = (((k - cur) % n) + n) % n;
        if (o > n / 2) o -= n;
        const target = Math.abs(o) > 1 ? 180 : o * th;
        // 같은 방향으로 가장 가까운 길로 돌도록 360도 단위로 맞춘다
        const a = first ? target : target + 360 * Math.round((angles[k] - target) / 360);
        angles[k] = a;
        s.style.setProperty("--ang", a + "deg");
        s.classList.toggle("is-active", o === 0);
        s.setAttribute("aria-hidden", String(o !== 0));
        s.querySelectorAll("a").forEach((el) => { el.tabIndex = o === 0 ? 0 : -1; });
      });
      tabs.forEach((d, k) => d.setAttribute("aria-current", String(k === cur)));
    };
    const go = (i) => { cur = ((i % n) + n) % n; place(false); };
    deck.classList.add("is-ready");
    place(true);
    requestAnimationFrame(() => requestAnimationFrame(() => deck.classList.add("is-live")));
    $("[data-deck-prev]", deck).addEventListener("click", () => go(cur - 1));
    $("[data-deck-next]", deck).addEventListener("click", () => go(cur + 1));
    tabs.forEach((d, i) => d.addEventListener("click", () => go(i)));

    // 손가락(마우스)을 따라 원통이 같이 돌고, 놓으면 가까운 카드로 부드럽게 멈춘다
    let sx = 0, sy = 0, down = false, drag = false, moved = false;
    const setDrag = (deg) => ring.style.setProperty("--drag", deg + "deg");
    ring.addEventListener("pointerdown", (e) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      down = true; drag = false; moved = false; sx = e.clientX; sy = e.clientY;
    });
    ring.addEventListener("pointermove", (e) => {
      if (!down) return;
      const dx = e.clientX - sx, dy = e.clientY - sy;
      if (!drag) {
        if (Math.abs(dx) < 8 || Math.abs(dx) < Math.abs(dy) * 1.2) return;
        drag = true; moved = true;
        ring.classList.add("is-drag");
        try { ring.setPointerCapture(e.pointerId); } catch (_) {}
      }
      const w = slides[cur].offsetWidth || 1;
      setDrag(Math.max(-1, Math.min(1, dx / w)) * theta());
    });
    const end = (e) => {
      if (!down) return;
      down = false;
      if (!drag) return;
      drag = false;
      ring.classList.remove("is-drag");
      const dx = e.clientX - sx;
      setDrag(0);
      if (Math.abs(dx) > 36) go(cur + (dx < 0 ? 1 : -1));
    };
    ring.addEventListener("pointerup", end);
    ring.addEventListener("pointercancel", end);
    // 옆 카드를 누르면 그 카드가 앞으로 돈다
    ring.addEventListener("click", (e) => {
      if (moved) { e.preventDefault(); moved = false; return; }
      const s = e.target.closest("[data-slide]");
      if (s && !s.classList.contains("is-active")) { e.preventDefault(); go(slides.indexOf(s)); }
    });
    deck.addEventListener("keydown", (e) => {
      if (e.key === "ArrowLeft") go(cur - 1);
      if (e.key === "ArrowRight") go(cur + 1);
    });
    addEventListener("resize", () => place(false), { passive: true });
  }

  /* 하단 고정 바: 히어로 버튼·상담 문의 영역·푸터가 보이면 숨김 (같은 버튼이 겹치지 않게) */
  const bar = $("[data-mobile-bar]");
  const seen = new Set();
  const barIO = new IntersectionObserver((entries) => {
    entries.forEach((e) => (e.isIntersecting ? seen.add(e.target) : seen.delete(e.target)));
    bar.classList.toggle("is-hidden", seen.size > 0);
  });
  [$(".hero-ctas"), $("[data-contact]"), $("[data-footer]")].forEach((el) => el && barIO.observe(el));
})();
