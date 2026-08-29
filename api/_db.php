<?php
/**
 * Общий бутстрап для api/ — грузит private/config.php, открывает PDO,
 * отдаёт JSON-хелперы. Сам ничего не выводит.
 *
 * config.php лежит ВНЕ докрута (…/private/config.php на Hostinger).
 * Ищем его, поднимаясь вверх от папки этого файла.
 */
declare(strict_types=1);

function garden_config(): array
{
    static $cfg = null;
    if ($cfg !== null) {
        return $cfg;
    }
    $dir = __DIR__;
    for ($i = 0; $i < 8; $i++) {
        $candidate = $dir . '/private/config.php';
        if (is_file($candidate)) {
            $loaded = require $candidate;
            if (is_array($loaded)) {
                $cfg = $loaded;
                return $cfg;
            }
        }
        $parent = dirname($dir);
        if ($parent === $dir) {
            break;
        }
        $dir = $parent;
    }
    garden_json(['error' => 'config_missing'], 500);
}

function garden_db(): PDO
{
    static $pdo = null;
    if ($pdo instanceof PDO) {
        return $pdo;
    }
    $c = garden_config();
    $dsn = sprintf(
        'mysql:host=%s;dbname=%s;charset=utf8mb4',
        $c['db_host'] ?? 'localhost',
        $c['db_name'] ?? ''
    );
    try {
        $pdo = new PDO($dsn, $c['db_user'] ?? '', $c['db_pass'] ?? '', [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ]);
    } catch (Throwable $e) {
        garden_json(['error' => 'db_unavailable'], 503);
    }
    return $pdo;
}

function garden_json($data, int $status = 200): void
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function garden_client_ip(): string
{
    // Hostinger (LiteSpeed) кладёт реальный IP клиента в REMOTE_ADDR.
    return (string) ($_SERVER['REMOTE_ADDR'] ?? '0.0.0.0');
}

function garden_ip_hash(): string
{
    $c = garden_config();
    return hash('sha256', garden_client_ip() . '|' . ($c['ip_salt'] ?? 'no-salt'));
}

/**
 * Каталог цветов — единый источник правды, тот же файл читает фронт.
 * Лежит в докруте рядом с api/.
 */
function garden_catalog(): array
{
    static $cat = null;
    if ($cat !== null) {
        return $cat;
    }
    $path = dirname(__DIR__) . '/flowers-catalog.json';
    $raw = is_file($path) ? file_get_contents($path) : false;
    $data = $raw !== false ? json_decode($raw, true) : null;
    $cat = is_array($data) ? $data : ['slots' => 24, 'flowers' => []];
    return $cat;
}

/** Проверка, что пара вид+вариант есть в каталоге. */
function garden_flower_exists(string $key, string $variant): bool
{
    foreach (garden_catalog()['flowers'] ?? [] as $f) {
        if (($f['key'] ?? null) !== $key) {
            continue;
        }
        foreach ($f['variants'] ?? [] as $v) {
            if ((string) ($v['id'] ?? '') === $variant) {
                return true;
            }
        }
    }
    return false;
}

function garden_slot_count(): int
{
    return max(1, (int) (garden_catalog()['slots'] ?? 24));
}
