<?php
require_once __DIR__ . '/includes/auth.php';
require_once __DIR__ . '/includes/functions.php';

$pageTitle = "Contact Us & Nutritional Support";
$errors = [];
$successMsg = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!verify_csrf()) {
        $errors[] = 'Invalid security token. Please refresh and try again.';
    } else {
        $name = sanitize_string($_POST['name'] ?? '');
        $email = filter_var(trim($_POST['email'] ?? ''), FILTER_VALIDATE_EMAIL);
        $subject = sanitize_string($_POST['subject'] ?? '');
        $message = sanitize_string($_POST['message'] ?? '');

        if (empty($name) || strlen($name) < 2) {
            $errors[] = 'Please enter your full name (at least 2 characters).';
        }
        if (!$email) {
            $errors[] = 'Please enter a valid email address.';
        }
        if (empty($subject) || strlen($subject) < 3) {
            $errors[] = 'Please enter a message subject (at least 3 characters).';
        }
        if (empty($message) || strlen($message) < 10) {
            $errors[] = 'Please enter your message (at least 10 characters).';
        }

        if (empty($errors)) {
            $db = getDB();
            if ($db) {
                try {
                    $stmt = $db->prepare("
                        INSERT INTO contact_messages (name, email, subject, message, status)
                        VALUES (?, ?, ?, ?, 'unread')
                    ");
                    $stmt->execute([$name, $email, $subject, $message]);
                    set_flash('success', 'Thank you! Your message has been sent successfully. Our nutrition support team will get back to you shortly.');
                    header('Location: ' . url('contact.php'));
                    exit;
                } catch (PDOException $e) {
                    $errors[] = 'Unable to save your inquiry. Please try again later.';
                }
            } else {
                $errors[] = 'Database service currently unavailable.';
            }
        }
    }
}

require_once __DIR__ . '/includes/header.php';
?>

<div class="bg-light py-5 border-bottom">
    <div class="container text-center">
        <h6 class="text-success text-uppercase fw-bold ls-1">We Are Here For You</h6>
        <h1 class="display-5 fw-bold text-dark mb-3">Get in Touch with Our Team</h1>
        <p class="lead text-secondary max-w-600 mx-auto">
            Have questions about customized dietary recommendations, meal nutrition data, or recipe submissions? Drop us a line.
        </p>
    </div>
</div>

<div class="container py-5">
    <div class="row g-5">
        <!-- Contact Form -->
        <div class="col-lg-7">
            <div class="card border-0 rounded-4 shadow-sm p-4 p-md-5 bg-white">
                <h3 class="fw-bold text-dark mb-4">Send Us a Message</h3>

                <?php if (!empty($errors)): ?>
                    <div class="alert alert-danger rounded-3 shadow-xs">
                        <ul class="mb-0 ps-3">
                            <?php foreach ($errors as $err): ?>
                                <li><?= e($err) ?></li>
                            <?php endforeach; ?>
                        </ul>
                    </div>
                <?php endif; ?>

                <form method="POST" action="<?= url('contact.php') ?>" class="needs-validation" novalidate>
                    <input type="hidden" name="csrf_token" value="<?= csrf_token() ?>">

                    <div class="row g-3 mb-3">
                        <div class="col-md-6">
                            <label class="form-label fw-semibold small text-secondary">Your Name <span class="text-danger">*</span></label>
                            <input type="text" name="name" class="form-control" placeholder="John Doe" value="<?= e($_POST['name'] ?? ($currentUser['name'] ?? '')) ?>" required>
                        </div>
                        <div class="col-md-6">
                            <label class="form-label fw-semibold small text-secondary">Email Address <span class="text-danger">*</span></label>
                            <input type="email" name="email" class="form-control" placeholder="john@example.com" value="<?= e($_POST['email'] ?? ($currentUser['email'] ?? '')) ?>" required>
                        </div>
                    </div>

                    <div class="mb-3">
                        <label class="form-label fw-semibold small text-secondary">Subject <span class="text-danger">*</span></label>
                        <input type="text" name="subject" class="form-control" placeholder="e.g. Question about allergen filtering" value="<?= e($_POST['subject'] ?? '') ?>" required>
                    </div>

                    <div class="mb-4">
                        <label class="form-label fw-semibold small text-secondary">Message <span class="text-danger">*</span></label>
                        <textarea name="message" class="form-control" rows="5" placeholder="How can our dietary engine or team assist you?" required><?= e($_POST['message'] ?? '') ?></textarea>
                    </div>

                    <button type="submit" class="btn btn-success btn-lg rounded-pill px-5 shadow-sm fw-bold">
                        <i class="fa-solid fa-paper-plane me-2"></i>Send Message
                    </button>
                </form>
            </div>
        </div>

        <!-- Contact Details & Info -->
        <div class="col-lg-5">
            <div class="card border-0 rounded-4 shadow-sm p-4 bg-white mb-4">
                <h5 class="fw-bold text-dark mb-3">Direct Contact Channels</h5>
                <div class="d-flex align-items-start gap-3 mb-3">
                    <div class="bg-success-subtle text-success rounded-circle p-2 fs-5">
                        <i class="fa-solid fa-envelope"></i>
                    </div>
                    <div>
                        <div class="fw-bold text-dark small">Email Support</div>
                        <a href="mailto:support@healthydiet.com" class="text-secondary text-decoration-none small">support@healthydiet.com</a>
                    </div>
                </div>
                <div class="d-flex align-items-start gap-3 mb-3">
                    <div class="bg-primary-subtle text-primary rounded-circle p-2 fs-5">
                        <i class="fa-solid fa-clock"></i>
                    </div>
                    <div>
                        <div class="fw-bold text-dark small">Response Time</div>
                        <div class="text-secondary small">Within 24 business hours</div>
                    </div>
                </div>
                <div class="d-flex align-items-start gap-3">
                    <div class="bg-warning-subtle text-warning-emphasis rounded-circle p-2 fs-5">
                        <i class="fa-solid fa-shield-heart"></i>
                    </div>
                    <div>
                        <div class="fw-bold text-dark small">Dietary Inquiries</div>
                        <div class="text-secondary small">Reviewed by our recipe curation team</div>
                    </div>
                </div>
            </div>

            <!-- FAQ Snapshot -->
            <div class="card border-0 rounded-4 shadow-sm p-4 bg-light">
                <h6 class="fw-bold text-dark mb-3">Frequently Asked Questions</h6>
                <div class="mb-3">
                    <div class="fw-semibold text-dark small">Is the health assessment completely free?</div>
                    <div class="text-secondary small">Yes! The BMI assessment, caloric calculation, and recipe recommendations are 100% free.</div>
                </div>
                <div>
                    <div class="fw-semibold text-dark small">Can I customize my food allergies?</div>
                    <div class="text-secondary small">Yes, you can specify peanuts, dairy, gluten, shellfish, eggs, and tree nuts in your profile.</div>
                </div>
            </div>
        </div>
    </div>
</div>

<?php require_once __DIR__ . '/includes/footer.php'; ?>
