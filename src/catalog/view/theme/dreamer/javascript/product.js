/**
 * DREAMER THEME - PRODUCT.JS
 * Product detail page: lightbox, tabs, add-to-cart with options,
 * file upload, review load/submit, recurring description.
 * No jQuery. Uses fetch() and native <dialog>.
 */

'use strict';

document.addEventListener('DOMContentLoaded', function () {

    var dataEl     = document.getElementById('product-data');
    var productId  = dataEl ? dataEl.getAttribute('data-product-id') : '';
    var reviewOn   = dataEl ? dataEl.getAttribute('data-review-status') === '1' : false;

    /* =================================================================
       PRODUCT TABS
       Replaces: data-toggle="tab" Bootstrap behaviour
       ================================================================= */

    var tabLinks = document.querySelectorAll('.product-tab-link');
    var tabPanes = document.querySelectorAll('.product-tab-pane');

    tabLinks.forEach(function (link) {
        link.addEventListener('click', function (e) {
            e.preventDefault();

            var targetId = this.getAttribute('href').replace('#', '');

            tabLinks.forEach(function (l) { l.closest('.product-tab-item').classList.remove('active'); });
            tabPanes.forEach(function (p) { p.classList.remove('active'); });

            this.closest('.product-tab-item').classList.add('active');
            var pane = document.getElementById(targetId);
            if (pane) pane.classList.add('active');
        });
    });

    /* Review tab links in the rating section */
    document.querySelectorAll('a.review-link').forEach(function (link) {
        link.addEventListener('click', function (e) {
            e.preventDefault();
            var reviewTab = document.querySelector('.product-tab-link[href="#tab-review"]');
            if (reviewTab) reviewTab.click();
        });
    });

    /* =================================================================
       IMAGE LIGHTBOX
       Replaces: $.fn.magnificPopup
       Uses native <dialog> element — supported in all modern browsers.
       ================================================================= */

    var dialog = document.createElement('dialog');
    dialog.id = 'product-lightbox';
    dialog.className = 'product-lightbox';
    dialog.innerHTML = ''
        + '<button class="product-lightbox__close" aria-label="Close">'
        + '<i class="material-icons">close</i>'
        + '</button>'
        + '<button class="product-lightbox__prev" aria-label="Previous">'
        + '<i class="material-icons">chevron_left</i>'
        + '</button>'
        + '<img class="product-lightbox__img" src="" alt="" />'
        + '<button class="product-lightbox__next" aria-label="Next">'
        + '<i class="material-icons">chevron_right</i>'
        + '</button>';
    document.body.appendChild(dialog);

    var lightboxImg   = dialog.querySelector('.product-lightbox__img');
    var lightboxClose = dialog.querySelector('.product-lightbox__close');
    var lightboxPrev  = dialog.querySelector('.product-lightbox__prev');
    var lightboxNext  = dialog.querySelector('.product-lightbox__next');

    var galleryLinks  = [];
    var currentLbIdx  = 0;

    function buildGallery() {
        galleryLinks = Array.from(document.querySelectorAll('#product-thumbnails .product-thumb-link'));
    }

    function openLightbox(index) {
        if (!galleryLinks.length) buildGallery();
        currentLbIdx = Math.max(0, Math.min(index, galleryLinks.length - 1));
        lightboxImg.src = galleryLinks[currentLbIdx].getAttribute('href');
        lightboxImg.alt = galleryLinks[currentLbIdx].getAttribute('title') || '';
        dialog.showModal();
    }

    buildGallery();
    galleryLinks.forEach(function (link, i) {
        link.addEventListener('click', function (e) {
            e.preventDefault();
            openLightbox(i);
        });
    });

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
        if (e.key === 'Escape')       dialog.close();
        if (e.key === 'ArrowLeft')    lightboxPrev.click();
        if (e.key === 'ArrowRight')   lightboxNext.click();
    });

    /* =================================================================
       ADD TO CART (with product options)
       Replaces: $('#button-cart').on('click', ...) inline script
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

            /* Convert FormData to URLSearchParams for consistent encoding */
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
                            var optId = 'input-option' + key.replace('_', '-');
                            var el = document.getElementById(optId);
                            if (el) {
                                var errDiv = document.createElement('div');
                                errDiv.className = 'text-danger';
                                errDiv.textContent = json.error.option[key];
                                /* If inside an input-group, insert after the group wrapper */
                                var parent = el.closest('.input-group') || el;
                                parent.insertAdjacentElement('afterend', errDiv);
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
                    document.querySelectorAll('.text-danger').forEach(function (el) {
                        var fg = el.closest('.form-group');
                        if (fg) fg.classList.add('has-error');
                    });
                }

                if (json.success) {
                    notify.show(json.success, 'success');
                    cart._updateTotal(json.total);
                    cart._refreshDropdown();
                    window.scrollTo({ top: 0, behavior: 'smooth' });
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
       Replaces: $('select[name=recurring_id], input[name=quantity]').change(...)
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
            document.querySelectorAll('.dreamer-notify, .text-danger').forEach(function (el) { el.remove(); });
            if (json.success) descEl.innerHTML = json.success;
        });
    }

    var recurringSelect = document.querySelector('select[name="recurring_id"]');
    var quantityInput = document.getElementById('input-quantity');
    if (recurringSelect) recurringSelect.addEventListener('change', updateRecurringDescription);
    if (quantityInput)   quantityInput.addEventListener('change', updateRecurringDescription);

    /* =================================================================
       FILE UPLOAD OPTION
       Replaces: $('button[id^=button-upload]').on('click', ...)
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

            var timer = setInterval(function () {
                if (fileInput.value !== '') {
                    clearInterval(timer);
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
                            alert(json.success);
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
                }
            }, 500);
        });
    });

    /* =================================================================
       REVIEWS: load + submit + pagination
       Replaces: $('#review').load(...) and $('#button-review').on('click', ...)
       ================================================================= */

    var reviewContainer = document.getElementById('review');

    function loadReviews(url) {
        if (!reviewContainer || !productId) return;
        fetch(url || ('index.php?route=product/product/review&product_id=' + productId))
            .then(function (r) { return r.text(); })
            .then(function (html) {
                reviewContainer.innerHTML = html;
                /* Bind pagination links */
                reviewContainer.querySelectorAll('.pagination a').forEach(function (link) {
                    link.addEventListener('click', function (e) {
                        e.preventDefault();
                        loadReviews(this.href);
                    });
                });
            });
    }

    if (reviewOn) loadReviews();

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
                    var ratingCheck = formEl.querySelector('input[name="rating"]:checked');
                    if (nameInput)   nameInput.value = '';
                    if (textArea)    textArea.value = '';
                    if (ratingCheck) ratingCheck.checked = false;
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
