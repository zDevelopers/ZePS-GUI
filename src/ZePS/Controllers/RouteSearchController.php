<?php

namespace ZePS\Controllers;

use Silex\Application;
use Symfony\Component\HttpFoundation\Response;
use ZePS\Quotes\QuotesManager;
use ZePS\Routing\RoutesManager;
use ZePS\Misc\DateTimeManager;


class RouteSearchController
{
    public function homepage(Application $app)
    {
        if ($app['request']->query->has('from') && $app['request']->query->has('to'))
        {
            $options = '';
            if ($app['request']->query->has('official'))
                $options .= 'official-';
            if ($app['request']->query->has('accessible'))
                $options .= 'accessible-';
            if ($app['request']->query->has('spawn'))
                $options .= 'spawn-';
            if ($app['request']->query->has('from_overworld') && $app['request']->query->get('from_overworld') == 'true')
                $options .= 'overworld-';

            $options = trim($options, '-');

            return $app->redirect($app['url_generator']->generate('zeps.search_results', array(
                'from'    => htmlspecialchars(trim($app['request']->query->get('from'))),
                'to'      => htmlspecialchars(trim($app['request']->query->get('to'))),
                'options' => $options
            )), 301);
        }

        $stations = RoutesManager::get_netherrail_stations();

        $error = null;
        if (empty($stations['stations']))
            $error = 'unreachable';

        return new Response($app['twig']->render('index.html.twig', array(
            'submitted' => false,
            'valid' => false,
            'error' => $error,
            'raw_error' => null,
            'from' => -1,
            'to' => -1,
            'options' => array('official' => false, 'accessible' => false),
            'raw_options' => '',
            'stations' => $stations,
            'route' => array(),
            'travel_time' => '',
            'travel_time_seconds' => 0,
            'compute_time' => 0,
            'stations_count' => 0,
            'changes_count' => 0,
            'directions_translations' => array(),
            'spawn_station' => RoutesManager::SPAWN_STATION,
            'image' => '',
            'quote' => QuotesManager::get_random_quote()
        )));
    }

    public function search_results(Application $app, $from, $to, $options)
    {
        $debug = $app['request']->query->has('debug');

        $valid = true;
        $error = null;
        $raw_error = null;

        $route = array();

        $accessible = false;
        $official = false;
        $from_overworld = false;

        $through_spawn = false;

        $nether_portal = array();

        $directions_translations = array(
            'north' => 'nord',
            'south' => 'sud',
            'east' => 'est',
            'west' => 'ouest'
        );

        $stations = RoutesManager::get_netherrail_stations($debug);

        if (empty($stations['stations']))
        {
            $valid = false;
            $error = 'unreachable';
        }
        else
        {
            $from_is_id = preg_match('/^\d+$/', $from);
            $to_is_id = preg_match('/^\d+$/', $to);

            if ($from_is_id || $to_is_id)
            {
                if (!isset($stations['stations'][$from]) || !isset($stations['stations'][$to]))
                    $app->abort(404);

                return $app->redirect($app['url_generator']->generate('zeps.search_results', array
                (
                    'from' => $from_is_id ? $stations['stations'][$from]->code_name : $from,
                    'to' => $to_is_id ? $stations['stations'][$to]->code_name : $to,
                    'options' => $options
                )), 301);
            }

            $options_split = explode('-', $options);

            $from = RoutesManager::station_name_to_id($from);
            $to   = RoutesManager::station_name_to_id($to);

            if ($from === null || $to === null)
                $app->abort(404);

            if (in_array('official', $options_split))
                $official = true;
            if (in_array('accessible', $options_split))
                $accessible = true;
            if (in_array('overworld', $options_split))
                $from_overworld = true;
            if (in_array('spawn', $options_split))
                $through_spawn = true;

            try
            {
                $route = RoutesManager::get_netherrail_route($from, $to, $official, $accessible, $debug);

                if ($route == null)
                {
                    $valid = false;
                    $error = 'unreachable';
                }
                else
                {
                    $route->compact();

                    // If needed, the nether portal coordinates are calculated
                    if ($from_overworld && $route->getStepsCount() > 0)
                    {
                        $first_station = $route->getPath()[0]->getStation();
                        $nether_portal['x'] = $first_station->getLocationX() * 8;
                        $nether_portal['z'] = $first_station->getLocationZ() * 8;
                    }
                }
            }
            catch(\RuntimeException $e)
            {
                if ($e->getMessage() == 'Path not found.')
                    $error = 'no_path';
                else
                    $error = 'unknown';
            }
        }

        return new Response($app['twig']->render('index.html.twig', array(
            'submitted' => true,
            'valid' => $valid,
            'error' => $error,
            'raw_error' => $raw_error,
            'from' => $from,
            'to' => $to,
            'options' => array('official' => $official, 'accessible' => $accessible),
            'raw_options' => $options,
            'stations' => $stations,

            'route' => $route,

            'from_overworld' => $from_overworld,
            'nether_portal' => $nether_portal,

            'through_spawn' => $through_spawn,

            'directions_translations' => $directions_translations,

            'spawn_station' => RoutesManager::SPAWN_STATION,
            'spawn_station_id' => RoutesManager::station_name_to_id(RoutesManager::SPAWN_STATION),

            'image' => $error == null ? RoutesManager::get_netherrail_route_image($route) : ''
        )));
    }
}
