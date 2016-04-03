<?php

namespace ZePS\Managers;


class RoutesManager extends NetworkManager
{
    const API_LIST = 'https://florian.cassayre.me/api/minecraft/netherrail-list';
    const API_NETWORK = self::API_LIST . '?withNetwork=true';
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
     * Loads the network (stations list with relative links between stations).
     *
     * @param bool $debug True to print debug notices.
     *
     * @return object
     */
    public static function get_netherrail_network($debug = false)
    {
        $response = self::get_json(self::API_NETWORK, $debug);

        if ($response == null || $response->result != 'success')
            return array();

        return $response->stations;
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

    /**
     * Returns the closest station from the given coordinates.
     *
     * @param array $stations The stations, as returned by get_netherrail_stations.
     * @param double $x The X coordinate
     * @param double $z The Z coordinate
     * @param bool $from_overworld true if the given coordinates are from the overworld.
     *
     * @return array An array with the following keys:
     *               - 'nearest_station': the object of the nearest station;
     *               - 'distance': the distance from the given point to the station, or from the nether equivalent of
     *                             the point, if from the overworld;
     *               - 'from_overworld': true if from overworld, to know how to understand the distance
     */
    public static function get_closest_station($stations, $x, $z, $from_overworld)
    {
        // Coordinates correction if the player is in the overworld

        if ($from_overworld)
        {
            $x /= 8;
            $z /= 8;
        }


        // Station lookup

        $nearest_station           = null;
        $squared_smallest_distance = -1;

        foreach ($stations['stations'] as $station)
        {
            $squared_distance = self::squared_distance($x, $z, $station->x, $station->y);

            if ($nearest_station == null || $squared_distance < $squared_smallest_distance)
            {
                $nearest_station           = $station;
                $squared_smallest_distance = $squared_distance;
            }
        }


        return array
        (
            'nearest_station' => $nearest_station,
            'distance' => sqrt($squared_smallest_distance),
            'from_overworld' => $from_overworld
        );
    }

    /**
     * Calculate the squared distance between two points.
     *
     * The squared distance is calculated because this is only used for comparison, and it avoid the use of the
     * square root function, improving performances.
     *
     * @param float $x1 X-coordinate of the first point.
     * @param float $z1 Z-coordinate of the first point.
     * @param float $x2 X-coordinate of the second point.
     * @param float $z2 Z-coordinate of the second point.
     *
     * @return float The squared distance between (x1, z1) and (x2, z2).
     */
    private static function squared_distance($x1, $z1, $x2, $z2)
    {
        return pow(abs($x1 - $x2), 2) + pow(abs($z1 - $z2), 2);
    }
}
