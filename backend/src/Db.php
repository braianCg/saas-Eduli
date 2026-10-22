<?php
declare(strict_types=1);
namespace App;

final class Db
{
    private static ?\PDO $pdo = null;

    public static function pdo(): \PDO
    {
        return self::$pdo ??= new \PDO(
            sprintf('mysql:host=%s;dbname=%s;charset=utf8mb4', Env::get('DB_HOST', '127.0.0.1'), Env::get('DB_NAME', 'kiosko')),
            Env::get('DB_USER', 'root'),
            Env::get('DB_PASS'),
            [
                \PDO::ATTR_ERRMODE => \PDO::ERRMODE_EXCEPTION,
                \PDO::ATTR_DEFAULT_FETCH_MODE => \PDO::FETCH_ASSOC,
                \PDO::ATTR_EMULATE_PREPARES => false,
            ]
        );
    }

    public static function all(string $sql, array $params = []): array
    {
        $st = self::pdo()->prepare($sql);
        $st->execute($params);
        return $st->fetchAll();
    }

    public static function one(string $sql, array $params = []): ?array
    {
        $st = self::pdo()->prepare($sql);
        $st->execute($params);
        return $st->fetch() ?: null;
    }

    /** Ejecuta y devuelve el último id insertado (0 en UPDATE/DELETE). */
    public static function exec(string $sql, array $params = []): int
    {
        $st = self::pdo()->prepare($sql);
        $st->execute($params);
        return (int)self::pdo()->lastInsertId();
    }

    /** DECIMAL y SUM() llegan como string; los pasamos a float para que el JSON salga numérico. */
    public static function floats(array $rows, array $keys): array
    {
        return array_map(function (array $r) use ($keys) {
            foreach ($keys as $k) if (array_key_exists($k, $r)) $r[$k] = (float)$r[$k];
            return $r;
        }, $rows);
    }
}
