<?php

namespace ZePS\Quotes;


class Quote
{
    private $author;
    private $quote;

    public function __construct($quote, $author)
    {
        $this->author = $author;
        $this->quote = $quote;
    }

    /**
     * @return string The quote's author.
     */
    public function getAuthor()
    {
        return $this->author;
    }

    /**
     * @return string The quote.
     */
    public function getQuote()
    {
        return $this->quote;
    }
}
