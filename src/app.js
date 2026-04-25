/**
 * スライド操作ロジック
 */

const slides = Array.from(document.querySelectorAll('.slide'));
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const indicator = document.getElementById('slide-indicator');
let currentIndex = 0;

function showSlide(index) {
  if (!slides.length) return;
  currentIndex = (index + slides.length) % slides.length;

  slides.forEach((slide, i) => {
    slide.classList.toggle('active', i === currentIndex);
  });

  if (indicator) {
    indicator.textContent = `${currentIndex + 1} / ${slides.length}`;
  }
}

function nextSlide() {
  showSlide(currentIndex + 1);
}

function prevSlide() {
  showSlide(currentIndex - 1);
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
  showSlide(0);
});
