<?php
/**
 * HealthyDiet — Secure Logout
 */

require_once __DIR__ . '/config/config.php';

// Unset all session values
$_SESSION = [];

// Destroy session cookie if set
if (ini_get("session.use_cookies")) {
    $params = session_get_cookie_params();
    setcookie(
        session_name(),
        '',
        time() - 42000,
        $params["path"],
        $params["domain"],
        $params["secure"],
        $params["httponly"]
    );
}

// Destroy session
session_destroy();

// Start a fresh session for the flash goodbye message
session_start();
set_flash('info', 'You have been securely signed out. Have a healthy day!');

header('Location: ' . url('login.php'));
exit;
