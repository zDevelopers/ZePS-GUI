<?php
/**
 * Created by PhpStorm.
 * User: amaury
 * Date: 08/01/18
 * Time: 00:27
 */

namespace ZePS\Routing;


use ZePS\Misc\DateTimeManager;

class AlternativeRoutingPath
{
    /**
     * @var RoutingPath
     */
    private $master_route;

    /**
     * @var RoutingPath
     */
    private $alternative_route;

    /**
     * @var RoutingPath
     */
    private $searched_route;

    /**
     * @var string
     */
    private $name;

    /**
     * AlternativeRoutingPath constructor.
     * @param RoutingPath $master_route
     * @param RoutingPath $alternative
     * @param string $alternative_name
     */
    public function __construct(RoutingPath $master_route, RoutingPath $alternative, RoutingPath $searched_route, $alternative_name)
    {
        $this->master_route = $master_route;
        $this->alternative_route = $alternative;
        $this->searched_route = $searched_route;
        $this->name = $alternative_name;
    }

    /**
     * @return RoutingPath
     */
    public function getMasterRoute()
    {
        return $this->master_route;
    }

    /**
     * @return RoutingPath
     */
    public function getAlternativeRoute()
    {
        return $this->alternative_route;
    }

    /**
     * @return RoutingPath
     */
    public function getSearchedRoute()
    {
        return $this->searched_route;
    }

    /**
     * @return string
     */
    public function getName()
    {
        return $this->name;
    }

    public function getLengthDiff()
    {
        return $this->alternative_route->getTravelTime() - $this->master_route->getTravelTime();
    }

    public function getUserFriendlyLengthDiff()
    {
        $diff = $this->getLengthDiff();
        $user_friendly_time = DateTimeManager::friendly_interval(abs($diff), true);

        return $user_friendly_time . ($diff < 0 ? ' de moins' : ' de plus');
    }

    public function updateRouteOptions($current_route_option)
    {
        switch ($this->name)
        {
            case 'direct':
                $current_route_option .= ($current_route_option ? '-' : '') . 'direct';
                break;
            case 'spawn':
                $current_route_option = trim(str_replace('direct', '', $current_route_option), '-');
                break;
        }

        return $current_route_option;
    }
}
