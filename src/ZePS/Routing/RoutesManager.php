<?php

namespace ZePS\Routing;

use Silex\Application;
use ZePS\Misc\NetworkManager;


class RoutesManager extends NetworkManager
{
    private $api_list = '/list';
    private $api_network = '/list/network';
    private $api_network_colors = '/colors';
    private $api_route = '/path/{from}/{to}';

    private $spawn_station = '';
    private $main_netherrail_stations = '';

    private $netherrail_stations = null;


    /**
     * RoutesManager constructor.
     *
     * @param Application $app The Silex application
     */
    public function __construct($app)
    {
        parent::__construct($app);

        $api_root = $app['config']['api_root'];

        $this->api_list = $api_root . $this->api_list;
        $this->api_network = $api_root . $this->api_network;
        $this->api_network_colors = $api_root . $this->api_network_colors;
        $this->api_route = $api_root . $this->api_route;

        $this->spawn_station = $app['config']['stations']['spawn'];
        $this->main_netherrail_stations = $app['config']['stations']['main'];

        // Unlimited cache (removed when the cache is cleared, when the router's checksum changes).
        $this->cache_lifetime = 0;
    }

    public function get_main_stations()
    {
        return $this->main_netherrail_stations;
    }

    public function get_spawn_station()
    {
        return $this->spawn_station;
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
            $json = $this->get_json($this->api_list);

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
                $main_stations_codes = $this->main_netherrail_stations;

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
     * Retrieves a station from its display name. The search is not case sensitive.
     *
     * @param string $display_name The station's display name
     * @return Station The station, or `null` if not found.
     */
    public function get_station_by_displayname($display_name)
    {
        $stations = $this->get_netherrail_stations()['stations'];
        $display_name = strtolower(trim($display_name));

        foreach ($stations as $station)
            if (strtolower(trim($station->getDisplayName())) == $display_name)
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

        $json = $this->get_json(str_replace(['{from}', '{to}'], [$from, $to], $this->api_route) . '?' . implode('&', $parameters));

        if (!isset($json->result) || $json->result != 'success')
            throw new \RuntimeException($json->cause, $json->result);

        return RoutingPath::fromJSON($this->app, $json);
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
        $response = $this->get_json($this->api_network);

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
        return $this->get_json($this->api_network_colors);
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
     *               - 'distance': the distance between the given coordinates and the station;
     *               - 'from_overworld': the same as $from_overworld.
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
            if (!$station->isVisible()) continue;

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
