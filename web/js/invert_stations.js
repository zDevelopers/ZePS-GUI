'use strict';

$(function ()
{
    var $from_select = $('#from');
    var $to_select   = $('#to');

    $('#invert-from-to').click(function () {
        var from_value = $from_select.val();
        var to_value   = $to_select.val();

        if (from_value != "" && to_value != "")
        {
            $from_select.val(to_value);
            $to_select.val(from_value);

            var $spinner = $(this).find('span.fa');

            $spinner.addClass('spin-effect');
            setTimeout(function() { $spinner.removeClass('spin-effect'); }, 300);
        }
    });
});
