<?php
/**
 * Скрытая модерация сада. Открывать так:
 *   /api/admin.php?key=ADMIN_KEY          — список цветов
 *   /api/admin.php?key=...&hide=ID        — спрятать
 *   /api/admin.php?key=...&show=ID        — вернуть
 *   /api/admin.php?key=...&del=ID         — удалить насовсем
 *   /api/admin.php?key=...&season=YES     — новый сезон: спрятать все
 *
 * admin_key задаётся в private/config.php.
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

$db = garden_db();
$notice = '';

if (isset($_GET['hide'])) {
    $st = $db->prepare("UPDATE flowers SET status='hidden' WHERE id = ?");
    $st->execute([(int) $_GET['hide']]);
    $notice = 'Спрятан #' . (int) $_GET['hide'];
} elseif (isset($_GET['show'])) {
    $st = $db->prepare("UPDATE flowers SET status='visible' WHERE id = ?");
    $st->execute([(int) $_GET['show']]);
    $notice = 'Возвращён #' . (int) $_GET['show'];
} elseif (isset($_GET['del'])) {
    $st = $db->prepare("DELETE FROM flowers WHERE id = ?");
    $st->execute([(int) $_GET['del']]);
    $notice = 'Удалён #' . (int) $_GET['del'];
} elseif (($_GET['season'] ?? '') === 'YES') {
    $db->exec("UPDATE flowers SET status='hidden' WHERE status='visible'");
    $notice = 'Новый сезон — все цветы спрятаны';
}

$rows = $db->query(
    "SELECT id, flower_key, variant, tilt, note, slot, status, created_at,
            SUBSTRING(ip_hash, 1, 10) AS ipp
     FROM flowers ORDER BY created_at DESC, id DESC LIMIT 500"
)->fetchAll();

$visible = (int) $db->query("SELECT COUNT(*) FROM flowers WHERE status='visible'")->fetchColumn();

function h(?string $s): string
{
    return htmlspecialchars((string) $s, ENT_QUOTES, 'UTF-8');
}
$k = rawurlencode($key);
?><!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Сад — модерация</title>
<style>
  body { font: 14px/1.5 -apple-system, Segoe UI, Roboto, sans-serif; margin: 24px; color: #111; }
  h1 { font-size: 18px; }
  .notice { background: #e7f6e7; border: 1px solid #9ad39a; padding: 8px 12px; border-radius: 8px; margin: 12px 0; }
  table { border-collapse: collapse; width: 100%; max-width: 1100px; }
  th, td { border: 1px solid #ddd; padding: 6px 8px; text-align: left; vertical-align: top; }
  th { background: #f4f4f4; }
  tr.hidden { opacity: .5; }
  .note { max-width: 320px; }
  a.act { display: inline-block; margin-right: 6px; text-decoration: none; }
  .danger { color: #b00; }
  .season { margin: 16px 0; }
</style>
</head>
<body>
<h1>Сад — модерация · цветёт видимых: <?= $visible ?></h1>
<?php if ($notice): ?><div class="notice"><?= h($notice) ?></div><?php endif; ?>

<form class="season" method="get" onsubmit="return confirm('Спрятать ВСЕ цветущие цветы? Данные останутся в базе.')">
  <input type="hidden" name="key" value="<?= h($key) ?>">
  <input type="hidden" name="season" value="YES">
  <button type="submit" class="danger">Новый сезон — спрятать все</button>
</form>

<table>
  <tr>
    <th>ID</th><th>Когда (UTC)</th><th>Цветок</th><th>Наклон</th><th>Слот</th>
    <th>Заметка</th><th>IP‑хэш</th><th>Статус</th><th>Действия</th>
  </tr>
  <?php foreach ($rows as $r): ?>
  <tr class="<?= $r['status'] === 'hidden' ? 'hidden' : '' ?>">
    <td><?= (int) $r['id'] ?></td>
    <td><?= h($r['created_at']) ?></td>
    <td><?= h($r['flower_key']) ?><?= $r['variant'] !== '' ? ' · ' . h($r['variant']) : '' ?></td>
    <td><?= (int) $r['tilt'] ?>°</td>
    <td><?= (int) $r['slot'] ?></td>
    <td class="note"><?= h($r['note']) ?></td>
    <td><?= h($r['ipp']) ?>…</td>
    <td><?= h($r['status']) ?></td>
    <td>
      <?php if ($r['status'] === 'visible'): ?>
        <a class="act" href="?key=<?= $k ?>&hide=<?= (int) $r['id'] ?>">спрятать</a>
      <?php else: ?>
        <a class="act" href="?key=<?= $k ?>&show=<?= (int) $r['id'] ?>">вернуть</a>
      <?php endif; ?>
      <a class="act danger" href="?key=<?= $k ?>&del=<?= (int) $r['id'] ?>"
         onclick="return confirm('Удалить #<?= (int) $r['id'] ?> насовсем?')">удалить</a>
    </td>
  </tr>
  <?php endforeach; ?>
</table>
</body>
</html>
