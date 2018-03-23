require('../scss/zeps.scss');

import jQuery from 'jquery';

import { setup_modals_interaction } from './utils/modals';
import { setup_geolocation } from './search/geolocation';
import { setup_autocomplete } from './search/autocomplete';
import { setup_invert_fields } from './search/invert-stations';
import { setup_routing } from './search/routing-results';
import { setup_network_map } from './network-map/map-manager';

window.$ = window.jQuery = jQuery;

$(function()
{
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

	// Setups the geolocation component.
	setup_geolocation($('#open-geolocation-icon'), $('#geo-geolocation-modal'), $('#from'), $('#from_overworld'));

	// Setups autocompletion for both search fields.
	setup_autocomplete([$('#from'), $('#to')], 'home-search-form-autocomplete');

	// Setups invertion button.
	setup_invert_fields($('#invert-from-to'), $('#from'), $('#to'));

	// Setups everything else in the routing pane.
	setup_routing();

	// Setups the network map.
	setup_network_map($('#network-map'));
});
