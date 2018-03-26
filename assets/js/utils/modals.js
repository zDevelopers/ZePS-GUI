'use strict';

export function setup_modals_interaction()
{
    $('.modal-close, .modal-background, .modal-close-handler').on('click', function() {
        $(this).parents('.modal').removeClass('is-active');
    });

    $(document).on('keydown', function(e)
    {
        e.which === 27 && $('.modal.is-active').removeClass('is-active');
    });
}
