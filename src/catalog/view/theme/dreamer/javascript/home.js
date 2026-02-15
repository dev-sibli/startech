/**
 * DREAMER THEME - HOME.JS
 * Homepage-specific JavaScript.
 * Depends on: site.js (initCustomSlideshow), app.js — both loaded globally.
 */

'use strict';

document.addEventListener('DOMContentLoaded', function () {

    /* Initialize the main banner slideshow.
       The slideshow wrapper must have id="custom-slideshow" in home.twig */
    initCustomSlideshow('custom-slideshow');

});
