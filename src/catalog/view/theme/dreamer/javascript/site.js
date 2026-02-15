/**
 * DREAMER THEME - SITE.JS
 * Purpose: Reusable UI components (called by page-specific scripts or twig templates)
 *
 * Global handlers (sticky header, mobile menu, search focus, navbar toggle)
 * have been moved to app.js which loads on every page.
 */

'use strict';

/* =====================================================================
   CUSTOM SLIDESHOW
   Called by home.js: initCustomSlideshow('custom-slideshow')
   ===================================================================== */

function initCustomSlideshow(id) {
    var container = document.getElementById(id);
    if (!container) return;

    var slides = container.querySelectorAll('.custom-slide');
    var dots   = container.querySelectorAll('.custom-dot');
    var prevBtn = container.querySelector('.custom-slide-prev');
    var nextBtn = container.querySelector('.custom-slide-next');
    var currentIndex = 0;
    var interval;

    function showSlide(index) {
        if (index >= slides.length) index = 0;
        if (index < 0) index = slides.length - 1;

        slides.forEach(function (slide) { slide.classList.remove('active'); });
        dots.forEach(function (dot) { dot.classList.remove('active'); });

        slides[index].classList.add('active');
        if (dots[index]) dots[index].classList.add('active');
        currentIndex = index;
    }

    function nextSlide() { showSlide(currentIndex + 1); }
    function prevSlide() { showSlide(currentIndex - 1); }

    function startAutoPlay() {
        stopAutoPlay();
        interval = setInterval(nextSlide, 5000);
    }

    function stopAutoPlay() {
        if (interval) clearInterval(interval);
    }

    if (nextBtn) nextBtn.addEventListener('click', function () { nextSlide(); startAutoPlay(); });
    if (prevBtn) prevBtn.addEventListener('click', function () { prevSlide(); startAutoPlay(); });

    dots.forEach(function (dot, i) {
        dot.addEventListener('click', function () { showSlide(i); startAutoPlay(); });
    });

    /* Touch / swipe support */
    var touchStartX = 0;

    container.addEventListener('touchstart', function (e) {
        touchStartX = e.changedTouches[0].screenX;
        stopAutoPlay();
    }, { passive: true });

    container.addEventListener('touchend', function (e) {
        var diff = e.changedTouches[0].screenX - touchStartX;
        if (diff < -50) nextSlide();
        else if (diff > 50) prevSlide();
        startAutoPlay();
    }, { passive: true });

    container.addEventListener('mouseenter', stopAutoPlay);
    container.addEventListener('mouseleave', startAutoPlay);

    showSlide(0);
    startAutoPlay();
}
