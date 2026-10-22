<?php
declare(strict_types=1);
namespace App;

/** JWT HS256 mínimo, sin dependencias. */
final class Auth
{
    private static function b64(string $s): string
    {
        return rtrim(strtr(base64_encode($s), '+/', '-_'), '=');
    }

    private static function b64decode(string $s): string
    {
        $remainder = strlen($s) % 4;
        if ($remainder) {
            $s .= str_repeat('=', 4 - $remainder);
        }
        return base64_decode(strtr($s, '-_', '+/'));
    }

    private static function secret(): string
    {
        $s = Env::get('JWT_SECRET');
        if (strlen($s) < 32) throw new \RuntimeException('JWT_SECRET falta o es muy corto (mínimo 32 caracteres)');
        return $s;
    }

    public static function issue(array $claims): string
    {
        $h = self::b64(json_encode(['alg' => 'HS256', 'typ' => 'JWT']));
        $p = self::b64(json_encode($claims + ['exp' => time() + 12 * 3600]));
        return "$h.$p." . self::b64(hash_hmac('sha256', "$h.$p", self::secret(), true));
    }

    /** Devuelve ['uid','tid','role'] del token, o responde 401. */
    public static function user(): array
    {
        $hdr = $_SERVER['HTTP_AUTHORIZATION'] ?? (function_exists('getallheaders') ? (getallheaders()['Authorization'] ?? '') : '');
        if (!preg_match('/^Bearer\s+(\S+)$/', $hdr, $m)) Http::fail(401, 'No autenticado');
        $parts = explode('.', $m[1]);
        if (count($parts) !== 3) Http::fail(401, 'Token inválido');

        // Validar header alg = HS256
        $header = json_decode(self::b64decode($parts[0]), true);
        if (!is_array($header) || ($header['alg'] ?? '') !== 'HS256') {
            Http::fail(401, 'Algoritmo de token no soportado');
        }

        $calc = self::b64(hash_hmac('sha256', "$parts[0].$parts[1]", self::secret(), true));
        if (!hash_equals($calc, $parts[2])) Http::fail(401, 'Token inválido');
        $c = json_decode(self::b64decode($parts[1]), true);
        if (!is_array($c) || ($c['exp'] ?? 0) < time()) Http::fail(401, 'Sesión vencida');
        return $c;
    }

    public static function owner(): array
    {
        $u = self::user();
        if ($u['role'] !== 'owner') Http::fail(403, 'Solo el dueño puede hacer esto');
        return $u;
    }
}
