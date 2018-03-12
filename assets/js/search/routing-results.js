'use strict';

$(function()
{
    $('#home-search-form-results .results-details ul.intermediate-stations-list').hide();

    $('.intermediate-stations').on('click', function()
    {
        $(this).parent().parent().find('.intermediate-stations-list').slideToggle('fast');
        $(this).find('.fa').toggleClass('fa-caret-down').toggleClass('fa-caret-up');
    });

    $('.results-alternatives .alternatives-handle').on('click', function () {
        $(this).siblings('.results-alternatives-details').slideToggle('fast');
        $(this).find('.fa').toggleClass('fa-caret-down').toggleClass('fa-caret-right');
    });

    var $reduce_button = $('#home-search-form-reduce');
    var $reduce_icons = $reduce_button.find('.fa');
    var $reduce_text = $reduce_button.find('.reduce-text');
    var $results = $('#home-search-form-results');

    $reduce_button.on('click', function(e)
    {
        $results.slideToggle('fast');
        $reduce_icons.toggleClass('fa-angle-double-up').toggleClass('fa-angle-double-down');
        
        var other_text = $reduce_text.data('other-text');
        var previous_text = $reduce_text.text();

        $reduce_text.text(other_text);
        $reduce_text.data('other-text', previous_text);
    });
});
