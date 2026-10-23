<?php
/**
 * HealthyDiet — Body Weight & BMI Progress Tracking
 */

require_once __DIR__ . '/includes/auth.php';
require_once __DIR__ . '/includes/functions.php';

require_login();

$user = current_user();
$db = getDB();

$pageTitle = "Weight & BMI Progress Tracker";
$errors = [];

// Handle New Log Submission
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!verify_csrf()) {
        $errors[] = 'Security token expired. Please try again.';
    } else {
        $action = $_POST['action'] ?? 'add_log';

        if ($action === 'add_log') {
            $logDate = sanitize_string($_POST['log_date'] ?? date('Y-m-d'));
            $weightKg = (float)($_POST['weight_kg'] ?? 0);
            $notes = sanitize_string($_POST['notes'] ?? '');

            if ($weightKg < 25 || $weightKg > 350) {
                $errors[] = 'Please enter a realistic weight in kg (25-350 kg).';
            }
            if (empty($logDate)) {
                $errors[] = 'Please select a valid log date.';
            }

            if (empty($errors)) {
                $heightCm = (float)($user['height_cm'] ?: 170);
                $bmiInfo = calculate_bmi($weightKg, $heightCm);
                $bmi = $bmiInfo['bmi'];

                try {
                    $stmt = $db->prepare("
                        INSERT INTO progress_logs (user_id, log_date, weight_kg, bmi, notes)
                        VALUES (?, ?, ?, ?, ?)
                        ON DUPLICATE KEY UPDATE weight_kg = VALUES(weight_kg), bmi = VALUES(bmi), notes = VALUES(notes)
                    ");
                    $stmt->execute([$user['id'], $logDate, $weightKg, $bmi, $notes]);

                    // Also update user profile current weight and BMI if logged today or later
                    $upProfile = $db->prepare("
                        UPDATE user_profiles 
                        SET weight_kg = ?, calculated_bmi = ?, bmi_category = ?, updated_at = NOW()
                        WHERE user_id = ?
                    ");
                    $upProfile->execute([$weightKg, $bmi, $bmiInfo['category'], $user['id']]);

                    set_flash('success', 'Progress log recorded successfully!');
                    header('Location: ' . url('progress.php'));
                    exit;
                } catch (PDOException $e) {
                    $errors[] = 'Database error: ' . $e->getMessage();
                }
            }
        } elseif ($action === 'delete_log') {
            $logId = (int)($_POST['log_id'] ?? 0);
            if ($logId > 0) {
                $del = $db->prepare("DELETE FROM progress_logs WHERE id = ? AND user_id = ?");
                $del->execute([$logId, $user['id']]);
                set_flash('info', 'Progress record removed.');
                header('Location: ' . url('progress.php'));
                exit;
            }
        }
    }
}

// Fetch all progress logs ordered by date
$logsStmt = $db->prepare("SELECT * FROM progress_logs WHERE user_id = ? ORDER BY log_date ASC");
$logsStmt->execute([$user['id']]);
$logs = $logsStmt->fetchAll();

// Metrics
$firstLog = reset($logs);
$lastLog = end($logs);

$startWeight = $firstLog ? (float)$firstLog['weight_kg'] : (float)($user['weight_kg'] ?: 70);
$currentWeight = $lastLog ? (float)$lastLog['weight_kg'] : $startWeight;
$weightDiff = round($currentWeight - $startWeight, 1);
$currentBmi = $lastLog ? (float)$lastLog['bmi'] : (float)($user['calculated_bmi'] ?: 23.5);

$chartLabels = [];
$chartWeights = [];
$chartBmis = [];

foreach ($logs as $l) {
    $chartLabels[] = date('M j, Y', strtotime($l['log_date']));
    $chartWeights[] = (float)$l['weight_kg'];
    $chartBmis[] = (float)$l['bmi'];
}

if (empty($chartLabels)) {
    $chartLabels = [date('M j, Y')];
    $chartWeights = [$startWeight];
    $chartBmis = [$currentBmi];
}

require_once __DIR__ . '/includes/header.php';
?>

<div class="bg-light py-4 border-bottom">
    <div class="container">
        <div class="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
            <div>
                <h6 class="text-success text-uppercase fw-bold ls-1 mb-1">Metabolic Tracking</h6>
                <h1 class="h2 fw-bold text-dark mb-0">Weight & BMI Progress</h1>
                <p class="text-secondary small mb-0">Monitor your wellness transformation over time</p>
            </div>
            <button type="button" class="btn btn-success rounded-pill px-4 btn-sm fw-bold shadow-xs" data-bs-toggle="modal" data-bs-target="#addLogModal">
                <i class="fa-solid fa-plus me-1"></i>Record New Weight
            </button>
        </div>
    </div>
</div>

<div class="container py-4">
    <?php if (!empty($errors)): ?>
        <div class="alert alert-danger rounded-4 shadow-sm p-3 mb-4">
            <ul class="mb-0 ps-3">
                <?php foreach ($errors as $err): ?>
                    <li><?= e($err) ?></li>
                <?php endforeach; ?>
            </ul>
        </div>
    <?php endif; ?>

    <!-- Summary Metrics -->
    <div class="row g-3 mb-4">
        <div class="col-sm-6 col-md-3">
            <div class="stat-card">
                <span class="text-secondary small fw-semibold d-block">Starting Baseline</span>
                <div class="fs-3 fw-bold text-dark my-1"><?= $startWeight ?> <span class="fs-6 text-muted font-normal">kg</span></div>
                <span class="text-muted small"><?= $firstLog ? date('M j, Y', strtotime($firstLog['log_date'])) : 'Today' ?></span>
            </div>
        </div>

        <div class="col-sm-6 col-md-3">
            <div class="stat-card">
                <span class="text-secondary small fw-semibold d-block">Current Weight</span>
                <div class="fs-3 fw-bold text-dark my-1"><?= $currentWeight ?> <span class="fs-6 text-muted font-normal">kg</span></div>
                <span class="text-muted small"><?= $lastLog ? date('M j, Y', strtotime($lastLog['log_date'])) : 'Today' ?></span>
            </div>
        </div>

        <div class="col-sm-6 col-md-3">
            <div class="stat-card">
                <span class="text-secondary small fw-semibold d-block">Net Weight Change</span>
                <div class="fs-3 fw-bold my-1 <?= $weightDiff < 0 ? 'text-success' : ($weightDiff > 0 ? 'text-primary' : 'text-secondary') ?>">
                    <?= ($weightDiff > 0 ? '+' : '') . $weightDiff ?> <span class="fs-6 text-muted font-normal">kg</span>
                </div>
                <span class="text-muted small"><?= $weightDiff < 0 ? 'Healthy reduction' : ($weightDiff > 0 ? 'Mass increase' : 'Stable weight') ?></span>
            </div>
        </div>

        <div class="col-sm-6 col-md-3">
            <div class="stat-card">
                <span class="text-secondary small fw-semibold d-block">Current BMI</span>
                <div class="fs-3 fw-bold text-success my-1"><?= $currentBmi ?></div>
                <span class="badge bg-success-subtle text-success small"><?= e($user['bmi_category'] ?: 'Normal') ?></span>
            </div>
        </div>
    </div>

    <!-- Interactive Chart -->
    <div class="card border-0 rounded-4 shadow-sm p-4 p-md-5 bg-white mb-4">
        <div class="d-flex justify-content-between align-items-center mb-4">
            <div>
                <h5 class="fw-bold text-dark mb-0">Weight & BMI Progression Timeline</h5>
                <p class="text-secondary small mb-0">Visual representation of your weigh-in records</p>
            </div>
            <span class="badge bg-light text-secondary border">Interactive Line Chart</span>
        </div>

        <div style="height: 320px;">
            <canvas id="progressMainChart"></canvas>
        </div>
    </div>

    <!-- History Logs Table -->
    <div class="card border-0 rounded-4 shadow-sm p-4 bg-white mb-4">
        <div class="d-flex justify-content-between align-items-center mb-3">
            <h5 class="fw-bold text-dark mb-0">Progress Log History</h5>
            <span class="text-muted small"><?= count($logs) ?> entries recorded</span>
        </div>

        <div class="table-responsive">
            <table class="table align-middle">
                <thead class="table-light">
                    <tr>
                        <th>Date</th>
                        <th>Weight (kg)</th>
                        <th>Calculated BMI</th>
                        <th>Notes / Reflection</th>
                        <th class="text-end">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    <?php if (empty($logs)): ?>
                        <tr>
                            <td colspan="5" class="text-center py-4 text-muted">No weigh-ins logged yet. Click "Record New Weight" above to start!</td>
                        </tr>
                    <?php else: ?>
                        <?php foreach (array_reverse($logs) as $row): 
                            $bmiVal = (float)$row['bmi'];
                            $badge = $bmiVal < 18.5 ? 'info' : ($bmiVal < 25 ? 'success' : ($bmiVal < 30 ? 'warning' : 'danger'));
                        ?>
                            <tr>
                                <td class="fw-semibold text-dark"><?= date('M j, Y', strtotime($row['log_date'])) ?></td>
                                <td class="fw-bold text-dark"><?= $row['weight_kg'] ?> kg</td>
                                <td>
                                    <span class="badge bg-<?= $badge ?>-subtle text-<?= $badge ?> border border-<?= $badge ?>-subtle rounded-pill">
                                        <?= $row['bmi'] ?>
                                    </span>
                                </td>
                                <td class="text-secondary small"><?= e($row['notes'] ?: '—') ?></td>
                                <td class="text-end">
                                    <form method="POST" action="<?= url('progress.php') ?>" class="d-inline" onsubmit="return confirm('Delete this weigh-in entry?');">
                                        <input type="hidden" name="csrf_token" value="<?= csrf_token() ?>">
                                        <input type="hidden" name="action" value="delete_log">
                                        <input type="hidden" name="log_id" value="<?= $row['id'] ?>">
                                        <button type="submit" class="btn btn-outline-danger btn-sm rounded-circle" title="Delete entry">
                                            <i class="fa-solid fa-trash-can small"></i>
                                        </button>
                                    </form>
                                </td>
                            </tr>
                        <?php endforeach; ?>
                    <?php endif; ?>
                </tbody>
            </table>
        </div>
    </div>
</div>

<!-- Modal: Add New Progress Log -->
<div class="modal fade" id="addLogModal" tabindex="-1" aria-labelledby="addLogModalLabel" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content rounded-4 border-0 shadow-lg">
            <div class="modal-header border-0 pb-0">
                <h5 class="modal-title fw-bold" id="addLogModalLabel">Log Body Weight</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body p-4">
                <form method="POST" action="<?= url('progress.php') ?>">
                    <input type="hidden" name="csrf_token" value="<?= csrf_token() ?>">
                    <input type="hidden" name="action" value="add_log">

                    <div class="mb-3">
                        <label class="form-label fw-semibold small text-secondary">Log Date</label>
                        <input type="date" name="log_date" class="form-control" value="<?= date('Y-m-d') ?>" required>
                    </div>

                    <div class="mb-3">
                        <label class="form-label fw-semibold small text-secondary">Weight (kg)</label>
                        <div class="input-group">
                            <input type="number" name="weight_kg" class="form-control" value="<?= $currentWeight ?>" min="25" max="350" step="0.1" required>
                            <span class="input-group-text bg-light small">kg</span>
                        </div>
                    </div>

                    <div class="mb-4">
                        <label class="form-label fw-semibold small text-secondary">Notes / Comments (Optional)</label>
                        <input type="text" name="notes" class="form-control" placeholder="e.g. Feeling energetic after 2 weeks on plan">
                    </div>

                    <button type="submit" class="btn btn-success rounded-pill w-100 py-2 fw-bold">
                        Save Weigh-In Entry
                    </button>
                </form>
            </div>
        </div>
    </div>
</div>

<script>
document.addEventListener('DOMContentLoaded', () => {
    const ctx = document.getElementById('progressMainChart');
    if (ctx) {
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: <?= json_encode($chartLabels) ?>,
                datasets: [
                    {
                        label: 'Weight (kg)',
                        data: <?= json_encode($chartWeights) ?>,
                        borderColor: '#10b981',
                        backgroundColor: 'rgba(16, 185, 129, 0.12)',
                        borderWidth: 3,
                        fill: true,
                        tension: 0.35,
                        yAxisID: 'y'
                    },
                    {
                        label: 'BMI Score',
                        data: <?= json_encode($chartBmis) ?>,
                        borderColor: '#0ea5e9',
                        borderWidth: 2,
                        borderDash: [5, 5],
                        fill: false,
                        tension: 0.35,
                        yAxisID: 'y1'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                plugins: {
                    legend: { position: 'top' }
                },
                scales: {
                    x: { grid: { display: false } },
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        title: { display: true, text: 'Weight (kg)' }
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        grid: { drawOnChartArea: false },
                        title: { display: true, text: 'BMI' }
                    }
                }
            }
        });
    }
});
</script>

<?php require_once __DIR__ . '/includes/footer.php'; ?>
