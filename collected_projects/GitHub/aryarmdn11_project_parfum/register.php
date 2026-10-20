<?php
require __DIR__ . '/includes/bootstrap.php';
$next = $_GET['next'] ?? $_POST['next'] ?? '';
if (current_user()) redirect(safe_next($next));

$errors = [];
$old = ['nama' => '', 'email' => '', 'no_telepon' => ''];
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    csrf_require();
    $old = ['nama' => trim($_POST['nama'] ?? ''), 'email' => strtolower(trim($_POST['email'] ?? '')), 'no_telepon' => trim($_POST['no_telepon'] ?? '')];
    $pass = (string)($_POST['password'] ?? '');
    if (mb_strlen($old['nama']) < 2 || mb_strlen($old['nama']) > 100) $errors[] = 'Nama harus 2–100 karakter.';
    if (!filter_var($old['email'], FILTER_VALIDATE_EMAIL) || strlen($old['email']) > 150) $errors[] = 'Format email tidak valid.';
    if ($old['no_telepon'] !== '' && !preg_match('/^\+?[0-9 \-]{8,20}$/', $old['no_telepon'])) $errors[] = 'Nomor telepon tidak valid.';
    if (strlen($pass) < 8) $errors[] = 'Password minimal 8 karakter.';
    if ($pass !== (string)($_POST['password2'] ?? '')) $errors[] = 'Konfirmasi password tidak sama.';
    if (!$errors) {
        $c = db()->prepare('SELECT 1 FROM `user` WHERE email = ?');
        $c->execute([$old['email']]);
        if ($c->fetchColumn()) {
            $errors[] = 'Email sudah terdaftar. Silakan login.';
        } else {
            db()->prepare("INSERT INTO `user` (nama, email, password, no_telepon, role, created_at) VALUES (?, ?, ?, ?, 'customer', ?)")
                ->execute([$old['nama'], $old['email'], password_hash($pass, PASSWORD_DEFAULT), $old['no_telepon'] ?: null, now()]);
            login_user((int)db()->lastInsertId());
            flash('ok', 'Akun berhasil dibuat. Selamat datang di ATEA Parfums!');
            redirect(safe_next($next));
        }
    }
}
$page = 'akun'; $title = 'Daftar — ATEA Parfums';
require __DIR__ . '/includes/header.php';
?>
<main class="auth-wrap">
  <form class="auth-card" method="post" novalidate>
    <p class="eyebrow">JOIN ATEA</p>
    <h1>Daftar</h1>
    <?php foreach ($errors as $e): ?><div class="form-error"><?= h($e) ?></div><?php endforeach; ?>
    <?= csrf_field() ?>
    <input type="hidden" name="next" value="<?= h($next) ?>">
    <label>Nama lengkap<input type="text" name="nama" required maxlength="100" value="<?= h($old['nama']) ?>" autocomplete="name"></label>
    <label>Email<input type="email" name="email" required maxlength="150" value="<?= h($old['email']) ?>" autocomplete="email"></label>
    <label>No. telepon / WhatsApp <small>(opsional)</small><input type="tel" name="no_telepon" maxlength="20" value="<?= h($old['no_telepon']) ?>" autocomplete="tel"></label>
    <label>Password <small>(min. 8 karakter)</small><input type="password" name="password" required minlength="8" autocomplete="new-password"></label>
    <label>Ulangi password<input type="password" name="password2" required minlength="8" autocomplete="new-password"></label>
    <button class="solid-btn dark" type="submit">BUAT AKUN</button>
    <p class="auth-alt">Sudah punya akun? <a href="<?= h(url('login.php' . ($next ? '?next=' . rawurlencode($next) : ''))) ?>">Login</a></p>
  </form>
</main>
<?php require __DIR__ . '/includes/footer.php'; ?>
