<?php
/**
 * HealthyDiet — User Dashboard
 */

require_once __DIR__ . '/includes/auth.php';
require_once __DIR__ . '/includes/functions.php';

require_login();

$user = current_user();
$db = getDB();

$pageTitle = "My Nutrition Dashboard";

// 1. Fetch top personalized recommendations
$recommendations = get_personalized_recommendations($user['id'], 3);

// 2. Fetch today's meal plan
$dayOfWeek = date('l'); // e.g. Monday, Tuesday
$todayMeals = [
    'Breakfast' => null,
    'Lunch'     => null,
    'Dinner'    => null,
    'Snack'     => null
];

$planStmt = $db->prepare("
    SELECT mpi.meal_slot, m.*
    FROM meal_plan_items mpi
    JOIN meal_plans mp ON mpi.meal_plan_id = mp.id
    JOIN meals m ON mpi.meal_id = m.id
    WHERE mp.user_id = ? AND mp.is_active = 1 AND mpi.day_of_week = ?
");
$planStmt->execute([$user['id'], $dayOfWeek]);
$plannedItems = $planStmt->fetchAll();

$todayCaloriesTotal = 0;
$todayProteinTotal = 0;
foreach ($plannedItems as $item) {
    $todayMeals[$item['meal_slot']] = $item;
    $todayCaloriesTotal += $item['calories'];
    $todayProteinTotal += $item['protein'];
}

// 3. Fetch latest progress log
$latestProgress = $db->prepare("SELECT * FROM progress_logs WHERE user_id = ? ORDER BY log_date DESC LIMIT 7");
$latestProgress->execute([$user['id']]);
$progressHistory = array_reverse($latestProgress->fetchAll());

require_once __DIR__ . '/includes/header.php';
?>

<div class="py-4 bg-light">
    <div class="container">      <!-- Welcome Banner -->
        <div class="card border-0 rounded-4 p-4 p-md-5 mb-4 text-white shadow-sm" style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);">
            <div class="row align-items-center g-4">
                <div class="col-lg-8">
                    <div class="d-flex align-items-center gap-2 text-success fw-bold small mb-2">
                        <i class="fa-solid fa-circle-check"></i> Personalized Health Engine Active
                    </div>
                    <h2 class="fw-bold mb-2">Welcome Back, <?= e(explode(' ', $user['name'])[0]) ?>! 👋</h2>
                    <p class="text-light text-opacity-75 mb-3 lead" style="font-size: 1rem;">
                        Your personalized daily target is <strong><?= number_format($user['daily_calories_target'] ?: 2000) ?> kcal</strong>. 
                        Targeting <strong><?= ucwords(str_replace('_', ' ', $user['goal'] ?: 'Healthy Eating')) ?></strong> with <strong><?= ucwords(str_replace('_', ' ', $user['dietary_preference'] ?: 'Vegetarian')) ?></strong> nutrition.
                    </p>
                    <div class="d-flex flex-wrap gap-2">
                        <a href="<?= url('recommendations.php') ?>" class="btn btn-success rounded-pill px-4 btn-sm fw-semibold">
                            <i class="fa-solid fa-wand-magic-sparkles me-1"></i>View Today's Recommendations
                        </a>
                        <a href="<?= url('meal-plan.php') ?>" class="btn btn-outline-light rounded-pill px-4 btn-sm fw-semibold">
                            <i class="fa-solid fa-calendar-days me-1"></i>7-Day Meal Planner
                        </a>
                        <a href="<?= url('health-assessment.php') ?>" class="btn btn-dark border border-secondary rounded-pill px-3 btn-sm text-secondary">
                            <i class="fa-solid fa-sliders me-1"></i>Adjust Goals
                        </a>
                    </div>
                </div>
                <div class="col-lg-4 text-center text-lg-end">
                    <div class="d-inline-block bg-white bg-opacity-10 rounded-4 p-3 border border-white border-opacity-10 text-center" style="min-width: 180px;">
                        <span class="text-light text-opacity-75 small d-block">Current BMI Status</span>
                        <div class="display-6 fw-bold text-success my-1"><?= $user['calculated_bmi'] ?: '23.5' ?></div>
                        <span class="badge bg-success-subtle text-success border border-success-subtle rounded-pill">
                            <?= e($user['bmi_category'] ?: 'Normal') ?>
                        </span>
                    </div>
                </div>
            </div>
        </div>

        <!-- 4 Key Stat Cards -->
        <div class="row g-3 mb-4">
            <div class="col-sm-6 col-lg-3">
                <div class="stat-card">
                    <div class="d-flex align-items-center justify-content-between mb-2">
                        <span class="text-secondary small fw-semibold">Body Mass Index</span>
                        <div class="stat-icon bg-success-subtle text-success">
                            <i class="fa-solid fa-weight-scale"></i>
                        </div>
                    </div>
                    <div class="fs-3 fw-bold text-dark mb-1"><?= $user['calculated_bmi'] ?: '23.5' ?></div>
                    <span class="badge bg-success-subtle text-success small"><?= e($user['bmi_category'] ?: 'Normal Weight') ?></span>
                </div>
            </div>

            <div class="col-sm-6 col-lg-3">
                <div class="stat-card">
                    <div class="d-flex align-items-center justify-content-between mb-2">
                        <span class="text-secondary small fw-semibold">Daily Calorie Target</span>
                        <div class="stat-icon bg-danger-subtle text-danger">
                            <i class="fa-solid fa-fire"></i>
                        </div>
                    </div>
                    <div class="fs-3 fw-bold text-dark mb-1"><?= number_format($user['daily_calories_target'] ?: 2000) ?> <span class="fs-6 text-muted font-normal">kcal</span></div>
                    <span class="text-muted small">Mifflin-St Jeor TDEE</span>
                </div>
            </div>

            <div class="col-sm-6 col-lg-3">
                <div class="stat-card">
                    <div class="d-flex align-items-center justify-content-between mb-2">
                        <span class="text-secondary small fw-semibold">Primary Goal</span>
                        <div class="stat-icon bg-primary-subtle text-primary">
                            <i class="fa-solid fa-bullseye"></i>
                        </div>
                    </div>
                    <div class="fs-5 fw-bold text-dark mb-1 line-clamp-1"><?= ucwords(str_replace('_', ' ', $user['goal'] ?: 'Healthy Eating')) ?></div>
                    <span class="text-muted small"><?= ucwords(str_replace('_', ' ', $user['activity_level'] ?: 'Active')) ?></span>
                </div>
            </div>

            <div class="col-sm-6 col-lg-3">
                <div class="stat-card">
                    <div class="d-flex align-items-center justify-content-between mb-2">
                        <span class="text-secondary small fw-semibold">Dietary Lifestyle</span>
                        <div class="stat-icon bg-warning-subtle text-warning-emphasis">
                            <i class="fa-solid fa-leaf"></i>
                        </div>
                    </div>
                    <div class="fs-5 fw-bold text-dark mb-1"><?= ucwords(str_replace('_', ' ', $user['dietary_preference'] ?: 'Vegetarian')) ?></div>
                    <span class="badge bg-warning-subtle text-warning-emphasis small">
                        <?= !empty($user['allergies']) ? e(ucwords($user['allergies'])) . ' Free' : 'No Allergies' ?>
                    </span>
                </div>
            </div>
        </div>

        <!-- Today's Meal Plan & Progress Row -->
        <div class="row g-4 mb-4">
            <!-- Col 1: Today's Scheduled Meal Plan -->
            <div class="col-lg-7">
                <div class="card border-0 rounded-4 shadow-sm p-4 bg-white h-100">
                    <div class="d-flex justify-content-between align-items-center mb-3">
                        <div>
                            <span class="text-success text-uppercase fw-bold small">Day Schedule</span>
                            <h5 class="fw-bold text-dark mb-0">Today's Meals (<?= $dayOfWeek ?>)</h5>
                        </div>
                        <div class="text-end">
                            <span class="text-muted small">Logged Calories</span>
                            <div class="fw-bold text-success"><?= $todayCaloriesTotal ?> / <?= $user['daily_calories_target'] ?: 2000 ?> kcal</div>
                        </div>
                    </div>

                    <!-- Progress bar for today's calorie limit -->
                    <?php 
                        $target = $user['daily_calories_target'] ?: 2000;
                        $calPct = min(100, round(($todayCaloriesTotal / $target) * 100));
                    ?>
                    <div class="progress mb-4" style="height: 6px;">
                        <div class="progress-bar bg-success" role="progressbar" style="width: <?= $calPct ?>%;"></div>
                    </div>

                    <!-- 4 Slot Cards -->
                    <div class="d-flex flex-column gap-3">
                        <?php 
                        $slots = [
                            'Breakfast' => ['icon' => 'fa-mug-hot', 'color' => 'warning'],
                            'Lunch'     => ['icon' => 'fa-bowl-food', 'color' => 'primary'],
                            'Dinner'    => ['icon' => 'fa-utensils', 'color' => 'success'],
                            'Snack'     => ['icon' => 'fa-apple-whole', 'color' => 'danger']
                        ];

                        foreach ($slots as $slotName => $meta): 
                            $meal = $todayMeals[$slotName] ?? null;
                        ?>
                            <div class="p-3 rounded-3 border d-flex align-items-center justify-content-between <?= $meal ? 'bg-white' : 'bg-light' ?>">
                                <div class="d-flex align-items-center gap-3">
                                    <div class="bg-<?= $meta['color'] ?>-subtle text-<?= $meta['color'] ?> rounded-circle p-2 d-flex align-items-center justify-content-center" style="width: 40px; height: 40px;">
                                        <i class="fa-solid <?= $meta['icon'] ?>"></i>
                                    </div>
                                    <div>
                                        <div class="fw-bold text-dark small mb-0"><?= $slotName ?></div>
                                        <?php if ($meal): ?>
                                            <a href="<?= url('meal-details.php?id=' . $meal['id']) ?>" class="text-dark fw-semibold text-decoration-none small hover-primary">
                                                <?= e($meal['name']) ?>
                                            </a>
                                            <div class="text-muted small" style="font-size: 0.75rem;">
                                                <i class="fa-solid fa-fire text-danger me-1"></i><?= $meal['calories'] ?> kcal &bull; <?= $meal['protein'] ?>g P &bull; <?= $meal['carbs'] ?>g C
                                            </div>
                                        <?php else: ?>
                                            <span class="text-muted small italic">No meal scheduled yet</span>
                                        <?php endif; ?>
                                    </div>
                                </div>

                                <div>
                                    <a href="<?= url('meal-plan.php?day=' . $dayOfWeek . '&slot=' . $slotName) ?>" class="btn btn-sm btn-outline-secondary rounded-pill px-3">
                                        <?= $meal ? 'Change' : '+ Add' ?>
                                    </a>
                                </div>
                            </div>
                        <?php endforeach; ?>
                    </div>

                    <div class="mt-4 pt-2 text-center">
                        <a href="<?= url('meal-plan.php') ?>" class="btn btn-light rounded-pill w-100 border fw-semibold small">
                            Open Full 7-Day Interactive Meal Calendar &rarr;
                        </a>
                    </div>
                </div>
            </div>

            <!-- Col 2: Progress Mini Chart & Quick Log -->
            <div class="col-lg-5">
                <div class="card border-0 rounded-4 shadow-sm p-4 bg-white h-100 d-flex flex-column">
                    <div class="d-flex justify-content-between align-items-center mb-3">
                        <div>
                            <span class="text-success text-uppercase fw-bold small">Tracking</span>
                            <h5 class="fw-bold text-dark mb-0">Weight & BMI Trend</h5>
                        </div>
                        <a href="<?= url('progress.php') ?>" class="text-success small fw-semibold text-decoration-none">Full History &rarr;</a>
                    </div>

                    <div class="flex-grow-1" style="min-height: 220px;">
                        <canvas id="dashboardProgressChart"></canvas>
                    </div>

                    <div class="mt-3 pt-3 border-top d-flex justify-content-between align-items-center">
                        <div>
                            <span class="text-muted small d-block">Current Weight</span>
                            <span class="fw-bold text-dark fs-5"><?= $user['weight_kg'] ?: 70 ?> kg</span>
                        </div>
                        <a href="<?= url('progress.php?action=log') ?>" class="btn btn-success btn-sm rounded-pill px-3">
                            <i class="fa-solid fa-plus me-1"></i>Log Weight
                        </a>
                    </div>
                </div>
            </div>
        </div>

        <!-- Top Personalized Recommendations Carousel / Grid -->
        <div class="card border-0 rounded-4 shadow-sm p-4 bg-white mb-4">
            <div class="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <span class="text-success text-uppercase fw-bold small">Smart Engine</span>
                    <h4 class="fw-bold text-dark mb-0">Top Recommended Meals For You</h4>
                </div>
                <a href="<?= url('recommendations.php') ?>" class="btn btn-outline-success btn-sm rounded-pill px-3 fw-semibold">
                    View All Personalized Recommendations &rarr;
                </a>
            </div>

            <div class="row g-4">
                <?php foreach ($recommendations as $meal): 
                    $dietClass = 'badge-dietary-' . strtolower(str_replace(' ', '-', $meal['dietary_type']));
                ?>
                    <div class="col-md-4">
                        <div class="meal-card shadow-sm h-100">
                            <div class="meal-img-wrapper">
                                <img src="<?= meal_image_url($meal['image'] ?? null) ?>" alt="<?= e($meal['name']) ?>" class="meal-img" onerror="this.onerror=null;this.src='<?= asset('images/meals/default-meal.jpg') ?>';">
                                <span class="badge <?= $dietClass ?> position-absolute top-0 start-0 m-3 px-3 py-1 rounded-pill fw-semibold">
                                    <?= e($meal['dietary_type']) ?>
                                </span>
                                <button class="meal-fav-btn <?= is_meal_favorited($user['id'], $meal['id']) ? 'active' : '' ?>" data-meal-id="<?= $meal['id'] ?>" title="Save Favorite">
                                    <i class="<?= is_meal_favorited($user['id'], $meal['id']) ? 'fa-solid text-danger' : 'fa-regular' ?> fa-heart"></i>
                                </button>
                            </div>
                            <div class="p-4 d-flex flex-column flex-grow-1">
                                <div class="d-flex align-items-center justify-content-between mb-2">
                                    <span class="badge bg-light text-secondary border small">
                                        <i class="fa-regular fa-clock me-1"></i><?= $meal['prep_time_minutes'] ?> mins
                                    </span>
                                    <span class="fw-bold text-success">
                                        <i class="fa-solid fa-fire text-danger me-1"></i><?= $meal['calories'] ?> kcal
                                    </span>
                                </div>

                                <h6 class="fw-bold text-dark mb-2">
                                    <a href="<?= url('meal-details.php?id=' . $meal['id']) ?>" class="text-dark text-decoration-none hover-primary">
                                        <?= e($meal['name']) ?>
                                    </a>
                                </h6>

                                <!-- Why Recommended Badges -->
                                <?php if (!empty($meal['match_reasons'])): ?>
                                    <div class="d-flex flex-wrap gap-1 mb-3">
                                        <?php foreach (array_slice($meal['match_reasons'], 0, 2) as $reason): ?>
                                            <span class="match-badge" style="font-size: 0.7rem;">
                                                <?= e($reason) ?>
                                            </span>
                                        <?php endforeach; ?>
                                    </div>
                                <?php endif; ?>

                                <a href="<?= url('meal-details.php?id=' . $meal['id']) ?>" class="btn btn-outline-success btn-sm rounded-pill w-100 mt-auto fw-semibold">
                                    View Recipe &rarr;
                                </a>
                            </div>
                        </div>
                    </div>
                <?php endforeach; ?>
            </div>
        </div>
    </div>
</div>

<!-- Render Mini Progress Chart in Dashboard -->
<script>
document.addEventListener('DOMContentLoaded', () => {
    const ctx = document.getElementById('dashboardProgressChart');
    if (ctx) {
        <?php
            $chartLabels = [];
            $chartWeights = [];
            foreach ($progressHistory as $p) {
                $chartLabels[] = date('M j', strtotime($p['log_date']));
                $chartWeights[] = (float)$p['weight_kg'];
            }
            if (empty($chartLabels)) {
                $chartLabels = ['Start', 'Current'];
                $chartWeights = [(float)($user['weight_kg'] ?: 70), (float)($user['weight_kg'] ?: 70)];
            }
        ?>
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: <?= json_encode($chartLabels) ?>,
                datasets: [{
                    label: 'Weight (kg)',
                    data: <?= json_encode($chartWeights) ?>,
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.35,
                    pointRadius: 4,
                    pointBackgroundColor: '#10b981'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { grid: { display: false } },
                    y: { grid: { color: '#f1f5f9' } }
                }
            }
        });
    }
});
</script>

<?php require_once __DIR__ . '/includes/footer.php'; ?>
