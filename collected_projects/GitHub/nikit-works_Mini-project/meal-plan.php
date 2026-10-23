<?php
/**
 * HealthyDiet — 7-Day Interactive Meal Planner & Calorie Tracker
 */

require_once __DIR__ . '/includes/auth.php';
require_once __DIR__ . '/includes/functions.php';

require_login();

$user = current_user();
$db = getDB();

$pageTitle = "7-Day Interactive Meal Planner";

// 1. Get or create active meal plan for this user
$planStmt = $db->prepare("SELECT * FROM meal_plans WHERE user_id = ? AND is_active = 1 LIMIT 1");
$planStmt->execute([$user['id']]);
$plan = $planStmt->fetch();

if (!$plan) {
    $ins = $db->prepare("INSERT INTO meal_plans (user_id, plan_name, is_active) VALUES (?, 'My 7-Day Nutrition Plan', 1)");
    $ins->execute([$user['id']]);
    $planId = (int)$db->lastInsertId();
    $plan = ['id' => $planId, 'user_id' => $user['id'], 'plan_name' => 'My 7-Day Nutrition Plan'];
} else {
    $planId = (int)$plan['id'];
}

// 2. Fetch all scheduled items for this plan
$itemsStmt = $db->prepare("
    SELECT mpi.id as plan_item_id, mpi.day_of_week, mpi.meal_slot, m.*, c.name as category_name
    FROM meal_plan_items mpi
    JOIN meals m ON mpi.meal_id = m.id
    JOIN meal_categories c ON m.category_id = c.id
    WHERE mpi.meal_plan_id = ?
    ORDER BY FIELD(mpi.day_of_week, 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'),
             FIELD(mpi.meal_slot, 'Breakfast', 'Lunch', 'Dinner', 'Snack')
");
$itemsStmt->execute([$planId]);
$allItems = $itemsStmt->fetchAll();

// Group by day and slot
$days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
$slots = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];

$weeklySchedule = [];
$dailyTotals = [];
$weeklyTotalCalories = 0;
$totalMealsScheduled = count($allItems);

foreach ($days as $d) {
    $weeklySchedule[$d] = [
        'Breakfast' => null,
        'Lunch'     => null,
        'Dinner'    => null,
        'Snack'     => null
    ];
    $dailyTotals[$d] = [
        'calories' => 0,
        'protein'  => 0,
        'carbs'    => 0,
        'fat'      => 0
    ];
}

foreach ($allItems as $item) {
    $d = $item['day_of_week'];
    $s = $item['meal_slot'];
    if (isset($weeklySchedule[$d][$s])) {
        $weeklySchedule[$d][$s] = $item;
        $dailyTotals[$d]['calories'] += $item['calories'];
        $dailyTotals[$d]['protein']  += $item['protein'];
        $dailyTotals[$d]['carbs']    += $item['carbs'];
        $dailyTotals[$d]['fat']      += $item['fat'];
        $weeklyTotalCalories         += $item['calories'];
    }
}

// Active Day Tab selection
$activeDay = sanitize_string($_GET['day'] ?? date('l'));
if (!in_array($activeDay, $days)) {
    $activeDay = 'Monday';
}

// Fetch all available meals for the quick selection modal
$availableMeals = $db->query("SELECT id, name, meal_type, dietary_type, calories, protein, carbs, fat, image FROM meals ORDER BY calories ASC")->fetchAll();

require_once __DIR__ . '/includes/header.php';
?>

<div class="bg-light py-4 border-bottom">
    <div class="container">
        <div class="d-flex flex-column flex-lg-row justify-content-between align-items-lg-center gap-3">
            <div>
                <div class="d-flex align-items-center gap-2 mb-1">
                    <span class="badge bg-primary rounded-pill px-3 py-1">
                        <i class="fa-solid fa-calendar-check me-1"></i> Weekly Planner
                    </span>
                    <span class="text-secondary small">Daily Target: <?= number_format($user['daily_calories_target'] ?: 2000) ?> kcal</span>
                </div>
                <h2 class="fw-bold text-dark mb-0"><?= e($plan['plan_name']) ?></h2>
            </div>

            <div class="d-flex flex-wrap gap-2">
                <!-- Auto-Generate Button -->
                <button type="button" class="btn btn-success btn-sm rounded-pill px-3 fw-bold shadow-xs" id="btnAutoGeneratePlan">
                    <i class="fa-solid fa-wand-magic-sparkles me-1"></i>Auto-Generate 7-Day Plan
                </button>
                <button type="button" class="btn btn-outline-danger btn-sm rounded-pill px-3" id="btnClearPlan">
                    <i class="fa-solid fa-trash me-1"></i>Clear Week
                </button>
            </div>
        </div>
    </div>
</div>

<div class="container py-4">
    <!-- Summary Header Cards -->
    <div class="row g-3 mb-4">
        <div class="col-sm-6 col-md-3">
            <div class="stat-card">
                <span class="text-secondary small fw-semibold d-block">Scheduled Meals</span>
                <div class="fs-3 fw-bold text-dark my-1"><?= $totalMealsScheduled ?> <span class="fs-6 text-muted font-normal">/ 28 slots</span></div>
                <div class="progress" style="height: 6px;">
                    <div class="progress-bar bg-primary" style="width: <?= min(100, round(($totalMealsScheduled / 28) * 100)) ?>%;"></div>
                </div>
            </div>
        </div>
        <div class="col-sm-6 col-md-3">
            <div class="stat-card">
                <span class="text-secondary small fw-semibold d-block">Weekly Calories</span>
                <div class="fs-3 fw-bold text-success my-1"><?= number_format($weeklyTotalCalories) ?> <span class="fs-6 text-muted font-normal">kcal</span></div>
                <span class="text-muted small">Total energy across week</span>
            </div>
        </div>
        <div class="col-sm-6 col-md-3">
            <div class="stat-card">
                <span class="text-secondary small fw-semibold d-block">Daily Average</span>
                <div class="fs-3 fw-bold text-dark my-1"><?= number_format(round($weeklyTotalCalories / 7)) ?> <span class="fs-6 text-muted font-normal">kcal/day</span></div>
                <span class="text-muted small">Target: <?= number_format($user['daily_calories_target'] ?: 2000) ?> kcal</span>
            </div>
        </div>
        <div class="col-sm-6 col-md-3">
            <div class="stat-card">
                <span class="text-secondary small fw-semibold d-block">Primary Goal</span>
                <div class="fs-5 fw-bold text-dark my-1 line-clamp-1"><?= ucwords(str_replace('_', ' ', $user['goal'] ?: 'Healthy Eating')) ?></div>
                <span class="badge bg-success-subtle text-success small"><?= ucwords(str_replace('_', ' ', $user['dietary_preference'] ?: 'Vegetarian')) ?></span>
            </div>
        </div>
    </div>

    <!-- Day Selector Tabs -->
    <ul class="nav nav-pills nav-fill gap-2 p-1 bg-white rounded-4 shadow-sm border mb-4" id="dayPills" role="tablist">
        <?php foreach ($days as $d): 
            $dayCal = $dailyTotals[$d]['calories'];
            $isToday = (date('l') === $d);
        ?>
            <li class="nav-item" role="presentation">
                <a class="nav-link rounded-pill py-2 <?= $activeDay === $d ? 'active fw-bold' : 'text-secondary' ?>" href="?day=<?= $d ?>">
                    <div><?= substr($d, 0, 3) ?> <?= $isToday ? '<span class="badge bg-danger rounded-circle p-1" style="width:6px; height:6px; display:inline-block;" title="Today"></span>' : '' ?></div>
                    <div class="small fw-semibold" style="font-size: 0.72rem;"><?= $dayCal ?> kcal</div>
                </a>
            </li>
        <?php endforeach; ?>
    </ul>

    <!-- Active Day Schedule Content -->
    <div class="card border-0 rounded-4 shadow-sm p-4 p-md-5 bg-white mb-5">
        <div class="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4 pb-3 border-bottom">
            <div>
                <span class="text-success text-uppercase fw-bold small">Schedule Overview</span>
                <h3 class="fw-bold text-dark mb-0"><?= $activeDay ?>'s Nutrition Plan</h3>
            </div>
            <div class="d-flex align-items-center gap-4">
                <div class="text-end">
                    <span class="text-muted small">Total Day Energy</span>
                    <div class="fs-4 fw-extrabold <?= $dailyTotals[$activeDay]['calories'] > ($user['daily_calories_target'] ?: 2000) * 1.1 ? 'text-danger' : 'text-success' ?>">
                        <?= $dailyTotals[$activeDay]['calories'] ?> <span class="fs-6 font-normal">/ <?= $user['daily_calories_target'] ?: 2000 ?> kcal</span>
                    </div>
                </div>
                <div class="d-none d-sm-block text-end ps-3 border-start">
                    <span class="text-muted small">Day Macros</span>
                    <div class="small fw-bold text-dark">
                        <span class="text-primary"><?= $dailyTotals[$activeDay]['protein'] ?>g P</span> &bull; 
                        <span class="text-warning"><?= $dailyTotals[$activeDay]['carbs'] ?>g C</span> &bull; 
                        <span class="text-danger"><?= $dailyTotals[$activeDay]['fat'] ?>g F</span>
                    </div>
                </div>
            </div>
        </div>

        <!-- 4 Meal Slots for Active Day -->
        <div class="row g-4">
            <?php
            $slotIcons = [
                'Breakfast' => ['icon' => 'fa-mug-hot', 'color' => 'warning', 'desc' => 'Morning metabolic kickstart'],
                'Lunch'     => ['icon' => 'fa-bowl-food', 'color' => 'primary', 'desc' => 'Sustained midday fuel'],
                'Dinner'    => ['icon' => 'fa-utensils', 'color' => 'success', 'desc' => 'Light restorative evening nutrition'],
                'Snack'     => ['icon' => 'fa-apple-whole', 'color' => 'danger', 'desc' => 'Healthy hunger management']
            ];

            foreach ($slots as $slotName):
                $slotMeta = $slotIcons[$slotName];
                $scheduledMeal = $weeklySchedule[$activeDay][$slotName];
            ?>
                <div class="col-md-6 col-lg-3">
                    <div class="card h-100 rounded-4 border <?= $scheduledMeal ? 'border-success-subtle bg-white' : 'border-dashed bg-light' ?> p-3 d-flex flex-column shadow-xs">
                        <div class="d-flex align-items-center justify-content-between mb-3">
                            <div class="d-flex align-items-center gap-2">
                                <div class="bg-<?= $slotMeta['color'] ?>-subtle text-<?= $slotMeta['color'] ?> rounded-circle p-2 d-flex align-items-center justify-content-center" style="width: 34px; height: 34px;">
                                    <i class="fa-solid <?= $slotMeta['icon'] ?> small"></i>
                                </div>
                                <span class="fw-bold text-dark"><?= $slotName ?></span>
                            </div>
                            <?php if ($scheduledMeal): ?>
                                <span class="badge bg-success-subtle text-success small fw-bold">
                                    <?= $scheduledMeal['calories'] ?> kcal
                                </span>
                            <?php endif; ?>
                        </div>

                        <?php if ($scheduledMeal): ?>
                            <!-- Filled Slot Card -->
                            <div class="mb-3 position-relative rounded-3 overflow-hidden" style="height: 130px;">
                                <img src="<?= meal_image_url($scheduledMeal['image'] ?? null) ?>" alt="<?= e($scheduledMeal['name']) ?>" class="w-100 h-100 object-fit-cover" onerror="this.onerror=null;this.src='<?= asset('images/meals/default-meal.jpg') ?>';">
                                <span class="badge badge-dietary-<?= strtolower(str_replace(' ', '-', $scheduledMeal['dietary_type'])) ?> position-absolute top-0 start-0 m-2 rounded-pill small" style="font-size: 0.65rem;">
                                    <?= e($scheduledMeal['dietary_type']) ?>
                                </span>
                            </div>

                            <h6 class="fw-bold text-dark mb-1 line-clamp-1">
                                <a href="<?= url('meal-details.php?id=' . $scheduledMeal['id']) ?>" class="text-dark text-decoration-none hover-primary">
                                    <?= e($scheduledMeal['name']) ?>
                                </a>
                            </h6>

                            <div class="d-flex justify-content-between text-muted small mb-3" style="font-size: 0.75rem;">
                                <span><i class="fa-solid fa-dumbbell text-primary me-1"></i><?= $scheduledMeal['protein'] ?>g</span>
                                <span><i class="fa-solid fa-wheat-awn text-warning me-1"></i><?= $scheduledMeal['carbs'] ?>g</span>
                                <span><i class="fa-solid fa-droplet text-danger me-1"></i><?= $scheduledMeal['fat'] ?>g</span>
                            </div>

                            <div class="d-flex gap-2 mt-auto">
                                <button type="button" class="btn btn-outline-secondary btn-sm rounded-pill flex-grow-1 btn-open-meal-select" data-day="<?= $activeDay ?>" data-slot="<?= $slotName ?>">
                                    Change
                                </button>
                                <button type="button" class="btn btn-outline-danger btn-sm rounded-circle btn-remove-item" data-item-id="<?= $scheduledMeal['plan_item_id'] ?>" title="Remove">
                                    <i class="fa-solid fa-trash-can small"></i>
                                </button>
                            </div>
                        <?php else: ?>
                            <!-- Empty Slot Card -->
                            <div class="d-flex flex-column align-items-center justify-content-center flex-grow-1 text-center py-4">
                                <div class="rounded-circle bg-light text-muted p-3 mb-2 border border-secondary border-opacity-25">
                                    <i class="fa-solid fa-plus fs-5"></i>
                                </div>
                                <span class="text-secondary small fw-medium mb-1"><?= $slotMeta['desc'] ?></span>
                                <button type="button" class="btn btn-success btn-sm rounded-pill px-4 mt-2 fw-semibold btn-open-meal-select" data-day="<?= $activeDay ?>" data-slot="<?= $slotName ?>">
                                    + Add <?= $slotName ?>
                                </button>
                            </div>
                        <?php endif; ?>
                    </div>
                </div>
            <?php endforeach; ?>
        </div>
    </div>
</div>

<!-- Modal: Select Meal to Add into Slot -->
<div class="modal fade" id="selectMealModal" tabindex="-1" aria-labelledby="selectMealModalLabel" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered modal-lg">
        <div class="modal-content rounded-4 border-0 shadow-lg">
            <div class="modal-header border-0 pb-0">
                <div>
                    <h5 class="modal-title fw-bold" id="selectMealModalLabel">Add Meal to Schedule</h5>
                    <p class="text-secondary small mb-0" id="selectModalSub">Selecting for Monday &bull; Breakfast</p>
                </div>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body p-4">
                <input type="text" id="modalMealFilter" class="form-control rounded-pill mb-3" placeholder="Filter recipes by name or ingredient...">
                
                <div class="row g-3" id="modalMealList" style="max-height: 420px; overflow-y: auto;">
                    <?php foreach ($availableMeals as $m): ?>
                        <div class="col-md-6 modal-meal-card" data-name="<?= strtolower(e($m['name'])) ?>">
                            <div class="d-flex align-items-center justify-content-between p-2 rounded-3 border bg-white hover-shadow transition">
                                <div class="d-flex align-items-center gap-2">
                                    <img src="<?= meal_image_url($m['image'] ?? null) ?>" alt="" class="rounded-2 object-fit-cover" style="width: 50px; height: 50px;" onerror="this.onerror=null;this.src='<?= asset('images/meals/default-meal.jpg') ?>';">
                                    <div>
                                        <div class="fw-bold small text-dark line-clamp-1"><?= e($m['name']) ?></div>
                                        <div class="text-muted small" style="font-size: 0.72rem;">
                                            <span class="text-success fw-bold"><?= $m['calories'] ?> kcal</span> &bull; <?= $m['protein'] ?>g P &bull; <?= e($m['dietary_type']) ?>
                                        </div>
                                    </div>
                                </div>
                                <button type="button" class="btn btn-sm btn-outline-success rounded-pill px-3 btn-select-this-meal" data-meal-id="<?= $m['id'] ?>">
                                    Select
                                </button>
                            </div>
                        </div>
                    <?php endforeach; ?>
                </div>
            </div>
        </div>
    </div>
</div>

<script>
document.addEventListener('DOMContentLoaded', () => {
    let currentSelectDay = '<?= $activeDay ?>';
    let currentSelectSlot = 'Breakfast';

    const selectModal = new bootstrap.Modal(document.getElementById('selectMealModal'));
    const modalSub = document.getElementById('selectModalSub');
    const mealFilter = document.getElementById('modalMealFilter');

    // 1. Open Meal Selector
    document.querySelectorAll('.btn-open-meal-select').forEach(btn => {
        btn.addEventListener('click', () => {
            currentSelectDay = btn.dataset.day;
            currentSelectSlot = btn.dataset.slot;
            modalSub.textContent = `Scheduling for ${currentSelectDay} • ${currentSelectSlot}`;
            selectModal.show();
        });
    });

    // 2. Filter in modal
    if (mealFilter) {
        mealFilter.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase().trim();
            document.querySelectorAll('.modal-meal-card').forEach(card => {
                const name = card.dataset.name;
                card.style.display = name.includes(query) ? 'block' : 'none';
            });
        });
    }

    // 3. Select meal action
    document.querySelectorAll('.btn-select-this-meal').forEach(btn => {
        btn.addEventListener('click', async () => {
            const mealId = btn.dataset.mealId;
            const formData = new FormData();
            formData.append('action', 'add_meal');
            formData.append('meal_id', mealId);
            formData.append('day_of_week', currentSelectDay);
            formData.append('meal_slot', currentSelectSlot);
            formData.append('csrf_token', APP_CONFIG.csrfToken);

            try {
                const res = await fetch(APP_CONFIG.baseUrl + '/api/meal-plan.php', {
                    method: 'POST',
                    body: formData
                });
                const data = await res.json();
                if (data.success) {
                    window.location.href = `?day=${currentSelectDay}`;
                } else {
                    showToast(data.message || 'Failed to assign meal', 'error');
                }
            } catch (err) {
                showToast('Network error while updating schedule', 'error');
            }
        });
    });

    // 4. Remove Item
    document.querySelectorAll('.btn-remove-item').forEach(btn => {
        btn.addEventListener('click', async () => {
            if (!confirm('Remove this dish from your schedule?')) return;
            const itemId = btn.dataset.itemId;
            const formData = new FormData();
            formData.append('action', 'remove_item');
            formData.append('item_id', itemId);
            formData.append('csrf_token', APP_CONFIG.csrfToken);

            try {
                const res = await fetch(APP_CONFIG.baseUrl + '/api/meal-plan.php', {
                    method: 'POST',
                    body: formData
                });
                const data = await res.json();
                if (data.success) {
                    window.location.reload();
                } else {
                    showToast(data.message || 'Failed to remove', 'error');
                }
            } catch (err) {
                showToast('Error removing item', 'error');
            }
        });
    });

    // 5. Auto Generate 7-Day Plan
    const btnAuto = document.getElementById('btnAutoGeneratePlan');
    if (btnAuto) {
        btnAuto.addEventListener('click', async () => {
            if (!confirm('Auto-generate a full 7-day plan matching your personalized caloric target and dietary lifestyle? Existing items will be balanced.')) return;
            
            btnAuto.disabled = true;
            btnAuto.innerHTML = '<i class="fa-solid fa-spinner fa-spin me-1"></i> Generating...';

            const formData = new FormData();
            formData.append('action', 'auto_generate');
            formData.append('csrf_token', APP_CONFIG.csrfToken);

            try {
                const res = await fetch(APP_CONFIG.baseUrl + '/api/meal-plan.php', {
                    method: 'POST',
                    body: formData
                });
                const data = await res.json();
                if (data.success) {
                    showToast('7-Day Meal Plan generated successfully!', 'success');
                    setTimeout(() => window.location.reload(), 800);
                } else {
                    showToast(data.message || 'Failed to generate plan', 'error');
                    btnAuto.disabled = false;
                    btnAuto.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles me-1"></i> Auto-Generate 7-Day Plan';
                }
            } catch (err) {
                showToast('Error generating plan', 'error');
                btnAuto.disabled = false;
            }
        });
    }

    // 6. Clear Week
    const btnClear = document.getElementById('btnClearPlan');
    if (btnClear) {
        btnClear.addEventListener('click', async () => {
            if (!confirm('Are you sure you want to clear all 7 days of this meal plan?')) return;
            const formData = new FormData();
            formData.append('action', 'clear_plan');
            formData.append('csrf_token', APP_CONFIG.csrfToken);

            try {
                const res = await fetch(APP_CONFIG.baseUrl + '/api/meal-plan.php', {
                    method: 'POST',
                    body: formData
                });
                const data = await res.json();
                if (data.success) {
                    window.location.reload();
                }
            } catch (err) {
                showToast('Error clearing plan', 'error');
            }
        });
    }
});
</script>

<?php require_once __DIR__ . '/includes/footer.php'; ?>
