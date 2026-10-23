<?php
$pageTitle = "Internal Server Error (500)";
http_response_code(500);
require_once __DIR__ . '/includes/header.php';
?>
<div class="py-5 bg-light min-vh-75 d-flex align-items-center">
    <div class="container text-center py-5">
        <div class="display-1 fw-extrabold text-warning mb-2">500</div>
        <h2 class="fw-bold text-dark mb-3">Something Went Wrong</h2>
        <p class="text-secondary max-w-500 mx-auto mb-4">
            An internal system exception occurred. Our engineers have been alerted. Please refresh or try again in a few moments.
        </p>
        <a href="<?= url('index.php') ?>" class="btn btn-success rounded-pill px-4">
            <i class="fa-solid fa-house me-2"></i>Return Home
        </a>
    </div>
</div>
<?php require_once __DIR__ . '/includes/footer.php'; ?>
