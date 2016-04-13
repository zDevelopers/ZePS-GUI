<?php

namespace ZePS\Controllers;

use Doctrine\Common\Cache\Cache;
use Silex\Application;
use Symfony\Component\HttpFoundation\Response;
use ZePS\Routing\Station;


class StatisticsController
{
    public function statistics(Application $app)
    {
        // Index statistics

        $all_stations = $app['zeps.routing']->get_netherrail_stations();

        /** @var $stations Station[] */
        $stations = $all_stations['stations'];

        /** @var $stations Station[] */
        $main_stations = $all_stations['main_stations'];


        $stations_count_all = count($stations);
        $stations_count_main = count($main_stations);

        $stations_count_hidden = 0;
        $stations_count_without_stop = 0;
        $stations_count_portal = 0;
        $stations_count_dangerous = 0;

        foreach ($stations as $station)
        {
            if (!$station->isVisible())      $stations_count_hidden++;
            if (!$station->isIntersection()) $stations_count_without_stop++;
            if (!$station->isSafe())         $stations_count_dangerous++;

            if ($station->isPortal()) $stations_count_portal++;
        }


        // Network length statistics

        $network = $app['zeps.routing']->get_netherrail_network();

        $network_length = 0;
        $network_length_rail = 0;
        $network_length_walk = 0;

        if ($network !== false)
        {
            $checked_paths = array();

            foreach ($network as $station)
            {
                foreach ($station->network as $link)
                {
                    $key = min($link->from, $link->to) . '-' . max($link->from, $link->to);

                    if (!in_array($key, $checked_paths))
                    {
                        $checked_paths[] = $key;

                        $network_length += $link->length;

                        if ($link->is_rail) $network_length_rail += $link->length;
                        else                $network_length_walk += $link->length;
                    }
                }
            }
        }


        // Network lines

        $network_colors = $app['zeps.routing']->get_netherrail_network_colors();

        $lines = 0;
        $colors = array();

        foreach ($network_colors as $direction)
        {
            foreach ($direction as $line)
            {
                $color = $line->color->red . '-' . $line->color->green . '-' . $line->color->blue;
                if (!in_array($color, $colors))
                {
                    $colors[] = $color;
                    $lines++;
                }
            }
        }


        // Cache statistics

        $cache_stats = $app['cache.routing']->getStats();


        return new Response($app['twig']->render('statistics.html.twig', array(
            'section' => 'statistics',
            'stations' => array(
                'all' => $stations_count_all,
                'main' => $stations_count_main,
                'hidden' => $stations_count_hidden,
                'dangerous' => $stations_count_dangerous,
                'portal' => $stations_count_portal,
                'no_stop' => $stations_count_without_stop
            ),
            'network' => array(
                'all' => $network_length,
                'rail' => $network_length_rail,
                'walk' => $network_length_walk,
                'lines' => $lines
            ),
            'cache' => array(
                'space_used' => $cache_stats[Cache::STATS_MEMORY_USAGE]
            )
        )));
    }
}
