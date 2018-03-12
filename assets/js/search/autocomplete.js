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
                    enabled: true
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
