require('../scss/zeps.scss');

import jQuery from 'jquery';

import { setup_modals_interaction } from './utils/modals';
import { setup_geolocation } from './search/geolocation';
import { setup_autocomplete } from './search/autocomplete';
import { setup_invert_fields } from './search/invert-stations';
import { setup_routing } from './search/routing-results';

window.$ = window.jQuery = jQuery;

$(function()
{
	// Avoids double tooltop but keeps titles attributes for
    // assistive engines.
    $('.home-search-form header > ul > li').attr('title', '');

    // Setups close interactions for all modals.
	setup_modals_interaction();

	// Setups the geolocation component.
	setup_geolocation($('#open-geolocation-icon'), $('#geo-geolocation-modal'), $('#from'), $('#from_overworld'));

	// Setups autocompletion for both search fields.
	setup_autocomplete([$('#from'), $('#to')], 'home-search-form-autocomplete');

	// Setups invertion button
	setup_invert_fields($('#invert-from-to'), $('#from'), $('#to'));

	// Setup everything else in the routing pane
	setup_routing();
});
