<?php

namespace ZePS\Controllers;

use Silex\Application;
use Symfony\Component\HttpFoundation\Request;


class MissingController
{
    public function missings(Application $app)
    {
        $missings = [];
        if (file_exists($app['config']['missing_stations']['json_file']))
            $missings = json_decode(file_get_contents($app['config']['missing_stations']['json_file']));

        $flash_saved = false;
        if ($app['session']->has('missing_saved'))
        {
            $flash_saved = true;
            $app['session']->remove('missing_saved');
        }

        return $app['twig']->render('missings.html.twig', array(
            'missings' => $missings,
            'stations' => $app['zeps.routing']->get_netherrail_stations(),
            'saved'    => $flash_saved,
            'section'  => 'missing'
        ));
    }

    public function submit_missings(Application $app, Request $request)
    {
        $missings = [];
        if (file_exists($app['config']['missing_stations']['json_file']))
            $missings = json_decode(file_get_contents($app['config']['missing_stations']['json_file']));

        $r = $request->request;

        $name       = $r->get('station_name');
        $pos_x      = $r->get('station_coords_x');
        $pos_z      = $r->get('station_coords_z');
        $neighbor_1 = !empty(trim($r->get('station_neighbor_1_raw'))) ? $r->get('station_neighbor_1_raw') : $r->get('station_neighbor_1');
        $neighbor_2 = !empty(trim($r->get('station_neighbor_2_raw'))) ? $r->get('station_neighbor_2_raw') : $r->get('station_neighbor_2');
        $link       = $r->get('station_link');
        $notes      = $r->get('station_notes');

        if ($name == null || $pos_x === null || $pos_z === null)
            $app->abort(400);

        $missings[] = array(
            'name'      => trim($name),
            'location'  => array('x' => trim($pos_x), 'z' => trim($pos_z)),
            'neighbors' => array(trim($neighbor_1), trim($neighbor_2)),
            'link'      => trim($link),
            'notes'     => trim($notes),
            'ip'        => $request->getClientIp()
        );

        file_put_contents(
            $app['config']['missing_stations']['json_file'],
            json_encode($missings, JSON_NUMERIC_CHECK | JSON_PRETTY_PRINT | JSON_HEX_TAG | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_HEX_AMP | JSON_UNESCAPED_UNICODE)
        );

        $app['session']->set('missing_saved', true);

        return $app->redirect($app['url_generator']->generate('zeps.missing', array(), 301));
    }
}
