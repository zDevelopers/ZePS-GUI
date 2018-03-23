<?php

namespace ZePS\Routing;


/**
 * Represents a compacted step of a route: all consecutive steps in the same direction and with the same path type
 * are merged into one stored in an instance of this class.
 *
 * @package ZePS\Routing
 */
class RoutingPathCompactStep
{
    private $station_from = null;
    private $station_to = null;

    private $direction;
    private $is_rail;
    private $length = 0;

    private $steps = array();
    private $no_stop_steps_count = 0;

    private $previous_step = null;


    /**
     * RoutingPathCompactStep constructor.
     *
     * @param Station $station_from The first station of this compacted step.
     * @param string $direction The step direction. Must be a RoutingPath's direction constant.
     * @param $is_rail boolean The step's path type.
     * @param $previous_step RoutingPathCompactStep The previous step, for linking in the template. NULL if no previous step.
     */
    public function __construct($station_from, $direction, $is_rail, $previous_step)
    {
        $this->station_from = $station_from;
        $this->direction = $direction;
        $this->is_rail = $is_rail;
        $this->previous_step = $previous_step;
    }

    /**
     * Adds a step to this compact step.
     *
     * @param RoutingPathStep $step The step.
     *
     * @throws \InvalidArgumentException if the direction of this step is not the same as the direction of the compact
     *                                   step.
     */
    public function addStep(RoutingPathStep $step)
    {
        if ($step->getDirection() !== $this->direction && $step->getDirection() !== null)
            throw new \InvalidArgumentException('Trying to add a step to a compact one but the added step is not in the same direction as the compact step.');

        if ($step->getStation()->isIntersection() && $step->getStation()->isVisible())
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
        if ($this->station_to === null)
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
     * @return bool
     */
    public function isRail()
    {
        return $this->is_rail;
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
        $this->length += (integer)$length;
    }

    /**
     * @return RoutingPathStep[]
     */
    public function getSteps()
    {
        return $this->steps;
    }

    /**
     * @return RoutingPathStep[]
     */
    public function getIntermediateSteps()
    {
        return array_slice($this->steps, 1);
    }

    /**
     * @return int
     */
    public function getNoStopStepsCount()
    {
        return $this->no_stop_steps_count;
    }

    /**
     * @return null|RoutingPathCompactStep
     */
    public function getPreviousStep()
    {
        return $this->previous_step;
    }
}
