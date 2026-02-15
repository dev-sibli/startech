/**
 * DREAMER THEME - CHECKOUT.JS
 * Single-page checkout layout with all sections visible.
 * Uses vanilla JS + fetch instead of jQuery.
 */

'use strict';

document.addEventListener('DOMContentLoaded', function () {

    var page = document.getElementById('checkout-page');
    if (!page) return;

    var isLogged         = page.getAttribute('data-logged') === '1';
    var shippingRequired = page.getAttribute('data-shipping-required') === '1';

    /* =================================================================
       HELPERS
       ================================================================= */

    function setBody(id, html) {
        var el = document.getElementById(id);
        if (el) el.innerHTML = html;
    }

    function collectInputs(containerId) {
        var container = document.getElementById(containerId);
        if (!container) return '';
        var params = new URLSearchParams();
        container.querySelectorAll('input[type="text"], input[type="number"], input[type="email"], input[type="tel"], input[type="password"], input[type="hidden"], input[type="date"], input[type="time"], input[type="datetime-local"], textarea').forEach(function (el) {
            if (el.name) params.append(el.name, el.value);
        });
        container.querySelectorAll('input[type="radio"]:checked, input[type="checkbox"]:checked').forEach(function (el) {
            if (el.name) params.append(el.name, el.value);
        });
        container.querySelectorAll('select').forEach(function (el) {
            if (el.name) params.append(el.name, el.value);
        });
        return params.toString();
    }

    function showErrors(containerId, errors) {
        var container = document.getElementById(containerId);
        if (!container) return;
        container.querySelectorAll('.text-danger').forEach(function (el) { el.remove(); });
        container.querySelectorAll('.form-group').forEach(function (el) { el.classList.remove('has-error'); });

        Object.keys(errors).forEach(function (key) {
            if (key === 'warning') return;
            var el = container.querySelector('#input-payment-' + key.replace('_', '-'))
                || container.querySelector('#input-shipping-' + key.replace('_', '-'))
                || container.querySelector('[name="' + key + '"]');
            if (el) {
                var errDiv = document.createElement('div');
                errDiv.className = 'text-danger';
                errDiv.textContent = errors[key];
                var parent = el.closest('.input-group') || el;
                parent.insertAdjacentElement('afterend', errDiv);
                var fg = el.closest('.form-group');
                if (fg) fg.classList.add('has-error');
            }
        });
    }

    function showAlert(containerId, message, type) {
        var container = document.getElementById(containerId);
        if (!container) return;
        container.querySelectorAll('.checkout-alert').forEach(function (el) { el.remove(); });
        var alert = document.createElement('div');
        alert.className = 'checkout-alert checkout-alert--' + (type || 'danger');
        alert.innerHTML = '<i class="material-icons">error_outline</i> ' + message
            + ' <button class="checkout-alert__close" aria-label="Close">&times;</button>';
        container.prepend(alert);
    }

    function clearErrors(containerId) {
        var container = document.getElementById(containerId);
        if (!container) return;
        container.querySelectorAll('.checkout-alert, .text-danger').forEach(function (el) { el.remove(); });
        container.querySelectorAll('.form-group').forEach(function (el) { el.classList.remove('has-error'); });
    }

    function setBtn(btnId, disabled) {
        var btn = document.getElementById(btnId);
        if (btn) btn.disabled = disabled;
    }

    function scrollTo(elId) {
        var el = document.getElementById(elId);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    /* =================================================================
       SECTION LOADERS
       ================================================================= */

    function loadSection(route, bodyId, then) {
        fetch('index.php?route=' + route)
            .then(function (r) { return r.text(); })
            .then(function (html) {
                setBody(bodyId, html);
                if (then) then();
            });
    }

    function refreshOrderSummary() {
        fetch('index.php?route=checkout/confirm')
            .then(function (r) { return r.text(); })
            .then(function (html) {
                setBody('body-checkout-confirm', html);
            });
    }

    /* =================================================================
       INITIAL PAGE LOAD — load all available sections
       ================================================================= */

    if (!isLogged) {
        loadSection('checkout/login', 'body-checkout-option');
    } else {
        loadSection('checkout/payment_address', 'body-payment-address', function () {
            if (shippingRequired) {
                loadSection('checkout/shipping_address', 'body-shipping-address');
                loadSection('checkout/shipping_method', 'body-shipping-method');
            }
            loadSection('checkout/payment_method', 'body-payment-method');
            refreshOrderSummary();
        });
    }

    /* =================================================================
       BUTTON HANDLERS (delegated on the page)
       ================================================================= */

    page.addEventListener('click', function (e) {
        var target = e.target.closest('[id^="button-"]');
        if (!target) return;
        var btnId = target.id;

        /* --- Account type selection (register / guest) --- */
        if (btnId === 'button-account') {
            setBtn('button-account', true);
            var accountVal = document.querySelector('input[name="account"]:checked');
            var route = accountVal ? accountVal.value : 'register';

            fetch('index.php?route=checkout/' + route)
                .then(function (r) { return r.text(); })
                .then(function (html) {
                    setBody('body-payment-address', html);
                    scrollTo('section-payment-address');
                    setBtn('button-account', false);
                });
            return;
        }

        /* --- Login --- */
        if (btnId === 'button-login') {
            setBtn('button-login', true);
            fetch('index.php?route=checkout/login/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: collectInputs('body-checkout-option')
            }).then(function (r) { return r.json(); })
            .then(function (json) {
                clearErrors('body-checkout-option');
                if (json.redirect) {
                    location.href = json.redirect;
                } else if (json.error) {
                    showAlert('body-checkout-option', json.error.warning || 'Login failed.', 'danger');
                    setBtn('button-login', false);
                }
            });
            return;
        }

        /* --- Register --- */
        if (btnId === 'button-register') {
            setBtn('button-register', true);
            fetch('index.php?route=checkout/register/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: collectInputs('body-payment-address')
            }).then(function (r) { return r.json(); })
            .then(function (json) {
                clearErrors('body-payment-address');
                if (json.redirect) { location.href = json.redirect; return; }
                if (json.error) {
                    if (json.error.warning) showAlert('body-payment-address', json.error.warning, 'danger');
                    showErrors('body-payment-address', json.error);
                    setBtn('button-register', false);
                    return;
                }
                // Success — load remaining sections
                if (shippingRequired) {
                    loadSection('checkout/shipping_address', 'body-shipping-address');
                    loadSection('checkout/shipping_method', 'body-shipping-method');
                }
                loadSection('checkout/payment_method', 'body-payment-method');
                refreshOrderSummary();
                scrollTo(shippingRequired ? 'section-shipping-address' : 'section-payment-method');
                setBtn('button-register', false);
            });
            return;
        }

        /* --- Guest checkout --- */
        if (btnId === 'button-guest') {
            setBtn('button-guest', true);
            fetch('index.php?route=checkout/guest/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: collectInputs('body-payment-address')
            }).then(function (r) { return r.json(); })
            .then(function (json) {
                clearErrors('body-payment-address');
                if (json.redirect) { location.href = json.redirect; return; }
                if (json.error) {
                    if (json.error.warning) showAlert('body-payment-address', json.error.warning, 'danger');
                    showErrors('body-payment-address', json.error);
                    setBtn('button-guest', false);
                    return;
                }
                if (shippingRequired) {
                    loadSection('checkout/guest_shipping', 'body-shipping-address');
                    loadSection('checkout/shipping_method', 'body-shipping-method');
                }
                loadSection('checkout/payment_method', 'body-payment-method');
                refreshOrderSummary();
                scrollTo(shippingRequired ? 'section-shipping-address' : 'section-payment-method');
                setBtn('button-guest', false);
            });
            return;
        }

        /* --- Payment Address --- */
        if (btnId === 'button-payment-address') {
            setBtn('button-payment-address', true);
            fetch('index.php?route=checkout/payment_address/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: collectInputs('body-payment-address')
            }).then(function (r) { return r.json(); })
            .then(function (json) {
                clearErrors('body-payment-address');
                if (json.redirect) { location.href = json.redirect; return; }
                if (json.error) {
                    if (json.error.warning) showAlert('body-payment-address', json.error.warning, 'warning');
                    showErrors('body-payment-address', json.error);
                    setBtn('button-payment-address', false);
                    return;
                }
                // Reload downstream sections
                loadSection('checkout/payment_address', 'body-payment-address');
                if (shippingRequired) {
                    loadSection('checkout/shipping_address', 'body-shipping-address');
                    loadSection('checkout/shipping_method', 'body-shipping-method');
                }
                loadSection('checkout/payment_method', 'body-payment-method');
                refreshOrderSummary();
                scrollTo(shippingRequired ? 'section-shipping-address' : 'section-payment-method');
                setBtn('button-payment-address', false);
            });
            return;
        }

        /* --- Shipping Address --- */
        if (btnId === 'button-shipping-address') {
            setBtn('button-shipping-address', true);
            fetch('index.php?route=checkout/shipping_address/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: collectInputs('body-shipping-address')
            }).then(function (r) { return r.json(); })
            .then(function (json) {
                clearErrors('body-shipping-address');
                if (json.redirect) { location.href = json.redirect; return; }
                if (json.error) {
                    if (json.error.warning) showAlert('body-shipping-address', json.error.warning, 'warning');
                    showErrors('body-shipping-address', json.error);
                    setBtn('button-shipping-address', false);
                    return;
                }
                loadSection('checkout/shipping_address', 'body-shipping-address');
                loadSection('checkout/shipping_method', 'body-shipping-method');
                loadSection('checkout/payment_method', 'body-payment-method');
                refreshOrderSummary();
                scrollTo('section-shipping-method');
                setBtn('button-shipping-address', false);
            });
            return;
        }

        /* --- Guest Shipping --- */
        if (btnId === 'button-guest-shipping') {
            setBtn('button-guest-shipping', true);
            fetch('index.php?route=checkout/guest_shipping/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: collectInputs('body-shipping-address')
            }).then(function (r) { return r.json(); })
            .then(function (json) {
                clearErrors('body-shipping-address');
                if (json.redirect) { location.href = json.redirect; return; }
                if (json.error) {
                    if (json.error.warning) showAlert('body-shipping-address', json.error.warning, 'danger');
                    showErrors('body-shipping-address', json.error);
                    setBtn('button-guest-shipping', false);
                    return;
                }
                loadSection('checkout/guest_shipping', 'body-shipping-address');
                loadSection('checkout/shipping_method', 'body-shipping-method');
                loadSection('checkout/payment_method', 'body-payment-method');
                refreshOrderSummary();
                scrollTo('section-shipping-method');
                setBtn('button-guest-shipping', false);
            });
            return;
        }

        /* --- Shipping Method --- */
        if (btnId === 'button-shipping-method') {
            setBtn('button-shipping-method', true);
            fetch('index.php?route=checkout/shipping_method/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: collectInputs('body-shipping-method')
            }).then(function (r) { return r.json(); })
            .then(function (json) {
                clearErrors('body-shipping-method');
                if (json.redirect) { location.href = json.redirect; return; }
                if (json.error) {
                    if (json.error.warning) showAlert('body-shipping-method', json.error.warning, 'danger');
                    setBtn('button-shipping-method', false);
                    return;
                }
                loadSection('checkout/payment_method', 'body-payment-method');
                refreshOrderSummary();
                scrollTo('section-payment-method');
                setBtn('button-shipping-method', false);
            });
            return;
        }

        /* --- Payment Method --- */
        if (btnId === 'button-payment-method') {
            setBtn('button-payment-method', true);
            fetch('index.php?route=checkout/payment_method/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: collectInputs('body-payment-method')
            }).then(function (r) { return r.json(); })
            .then(function (json) {
                clearErrors('body-payment-method');
                if (json.redirect) { location.href = json.redirect; return; }
                if (json.error) {
                    if (json.error.warning) showAlert('body-payment-method', json.error.warning, 'danger');
                    setBtn('button-payment-method', false);
                    return;
                }
                refreshOrderSummary();
                scrollTo('section-checkout-confirm');
                setBtn('button-payment-method', false);
            });
            return;
        }

    }); /* end click handler */

    /* =================================================================
       DISMISS ALERT BUTTONS
       ================================================================= */

    document.addEventListener('click', function (e) {
        if (e.target.classList.contains('checkout-alert__close')) {
            e.target.closest('.checkout-alert').remove();
        }
    });

});
