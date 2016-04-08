<?php

namespace ZePS\Misc;


class DateTimeManager
{
    /**
     * Trivial plural function
     *
     * @param string $text The text
     * @param int $count The count
     * @return string The text with a 's' appended if the count is greater than 1.
     */
    private static function pluralify($text, $count)
    {
        return $text . ($count > 1 ? 's' : '');
    }

    /**
     * Returns a friendly interval from an amount of seconds.
     *
     * @param int $seconds The seconds.
     * @param bool $with_seconds true to returns the seconds (e.g. « 3 minutes and 18 seconds »).
     * @return string The friendly interval (in french).
     */
    public static function friendly_interval($seconds, $with_seconds = true)
    {
        if ($seconds < 60)
        {
            return $seconds . self::pluralify(' seconde', $seconds);
        }
        else if ($seconds < 3600)
        {
            $min = (int) ($seconds / 60);
            $sec = $seconds - 60 * $min;

            return $min . self::pluralify(' minute', $min) . ($with_seconds && $sec > 0 ? ' et ' . $sec . self::pluralify(' seconde', $sec) : '');
        }
        else if ($seconds < 86400)
        {
            $hours = (int) ($seconds / 3600);
            $min = (int) (($seconds - $hours * 3600) / 60);
            $sec = $seconds - $hours * 3600 - $min * 60;

            return
                $hours . self::pluralify(' heure', $hours)
                . ($min > 0 ? ($with_seconds && $sec > 0 ? ', ' : ' et ') . $min . self::pluralify(' minute', $min) : '')
                . ($with_seconds && $sec > 0 ? ' et ' . $sec . self::pluralify(' seconde', $sec) : '');
        }
        else
        {
            $days = (int) ($seconds / 86400);
            $hours = (int) (($seconds - $days * 86400) / 3600);
            $min = (int) (($seconds - $days * 86400 - $hours * 3600) / 60);
            $sec = $seconds - $days * 86400 - $hours * 3600 - $min * 60;

            return
                $days . self::pluralify(' jour', $days)
                . ($hours > 0 ? ($min > 0 || ($with_seconds && $sec > 0) ? ', ' : ' et ') . $hours . self::pluralify(' heure', $hours) : '')
                . ($min > 0 ? ($with_seconds && $sec > 0 ? ', ' : ' et ') . $min . self::pluralify(' minute', $min) : '')
                . ($with_seconds && $sec > 0 ? ' et ' . $sec . self::pluralify(' seconde', $sec) : '');
        }
    }
}
