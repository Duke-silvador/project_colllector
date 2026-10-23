<?php
$pageTitle = "Access Forbidden (403)";
http_response_code(403);
require_once __DIR__ . '/includes/header.php';
?>
<div class="py-5 bg-light min-vh-75 d-flex align-items-center">
    <div class="container text-center py-5">
        <div class="display-1 fw-extrabold text-danger mb-2">403</div>
        <h2 class="fw-bold text-dark mb-3">Access Prohibited</h2>
        <p class="text-secondary max-w-500 mx-auto mb-4">
            You do not have administrative permissions or proper privileges to access this protected area.
        </p>
        <a href="<?= url('index.php') ?>" class="btn btn-dark rounded-pill px-4">
            <i class="fa-solid fa-arrow-left me-2"></i>Back to Safe Ground
        </a>
    </div>
</div>
<?php require_once __DIR__ . '/includes/footer.php'; ?>
