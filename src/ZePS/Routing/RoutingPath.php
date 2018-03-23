<?php

namespace ZePS\Routing;
use Silex\Application;


/**
 * Represents a route from a station to another.
 *
 * @package ZePS\Routing
 */
class RoutingPath
{
    const DIRECTION_NORTH = 'north';
    const DIRECTION_SOUTH = 'south';
    const DIRECTION_EAST  = 'east';
    const DIRECTION_WEST  = 'west';


    private $first_station;
    private $last_station;

    private $travel_time;
    private $compute_time;

    /**
     * @var RoutingPathStep[]
     */
    private $path         = array();

    /**
     * @var RoutingPathCompactStep[]
     */
    private $compact_path = array();

    private $length             = 0;
    private $steps_count        = 0;
    private $compact_step_count = 0;
    private $stations_count     = 0;


    /**
     * Loads a path from a JSON representation.
     *
     * @param Application $app The Silex application
     * @param \stdClass   $json The JSON object. See source code for format.
     *
     * @return RoutingPath A non-compacted RoutingPath instance.
     */
    public static function fromJSON(Application $app, \stdClass $json)
    {
        $path = new RoutingPath(
            $app['zeps.routing']->get_station_by_codename($json->begin),
            $app['zeps.routing']->get_station_by_codename($json->end),
            $json->travel_time,
            $json->time
        );

        foreach ($json->path as $step)
        {
            $has_connection = isset($step->connection);

            $path->addStep(
                Station::fromJSON($step->station),
                $has_connection ? $app['zeps.routing']->get_station_by_id($step->connection->to) : null,
                $has_connection ? $step->connection->direction : null,
                $has_connection ? $step->connection->length : 0,
                $has_connection ? $step->connection->is_official : true,
                $has_connection ? $step->connection->is_rail : true
            );
        }

        return $path;
    }

    /**
     * RoutingPath constructor.
     *
     * This does not registers the path, use the `addStep` method to do so.
     *
     * @param Station $first_station The first station.
     * @param Station $last_station  The last station.
     * @param integer $travel_time   The travel time, in seconds.
     * @param integer $compute_time  The computation time, in milliseconds.
     */
    public function __construct(Station $first_station, Station $last_station, $travel_time, $compute_time)
    {
        $this->first_station = $first_station;
        $this->last_station  = $last_station;

        $this->travel_time   = (integer) $travel_time;
        $this->compute_time  = (integer) $compute_time;
    }

    /**
     * Adds a step to this path.
     *
     * This must be a raw step with a single station. Steps are after compacted using the `compact()` method.
     *
     * @param Station $station      The station.
     * @param Station $next_station The next station.
     * @param string  $direction    The step direction. Must be a RoutingPath's direction constant.
     * @param integer $length       The step length, in blocks.
     * @param boolean $is_official  True if this section is official.
     * @param boolean $is_rail      True if this is a rail section. False means it's a footpath.
     */
    public function addStep(Station $station, Station $next_station = null, $direction, $length, $is_official, $is_rail)
    {
        $this->path[] = new RoutingPathStep($station, $next_station, $direction, $length, $is_official, $is_rail);

        $this->length += $length;
        $this->steps_count++;

        if ($station->isVisible())
            $this->stations_count++;
    }


    /**
     * Compacts the path for public view, aggregating all steps in a single direction in a row.
     *
     * The steps are merged if they are in the same direction.
     */
    public function compact()
    {
        // The work is done once.
        if (!empty($this->compact_path))
            return;

        $current_compact_step = null;

        foreach ($this->path as $step)
        {
            // New direction?
            if ($current_compact_step === null || $step->getDirection() !== $current_compact_step->getDirection() || $step->isRail() != $current_compact_step->isRail())
            {
                if ($current_compact_step !== null)
                {
                    $current_compact_step->finalize();
                    $this->compact_path[] = $current_compact_step;
                }

                // It was not the last one
                if ($step->getDirection() !== null)
                {
                    $current_compact_step = new RoutingPathCompactStep(
                        $step->getStation(),
                        $step->getDirection(),
                        $step->isRail(),
                        $current_compact_step
                    );
                }
                else
                {
                    $current_compact_step = null;
                }
            }

            if ($current_compact_step !== null)
            {
                $current_compact_step->addStep($step);
            }
        }

        // Last route inserted (duplicated code :c )
        if ($current_compact_step !== null)
        {
            $current_compact_step->finalize();
            $this->compact_path[] = $current_compact_step;
        }

        $this->compact_step_count = count($this->compact_path);
    }

    /**
     * @return Station
     */
    public function getFirstStation()
    {
        return $this->first_station;
    }

    /**
     * @return Station
     */
    public function getLastStation()
    {
        return $this->last_station;
    }

    /**
     * @return int
     */
    public function getTravelTime()
    {
        return $this->travel_time;
    }

    /**
     * @return int
     */
    public function getComputeTime()
    {
        return $this->compute_time;
    }

    /**
     * @return RoutingPathStep[]
     */
    public function getPath()
    {
        return $this->path;
    }

    /**
     * @return RoutingPathCompactStep[]
     */
    public function getCompactPath()
    {
        return $this->compact_path;
    }

    /**
     * @return int
     */
    public function getLength()
    {
        return $this->length;
    }

    /**
     * @return int
     */
    public function getStepsCount()
    {
        return $this->steps_count;
    }

    /**
     * @return int
     */
    public function getCompactStepCount()
    {
        return $this->compact_step_count;
    }

    /**
     * @return int
     */
    public function getStationsCount()
    {
        return $this->stations_count;
    }
}
