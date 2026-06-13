import Lenis from 'lenis';

/**
 * Smooth scroll (Lenis) + lightweight scroll-reveal + nav chrome.
 * Reveals use IntersectionObserver rather than GSAP/ScrollTrigger to keep the
 * hub's JS budget small (the perf target in the spec). Lenis stays for the
 * smooth in-page feel. The hero owns the heavy code; the hub stays light.
 */

const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const revealEls = document.querySelectorAll<HTMLElement>('[data-reveal]');
const revealAll = () => revealEls.forEach((el) => el.classList.add('is-in'));

// --- smooth scroll (skipped under reduced motion) ---
if (!reduce) {
  try {
    const lenis = new Lenis({ duration: 1.1, smoothWheel: true });
    const raf = (time: number) => {
      lenis.raf(time);
      requestAnimationFrame(raf);
    };
    requestAnimationFrame(raf);

    document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]').forEach((a) => {
      a.addEventListener('click', (e) => {
        const hash = a.getAttribute('href');
        if (!hash || hash === '#') return;
        const target = document.querySelector<HTMLElement>(hash);
        if (!target) return;
        e.preventDefault();
        lenis.scrollTo(target, { offset: -56 });
        history.replaceState(null, '', hash);
        // move keyboard focus to the target (skip-link / nav a11y)
        target.focus({ preventScroll: true });
      });
    });
  } catch {
    /* native scrolling is a fine fallback */
  }
}

// --- scroll reveal ---
if ('IntersectionObserver' in window) {
  const io = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in');
          obs.unobserve(entry.target);
        }
      });
    },
    { rootMargin: '0px 0px -12% 0px', threshold: 0.08 }
  );
  revealEls.forEach((el) => io.observe(el));
} else {
  revealAll();
}

// --- nav chrome: scrolled state + active section ---
const navEl = document.querySelector('[data-nav]');
const onScroll = () => navEl?.toggleAttribute('data-scrolled', window.scrollY > 8);
onScroll();
window.addEventListener('scroll', onScroll, { passive: true });

const links = new Map<string, Element>();
document.querySelectorAll<HTMLAnchorElement>('[data-nav] a[href^="#"]').forEach((a) => {
  const id = a.getAttribute('href')!.slice(1);
  if (id) links.set(id, a);
});
if ('IntersectionObserver' in window) {
  const spy = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        links.forEach((a) => a.removeAttribute('aria-current'));
        links.get((entry.target as HTMLElement).id)?.setAttribute('aria-current', 'true');
      });
    },
    { rootMargin: '-45% 0px -50% 0px' }
  );
  document.querySelectorAll('main section[id]').forEach((s) => spy.observe(s));
}
