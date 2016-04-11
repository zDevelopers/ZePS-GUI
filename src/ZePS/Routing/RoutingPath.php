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
            if ($current_compact_step == null || $step->getDirection() != $current_compact_step->getDirection())
            {
                if ($current_compact_step != null)
                {
                    $current_compact_step->finalize();
                    $this->compact_path[] = $current_compact_step;
                }

                // It was not the last one
                if ($step->getDirection() != null)
                {
                    $current_compact_step = new RoutingPathCompactStep(
                        $step->getStation(),
                        $step->getDirection()
                    );
                }
                else
                {
                    $current_compact_step = null;
                }
            }

            if ($current_compact_step != null)
            {
                $current_compact_step->addStep($step);
            }
        }

        // Last route inserted (duplicated code :c )
        if ($current_compact_step != null)
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


/**
 * Represents a minimal step of a route (from a station to the next one, with direction, distance and some metadata).
 *
 * @package ZePS\Routing
 */
class RoutingPathStep
{
    private $station;
    private $next_station;
    private $direction;

    private $length;

    private $is_official;
    private $is_rail;


    /**
     * RoutingPathStep constructor.
     *
     * @param Station $station      The first of the two stations in this step.
     * @param Station $next_station The next station. If this is the final step, `null`.
     * @param string  $direction    The step direction. Must be a RoutingPath's direction constant.
     * @param integer $length       The step's length.
     * @param boolean $is_official  True if this step is on an official section.
     * @param boolean $is_rail      True if this is a rail section. False means it's a footpath.
     */
    public function __construct(Station $station, Station $next_station = null, $direction, $length, $is_official, $is_rail)
    {
        $this->station      = $station;
        $this->next_station = $next_station;
        $this->direction    = $direction;

        $this->length       = (integer)$length;

        $this->is_official  = (boolean) $is_official;
        $this->is_rail      = (boolean) $is_rail;
    }


    /**
     * @return Station
     */
    public function getStation()
    {
        return $this->station;
    }

    /**
     * @return Station
     */
    public function getNextStation()
    {
        return $this->next_station;
    }

    /**
     * @return string|null if there is no direction for this step (last one).
     */
    public function getDirection()
    {
        return $this->direction;
    }

    /**
     * @return int
     */
    public function getLength()
    {
        return $this->length;
    }

    /**
     * @return boolean
     */
    public function isOfficial()
    {
        return $this->is_official;
    }

    /**
     * @return boolean
     */
    public function isRail()
    {
        return $this->is_rail;
    }
}


/**
 * Represents a compacted step of a route: all consecutive steps in the same direction are merged into one stored
 * in an instance of this class.
 *
 * @package ZePS\Routing
 */
class RoutingPathCompactStep
{
    private $station_from = null;
    private $station_to   = null;

    private $direction;
    private $length = 0;

    private $steps = array();
    private $no_stop_steps_count = 0;


    /**
     * RoutingPathCompactStep constructor.
     *
     * @param Station $station_from The first station of this compacted step.
     * @param string  $direction    The step direction. Must be a RoutingPath's direction constant.
     */
    public function __construct($station_from, $direction)
    {
        $this->station_from = $station_from;
        $this->direction = $direction;
    }

    /**
     * Adds a step to this compact step.
     *
     * @param RoutingPathStep $step The step.
     * @throws \InvalidArgumentException if the direction of this step is not the same as the direction of the compact step.
     */
    public function addStep(RoutingPathStep $step)
    {
        if ($step->getDirection() != $this->direction && $step->getDirection() != null)
            throw new \InvalidArgumentException('Trying to add a step to a compact one but the added step is not in the same direction as the compact step.');

        if ($step->getStation()->isIntersection())
            $this->steps[] = $step;
        else
            $this->no_stop_steps_count++;

        $this->length += $step->getLength();
    }

    /**
     * Set the final station of this compact step, using the last of the sub steps.
     */
    public function finalize()
    {
        if ($this->station_to == null)
        {
            $sub_steps_count = count($this->getSteps());

            if ($sub_steps_count > 0)
                $this->station_to = $this->getSteps()[$sub_steps_count - 1]->getStation();
        }
    }

    /**
     * @return Station
     */
    public function getStationFrom()
    {
        return $this->station_from;
    }

    /**
     * @return Station
     */
    public function getStationTo()
    {
        return $this->station_to;
    }

    /**
     * @return string
     */
    public function getDirection()
    {
        return $this->direction;
    }

    /**
     * @return int
     */
    public function getLength()
    {
        return $this->length;
    }

    /**
     * Adds some length to this compact step. Used for non-displayed sub-steps.
     *
     * @param integer $length The length to add (in blocks).
     */
    public function addLength($length)
    {
        $this->length += (integer) $length;
    }

    /**
     * @return RoutingPathStep[]
     */
    public function getSteps()
    {
        return $this->steps;
    }

    /**
     * @return int
     */
    public function getNoStopStepsCount()
    {
        return $this->no_stop_steps_count;
    }
}
