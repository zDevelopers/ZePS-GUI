<?php

namespace ZePS\Controllers;

use Silex\Application;
use Symfony\Component\HttpFoundation\Response;
use ZePS\Routing\AlternativeRoutingPath;
use ZePS\Routing\RoutesManager;


class RouteSearchController
{
    public function homepage(Application $app)
    {
        if ($app['request']->query->has('from') && $app['request']->query->has('to'))
        {
            $from = htmlspecialchars(trim($app['request']->query->get('from')));
            $to = htmlspecialchars(trim($app['request']->query->get('to')));

            if (empty($from) || empty($to))
                return $app->redirect($app['url_generator']->generate('zeps.homepage'));

            $from_station = $app['zeps.routing']->get_station_by_codename($from);
            $to_station   = $app['zeps.routing']->get_station_by_codename($to);

            if ($from_station == null)
                $from_station = $app['zeps.routing']->get_station_by_displayname($from);

            if ($to_station == null)
                $to_station = $app['zeps.routing']->get_station_by_displayname($to);

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
                'from'    => $from_station != null ? $from_station->getName() : $from,
                'to'      => $to_station != null ? $to_station->getName() : $to,
                'options' => $options
            )), Response::HTTP_MOVED_PERMANENTLY);
        }


        $stations = $app['zeps.routing']->get_netherrail_stations();

        $error = null;
        if (empty($stations['stations']))
            $error = 'unreachable';

        return new Response($app['twig']->render('index.html.twig', array(
            'error'    => $error,
            'stations' => $stations,
            'main_stations' => $app['zeps.routing']->get_main_stations(),
            'quote'    => $app['zeps.quotes']->get_random_quote()
        )));
    }

    public function search_results(Application $app, $from, $to, $options)
    {
        $debug = $app['request']->query->has('debug');

        $valid = true;
        $error = null;
        $raw_error = null;

        $route = [];
        $alternatives = [];

        $accessible = false;
        $official = false;
        $from_overworld = false;

        $through_spawn = false;
        $force_direct = false;

        $nether_portal = array();

        $directions_translations = array(
            'north' => 'le nord',
            'south' => 'le sud',
            'east' => 'l\'est',
            'west' => 'l\'ouest'
        );

        $stations = $app['zeps.routing']->get_netherrail_stations($debug);

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
                    'from' => $from_is_id ? $stations['stations'][$from]->getName() : $from,
                    'to' => $to_is_id ? $stations['stations'][$to]->getName() : $to,
                    'options' => $options
                )), 301);
            }

            $options_split = explode('-', $options);

            $from = $app['zeps.routing']->station_name_to_id($from);
            $to   = $app['zeps.routing']->station_name_to_id($to);

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
            else if (in_array('direct', $options_split))
            {
                $through_spawn = false;
                $force_direct = true;
            }

            try
            {
                /** @var $route \Zeps\Routing\RoutingPath */
                $route = $app['zeps.routing']->get_netherrail_route($from, $to, $official, $accessible, $debug);

                if ($route === null)
                {
                    $valid = false;
                    $error = 'unreachable';
                }
                else
                {
                    // We calculate the routes through the main stations to see if it's shorter
                    $shortest_path = $route;
                    $shortest_path_threshold = $app['config']['shortest_path_threshold'];

                    foreach ($app['zeps.routing']->get_main_stations() as $main_station)
                    {
                        /** @var $alternative \Zeps\Routing\RoutingPath */
                        $alternative = $app['zeps.routing']->get_netherrail_route($app['zeps.routing']->station_name_to_id($main_station), $to, $official, $accessible, $debug);
                        if ($alternative->getTravelTime() < $route->getTravelTime() - $shortest_path_threshold && $alternative->getTravelTime() < $shortest_path->getTravelTime())
                        {
                            $shortest_path = $alternative;
                        }
                    }

                    if ($shortest_path !== $route)
                    {
                        if (!$force_direct)
                        {
                            $alternatives[] = new AlternativeRoutingPath($shortest_path, $route, $route, 'direct');
                            $route = $shortest_path;
                            $through_spawn = true;
                        }
                        else
                        {
                            $alternatives[] = new AlternativeRoutingPath($route, $shortest_path, $route, 'spawn');
                        }
                    }

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
            'valid'        => $valid,
            'error'        => $error,
            'raw_error'    => $raw_error,
            'from'         => $from,
            'to'           => $to,
            'options'      => array('official' => $official, 'accessible' => $accessible),
            'raw_options'  => $options,
            'stations'     => $stations,
            'main_stations' => $app['zeps.routing']->get_main_stations(),

            'route'        => $route,
            'alternatives' => $alternatives,

            'from_overworld' => $from_overworld,
            'nether_portal'  => $nether_portal,

            'through_spawn'  => $through_spawn,

            'directions_translations' => $directions_translations,

            'spawn_station'    => $app['zeps.routing']->get_spawn_station(),
            'spawn_station_id' => $app['zeps.routing']->station_name_to_id($app['zeps.routing']->get_spawn_station())
        )));
    }
}
