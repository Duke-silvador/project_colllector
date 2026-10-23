<?php
$pageTitle = "Page Not Found (404)";
http_response_code(404);
require_once __DIR__ . '/includes/header.php';
?>
<div class="py-5 bg-light min-vh-75 d-flex align-items-center">
    <div class="container text-center py-5">
        <div class="display-1 fw-extrabold text-success mb-2">404</div>
        <h2 class="fw-bold text-dark mb-3">Oops! Recipe or Page Not Found</h2>
        <p class="text-secondary max-w-500 mx-auto mb-4">
            The page you are looking for might have been moved, deleted, or never existed. Let's get you back on a healthy track!
        </p>
        <div class="d-flex justify-content-center gap-3">
            <a href="<?= url('index.php') ?>" class="btn btn-success rounded-pill px-4">
                <i class="fa-solid fa-house me-2"></i>Return Home
            </a>
            <a href="<?= url('meals.php') ?>" class="btn btn-outline-dark rounded-pill px-4">
                <i class="fa-solid fa-bowl-food me-2"></i>Explore Meals
            </a>
        </div>
    </div>
</div>
<?php require_once __DIR__ . '/includes/footer.php'; ?>
