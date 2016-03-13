$(function ()
{
    $('[data-toggle="tooltip"]').tooltip();

    var $geolocation_modal_selector = $('#geolocation-modal-selector');
    var $geolocation_modal_loading  = $('#geolocation-modal-loading');

    var $geolocation_modal_error_nether_empty            = $('#geolocation-modal-error-nether-empty');
    var $geolocation_modal_error_cannot_retrieve         = $('#geolocation-modal-error-cannot-retrieve');
    var $geolocation_modal_error_cannot_retrieve_id      = $('#geolocation-modal-error-cannot-retrieve-error-id');
    var $geolocation_modal_error_cannot_retrieve_message = $('#geolocation-modal-error-cannot-retrieve-error-message');

    var $geolocation_modal_selector_list = $('#geolocation-modal-selector-select');
    var $geolocation_modal_title         = $('#geolocation-modal-title');
    var $geolocation_modal_button        = $('#geolocation-modal-button');

    var $from_select = $('#from');


    // Added in JavaScript so the users without are not disturbed.
    $('#starting-point-placeholder').after('<option value="">Me localiser...</option>');

    $('.open-geolocation-dialog').click(open_geolocation_dialog);

    $from_select.on('change', function (e) {
        if (this.value == "")
            open_geolocation_dialog();
    });

    $geolocation_modal_button.on('click', retrieve_nearest_station);


    function open_geolocation_dialog()
    {
        // First the modal is shown (with a loading animation)
        $geolocation_modal_error_nether_empty.hide();
        $geolocation_modal_error_cannot_retrieve.hide();
        $geolocation_modal_selector.hide();
        $geolocation_modal_loading.show();

        $geolocation_modal_button.attr('disabled', true);

        $('#geo-geolocation-modal').modal('show');


        // Then we load players in the nether and display them
        //noinspection JSUnresolvedVariable
        $.getJSON(routes.get_players, function (players)
        {
            if (players.length == 0)
            {
                $geolocation_modal_loading.hide();
                $geolocation_modal_error_nether_empty.show();

                $geolocation_modal_button.attr('disabled', true);
            }
            else
            {
                var list_content = '';

                players.forEach(function (player) {
                    list_content += '<option data-content="<div class=\'avatar-in-select\'><img src=\'https://crafatar.com/avatars/' + player.name + '?overlay&size=32\' alt=\'[Avatar]\' aria-hidden=\'true\' /></div>' + player.name + '" value="' + player.name + '">' + player.display_name + '</option>';
                });

                $geolocation_modal_loading.hide();
                $geolocation_modal_selector.show();

                $geolocation_modal_selector_list.empty().append(list_content);
                $geolocation_modal_selector_list.selectpicker('refresh');

                if (/Android|webOS|iPhone|iPad|iPod|BlackBerry/i.test(navigator.userAgent)) {
                    $geolocation_modal_selector_list.selectpicker('mobile');
                }

                $geolocation_modal_title.text("Qui êtes-vous ?");
                $geolocation_modal_button.attr('disabled', false);
            }
        });
    }

    function retrieve_nearest_station()
    {
        $geolocation_modal_error_nether_empty.hide();
        $geolocation_modal_error_cannot_retrieve.hide();
        $geolocation_modal_selector.hide();
        $geolocation_modal_loading.show();

        $geolocation_modal_button.attr('disabled', true);


        var player_name = $geolocation_modal_selector_list.val();

        $.getJSON(routes.get_nearest.replace('playerNamePlaceholder', player_name), function (result)
        {
            $from_select.val(result.nearest_station.code_name);
            $('#geo-geolocation-modal').modal('hide');
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
