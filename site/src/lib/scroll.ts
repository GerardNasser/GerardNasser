/**
 * Lightweight scroll-reveal + nav chrome. Reveals use IntersectionObserver;
 * anchor scrolling is native (CSS scroll-behavior + scroll-margin-top).
 */

// tells the inline guard in Base.astro that reveals are being handled
(window as Window & { __revealReady?: boolean }).__revealReady = true;

const revealEls = document.querySelectorAll<HTMLElement>('[data-reveal]');
const revealAll = () => revealEls.forEach((el) => el.classList.add('is-in'));

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

// --- nav chrome: scrolled state + scroll progress + active section ---
const navEl = document.querySelector('[data-nav]');
const progressEl = document.querySelector<HTMLElement>('[data-nav-progress]');
const onScroll = () => {
  navEl?.toggleAttribute('data-scrolled', window.scrollY > 8);
  if (progressEl) {
    const doc = document.documentElement;
    const max = doc.scrollHeight - doc.clientHeight;
    const pct = max > 0 ? (window.scrollY / max) * 100 : 0;
    progressEl.style.setProperty('--progress', `${pct.toFixed(2)}%`);
  }
};
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
