/* Visual-only enhancements for DubaiParfums. No data writes or Supabase access. */
(() => {
  'use strict';
  const nav = document.getElementById('main-nav');
  const menu = document.getElementById('mobile-menu-toggle');
  if (menu && nav) {
    const closeMenu = () => { nav.classList.remove('is-open'); menu.setAttribute('aria-expanded', 'false'); menu.setAttribute('aria-label', 'Abrir menú'); };
    menu.addEventListener('click', () => {
      const opened = nav.classList.toggle('is-open');
      menu.setAttribute('aria-expanded', String(opened));
      menu.setAttribute('aria-label', opened ? 'Cerrar menú' : 'Abrir menú');
    });
    nav.querySelectorAll('a').forEach(a => a.addEventListener('click', closeMenu));
    window.addEventListener('resize', () => { if (window.innerWidth > 820) closeMenu(); });
    document.addEventListener('keydown', event => { if (event.key === 'Escape') closeMenu(); });
  }
  document.querySelectorAll('[data-filter-gender]').forEach(card => {
    card.addEventListener('click', () => {
      const filter = document.getElementById('gender-filter');
      if (filter) { filter.value = card.dataset.filterGender; filter.dispatchEvent(new Event('change', { bubbles: true })); }
    });
  });
  const motionOK = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && motionOK) {
    const observer = new IntersectionObserver((entries, self) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) { entry.target.classList.add('is-visible'); self.unobserve(entry.target); }
      });
    }, { threshold: .12, rootMargin: '0px 0px 70px 0px' });
    reveals.forEach(item => observer.observe(item));
  } else reveals.forEach(item => item.classList.add('is-visible'));
})();
