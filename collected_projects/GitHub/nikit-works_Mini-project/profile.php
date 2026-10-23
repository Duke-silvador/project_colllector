<?php
/**
 * HealthyDiet — User Account & Profile Settings
 */

require_once __DIR__ . '/includes/auth.php';
require_once __DIR__ . '/includes/functions.php';

require_login();

$user = current_user();
$db = getDB();

$pageTitle = "Account Profile & Security";
$errors = [];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!verify_csrf()) {
        $errors[] = 'Session security token expired. Please try again.';
    } else {
        $formType = $_POST['form_type'] ?? 'profile';

        if ($formType === 'profile') {
            $name = sanitize_string($_POST['name'] ?? '');
            $email = filter_var(trim($_POST['email'] ?? ''), FILTER_VALIDATE_EMAIL);

            if (empty($name) || strlen($name) < 2) {
                $errors[] = 'Name must contain at least 2 characters.';
            }
            if (!$email) {
                $errors[] = 'Please provide a valid email address.';
            }

            // Check if email changed and taken
            if (empty($errors) && $email !== $user['email']) {
                $check = $db->prepare("SELECT id FROM users WHERE email = ? AND id != ? LIMIT 1");
                $check->execute([$email, $user['id']]);
                if ($check->fetch()) {
                    $errors[] = 'This email is already in use by another account.';
                }
            }

            // Handle Avatar Upload if provided
            $avatarPath = $user['avatar'];
            if (empty($errors) && !empty($_FILES['avatar']['name'])) {
                $uploadRes = upload_image($_FILES['avatar'], 'avatars');
                if ($uploadRes['success']) {
                    $avatarPath = $uploadRes['path'];
                } else {
                    $errors[] = $uploadRes['error'];
                }
            }

            if (empty($errors)) {
                $stmt = $db->prepare("UPDATE users SET name = ?, email = ?, avatar = ?, updated_at = NOW() WHERE id = ?");
                $stmt->execute([$name, $email, $avatarPath, $user['id']]);
                $_SESSION['user_name'] = $name;
                $_SESSION['user_email'] = $email;

                set_flash('success', 'Profile details updated successfully!');
                header('Location: ' . url('profile.php'));
                exit;
            }
        } elseif ($formType === 'password') {
            $currentPass = $_POST['current_password'] ?? '';
            $newPass = $_POST['new_password'] ?? '';
            $confirmPass = $_POST['confirm_password'] ?? '';

            if (!password_verify($currentPass, $user['password'])) {
                $errors[] = 'Current password entered is incorrect.';
            }
            if (strlen($newPass) < 6) {
                $errors[] = 'New password must be at least 6 characters long.';
            }
            if ($newPass !== $confirmPass) {
                $errors[] = 'New password and confirmation do not match.';
            }

            if (empty($errors)) {
                $hashed = password_hash($newPass, PASSWORD_BCRYPT);
                $stmt = $db->prepare("UPDATE users SET password = ?, updated_at = NOW() WHERE id = ?");
                $stmt->execute([$hashed, $user['id']]);

                set_flash('success', 'Your password has been changed successfully!');
                header('Location: ' . url('profile.php'));
                exit;
            }
        }
    }
}

require_once __DIR__ . '/includes/header.php';
?>

<div class="bg-light py-4 border-bottom">
    <div class="container">
        <h6 class="text-success text-uppercase fw-bold ls-1 mb-1">Account & Preferences</h6>
        <h1 class="h2 fw-bold text-dark mb-0">Account Profile Settings</h1>
    </div>
</div>

<div class="container py-5">
    <?php if (!empty($errors)): ?>
        <div class="alert alert-danger rounded-4 shadow-sm p-3 mb-4">
            <ul class="mb-0 ps-3">
                <?php foreach ($errors as $err): ?>
                    <li><?= e($err) ?></li>
                <?php endforeach; ?>
            </ul>
        </div>
    <?php endif; ?>

    <div class="row g-5">
        <!-- Left: Account Details & Password Form -->
        <div class="col-lg-8">
            <!-- Edit Profile Details -->
            <div class="card border-0 rounded-4 shadow-sm p-4 p-md-5 bg-white mb-4">
                <div class="d-flex align-items-center gap-2 mb-4">
                    <div class="bg-success-subtle text-success rounded-circle p-2 fs-5">
                        <i class="fa-solid fa-user-pen"></i>
                    </div>
                    <h4 class="fw-bold text-dark mb-0">Personal Profile</h4>
                </div>

                <form method="POST" action="<?= url('profile.php') ?>" enctype="multipart/form-data">
                    <input type="hidden" name="csrf_token" value="<?= csrf_token() ?>">
                    <input type="hidden" name="form_type" value="profile">

                    <div class="d-flex align-items-center gap-4 mb-4 pb-3 border-bottom">
                        <img src="<?= user_avatar_url($user['avatar'] ?? null) ?>" alt="<?= e($user['name']) ?>" class="rounded-circle border shadow-xs" style="width: 80px; height: 80px; object-fit: cover; background-color: #e2e8f0;" onerror="this.onerror=null;this.src='<?= asset('images/default-avatar.svg') ?>';">
                        <div class="flex-grow-1">
                            <label class="form-label fw-semibold small text-secondary mb-1">Change Profile Avatar</label>
                            <input type="file" name="avatar" class="form-control form-control-sm" accept="image/png, image/jpeg, image/webp">
                            <span class="text-muted small" style="font-size: 0.75rem;">Allowed: JPG, PNG, WebP (Max 5MB)</span>
                        </div>
                    </div>

                    <div class="row g-3 mb-4">
                        <div class="col-md-6">
                            <label class="form-label fw-semibold small text-secondary">Full Name <span class="text-danger">*</span></label>
                            <input type="text" name="name" class="form-control" value="<?= e($user['name']) ?>" required>
                        </div>
                        <div class="col-md-6">
                            <label class="form-label fw-semibold small text-secondary">Email Address <span class="text-danger">*</span></label>
                            <input type="email" name="email" class="form-control" value="<?= e($user['email']) ?>" required>
                        </div>
                    </div>

                    <div class="text-end">
                        <button type="submit" class="btn btn-success rounded-pill px-4 fw-bold shadow-xs">
                            Save Profile Changes
                        </button>
                    </div>
                </form>
            </div>

            <!-- Change Password -->
            <div class="card border-0 rounded-4 shadow-sm p-4 p-md-5 bg-white">
                <div class="d-flex align-items-center gap-2 mb-4">
                    <div class="bg-danger-subtle text-danger rounded-circle p-2 fs-5">
                        <i class="fa-solid fa-lock"></i>
                    </div>
                    <h4 class="fw-bold text-dark mb-0">Security & Password</h4>
                </div>

                <form method="POST" action="<?= url('profile.php') ?>">
                    <input type="hidden" name="csrf_token" value="<?= csrf_token() ?>">
                    <input type="hidden" name="form_type" value="password">

                    <div class="mb-3">
                        <label class="form-label fw-semibold small text-secondary">Current Password <span class="text-danger">*</span></label>
                        <input type="password" name="current_password" class="form-control" placeholder="••••••••" required>
                    </div>

                    <div class="row g-3 mb-4">
                        <div class="col-md-6">
                            <label class="form-label fw-semibold small text-secondary">New Password <span class="text-danger">*</span></label>
                            <input type="password" name="new_password" class="form-control" placeholder="Min 6 characters" required>
                        </div>
                        <div class="col-md-6">
                            <label class="form-label fw-semibold small text-secondary">Confirm New Password <span class="text-danger">*</span></label>
                            <input type="password" name="confirm_password" class="form-control" placeholder="Repeat new password" required>
                        </div>
                    </div>

                    <div class="text-end">
                        <button type="submit" class="btn btn-dark rounded-pill px-4 fw-bold">
                            Update Password
                        </button>
                    </div>
                </form>
            </div>
        </div>

        <!-- Right: Health Biometrics Summary -->
        <div class="col-lg-4">
            <div class="sticky-top" style="top: 90px;">
                <div class="card border-0 rounded-4 shadow-sm p-4 bg-white mb-4">
                    <div class="d-flex justify-content-between align-items-center mb-3">
                        <h5 class="fw-bold text-dark mb-0">Active Health Assessment</h5>
                        <a href="<?= url('health-assessment.php') ?>" class="text-success small fw-semibold text-decoration-none">Edit &rarr;</a>
                    </div>

                    <div class="d-flex flex-column gap-2 small">
                        <div class="d-flex justify-content-between py-2 border-bottom">
                            <span class="text-secondary">Calculated BMI:</span>
                            <span class="fw-bold text-dark"><?= $user['calculated_bmi'] ?: '—' ?> (<?= e($user['bmi_category'] ?: 'Normal') ?>)</span>
                        </div>
                        <div class="d-flex justify-content-between py-2 border-bottom">
                            <span class="text-secondary">Daily Calorie Target:</span>
                            <span class="fw-bold text-success"><?= number_format($user['daily_calories_target'] ?: 2000) ?> kcal</span>
                        </div>
                        <div class="d-flex justify-content-between py-2 border-bottom">
                            <span class="text-secondary">Goal:</span>
                            <span class="fw-bold text-dark"><?= ucwords(str_replace('_', ' ', $user['goal'] ?: 'Healthy Eating')) ?></span>
                        </div>
                        <div class="d-flex justify-content-between py-2 border-bottom">
                            <span class="text-secondary">Dietary Preference:</span>
                            <span class="fw-bold text-dark"><?= ucwords(str_replace('_', ' ', $user['dietary_preference'] ?: 'Vegetarian')) ?></span>
                        </div>
                        <div class="d-flex justify-content-between py-2 border-bottom">
                            <span class="text-secondary">Allergies Excluded:</span>
                            <span class="fw-bold text-danger"><?= !empty($user['allergies']) ? e(ucwords($user['allergies'])) : 'None' ?></span>
                        </div>
                        <div class="d-flex justify-content-between py-2">
                            <span class="text-secondary">Account Role:</span>
                            <span class="badge bg-light text-dark border text-uppercase"><?= e($user['role']) ?></span>
                        </div>
                    </div>

                    <div class="mt-4 pt-2">
                        <a href="<?= url('health-assessment.php') ?>" class="btn btn-outline-success btn-sm rounded-pill w-100 fw-semibold">
                            <i class="fa-solid fa-sliders me-1"></i>Re-run Health Assessment
                        </a>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>

<?php require_once __DIR__ . '/includes/footer.php'; ?>
