'use strict';

export function setup_modals_interaction()
{
	$('.modal-close, .modal-background, .modal-close-handler').on('click', function() {
		$(this).parent('.modal').removeClass('is-active');
	});
}
