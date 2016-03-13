<?php

require_once __DIR__ . '/../vendor/autoload.php';
require_once __DIR__ . '/../src/autoload.php';


$app = new Silex\Application();


// Application configuration

$app['config'] = array
(
    'world_name' => 'V5_nether',               // The name of the world where the netherrail is in

    'dynmap' => array
    (
        'root' => 'http://map.zcraft.fr',      // The root of the dynmap, aka the public URL used to access it.
        'standalone' => true                   // Non-standalone dynmap installation currently not supported!
    )
);


// Silex initialization

$app['debug'] = true;

$app->register(new Silex\Provider\UrlGeneratorServiceProvider());
$app->register(new Silex\Provider\TwigServiceProvider(), array(
    'twig.path' => __DIR__.'/../templates',
));

$app['twig']->getExtension('core')->setTimezone('Europe/Paris');

$app['twig']->addFilter(new Twig_SimpleFilter('number_format', function ($number, $decimals = 0, $decimal_point = ',', $thousands_separator = '&#8239;') {
    return number_format($number, $decimals, $decimal_point, $thousands_separator);
}, array('is_safe' => array('html'))));


// Internal API first due to the genericity of the last URL (search_results).

$app
    ->get('/api/nearest_station/{name}', 'ZePS\\Controllers\\APIController::nearest_station')
    ->bind('zeps.api.nearest_station');

$app
    ->get('/api/logged_in_players/{world_name}', 'ZePS\\Controllers\\APIController::logged_in_players')
    ->value('world_name', '')
    ->bind('zeps.api.logged_in_players');


// Route search pages

$app
    ->get('/', 'ZePS\\Controllers\\RouteSearchController::homepage')
    ->bind('zeps.homepage');

$app
    ->get('/{from}/{to}/{options}', 'ZePS\\Controllers\\RouteSearchController::search_results')
    ->value('options', '')
    ->bind('zeps.search_results');


$app->run();
