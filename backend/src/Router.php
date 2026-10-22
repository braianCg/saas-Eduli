<?php
declare(strict_types=1);
namespace App;

final class Router
{
    private array $routes = [];

    public function add(string $method, string $path, callable $handler): void
    {
        $re = '#^' . preg_replace('#\{(\w+)\}#', '(?P<$1>[^/]+)', $path) . '$#';
        $this->routes[] = [$method, $re, $handler];
    }

    public function dispatch(string $method, string $uri): void
    {
        $path = '/' . trim((string)preg_replace('#^/api#', '', $uri), '/');
        try {
            foreach ($this->routes as [$m, $re, $handler]) {
                if ($m === $method && preg_match($re, $path, $match)) {
                    $handler(array_filter($match, 'is_string', ARRAY_FILTER_USE_KEY));
                    return;
                }
            }
            Http::fail(404, 'Ruta no encontrada');
        } catch (\Throwable $e) {
            error_log((string)$e);
            Http::fail(500, Env::get('APP_DEBUG') === '1' ? $e->getMessage() : 'Error interno');
        }
    }
}
