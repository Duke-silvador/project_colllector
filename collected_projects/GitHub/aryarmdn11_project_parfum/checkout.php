<?php
require __DIR__ . '/includes/bootstrap.php';
require __DIR__ . '/includes/catalog.php';
require __DIR__ . '/includes/cart.php';
$user = require_login();
$uid = (int)$user['id_user'];
$methods = array_keys(PAYMENT_INSTRUCTIONS);

$items = cart_items($uid);
if (!$items) { flash('info', 'Keranjang kamu masih kosong.'); redirect(url('lineup.php')); }
$total = 0;
foreach ($items as $r) $total += (float)$r['harga'] * (int)$r['jumlah'];

$errors = [];
$old = ['penerima' => $user['nama'], 'telepon' => (string)$user['no_telepon'], 'alamat' => '', 'kota' => '', 'kode_pos' => '', 'metode' => $methods[0]];
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    csrf_require();
    foreach ($old as $k => $_) $old[$k] = trim((string)($_POST[$k] ?? ''));
    if (mb_strlen($old['penerima']) < 2) $errors[] = 'Nama penerima wajib diisi.';
    if (!preg_match('/^\+?[0-9 \-]{8,20}$/', $old['telepon'])) $errors[] = 'Nomor telepon penerima tidak valid.';
    if (mb_strlen($old['alamat']) < 10) $errors[] = 'Alamat lengkap minimal 10 karakter.';
    if ($old['kota'] === '') $errors[] = 'Kota/kabupaten wajib diisi.';
    if (!preg_match('/^[0-9]{5}$/', $old['kode_pos'])) $errors[] = 'Kode pos harus 5 digit.';
    if (!in_array($old['metode'], $methods, true)) $errors[] = 'Pilih metode pembayaran.';
    if (!$errors) {
        $alamat = "{$old['penerima']} ({$old['telepon']})\n{$old['alamat']}\n{$old['kota']} {$old['kode_pos']}";
        try {
            $oid = place_order($uid, $alamat, $old['metode']);
            flash('ok', 'Pesanan berhasil dibuat. Silakan selesaikan pembayaran.');
            redirect(url('order_success.php?id=' . $oid));
        } catch (RuntimeException $e) {
            $errors[] = $e->getMessage();
            $items = cart_items($uid);
        }
    }
}
$page = 'akun'; $title = 'Checkout — ATEA Parfums';
require __DIR__ . '/includes/header.php';
?>
<main class="page-narrow">
  <p class="eyebrow">CHECKOUT</p>
  <h1 class="page-h1">Selesaikan <em>pesanan</em></h1>
  <?php foreach ($errors as $e): ?><div class="form-error"><?= h($e) ?></div><?php endforeach; ?>
  <div class="checkout-grid">
    <form method="post" class="panel-form" novalidate>
      <?= csrf_field() ?>
      <h2>Pengiriman</h2>
      <label>Nama penerima<input type="text" name="penerima" required value="<?= h($old['penerima']) ?>"></label>
      <label>No. telepon penerima<input type="tel" name="telepon" required value="<?= h($old['telepon']) ?>"></label>
      <label>Alamat lengkap<textarea name="alamat" rows="3" required placeholder="Nama jalan, nomor rumah, RT/RW, kecamatan"><?= h($old['alamat']) ?></textarea></label>
      <div class="two-col">
        <label>Kota / Kabupaten<input type="text" name="kota" required value="<?= h($old['kota']) ?>"></label>
        <label>Kode pos<input type="text" name="kode_pos" required inputmode="numeric" maxlength="5" value="<?= h($old['kode_pos']) ?>"></label>
      </div>
      <h2>Pembayaran</h2>
      <div class="pay-options">
        <?php foreach ($methods as $m): ?>
          <label class="pay-opt"><input type="radio" name="metode" value="<?= h($m) ?>" <?= $old['metode'] === $m ? 'checked' : '' ?>><span><?= h($m) ?></span></label>
        <?php endforeach; ?>
      </div>
      <button class="solid-btn dark wide" type="submit">BUAT PESANAN · <?= h(rupiah($total)) ?></button>
      <p class="muted small">Ongkos kirim dikonfirmasi admin lewat WhatsApp setelah pesanan dibuat.</p>
    </form>
    <aside class="summary">
      <h2>Ringkasan</h2>
      <?php foreach ($items as $r): ?>
        <div class="sum-row">
          <img src="<?= h(asset_url($r['gambar']) ?: url('assets/atea-mark.png')) ?>" alt="">
          <div><b><?= h($r['nama_produk']) ?></b><br><small><?= (int)$r['ukuran_ml'] ?> ML · <?= (int)$r['jumlah'] ?> × <?= h(rupiah($r['harga'])) ?></small></div>
          <span><?= h(rupiah((float)$r['harga'] * (int)$r['jumlah'])) ?></span>
        </div>
      <?php endforeach; ?>
      <div class="sum-total"><span>Total</span><strong><?= h(rupiah($total)) ?></strong></div>
      <a class="text-link" href="<?= h(url('lineup.php?cart=1')) ?>">UBAH KERANJANG <span>↗</span></a>
    </aside>
  </div>
</main>
<?php require __DIR__ . '/includes/footer.php'; ?>
