<?php

namespace ZePS\Controllers;

use Silex\Application;
use Symfony\Component\HttpFoundation\ParameterBag;
use ZePS\Dynmap\DynmapBridgeManager;
use ZePS\Routing\RoutesManager;


class RedirectsController
{
    /**
     * Cached logged-in players locations retrieved from the dynmap.
     * @var array
     */
    private $dynmap_players = null;


    /**
     * Arguments (by order of importance):
     * - fromX/fromZ/fromOverworld (optional); toX/toZ/toOverworld (optional): coordinates of the origin or
     *   destination location. *Overworld is true if defined with a trusty value ("1", "true", "yes"...), and
     *   if so, the coordinates will be understood as from the overworld main map.
     * - fromPlayer/toPlayer: player to use to get the origin or the destination location.
     * - fromStation/toStation: station code name to use as the origin or destination.
     * - fromStationID/toStationID: station unique ID to use as the origin or destination.
     * In the first two cases, the closest station will be used.
     *
     * A 400 Bad Request error is issued if a given player is not found, or if parameters are missing.
     *
     * @param Application $app The Silex application.
     * @return \Symfony\Component\HttpFoundation\Response
     */
    public function from_location(Application $app)
    {
        $query = $app['request']->query;

        if (empty($app['zeps.routing']->get_netherrail_stations()['stations'])) $app->abort(503);


        $from = $this->load_parameters($app, $query, 'from');
        $to   = $this->load_parameters($app, $query, 'to');

        // Bad parameters
        if ($from === false || $to === false)
            $app->abort(400);


        $from_station = $this->get_station($app, $from);
        $to_station   = $this->get_station($app, $to);

        return $app->redirect($app['url_generator']->generate('zeps.search_results', array(
            'from'    => $from_station->getName(),
            'to'      => $to_station->getName(),
            'options' => $from['overworld'] === true ? 'overworld' : ''
        )), 301);
    }

    /**
     * Loads the parameters of a kind (from or to) to retrieve the origin or destination.
     *
     * @param \Silex\Application                             $app      The Silex application.
     * @param \Symfony\Component\HttpFoundation\ParameterBag $query    The GET parameters.
     * @param string                                         $basename The parameters base name ('from' or 'to').
     *
     * @return array|bool An array with the following keys:
     *                    - 'x': the X location (null if not given);
     *                    - 'z': the Z location (null if not given);
     *                    - 'overworld': true if the location is in the overworld (may be any value if
     *                                   no location given);
     *                    - 'station': an object representing the station (null if no station given).
     *                    Or false, if the GET parameters are incorrect.
     */
    private function load_parameters(Application $app, ParameterBag $query, $basename)
    {
        $x         = null;
        $z         = null;
        $overworld = false;
        $station   = null;


        if ($query->has($basename.'X') && $query->has($basename.'Z'))
        {
            $x = $query->get($basename.'X');
            $z = $query->get($basename.'Z');

            if ($query->has($basename.'Overworld') && $this->as_boolean($query->get($basename.'Overworld')))
                $overworld = true;
        }
        else if ($query->has($basename.'Player'))
        {
            // Populate cache first
            if ($this->dynmap_players === null)
                $this->dynmap_players = $app['zeps.dynmap']->get_logged_in_players();

            // Lookup for the player
            foreach ($this->dynmap_players as $dynmap_player)
            {
                if (strtolower($query->get($basename.'Player')) == strtolower($dynmap_player['name']))
                {
                    if (!in_array($dynmap_player['world'], $app['config']['overworld_and_nether_worlds']))
                        return false;

                    $x = $dynmap_player['x'];
                    $z = $dynmap_player['z'];

                    $overworld = ($dynmap_player['world'] != $app['config']['world_name_nether']);

                    break;
                }
            }

            // If still null, the player was not found, or not in a good world.
            if ($x === null && $z === null)
                return false;
        }
        else if ($query->has($basename.'Station'))
        {
            $station = $app['zeps.routing']->get_station_by_codename($query->get($basename.'Station'));

            // If the station is still null, a station with this name does not exists.
            if ($station === null)
                return false;
        }
        else if ($query->has($basename.'StationID'))
        {
            $station = $app['zeps.routing']->get_station_by_id((integer) $query->get($basename.'StationID'));

            // If the station is still null, a station with this ID does not exists.
            if ($station === null)
                return false;
        }


        // If all are null, nothing was extracted from the parameters.
        if ($x === null && $z === null && $station === null)
        {
            return false;
        }
        else
        {
            return array
            (
                'x'         => $x,
                'z'         => $z,
                'overworld' => $overworld,
                'station'   => $station
            );
        }
    }

    /**
     * Retrieves the station for these loaded parameters.
     *
     * @param Application $app The Silex application
     * @param array       $parameters The parameters returned by the load_parameters method.
     *
     * @return object A station object.
     */
    private function get_station(Application $app, array $parameters)
    {
        if ($parameters['station'] !== null)
            return $parameters['station'];

        // Here we need to retrieve the closest station.
        return $app['zeps.routing']->get_closest_station($parameters['x'], $parameters['z'], $parameters['overworld'])['nearest_station'];
    }


    /**
     * Converts a variable to a boolean.
     * @param mixed $var The converted variable.
     * @return bool A boolean.
     */
    private function as_boolean($var)
    {
        if (!is_string($var))
            return (bool) $var;

        switch (strtolower($var))
        {
            case '1':
            case 'true':
            case 'on':
            case 'yes':
            case 'y':
            case 'oui':
            case 'o':
                return true;
            default:
                return false;
        }
    }
}
