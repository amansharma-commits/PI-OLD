/* Project Inclusion — interactions
   Progressive enhancement: the page is fully readable without this script. */
(() => {
  "use strict";

  const root = document.documentElement;
  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Header: shrink + shadow on scroll, reading progress ---------- */
  const header = document.querySelector(".site-header");
  const progress = document.querySelector(".scroll-progress");
  let ticking = false;

  const onScroll = () => {
    const y = window.scrollY;
    header.classList.toggle("is-scrolled", y > 24);

    const max = root.scrollHeight - window.innerHeight;
    const ratio = max > 0 ? Math.min(Math.max(y / max, 0), 1) : 0;
    progress.style.transform = `scaleX(${ratio})`;
    ticking = false;
  };

  window.addEventListener(
    "scroll",
    () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(onScroll);
      }
    },
    { passive: true }
  );
  onScroll();

  /* ---------- Mobile navigation ---------- */
  const toggle = document.querySelector(".nav-toggle");
  const nav = document.getElementById("site-nav");

  const setNav = (open) => {
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    nav.classList.toggle("is-open", open);
  };

  toggle.addEventListener("click", () => {
    setNav(toggle.getAttribute("aria-expanded") !== "true");
  });

  nav.querySelectorAll("a").forEach((a) =>
    a.addEventListener("click", () => setNav(false))
  );

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") setNav(false);
  });

  /* ---------- Scroll reveal ---------- */
  const revealEls = document.querySelectorAll("[data-reveal]");

  if ("IntersectionObserver" in window && !prefersReduced) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-in");
            // Count up any stat once it is on screen
            entry.target.querySelectorAll("[data-count]").forEach(countUp);
            if (entry.target.matches("[data-count]")) countUp(entry.target);
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.18, rootMargin: "0px 0px -6% 0px" }
    );
    revealEls.forEach((el) => io.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add("is-in"));
  }

  /* ---------- Counters (stats) ---------- */
  function countUp(el) {
    if (el.dataset.counted) return;
    el.dataset.counted = "1";

    const target = parseFloat(el.dataset.count);
    const suffix = el.dataset.suffix || "";
    if (Number.isNaN(target)) return;
    if (prefersReduced) {
      el.textContent = target + suffix;
      return;
    }

    const duration = 1600;
    const start = performance.now();
    const easeOut = (t) => 1 - Math.pow(1 - t, 4);

    const frame = (now) => {
      const t = Math.min((now - start) / duration, 1);
      const value = Math.round(target * easeOut(t));
      el.textContent = value + suffix;
      if (t < 1) requestAnimationFrame(frame);
    };
    el.textContent = "0" + suffix;
    requestAnimationFrame(frame);
  }

  /* ---------- Carousels ---------- */
  document.querySelectorAll("[data-carousel-prev], [data-carousel-next]").forEach((btn) => {
    const dir = btn.hasAttribute("data-carousel-next") ? 1 : -1;
    const id = btn.getAttribute(dir > 0 ? "data-carousel-next" : "data-carousel-prev");
    const track = document.getElementById(id);
    if (!track) return;

    const step = () => {
      const card = track.firstElementChild;
      if (!card) return track.clientWidth * 0.8;
      const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
      return card.getBoundingClientRect().width + gap;
    };

    btn.addEventListener("click", () => {
      track.scrollBy({ left: dir * step(), behavior: "smooth" });
    });

    // Keep the arrows honest about the available range
    const sync = () => {
      const max = track.scrollWidth - track.clientWidth - 2;
      if (dir < 0) btn.disabled = track.scrollLeft <= 2;
      else btn.disabled = track.scrollLeft >= max;
    };
    track.addEventListener("scroll", sync, { passive: true });
    window.addEventListener("resize", sync);
    sync();
  });

  /* ---------- Drag-to-scroll for carousels (mouse) ---------- */
  document.querySelectorAll(".carousel").forEach((track) => {
    let down = false;
    let startX = 0;
    let startLeft = 0;
    let moved = false;

    track.addEventListener("pointerdown", (e) => {
      if (e.pointerType !== "mouse") return;
      down = true;
      moved = false;
      startX = e.clientX;
      startLeft = track.scrollLeft;
      track.style.scrollBehavior = "auto";
      track.style.scrollSnapType = "none";
    });

    window.addEventListener("pointermove", (e) => {
      if (!down) return;
      const dx = e.clientX - startX;
      if (Math.abs(dx) > 4) moved = true;
      track.scrollLeft = startLeft - dx;
    });

    const end = () => {
      if (!down) return;
      down = false;
      track.style.scrollBehavior = "";
      track.style.scrollSnapType = "";
    };
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);

    // Swallow the click that follows a drag so links don't fire by accident
    track.addEventListener(
      "click",
      (e) => {
        if (moved) {
          e.preventDefault();
          e.stopPropagation();
          moved = false;
        }
      },
      true
    );
  });

  /* ---------- Partner marquee: pause when tab hidden (battery-friendly) ---------- */
  document.addEventListener("visibilitychange", () => {
    document.querySelectorAll(".marquee-track").forEach((t) => {
      t.style.animationPlayState = document.hidden ? "paused" : "";
    });
  });

  /* ---------- Hero banner slider (3 banners, autoplay, dots) ---------- */
  const heroCard = document.querySelector(".hero-card");
  const slides = [...document.querySelectorAll(".hero-slide")];
  const dots = [...document.querySelectorAll(".hero-dots .dot")];
  const INTERVAL = 2000;
  let current = 0;
  let timer = null;

  const showSlide = (index) => {
    current = (index + slides.length) % slides.length;
    slides.forEach((slide, i) => {
      const active = i === current;
      slide.classList.toggle("is-active", active);
      slide.setAttribute("aria-hidden", String(!active));
    });
    dots.forEach((dot, i) => {
      const active = i === current;
      dot.classList.toggle("is-active", active);
      dot.setAttribute("aria-selected", String(active));
    });
  };

  const startAutoplay = () => {
    if (prefersReduced || timer) return;
    timer = setInterval(() => showSlide(current + 1), INTERVAL);
  };
  const stopAutoplay = () => {
    clearInterval(timer);
    timer = null;
  };

  if (slides.length > 1) {
    dots.forEach((dot, i) => {
      dot.addEventListener("click", () => {
        showSlide(i);
        stopAutoplay();
        startAutoplay();
      });
    });

    // Pause while the visitor is reading the banner
    heroCard.addEventListener("mouseenter", stopAutoplay);
    heroCard.addEventListener("mouseleave", startAutoplay);
    heroCard.addEventListener("focusin", stopAutoplay);
    heroCard.addEventListener("focusout", startAutoplay);

    document.addEventListener("visibilitychange", () => {
      if (document.hidden) stopAutoplay();
      else startAutoplay();
    });

    startAutoplay();
  }

  /* ---------- Carousel arrows: show only when the cards overflow the track ---------- */
  const syncCarouselControls = () => {
    document.querySelectorAll("[data-carousel-next]").forEach((btn) => {
      const track = document.getElementById(btn.getAttribute("data-carousel-next"));
      const controls = btn.closest(".carousel-controls");
      if (!track || !controls) return;
      const overflows = track.scrollWidth - track.clientWidth > 2;
      controls.classList.toggle("is-hidden", !overflows);
    });
  };
  syncCarouselControls();
  window.addEventListener("resize", syncCarouselControls);

  /* ---------- One-page navigation: highlight the nav item for the section in view ---------- */
  const navLinks = [...document.querySelectorAll(".nav-list a[href^='#']")];
  const spyTargets = navLinks
    .map((a) => document.querySelector(a.getAttribute("href")))
    .filter(Boolean);

  // Scroll-based check: the active section is the last one whose top has passed a line
  // 40% down the viewport. Works without relying on IntersectionObserver timing.
  const updateActiveNav = () => {
    const line = window.innerHeight * 0.4;
    let current = null;
    spyTargets.forEach((t) => {
      if (t.getBoundingClientRect().top <= line) current = t.id;
    });
    navLinks.forEach((a) =>
      a.classList.toggle("is-active", current !== null && a.getAttribute("href") === "#" + current)
    );
  };
  if (spyTargets.length) {
    window.addEventListener("scroll", updateActiveNav, { passive: true });
    window.addEventListener("resize", updateActiveNav);
    updateActiveNav();
  }
})();
