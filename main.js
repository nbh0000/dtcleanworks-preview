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

  /* 요금제 카드 묶음: 겹쳐 둔 카드를 좌우로 넘기거나 눌러서 앞으로 꺼낸다 */
  const deck = $("[data-deck]");
  if (deck) {
    const slides = $$("[data-slide]", deck);
    const dots = $$("[data-dot]", deck);
    let cur = Math.max(0, slides.findIndex((s) => s.dataset.start === "1"));
    const go = (i) => {
      cur = Math.max(0, Math.min(slides.length - 1, i));
      slides.forEach((s, k) => {
        const o = k - cur;
        s.style.setProperty("--o", o);
        s.style.setProperty("--a", Math.abs(o));
        s.classList.toggle("is-active", o === 0);
        s.classList.toggle("is-after", o > 0);
        s.setAttribute("aria-hidden", String(o !== 0));
      });
      dots.forEach((d, k) => d.setAttribute("aria-current", String(k === cur)));
      $("[data-deck-prev]", deck).disabled = cur === 0;
      $("[data-deck-next]", deck).disabled = cur === slides.length - 1;
    };
    deck.classList.add("is-ready");
    go(cur);
    $("[data-deck-prev]", deck).addEventListener("click", () => go(cur - 1));
    $("[data-deck-next]", deck).addEventListener("click", () => go(cur + 1));
    dots.forEach((d, i) => d.addEventListener("click", () => go(i)));
    // 좌우로 넘기기: 가로로 40px 넘게 움직였을 때만 넘긴다 (세로 스크롤은 그대로)
    const track = $(".plans", deck);
    let sx = 0, sy = 0, down = false, swiped = false;
    track.addEventListener("pointerdown", (e) => { down = true; swiped = false; sx = e.clientX; sy = e.clientY; });
    track.addEventListener("pointerup", (e) => {
      if (!down) return;
      down = false;
      const dx = e.clientX - sx, dy = e.clientY - sy;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.2) { swiped = true; go(cur + (dx < 0 ? 1 : -1)); }
    });
    track.addEventListener("pointercancel", () => { down = false; });
    // 뒤에 있는 카드를 누르면 앞으로 나온다
    track.addEventListener("click", (e) => {
      if (swiped) { e.preventDefault(); swiped = false; return; }
      const s = e.target.closest("[data-slide]");
      if (s && !s.classList.contains("is-active")) { e.preventDefault(); go(slides.indexOf(s)); }
    });
    deck.addEventListener("keydown", (e) => {
      if (e.key === "ArrowLeft") go(cur - 1);
      if (e.key === "ArrowRight") go(cur + 1);
    });
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
