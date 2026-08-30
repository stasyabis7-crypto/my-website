<?php
/**
 * РАЗОВЫЙ скрипт. Чинит даты у цветов:
 *   1) проставляет «вчера» строкам, у которых created_at пустой/нулевой
 *      (их писали до фикса — точное время не сохранялось);
 *   2) вешает на столбец created_at дефолт CURRENT_TIMESTAMP, чтобы новые
 *      цветы всегда получали дату автоматически.
 *
 * Открыть один раз:
 *   https://stasyabis.com/api/migrate-dates.php?key=АДМИН_КЛЮЧ_ИЗ_CONFIG
 *
 * Запускать можно сколько угодно раз — повторный вызов ничего не ломает.
 * ПОСЛЕ УСПЕШНОГО ЗАПУСКА — УДАЛИ ЭТОТ ФАЙЛ С СЕРВЕРА.
 */
declare(strict_types=1);
require __DIR__ . '/_db.php';

$c = garden_config();
$key = (string) ($_GET['key'] ?? '');
if ($key === '' || !hash_equals((string) ($c['admin_key'] ?? ''), $key)) {
    http_response_code(403);
    header('Content-Type: text/plain; charset=utf-8');
    echo 'Forbidden';
    exit;
}

header('Content-Type: text/plain; charset=utf-8');
header('Cache-Control: no-store');

$db = garden_db();
$log = [];

// 1. Бэкфилл кривых дат.
$fixed = $db->exec(
    "UPDATE flowers
        SET created_at = UTC_TIMESTAMP() - INTERVAL 1 DAY
      WHERE created_at IS NULL OR created_at = '0000-00-00 00:00:00'"
);
$log[] = '1. Проставлена дата «вчера» строкам без даты: ' . (int) $fixed;

// 2. Дефолт на будущее.
try {
    $db->exec(
        "ALTER TABLE flowers
           MODIFY created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP"
    );
    $log[] = '2. created_at → TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP — ок';
} catch (Throwable $e) {
    $log[] = '2. ALTER не выполнен (не критично, дату теперь пишет и сам код): '
           . $e->getMessage();
}

// Показать результат.
$rows = $db->query(
    "SELECT id, flower_key, created_at FROM flowers ORDER BY id DESC LIMIT 20"
)->fetchAll();

echo implode("\n", $log) . "\n\n";
echo "Последние 20 строк в базе:\n";
foreach ($rows as $r) {
    echo sprintf("  #%-4d %-14s %s\n", $r['id'], $r['flower_key'], (string) $r['created_at']);
}
echo "\nГотово. Теперь УДАЛИ файл api/migrate-dates.php с сервера.\n";
