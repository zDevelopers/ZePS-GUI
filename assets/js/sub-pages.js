'use strict';

export function setup_sub_pages($sub_pages_modal)
{
    let $pages = $sub_pages_modal.find('.modal-content article');
    let $links_li = $sub_pages_modal.find('header .tabs ul li');

    $pages.hide();
    $links_li.find('a').on('click', e => switch_to_tab(e.target.attributes.href.value, $links_li, $pages));

    let initial_selector = window.location.hash;
    if ($links_li.find('a[href="' + initial_selector + '"]').length !== 0)
    {
        switch_to_tab(initial_selector, $links_li, $pages);
        $sub_pages_modal.addClass('is-active');
        $('body').addClass('has-modal');
    }

    // The events are added when the map is loaded, because else the links are not there yet
    // and when the map is reloaded, because it appears Leaflet re-generates completely the attribution pane when it changes.
    document.addEventListener('zeps-map-loaded',   () => setup_links_events($sub_pages_modal, $links_li, $pages));
    document.addEventListener('zeps-map-reloaded', () => setup_links_events($sub_pages_modal, $links_li, $pages));

    document.addEventListener('zeps-modal-closed', e =>
    {
        if (e.detail.prop('id') === $sub_pages_modal.prop('id'))
        {
            window.location.hash = '';
        }
    });
}

function setup_links_events($sub_pages_modal, $links_li, $pages)
{
    $('a.sub-pages-handle').on('click', e =>
    {
        if ($links_li.find('a[href="' + e.currentTarget.attributes.href.value + '"]'))
        {
            $sub_pages_modal.addClass('is-active');
            $('body').addClass('has-modal');
            switch_to_tab(e.currentTarget.attributes.href.value, $links_li, $pages);
        }
    });
}

function switch_to_loader($pages)
{
    $pages.hide();
    $pages.filter('#loading').show();
}

function switch_to_error(error, error_code, $pages)
{
    $pages.hide();
    let $error_page = $pages.filter('#error');

    $error_page.find('.reason').hide();

    if (error === 'timeout')
        $error_page.find('.reason.timeout').show();
    else if (error === 'error')
        $error_page.find('.reason.http').show();
    else if (error === 'abort')
        $error_page.find('.reason.abort').show();

    $error_page.find('.error-code').text(error_code);

    $error_page.show();
}

function switch_to_tab(selector, $links_li, $pages)
{
    $links_li.removeClass('is-active');
    $links_li.find('a[href="' + selector + '"]').parent('li').addClass('is-active');

    let $page = $(selector);

    if ($page.data('is-loaded'))
    {
        $pages.hide();
        $page.show();
    }
    else if ($page.data('source'))
    {
        switch_to_loader($pages);
        $.ajax({
            url: $page.data('source'),
            success: data =>
            {
                $page.html(data);
                $page.data('is-loaded', 'true');

                $pages.hide();
                $page.show();

                if ($page.data('has-events'))
                {
                    setup_sub_page_events($page);
                }
            },
            error: (xhr, error, error_code) => switch_to_error(error, error_code, $pages)
        });
    }
}

function setup_sub_page_events($page)
{
    let $form = $page.find('form.missing-stations-form');
    let $submit = $form.find('button[type="submit"]');
    let $table = $page.find('table.missing-stations-list');
    let $empty_row = $table.find('tr.no-missing-station');

    $form.on('submit', e =>
    {
        e.preventDefault();
        $submit.addClass('is-loading');

        $.ajax({
            url: $form.attr('action'),
            method: 'POST',
            data: $form.serialize(),
            success: data =>
            {
                $submit.removeClass('is-loading').data('message-previous', $submit.text()).text($submit.data('message-success'));

                if ($empty_row.is(':visible'))
                    $empty_row.hide();

                $table.append(data['html_row']);

                $form.find('input, select, textarea').val('');

                setTimeout(() =>
                {
                    $submit.text($submit.data('message-previous'));
                }, 4000);
            },
            error: () =>
            {
                $submit.removeClass('is-loading').addClass('is-danger').data('message-previous', $submit.text()).text($submit.data('message-error'));
                setTimeout(() =>
                {
                    $submit.removeClass('is-danger').text($submit.data('message-previous'));
                }, 4000);
            }
        });
    });
}
