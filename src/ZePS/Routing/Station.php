<?php

namespace ZePS\Routing;


/**
 * A station.
 *
 * @package ZePS\Routing
 */
class Station
{
    private $id;
    private $name;
    private $display_name;

    private $location_x;
    private $location_z;

    private $is_visible;
    private $is_safe;
    private $is_portal;
    private $is_intersection;


    /**
     * Creates a Station object from a JSON representation.
     *
     * @param \stdClass $json The JSON object. See source code for format.
     * @return Station The station object.
     */
    public static function fromJSON(\stdClass $json)
    {
        return new Station(
            $json->id,
            $json->code_name,
            $json->full_name,

            $json->x,
            $json->y,  // Not an error

            $json->is_visible,
            $json->is_safe,
            $json->is_portal,
            $json->is_intersection
        );
    }

    /**
     * Station constructor.
     *
     * @param integer $id The station ID
     * @param string $name The station internal name (e.g. for URLs)
     * @param string $display_name The station public name.
     * @param integer $location_x The X coordinate of the station.
     * @param integer $location_z The Z coordinate of the station.
     * @param boolean $is_visible True if this station is visible.
     * @param boolean $is_safe True if this station is safe.
     * @param boolean $is_portal True if there is a portal at this station.
     * @param boolean $is_intersection True if this staton is an intersection.
     */
    public function __construct($id, $name, $display_name, $location_x, $location_z, $is_visible, $is_safe, $is_portal, $is_intersection)
    {
        $this->id           = (integer) $id;
        $this->name         = (string)  $name;
        $this->display_name = (string)  $display_name;

        $this->location_x   = (integer) $location_x;
        $this->location_z   = (integer) $location_z;

        $this->is_visible      = (boolean) $is_visible;
        $this->is_safe         = (boolean) $is_safe;
        $this->is_portal       = (boolean) $is_portal;
        $this->is_intersection = (boolean) $is_intersection;
    }


    /**
     * @return integer
     */
    public function getId()
    {
        return $this->id;
    }

    /**
     * @return string
     */
    public function getName()
    {
        return $this->name;
    }

    /**
     * @return string
     */
    public function getDisplayName()
    {
        return $this->display_name;
    }

    /**
     * @return integer
     */
    public function getLocationX()
    {
        return $this->location_x;
    }

    /**
     * @return integer
     */
    public function getLocationZ()
    {
        return $this->location_z;
    }

    /**
     * @return boolean
     */
    public function isVisible()
    {
        return $this->is_visible;
    }

    /**
     * @return boolean
     */
    public function isSafe()
    {
        return $this->is_safe;
    }

    /**
     * @return boolean
     */
    public function isPortal()
    {
        return $this->is_portal;
    }

    /**
     * @return boolean
     */
    public function isIntersection()
    {
        return $this->is_intersection;
    }

    /**
     * Converts this station to an array.
     *
     * The format is compatible with Station::fromJSON($jsonObj).
     *
     * @return array An array ready to be used by json_encode or Symfony's JSON response method.
     */
    public function toJSON()
    {
        return array(
            'id'        => $this->id,
            'code_name' => $this->name,
            'full_name' => $this->display_name,

            'x' => $this->location_x,
            'y' => $this->location_z,

            'is_visible'      => $this->is_visible,
            'is_safe'         => $this->is_safe,
            'is_intersection' => $this->is_intersection,
            'is_portal'       => $this->is_portal
        );
    }
}
