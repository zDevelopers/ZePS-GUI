'use strict';

$(function ()
{
    var $from_input = $('#from');
    var $from_code  = $('#from_code_name');
    var $to_input   = $('#to');
    var $to_code    = $('#to_code_name');

    $('#invert-from-to').on('click', function (e) {
        var from_value = $from_input.val();
        var to_value   = $to_input.val();

        if (from_value != "" || to_value != "")
        {
            $from_input.val(to_value);
            $to_input.val(from_value);

            var $spinner = $(this).find('span.fa');

            $spinner.addClass('spin-effect-90');
            setTimeout(function() { $spinner.removeClass('spin-effect-90'); }, 300);
        }

        e.preventDefault();
    });
});
