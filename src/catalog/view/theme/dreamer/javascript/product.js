/**
 * DREAMER THEME - PRODUCT.JS
 * Product detail page: lightbox, tabs, thumbnail swap, option pills,
 * qty stepper, add-to-cart with cart popup, copy link, review form,
 * file upload, recurring description, rating stars.
 * No jQuery. Uses fetch() and native <dialog>.
 */

'use strict';

document.addEventListener('DOMContentLoaded', function () {

    var dataEl     = document.getElementById('product-data');
    var productId  = dataEl ? dataEl.getAttribute('data-product-id') : '';
    var reviewOn   = dataEl ? dataEl.getAttribute('data-review-status') === '1' : false;

    /* =================================================================
       SECTION NAV — scroll to sections (replaces tab show/hide)
       ================================================================= */

    var tabLinks   = document.querySelectorAll('.product-tab-link');
    var sections   = document.querySelectorAll('.product-section');
    var navBar     = document.querySelector('.product-tabs');
    var navOffset  = navBar ? navBar.offsetHeight + 16 : 60;

    tabLinks.forEach(function (link) {
        link.addEventListener('click', function (e) {
            e.preventDefault();
            var targetId = this.getAttribute('href').replace('#', '');
            var section  = document.getElementById(targetId);
            if (section) {
                var top = section.getBoundingClientRect().top + window.pageYOffset - navOffset - 8;
                window.scrollTo({ top: top, behavior: 'smooth' });
            }
            tabLinks.forEach(function (l) { l.closest('.product-tab-item').classList.remove('active'); });
            this.closest('.product-tab-item').classList.add('active');
        });
    });

    /* Scroll spy — highlight active tab based on scroll position */
    function updateActiveTab() {
        var scrollY = window.pageYOffset + navOffset + 40;
        var activeLink = null;
        sections.forEach(function (sec) {
            if (sec.offsetTop <= scrollY) {
                activeLink = document.querySelector('.product-tab-link[href="#' + sec.id + '"]');
            }
        });
        if (activeLink) {
            tabLinks.forEach(function (l) { l.closest('.product-tab-item').classList.remove('active'); });
            activeLink.closest('.product-tab-item').classList.add('active');
        }
    }
    window.addEventListener('scroll', updateActiveTab, { passive: true });

    /* Review tab links in rating section */
    document.querySelectorAll('a.review-link').forEach(function (link) {
        link.addEventListener('click', function (e) {
            e.preventDefault();
            var reviewLink = document.querySelector('.product-tab-link[href="#tab-review"]');
            if (reviewLink) reviewLink.click();
        });
    });

    /* "View More Info" link → scroll to description section */
    var viewMoreLink = document.getElementById('view-more-link');
    if (viewMoreLink) {
        viewMoreLink.addEventListener('click', function (e) {
            e.preventDefault();
            var descLink = document.querySelector('.product-tab-link[href="#tab-description"]');
            if (descLink) descLink.click();
        });
    }

    /* =================================================================
       IMAGE GALLERY — Thumbnail swap + Lightbox
       ================================================================= */

    var mainImage     = document.getElementById('main-image');
    var mainImageLink = document.getElementById('main-image-link');
    var thumbItems    = document.querySelectorAll('.product-thumb-item');

    /* Click thumbnail → swap main image, update active state */
    thumbItems.forEach(function (item) {
        var link = item.querySelector('.product-thumb-link');
        if (!link) return;

        link.addEventListener('click', function (e) {
            e.preventDefault();
            var popupSrc = link.getAttribute('href');

            if (mainImage && popupSrc) mainImage.src = popupSrc;
            if (mainImageLink && popupSrc) mainImageLink.href = popupSrc;

            thumbItems.forEach(function (t) { t.classList.remove('active'); });
            item.classList.add('active');
        });
    });

    /* Lightbox using native <dialog> */
    var productTitle = dataEl ? dataEl.getAttribute('data-product-title') : '';
    var dialog = document.createElement('dialog');
    dialog.id = 'product-lightbox';
    dialog.className = 'product-lightbox';
    dialog.innerHTML = ''
        + '<div class="product-lightbox__inner">'
        + '<button class="product-lightbox__close" aria-label="Close">'
        + '<i class="material-icons">close</i>'
        + '</button>'
        + '<button class="product-lightbox__prev" aria-label="Previous">'
        + '<i class="material-icons">chevron_left</i>'
        + '</button>'
        + '<img class="product-lightbox__img" src="" alt="" />'
        + '<button class="product-lightbox__next" aria-label="Next">'
        + '<i class="material-icons">chevron_right</i>'
        + '</button>'
        + '<div class="product-lightbox__caption">'
        + '<span class="product-lightbox__title"></span>'
        + '<span class="product-lightbox__counter"></span>'
        + '</div>'
        + '</div>';
    document.body.appendChild(dialog);

    var lightboxImg     = dialog.querySelector('.product-lightbox__img');
    var lightboxClose   = dialog.querySelector('.product-lightbox__close');
    var lightboxPrev    = dialog.querySelector('.product-lightbox__prev');
    var lightboxNext    = dialog.querySelector('.product-lightbox__next');
    var lightboxTitle   = dialog.querySelector('.product-lightbox__title');
    var lightboxCounter = dialog.querySelector('.product-lightbox__counter');

    var galleryLinks = [];
    var currentLbIdx = 0;

    function buildGallery() {
        galleryLinks = Array.from(document.querySelectorAll('#product-thumbnails .product-thumb-link'));
    }

    function openLightbox(index) {
        if (!galleryLinks.length) buildGallery();
        currentLbIdx = Math.max(0, Math.min(index, galleryLinks.length - 1));
        lightboxImg.src = galleryLinks[currentLbIdx].getAttribute('href');
        lightboxImg.alt = galleryLinks[currentLbIdx].getAttribute('title') || '';
        lightboxTitle.textContent = productTitle;
        lightboxCounter.textContent = (currentLbIdx + 1) + ' of ' + galleryLinks.length;
        dialog.showModal();
    }

    /* Click main image → open lightbox at current image */
    if (mainImageLink) {
        mainImageLink.addEventListener('click', function (e) {
            e.preventDefault();
            buildGallery();
            var activeThumb = document.querySelector('.product-thumb-item.active .product-thumb-link');
            var idx = activeThumb ? galleryLinks.indexOf(activeThumb) : 0;
            openLightbox(idx >= 0 ? idx : 0);
        });
    }

    lightboxClose.addEventListener('click', function () { dialog.close(); });
    dialog.addEventListener('click', function (e) { if (e.target === dialog) dialog.close(); });

    lightboxPrev.addEventListener('click', function () {
        openLightbox(currentLbIdx - 1 < 0 ? galleryLinks.length - 1 : currentLbIdx - 1);
    });
    lightboxNext.addEventListener('click', function () {
        openLightbox((currentLbIdx + 1) % galleryLinks.length);
    });

    document.addEventListener('keydown', function (e) {
        if (!dialog.open) return;
        if (e.key === 'Escape')     dialog.close();
        if (e.key === 'ArrowLeft')  lightboxPrev.click();
        if (e.key === 'ArrowRight') lightboxNext.click();
    });

    /* =================================================================
       OPTION PILLS (radio/select/checkbox as pill buttons)
       ================================================================= */

    document.querySelectorAll('.option-pills').forEach(function (container) {
        var type     = container.getAttribute('data-type');
        var optionId = container.getAttribute('data-option-id');
        var pills    = container.querySelectorAll('.option-pill');

        pills.forEach(function (pill) {
            pill.addEventListener('click', function () {
                var value = pill.getAttribute('data-value');

                if (type === 'checkbox') {
                    /* Toggle individual pill */
                    pill.classList.toggle('active');
                    /* Rebuild hidden inputs for checked values */
                    var fg = container.closest('.form-group');
                    fg.querySelectorAll('input[type="hidden"][name*="option"]').forEach(function (h) { h.remove(); });
                    container.querySelectorAll('.option-pill.active').forEach(function (activePill) {
                        var input = document.createElement('input');
                        input.type = 'hidden';
                        input.name = 'option[' + optionId + '][]';
                        input.value = activePill.getAttribute('data-value');
                        fg.appendChild(input);
                    });
                } else {
                    /* Single select: radio or select */
                    pills.forEach(function (p) { p.classList.remove('active'); });
                    pill.classList.add('active');
                    var hidden = document.getElementById('input-option' + optionId);
                    if (hidden) hidden.value = value;
                }
            });
        });
    });

    /* =================================================================
       OPTION PRICE UPDATE — recalculate displayed prices on pill click
       ================================================================= */

    var basePrice   = parseFloat(dataEl ? dataEl.getAttribute('data-price-raw') : 0) || 0;
    var baseSpecial = parseFloat(dataEl ? dataEl.getAttribute('data-special-raw') : 0) || 0;
    var currLeft    = dataEl ? dataEl.getAttribute('data-currency-left') : '';
    var currRight   = dataEl ? dataEl.getAttribute('data-currency-right') : '';

    function formatPrice(num) {
        var parts = num.toFixed(0).split('.');
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        return currLeft + parts.join('.') + currRight;
    }

    function recalcPrices() {
        var delta = 0;
        document.querySelectorAll('.option-pill.active').forEach(function (pill) {
            var raw    = parseFloat(pill.getAttribute('data-price-raw')) || 0;
            var prefix = pill.getAttribute('data-price-prefix') || '+';
            if (prefix === '-') delta -= raw; else delta += raw;
        });

        var newPrice   = basePrice + delta;
        var newSpecial = baseSpecial ? baseSpecial + delta : 0;
        var displayPrice = newSpecial || newPrice;

        /* Info pill price */
        var pricePill = document.querySelector('.info-pill__value--price');
        if (pricePill) pricePill.textContent = formatPrice(displayPrice);

        var oldPill = document.querySelector('.info-pill__value--old');
        if (oldPill && newSpecial) oldPill.textContent = formatPrice(newPrice);

        /* Regular price pill (second info pill showing "Regular Price:") */
        var regPills = document.querySelectorAll('.info-pill');
        regPills.forEach(function (pill) {
            var label = pill.querySelector('.info-pill__label');
            if (label && label.textContent.trim() === 'Regular Price:') {
                var val = pill.querySelector('.info-pill__value');
                if (val) val.textContent = formatPrice(newPrice);
            }
        });

        /* Cash discount payment card */
        var cashCard = document.getElementById('payment-cash');
        if (cashCard) {
            var cashAmount = cashCard.querySelector('.payment-card__amount');
            if (cashAmount) cashAmount.textContent = formatPrice(displayPrice);
            var cashOld = cashCard.querySelector('.payment-card__old');
            if (cashOld && newSpecial) cashOld.textContent = formatPrice(newPrice);
        }

        /* EMI payment card */
        var emiCard = document.getElementById('payment-emi');
        if (emiCard) {
            var emiAmount = emiCard.querySelector('.payment-card__amount');
            var monthly = Math.ceil(newPrice / 12);
            if (emiAmount) emiAmount.textContent = formatPrice(monthly) + '/month';
            var emiLabel = emiCard.querySelector('.payment-card__label');
            if (emiLabel) emiLabel.textContent = 'Regular Price: ' + formatPrice(newPrice);
        }
    }

    /* Hook into existing pill click handlers */
    document.querySelectorAll('.option-pill').forEach(function (pill) {
        pill.addEventListener('click', function () {
            setTimeout(recalcPrices, 0);
        });
    });

    /* =================================================================
       QUANTITY STEPPER (+/- buttons)
       ================================================================= */

    var qtyInput = document.getElementById('input-quantity');
    var qtyMinus = document.getElementById('qty-minus');
    var qtyPlus  = document.getElementById('qty-plus');

    if (qtyInput && qtyMinus && qtyPlus) {
        var minQty = parseInt(qtyInput.min) || 1;

        qtyMinus.addEventListener('click', function () {
            var val = parseInt(qtyInput.value) || minQty;
            if (val > minQty) qtyInput.value = val - 1;
        });

        qtyPlus.addEventListener('click', function () {
            var val = parseInt(qtyInput.value) || minQty;
            qtyInput.value = val + 1;
        });
    }

    /* =================================================================
       PAYMENT OPTION CARDS (toggle active)
       ================================================================= */

    document.querySelectorAll('.payment-card').forEach(function (card) {
        card.addEventListener('click', function () {
            document.querySelectorAll('.payment-card').forEach(function (c) {
                c.classList.remove('payment-card--active');
            });
            card.classList.add('payment-card--active');
        });
    });

    /* =================================================================
       COPY LINK BUTTON
       ================================================================= */

    var copyBtn = document.getElementById('btn-copy-link');
    if (copyBtn) {
        copyBtn.addEventListener('click', function () {
            var url = copyBtn.getAttribute('data-url');
            if (navigator.clipboard && url) {
                navigator.clipboard.writeText(url).then(function () {
                    notify.show('Link copied to clipboard!', 'success');
                });
            }
        });
    }

    /* =================================================================
       ADD TO CART (with product options + cart popup)
       ================================================================= */

    var cartBtn = document.getElementById('button-cart');
    if (cartBtn) {
        cartBtn.addEventListener('click', function () {
            cartBtn.disabled = true;

            var productForm = document.getElementById('product');
            var formData = new FormData();

            /* Collect all relevant inputs */
            productForm.querySelectorAll('input[type="text"], input[type="number"], input[type="hidden"]').forEach(function (el) {
                if (el.name) formData.append(el.name, el.value);
            });
            productForm.querySelectorAll('input[type="date"], input[type="time"], input[type="datetime-local"]').forEach(function (el) {
                if (el.name) formData.append(el.name, el.value);
            });
            productForm.querySelectorAll('input[type="radio"]:checked, input[type="checkbox"]:checked').forEach(function (el) {
                formData.append(el.name, el.value);
            });
            productForm.querySelectorAll('select').forEach(function (el) {
                if (el.name) formData.append(el.name, el.value);
            });
            productForm.querySelectorAll('textarea').forEach(function (el) {
                if (el.name) formData.append(el.name, el.value);
            });

            var body = new URLSearchParams(formData).toString();

            fetch('index.php?route=checkout/cart/add', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: body
            })
            .then(function (r) { return r.json(); })
            .then(function (json) {
                document.querySelectorAll('.dreamer-notify, .text-danger').forEach(function (el) { el.remove(); });
                document.querySelectorAll('.form-group').forEach(function (el) { el.classList.remove('has-error'); });

                if (json.error) {
                    if (json.error.option) {
                        Object.keys(json.error.option).forEach(function (key) {
                            var el = document.getElementById('input-option' + key);
                            if (!el) {
                                /* Try finding the option-pills container */
                                var pills = document.querySelector('.option-pills[data-option-id="' + key + '"]');
                                if (pills) el = pills;
                            }
                            if (el) {
                                var errDiv = document.createElement('div');
                                errDiv.className = 'text-danger';
                                errDiv.textContent = json.error.option[key];
                                var parent = el.closest('.form-group') || el;
                                parent.appendChild(errDiv);
                                parent.classList.add('has-error');
                            }
                        });
                    }
                    if (json.error.recurring) {
                        var recEl = document.querySelector('select[name="recurring_id"]');
                        if (recEl) {
                            var errDiv = document.createElement('div');
                            errDiv.className = 'text-danger';
                            errDiv.textContent = json.error.recurring;
                            recEl.insertAdjacentElement('afterend', errDiv);
                        }
                    }
                }

                if (json.success) {
                    cart._updateBadges(json.total);
                    cart._showAddedModal(json);
                }
            })
            .catch(function () {
                notify.show('An error occurred. Please try again.', 'error');
            })
            .finally(function () {
                cartBtn.disabled = false;
            });
        });
    }

    /* =================================================================
       RECURRING SUBSCRIPTION DESCRIPTION
       ================================================================= */

    function updateRecurringDescription() {
        var productIdInput = document.querySelector('input[name="product_id"]');
        var quantityInput  = document.getElementById('input-quantity');
        var recurringSelect = document.querySelector('select[name="recurring_id"]');
        var descEl = document.getElementById('recurring-description');

        if (!recurringSelect || !descEl) return;

        var body = 'product_id=' + encodeURIComponent(productIdInput ? productIdInput.value : '')
            + '&quantity=' + encodeURIComponent(quantityInput ? quantityInput.value : '')
            + '&recurring_id=' + encodeURIComponent(recurringSelect.value);

        descEl.innerHTML = '';

        fetch('index.php?route=product/product/getRecurringDescription', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: body
        })
        .then(function (r) { return r.json(); })
        .then(function (json) {
            if (json.success) descEl.innerHTML = json.success;
        });
    }

    var recurringSelect = document.querySelector('select[name="recurring_id"]');
    if (recurringSelect) recurringSelect.addEventListener('change', updateRecurringDescription);
    if (qtyInput) qtyInput.addEventListener('change', updateRecurringDescription);

    /* =================================================================
       FILE UPLOAD OPTION
       ================================================================= */

    document.querySelectorAll('button[id^="button-upload"]').forEach(function (btn) {
        btn.addEventListener('click', function () {
            var node = btn;
            var existing = document.getElementById('form-upload');
            if (existing) existing.remove();

            var uploadForm = document.createElement('form');
            uploadForm.id = 'form-upload';
            uploadForm.enctype = 'multipart/form-data';
            uploadForm.style.display = 'none';
            var fileInput = document.createElement('input');
            fileInput.type = 'file';
            fileInput.name = 'file';
            uploadForm.appendChild(fileInput);
            document.body.prepend(uploadForm);

            fileInput.click();

            fileInput.addEventListener('change', function () {
                if (!fileInput.value) return;
                node.disabled = true;

                var fd = new FormData(uploadForm);
                fetch('index.php?route=tool/upload', {
                    method: 'POST',
                    body: fd
                })
                .then(function (r) { return r.json(); })
                .then(function (json) {
                    document.querySelectorAll('.text-danger').forEach(function (el) { el.remove(); });

                    if (json.error) {
                        var errDiv = document.createElement('div');
                        errDiv.className = 'text-danger';
                        errDiv.textContent = json.error;
                        node.insertAdjacentElement('afterend', errDiv);
                    }
                    if (json.success) {
                        notify.show(json.success, 'success');
                        var hiddenInput = node.closest('.form-group').querySelector('input[type="hidden"]');
                        if (hiddenInput) hiddenInput.value = json.code;
                    }
                })
                .catch(function () {
                    notify.show('Upload failed. Please try again.', 'error');
                })
                .finally(function () {
                    node.disabled = false;
                });
            });
        });
    });

    /* =================================================================
       REVIEWS: load + submit + pagination + toggle form
       ================================================================= */

    var reviewContainer = document.getElementById('review');

    function loadReviews(url) {
        if (!reviewContainer || !productId) return;
        fetch(url || ('index.php?route=product/product/review&product_id=' + productId))
            .then(function (r) { return r.text(); })
            .then(function (html) {
                reviewContainer.innerHTML = html;
                reviewContainer.querySelectorAll('.pagination a').forEach(function (link) {
                    link.addEventListener('click', function (e) {
                        e.preventDefault();
                        loadReviews(this.href);
                    });
                });
            });
    }

    if (reviewOn) loadReviews();

    /* Toggle review form visibility */
    var toggleReviewBtn = document.getElementById('btn-toggle-review-form');
    var reviewForm = document.getElementById('form-review');
    if (toggleReviewBtn && reviewForm) {
        toggleReviewBtn.addEventListener('click', function () {
            if (reviewForm.style.display === 'none') {
                reviewForm.style.display = 'block';
                reviewForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
            } else {
                reviewForm.style.display = 'none';
            }
        });
    }

    /* Star rating hover + click */
    var ratingStars = document.querySelectorAll('.rating-star');
    ratingStars.forEach(function (star, idx) {
        star.addEventListener('mouseenter', function () {
            ratingStars.forEach(function (s, i) {
                var icon = s.querySelector('.material-icons');
                icon.textContent = i <= idx ? 'star' : 'star_border';
            });
        });

        star.addEventListener('click', function () {
            ratingStars.forEach(function (s, i) {
                s.classList.toggle('active', i <= idx);
                var icon = s.querySelector('.material-icons');
                icon.textContent = i <= idx ? 'star' : 'star_border';
            });
        });
    });

    var ratingContainer = document.querySelector('.rating-input');
    if (ratingContainer) {
        ratingContainer.addEventListener('mouseleave', function () {
            ratingStars.forEach(function (s) {
                var icon = s.querySelector('.material-icons');
                icon.textContent = s.classList.contains('active') ? 'star' : 'star_border';
            });
        });
    }

    /* Submit review */
    var reviewBtn = document.getElementById('button-review');
    if (reviewBtn) {
        reviewBtn.addEventListener('click', function () {
            reviewBtn.disabled = true;

            var formEl = document.getElementById('form-review');
            var body = new URLSearchParams(new FormData(formEl)).toString();

            fetch('index.php?route=product/product/write&product_id=' + productId, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: body
            })
            .then(function (r) { return r.json(); })
            .then(function (json) {
                document.querySelectorAll('.dreamer-notify').forEach(function (el) { el.remove(); });

                if (json.error)   notify.show(json.error, 'error');
                if (json.success) {
                    notify.show(json.success, 'success');
                    var nameInput   = formEl.querySelector('input[name="name"]');
                    var textArea    = formEl.querySelector('textarea[name="text"]');
                    if (nameInput)   nameInput.value = '';
                    if (textArea)    textArea.value = '';
                    ratingStars.forEach(function (s) {
                        s.classList.remove('active');
                        s.querySelector('.material-icons').textContent = 'star_border';
                    });
                    reviewForm.style.display = 'none';
                }
            })
            .catch(function () {
                notify.show('An error occurred. Please try again.', 'error');
            })
            .finally(function () {
                reviewBtn.disabled = false;
            });
        });
    }

});
