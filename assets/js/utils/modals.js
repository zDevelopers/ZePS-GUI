'use strict';

export function setup_modals_interaction()
{
    $('.modal-close, .modal-background, .modal-close-handler').on('click', function()
    {
        let $modal = $(this).parents('.modal');

        $modal.removeClass('is-active');
        document.dispatchEvent(new CustomEvent('zeps-modal-closed', { detail: $modal }));
    });

    $(document).on('keydown', function(e)
    {
        if (e.which === 27) {
            let $modal = $('.modal.is-active');

            $modal.removeClass('is-active');
            document.dispatchEvent(new CustomEvent('zeps-modal-closed', { detail: $modal }));
        }
    });
}
