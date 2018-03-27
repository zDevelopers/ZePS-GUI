'use strict';

import EasyAutocomplete from '../utils/easy-autocomplete';

export function setup_search_form($from, $to, $invert_handle, $autocomplete_container)
{
    $invert_handle.on('click', function (e)
    {
        let from_value = $from.val();
        let to_value   = $to.val();

        if (from_value != "" || to_value != "")
        {
            $from.val(to_value);
            $to.val(from_value);

            let $spinner = $(this).find('span.fa');

            $spinner.addClass('spin-effect-90');
            setTimeout(() => $spinner.removeClass('spin-effect-90'), 300);

            // We empty the autocompletes container to avoid cached results related
            // to the old values.
            EasyAutocomplete.getHandle($from.prop('id')).resetItems();
            EasyAutocomplete.getHandle($to.prop('id')).resetItems();
        }

        e.preventDefault();
    });

    $from.on('keydown', e =>
    {
        if (!was_enter_pressed(e))
        {
            return;
        }
        else if ($from.val().trim().length === 0)
        {
            // Error, let's shake
            shake_for_error($from);
            return;
        }

        e.preventDefault();

        document.dispatchEvent(new CustomEvent('zeps-station-selected-for-highlight', {detail: $from.val()}));
        $to.focus();
    });

    $to.on('keydown', e =>
    {
        if (!was_enter_pressed(e))
            return;

        e.preventDefault();

        if ($to.val().trim().length === 0)
        {
            shake_for_error($to);
            return;
        }
        else if ($from.val().trim().length === 0)
        {
            shake_for_error($from);
            return;
        }

        $to.parents('form').submit();
    });
}

function was_enter_pressed(e)
{
    return e.which == 13 || e.keyCode == 13;
}

function shake_for_error($element)
{
    $element.addClass('shake');
    setTimeout(() => $element.removeClass('shake'), 1000);
}
