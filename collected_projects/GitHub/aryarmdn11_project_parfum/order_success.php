<?php
require __DIR__ . '/includes/bootstrap.php';
$user = require_login();
$oid = (int)($_GET['id'] ?? 0);
$st = db()->prepare('SELECT * FROM orders WHERE id_order = ? AND id_user = ?');
$st->execute([$oid, $user['id_user']]);
$order = $st->fetch();
if (!$order) { http_response_code(404); exit('Pesanan tidak ditemukan.'); }
$pay = db()->prepare('SELECT * FROM payments WHERE id_order = ? ORDER BY id_payment DESC LIMIT 1');
$pay->execute([$oid]);
$pay = $pay->fetch();
$its = db()->prepare('SELECT oi.*, p.nama_produk, v.ukuran_ml FROM order_items oi JOIN produk_variants v ON v.id_variant = oi.id_variant JOIN produk p ON p.id_produk = v.id_produk WHERE oi.id_order = ?');
$its->execute([$oid]);
$items = $its->fetchAll();
$instr = PAYMENT_INSTRUCTIONS[$pay['metode_pembayaran'] ?? ''] ?? '';
$page = 'akun'; $title = 'Pesanan #' . $oid . ' — ATEA Parfums';
require __DIR__ . '/includes/header.php';
?>
<main class="page-narrow">
  <p class="eyebrow">TERIMA KASIH</p>
  <h1 class="page-h1">Pesanan <em>#<?= (int)$oid ?></em></h1>
  <div class="panel">
    <p>Nomor referensi pembayaran: <b><?= h($pay['nomor_referensi'] ?? '-') ?></b></p>
    <p>Total yang harus dibayar: <b><?= h(rupiah($order['total_harga'])) ?></b> via <b><?= h($pay['metode_pembayaran'] ?? '-') ?></b></p>
    <?php if ($instr): ?><p class="notice"><?= h($instr) ?></p><?php endif; ?>
    <?php if (WHATSAPP_NUMBER): ?>
      <?php $wa = 'Halo ATEA Parfums, saya sudah membuat pesanan ' . ($pay['nomor_referensi'] ?? '#' . $oid) . ' sebesar ' . rupiah($order['total_harga']) . '. Berikut bukti pembayarannya.'; ?>
      <a class="solid-btn dark" target="_blank" rel="noopener" href="https://wa.me/<?= h(WHATSAPP_NUMBER) ?>?text=<?= h(rawurlencode($wa)) ?>">KONFIRMASI VIA WHATSAPP</a>
    <?php endif; ?>
  </div>
  <div class="panel">
    <h2>Detail pesanan</h2>
    <table class="tbl">
      <tr><th>Produk</th><th>Qty</th><th class="r">Harga</th><th class="r">Subtotal</th></tr>
      <?php foreach ($items as $i): ?>
        <tr><td><?= h($i['nama_produk']) ?> <?= (int)$i['ukuran_ml'] ?> ml</td><td><?= (int)$i['jumlah'] ?></td><td class="r"><?= h(rupiah($i['harga_satuan'])) ?></td><td class="r"><?= h(rupiah($i['subtotal'])) ?></td></tr>
      <?php endforeach; ?>
      <tr class="tot"><td colspan="3">Total</td><td class="r"><?= h(rupiah($order['total_harga'])) ?></td></tr>
    </table>
    <p class="muted small">Dikirim ke:<br><?= nl2br(h($order['alamat_pengiriman'])) ?></p>
  </div>
  <p><a class="outline-link" href="<?= h(url('orders.php')) ?>">LIHAT SEMUA PESANAN <span>↗</span></a></p>
</main>
<?php require __DIR__ . '/includes/footer.php'; ?>
