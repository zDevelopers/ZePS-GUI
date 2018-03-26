'use strict';

import '../utils/easy-autocomplete';

export function setup_autocomplete($fields, results_container_id)
{
    $fields.forEach(function($field)
    {
        $field.easyAutocomplete({
            url: function(input) {
                return $field.data('autocomplete-api').replace('{input}', input);
            },

            getValue: 'display_name',
            listLocation: 'items',
            matchResponseProperty: 'input',

            externalContainer: results_container_id,

            list: {
                match: {
                    // As we return fuzzy results, we don't want to match items,
                    // else all fuzzy results will be hidden.
                    enabled: false
                }
            },

            template: {
                type: "custom",
                method: function(label) {
                    return '<span class="fa fa-map-signs" aria-hidden="true"></span> ' + label;
                }
            }
        });
    });
}
