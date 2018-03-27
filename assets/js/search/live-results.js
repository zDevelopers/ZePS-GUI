'use strict';

import { bind_events_on_results, update_mobile_reduce_button, display_mobile_reduce_button, hide_mobile_reduce_button } from "./routing-results";

/**
 * This module defines methods to live-update the results without reloading the page. The setup_live_results method
 * must be called to setup everything.
 *
 * It also fires two events, made for the network map to catch them:
 * - zeps-route-updated: fired when a new route is displayed, with the route in the “details” field;
 * - zeps-route-erased: fired when the route is removed (without data).
 */


/**
 * Initializes the component.
 *
 * @param $form The form jQuery element.
 * @param $from The from field (jQuery element).
 * @param $to The to field (jQuery element).
 * @param alternate_handles_selector The *selector* (not jQuery object) corresponding to the alternate results links in the results.
 * @param $results_container The results container (as jQuery element).
 * @param $loader_container The loader container (as jQuery element).
 * @param $errors_container The errors container (as jQuery element).
 * @param $reduce_button The reduce button (as jQuery element).
 */
export function setup_live_results($form, $from, $to, alternate_handles_selector, $results_container, $loader_container, $errors_container, $reduce_button)
{
    bind_events_on_title($form, $from, $to, alternate_handles_selector, $results_container, $loader_container, $errors_container, $reduce_button);
    bind_events_on_form($form, $from, $to, alternate_handles_selector, $results_container, $loader_container, $errors_container, $reduce_button);
    bind_events_on_alternatives($from, $to, alternate_handles_selector, $results_container, $loader_container, $errors_container, $reduce_button);
}

function bind_events_on_title($form, $from, $to, alternate_handles_selector, $results_container, $loader_container, $errors_container, $reduce_button)
{
    $form.find('h1 a').on('click', e =>
    {
        e.preventDefault();

        hide_mobile_reduce_button($reduce_button);

        $form.find('input').val('');
        $form.find('input[type="checkbox"]').prop('checked', false);

        history.pushState({}, 'ZéPS', '/');
        $('title').text('ZéPS');

        $loader_container.slideUp();
        $errors_container.slideUp();
        $results_container.slideUp({
            always: () => setTimeout(() => document.dispatchEvent(new Event('zeps-route-erased')), 50)
        });
    });
}

function bind_events_on_form($form, $from, $to, alternate_handles_selector, $results_container, $loader_container, $errors_container, $reduce_button)
{
    $form.on('submit', e =>
    {
        e.preventDefault();
    
        if ($from.val().trim().length === 0 || $to.val().trim().length === 0)
            return;

        start_loading($results_container, $loader_container, $errors_container, $reduce_button);

        $.ajax({
            url: $form.attr('action'),
            data: $form.serialize(),
            success: data => handle_results(data, $results_container, $loader_container, $errors_container, $reduce_button, alternate_handles_selector, $from, $to),
            error: (xhr, error_code, error_thrown) => handle_error(error_thrown, $errors_container, $loader_container, $reduce_button)
        });
    });
}

function bind_events_on_alternatives($from, $to, alternate_handles_selector, $results_container, $loader_container, $errors_container, $reduce_button)
{
    $(alternate_handles_selector).each((i, handle) =>
    {
        let $handle = $(handle);

        $handle.on('click', e =>
        {
            e.preventDefault();
            start_loading($results_container, $loader_container, $errors_container, $reduce_button);

            $.ajax({
                url: $handle.attr('href'),
                success: data => handle_results(data, $results_container, $loader_container, $errors_container, $reduce_button, alternate_handles_selector, $from, $to),
                error: (xhr, error_code, error_thrown) => handle_error(error_thrown, $errors_container, $loader_container, $reduce_button)
            });
        });
    });
}

function start_loading($results_container, $loader_container, $errors_container, $reduce_button)
{
    $results_container.slideUp();
    $errors_container.slideUp();
    $loader_container.slideDown();

    hide_mobile_reduce_button($reduce_button);
}

function handle_results(data, $results_container, $loader_container, $errors_container, $reduce_button, alternate_handles_selector, $from, $to)
{
    if (data['error'])
    {
        handle_error(data['error'], $errors_container, $loader_container);
        return;
    }

    history.pushState({}, data['title'], data['canonical_url']);

    $from.val(data['real_from']);
    $to.val(data['real_to']);

    $results_container.html(data['search_results_html']);
    $('title').text(data['title']);

    $loader_container.slideUp();
    $results_container.slideDown({
        always: () =>
        {
            bind_events_on_results($results_container);
            bind_events_on_alternatives($from, $to, alternate_handles_selector, $results_container, $loader_container, $errors_container, $reduce_button);

            display_mobile_reduce_button($reduce_button);
            update_mobile_reduce_button($results_container, $reduce_button);

            setTimeout(() => document.dispatchEvent(new CustomEvent('zeps-route-updated', {
                detail: data['highlighted_route']
            })), 100);
        }
    });
}

function handle_error(error, $errors_container, $loader_container, $reduce_button)
{
    let errors = {
        'not found': 'Impossible de trouver cette station. Vérifiez l\'orthographe.',
        'unreachable': 'Impossible de trouver un chemin entre ces deux stations.',
        'unknown': 'Une erreur inconnue est survenue. Veuillez réessayer.'
    };

    $errors_container.text(errors[error.toLowerCase()] || error);
    $loader_container.slideUp();
    $errors_container.slideDown();

    hide_mobile_reduce_button($reduce_button);
}
