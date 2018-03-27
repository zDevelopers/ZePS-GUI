'use strict';

let $geolocation_handle, $geolocation_modal;

let $geolocation_modal_selector, $geolocation_modal_loading;

let $geolocation_modal_error_nether_empty;
let $geolocation_modal_error_cannot_retrieve;
let $geolocation_modal_error_cannot_retrieve_id;
let $geolocation_modal_error_cannot_retrieve_message;

let $geolocation_modal_title;
let $geolocation_modal_selector_list;
let $geolocation_modal_button;

let $from_input, $from_overworld_field;

export function setup_geolocation($handle, $modal, $from, $from_overworld)
{
    $geolocation_handle = $handle;
    $geolocation_modal  = $modal;

    // Non-Javascript graceful degradation
    $handle.append('<span class="fa fa-location-arrow" aria-hidden="true"></span>');
    $('.cliquable-icon').removeClass("cliquable-icon-nojs");

    $geolocation_modal_selector = $modal.find('.geolocation-modal-selector');
    $geolocation_modal_loading  = $modal.find('.geolocation-modal-loading');

    $geolocation_modal_error_nether_empty            = $modal.find('.geolocation-modal-error-nether-empty');
    $geolocation_modal_error_cannot_retrieve         = $modal.find('.geolocation-modal-error-cannot-retrieve');
    $geolocation_modal_error_cannot_retrieve_id      = $modal.find('.geolocation-modal-error-cannot-retrieve-error-id');
    $geolocation_modal_error_cannot_retrieve_message = $modal.find('.geolocation-modal-error-cannot-retrieve-error-message');

    $geolocation_modal_title         = $modal.find('.geolocation-modal-title');
    $geolocation_modal_selector_list = $modal.find('.geolocation-modal-selector-list');
    $geolocation_modal_button        = $modal.find('.geolocation-modal-button');

    $from_input           = $from;
    $from_overworld_field = $from_overworld;

    $('#open-geolocation-icon, .geolocation-modal-retry').click(open_geolocation_dialog);

    $from_input.on('change', function() {
        if (this.value.length !== 0)
            $from_overworld_field.val('false');
    });

    $geolocation_modal_button.on('click', retrieve_nearest_station);
}

function retrieve_nearest_station(player_name)
{
    $geolocation_modal_error_nether_empty.hide();
    $geolocation_modal_error_cannot_retrieve.hide();
    $geolocation_modal_selector.hide();
    $geolocation_modal_loading.show();

    $geolocation_modal_button.attr('disabled', true);

    $geolocation_modal_title.text("Recherche...");

    $.getJSON(routes.get_nearest.replace('playerNamePlaceholder', player_name), function (result)
    {
        $from_input.val(result.nearest_station.full_name);
        $from_input_code.val(result.nearest_station.code_name);

        if (result.from_overworld)
            $from_overworld_field.val('true');

        $geolocation_modal.removeClass('is-active');
        $(document).off('keydown.zeps.geolocation');
        $geolocation_modal.find('.geolocation-modal-selector-list-item').off('click.zeps.geolocation_list');
    })
    .fail(function (error)
    {
        $geolocation_modal_title.text("Impossible de récupérer la station :/");
        $geolocation_modal_error_cannot_retrieve_id.text(error.responseJSON.error_code);
        $geolocation_modal_error_cannot_retrieve_message.text(error.responseJSON.error_message);

        $geolocation_modal_loading.hide();
        $geolocation_modal_error_cannot_retrieve.show();
    });
}

function open_geolocation_dialog(e)
{
    if (e) e.preventDefault();

    // First the modal is shown (with a loading animation)
    $geolocation_modal_error_nether_empty.hide();
    $geolocation_modal_error_cannot_retrieve.hide();
    $geolocation_modal_selector.hide();
    $geolocation_modal_loading.show();

    $geolocation_modal_button.attr('disabled', true);

    $geolocation_modal.addClass('is-active');

    $(document).on('keydown.zeps.geolocation', function(e)
    {
        e.which == 27 && $geolocation_handle.removeClass('is-active');
    });

    // Then we load players in the nether and display them
    $.getJSON(routes.get_players, function (players)
    {
        if (players.length == 0)
        {
            $geolocation_modal_loading.hide();
            $geolocation_modal_error_nether_empty.show();

            $geolocation_modal_title.text("Ô rage ! ô désespoir !");

            $geolocation_modal_button.attr('disabled', true);
        }
        else
        {
            var list_content = '';

            players.forEach(function (player) {
                list_content += '<div class="column is-half"><div class="geolocation-modal-selector-list-item" data-player-name="' + player.name + '"><img src="' + routes.get_head.replace('playerNamePlaceholder', player.name) + '" alt="[Avatar]" aria-hidden="true" /><span>' + player.name + '</span></div></div>';
            });

            $geolocation_modal_loading.hide();
            $geolocation_modal_selector.show();

            $geolocation_modal_selector_list.empty().append(list_content);

            $geolocation_modal_title.text("Qui êtes-vous ?");
            $geolocation_modal_button.attr('disabled', false);

            $geolocation_modal.find('.geolocation-modal-selector-list-item').on('click.zeps.geolocation_list', function() {
                retrieve_nearest_station($(this).attr('data-player-name'));
            });
        }
    });
}
