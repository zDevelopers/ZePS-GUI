<?php

namespace ZePS\Controllers;

use DateTime;
use Doctrine\Common\Cache\Cache;
use GitWrapper\GitWrapper;
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


        // Updates

        $last_update_network = $app['cache.routing']->fetch($app['config']['cache']['last_update_cache_key']);

        $last_update_zeps = array();
        $wrapper = new GitWrapper();
        $git = $wrapper->workingCopy($app['root_directory']);

        $last_commit = $git->log(['n' => '1', 'pretty' => 'medium', 'date' => 'iso8601-strict', 'no-merges' => true])->getOutput();
        error_log($last_commit);
        foreach (explode("\n", $last_commit) as $line)
        {
            $rline = $line;
            $line = trim($line);
            if (empty($line)) continue;

            if (strpos($line, 'commit') === 0)
            {
                $last_update_zeps['commit'] = @array_pop(explode(' ', $line));
            }
            else if (strpos($line, 'Author') === 0)
            {
                $last_update_zeps['author'] = @trim(explode(' <', array_pop(explode(':', $line)))[0]);
            }
            else if (strpos($line, 'Date') === 0)
            {
                $last_update_zeps['date'] = DateTime::createFromFormat(DateTime::ISO8601, trim(implode(':', array_slice(explode(':', $line), 1))));
            }
            else if (strpos($rline, '    ') === 0)
            {
                if (array_key_exists('message', $last_update_zeps))
                {
                    $last_update_zeps['message'] += "\n" + trim($line);
                }
                else
                {
                    $last_update_zeps['message'] = trim($line) . "\n";
                }
            }
        }

        $last_update_zeps['signed'] = strpos($git->log(['n' => '1', 'pretty' => 'raw'])->getOutput(), '-----BEGIN PGP SIGNATURE-----') !== false;


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
            ),
            'last_updates' => array(
                'network' => $last_update_network,
                'zeps' => $last_update_zeps
            ),
        )));
    }
}
