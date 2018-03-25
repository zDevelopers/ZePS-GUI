'use strict';

export function setup_routing()
{
    let $form_results = $('#home-search-form-results');
    let $reduce_button = $('#home-search-form-reduce');

    bind_events_on_results($form_results);

    $reduce_button.on('click', () =>
    {
        $form_results.slideToggle({
            duration: 'fast',
            always: () => update_mobile_reduce_button($form_results, $reduce_button)
        });
    });
}

export function bind_events_on_results($form_results)
{
    $form_results.find('.results-details ul.intermediate-stations-list').hide();

    $('.intermediate-stations').on('click', function()
    {
        $(this).parent().parent().find('.intermediate-stations-list').slideToggle('fast');
        $(this).find('.fa').toggleClass('fa-caret-down').toggleClass('fa-caret-up');
    });

    $('.results-alternatives .alternatives-handle').on('click', function () {
        $(this).siblings('.results-alternatives-details').slideToggle('fast');
        $(this).find('.fa').toggleClass('fa-caret-down').toggleClass('fa-caret-right');
    });
}

export function display_mobile_reduce_button($reduce_button)
{
    $reduce_button.removeClass('is-always-hidden');
}

export function hide_mobile_reduce_button($reduce_button)
{
    $reduce_button.addClass('is-always-hidden');
}

export function update_mobile_reduce_button($form_results, $reduce_button)
{
    let $reduce_icons = $reduce_button.find('.fa');
    let $reduce_text = $reduce_button.find('.reduce-text');

    if ($form_results.is(':visible'))
    {
        $reduce_icons.removeClass('fa-angle-double-down').addClass('fa-angle-double-up');
        $reduce_text.text($reduce_text.data('text-route-visible'));
    }
    else
    {
        $reduce_icons.removeClass('fa-angle-double-up').addClass('fa-angle-double-down');
        $reduce_text.text($reduce_text.data('text-route-hidden'));
    }
}
