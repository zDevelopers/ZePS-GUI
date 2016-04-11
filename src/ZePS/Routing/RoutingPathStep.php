<?php

namespace ZePS\Routing;


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
        $this->station = $station;
        $this->next_station = $next_station;
        $this->direction = $direction;

        $this->length = (integer)$length;

        $this->is_official = (boolean)$is_official;
        $this->is_rail = (boolean)$is_rail;
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
