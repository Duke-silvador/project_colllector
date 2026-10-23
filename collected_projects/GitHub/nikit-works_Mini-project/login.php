<?php
/**
 * HealthyDiet — User & Admin Sign In
 */

require_once __DIR__ . '/includes/auth.php';

// If already logged in, redirect
if (is_logged_in()) {
    header('Location: ' . (is_admin() ? url('admin/index.php') : url('dashboard.php')));
    exit;
}

$pageTitle = "Sign In to Your Account";
$errors = [];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!verify_csrf()) {
        $errors[] = 'Session security token expired. Please try again.';
    } else {
        $email = filter_var(trim($_POST['email'] ?? ''), FILTER_VALIDATE_EMAIL);
        $password = trim($_POST['password'] ?? '');
        $remember = !empty($_POST['remember']);

        if (!$email) {
            $errors[] = 'Please enter a valid email address.';
        }
        if (empty($password)) {
            $errors[] = 'Please enter your account password.';
        }

        if (empty($errors)) {
            $db = getDB();
            if ($db) {
                $stmt = $db->prepare("SELECT * FROM users WHERE email = ? LIMIT 1");
                $stmt->execute([$email]);
                $user = $stmt->fetch();

                if ($user && password_verify($password, $user['password'])) {
                    if ($user['status'] === 'banned') {
                        $errors[] = 'Your account has been suspended. Please contact support.';
                    } elseif ($user['status'] === 'inactive') {
                        $errors[] = 'Your account is inactive. Please contact administration.';
                    } else {
                        // Successful login
                        session_regenerate_id(true);
                        $_SESSION['user_id'] = $user['id'];
                        $_SESSION['user_name'] = $user['name'];
                        $_SESSION['user_email'] = $user['email'];
                        $_SESSION['user_role'] = $user['role'];

                        set_flash('success', 'Welcome back, ' . e($user['name']) . '!');

                        // Intended redirect or role dashboard
                        $redirectUrl = $_SESSION['intended_url'] ?? null;
                        unset($_SESSION['intended_url']);

                        if ($redirectUrl && !str_contains($redirectUrl, 'login.php') && !str_contains($redirectUrl, 'register.php')) {
                            header('Location: ' . $redirectUrl);
                        } else {
                            header('Location: ' . ($user['role'] === 'admin' ? url('admin/index.php') : url('dashboard.php')));
                        }
                        exit;
                    }
                } else {
                    $errors[] = 'Invalid email or password. Please verify and try again.';
                }
            } else {
                $errors[] = 'Database connection error. Please try again later.';
            }
        }
    }
}

require_once __DIR__ . '/includes/header.php';
?>

<div class="py-5 bg-light min-vh-75 d-flex align-items-center">
    <div class="container">
        <div class="row justify-content-center">
            <div class="col-md-7 col-lg-5">
                <div class="card border-0 rounded-4 shadow-sm p-4 p-sm-5 bg-white">
                    <div class="text-center mb-4">
                        <div class="d-inline-flex align-items-center justify-content-center bg-success-subtle text-success rounded-circle p-3 mb-2">
                            <i class="fa-solid fa-leaf fs-3"></i>
                        </div>
                        <h3 class="fw-bold text-dark mb-1">Welcome Back</h3>
                        <p class="text-secondary small">Access your personalized diet plans and progress</p>
                    </div>

                    <?php if (!empty($errors)): ?>
                        <div class="alert alert-danger rounded-3 p-3 mb-3 small shadow-xs">
                            <i class="fa-solid fa-triangle-exclamation me-1"></i>
                            <?= implode('<br>', array_map('e', $errors)) ?>
                        </div>
                    <?php endif; ?>

                    <form method="POST" action="<?= url('login.php') ?>" class="needs-validation" novalidate>
                        <input type="hidden" name="csrf_token" value="<?= csrf_token() ?>">

                        <div class="mb-3">
                            <label class="form-label fw-semibold small text-secondary">Email Address</label>
                            <div class="input-group">
                                <span class="input-group-text bg-light text-muted"><i class="fa-solid fa-envelope"></i></span>
                                <input type="email" name="email" class="form-control" placeholder="name@example.com" value="<?= e($_POST['email'] ?? '') ?>" required autofocus>
                            </div>
                        </div>

                        <div class="mb-3">
                            <div class="d-flex justify-content-between align-items-center mb-1">
                                <label class="form-label fw-semibold small text-secondary mb-0">Password</label>
                                <a href="<?= url('contact.php?subject=Forgot+Password') ?>" class="text-success small text-decoration-none">Forgot password?</a>
                            </div>
                            <div class="input-group">
                                <span class="input-group-text bg-light text-muted"><i class="fa-solid fa-lock"></i></span>
                                <input type="password" name="password" class="form-control" placeholder="••••••••" required>
                            </div>
                        </div>

                        <div class="form-check mb-4">
                            <input class="form-check-input" type="checkbox" name="remember" id="rememberMe">
                            <label class="form-check-label small text-secondary" for="rememberMe">
                                Keep me signed in on this device
                            </label>
                        </div>

                        <button type="submit" class="btn btn-success btn-lg w-100 rounded-pill fw-bold shadow-sm mb-3">
                            Sign In to Account
                        </button>

                        <div class="text-center small text-secondary">
                            Don't have an account yet? 
                            <a href="<?= url('register.php') ?>" class="text-success fw-bold text-decoration-none">Sign Up Free</a>
                        </div>
                    </form>

                    <!-- Demo Credentials Helper Accordion/Pills for Testing -->
                    <div class="mt-4 pt-3 border-top">
                        <div class="small fw-semibold text-muted text-uppercase mb-2 text-center" style="font-size: 0.72rem; letter-spacing: 0.05em;">
                            Demo Quick Logins
                        </div>
                        <div class="d-flex flex-column gap-1 small">
                            <button type="button" class="btn btn-outline-secondary btn-sm rounded-pill text-start px-3 py-1" onclick="fillLogin('admin@healthydiet.com', 'Admin@123')">
                                <i class="fa-solid fa-shield-halved text-danger me-1"></i> Admin: <code>admin@healthydiet.com</code> / <code>Admin@123</code>
                            </button>
                            <button type="button" class="btn btn-outline-secondary btn-sm rounded-pill text-start px-3 py-1" onclick="fillLogin('emily@healthydiet.com', 'User@123')">
                                <i class="fa-solid fa-user text-success me-1"></i> User (Vegetarian): <code>emily@healthydiet.com</code> / <code>User@123</code>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>

<script>
function fillLogin(email, pass) {
    document.querySelector('input[name="email"]').value = email;
    document.querySelector('input[name="password"]').value = pass;
}
</script>

<?php require_once __DIR__ . '/includes/footer.php'; ?>
