/**
 * DREAMER THEME — CHECKOUT.JS
 * Flat single-page checkout. Vanilla JS + fetch.
 * On "Confirm Order": saves address → shipping → payment → creates order → confirms payment.
 */

'use strict';

document.addEventListener('DOMContentLoaded', function () {

    var page = document.getElementById('checkout-page');
    if (!page) return;

    var isLogged         = page.getAttribute('data-logged') === '1';
    var shippingRequired = page.getAttribute('data-shipping-required') === '1';
    var confirmBtn       = document.getElementById('btn-confirm-order');
    var errorsBox        = document.getElementById('checkout-errors');

    /* =================================================================
       HELPERS
       ================================================================= */

    function post(route, body) {
        return fetch('index.php?route=' + route, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: body
        }).then(function (r) { return r.json(); });
    }

    function getText(route) {
        return fetch('index.php?route=' + route).then(function (r) { return r.text(); });
    }

    function val(name) {
        var el = page.querySelector('[name="' + name + '"]');
        if (!el) return '';
        if (el.type === 'radio') {
            var checked = page.querySelector('[name="' + name + '"]:checked');
            return checked ? checked.value : '';
        }
        return el.value;
    }

    function showErrors(errors) {
        // Clear previous
        page.querySelectorAll('.text-danger').forEach(function (el) { el.remove(); });
        page.querySelectorAll('.form-group.has-error').forEach(function (el) { el.classList.remove('has-error'); });

        var messages = [];

        Object.keys(errors).forEach(function (key) {
            if (key === 'warning') {
                messages.push(errors[key]);
                return;
            }
            // Try to find the matching input
            var input = page.querySelector('[name="' + key + '"]')
                     || page.querySelector('#input-' + key.replace('_', '-'));
            if (input) {
                var errDiv = document.createElement('div');
                errDiv.className = 'text-danger';
                errDiv.textContent = errors[key];
                var parent = input.closest('.form-group');
                if (parent) {
                    parent.classList.add('has-error');
                    parent.appendChild(errDiv);
                } else {
                    input.insertAdjacentElement('afterend', errDiv);
                }
            } else {
                messages.push(errors[key]);
            }
        });

        if (messages.length) {
            errorsBox.innerHTML = messages.join('<br>');
            errorsBox.style.display = 'block';
            errorsBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }

    function clearErrors() {
        page.querySelectorAll('.text-danger').forEach(function (el) { el.remove(); });
        page.querySelectorAll('.form-group.has-error').forEach(function (el) { el.classList.remove('has-error'); });
        errorsBox.style.display = 'none';
        errorsBox.innerHTML = '';
    }

    function buildAddressParams() {
        var params = new URLSearchParams();
        params.append('firstname', val('firstname'));
        params.append('lastname', val('lastname'));
        params.append('email', val('email'));
        params.append('telephone', val('telephone'));
        params.append('address_1', val('address_1'));
        params.append('address_2', val('address_2'));
        params.append('city', val('city'));
        params.append('postcode', val('postcode'));
        params.append('country_id', val('country_id'));
        params.append('zone_id', val('zone_id'));
        params.append('company', val('company'));
        return params;
    }

    /* =================================================================
       PROMO TABS (Coupon / Gift Voucher)
       ================================================================= */

    document.querySelectorAll('.promo-tab').forEach(function (tab) {
        tab.addEventListener('click', function () {
            document.querySelectorAll('.promo-tab').forEach(function (t) { t.classList.remove('active'); });
            document.querySelectorAll('.promo-tab-content').forEach(function (c) { c.classList.remove('active'); });
            tab.classList.add('active');
            var target = document.getElementById('promo-' + tab.getAttribute('data-tab'));
            if (target) target.classList.add('active');
        });
    });

    /* =================================================================
       COUPON APPLY
       ================================================================= */

    var btnCoupon = document.getElementById('btn-coupon');
    if (btnCoupon) {
        btnCoupon.addEventListener('click', function () {
            var code = document.getElementById('input-coupon').value.trim();
            if (!code) return;

            post('extension/total/coupon/coupon', 'coupon=' + encodeURIComponent(code))
                .then(function (json) {
                    if (json.error) {
                        if (typeof notify !== 'undefined') notify(json.error, 'error');
                        else alert(json.error);
                    } else {
                        if (typeof notify !== 'undefined') notify(json.success || 'Coupon applied!', 'success');
                        location.reload();
                    }
                });
        });
    }

    /* =================================================================
       VOUCHER APPLY
       ================================================================= */

    var btnVoucher = document.getElementById('btn-voucher');
    if (btnVoucher) {
        btnVoucher.addEventListener('click', function () {
            var code = document.getElementById('input-voucher').value.trim();
            if (!code) return;

            post('extension/total/voucher/voucher', 'voucher=' + encodeURIComponent(code))
                .then(function (json) {
                    if (json.error) {
                        if (typeof notify !== 'undefined') notify(json.error, 'error');
                        else alert(json.error);
                    } else {
                        if (typeof notify !== 'undefined') notify(json.success || 'Voucher applied!', 'success');
                        location.reload();
                    }
                });
        });
    }

    /* =================================================================
       REFRESH TOTALS HELPER
       ================================================================= */

    function refreshTotals() {
        fetch('index.php?route=checkout/checkout/totals')
            .then(function (r) { return r.json(); })
            .then(function (rows) {
                var container = document.getElementById('summary-totals');
                if (!container) return;
                var html = '';
                rows.forEach(function (row) {
                    var cls = row.code === 'total' ? ' summary-row--total' : '';
                    html += '<div class="summary-row' + cls + '"><span>' + row.title + ':</span><span>' + row.text + '</span></div>';
                });
                container.innerHTML = html;
            });
    }

    /* =================================================================
       SHIPPING METHOD CHANGE → update totals
       ================================================================= */

    page.querySelectorAll('input[name="shipping_method"]').forEach(function (radio) {
        radio.addEventListener('change', function () {
            var shipMethod = radio.value;
            post('checkout/shipping_method/save', 'shipping_method=' + encodeURIComponent(shipMethod) + '&comment=')
                .then(function () {
                    refreshTotals();
                });
        });
    });

    /* =================================================================
       CONFIRM ORDER — Sequential chain
       ================================================================= */

    if (confirmBtn) {
        confirmBtn.addEventListener('click', function () {
            clearErrors();
            confirmBtn.disabled = true;
            confirmBtn.textContent = 'Processing...';

            var addressParams = buildAddressParams();

            // Step 1: Save address
            var saveAddressRoute;
            if (isLogged) {
                // Logged-in: save as new payment address
                addressParams.append('payment_address', 'new');
                saveAddressRoute = 'checkout/payment_address/save';
            } else {
                // Guest: save guest info + address
                addressParams.append('shipping_address', '1');
                saveAddressRoute = 'checkout/guest/save';
            }

            post(saveAddressRoute, addressParams.toString())
                .then(function (json) {
                    if (json.redirect) { location.href = json.redirect; return Promise.reject('redirect'); }
                    if (json.error) {
                        showErrors(json.error);
                        return Promise.reject('validation');
                    }

                    // For logged-in users, also save shipping address (same as payment)
                    if (isLogged && shippingRequired) {
                        var shipParams = new URLSearchParams();
                        shipParams.append('shipping_address', 'new');
                        shipParams.append('firstname', val('firstname'));
                        shipParams.append('lastname', val('lastname'));
                        shipParams.append('address_1', val('address_1'));
                        shipParams.append('address_2', val('address_2'));
                        shipParams.append('city', val('city'));
                        shipParams.append('postcode', val('postcode'));
                        shipParams.append('country_id', val('country_id'));
                        shipParams.append('zone_id', val('zone_id'));
                        shipParams.append('company', val('company'));
                        return post('checkout/shipping_address/save', shipParams.toString());
                    }
                    return {};
                })
                .then(function (json) {
                    if (json.redirect) { location.href = json.redirect; return Promise.reject('redirect'); }
                    if (json.error) { showErrors(json.error); return Promise.reject('validation'); }

                    // Step 2a: Load shipping methods into session (guest/save clears them)
                    if (shippingRequired) {
                        return getText('checkout/shipping_method');
                    }
                    return '';
                })
                .then(function () {
                    // Step 2b: Save shipping method
                    if (shippingRequired) {
                        var shipMethod = val('shipping_method');
                        var comment = val('comment') || '';
                        return post('checkout/shipping_method/save', 'shipping_method=' + encodeURIComponent(shipMethod) + '&comment=' + encodeURIComponent(comment));
                    }
                    return {};
                })
                .then(function (json) {
                    if (json.redirect) { location.href = json.redirect; return Promise.reject('redirect'); }
                    if (json.error) { showErrors(json.error); return Promise.reject('validation'); }

                    // Step 3a: Load payment methods into session (guest/save clears them)
                    return getText('checkout/payment_method');
                })
                .then(function () {
                    // Step 3b: Save payment method
                    var payMethod = val('payment_method');
                    var comment = val('comment') || '';
                    var agreeEl = page.querySelector('[name="agree"]');
                    var params = 'payment_method=' + encodeURIComponent(payMethod) + '&comment=' + encodeURIComponent(comment);
                    if (agreeEl && agreeEl.checked) {
                        params += '&agree=1';
                    }
                    return post('checkout/payment_method/save', params);
                })
                .then(function (json) {
                    if (json.redirect) { location.href = json.redirect; return Promise.reject('redirect'); }
                    if (json.error) { showErrors(json.error); return Promise.reject('validation'); }

                    // Step 4: Create order (checkout/confirm)
                    return getText('checkout/confirm');
                })
                .then(function (html) {
                    // The confirm response contains the payment extension's HTML.
                    // For COD, it has a button that calls extension/payment/cod/confirm.
                    // We detect the payment code and call the confirm endpoint directly.
                    var paymentCode = val('payment_method');

                    // Try calling the payment extension's confirm endpoint
                    return fetch('index.php?route=extension/payment/' + paymentCode + '/confirm', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
                    }).then(function (r) { return r.json(); });
                })
                .then(function (json) {
                    if (json.redirect) {
                        location.href = json.redirect;
                    } else if (json.error) {
                        showErrors({ warning: json.error });
                    } else {
                        // Fallback: go to success
                        location.href = 'index.php?route=checkout/success';
                    }
                })
                .catch(function (err) {
                    if (err === 'redirect' || err === 'validation') {
                        // Already handled
                    } else {
                        console.error('Checkout error:', err);
                        errorsBox.innerHTML = 'An error occurred during checkout. Please try again.';
                        errorsBox.style.display = 'block';
                    }
                    confirmBtn.disabled = false;
                    confirmBtn.textContent = 'Confirm Order';
                });
        });
    }

});
