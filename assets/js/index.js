import '../scss/zeps';

import jQuery from 'jquery';

import { setup_modals_interaction } from './utils/modals';
import { setup_geolocation } from './search/geolocation';
import { setup_autocomplete } from './search/autocomplete';
import { setup_search_form } from './search/routing-search';
import { setup_routing } from './search/routing-results';
import { setup_live_results } from './search/live-results';
import { setup_network_map } from './network-map/map-manager';
import { setup_sub_pages } from "./sub-pages";

window.$ = window.jQuery = jQuery;

$(function()
{
    let $from = $('#from');
    let $to   = $('#to');

	// Avoids double tooltips but keeps titles attributes for
    // assistive engines.
    $('.tooltip').each((i, tooltip) =>
    {
        let $tooltip = $(tooltip);
        $tooltip.attr('aria-label', $tooltip.attr('title'));
        $tooltip.attr('title', '');
    });

    // Setups close interactions for all modals.
	setup_modals_interaction();

    // Setups the sub-pages
    setup_sub_pages($('#sub-pages-modal'));

	// Setups the geolocation component.
	setup_geolocation($('#open-geolocation-icon'), $('#geo-geolocation-modal'), $from, $('#from_overworld'));

	// Setups autocompletion for both search fields.
	setup_autocomplete([$from, $to], 'home-search-form-autocomplete');

	// Setups inversion button and other search-form-related interactions.
	setup_search_form($from, $to, $('#invert-from-to'), $('#home-search-form-autocomplete'));

	// Setups everything else in the routing pane.
	setup_routing($('#home-search-form-results'), $('#home-search-form-reduce'));

	// Setups the network map.
	setup_network_map($('#network-map'));

	// Setups the live results without page reload
    setup_live_results($('#search-form'), $from, $to, '.results-alternatives-link', $('#home-search-form-results'), $('#home-search-form-loading'), $('#home-search-form-error'), $('#home-search-form-reduce'));
});
