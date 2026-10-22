<?php
declare(strict_types=1);
namespace App\Controllers;

use App\{Auth, Db, Env, Http};

final class InvoiceController
{
    private const PROMPT = <<<'TXT'
Sos un lector de facturas de proveedores de Argentina. Extraé los datos del comprobante adjunto.
Respondé SOLO con JSON válido, sin texto extra ni markdown, con exactamente esta forma:
{"supplier": string|null, "cuit": string|null (solo dígitos), "number": string|null (ej "0003-00012345"),
 "date": "YYYY-MM-DD"|null, "total": number|null,
 "items": [{"description": string, "qty": integer, "unit_cost": number}]}
Reglas: unit_cost es el precio unitario neto (sin IVA) cuando la factura discrimina IVA; si no lo discrimina, el precio unitario tal cual figura.
Si un dato no se lee con claridad, usá null. No inventes datos ni ítems.
TXT;

    public static function index(array $p = []): void
    {
        $u = Auth::owner();
        Http::json(Db::floats(Db::all(
            'SELECT id, supplier, number, invoice_date, total, created_at FROM invoices WHERE tenant_id = ? ORDER BY id DESC LIMIT 20',
            [$u['tid']]
        ), ['total']));
    }

    /** Lee una factura (foto o PDF) y devuelve un borrador para que el dueño lo revise. No guarda nada. */
    public static function parse(array $p = []): void
    {
        Auth::owner();
        $f = $_FILES['file'] ?? null;
        if (!$f || $f['error'] !== UPLOAD_ERR_OK) Http::fail(422, 'Subí un archivo de factura');
        if ($f['size'] > 10 * 1024 * 1024) Http::fail(413, 'El archivo pesa más de 10 MB');

        $mime = (new \finfo(FILEINFO_MIME_TYPE))->file($f['tmp_name']);
        if (!in_array($mime, ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'], true)) {
            Http::fail(415, 'Formato no soportado. Usá JPG, PNG, WEBP o PDF.');
        }
        $key = Env::get('ANTHROPIC_API_KEY');
        if ($key === '') Http::fail(500, 'Falta ANTHROPIC_API_KEY en el archivo .env');

        $data = base64_encode((string)file_get_contents($f['tmp_name']));
        $block = $mime === 'application/pdf'
            ? ['type' => 'document', 'source' => ['type' => 'base64', 'media_type' => $mime, 'data' => $data]]
            : ['type' => 'image',    'source' => ['type' => 'base64', 'media_type' => $mime, 'data' => $data]];

        $ch = curl_init('https://api.anthropic.com/v1/messages');
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 90,
            CURLOPT_HTTPHEADER => ['content-type: application/json', 'x-api-key: ' . $key, 'anthropic-version: 2023-06-01'],
            CURLOPT_POSTFIELDS => json_encode([
                'model' => Env::get('ANTHROPIC_MODEL', 'claude-sonnet-5-5'),
                'max_tokens' => 2000,
                'messages' => [['role' => 'user', 'content' => [$block, ['type' => 'text', 'text' => self::PROMPT]]]],
            ]),
        ]);
        $res = curl_exec($ch);
        $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        if ($res === false || $code !== 200) {
            error_log("Anthropic API $code: " . (string)$res);
            Http::fail(502, 'No se pudo leer la factura. Probá de nuevo en un momento.');
        }

        $text = (string)(json_decode($res, true)['content'][0]['text'] ?? '');
        $d = json_decode(trim((string)preg_replace('/^```(?:json)?|```$/m', '', $text)), true);
        if (!is_array($d)) Http::fail(422, 'No pude interpretar la factura. Probá con una foto más nítida.');

        $items = [];
        foreach ((array)($d['items'] ?? []) as $i) {
            if (!is_array($i)) continue;
            $items[] = [
                'description' => trim((string)($i['description'] ?? '')),
                'qty' => max(1, (int)($i['qty'] ?? 1)),
                'unit_cost' => round((float)($i['unit_cost'] ?? 0), 2),
                'product_id' => null,
            ];
        }
        Http::json([
            'supplier' => isset($d['supplier']) ? (string)$d['supplier'] : null,
            'cuit'     => isset($d['cuit']) ? preg_replace('/\D/', '', (string)$d['cuit']) : null,
            'number'   => isset($d['number']) ? (string)$d['number'] : null,
            'date'     => self::validDate($d['date'] ?? null),
            'total'    => isset($d['total']) ? (float)$d['total'] : null,
            'items'    => $items,
        ]);
    }

    /** Guarda la factura ya revisada y suma el stock (y actualiza el costo si se pide). */
    public static function store(array $p = []): void
    {
        $u = Auth::owner();
        $b = Http::body();
        $items = $b['items'] ?? null;
        if (!is_array($items) || !$items) Http::fail(422, 'La factura no tiene ítems');
        $updateCosts = (bool)($b['update_costs'] ?? true);

        $pdo = Db::pdo();
        $pdo->beginTransaction();
        try {
            $iid = Db::exec(
                'INSERT INTO invoices(tenant_id,supplier,cuit,number,invoice_date,total) VALUES(?,?,?,?,?,?)',
                [$u['tid'], self::nullable($b['supplier'] ?? null), self::nullable($b['cuit'] ?? null),
                 self::nullable($b['number'] ?? null), self::validDate($b['date'] ?? null),
                 isset($b['total']) ? round((float)$b['total'], 2) : null]
            );
            foreach ($items as $i) {
                $qty = max(1, (int)($i['qty'] ?? 1));
                $cost = max(0, round((float)($i['unit_cost'] ?? 0), 2));
                $pid = !empty($i['product_id']) ? (int)$i['product_id'] : null;
                if ($pid !== null && !Db::one('SELECT id FROM products WHERE id = ? AND tenant_id = ?', [$pid, $u['tid']])) {
                    throw new \DomainException('Un producto asignado no existe');
                }
                Db::exec(
                    'INSERT INTO invoice_items(invoice_id,description,qty,unit_cost,product_id) VALUES(?,?,?,?,?)',
                    [$iid, mb_substr(trim((string)($i['description'] ?? '')), 0, 200), $qty, $cost, $pid]
                );
                if ($pid !== null) {
                    $sql = $updateCosts
                        ? 'UPDATE products SET stock = stock + ?, cost = ? WHERE id = ? AND tenant_id = ?'
                        : 'UPDATE products SET stock = stock + ? WHERE id = ? AND tenant_id = ?';
                    Db::exec($sql, $updateCosts ? [$qty, $cost, $pid, $u['tid']] : [$qty, $pid, $u['tid']]);
                }
            }
            $pdo->commit();
        } catch (\DomainException $e) {
            $pdo->rollBack();
            Http::fail(422, $e->getMessage());
        } catch (\Throwable $e) {
            $pdo->rollBack();
            throw $e;
        }
        Http::json(['id' => $iid], 201);
    }

    private static function nullable(mixed $v): ?string
    {
        $s = trim((string)$v);
        return $s === '' ? null : mb_substr($s, 0, 160);
    }

    private static function validDate(mixed $v): ?string
    {
        $d = is_string($v) ? \DateTimeImmutable::createFromFormat('!Y-m-d', $v) : false;
        return $d ? $d->format('Y-m-d') : null;
    }
}
