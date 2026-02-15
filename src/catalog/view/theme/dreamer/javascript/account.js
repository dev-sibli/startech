/**
 * DREAMER THEME - ACCOUNT.JS
 * Account forms: register, edit, return.
 * Date/time fields use native HTML5 <input type="date"> and <input type="time">.
 * No jQuery datetimepicker dependency.
 */

'use strict';

document.addEventListener('DOMContentLoaded', function () {

    /* Convert any legacy .date / .time / .datetime class inputs
       to native HTML5 types if the default theme twig is still serving them.
       When dreamer overrides are in place, these inputs are already native,
       so these conversions are a safety net only. */

    document.querySelectorAll('.date input[type="text"][name]').forEach(function (el) {
        el.type = 'date';
    });

    document.querySelectorAll('.time input[type="text"][name]').forEach(function (el) {
        el.type = 'time';
    });

    document.querySelectorAll('.datetime input[type="text"][name]').forEach(function (el) {
        el.type = 'datetime-local';
    });

    /* Dismiss inline alert buttons */
    document.addEventListener('click', function (e) {
        if (e.target.classList.contains('checkout-alert__close')
            || e.target.classList.contains('close')) {
            var alert = e.target.closest('.checkout-alert, .alert');
            if (alert) alert.remove();
        }
    });

});
