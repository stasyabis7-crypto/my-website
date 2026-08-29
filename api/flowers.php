<?php
/**
 * GET  /api/flowers.php   → счётчики + список цветущих + можно ли сажать
 * POST /api/flowers.php   → посадить цветок (1 раз с IP)
 *
 * Тело POST — JSON: { key, variant, tilt, note, website }
 *   website — honeypot, должен быть пустым.
 *
 * Позицию на баннере назначает сервер: выдаёт номер слота 0..slots-1,
 * свободный среди последних slots цветов. Размер/координаты слота
 * считает фронт под текущее разрешение.
 */
declare(strict_types=1);
require __DIR__ . '/_db.php';

const GARDEN_RENDER_LIMIT  = 24;   // сколько последних цветов отдаём на баннер
const GARDEN_NOTE_MAX      = 160;
const GARDEN_TILT_MAX      = 20;
const GARDEN_FLOOD_PER_HOUR = 40;  // страховка от ботов: вставок в час на всех

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if ($method === 'GET') {
    garden_handle_get();
}

if ($method === 'POST') {
    garden_handle_post();
}

garden_json(['error' => 'method_not_allowed'], 405);


function garden_handle_get(): void
{
    $db = garden_db();
    $ipHash = garden_ip_hash();
    $slots = garden_slot_count();

    $planted = (int) $db->query("SELECT COUNT(*) FROM flowers WHERE status='visible'")->fetchColumn();

    $stmt = $db->prepare(
        "SELECT id, flower_key, variant, tilt, note, slot, ip_hash, created_at
         FROM flowers
         WHERE status='visible'
         ORDER BY created_at DESC, id DESC
         LIMIT :lim"
    );
    $stmt->bindValue(':lim', GARDEN_RENDER_LIMIT, PDO::PARAM_INT);
    $stmt->execute();
    $rows = $stmt->fetchAll();

    $flowers = [];
    $mineId = null;
    $mineSeen = false;
    foreach ($rows as $r) {
        $mine = hash_equals((string) $r['ip_hash'], $ipHash);
        if ($mine) {
            $mineSeen = true;
            $mineId = (int) $r['id'];
        }
        $flowers[] = garden_row_to_public($r, $mine);
    }

    // Свой цветок всегда виден, даже если он старше последних 24.
    $has = $db->prepare("SELECT id, flower_key, variant, tilt, note, slot, ip_hash, created_at
                         FROM flowers WHERE ip_hash = ? AND status='visible' LIMIT 1");
    $has->execute([$ipHash]);
    $own = $has->fetch();

    if ($own && !$mineSeen) {
        $mineId = (int) $own['id'];
        $flowers[] = garden_row_to_public($own, true);
    }

    garden_json([
        'planted'   => $planted,
        'canPlant'  => $own === false,
        'slotCount' => $slots,
        'mineId'    => $mineId,
        'flowers'   => $flowers,
    ]);
}


function garden_handle_post(): void
{
    $db = garden_db();
    $ipHash = garden_ip_hash();
    $slots = garden_slot_count();

    $in = json_decode((string) file_get_contents('php://input'), true);
    if (!is_array($in)) {
        $in = $_POST;
    }

    // honeypot
    if (!empty($in['website'])) {
        garden_json(['error' => 'spam'], 400);
    }

    $key     = isset($in['key']) ? trim((string) $in['key']) : '';
    $variant = isset($in['variant']) ? trim((string) $in['variant']) : '';
    $tilt    = isset($in['tilt']) ? (int) $in['tilt'] : 0;
    $note    = isset($in['note']) ? (string) $in['note'] : '';

    if (!garden_flower_exists($key, $variant)) {
        garden_json(['error' => 'invalid', 'field' => 'key'], 422);
    }

    $tilt = max(-GARDEN_TILT_MAX, min(GARDEN_TILT_MAX, $tilt));

    $note = strip_tags($note);
    $note = preg_replace('/[\x00-\x1F\x7F]+/u', ' ', $note) ?? '';
    $note = trim(preg_replace('/\s+/u', ' ', $note) ?? '');
    $note = mb_substr($note, 0, GARDEN_NOTE_MAX);
    $noteValue = $note === '' ? null : $note;

    // уже сажал с этого IP?
    $exists = $db->prepare("SELECT 1 FROM flowers WHERE ip_hash = ? LIMIT 1");
    $exists->execute([$ipHash]);
    if ($exists->fetchColumn()) {
        garden_json(['error' => 'already_planted'], 409);
    }

    // флуд-предохранитель
    $flood = (int) $db->query(
        "SELECT COUNT(*) FROM flowers WHERE created_at > (UTC_TIMESTAMP() - INTERVAL 1 HOUR)"
    )->fetchColumn();
    if ($flood >= GARDEN_FLOOD_PER_HOUR) {
        garden_json(['error' => 'rate_limited'], 429);
    }

    // свободный слот среди последних N цветов
    $usedStmt = $db->prepare(
        "SELECT slot FROM flowers WHERE status='visible' ORDER BY created_at DESC, id DESC LIMIT :lim"
    );
    $usedStmt->bindValue(':lim', $slots, PDO::PARAM_INT);
    $usedStmt->execute();
    $used = array_map('intval', $usedStmt->fetchAll(PDO::FETCH_COLUMN));
    $free = array_values(array_diff(range(0, $slots - 1), $used));
    if (!$free) {
        $free = range(0, $slots - 1);
    }
    $slot = $free[random_int(0, count($free) - 1)];

    try {
        $ins = $db->prepare(
            "INSERT INTO flowers (flower_key, variant, tilt, note, slot, ip_hash)
             VALUES (:k, :v, :t, :n, :s, :h)"
        );
        $ins->execute([
            ':k' => $key, ':v' => $variant, ':t' => $tilt,
            ':n' => $noteValue, ':s' => $slot, ':h' => $ipHash,
        ]);
    } catch (PDOException $e) {
        if ($e->getCode() === '23000') {
            garden_json(['error' => 'already_planted'], 409);
        }
        garden_json(['error' => 'db_write'], 500);
    }

    $id = (int) $db->lastInsertId();
    $planted = (int) $db->query("SELECT COUNT(*) FROM flowers WHERE status='visible'")->fetchColumn();

    garden_notify_new($id, $key, $variant, $noteValue);

    garden_json([
        'ok'      => true,
        'planted' => $planted,
        'flower'  => [
            'id'      => $id,
            'key'     => $key,
            'variant' => $variant,
            'tilt'    => $tilt,
            'note'    => $noteValue ?? '',
            'slot'    => $slot,
            'mine'    => true,
            'createdAt' => gmdate('c'),
        ],
    ], 201);
}


function garden_row_to_public(array $r, bool $mine): array
{
    return [
        'id'        => (int) $r['id'],
        'key'       => (string) $r['flower_key'],
        'variant'   => (string) $r['variant'],
        'tilt'      => (int) $r['tilt'],
        'note'      => $r['note'] !== null ? (string) $r['note'] : '',
        'slot'      => (int) $r['slot'],
        'mine'      => $mine,
        'createdAt' => gmdate('c', strtotime(((string) $r['created_at']) . ' UTC') ?: time()),
    ];
}

/**
 * Пинг о новом цветке. Работает, только если в config.php заданы
 * notify_email ИЛИ notify_telegram (bot_token + chat_id). Иначе — тихо.
 * Всё best-effort: ошибки отправки не роняют ответ на посадку.
 */
function garden_notify_new(int $id, string $key, string $variant, ?string $note): void
{
    $c = garden_config();

    // Человеческое имя вида из каталога (в БД лежит ключ вроде "hydrangea").
    $name = $key;
    foreach (garden_catalog()['flowers'] ?? [] as $f) {
        if (($f['key'] ?? null) === $key && !empty($f['name'])) {
            $name = (string) $f['name'];
            break;
        }
    }

    $line = sprintf('Новый цветок в саду: %s (#%d)', $name, $id);
    $body = $line;
    if ($note !== null && $note !== '') {
        $body .= "\n\nПослание:\n«{$note}»";
    }
    $body .= "\n\n" . 'https://stasyabis.com/';

    if (!empty($c['notify_telegram']['bot_token']) && !empty($c['notify_telegram']['chat_id'])) {
        $url = 'https://api.telegram.org/bot' . $c['notify_telegram']['bot_token'] . '/sendMessage';
        $payload = http_build_query([
            'chat_id' => $c['notify_telegram']['chat_id'],
            'text'    => $body,
        ]);
        $ctx = stream_context_create(['http' => [
            'method'  => 'POST',
            'header'  => "Content-Type: application/x-www-form-urlencoded\r\n",
            'content' => $payload,
            'timeout' => 4,
        ]]);
        @file_get_contents($url, false, $ctx);
    }

    if (!empty($c['notify_email'])) {
        // Заголовки: без валидного From на Hostinger письмо часто режется
        // в спам или вовсе не уходит. From — на своём домене.
        $host = $_SERVER['SERVER_NAME'] ?? 'stasyabis.com';
        $from = $c['notify_from'] ?? ('garden@' . $host);
        $subject = '=?UTF-8?B?' . base64_encode('🌱 ' . $name . ' в саду') . '?=';
        $headers = implode("\r\n", [
            'MIME-Version: 1.0',
            'Content-Type: text/plain; charset=UTF-8',
            'Content-Transfer-Encoding: 8bit',
            'From: stasyabis garden <' . $from . '>',
            'Reply-To: ' . $from,
            'X-Mailer: garden',
        ]);
        @mail((string) $c['notify_email'], $subject, $body, $headers, '-f' . $from);
    }
}
