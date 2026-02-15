/**
 * DREAMER THEME - APP.JS
 * Vanilla JS replacement for OpenCart's common.js
 * No jQuery dependency. Uses fetch() API throughout.
 */

'use strict';

/* =====================================================================
   UTILITY
   ===================================================================== */

function getURLVar(key) {
    return new URLSearchParams(window.location.search).get(key) || '';
}

/* =====================================================================
   NOTIFICATIONS
   Replaces Bootstrap alert injection from common.js
   ===================================================================== */

var notify = {
    show: function (message, type, duration) {
        type = type || 'success';
        duration = (duration === undefined) ? 4000 : duration;

        document.querySelectorAll('.dreamer-notify').forEach(function (el) {
            el.remove();
        });

        var el = document.createElement('div');
        el.className = 'dreamer-notify dreamer-notify--' + type;
        el.innerHTML = '<span class="dreamer-notify__msg">' + message + '</span>'
            + '<button class="dreamer-notify__close" aria-label="Close">&times;</button>';

        document.body.appendChild(el);

        el.querySelector('.dreamer-notify__close').addEventListener('click', function () {
            el.remove();
        });

        if (duration > 0) {
            setTimeout(function () {
                if (el.parentNode) el.remove();
            }, duration);
        }
    }
};

/* =====================================================================
   CART
   Replaces: var cart = { add, update, remove } in common.js
   Called by product card buttons: onclick="cart.add(...)"
   ===================================================================== */

var cart = {
    _post: function (url, body) {
        return fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: body
        }).then(function (r) { return r.json(); });
    },

    _updateBadges: function (total) {
        var el = document.querySelector('#cart-total');
        if (el && total) {
            el.innerHTML = '<i class="material-icons">shopping_cart</i> ' + total;
        }
        var badge = document.getElementById('cart-count');
        if (badge && total) {
            var match = total.match(/\d+/);
            badge.textContent = match ? match[0] : '0';
        }
    },

    _showAddedModal: function (json) {
        var existing = document.getElementById('cart-added-modal');
        if (existing) existing.remove();

        var modal = document.createElement('div');
        modal.id = 'cart-added-modal';
        modal.className = 'cart-added-overlay';
        modal.innerHTML = ''
            + '<div class="cart-added-dialog">'
            + '<button class="cart-added-close" aria-label="Close">&times;</button>'
            + '<div class="cart-added-body">'
            + '<div class="cart-added-msg">'
            + '<span class="cart-added-icon">&#10004;</span> '
            + 'You have added <a href="' + (json.cart_url || '#') + '" class="cart-added-name">' + json.product_name + '</a> to your shopping cart!'
            + '</div>'
            + '<div class="cart-added-info">'
            + '<div class="cart-added-row"><span>Cart quantity:</span><span>' + json.cart_count + '</span></div>'
            + '<div class="cart-added-row"><span>Cart Total:</span><span>' + json.cart_total + '</span></div>'
            + '</div>'
            + '</div>'
            + '<div class="cart-added-actions">'
            + '<a href="' + (json.cart_url || 'index.php?route=checkout/cart') + '" class="cart-added-btn cart-added-btn--primary">View Cart</a>'
            + '<a href="' + (json.checkout_url || 'index.php?route=checkout/checkout') + '" class="cart-added-btn cart-added-btn--outline">Confirm Order</a>'
            + '</div>'
            + '</div>';

        document.body.appendChild(modal);

        function closeModal() { modal.remove(); }

        modal.querySelector('.cart-added-close').addEventListener('click', closeModal);
        modal.addEventListener('click', function (ev) {
            if (ev.target === modal) closeModal();
        });
        document.addEventListener('keydown', function onEsc(ev) {
            if (ev.key === 'Escape') {
                closeModal();
                document.removeEventListener('keydown', onEsc);
            }
        });
    },

    add: function (product_id, quantity) {
        quantity = quantity || 1;

        this._post(
            'index.php?route=checkout/cart/add',
            'product_id=' + product_id + '&quantity=' + quantity
        ).then(function (json) {
            document.querySelectorAll('.dreamer-notify, .text-danger').forEach(function (el) {
                el.remove();
            });

            if (json.redirect) {
                location.href = json.redirect;
                return;
            }

            if (json.success) {
                cart._updateBadges(json.total);
                cart._showAddedModal(json);
            }
        }).catch(function () {
            notify.show('An error occurred. Please try again.', 'error');
        });
    },

    update: function (key, quantity) {
        quantity = (quantity !== undefined) ? quantity : 1;

        this._post(
            'index.php?route=checkout/cart/edit',
            'key=' + key + '&quantity=' + quantity
        ).then(function (json) {
            cart._updateBadges(json.total);

            var route = getURLVar('route');
            if (route === 'checkout/cart' || route === 'checkout/checkout') {
                location.href = 'index.php?route=checkout/cart';
            } else {
                cartDrawer.refresh();
            }
        }).catch(function () {
            notify.show('An error occurred. Please try again.', 'error');
        });
    },

    remove: function (key) {
        this._post(
            'index.php?route=checkout/cart/remove',
            'key=' + key
        ).then(function (json) {
            cart._updateBadges(json.total);

            var route = getURLVar('route');
            if (route === 'checkout/cart' || route === 'checkout/checkout') {
                location.href = 'index.php?route=checkout/cart';
            } else {
                cartDrawer.refresh();
            }
        }).catch(function () {
            notify.show('An error occurred. Please try again.', 'error');
        });
    }
};

/* =====================================================================
   CART DRAWER (slide-out sidebar)
   ===================================================================== */

var cartDrawer = {
    _overlay: null,
    _panel: null,
    _body: null,

    _getEls: function () {
        if (!this._overlay) {
            this._overlay = document.getElementById('cart-drawer-overlay');
            this._panel = document.getElementById('cart-drawer');
            this._body = this._panel ? this._panel.querySelector('.cart-drawer__body') : null;
        }
    },

    open: function () {
        this._getEls();
        if (!this._overlay) return;
        this._overlay.classList.add('open');
        this._panel.classList.add('open');
        document.body.style.overflow = 'hidden';
        this.refresh();
    },

    close: function () {
        this._getEls();
        if (!this._overlay) return;
        this._overlay.classList.remove('open');
        this._panel.classList.remove('open');
        document.body.style.overflow = '';
    },

    refresh: function () {
        this._getEls();
        if (!this._body) return;
        var body = this._body;
        var panel = this._panel;

        fetch('index.php?route=common/cart/json')
            .then(function (r) { return r.json(); })
            .then(function (data) {
                var html = '';

                if (data.products && data.products.length) {
                    html += '<div class="cart-drawer__items">';
                    data.products.forEach(function (p) {
                        html += '<div class="cart-drawer__item">'
                            + '<a href="' + p.href + '" class="cart-drawer__thumb"><img src="' + p.thumb + '" alt=""></a>'
                            + '<div class="cart-drawer__info">'
                            + '<a href="' + p.href + '" class="cart-drawer__name">' + p.name + '</a>';
                        if (p.option && p.option.length) {
                            p.option.forEach(function (o) {
                                html += '<small class="cart-drawer__option">' + o.name + ': ' + o.value + '</small>';
                            });
                        }
                        html += '<div class="cart-drawer__price">' + p.price + ' &times; ' + p.quantity + ' = ' + p.total + '</div>'
                            + '</div>'
                            + '<button class="cart-drawer__remove" onclick="cart.remove(\'' + p.cart_id + '\');" title="Remove"><i class="material-icons">delete</i></button>'
                            + '</div>';
                    });
                    html += '</div>';

                    /* Promo code */
                    html += '<div class="cart-drawer__promo">'
                        + '<input type="text" id="cart-drawer-coupon" placeholder="Promo Code" class="cart-drawer__promo-input">'
                        + '<button class="cart-drawer__promo-btn" onclick="cartDrawer.applyCoupon();">Apply</button>'
                        + '</div>';

                    /* Totals */
                    html += '<div class="cart-drawer__totals">';
                    data.totals.forEach(function (t) {
                        html += '<div class="cart-drawer__total-row"><span>' + t.title + '</span><span>' + t.text + '</span></div>';
                    });
                    html += '</div>';

                    /* Checkout button */
                    html += '<a href="' + (data.checkout_url || 'index.php?route=checkout/checkout') + '" class="cart-drawer__checkout">Checkout</a>';
                } else {
                    html = '<p class="cart-drawer__empty">Your cart is empty.</p>';
                }

                body.innerHTML = html;
            })
            .catch(function () {
                body.innerHTML = '<p class="cart-drawer__empty">Could not load cart.</p>';
            });
    },

    applyCoupon: function () {
        var input = document.getElementById('cart-drawer-coupon');
        if (!input || !input.value.trim()) return;

        fetch('index.php?route=extension/total/coupon/coupon', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: 'coupon=' + encodeURIComponent(input.value.trim())
        }).then(function (r) { return r.json(); })
        .then(function (json) {
            if (json.error) {
                notify.show(json.error, 'error');
            } else if (json.redirect) {
                cartDrawer.refresh();
                notify.show('Coupon applied!', 'success');
            }
        }).catch(function () {
            notify.show('Could not apply coupon.', 'error');
        });
    }
};

/* =====================================================================
   VOUCHER
   Replaces: var voucher = { add, remove } in common.js
   ===================================================================== */

var voucher = {
    add: function () {},
    remove: function (key) {
        cart.remove(key);
    }
};

/* =====================================================================
   WISHLIST
   Replaces: var wishlist = { add, remove } in common.js
   ===================================================================== */

var wishlist = {
    add: function (product_id) {
        fetch('index.php?route=account/wishlist/add', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: 'product_id=' + product_id
        }).then(function (r) { return r.json(); })
        .then(function (json) {
            document.querySelectorAll('.dreamer-notify').forEach(function (el) {
                el.remove();
            });

            if (json.redirect) {
                location.href = json.redirect;
                return;
            }

            if (json.success) {
                notify.show(json.success, 'success');

                var totalSpan = document.querySelector('#wishlist-total span');
                if (totalSpan) totalSpan.textContent = json.total;

                var totalEl = document.querySelector('#wishlist-total');
                if (totalEl) totalEl.setAttribute('title', json.total);

                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        }).catch(function () {
            notify.show('An error occurred. Please try again.', 'error');
        });
    },
    remove: function () {}
};

/* =====================================================================
   COMPARE
   Replaces: var compare = { add, remove } in common.js
   ===================================================================== */

var compare = {
    add: function (product_id) {
        fetch('index.php?route=product/compare/add', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: 'product_id=' + product_id
        }).then(function (r) { return r.json(); })
        .then(function (json) {
            document.querySelectorAll('.dreamer-notify').forEach(function (el) {
                el.remove();
            });

            if (json.success) {
                notify.show(json.success, 'success');

                var compareTotal = document.querySelector('#compare-total');
                if (compareTotal) compareTotal.textContent = json.total;

                /* Update floating compare count badge */
                var badge = document.getElementById('compare-count');
                if (badge) badge.textContent = json.total;

                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        }).catch(function () {
            notify.show('An error occurred. Please try again.', 'error');
        });
    },
    remove: function () {}
};

/* =====================================================================
   AUTOCOMPLETE
   Standalone replacement for $.fn.autocomplete in common.js
   API: initAutocomplete(inputEl, { source: fn(val, cb), select: fn(item) })
   ===================================================================== */

function initAutocomplete(inputEl, options) {
    inputEl.setAttribute('autocomplete', 'off');

    var items = {};
    var timer = null;

    var dropdown = document.createElement('ul');
    dropdown.className = 'dropdown-menu autocomplete-results';
    dropdown.style.display = 'none';
    inputEl.insertAdjacentElement('afterend', dropdown);

    function hide() {
        dropdown.style.display = 'none';
    }

    function show() {
        dropdown.style.display = 'block';
    }

    function request() {
        clearTimeout(timer);
        timer = setTimeout(function () {
            options.source(inputEl.value, function (json) {
                items = {};
                var html = '';

                if (json.length && json[0].thumb !== undefined) {
                    /* Rich product card mode (search autocomplete) */
                    json.forEach(function (item) {
                        items[item.value] = item;
                        html += '<li data-value="' + item.value + '" data-href="' + (item.href || item.value) + '">'
                            + '<img src="' + item.thumb + '" alt="" class="ac-thumb" />'
                            + '<div class="ac-info">'
                            + '<span class="ac-name">' + item.label + '</span>'
                            + (item.stock
                                ? '<span class="ac-price">' + item.price + '</span>'
                                : '<span class="ac-oos">Out of Stock</span>')
                            + '</div></li>';
                    });
                    /* "View all results" footer row */
                    html += '<li class="ac-footer-row" data-value="__all__">'
                        + 'View all results <span style="margin-left:4px">&#8594;</span></li>';
                } else {
                    /* Plain text mode (fallback / category autocomplete) */
                    var categories = {};
                    json.forEach(function (item) {
                        items[item.value] = item;
                        if (!item.category) {
                            html += '<li data-value="' + item.value + '"><a href="#">' + item.label + '</a></li>';
                        } else {
                            if (!categories[item.category]) categories[item.category] = [];
                            categories[item.category].push(item);
                        }
                    });
                    Object.keys(categories).forEach(function (name) {
                        html += '<li class="dropdown-header">' + name + '</li>';
                        categories[name].forEach(function (item) {
                            html += '<li data-value="' + item.value + '"><a href="#">&nbsp;&nbsp;&nbsp;' + item.label + '</a></li>';
                        });
                    });
                }

                dropdown.innerHTML = html;

                if (html) {
                    show();
                } else {
                    hide();
                }
            });
        }, 200);
    }

    inputEl.addEventListener('focus', request);
    inputEl.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
            hide();
        } else {
            request();
        }
    });
    inputEl.addEventListener('blur', function () {
        setTimeout(hide, 200);
    });

    dropdown.addEventListener('click', function (e) {
        e.preventDefault();
        var li = e.target.closest('li[data-value]');
        if (li) {
            var val = li.getAttribute('data-value');
            if (val === '__all__') {
                /* Navigate to search results page */
                var base = document.querySelector('base') ? document.querySelector('base').getAttribute('href') : '';
                location.href = base + 'index.php?route=product/search&search=' + encodeURIComponent(inputEl.value);
                hide();
                return;
            }
            if (val && items[val]) {
                options.select(items[val]);
                hide();
            } else if (val) {
                /* For rich cards: navigate via data-href */
                var href = li.getAttribute('data-href');
                if (href) location.href = href;
                hide();
            }
        }
    });
}

/* =====================================================================
   DOM-READY HANDLERS
   ===================================================================== */

document.addEventListener('DOMContentLoaded', function () {

    /* --- Highlight form errors (replaces $('.text-danger').each) --- */
    document.querySelectorAll('.text-danger').forEach(function (el) {
        var group = el.closest('.form-group');
        if (group) group.classList.add('has-error');
    });

    /* --- Currency selector --- */
    document.querySelectorAll('#form-currency .currency-select').forEach(function (btn) {
        btn.addEventListener('click', function (e) {
            e.preventDefault();
            var input = document.querySelector('#form-currency input[name="code"]');
            if (input) {
                input.value = this.getAttribute('name');
                document.getElementById('form-currency').submit();
            }
        });
    });

    /* --- Language selector --- */
    document.querySelectorAll('#form-language .language-select').forEach(function (btn) {
        btn.addEventListener('click', function (e) {
            e.preventDefault();
            var input = document.querySelector('#form-language input[name="code"]');
            if (input) {
                input.value = this.getAttribute('name');
                document.getElementById('form-language').submit();
            }
        });
    });

    /* --- Search button & Enter key --- */
    var searchInput = document.querySelector('#search input[name="search"]');
    if (searchInput) {
        var searchBtn = searchInput.closest('#search').querySelector('button');

        if (searchBtn) {
            searchBtn.addEventListener('click', function () {
                var base = document.querySelector('base') ? document.querySelector('base').getAttribute('href') : '';
                var value = document.querySelector('header #search input[name="search"]');
                var query = value ? value.value : '';
                var url = base + 'index.php?route=product/search';
                if (query) url += '&search=' + encodeURIComponent(query);
                location.href = url;
            });
        }

        searchInput.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') {
                var btn = this.closest('#search').querySelector('button');
                if (btn) btn.click();
            }
        });
    }

    /* --- Search autocomplete (rich product dropdown) --- */
    var searchAcInput = document.querySelector('#search input[name="search"]');
    if (searchAcInput) {
        initAutocomplete(searchAcInput, {
            source: function (val, cb) {
                if (val.length < 2) { cb([]); return; }
                fetch('index.php?route=product/search/autocomplete&filter_name=' + encodeURIComponent(val))
                    .then(function (r) { return r.json(); })
                    .then(cb)
                    .catch(function () { cb([]); });
            },
            select: function (item) {
                location.href = item.href || item.value;
            }
        });
    }

    /* --- Dropdown menu overflow fix (replaces menu offset calculation) --- */
    var menuEl = document.getElementById('menu');
    if (menuEl) {
        menuEl.querySelectorAll('.dropdown-menu').forEach(function (dropdown) {
            var menuRect = menuEl.getBoundingClientRect();
            var dropRect = dropdown.getBoundingClientRect();
            var overflow = (dropRect.left + dropdown.offsetWidth) - (menuRect.left + menuEl.offsetWidth);
            if (overflow > 0) {
                dropdown.style.marginLeft = '-' + (overflow + 10) + 'px';
            }
        });
    }

    /* --- Product list/grid view toggle --- */
    var listViewBtn = document.getElementById('list-view');
    var gridViewBtn = document.getElementById('grid-view');

    if (listViewBtn) {
        listViewBtn.addEventListener('click', function () {
            document.querySelectorAll('#content .product-grid').forEach(function (el) {
                el.className = 'product-layout product-list col-xs-12';
            });
            listViewBtn.classList.add('active');
            if (gridViewBtn) gridViewBtn.classList.remove('active');
            localStorage.setItem('display', 'list');
        });
    }

    if (gridViewBtn) {
        gridViewBtn.addEventListener('click', function () {
            var cols = document.querySelectorAll('#column-right, #column-left').length;
            var cls = cols === 2
                ? 'product-layout product-grid col-lg-6 col-md-6 col-sm-12 col-xs-12'
                : cols === 1
                    ? 'product-layout product-grid col-lg-4 col-md-4 col-sm-6 col-xs-12'
                    : 'product-layout product-grid col-lg-3 col-md-3 col-sm-6 col-xs-12';

            document.querySelectorAll('#content .product-list').forEach(function (el) {
                el.className = cls;
            });
            gridViewBtn.classList.add('active');
            if (listViewBtn) listViewBtn.classList.remove('active');
            localStorage.setItem('display', 'grid');
        });
    }

    /* Restore saved display preference */
    if (localStorage.getItem('display') === 'list') {
        if (listViewBtn) listViewBtn.click();
        else if (gridViewBtn) gridViewBtn.click();
    } else {
        if (gridViewBtn) gridViewBtn.click();
    }

    /* --- Checkout: Enter key on login fields --- */
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
            var target = e.target;
            var inLoginField = target.closest('#collapse-checkout-option')
                && (target.name === 'email' || target.name === 'password');
            if (inLoginField) {
                var loginBtn = document.querySelector('#collapse-checkout-option #button-login');
                if (loginBtn) loginBtn.click();
            }
        }
    });

    /* --- Navbar toggle (moved from header.twig inline script) --- */
    var toggleBtn = document.querySelector('.navbar-toggle');
    var navCollapse = document.querySelector('.navbar-collapse');
    if (toggleBtn && navCollapse) {
        toggleBtn.addEventListener('click', function () {
            navCollapse.classList.toggle('show');
        });
    }

    /* --- Sticky header --- */
    var headerEl = document.querySelector('header');
    if (headerEl) {
        window.addEventListener('scroll', function () {
            if (window.scrollY > 100) {
                headerEl.classList.add('sticky');
            } else {
                headerEl.classList.remove('sticky');
            }
        }, { passive: true });
    }

    /* --- Search input focus animation --- */
    var searchWrapInput = document.querySelector('.search-wrapper input, #search input');
    if (searchWrapInput) {
        searchWrapInput.addEventListener('focus', function () {
            var parent = this.closest('#search') || this.parentElement;
            if (parent) parent.classList.add('focused');
        });
        searchWrapInput.addEventListener('blur', function () {
            var parent = this.closest('#search') || this.parentElement;
            if (parent) parent.classList.remove('focused');
        });
    }

    /* --- Floating CART button → open cart drawer --- */
    var floatingCartBtn = document.querySelector('.floating-cart');
    if (floatingCartBtn) {
        floatingCartBtn.addEventListener('click', function (e) {
            e.preventDefault();
            cartDrawer.open();
        });
    }

    /* --- Cart drawer: close on overlay click and close button --- */
    var drawerOverlay = document.getElementById('cart-drawer-overlay');
    if (drawerOverlay) {
        drawerOverlay.addEventListener('click', function () {
            cartDrawer.close();
        });
    }
    var drawerCloseBtn = document.querySelector('.cart-drawer__close');
    if (drawerCloseBtn) {
        drawerCloseBtn.addEventListener('click', function () {
            cartDrawer.close();
        });
    }

    /* --- Agree to Terms modal (replaces Bootstrap modal + jQuery.delegate) --- */
    document.addEventListener('click', function (e) {
        var agreeLink = e.target.closest('.agree');
        if (!agreeLink) return;
        e.preventDefault();

        var existing = document.getElementById('modal-agree');
        if (existing) existing.remove();

        fetch(agreeLink.getAttribute('href'))
            .then(function (r) { return r.text(); })
            .then(function (data) {
                var modal = document.createElement('div');
                modal.id = 'modal-agree';
                modal.className = 'dreamer-modal';
                modal.innerHTML = ''
                    + '<div class="dreamer-modal__dialog">'
                    + '<div class="dreamer-modal__header">'
                    + '<h4 class="dreamer-modal__title">' + agreeLink.textContent + '</h4>'
                    + '<button class="dreamer-modal__close" aria-label="Close">&times;</button>'
                    + '</div>'
                    + '<div class="dreamer-modal__body">' + data + '</div>'
                    + '</div>';

                document.body.appendChild(modal);

                modal.querySelector('.dreamer-modal__close').addEventListener('click', function () {
                    modal.remove();
                });
                modal.addEventListener('click', function (ev) {
                    if (ev.target === modal) modal.remove();
                });

                /* Trap Escape key */
                document.addEventListener('keydown', function onEsc(ev) {
                    if (ev.key === 'Escape') {
                        modal.remove();
                        document.removeEventListener('keydown', onEsc);
                    }
                });
            });
    });

});
