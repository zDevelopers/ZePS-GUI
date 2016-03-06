<?php

function zpes_autoloader($pClassName)
{
    include_once(__DIR__ . '/' . str_replace('\\', '/', $pClassName) . '.php');
}

spl_autoload_register('zpes_autoloader');
