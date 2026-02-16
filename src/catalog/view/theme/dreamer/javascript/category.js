/**
 * DREAMER THEME — category.js
 * Filter sidebar: AJAX filtering, dual-range price slider,
 * collapsible sections, mobile toggle, browser history.
 * Vanilla JS only.
 */
'use strict';

document.addEventListener('DOMContentLoaded', function () {

    var sidebar      = document.getElementById('filter-sidebar');
    var spinner      = document.getElementById('product-list-spinner');
    var gridEl       = document.getElementById('product-grid');
    var wrapperEl    = document.getElementById('product-list-wrapper');
    var paginationEl = document.getElementById('pagination-wrapper');
    var resultsEl    = document.getElementById('results-wrapper');
    var sliderMin    = document.getElementById('price-slider-min');
    var sliderMax    = document.getElementById('price-slider-max');
    var inputMin     = document.getElementById('price-min-input');
    var inputMax     = document.getElementById('price-max-input');
    var sliderFill   = document.getElementById('price-slider-fill');

    // =====================================================================
    // COLLAPSIBLE FILTER GROUPS
    // =====================================================================
    document.querySelectorAll('.filter-group-header').forEach(function (header) {
        header.addEventListener('click', function () {
            this.closest('.filter-group').classList.toggle('collapsed');
        });
    });

    // =====================================================================
    // DUAL RANGE PRICE SLIDER
    // =====================================================================
    function updateSliderFill() {
        if (!sliderMin || !sliderMax || !sliderFill) return;
        var min    = parseFloat(sliderMin.min);
        var max    = parseFloat(sliderMin.max);
        var valMin = parseFloat(sliderMin.value);
        var valMax = parseFloat(sliderMax.value);
        if (max === min) { sliderFill.style.left = '0%'; sliderFill.style.width = '100%'; return; }
        var leftPct  = ((valMin - min) / (max - min)) * 100;
        var rightPct = ((valMax - min) / (max - min)) * 100;
        sliderFill.style.left  = leftPct + '%';
        sliderFill.style.width = (rightPct - leftPct) + '%';
    }

    if (sliderMin && sliderMax) {
        updateSliderFill();

        sliderMin.addEventListener('input', function () {
            if (parseFloat(sliderMin.value) > parseFloat(sliderMax.value)) sliderMin.value = sliderMax.value;
            if (inputMin) inputMin.value = sliderMin.value;
            updateSliderFill();
        });

        sliderMax.addEventListener('input', function () {
            if (parseFloat(sliderMax.value) < parseFloat(sliderMin.value)) sliderMax.value = sliderMin.value;
            if (inputMax) inputMax.value = sliderMax.value;
            updateSliderFill();
        });

        // Trigger AJAX on slider release (mouseup / touchend)
        sliderMin.addEventListener('change', function () { fetchProducts(); });
        sliderMax.addEventListener('change', function () { fetchProducts(); });

        if (inputMin) {
            inputMin.addEventListener('input', function () { sliderMin.value = this.value; updateSliderFill(); });
            inputMin.addEventListener('change', function () { fetchProducts(); });
        }
        if (inputMax) {
            inputMax.addEventListener('input', function () { sliderMax.value = this.value; updateSliderFill(); });
            inputMax.addEventListener('change', function () { fetchProducts(); });
        }
    }

    // =====================================================================
    // CHECKBOX FILTERS — auto-submit via AJAX
    // =====================================================================
    document.querySelectorAll('.filter-checkbox').forEach(function (cb) {
        cb.addEventListener('change', function () { fetchProducts(); });
    });

    // =====================================================================
    // SORT / LIMIT SELECTS — AJAX
    // =====================================================================
    document.querySelectorAll('.toolbar-select').forEach(function (sel) {
        sel.addEventListener('change', function () { fetchProducts(); });
    });

    // =====================================================================
    // CLEAR ALL
    // =====================================================================
    var clearBtn = document.getElementById('filter-clear-all');
    if (clearBtn) {
        clearBtn.addEventListener('click', function () {
            // Uncheck all checkboxes
            document.querySelectorAll('.filter-checkbox').forEach(function (cb) { cb.checked = false; });
            // Reset price inputs to slider bounds
            if (sliderMin && inputMin) { sliderMin.value = sliderMin.min; inputMin.value = sliderMin.min; }
            if (sliderMax && inputMax) { sliderMax.value = sliderMax.max; inputMax.value = sliderMax.max; }
            updateSliderFill();
            fetchProducts();
        });
    }

    // =====================================================================
    // PAGINATION — event delegation for AJAX
    // =====================================================================
    if (paginationEl) {
        paginationEl.addEventListener('click', function (e) {
            var link = e.target.closest('a');
            if (!link) return;
            e.preventDefault();
            var href = link.getAttribute('href');
            if (!href) return;
            // Extract page param from the pagination link
            var url = new URL(href, window.location.origin);
            var page = url.searchParams.get('page');
            if (page) {
                fetchProducts(parseInt(page));
            }
        });
    }

    // =====================================================================
    // MOBILE SIDEBAR TOGGLE
    // =====================================================================
    var mobileToggle = document.getElementById('filter-mobile-toggle');
    var overlay      = document.getElementById('filter-sidebar-overlay');

    function openSidebar()  { sidebar.classList.add('open'); overlay.classList.add('active'); document.body.style.overflow = 'hidden'; }
    function closeSidebar() { sidebar.classList.remove('open'); overlay.classList.remove('active'); document.body.style.overflow = ''; }

    if (mobileToggle && sidebar && overlay) {
        mobileToggle.addEventListener('click', openSidebar);
        overlay.addEventListener('click', closeSidebar);
    }

    // =====================================================================
    // BROWSER HISTORY — back/forward
    // =====================================================================
    window.addEventListener('popstate', function () {
        // Re-sync checkboxes & inputs from URL, then fetch
        syncFiltersFromURL();
        fetchProducts(null, true); // skipPush = true
    });

    // =====================================================================
    // CORE: COLLECT FILTERS & FETCH
    // =====================================================================
    function collectFilters() {
        var params = new URLSearchParams();

        // Path (always required)
        var currentParams = new URLSearchParams(window.location.search);
        var path = currentParams.get('path');
        if (path) params.set('path', path);

        // Price
        var pMin = inputMin ? inputMin.value : '';
        var pMax = inputMax ? inputMax.value : '';
        var sMin = sliderMin ? sliderMin.min : '0';
        var sMax = sliderMax ? sliderMax.max : '999999';
        if (pMin && pMin !== sMin) params.set('price_min', pMin);
        if (pMax && pMax !== sMax) params.set('price_max', pMax);

        // In stock
        var inStockCb = document.querySelector('.filter-checkbox[data-type="in_stock"]');
        if (inStockCb && inStockCb.checked) params.set('in_stock', '1');

        // Stock status (comma-separated)
        var ssChecked = [];
        document.querySelectorAll('.filter-checkbox[data-type="stock_status"]').forEach(function (cb) {
            if (cb.checked) ssChecked.push(cb.value);
        });
        if (ssChecked.length) params.set('stock_status', ssChecked.join(','));

        // Manufacturer (comma-separated)
        var mfrChecked = [];
        document.querySelectorAll('.filter-checkbox[data-type="manufacturer"]').forEach(function (cb) {
            if (cb.checked) mfrChecked.push(cb.value);
        });
        if (mfrChecked.length) params.set('manufacturer', mfrChecked.join(','));

        // OC filters (comma-separated)
        var filterChecked = [];
        document.querySelectorAll('.filter-checkbox[data-type="filter"]').forEach(function (cb) {
            if (cb.checked) filterChecked.push(cb.value);
        });
        if (filterChecked.length) params.set('filter', filterChecked.join(','));

        // Sort
        var sortSel = document.getElementById('input-sort');
        if (sortSel && sortSel.value) {
            var parts = sortSel.value.split('-');
            var sortVal = parts.slice(0, -1).join('-');
            var orderVal = parts[parts.length - 1];
            if (sortVal && sortVal !== 'p.sort_order') { params.set('sort', sortVal); params.set('order', orderVal); }
            else if (orderVal !== 'ASC') { params.set('sort', sortVal); params.set('order', orderVal); }
        }

        // Limit
        var limitSel = document.getElementById('input-limit');
        if (limitSel && limitSel.value) {
            params.set('limit', limitSel.value);
        }

        return params;
    }

    var fetchController = null;

    function fetchProducts(page, skipPush) {
        var params = collectFilters();
        if (page) params.set('page', page);

        // Show spinner
        if (spinner) spinner.classList.add('active');

        // Abort previous request
        if (fetchController) fetchController.abort();
        fetchController = new AbortController();

        var url = window.location.pathname + '?' + params.toString();

        // Push to browser history
        if (!skipPush) {
            history.pushState(null, '', url);
        }

        fetch(url, {
            headers: { 'X-Requested-With': 'XMLHttpRequest' },
            signal: fetchController.signal
        })
        .then(function (res) { return res.json(); })
        .then(function (data) {
            renderProducts(data.products);
            if (paginationEl) paginationEl.innerHTML = data.pagination;
            if (resultsEl)    resultsEl.innerHTML    = data.results;
            if (spinner) spinner.classList.remove('active');

            // Scroll to top of product area
            if (wrapperEl) wrapperEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        })
        .catch(function (err) {
            if (err.name !== 'AbortError') {
                console.error('Filter fetch error:', err);
                if (spinner) spinner.classList.remove('active');
            }
        });
    }

    // =====================================================================
    // RENDER PRODUCT CARDS FROM JSON
    // =====================================================================
    function escHtml(str) {
        if (!str) return '';
        var div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    function renderProducts(products) {
        if (!gridEl) return;

        if (!products || !products.length) {
            gridEl.innerHTML = '<p style="grid-column:1/-1;text-align:center;padding:40px 0;color:#777;">No products found matching your filters.</p>';
            return;
        }

        var html = '';
        products.forEach(function (p) {
            html += '<div class="product-layout product-grid"><div class="product-thumb">';
            html += '<div class="image">';
            if (p.special) html += '<span class="badge-save">Save: ' + escHtml(p.special) + '</span>';
            html += '<a href="' + escHtml(p.href) + '">';
            html += '<img src="' + escHtml(p.thumb) + '" alt="' + escHtml(p.name) + '" title="' + escHtml(p.name) + '" />';
            html += '</a></div>';
            html += '<div class="caption">';
            html += '<h4><a href="' + escHtml(p.href) + '">' + escHtml(p.name) + '</a></h4>';
            if (p.description) html += '<p class="product-desc">' + escHtml(p.description) + '</p>';
            if (p.price) {
                html += '<p class="price">';
                if (p.special) {
                    html += '<span class="price-new">' + p.special + '</span>';
                    html += '<span class="price-old">' + p.price + '</span>';
                } else {
                    html += p.price;
                }
                html += '</p>';
            }
            html += '</div>';
            html += '<div class="button-group">';
            html += '<button type="button" class="btn-cart" onclick="cart.add(\'' + p.product_id + '\', \'' + p.minimum + '\');">';
            html += '<i class="material-icons">shopping_cart</i><span>Buy Now</span></button>';
            html += '<button type="button" class="btn-compare-text" onclick="compare.add(\'' + p.product_id + '\');">';
            html += '<i class="material-icons">library_add</i> Add to Compare</button>';
            html += '</div></div></div>';
        });

        gridEl.innerHTML = html;
    }

    // =====================================================================
    // SYNC FILTERS FROM URL (for popstate / back button)
    // =====================================================================
    function syncFiltersFromURL() {
        var params = new URLSearchParams(window.location.search);

        // Price
        var pMin = params.get('price_min') || (sliderMin ? sliderMin.min : '');
        var pMax = params.get('price_max') || (sliderMax ? sliderMax.max : '');
        if (inputMin) inputMin.value = pMin;
        if (inputMax) inputMax.value = pMax;
        if (sliderMin) sliderMin.value = pMin;
        if (sliderMax) sliderMax.value = pMax;
        updateSliderFill();

        // In stock
        var inStockCb = document.querySelector('.filter-checkbox[data-type="in_stock"]');
        if (inStockCb) inStockCb.checked = params.has('in_stock');

        // Stock status
        var ssValues = (params.get('stock_status') || '').split(',').filter(Boolean);
        document.querySelectorAll('.filter-checkbox[data-type="stock_status"]').forEach(function (cb) {
            cb.checked = ssValues.indexOf(cb.value) !== -1;
        });

        // Manufacturer
        var mfrValues = (params.get('manufacturer') || '').split(',').filter(Boolean);
        document.querySelectorAll('.filter-checkbox[data-type="manufacturer"]').forEach(function (cb) {
            cb.checked = mfrValues.indexOf(cb.value) !== -1;
        });

        // OC filters
        var filterValues = (params.get('filter') || '').split(',').filter(Boolean);
        document.querySelectorAll('.filter-checkbox[data-type="filter"]').forEach(function (cb) {
            cb.checked = filterValues.indexOf(cb.value) !== -1;
        });

        // Sort
        var sortSel = document.getElementById('input-sort');
        if (sortSel) {
            var s = params.get('sort') || 'p.sort_order';
            var o = params.get('order') || 'ASC';
            sortSel.value = s + '-' + o;
        }

        // Limit
        var limitSel = document.getElementById('input-limit');
        if (limitSel && params.get('limit')) {
            limitSel.value = params.get('limit');
        }
    }

});
