'use strict';

export function setup_invert_fields($handle, $from, $to)
{
    var $from_input = $('#from');
    var $from_code  = $('#from_code_name');
    var $to_input   = $('#to');
    var $to_code    = $('#to_code_name');

    $handle.on('click', function (e)
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
        }

        e.preventDefault();
    });
}
