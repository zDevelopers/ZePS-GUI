<?php

use Silex\Application;
use Symfony\Component\HttpFoundation\Request;

require_once __DIR__ . '/../vendor/autoload.php';
require_once __DIR__ . '/../src/autoload.php';


$app = new Silex\Application();


// Application configuration

$app['config'] = array
(
    'world_name' => 'V5_nether',               // The name of the world where the netherrail is in
    'overworld_and_nether_worlds' => array(    // A list of nether & overworld worlds. Any world except 'world_name'
        'V5', 'V5_nether'                      // is considered as overworld.
    ),

    'dynmap' => array
    (
        'root' => 'http://map.zcraft.fr',      // The root of the dynmap, aka the public URL used to access it.
        'standalone' => true                   // Non-standalone dynmap installation currently not supported!
    )
);


// Silex initialization

if (in_array(@$_SERVER['REMOTE_ADDR'], array('127.0.0.1', '::1')))
{
    $app['debug'] = true;
}

$app['maintenance'] = false;
if (file_exists(__DIR__.'/../maintenance'))
{
    $app['maintenance'] = true;
}

$app->register(new Silex\Provider\UrlGeneratorServiceProvider());
$app->register(new Silex\Provider\TwigServiceProvider(), array(
    'twig.path'    => __DIR__.'/../templates',
    'twig.options' => array(
        'strict_variables' => false
    )
));

$app['twig']->getExtension('core')->setTimezone('Europe/Paris');

$app['twig']->addFilter(new Twig_SimpleFilter('number_format', function ($number, $decimals = 0, $decimal_point = ',', $thousands_separator = '&#8239;') {
    return number_format($number, $decimals, $decimal_point, $thousands_separator);
}, array('is_safe' => array('html'))));


// Maintenance mode

$app->before(function (Request $request, Application $app)
{
    if ($app['maintenance'])
        $app->abort(503);
}, Application::EARLY_EVENT);


// Internal API first due to the genericity of the last URL (search_results).

$app
    ->get('/api/nearest_station/{name}', 'ZePS\\Controllers\\APIController::nearest_station')
    ->bind('zeps.api.nearest_station');

$app
    ->get('/api/logged_in_players/{world_names}', 'ZePS\\Controllers\\APIController::logged_in_players')
    ->value('world_names', '')
    ->bind('zeps.api.logged_in_players');

$app
    ->get('/api/route_length/{from_id}/{to_id}/{official}/{accessible}', 'ZePS\\Controllers\\APIController::route_length')
    ->value('official', false)
    ->value('accessible', false)
    ->bind('zeps.api.route_length');

$app
    ->get('/api/stations_network', 'ZePS\\Controllers\\NetworkMapController::network_json')
    ->bind('zeps.api.stations_network');


// Redirect pages

$app
    ->get('/from_location', 'ZePS\\Controllers\\RedirectsController::from_location')
    ->bind('zeps.redirects.from_location');


// Network map

$app
    ->get('/plan', 'ZePS\\Controllers\\NetworkMapController::network_map')
    ->bind('zeps.network_map');


// Route search pages

$app
    ->get('/', 'ZePS\\Controllers\\RouteSearchController::homepage')
    ->bind('zeps.homepage');

$app
    ->get('/{from}/{to}/{options}', 'ZePS\\Controllers\\RouteSearchController::search_results')
    ->value('options', '')
    ->bind('zeps.search_results');


// Error handler

$app->error(function(\Exception $e, $code) use ($app)
{
    return (new ZePS\Controllers\ErrorsController())->handle_error($app, $e, $code);
});


$app->run();
