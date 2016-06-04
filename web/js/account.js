(function(window) {
    'use strict';

    var Account =
    {
        logged_in: false,

        username: undefined,
        uuid: undefined,

        avatarsURL: undefined,
        accountsCheckURL: undefined,

        login: function (username, callback)
        {
            $.getJSON(Account.accountsCheckURL.replace('playerNamePlaceholder', username), function(result)
            {
                if (!result.success)
                {
                    if (callback) callback(result);
                    return;
                }

                Account.logged_in = true;
                Account.username = result.username;
                Account.uuid = result.uuid;

                Account._update_UI();
                Account._update_local_storage();

                if (callback) callback(result);
            });
        },

        logout: function()
        {
            Account.logged_in = false;
            Account.username = undefined;
            Account.uuid = undefined;

            Account._update_UI();
            Account._update_local_storage();
        },

        login_from_local_storage: function()
        {
            if (!Account._local_storage_available()) return;

            Account.logged_in = localStorage['zeps.account.logged_in'] == 'true';

            if (Account.logged_in)
            {
                Account.username = localStorage['zeps.account.username'];
                Account.uuid     = localStorage['zeps.account.uuid'];
            }

            Account._update_UI()
        },

        _update_UI: function()
        {
            if (!Account.logged_in)
            {
                $('#account-image-authenticated').attr('src', '');
                $('#account-loggedInAs-player-name').text('');

                $('.authenticated, #account-image-authenticated').hide();
                $('.unauthenticated, #account-image-unauthenticated').show();
            }
            else
            {
                $('#account-image-authenticated').attr('src', Account.avatarsURL.replace('playerNamePlaceholder', Account.uuid));
                $('#account-loggedInAs-player-name').text(Account.username);

                $('.unauthenticated, #account-image-unauthenticated').hide();
                $('.authenticated, #account-image-authenticated').show();
            }
        },

        _local_storage_available: function ()
        {
            try
            {
                return 'localStorage' in window && window['localStorage'] !== null;
            }
            catch (e)
            {
                return false;
            }
        },

        _update_local_storage: function()
        {
            if (!Account._local_storage_available()) return;

            localStorage['zeps.account.logged_in'] = Account.logged_in ? 'true' : 'false';
            localStorage['zeps.account.username'] = Account.username;
            localStorage['zeps.account.uuid'] = Account.uuid;
        },


        init: function()
        {
            if (Account.avatarsURL == undefined || Account.accountsCheckURL == undefined)
            {
                console.error("Accounts component badly initialized.");
                return;
            }

            if (!Account._local_storage_available())
            {
                console.error('Browser too old to support accounts');
                return;
            }

            $("#account-menu").show();

            Account.login_from_local_storage();
        }
    };

    window.Account = Account;
})(window);


$(function() {
    'use strict';

    var $account_modal = $('#account-login-modal');
    var $account_modal_form = $('#account-login-modal-form');
    var $account_modal_button = $('#account-login-modal-button');
    var $account_modal_input = $('#account-login-modal-input-name');
    var $account_modal_input_feedback = $('#account-login-modal-input-name-feedback');
    var $account_modal_error = $('#account-login-modal-error');

    $('.account-link-logout').click(Account.logout);

    $('.account-link-login').click(function()
    {
        $account_modal.modal('show');
        $account_modal_input.focus();
    });

    $account_modal_input.keyup(function(e)
    {
        if ($(this).val().length == 0)
        {
            $account_modal_button.attr('disabled', true);
        }
        else
        {
            $account_modal_button.removeAttr('disabled');

            // Enter pressed
            if (e.keyCode == 13)
            {
                $account_modal_button.click();
            }
        }
    });

    $account_modal_button.click(function()
    {
        $account_modal_form.addClass('has-feedback');

        $account_modal_input_feedback
            .removeClass('glyphicon-ok glyphicon-remove')
            .addClass('glyphicon-option-horizontal')
            .show();

        $account_modal_button.attr('disabled', true);
        $account_modal_error.html('&nbsp;');

        Account.login($account_modal_input.val(), function(result)
        {
            if (result.success)
            {
                $account_modal_form.removeClass('has-error').addClass('has-success');
                $account_modal_input_feedback
                    .removeClass('glyphicon-option-horizontal')
                    .addClass('glyphicon-ok');

                setTimeout(function()
                {
                    $account_modal.modal('hide');
                    $account_modal_button.removeAttr('disabled');
                }, 1000);
            }
            else
            {
                $account_modal_form.removeClass('has-success').addClass('has-error');
                $account_modal_input_feedback
                    .removeClass('glyphicon-option-horizontal')
                    .addClass('glyphicon-remove');

                $account_modal_error.text(result.error);

                $account_modal_button.removeAttr('disabled');
            }
        });
    });

    $account_modal.on('hidden.bs.modal', function (e) {
        $account_modal_input.val('');
        $account_modal_button.attr('disabled', true);

        $account_modal_form.removeClass('has-success has-error has-feedback');
        $account_modal_input_feedback.removeClass('glyphicon-ok glyphicon-remove glyphicon-option-horizontal').hide();
        $account_modal_error.html('&nbsp;');
    })
});
