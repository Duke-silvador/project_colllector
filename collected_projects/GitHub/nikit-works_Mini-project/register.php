<?php
/**
 * HealthyDiet — User Registration
 */

require_once __DIR__ . '/includes/auth.php';
require_once __DIR__ . '/includes/functions.php';

// If already logged in, redirect
if (is_logged_in()) {
    header('Location: ' . url('dashboard.php'));
    exit;
}

$pageTitle = "Create Your Free HealthyDiet Account";
$errors = [];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!verify_csrf()) {
        $errors[] = 'Security token invalid. Please refresh the page.';
    } else {
        $name = sanitize_string($_POST['name'] ?? '');
        $email = filter_var(trim($_POST['email'] ?? ''), FILTER_VALIDATE_EMAIL);
        $password = $_POST['password'] ?? '';
        $confirmPassword = $_POST['confirm_password'] ?? '';
        $age = (int)($_POST['age'] ?? 0);
        $gender = in_array($_POST['gender'] ?? '', ['male', 'female', 'other']) ? $_POST['gender'] : 'female';

        if (empty($name) || strlen($name) < 2) {
            $errors[] = 'Please enter your full name (at least 2 characters).';
        }
        if (!$email) {
            $errors[] = 'Please enter a valid email address.';
        }
        if (strlen($password) < 6) {
            $errors[] = 'Password must contain at least 6 characters.';
        }
        if ($password !== $confirmPassword) {
            $errors[] = 'Password and confirmation do not match.';
        }
        if ($age < 12 || $age > 120) {
            $errors[] = 'Please enter a realistic age between 12 and 120.';
        }

        if (empty($errors)) {
            $db = getDB();
            if ($db) {
                // Check if email already exists
                $checkStmt = $db->prepare("SELECT id FROM users WHERE email = ? LIMIT 1");
                $checkStmt->execute([$email]);
                if ($checkStmt->fetch()) {
                    $errors[] = 'An account with this email address already exists. Please sign in.';
                } else {
                    try {
                        $db->beginTransaction();

                        // 1. Insert User
                        $hashedPassword = password_hash($password, PASSWORD_BCRYPT);
                        $insertUser = $db->prepare("
                            INSERT INTO users (name, email, password, role, status, avatar)
                            VALUES (?, ?, ?, 'user', 'active', 'assets/images/default-avatar.png')
                        ");
                        $insertUser->execute([$name, $email, $hashedPassword]);
                        $newUserId = (int)$db->lastInsertId();

                        // 2. Insert Default Profile Skeleton
                        $insertProfile = $db->prepare("
                            INSERT INTO user_profiles (
                                user_id, age, gender, height_cm, weight_kg, 
                                activity_level, goal, dietary_preference, 
                                allergies, medical_restrictions, favorite_foods, foods_to_avoid, 
                                calculated_bmi, bmi_category, daily_calories_target, 
                                target_protein_g, target_carbs_g, target_fat_g
                            ) VALUES (
                                ?, ?, ?, 170.00, 70.00,
                                'moderately_active', 'healthy_eating', 'vegetarian',
                                '', 'None', '', '',
                                24.2, 'Normal', 2000,
                                125, 250, 55
                            )
                        ");
                        $insertProfile->execute([$newUserId, $age, $gender]);

                        // 3. Create Default Meal Plan Container
                        $insertPlan = $db->prepare("
                            INSERT INTO meal_plans (user_id, plan_name, is_active)
                            VALUES (?, ?, 1)
                        ");
                        $insertPlan->execute([$newUserId, $name . "'s Weekly Meal Plan"]);

                        $db->commit();

                        // Automatically log in
                        session_regenerate_id(true);
                        $_SESSION['user_id'] = $newUserId;
                        $_SESSION['user_name'] = $name;
                        $_SESSION['user_email'] = $email;
                        $_SESSION['user_role'] = 'user';

                        set_flash('success', 'Account created successfully! Let\'s complete your personalized health assessment now.');
                        header('Location: ' . url('health-assessment.php'));
                        exit;
                    } catch (PDOException $e) {
                        if ($db->inTransaction()) {
                            $db->rollBack();
                        }
                        $errors[] = 'Failed to create account: ' . $e->getMessage();
                    }
                }
            } else {
                $errors[] = 'Database is currently offline. Please try again.';
            }
        }
    }
}

require_once __DIR__ . '/includes/header.php';
?>

<div class="py-5 bg-light min-vh-75 d-flex align-items-center">
    <div class="container">
        <div class="row justify-content-center">
            <div class="col-md-8 col-lg-6">
                <div class="card border-0 rounded-4 shadow-sm p-4 p-sm-5 bg-white">
                    <div class="text-center mb-4">
                        <div class="d-inline-flex align-items-center justify-content-center bg-success-subtle text-success rounded-circle p-3 mb-2">
                            <i class="fa-solid fa-user-plus fs-3"></i>
                        </div>
                        <h3 class="fw-bold text-dark mb-1">Create Your Free Account</h3>
                        <p class="text-secondary small">Start your personalized nutrition journey in under a minute</p>
                    </div>

                    <?php if (!empty($errors)): ?>
                        <div class="alert alert-danger rounded-3 p-3 mb-3 small shadow-xs">
                            <i class="fa-solid fa-triangle-exclamation me-1"></i>
                            <?= implode('<br>', array_map('e', $errors)) ?>
                        </div>
                    <?php endif; ?>

                    <form method="POST" action="<?= url('register.php') ?>" class="needs-validation" novalidate>
                        <input type="hidden" name="csrf_token" value="<?= csrf_token() ?>">

                        <div class="mb-3">
                            <label class="form-label fw-semibold small text-secondary">Full Name <span class="text-danger">*</span></label>
                            <input type="text" name="name" class="form-control" placeholder="e.g. Alex Johnson" value="<?= e($_POST['name'] ?? '') ?>" required autofocus>
                        </div>

                        <div class="mb-3">
                            <label class="form-label fw-semibold small text-secondary">Email Address <span class="text-danger">*</span></label>
                            <input type="email" name="email" class="form-control" placeholder="name@example.com" value="<?= e($_POST['email'] ?? '') ?>" required>
                        </div>

                        <div class="row g-3 mb-3">
                            <div class="col-sm-6">
                                <label class="form-label fw-semibold small text-secondary">Age (Years) <span class="text-danger">*</span></label>
                                <input type="number" name="age" class="form-control" placeholder="25" min="12" max="120" value="<?= e($_POST['age'] ?? '25') ?>" required>
                            </div>
                            <div class="col-sm-6">
                                <label class="form-label fw-semibold small text-secondary">Gender <span class="text-danger">*</span></label>
                                <select name="gender" class="form-select" required>
                                    <option value="female" <?= ($_POST['gender'] ?? '') === 'female' ? 'selected' : '' ?>>Female</option>
                                    <option value="male" <?= ($_POST['gender'] ?? '') === 'male' ? 'selected' : '' ?>>Male</option>
                                    <option value="other" <?= ($_POST['gender'] ?? '') === 'other' ? 'selected' : '' ?>>Other / Non-binary</option>
                                </select>
                            </div>
                        </div>

                        <div class="row g-3 mb-4">
                            <div class="col-sm-6">
                                <label class="form-label fw-semibold small text-secondary">Password <span class="text-danger">*</span></label>
                                <input type="password" name="password" class="form-control" placeholder="Min 6 characters" required>
                            </div>
                            <div class="col-sm-6">
                                <label class="form-label fw-semibold small text-secondary">Confirm Password <span class="text-danger">*</span></label>
                                <input type="password" name="confirm_password" class="form-control" placeholder="Repeat password" required>
                            </div>
                        </div>

                        <div class="form-check mb-4">
                            <input class="form-check-input" type="checkbox" id="agreeTerms" required checked>
                            <label class="form-check-label small text-secondary" for="agreeTerms">
                                I agree to the <a href="<?= url('about.php') ?>" class="text-success text-decoration-none">Terms of Service</a> & acknowledge the health disclaimer.
                            </label>
                        </div>

                        <button type="submit" class="btn btn-success btn-lg w-100 rounded-pill fw-bold shadow-sm mb-3">
                            Complete Registration &rarr;
                        </button>

                        <div class="text-center small text-secondary">
                            Already have an account? 
                            <a href="<?= url('login.php') ?>" class="text-success fw-bold text-decoration-none">Sign In</a>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    </div>
</div>

<?php require_once __DIR__ . '/includes/footer.php'; ?>
