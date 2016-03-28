<?php

namespace ZePS\Managers;


class RoutesManager extends NetworkManager
{
    const API_LIST = 'https://florian.cassayre.me/api/minecraft/netherrail-list';
    const API_ROUTE = 'https://florian.cassayre.me/api/minecraft/netherrail';
    const API_ROUTE_IMAGE = 'https://florian.cassayre.me/api/minecraft/netherrail-map';

    const SPAWN_STATION = 'tentacles';
    const MAIN_NETHERRAIL_STATIONS = 'tentacles,vaalon,nouvea';


    /**
     * Returns the netherrail stations.
     *
     * @param bool $debug True to print debug notices.
     *
     * @return array An array, with two keys: a 'stations' one containing all the stations, and a 'main_stations'
     * containing the main stations.
     * The 'stations' sub-array is indexed by station ID, and the 'main_stations' one is indexed with arbitrary values
     * only used to sort them (in the same order than in RoutesManager::MAIN_NETHERRAIL_STATIONS).
     */
    public static function get_netherrail_stations($debug = false)
    {
        $json = self::get_json(self::API_LIST, $debug);

        if ($json == null || $json->result != "success")
            return array('stations' => array(), 'main_stations' => array());

        $stations = array();

        foreach ($json->stations AS $station)
            $stations[$station->id] = $station;

        $main_stations = array();
        $main_stations_codes = \explode(',', self::MAIN_NETHERRAIL_STATIONS);

        foreach ($json->stations AS $station)
            if (\in_array($station->code_name, $main_stations_codes))
                $main_stations[array_search($station->code_name, $main_stations_codes)] = $station;

        ksort($main_stations);

        return array(
            'stations' => $stations,
            'main_stations' => $main_stations
        );
    }

    /**
     * Retrieves a route.
     *
     * @param int $from The departure station ID.
     * @param int $to The destination station ID.
     * @param bool $official If true, avoids non-official stations.
     * @param bool $accessible If true, avoids stations non accessible from the modern netherrail.
     * @param bool $debug True to print debug notices.
     * @return object The route.
     */
    public static function get_netherrail_route($from, $to, $official = false, $accessible = false, $debug = false)
    {
        return self::get_json(self::API_ROUTE . '?begin=' . $from . '&end=' . $to . '&official=' . ($official ? 'true' : 'false') . '&accessible=' . ($accessible ? 'true' : 'false'), $debug);
    }

    /**
     * Returns a link to an image representing the route.
     *
     * @param object $routes The route, as returned by self::get_netherrail_route.
     * @return string The image URL.
     */
    public static function get_netherrail_route_image($routes)
    {
        $lines  = '';
        $points = '';

        $lines_limites = array();

        $prev_point = null;

        foreach ($routes->stations AS $step)
        {
            if (!$step->is_visible)
                continue;

            $point = $step->x . ',' . $step->y . ',';

            if ($prev_point != null)
            {
                $lines_limites[] = $prev_point . $point;
            }

            $points .= $point;
            $prev_point = $point;
        }

        foreach ($lines_limites AS $line)
        {
            $lines .= $line;
        }

        $lines  = \substr($lines,  0, -1);
        $points = \substr($points, 0, -1);

        return self::API_ROUTE_IMAGE . '?lines=' . $lines . '&points=' . $points;
    }

    /**
     * Converts a station's code_name to the station ID.
     *
     * @param array $stations The stations, as returned by get_netherrail_stations.
     * @param string $station_name The station's code name.
     * @return int The station's ID, or null if not found.
     */
    public static function station_name_to_id($stations, $station_name)
    {
        foreach ($stations['stations'] AS $station)
            if ($station->code_name == $station_name)
                return (int) $station->id;

        return null;
    }
}
