<?php
require __DIR__ . '/includes/bootstrap.php';
require __DIR__ . '/includes/cart.php';
$user = require_login();
$uid = (int)$user['id_user'];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    csrf_require();
    if (($_POST['action'] ?? '') === 'cancel') {
        if (cancel_order((int)($_POST['id'] ?? 0), $uid)) flash('ok', 'Pesanan dibatalkan dan stok dikembalikan.');
        else flash('err', 'Pesanan ini tidak bisa dibatalkan.');
    }
    redirect(url('orders.php'));
}

$st = db()->prepare('SELECT o.*, (SELECT metode_pembayaran FROM payments WHERE id_order = o.id_order ORDER BY id_payment DESC LIMIT 1) AS metode,
                            (SELECT status_pembayaran FROM payments WHERE id_order = o.id_order ORDER BY id_payment DESC LIMIT 1) AS status_bayar
                     FROM orders o WHERE o.id_user = ? ORDER BY o.id_order DESC');
$st->execute([$uid]);
$orders = $st->fetchAll();
$itemsBy = [];
if ($orders) {
    $q = db()->prepare('SELECT oi.id_order, oi.jumlah, oi.harga_satuan, p.nama_produk, v.ukuran_ml FROM order_items oi
                        JOIN produk_variants v ON v.id_variant = oi.id_variant JOIN produk p ON p.id_produk = v.id_produk
                        JOIN orders o ON o.id_order = oi.id_order WHERE o.id_user = ?');
    $q->execute([$uid]);
    foreach ($q->fetchAll() as $r) $itemsBy[$r['id_order']][] = $r;
}
$labels = ['menunggu_pembayaran' => 'Menunggu pembayaran', 'diproses' => 'Diproses', 'dikirim' => 'Dikirim', 'selesai' => 'Selesai', 'dibatalkan' => 'Dibatalkan'];
$page = 'akun'; $title = 'Pesanan Saya — ATEA Parfums';
require __DIR__ . '/includes/header.php';
?>
<main class="page-narrow">
  <p class="eyebrow">AKUN</p>
  <h1 class="page-h1">Pesanan <em>saya</em></h1>
  <?php if (!$orders): ?>
    <div class="panel"><p>Belum ada pesanan.</p><a class="outline-link" href="<?= h(url('lineup.php')) ?>">LIHAT KOLEKSI <span>↗</span></a></div>
  <?php endif; ?>
  <?php foreach ($orders as $o): ?>
    <div class="panel">
      <div class="order-head">
        <div><b>Pesanan #<?= (int)$o['id_order'] ?></b><br><small class="muted"><?= h($o['tanggal_pesanan']) ?></small></div>
        <span class="badge badge-<?= h($o['status_pesanan']) ?>"><?= h($labels[$o['status_pesanan']] ?? $o['status_pesanan']) ?></span>
      </div>
      <ul class="order-items">
        <?php foreach ($itemsBy[$o['id_order']] ?? [] as $i): ?>
          <li><span><?= h($i['nama_produk']) ?> <?= (int)$i['ukuran_ml'] ?> ml × <?= (int)$i['jumlah'] ?></span><span><?= h(rupiah($i['harga_satuan'] * $i['jumlah'])) ?></span></li>
        <?php endforeach; ?>
      </ul>
      <p class="order-total">Total <b><?= h(rupiah($o['total_harga'])) ?></b> · <?= h($o['metode'] ?? '-') ?> (<?= h($o['status_bayar'] ?? '-') ?>)</p>
      <div class="order-actions">
        <?php if ($o['status_pesanan'] === 'menunggu_pembayaran'): ?>
          <a class="outline-link" href="<?= h(url('order_success.php?id=' . (int)$o['id_order'])) ?>">CARA BAYAR <span>↗</span></a>
          <form method="post" onsubmit="return confirm('Batalkan pesanan ini?')"><?= csrf_field() ?><input type="hidden" name="action" value="cancel"><input type="hidden" name="id" value="<?= (int)$o['id_order'] ?>"><button class="link-btn" type="submit">Batalkan pesanan</button></form>
        <?php endif; ?>
      </div>
    </div>
  <?php endforeach; ?>
</main>
<?php require __DIR__ . '/includes/footer.php'; ?>
