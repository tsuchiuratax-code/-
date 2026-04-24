/**
 * スライドデッキ制御
 */

const slides = Array.from(document.querySelectorAll('.slide'));
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const dotsEl = document.getElementById('dots');

let currentSlide = 0;

function renderDots() {
  if (!dotsEl) return;
  dotsEl.innerHTML = '';

  slides.forEach((_, idx) => {
    const dot = document.createElement('button');
    dot.className = `dot ${idx === currentSlide ? 'active' : ''}`;
    dot.type = 'button';
    dot.setAttribute('aria-label', `slide ${idx + 1}`);
    dot.addEventListener('click', () => goToSlide(idx));
    dotsEl.appendChild(dot);
  });
}

function goToSlide(index) {
  if (!slides.length) return;

  currentSlide = (index + slides.length) % slides.length;
  slides.forEach((slide, idx) => {
    slide.classList.toggle('active', idx === currentSlide);
  });

  renderDots();
}

function nextSlide() {
  goToSlide(currentSlide + 1);
}

function prevSlide() {
  goToSlide(currentSlide - 1);
}

if (nextBtn) {
  nextBtn.addEventListener('click', nextSlide);
}

if (prevBtn) {
  prevBtn.addEventListener('click', prevSlide);
}

document.addEventListener('keydown', (event) => {
  if (event.key === 'ArrowRight') nextSlide();
  if (event.key === 'ArrowLeft') prevSlide();
});

document.addEventListener('DOMContentLoaded', () => {
  goToSlide(0);
});
