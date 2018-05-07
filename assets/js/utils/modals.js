'use strict';

function close_modal($modal)
{
    $modal.removeClass('is-active');
    $('body').removeClass('has-modal');
    document.dispatchEvent(new CustomEvent('zeps-modal-closed', { detail: $modal }));
}

export function setup_modals_interaction()
{
    $('.modal-close, .modal-background, .modal-close-handler').on('click', function()
    {
        close_modal($(this).parents('.modal'));
    });

    $(document).on('keydown', function(e)
    {
        if (e.which === 27)
        {
            close_modal($('.modal.is-active'));
        }
    });
}
