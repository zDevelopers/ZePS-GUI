<?php

namespace ZePS\Quotes;


class QuotesManager
{
    /**
     * The quotes are stored here.
     * @var array
     */
    private static $quotes = array();

    /**
     * True if the init method was called.
     * @var bool
     */
    private static $initialized = false;


    private static function init()
    {
        if (!self::$initialized)
        {
            self::register(new Quote('Le ZéPS m\'a fait aimer le netherrail. 10/10.', 'Une moustachue anonyme'));

            self::$initialized = true;
        }
    }

    public static function register(Quote $quote)
    {
        self::$quotes[] = $quote;
    }

    public static function get_random_quote()
    {
        self::init();
        return self::$quotes[mt_rand(0, count(self::$quotes) - 1)];
    }
}
