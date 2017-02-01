<?php

namespace ZePS\Routing;

use Silex\Application;
use ZePS\Misc\NetworkManager;


class RoutesManager extends NetworkManager
{
    const API_LIST = 'https://api.cassayre.me/minecraft/zeps/list';
    const API_NETWORK = 'https://api.cassayre.me/minecraft/zeps/list/network';
    const API_NETWORK_COLORS = 'https://api.cassayre.me/minecraft/zeps/colors';
    const API_ROUTE = 'https://api.cassayre.me/minecraft/zeps/path/{from}/{to}';
    const API_ROUTE_IMAGE = 'http://florian.cassayre.me/api/minecraft/zeps/v1.1/map';

    const SPAWN_STATION = 'tentacles';
    const MAIN_NETHERRAIL_STATIONS = 'tentacles,vaalon,nouvea';


    private $netherrail_stations = null;


    /**
     * RoutesManager constructor.
     *
     * @param Application $app The Silex application
     */
    public function __construct($app)
    {
        parent::__construct($app);

        // Unlimited cache (removed when the cache is cleared, when the router's checksum changes).
        $this->cache_lifetime = 0;
    }


    /**
     * Returns the netherrail stations.
     * The results of this method are cached. The first call calls the API to retrieves the stations.
     *
     * @return array An array, with two keys: a 'stations' one containing all the stations, and a 'main_stations'
     * containing the main stations.
     * @internal param bool $debug True to print debug notices.
     *
     */
    public function get_netherrail_stations()
    {
        if ($this->netherrail_stations === null)
        {
            $json = $this->get_json(self::API_LIST);

            if ($json === null || $json->result !== "success")
            {
                $this->netherrail_stations = array('stations' => array(), 'main_stations' => array());
            }
            else
            {
                $stations = array();

                foreach ($json->stations as $station)
                {
                    $station = Station::fromJSON($station);
                    $stations[$station->getId()] = $station;
                }

                $main_stations = array();
                $main_stations_codes = \explode(',', self::MAIN_NETHERRAIL_STATIONS);

                foreach ($stations as $station)
                {
                    if (\in_array($station->getName(), $main_stations_codes))
                    {
                        $main_stations[array_search($station->getName(), $main_stations_codes)] = $station;
                    }
                }

                ksort($main_stations);

                $this->netherrail_stations = array(
                    'stations' => $stations,
                    'main_stations' => $main_stations
                );
            }
        }

        return $this->netherrail_stations;
    }

    /**
     * Retrieves a station by ID.
     *
     * @param integer $id The station ID.
     * @return Station The station, or `null` if not found.
     */
    public function get_station_by_id($id)
    {
        $stations = $this->get_netherrail_stations()['stations'];

        return isset($stations[$id]) ? $stations[$id] : null;
    }

    /**
     * Retrieves a station by code name.
     *
     * @param string $code_name The station's code name.
     * @return Station The station, or `null` if not found.
     */
    public function get_station_by_codename($code_name)
    {
        $stations = $this->get_netherrail_stations()['stations'];

        foreach ($stations as $station)
            if ($station->getName() == $code_name)
                return $station;

        return null;
    }

    /**
     * Retrieves a route.
     *
     * @param int  $from       The departure station ID.
     * @param int  $to         The destination station ID.
     * @param bool $official   If true, avoids non-official stations.
     * @param bool $accessible If true, avoids stations non accessible from the modern netherrail.
     *
     * @return RoutingPath The route, or null if not retrievable.
     * @internal param bool $debug True to print debug notices.
     */
    public function get_netherrail_route($from, $to, $official = false, $accessible = false)
    {
        $parameters = [];
        if ($official) $parameters[] = 'official';
        if ($accessible) $parameters[] = 'accessible';

        $json = $this->get_json(str_replace(['{from}', '{to}'], [$from, $to], self::API_ROUTE) . '?' . implode('&', $parameters));

        if (!isset($json->result) || $json->result != 'success')
            throw new \RuntimeException($json->cause, $json->result);

        return RoutingPath::fromJSON($this->app, $json);
    }

    /**
     * Returns a link to an image representing the route.
     *
     * @param RoutingPath $routes The route.
     * @return string The image URL.
     */
    public function get_netherrail_route_image($routes)
    {
        $lines  = '';
        $points = '';

        $lines_limits = array();

        $prev_point = null;

        foreach ($routes->getPath() as $step)
        {
            if (!$step->getStation()->isVisible())
                continue;

            $point = $step->getStation()->getLocationX() . ',' . $step->getStation()->getLocationZ() . ',';

            if ($prev_point !== null)
            {
                $lines_limits[] = $prev_point . $point;
            }

            $points .= $point;
            $prev_point = $point;
        }

        foreach ($lines_limits as $line)
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
     * @return object
     * @internal param bool $debug True to print debug notices.
     *
     */
    public function get_netherrail_network()
    {
        $response = $this->get_json(self::API_NETWORK);

        if ($response === null || $response->result != 'success')
            return array();

        return $response->stations;
    }

    /**
     * Loads the network colors (colors of the lines based on the coordinates and the orientation).
     *
     * @return object
     * @internal param bool $debug True to print debug notices.
     *
     */
    public function get_netherrail_network_colors()
    {
        return $this->get_json(self::API_NETWORK_COLORS);
    }

    /**
     * Converts a station's code_name to the station ID.
     *
     * @param string $station_name The station's code name.
     *
     * @return int The station's ID, or null if not found.
     */
    public function station_name_to_id($station_name)
    {
        $station = $this->get_station_by_codename($station_name);

        if ($station !== null)  return $station->getId();
        else                    return null;
    }

    /**
     * Returns the closest station from the given coordinates.
     *
     * @param double $x              The X coordinate
     * @param double $z              The Z coordinate
     * @param bool   $from_overworld true if the given coordinates are from the overworld.
     *
     * @return array An array with the following keys:
     *               - 'nearest_station': the object of the nearest station;
     */
    public function get_closest_station($x, $z, $from_overworld)
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

        foreach ($this->get_netherrail_stations()['stations'] as $station)
        {
            $squared_distance = $this->squared_distance($x, $z, $station->getLocationX(), $station->getLocationZ());

            if ($nearest_station === null || $squared_distance < $squared_smallest_distance)
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
    private function squared_distance($x1, $z1, $x2, $z2)
    {
        return pow(abs($x1 - $x2), 2) + pow(abs($z1 - $z2), 2);
    }
}
