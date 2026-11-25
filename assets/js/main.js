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

  let lastY = window.scrollY;
  const HIDE_AFTER = 120; // never hide while still near the top of the page
  const DELTA = 6;        // ignore tiny scroll jitters

  const onScroll = () => {
    const y = window.scrollY;
    header.classList.toggle("is-scrolled", y > 24);

    // Smart header: hide while scrolling down, show again on any scroll up
    const menuOpen = document.getElementById("site-nav")?.classList.contains("is-open");
    if (menuOpen || y < HIDE_AFTER) {
      header.classList.remove("is-hidden");
    } else if (y > lastY + DELTA) {
      header.classList.add("is-hidden");
    } else if (y < lastY - DELTA) {
      header.classList.remove("is-hidden");
    }
    if (Math.abs(y - lastY) > DELTA) lastY = y;

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
  // Keyboard users tabbing into the header must always see it
  header.addEventListener("focusin", () => header.classList.remove("is-hidden"));

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
    // The track has a little padding and scroll-snap, so "at the very start" rests a few px
    // away from 0 (e.g. scrollLeft 4). Allow for that, otherwise the previous arrow looks
    // active on first load.
    const sync = () => {
      const cs = getComputedStyle(track);
      const padL = parseFloat(cs.paddingLeft) || 0;
      const padR = parseFloat(cs.paddingRight) || 0;
      const tolerance = 3;
      const max = track.scrollWidth - track.clientWidth - padR - tolerance;
      if (dir < 0) btn.disabled = track.scrollLeft <= padL + tolerance;
      else btn.disabled = track.scrollLeft >= max;
    };
    track.addEventListener("scroll", sync, { passive: true });
    window.addEventListener("resize", sync);
    window.addEventListener("load", sync); // once images and fonts have settled the layout
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
  const INTERVAL = 4000;
  let current = 0;
  let timer = null;

  // The outgoing slide stays opaque underneath while the new one fades in on top
  const LEAVE_MS = 4000;
  let leaveTimer = null;

  const showSlide = (index) => {
    const next = (index + slides.length) % slides.length;
    if (next === current) return;

    const prev = slides[current];
    heroCard.classList.add("is-playing"); // enables the wipe transition (not on first paint)
    slides.forEach((slide) => slide.classList.remove("is-leaving"));
    prev.classList.add("is-leaving");
    // Keep the old slide underneath until the new one has FINISHED wiping in (even if the
    // device drops frames); the timer is only a safety net.
    const target = slides[next];
    const onEnd = (e) => {
      if (e.target !== target || e.animationName !== "heroWipe") return;
      target.removeEventListener("animationend", onEnd);
      prev.classList.remove("is-leaving");
    };
    target.addEventListener("animationend", onEnd);
    clearTimeout(leaveTimer);
    leaveTimer = setTimeout(() => prev.classList.remove("is-leaving"), LEAVE_MS);

    current = next;
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
    // Always auto-advance (a simple fade); hover / keyboard focus / video pop-up pause it
    if (timer) return;
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

    // Pause while a mouse rests on the banner (touch taps must not leave it stuck paused)
    heroCard.addEventListener("pointerenter", (e) => {
      if (e.pointerType === "mouse") stopAutoplay();
    });
    heroCard.addEventListener("pointerleave", (e) => {
      if (e.pointerType === "mouse") startAutoplay();
    });
    // Pause for keyboard focus only; a mouse click that focuses a button must not stop it for good
    heroCard.addEventListener("focusin", (e) => {
      if (e.target.matches(":focus-visible")) stopAutoplay();
    });
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

  /* ---------- Video pop-up player ---------- */
  const videoTriggers = [...document.querySelectorAll("[data-video]")];
  const videoModal = document.querySelector(".video-modal");

  if (videoTriggers.length && videoModal) {
    const frame = videoModal.querySelector(".video-modal__frame");
    const closeBtn = videoModal.querySelector(".video-modal__close");
    let returnFocus = null;

    // Turn a YouTube link into an embeddable URL (null when it is not a YouTube link)
    const toYouTubeEmbed = (raw) => {
      try {
        const u = new URL(raw, location.href);
        const host = u.hostname.replace(/^www\./, "");
        let id = "";
        if (host === "youtu.be") id = u.pathname.slice(1);
        else if (host.endsWith("youtube.com")) {
          id = u.searchParams.get("v") || (u.pathname.startsWith("/embed/") ? u.pathname.split("/")[2] : "");
        }
        return id ? `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0` : null;
      } catch {
        return null;
      }
    };

    const openVideo = (node) => {
      returnFocus = document.activeElement;
      stopAutoplay();
      frame.classList.toggle("is-image", node.tagName === "IMG");
      frame.replaceChildren(node);
      videoModal.hidden = false;
      document.body.style.overflow = "hidden";
      requestAnimationFrame(() => videoModal.classList.add("is-open"));
      closeBtn.focus();
    };

    const closeVideo = () => {
      videoModal.classList.remove("is-open");
      document.body.style.overflow = "";
      // Remove the player so playback stops, after the fade-out
      setTimeout(() => {
        videoModal.hidden = true;
        frame.replaceChildren();
      }, prefersReduced ? 0 : 300);
      startAutoplay(); // before restoring focus, so keyboard focus can still pause it
      if (returnFocus) returnFocus.focus();
    };

    videoTriggers.forEach((videoThumb) => videoThumb.addEventListener("click", () => {
      const src = (videoThumb.dataset.video || "").trim();

      if (!src) {
        // No video link set yet: show the poster image in the pop-up for now
        const poster = videoThumb.querySelector(".thumb-img");
        const img = document.createElement("img");
        img.src = poster ? poster.getAttribute("src") : "";
        img.alt = "Conversations with Project Inclusion: When Dyslexia Comes Home, with Dr. Bhuvana Vasudevan";
        openVideo(img);
        return;
      }

      const embed = toYouTubeEmbed(src);
      if (embed) {
        const iframe = document.createElement("iframe");
        iframe.src = embed;
        iframe.title = "Project Inclusion video";
        iframe.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen";
        iframe.allowFullscreen = true;
        openVideo(iframe);
      } else if (/\.(mp4|webm|ogg)(\?|$)/i.test(src)) {
        const video = document.createElement("video");
        video.src = src;
        video.controls = true;
        video.autoplay = true;
        video.playsInline = true;
        openVideo(video);
      } else {
        window.open(src, "_blank", "noopener,noreferrer");
      }
    }));

    videoModal.querySelectorAll("[data-close-video]").forEach((el) => el.addEventListener("click", closeVideo));
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !videoModal.hidden) closeVideo();
    });
  }

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
