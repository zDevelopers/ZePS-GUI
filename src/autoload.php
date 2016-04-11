<?php

spl_autoload_register(function ($pClassName)
{
    include_once(__DIR__ . '/' . str_replace('\\', '/', $pClassName) . '.php');
});
