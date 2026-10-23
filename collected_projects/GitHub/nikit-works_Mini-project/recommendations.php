<?php
/**
 * HealthyDiet — Personalized Diet Recommendations Engine
 */

require_once __DIR__ . '/includes/auth.php';
require_once __DIR__ . '/includes/functions.php';

require_login();

$user = current_user();
$db = getDB();

$pageTitle = "Personalized Diet Recommendations";

// Read filter parameters
$categoryId = !empty($_GET['category']) ? (int)$_GET['category'] : null;
$mealType = !empty($_GET['meal_type']) ? sanitize_string($_GET['meal_type']) : null;
$maxCalories = !empty($_GET['max_calories']) ? (int)$_GET['max_calories'] : null;

// Fetch recommended meals from scoring algorithm
$recommendations = get_personalized_recommendations($user['id'], 24, $categoryId, $mealType, $maxCalories);

// Fetch categories for filter dropdown
$categories = $db->query("SELECT * FROM meal_categories ORDER BY name ASC")->fetchAll();

require_once __DIR__ . '/includes/header.php';
?>

<div class="bg-light py-4 border-bottom">
    <div class="container">
        <div class="d-flex flex-column flex-lg-row justify-content-between align-items-lg-center gap-3">
            <div>
                <div class="d-flex align-items-center gap-2 mb-1">
                    <span class="badge bg-success rounded-pill px-3 py-1">
                        <i class="fa-solid fa-wand-magic-sparkles me-1"></i> Personalized Engine Active
                    </span>
                    <span class="text-secondary small">Matched to your Health Assessment</span>
                </div>
                <h2 class="fw-bold text-dark mb-1">Your Personalized Diet Recommendations</h2>
                <div class="text-secondary small d-flex flex-wrap align-items-center gap-2">
                    <span><strong>Daily Target:</strong> <?= number_format($user['daily_calories_target'] ?: 2000) ?> kcal</span>
                    <span>&bull;</span>
                    <span><strong>Goal:</strong> <?= ucwords(str_replace('_', ' ', $user['goal'] ?: 'Healthy Eating')) ?></span>
                    <span>&bull;</span>
                    <span><strong>Diet:</strong> <?= ucwords(str_replace('_', ' ', $user['dietary_preference'] ?: 'Vegetarian')) ?></span>
                    <?php if (!empty($user['allergies'])): ?>
                        <span>&bull;</span>
                        <span class="text-danger"><strong>Excluded:</strong> <?= e(ucwords($user['allergies'])) ?></span>
                    <?php endif; ?>
                </div>
            </div>

            <div>
                <a href="<?= url('health-assessment.php') ?>" class="btn btn-outline-dark btn-sm rounded-pill px-3">
                    <i class="fa-solid fa-sliders me-1"></i>Edit Health Profile
                </a>
            </div>
        </div>
    </div>
</div>

<div class="container py-4">
    <!-- Filter Control Bar -->
    <div class="card border-0 rounded-4 shadow-sm p-3 bg-white mb-4">
        <form method="GET" action="<?= url('recommendations.php') ?>" class="row g-3 align-items-center">
            <!-- Meal Slot Filters -->
            <div class="col-md-4">
                <label class="form-label small fw-semibold text-secondary mb-1">Meal Time Slot</label>
                <select name="meal_type" class="form-select form-select-sm" onchange="this.form.submit()">
                    <option value="">All Meal Slots (Breakfast, Lunch, Dinner, Snacks)</option>
                    <option value="Breakfast" <?= $mealType === 'Breakfast' ? 'selected' : '' ?>>Breakfast Energizers</option>
                    <option value="Lunch" <?= $mealType === 'Lunch' ? 'selected' : '' ?>>Power Lunches</option>
                    <option value="Dinner" <?= $mealType === 'Dinner' ? 'selected' : '' ?>>Nourishing Dinners</option>
                    <option value="Snacks" <?= $mealType === 'Snacks' ? 'selected' : '' ?>>Smart Snacks</option>
                    <option value="Smoothies" <?= $mealType === 'Smoothies' ? 'selected' : '' ?>>Superfood Smoothies</option>
                </select>
            </div>

            <!-- Category Filter -->
            <div class="col-md-4">
                <label class="form-label small fw-semibold text-secondary mb-1">Category</label>
                <select name="category" class="form-select form-select-sm" onchange="this.form.submit()">
                    <option value="">All Meal Categories</option>
                    <?php foreach ($categories as $cat): ?>
                        <option value="<?= $cat['id'] ?>" <?= $categoryId == $cat['id'] ? 'selected' : '' ?>><?= e($cat['name']) ?></option>
                    <?php endforeach; ?>
                </select>
            </div>

            <!-- Calorie Limit Filter -->
            <div class="col-md-3">
                <label class="form-label small fw-semibold text-secondary mb-1">Max Calories per Serving</label>
                <select name="max_calories" class="form-select form-select-sm" onchange="this.form.submit()">
                    <option value="">Any Calorie Level</option>
                    <option value="300" <?= $maxCalories === 300 ? 'selected' : '' ?>>Under 300 kcal</option>
                    <option value="450" <?= $maxCalories === 450 ? 'selected' : '' ?>>Under 450 kcal</option>
                    <option value="600" <?= $maxCalories === 600 ? 'selected' : '' ?>>Under 600 kcal</option>
                </select>
            </div>

            <div class="col-md-1 d-flex align-items-end pt-3">
                <a href="<?= url('recommendations.php') ?>" class="btn btn-light btn-sm border rounded-pill w-100" title="Reset Filters">
                    <i class="fa-solid fa-rotate-left"></i>
                </a>
            </div>
        </form>
    </div>

    <!-- Recommendations Grid -->
    <?php if (empty($recommendations)): ?>
        <div class="card border-0 rounded-4 shadow-sm p-5 text-center bg-white">
            <div class="rounded-circle bg-warning-subtle text-warning d-inline-flex align-items-center justify-content-center mx-auto mb-3" style="width: 70px; height: 70px;">
                <i class="fa-solid fa-filter-circle-xmark fs-2"></i>
            </div>
            <h4 class="fw-bold text-dark mb-2">No Matching Recipes with Current Filters</h4>
            <p class="text-secondary max-w-500 mx-auto mb-4">
                We strictly filtered out all dishes conflicting with your allergen profile or dietary boundaries. Try clearing some filters or expanding your preferences.
            </p>
            <a href="<?= url('recommendations.php') ?>" class="btn btn-success rounded-pill px-4">
                Reset All Filters
            </a>
        </div>
    <?php else: ?>
        <div class="row g-4">
            <?php foreach ($recommendations as $meal): 
                $dietClass = 'badge-dietary-' . strtolower(str_replace(' ', '-', $meal['dietary_type']));
            ?>
                <div class="col-md-6 col-lg-4">
                    <div class="meal-card shadow-sm h-100">
                        <div class="meal-img-wrapper">
                            <img src="<?= meal_image_url($meal['image'] ?? null) ?>" alt="<?= e($meal['name']) ?>" class="meal-img" onerror="this.onerror=null;this.src='<?= asset('images/meals/default-meal.jpg') ?>';">
                            
                            <!-- Dietary Badge -->
                            <span class="badge <?= $dietClass ?> position-absolute top-0 start-0 m-3 px-3 py-1 rounded-pill fw-semibold">
                                <?= e($meal['dietary_type']) ?>
                            </span>

                            <!-- Favorite Button -->
                            <button class="meal-fav-btn <?= is_meal_favorited($user['id'], $meal['id']) ? 'active' : '' ?>" data-meal-id="<?= $meal['id'] ?>" title="Favorite">
                                <i class="<?= is_meal_favorited($user['id'], $meal['id']) ? 'fa-solid text-danger' : 'fa-regular' ?> fa-heart"></i>
                            </button>
                        </div>

                        <div class="p-4 d-flex flex-column flex-grow-1">
                            <div class="d-flex align-items-center justify-content-between mb-2">
                                <span class="badge bg-light text-secondary border small">
                                    <i class="fa-regular fa-clock me-1"></i><?= $meal['prep_time_minutes'] ?> mins &bull; <?= e($meal['meal_type']) ?>
                                </span>
                                <span class="fw-bold text-success">
                                    <i class="fa-solid fa-fire text-danger me-1"></i><?= $meal['calories'] ?> kcal
                                </span>
                            </div>

                            <h5 class="fw-bold text-dark mb-2 line-clamp-1">
                                <a href="<?= url('meal-details.php?id=' . $meal['id']) ?>" class="text-dark text-decoration-none hover-primary">
                                    <?= e($meal['name']) ?>
                                </a>
                            </h5>

                            <p class="text-secondary small mb-3 line-clamp-2">
                                <?= e($meal['description']) ?>
                            </p>

                            <!-- Why Recommended Explanations (Key Section 36 requirement) -->
                            <?php if (!empty($meal['match_reasons'])): ?>
                                <div class="bg-light rounded-3 p-2 mb-3 border">
                                    <div class="text-secondary fw-bold mb-1" style="font-size: 0.72rem; letter-spacing: 0.04em;">
                                        WHY RECOMMENDED:
                                    </div>
                                    <div class="d-flex flex-column gap-1">
                                        <?php foreach ($meal['match_reasons'] as $reason): ?>
                                            <div class="small text-success-emphasis fw-semibold" style="font-size: 0.76rem;">
                                                <?= e($reason) ?>
                                            </div>
                                        <?php endforeach; ?>
                                    </div>
                                </div>
                            <?php endif; ?>

                            <!-- Macronutrient Grid -->
                            <div class="d-flex justify-content-between text-center pt-2 border-top mt-auto mb-3">
                                <div class="macro-pill">
                                    <span class="macro-val text-primary"><?= $meal['protein'] ?>g</span>
                                    <span class="macro-label">Protein</span>
                                </div>
                                <div class="macro-pill">
                                    <span class="macro-val text-warning"><?= $meal['carbs'] ?>g</span>
                                    <span class="macro-label">Carbs</span>
                                </div>
                                <div class="macro-pill">
                                    <span class="macro-val text-danger"><?= $meal['fat'] ?>g</span>
                                    <span class="macro-label">Fat</span>
                                </div>
                                <div class="macro-pill">
                                    <span class="macro-val text-success"><?= $meal['fiber'] ?>g</span>
                                    <span class="macro-label">Fiber</span>
                                </div>
                            </div>

                            <!-- Action Buttons -->
                            <div class="d-flex gap-2">
                                <a href="<?= url('meal-details.php?id=' . $meal['id']) ?>" class="btn btn-outline-dark btn-sm rounded-pill flex-grow-1 fw-semibold">
                                    Recipe
                                </a>
                                <button type="button" class="btn btn-success btn-sm rounded-pill px-3 fw-semibold btn-add-to-plan" data-meal-id="<?= $meal['id'] ?>" data-meal-name="<?= e($meal['name']) ?>" data-default-slot="<?= e($meal['meal_type']) ?>">
                                    <i class="fa-solid fa-plus me-1"></i>Add to Plan
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            <?php endforeach; ?>
        </div>
    <?php endif; ?>
</div>

<!-- Modal: Add Meal to 7-Day Plan -->
<div class="modal fade" id="addToPlanModal" tabindex="-1" aria-labelledby="addToPlanModalLabel" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content rounded-4 border-0 shadow-lg">
            <div class="modal-header border-0 pb-0">
                <h5 class="modal-title fw-bold" id="addToPlanModalLabel">Add to 7-Day Meal Plan</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body p-4">
                <p class="text-secondary small mb-3">
                    Schedule <strong id="modalMealName" class="text-dark">Meal</strong> into your active weekly meal planner:
                </p>
                <form id="addToPlanForm">
                    <input type="hidden" name="meal_id" id="modalMealId">
                    <input type="hidden" name="action" value="add_meal">

                    <div class="mb-3">
                        <label class="form-label fw-semibold small text-secondary">Day of Week</label>
                        <select name="day_of_week" class="form-select" id="modalDaySelect">
                            <option value="Monday">Monday</option>
                            <option value="Tuesday">Tuesday</option>
                            <option value="Wednesday">Wednesday</option>
                            <option value="Thursday">Thursday</option>
                            <option value="Friday">Friday</option>
                            <option value="Saturday">Saturday</option>
                            <option value="Sunday">Sunday</option>
                        </select>
                    </div>

                    <div class="mb-4">
                        <label class="form-label fw-semibold small text-secondary">Meal Slot</label>
                        <select name="meal_slot" class="form-select" id="modalSlotSelect">
                            <option value="Breakfast">Breakfast</option>
                            <option value="Lunch">Lunch</option>
                            <option value="Dinner">Dinner</option>
                            <option value="Snack">Snack</option>
                        </select>
                    </div>

                    <button type="submit" class="btn btn-success rounded-pill w-100 py-2 fw-bold">
                        Confirm & Add to Schedule
                    </button>
                </form>
            </div>
        </div>
    </div>
</div>

<script>
document.addEventListener('DOMContentLoaded', () => {
    const planModal = new bootstrap.Modal(document.getElementById('addToPlanModal'));
    const modalMealId = document.getElementById('modalMealId');
    const modalMealName = document.getElementById('modalMealName');
    const modalSlotSelect = document.getElementById('modalSlotSelect');

    document.querySelectorAll('.btn-add-to-plan').forEach(btn => {
        btn.addEventListener('click', () => {
            modalMealId.value = btn.dataset.mealId;
            modalMealName.textContent = btn.dataset.mealName;
            
            const defSlot = btn.dataset.defaultSlot || 'Lunch';
            if (['Breakfast', 'Lunch', 'Dinner', 'Snack'].includes(defSlot)) {
                modalSlotSelect.value = defSlot;
            } else if (defSlot === 'Smoothies' || defSlot === 'Snacks') {
                modalSlotSelect.value = 'Snack';
            }
            planModal.show();
        });
    });

    document.getElementById('addToPlanForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const form = e.target;
        const formData = new FormData(form);
        formData.append('csrf_token', APP_CONFIG.csrfToken);

        try {
            const res = await fetch(APP_CONFIG.baseUrl + '/api/meal-plan.php', {
                method: 'POST',
                body: formData
            });
            const data = await res.json();
            if (data.success) {
                planModal.hide();
                showToast(data.message || 'Meal added to your schedule!', 'success');
            } else {
                showToast(data.message || 'Failed to add meal', 'error');
            }
        } catch (err) {
            showToast('Error saving to meal plan', 'error');
        }
    });
});
</script>

<?php require_once __DIR__ . '/includes/footer.php'; ?>
