<?php
// Halaman sekali pakai untuk membuat akun admin pertama.
// Otomatis nonaktif begitu sudah ada admin. SETELAH DIPAKAI, HAPUS FILE INI dari folder website.
require __DIR__ . '/includes/bootstrap.php';
$has = (int)db()->query("SELECT COUNT(*) FROM `user` WHERE role = 'admin'")->fetchColumn();
if ($has > 0) { http_response_code(403); exit('Admin sudah ada. Hapus file setup_admin.php dari folder website.'); }

$errors = []; $done = false; $old = ['nama' => '', 'email' => ''];
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    csrf_require();
    $old = ['nama' => trim($_POST['nama'] ?? ''), 'email' => strtolower(trim($_POST['email'] ?? ''))];
    $pass = (string)($_POST['password'] ?? '');
    if (mb_strlen($old['nama']) < 2) $errors[] = 'Nama wajib diisi.';
    if (!filter_var($old['email'], FILTER_VALIDATE_EMAIL)) $errors[] = 'Email tidak valid.';
    if (strlen($pass) < 8) $errors[] = 'Password minimal 8 karakter.';
    if (!$errors) {
        $ex = db()->prepare('SELECT id_user FROM `user` WHERE email = ?');
        $ex->execute([$old['email']]);
        if ($id = $ex->fetchColumn()) {   // email sudah terdaftar sebagai customer -> naikkan jadi admin
            db()->prepare("UPDATE `user` SET role = 'admin', password = ? WHERE id_user = ?")->execute([password_hash($pass, PASSWORD_DEFAULT), $id]);
        } else {
            db()->prepare("INSERT INTO `user` (nama, email, password, role, created_at) VALUES (?, ?, ?, 'admin', ?)")
                ->execute([$old['nama'], $old['email'], password_hash($pass, PASSWORD_DEFAULT), now()]);
        }
        $done = true;
    }
}
$page = 'akun'; $title = 'Setup Admin — ATEA Parfums';
require __DIR__ . '/includes/header.php';
?>
<main class="auth-wrap">
<?php if ($done): ?>
  <div class="auth-card"><h1>Admin dibuat</h1><p>Sekarang <b>hapus file <code>setup_admin.php</code></b> dari folder website, lalu <a href="<?= h(url('login.php?next=admin/index.php')) ?>">login</a>.</p></div>
<?php else: ?>
  <form class="auth-card" method="post" novalidate>
    <p class="eyebrow">SETUP</p><h1>Buat admin</h1>
    <?php foreach ($errors as $e): ?><div class="form-error"><?= h($e) ?></div><?php endforeach; ?>
    <?= csrf_field() ?>
    <label>Nama<input type="text" name="nama" required value="<?= h($old['nama']) ?>"></label>
    <label>Email<input type="email" name="email" required value="<?= h($old['email']) ?>"></label>
    <label>Password <small>(min. 8 karakter)</small><input type="password" name="password" required minlength="8"></label>
    <button class="solid-btn dark" type="submit">BUAT ADMIN</button>
  </form>
<?php endif; ?>
</main>
<?php require __DIR__ . '/includes/footer.php'; ?>
