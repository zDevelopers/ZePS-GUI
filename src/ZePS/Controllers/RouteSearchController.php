<?php

namespace ZePS\Controllers;

use Silex\Application;
use Symfony\Component\HttpFoundation\Response;
use ZePS\Managers\RoutesManager;
use ZePS\Managers\DateTimeManager;


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

            $options = trim($options, '-');

            return $app->redirect($app['url_generator']->generate('zeps.search_results', array(
                'from'    => htmlspecialchars(trim($app['request']->query->get('from'))),
                'to'      => htmlspecialchars(trim($app['request']->query->get('to'))),
                'options' => $options
            )));
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
            'stations' => $stations,
            'route' => array(),
            'travel_time' => '',
            'compute_time' => 0,
            'stations_count' => 0,
            'changes_count' => 0,
            'directions_translations' => array(),
            'image' => ''
        )));
    }

    public function search_results(Application $app, $from, $to, $options)
    {
        $debug = $app['request']->query->has('debug');

        $valid = true;
        $error = null;
        $raw_error = null;

        $raw_route = array();
        $route = array();

        $accessible = false;
        $official = false;

        $compute_time = 0;
        $travel_time = '';

        $stations_count = 0;
        $changes_count = 0;

        $distance = 0;

        $directions_translations = array(
            'north' => 'nord',
            'south' => 'sud',
            'east' => 'est',
            'west' => 'ouest'
        );

        $stations = RoutesManager::get_netherrail_stations($debug);

        if ($stations == null)
        {
            $valid = false;
            $error = 'unreachable';
        }
        else
        {
            $from_is_id = preg_match('/^\d+$/', $from);
            $to_is_id = preg_match('/^\d+$/', $to);

            if ($from_is_id || $to_is_id) {
                return $app->redirect($app['url_generator']->generate('tools.minecraft.zcraft.netherrail.results', array(
                    'from' => $from_is_id ? $stations['stations'][$from]->code_name : $from,
                    'to' => $to_is_id ? $stations['stations'][$to]->code_name : $to,
                    'options' => $options
                )));
            }

            $options_split = explode('-', $options);

            $from = RoutesManager::station_name_to_id($stations, $from);
            $to = RoutesManager::station_name_to_id($stations, $to);

            if (in_array('official', $options_split))
                $official = true;
            if (in_array('accessible', $options_split))
                $accessible = true;

            $raw_route = RoutesManager::get_netherrail_route($from, $to, $official, $accessible, $debug);

            if ($raw_route == null)
            {
                $valid = false;
                $error = 'unreachable';
            }
            else
            {
                if ($raw_route->result == "failed")
                {
                    $raw_error = $raw_route->cause;
                    if ($raw_error == "Path not found.")
                    {
                        $error = 'no_path';
                    }
                    else
                    {
                        $error = 'unknown';
                    }
                }
                else
                {
                    $travel_time = DateTimeManager::friendly_interval($raw_route->travel_time);
                    $compute_time = $raw_route->time;

                    // The sections are merged if they are in the same direction
                    $current_route_part = null;

                    foreach ($raw_route->stations AS $step)
                    {
                        // New direction?
                        if ($current_route_part == null || (isset($step->path_direction) && $step->path_direction != $current_route_part['direction']))
                        {
                            if ($current_route_part != null)
                            {
                                $current_route_part['to'] = $current_route_part['steps'][count($current_route_part['steps']) - 1];
                                $route[] = $current_route_part;
                            }

                            // It was not the last one
                            if (isset($step->path_direction))
                            {
                                $current_route_part = array(
                                    'direction' => $step->path_direction,
                                    'from' => $step,
                                    'to' => null,
                                    'steps' => array(),
                                    'length' => 0
                                );
                            }
                        }

                        $step_length = isset($step->path_length) ? $step->path_length : 0;

                        $current_route_part['steps'][] = $step;

                        if (isset($current_route_part['length']))
                            $current_route_part['length'] += $step_length;
                        else
                            $current_route_part['length'] = $step_length;

                        $distance += $step_length;
                    }

                    // Last route inserted (duplicated code :c )
                    $current_route_part['to'] = $current_route_part['steps'][count($current_route_part['steps']) - 1];
                    $route[] = $current_route_part;

                    $stations_count = count($raw_route->stations);
                    $changes_count = count($route);
                }
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
            'stations' => $stations,

            'route' => $route,
            'travel_time' => $travel_time,
            'compute_time' => $compute_time,

            'stations_count' => $stations_count,
            'changes_count' => $changes_count,
            'distance' => $distance,

            'directions_translations' => $directions_translations,

            'image' => $error == null ? RoutesManager::get_netherrail_route_image($raw_route) : ''
        )));
    }
}
