(() => {
  'use strict';

  // 1. Transparent Header with Scroll Blur
  const header = document.getElementById('site-header');
  const handleScroll = () => {
    if (!header) return;
    if (window.scrollY > 24) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  };

  window.addEventListener('scroll', handleScroll, { passive: true });
  handleScroll();

  // 2. Mobile Navigation Toggle
  const menuToggle = document.getElementById('menu-toggle');
  const nav = document.getElementById('header-nav');

  if (menuToggle && nav) {
    const toggleMenu = (open) => {
      const isExpanded = open !== undefined ? open : menuToggle.getAttribute('aria-expanded') !== 'true';
      menuToggle.setAttribute('aria-expanded', isExpanded);
      nav.classList.toggle('is-open', isExpanded);
    };

    menuToggle.addEventListener('click', () => toggleMenu());

    nav.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => toggleMenu(false));
    });

    document.addEventListener('click', (event) => {
      if (
        nav.classList.contains('is-open') &&
        !nav.contains(event.target) &&
        !menuToggle.contains(event.target)
      ) {
        toggleMenu(false);
      }
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && nav.classList.contains('is-open')) {
        toggleMenu(false);
        menuToggle.focus();
      }
    });
  }

  // 3. Hero Pure Photo Slider: As Fotos Preenchendo 100% de todo o Hero
  const heroImages = document.querySelectorAll('.hero-backdrop');
  const heroDots = document.querySelectorAll('.hero-dot');

  if (heroImages.length > 0) {
    let currentHeroIndex = 0;
    let heroTimer = null;
    const totalHeroImages = heroImages.length;

    const setHeroSlide = (idx) => {
      currentHeroIndex = (idx + totalHeroImages) % totalHeroImages;

      heroImages.forEach((img, i) => {
        img.classList.toggle('is-active', i === currentHeroIndex);
      });

      heroDots.forEach((dot, i) => {
        dot.classList.toggle('is-active', i === currentHeroIndex);
      });
    };

    const startHeroRotation = () => {
      stopHeroRotation();
      heroTimer = setInterval(() => {
        setHeroSlide(currentHeroIndex + 1);
      }, 4200);
    };

    const stopHeroRotation = () => {
      if (heroTimer) {
        clearInterval(heroTimer);
        heroTimer = null;
      }
    };

    heroDots.forEach((dot) => {
      dot.addEventListener('click', () => {
        const idx = parseInt(dot.dataset.index, 10);
        setHeroSlide(idx);
        startHeroRotation();
      });
    });

    const heroSection = document.getElementById('hero');
    if (heroSection) {
      heroSection.addEventListener('mouseenter', stopHeroRotation);
      heroSection.addEventListener('mouseleave', startHeroRotation);
    }

    startHeroRotation();
  }

  // 4. Testimonials Marquee: Infinite Horizontal Scroll
  const track = document.getElementById('testimonials-track');
  const marqueeWrapper = document.getElementById('testimonials-marquee');

  if (track && marqueeWrapper) {
    // Clone cards to ensure seamless continuous scroll
    const originalCards = Array.from(track.children);
    originalCards.forEach((card) => {
      const clone = card.cloneNode(true);
      clone.setAttribute('aria-hidden', 'true');
      track.appendChild(clone);
    });

    // Touch & Mouse Drag scroll support
    let isDown = false;
    let startX = 0;
    let scrollLeft = 0;

    marqueeWrapper.addEventListener('mousedown', (e) => {
      isDown = true;
      startX = e.pageX - marqueeWrapper.offsetLeft;
      scrollLeft = marqueeWrapper.scrollLeft;
      track.style.animationPlayState = 'paused';
    });

    marqueeWrapper.addEventListener('mouseleave', () => {
      isDown = false;
      track.style.animationPlayState = 'running';
    });

    marqueeWrapper.addEventListener('mouseup', () => {
      isDown = false;
      track.style.animationPlayState = 'running';
    });

    marqueeWrapper.addEventListener('mousemove', (e) => {
      if (!isDown) return;
      e.preventDefault();
      const x = e.pageX - marqueeWrapper.offsetLeft;
      const walk = (x - startX) * 1.5;
      marqueeWrapper.scrollLeft = scrollLeft - walk;
    });
  }

  // 5. Smooth Scroll Animations
  const animatedElements = document.querySelectorAll('.animate-on-scroll');

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            obs.unobserve(entry.target);
          }
        });
      },
      {
        rootMargin: '0px 0px -40px 0px',
        threshold: 0.1,
      }
    );

    animatedElements.forEach((el) => observer.observe(el));
  } else {
    animatedElements.forEach((el) => el.classList.add('is-visible'));
  }
})();
