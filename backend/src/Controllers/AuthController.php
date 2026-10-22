<?php
declare(strict_types=1);
namespace App\Controllers;

use App\{Auth, Db, Http};

final class AuthController
{
    private static function session(int $uid, int $tid, string $name, string $role, string $kiosk): array
    {
        return [
            'token' => Auth::issue(['uid' => $uid, 'tid' => $tid, 'role' => $role]),
            'user'  => ['name' => $name, 'role' => $role, 'kiosk' => $kiosk],
        ];
    }

    /** Alta de un kiosko nuevo (tenant) + su dueño. */
    public static function register(array $p = []): void
    {
        $b = Http::body();
        $kiosk = trim((string)($b['kiosk_name'] ?? ''));
        $name  = trim((string)($b['name'] ?? ''));
        $email = strtolower(trim((string)($b['email'] ?? '')));
        $pass  = (string)($b['password'] ?? '');
        if ($kiosk === '' || $name === '' || !filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($pass) < 8) {
            Http::fail(422, 'Completá todos los datos. La contraseña necesita 8 caracteres o más.');
        }
        if (Db::one('SELECT id FROM users WHERE email = ?', [$email])) Http::fail(409, 'Ese email ya tiene una cuenta');

        $pdo = Db::pdo();
        $pdo->beginTransaction();
        try {
            $tid = Db::exec('INSERT INTO tenants(name) VALUES(?)', [$kiosk]);
            $uid = Db::exec(
                "INSERT INTO users(tenant_id,name,email,password_hash,role) VALUES(?,?,?,?, 'owner')",
                [$tid, $name, $email, password_hash($pass, PASSWORD_DEFAULT)]
            );
            $pdo->commit();
        } catch (\Throwable $e) {
            $pdo->rollBack();
            throw $e;
        }
        Http::json(self::session($uid, $tid, $name, 'owner', $kiosk), 201);
    }

    public static function login(array $p = []): void
    {
        $b = Http::body();
        $u = Db::one(
            'SELECT u.id, u.tenant_id, u.name, u.password_hash, u.role, t.name AS kiosk
             FROM users u JOIN tenants t ON t.id = u.tenant_id WHERE u.email = ?',
            [strtolower(trim((string)($b['email'] ?? '')))]
        );
        if (!$u || !password_verify((string)($b['password'] ?? ''), $u['password_hash'])) {
            Http::fail(401, 'Email o contraseña incorrectos');
        }
        Http::json(self::session((int)$u['id'], (int)$u['tenant_id'], $u['name'], $u['role'], $u['kiosk']));
    }

    public static function staff(array $p = []): void
    {
        $u = Auth::owner();
        Http::json(Db::all('SELECT id, name, email, role FROM users WHERE tenant_id = ? ORDER BY role, name', [$u['tid']]));
    }

    public static function createStaff(array $p = []): void
    {
        $u = Auth::owner();
        $b = Http::body();
        $name  = trim((string)($b['name'] ?? ''));
        $email = strtolower(trim((string)($b['email'] ?? '')));
        $pass  = (string)($b['password'] ?? '');
        if ($name === '' || !filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($pass) < 8) {
            Http::fail(422, 'Completá nombre, email y una contraseña de 8 caracteres o más');
        }
        if (Db::one('SELECT id FROM users WHERE email = ?', [$email])) Http::fail(409, 'Ese email ya tiene una cuenta');
        $id = Db::exec(
            "INSERT INTO users(tenant_id,name,email,password_hash,role) VALUES(?,?,?,?, 'cashier')",
            [$u['tid'], $name, $email, password_hash($pass, PASSWORD_DEFAULT)]
        );
        Http::json(['id' => $id], 201);
    }
}
