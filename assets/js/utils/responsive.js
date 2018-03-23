'use strict';

/**
 * Checks if, when called, the browser width is inferior to the CSS's
 * mobile display limit (768 px).
 *
 * @returns boolean True if mobile.
 */
export function is_mobile()
{
    return Math.max(document.documentElement.clientWidth, window.innerWidth || 0) <= 768;
}
