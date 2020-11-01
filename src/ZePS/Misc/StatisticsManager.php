<?php

namespace ZePS\Misc;

use DateTime;
use Doctrine\Common\Cache\Cache;
use GitWrapper\GitWrapper;
use Silex\Application;
use Symfony\Component\HttpFoundation\Response;
use ZePS\Routing\Station;


class StatisticsManager
{
    /**
     * @var Application
     */
    private $app;

    const CACHE_UPDATE_INFO = 'update-info';
    const CACHE_STATISTICS = 'statistics';

    /**
     * @param Application $app The app.
     */
    public function __construct(Application $app)
    {
        $this->app = $app;
    }

    public function get_update_infos()
    {
        $update_info = $this->app['cache.misc']->fetch(self::CACHE_UPDATE_INFO);
        if ($update_info !== false) return $update_info;

        $last_update_network = $this->app['cache.routing']->fetch($this->app['config']['cache']['last_update_cache_key']);

        $last_update_zeps = [];
        $wrapper = new GitWrapper($this->app['config']['git']['exec']);
        $git = $wrapper->workingCopy($this->app['root_directory']);

        $last_commit = $git->log(['n' => '1', 'pretty' => 'medium', 'date' => 'iso8601', 'no-merges' => true])->getOutput();

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
                $last_update_zeps['date'] = DateTime::createFromFormat("Y-m-d H:i:s O", trim(implode(':', array_slice(explode(':', $line), 1))));
            }
            else if (strpos($rline, '    ') === 0)
            {
                if (array_key_exists('message', $last_update_zeps))
                {
                    $last_update_zeps['message'] .= "\n" . trim($line);
                }
                else
                {
                    $last_update_zeps['message'] = trim($line) . "\n";
                }
            }
        }

        $last_update_zeps['message'] = preg_replace("/\n[-*] (.+)/m", "\n→ <em>$1</em>", $last_update_zeps['message']);
        $last_update_zeps['signed'] = strpos($git->log(['n' => '1', 'pretty' => 'raw', 'no-merges' => true])->getOutput(), '-----BEGIN PGP SIGNATURE-----') !== false;

        $update_info = [
            'network' => $last_update_network,
            'zeps' => $last_update_zeps
        ];

        // Don't cache if the network is not retrieved yet.
        // Else we'll store nothing for a day, if the cache was just cleared, as this
        // is called before the first retrieval of the routing data, initialising the
        // last update cache key.
        if ($last_update_network !== false)
            $this->app['cache.misc']->save(self::CACHE_UPDATE_INFO, $update_info, 86400);

        return $update_info;
    }

    public function get_statistics()
    {
        $statistics = $this->app['cache.misc']->fetch(self::CACHE_STATISTICS);
        $space_used_by_routing_cache = $this->app['cache.routing']->getStats()[Cache::STATS_MEMORY_USAGE];

        if ($statistics !== false)
        {
            // This is not cached
            $statistics['cache']['space_used'] = $space_used_by_routing_cache;
            return $statistics;
        }

        // Index statistics

        $all_stations = $this->app['zeps.routing']->get_netherrail_stations();

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

        $network = $this->app['zeps.routing']->get_netherrail_network();

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

        $network_colors = $this->app['zeps.routing']->get_netherrail_network_colors();

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


        $statistics = [
            'stations' => [
                'all' => $stations_count_all,
                'main' => $stations_count_main,
                'hidden' => $stations_count_hidden,
                'dangerous' => $stations_count_dangerous,
                'portal' => $stations_count_portal,
                'no_stop' => $stations_count_without_stop
            ],
            'network' => [
                'all' => $network_length,
                'rail' => $network_length_rail,
                'walk' => $network_length_walk,
                'lines' => $lines
            ],
            'cache' => [
                'space_used' => $space_used_by_routing_cache
            ],
        ];

        $this->app['cache.misc']->save(self::CACHE_STATISTICS, $statistics, 86400);

        return $statistics;
    }
}
