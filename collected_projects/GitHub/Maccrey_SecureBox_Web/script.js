'use strict';

(function () {
  const menuButton = document.querySelector('.menu-toggle');
  const nav = document.querySelector('.nav-links');
  if (menuButton && nav) {
    menuButton.addEventListener('click', () => {
      const open = menuButton.getAttribute('aria-expanded') !== 'true';
      menuButton.setAttribute('aria-expanded', String(open));
      menuButton.setAttribute('aria-label', open ? '메뉴 닫기' : '메뉴 열기');
      nav.classList.toggle('is-open', open);
    });
    nav.querySelectorAll('a').forEach(anchor => {
      anchor.addEventListener('click', () => {
        nav.classList.remove('is-open');
        menuButton.setAttribute('aria-expanded', 'false');
        menuButton.setAttribute('aria-label', '메뉴 열기');
      });
    });
  }

  let billing = 'monthly';
  const monthButton = document.getElementById('monthly');
  const yearButton = document.getElementById('yearly');
  const seatInput = document.getElementById('seat-count');
  const seatOutput = document.getElementById('seat-output');
  const total = document.getElementById('total-price');
  const note = document.getElementById('calc-note');

  function renderPrice() {
    const annual = billing === 'yearly';
    const seats = seatInput ? Number(seatInput.value) : 5;
    if (monthButton) {
      monthButton.classList.toggle('active', !annual);
      monthButton.setAttribute('aria-pressed', String(!annual));
    }
    if (yearButton) {
      yearButton.classList.toggle('active', annual);
      yearButton.setAttribute('aria-pressed', String(annual));
    }
    const t = document.getElementById('team-price');
    const b = document.getElementById('business-price');
    const tp = document.getElementById('team-period');
    const bp = document.getElementById('business-period');
    if (t) t.textContent = annual ? '$10' : '$12';
    if (b) b.textContent = annual ? '$20' : '$24';
    if (tp) tp.textContent = annual ? '1인 / 월 환산 · 연 $120' : '1인 / 월';
    if (bp) bp.textContent = annual ? '1인 / 월 환산 · 연 $240' : '1인 / 월';
    if (seatOutput) seatOutput.textContent = seats + '명';
    if (total) {
      const sum = annual ? seats * 120 : seats * 12;
      total.textContent = '$' + sum.toLocaleString('en-US');
      const small = document.createElement('small');
      small.textContent = annual ? '/ 년 선불' : '/ 월';
      total.appendChild(document.createTextNode(' '));
      total.appendChild(small);
    }
    if (note) note.textContent = (annual ? '연간 선불 · ' : '월간 · ') + seats + '명 기준, Team 최소 2석';
  }
  if (monthButton) monthButton.addEventListener('click', () => { billing = 'monthly'; renderPrice(); });
  if (yearButton) yearButton.addEventListener('click', () => { billing = 'yearly'; renderPrice(); });
  if (seatInput) seatInput.addEventListener('input', renderPrice);
  renderPrice();

  // 공개 페이지 전용 사례 필터: 개인 정보 수집·외부 통신 없음.
  const filterButtons = document.querySelectorAll('[data-story-filter]');
  const storyCards = document.querySelectorAll('.comic-episode');
  const countLabel = document.getElementById('comic-result');
  filterButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const category = button.dataset.storyFilter;
      filterButtons.forEach((b) => {
        const selected = b === button;
        b.classList.toggle('is-active', selected);
        b.setAttribute('aria-pressed', String(selected));
      });
      let count = 0;
      storyCards.forEach((card) => {
        const show = category === 'all' || card.dataset.audience.split(' ').includes(category);
        card.hidden = !show;
        if (show) count += 1;
      });
      if (countLabel) countLabel.textContent = `${count}개의 이야기를 보여드립니다.`;
    });
  });

  // 브랜드 애니메이션은 마지막에 '닫힌 자물쇠 하나'로 명시적으로 고정한다.
  // CSS animation-fill-mode만 의존하지 않아 브라우저별 마지막 프레임 차이를 피한다.
  const brandHeaders = document.querySelectorAll('.brand-header');
  const reduceBrandMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  brandHeaders.forEach((brand) => {
    const finalGlyph = brand.querySelector('.brand-final-lock-glyph');
    if (!finalGlyph) return;
    const finishBrand = () => brand.classList.add('is-brand-final');
    if (reduceBrandMotion) {
      finishBrand();
      return;
    }
    finalGlyph.addEventListener('animationend', (event) => {
      if (event.animationName === 'brandFinalLockClean') finishBrand();
    }, { once: true });
    // animationend가 누락되는 환경에 대한 안전장치.
    const durationValue = getComputedStyle(brand).getPropertyValue('--brand-duration').trim();
    const brandDurationMs = durationValue.endsWith('ms')
      ? Number.parseFloat(durationValue)
      : Number.parseFloat(durationValue || '6.8') * 1000;
    window.setTimeout(finishBrand, brandDurationMs + 120);
  });

})();
