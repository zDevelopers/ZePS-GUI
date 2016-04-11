<?php

namespace ZePS\Quotes;


class QuotesManager
{
    /**
     * The quotes are stored here.
     * @var array
     */
    private $quotes = array();


    public function __construct()
    {
        self::register(new Quote('Le ZéPS m\'a fait aimer le netherrail. 10/10.', 'Une moustachue anonyme'));
    }

    public function register(Quote $quote)
    {
        $this->quotes[] = $quote;
    }

    public function get_random_quote()
    {
        return $this->quotes[mt_rand(0, count($this->quotes) - 1)];
    }
}
