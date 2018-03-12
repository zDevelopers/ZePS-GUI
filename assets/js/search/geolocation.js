'use strict';

$(function ()
{
    // Non-Javascript graceful degradation
    $('#open-geolocation-icon').append('<span class="fa fa-location-arrow" aria-hidden="true"></span>');
    $('.cliquable-icon').removeClass("cliquable-icon-nojs");

    var $geolocation_modal_selector = $('#geolocation-modal-selector');
    var $geolocation_modal_loading  = $('#geolocation-modal-loading');

    var $geolocation_modal_error_nether_empty            = $('#geolocation-modal-error-nether-empty');
    var $geolocation_modal_error_cannot_retrieve         = $('#geolocation-modal-error-cannot-retrieve');
    var $geolocation_modal_error_cannot_retrieve_id      = $('#geolocation-modal-error-cannot-retrieve-error-id');
    var $geolocation_modal_error_cannot_retrieve_message = $('#geolocation-modal-error-cannot-retrieve-error-message');

    var $geolocation_modal_title         = $('#geolocation-modal-title');
    var $geolocation_modal_selector_list = $('#geolocation-modal-selector-list');
    var $geolocation_modal_button        = $('#geolocation-modal-button');

    var $from_input           = $('#from');
    var $from_input_code      = $('#from_code_name');
    var $from_overworld_field = $('#from_overworld');


    $('#open-geolocation-icon, .geolocation-modal-retry').click(open_geolocation_dialog);

    $from_input.on('change', function () {
        if (this.value == "")
            open_geolocation_dialog();
        else
            $from_overworld_field.val('false');
    });

    $geolocation_modal_button.on('click', retrieve_nearest_station);

    function open_geolocation_dialog(e)
    {
        e.preventDefault();

        // First the modal is shown (with a loading animation)
        $geolocation_modal_error_nether_empty.hide();
        $geolocation_modal_error_cannot_retrieve.hide();
        $geolocation_modal_selector.hide();
        $geolocation_modal_loading.show();

        $geolocation_modal_button.attr('disabled', true);

        $('#geo-geolocation-modal').addClass('is-active');

        $(document).on('keydown.zeps.geolocation', function(e)
        {
            e.which == 27 && $('#geo-geolocation-modal').removeClass('is-active');
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

                $('.geolocation-modal-selector-list-item').on('click.zeps.geolocation_list', function() {
                    retrieve_nearest_station($(this).attr('data-player-name'));
                });
            }
        });
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

            $('#geo-geolocation-modal').removeClass('is-active');
            $(document).off('keydown.zeps.geolocation');
            $('.geolocation-modal-selector-list-item').off('click.zeps.geolocation_list');
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
});
