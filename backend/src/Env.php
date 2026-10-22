<?php
declare(strict_types=1);
namespace App;

final class Env
{
    private static array $vars = [];

    public static function load(string $path): void
    {
        if (!is_file($path)) return;
        foreach (file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
            if ($line[0] === '#' || !str_contains($line, '=')) continue;
            [$k, $v] = explode('=', $line, 2);
            self::$vars[trim($k)] = trim($v);
        }
    }

    public static function get(string $key, string $default = ''): string
    {
        return self::$vars[$key] ?? (getenv($key) ?: $default);
    }
}
