<?php
/**
 * HealthyDiet — Comprehensive Meal Recipe & Nutrition Details
 */

require_once __DIR__ . '/includes/auth.php';
require_once __DIR__ . '/includes/functions.php';

$mealId = (int)($_GET['id'] ?? 0);
$db = getDB();

if (!$mealId || !$db) {
    header('Location: ' . url('meals.php'));
    exit;
}

$stmt = $db->prepare("
    SELECT m.*, c.name as category_name, c.icon as category_icon
    FROM meals m
    JOIN meal_categories c ON m.category_id = c.id
    WHERE m.id = ?
    LIMIT 1
");
$stmt->execute([$mealId]);
$meal = $stmt->fetch();

if (!$meal) {
    http_response_code(404);
    require_once __DIR__ . '/404.php';
    exit;
}

$pageTitle = $meal['name'] . " — Healthy Recipe & Nutrition Facts";
$metaDescription = substr(strip_tags($meal['description']), 0, 160);

// Fetch 3 related recipes from same category or dietary type
$relatedStmt = $db->prepare("
    SELECT * FROM meals 
    WHERE id != ? AND (category_id = ? OR dietary_type = ?) 
    LIMIT 3
");
$relatedStmt->execute([$meal['id'], $meal['category_id'], $meal['dietary_type']]);
$relatedMeals = $relatedStmt->fetchAll();

// Parse ingredients and instructions
$ingredientsList = array_filter(array_map('trim', explode("\n", $meal['ingredients'])));
$instructionsList = array_filter(array_map('trim', explode("\n", $meal['instructions'])));
$allergensList = array_filter(array_map('trim', explode(',', $meal['allergens'] ?? '')));
$tagsList = array_filter(array_map('trim', explode(',', $meal['tags'] ?? '')));

$currentUser = current_user();
$isFavorited = $currentUser ? is_meal_favorited($currentUser['id'], $meal['id']) : false;

require_once __DIR__ . '/includes/header.php';
?>

<div class="bg-light py-4 border-bottom">
    <div class="container">
        <!-- Breadcrumb -->
        <nav aria-label="breadcrumb">
            <ol class="breadcrumb mb-2 small">
                <li class="breadcrumb-item"><a href="<?= url('index.php') ?>" class="text-secondary text-decoration-none">Home</a></li>
                <li class="breadcrumb-item"><a href="<?= url('meals.php') ?>" class="text-secondary text-decoration-none">Meals</a></li>
                <li class="breadcrumb-item"><a href="<?= url('meals.php?category=' . $meal['category_id']) ?>" class="text-secondary text-decoration-none"><?= e($meal['category_name']) ?></a></li>
                <li class="breadcrumb-item active text-dark fw-semibold" aria-current="page"><?= e($meal['name']) ?></li>
            </ol>
        </nav>
    </div>
</div>

<div class="container py-5">
    <div class="row g-5">
        <!-- Left: Image & Macros & Recipe Body -->
        <div class="col-lg-8">
            <!-- Meal Visual & Header -->
            <div class="card border-0 rounded-4 shadow-sm overflow-hidden bg-white mb-4">
                <div class="position-relative" style="height: 380px; background-color: #f1f5f9;">
                    <img src="<?= meal_image_url($meal['image'] ?? null) ?>" alt="<?= e($meal['name']) ?>" class="w-100 h-100 object-fit-cover" onerror="this.onerror=null;this.src='<?= asset('images/meals/default-meal.jpg') ?>';">
                    
                    <span class="badge badge-dietary-<?= strtolower(str_replace(' ', '-', $meal['dietary_type'])) ?> position-absolute top-0 start-0 m-4 px-3 py-2 rounded-pill fs-6 shadow-sm">
                        <?= e($meal['dietary_type']) ?>
                    </span>

                    <?php if ($currentUser): ?>
                        <button class="meal-fav-btn <?= $isFavorited ? 'active' : '' ?> position-absolute top-0 end-0 m-4 shadow" data-meal-id="<?= $meal['id'] ?>" title="Favorite" style="width: 46px; height: 46px;">
                            <i class="<?= $isFavorited ? 'fa-solid text-danger' : 'fa-regular' ?> fa-heart fs-5"></i>
                        </button>
                    <?php endif; ?>
                </div>

                <div class="p-4 p-md-5">
                    <div class="d-flex flex-wrap align-items-center gap-3 mb-3 text-secondary small">
                        <span class="badge bg-light text-dark border px-3 py-2 rounded-pill">
                            <i class="fa-solid <?= e($meal['category_icon']) ?> me-1 text-success"></i><?= e($meal['category_name']) ?>
                        </span>
                        <span><i class="fa-regular fa-clock text-primary me-1"></i><?= $meal['prep_time_minutes'] ?> mins prep</span>
                        <span>&bull;</span>
                        <span><i class="fa-solid fa-gauge-high text-warning me-1"></i><?= e($meal['difficulty']) ?> Difficulty</span>
                        <span>&bull;</span>
                        <span><i class="fa-solid fa-utensils text-success me-1"></i><?= e($meal['meal_type']) ?> Slot</span>
                    </div>

                    <h1 class="display-6 fw-bold text-dark mb-3"><?= e($meal['name']) ?></h1>
                    <p class="lead text-secondary mb-4" style="font-size: 1.05rem;">
                        <?= e($meal['description']) ?>
                    </p>

                    <!-- Tags -->
                    <?php if (!empty($tagsList)): ?>
                        <div class="d-flex flex-wrap gap-2 mb-4">
                            <?php foreach ($tagsList as $tag): ?>
                                <span class="badge bg-light text-secondary border rounded-pill px-3 py-1">
                                    #<?= e($tag) ?>
                                </span>
                            <?php endforeach; ?>
                        </div>
                    <?php endif; ?>

                    <!-- Action Buttons -->
                    <div class="d-flex flex-wrap gap-3 pt-2">
                        <?php if ($currentUser): ?>
                            <button type="button" class="btn btn-success rounded-pill px-4 py-2 fw-bold shadow-sm btn-add-to-plan" data-meal-id="<?= $meal['id'] ?>" data-meal-name="<?= e($meal['name']) ?>" data-default-slot="<?= e($meal['meal_type']) ?>">
                                <i class="fa-solid fa-calendar-plus me-2"></i>Add to 7-Day Meal Plan
                            </button>
                        <?php else: ?>
                            <a href="<?= url('login.php') ?>" class="btn btn-success rounded-pill px-4 py-2 fw-bold">
                                Sign In to Save to Meal Plan
                            </a>
                        <?php endif; ?>
                    </div>
                </div>
            </div>

            <!-- Ingredients Checklist -->
            <div class="card border-0 rounded-4 shadow-sm p-4 p-md-5 bg-white mb-4">
                <div class="d-flex align-items-center gap-2 mb-4">
                    <div class="bg-success-subtle text-success rounded-circle p-2 fs-5">
                        <i class="fa-solid fa-carrot"></i>
                    </div>
                    <h4 class="fw-bold text-dark mb-0">Ingredients & Measurements</h4>
                </div>

                <div class="row g-3">
                    <?php foreach ($ingredientsList as $ing): ?>
                        <div class="col-md-6">
                            <div class="d-flex align-items-start gap-2 p-2 rounded-3 border bg-light">
                                <i class="fa-solid fa-circle-check text-success mt-1"></i>
                                <span class="text-dark small fw-medium"><?= e($ing) ?></span>
                            </div>
                        </div>
                    <?php endforeach; ?>
                </div>
            </div>

            <!-- Step-by-Step Cooking Instructions -->
            <div class="card border-0 rounded-4 shadow-sm p-4 p-md-5 bg-white mb-4">
                <div class="d-flex align-items-center gap-2 mb-4">
                    <div class="bg-primary-subtle text-primary rounded-circle p-2 fs-5">
                        <i class="fa-solid fa-fire-burner"></i>
                    </div>
                    <h4 class="fw-bold text-dark mb-0">Step-by-Step Cooking Instructions</h4>
                </div>

                <div class="d-flex flex-column gap-3">
                    <?php 
                    $stepNum = 1;
                    foreach ($instructionsList as $step): 
                        // Clean leading numbering if already present
                        $cleanedStep = preg_replace('/^\d+[\.\)]\s*/', '', $step);
                    ?>
                        <div class="d-flex align-items-start gap-3 p-3 rounded-4 border bg-white shadow-xs">
                            <div class="bg-primary text-white rounded-circle fw-bold d-flex align-items-center justify-content-center flex-shrink-0" style="width: 34px; height: 34px;">
                                <?= $stepNum++ ?>
                            </div>
                            <div class="text-secondary small fw-normal pt-1 lh-base">
                                <?= e($cleanedStep) ?>
                            </div>
                        </div>
                    <?php endforeach; ?>
                </div>
            </div>

            <!-- Health Benefits Callout -->
            <?php if (!empty($meal['health_benefits'])): ?>
                <div class="card border-0 rounded-4 shadow-sm p-4 bg-success-subtle border-success-subtle border mb-4">
                    <div class="d-flex align-items-start gap-3">
                        <i class="fa-solid fa-heart-pulse text-success fs-3 mt-1"></i>
                        <div>
                            <h5 class="fw-bold text-success-emphasis mb-1">Nutritional Benefits & Longevity Impact</h5>
                            <p class="text-secondary small mb-0 lh-base">
                                <?= e($meal['health_benefits']) ?>
                            </p>
                        </div>
                    </div>
                </div>
            <?php endif; ?>
        </div>

        <!-- Right: Nutritional Facts Sidebar & Allergen Warnings -->
        <div class="col-lg-4">
            <div class="sticky-top" style="top: 90px;">
                <!-- Nutritional Facts Box -->
                <div class="card border-0 rounded-4 shadow-sm p-4 bg-white mb-4">
                    <div class="d-flex justify-content-between align-items-center mb-3">
                        <h5 class="fw-bold text-dark mb-0">Nutrition Facts</h5>
                        <span class="badge bg-success-subtle text-success border border-success-subtle">Per Serving</span>
                    </div>

                    <div class="bg-dark text-white rounded-4 p-4 text-center mb-4">
                        <span class="text-secondary small text-uppercase fw-bold letter-spacing-1">Total Calories</span>
                        <div class="display-5 fw-extrabold text-white my-1"><?= $meal['calories'] ?></div>
                        <span class="text-success small fw-semibold">kcal energy</span>
                    </div>

                    <!-- Macro Breakdown List -->
                    <div class="d-flex flex-column gap-3 mb-4">
                        <div>
                            <div class="d-flex justify-content-between small fw-bold mb-1">
                                <span class="text-primary"><i class="fa-solid fa-dumbbell me-1"></i> Protein</span>
                                <span><?= $meal['protein'] ?>g</span>
                            </div>
                            <div class="progress" style="height: 8px;">
                                <div class="progress-bar bg-primary" style="width: <?= min(100, ($meal['protein'] / 50) * 100) ?>%;"></div>
                            </div>
                        </div>

                        <div>
                            <div class="d-flex justify-content-between small fw-bold mb-1">
                                <span class="text-warning"><i class="fa-solid fa-wheat-awn me-1"></i> Carbohydrates</span>
                                <span><?= $meal['carbs'] ?>g</span>
                            </div>
                            <div class="progress" style="height: 8px;">
                                <div class="progress-bar bg-warning" style="width: <?= min(100, ($meal['carbs'] / 80) * 100) ?>%;"></div>
                            </div>
                        </div>

                        <div>
                            <div class="d-flex justify-content-between small fw-bold mb-1">
                                <span class="text-danger"><i class="fa-solid fa-droplet me-1"></i> Healthy Fats</span>
                                <span><?= $meal['fat'] ?>g</span>
                            </div>
                            <div class="progress" style="height: 8px;">
                                <div class="progress-bar bg-danger" style="width: <?= min(100, ($meal['fat'] / 40) * 100) ?>%;"></div>
                            </div>
                        </div>

                        <div>
                            <div class="d-flex justify-content-between small fw-bold mb-1">
                                <span class="text-success"><i class="fa-solid fa-leaf me-1"></i> Dietary Fiber</span>
                                <span><?= $meal['fiber'] ?>g</span>
                            </div>
                            <div class="progress" style="height: 8px;">
                                <div class="progress-bar bg-success" style="width: <?= min(100, ($meal['fiber'] / 15) * 100) ?>%;"></div>
                            </div>
                        </div>
                    </div>

                    <!-- Allergen Alert -->
                    <?php if (!empty($allergensList) && reset($allergensList) !== 'none'): ?>
                        <div class="bg-danger-subtle text-danger-emphasis rounded-3 p-3 border border-danger-subtle small">
                            <div class="fw-bold mb-1"><i class="fa-solid fa-triangle-exclamation me-1"></i> Allergen Notice:</div>
                            Contains: <strong><?= e(implode(', ', array_map('ucfirst', $allergensList))) ?></strong>.
                        </div>
                    <?php else: ?>
                        <div class="bg-success-subtle text-success-emphasis rounded-3 p-3 border border-success-subtle small">
                            <i class="fa-solid fa-circle-check me-1"></i> Free of major top allergens (Peanuts, Gluten, Shellfish).
                        </div>
                    <?php endif; ?>
                </div>

                <!-- Related Recipes -->
                <?php if (!empty($relatedMeals)): ?>
                    <div class="card border-0 rounded-4 shadow-sm p-4 bg-white">
                        <h6 class="fw-bold text-dark mb-3">You Might Also Enjoy</h6>
                        <div class="d-flex flex-column gap-3">
                            <?php foreach ($relatedMeals as $rel): ?>
                                <a href="<?= url('meal-details.php?id=' . $rel['id']) ?>" class="d-flex align-items-center gap-3 text-decoration-none text-dark hover-primary p-1 rounded-3">
                                    <img src="<?= meal_image_url($rel['image'] ?? null) ?>" alt="<?= e($rel['name']) ?>" class="rounded-3 object-fit-cover" style="width: 55px; height: 55px;" onerror="this.onerror=null;this.src='<?= asset('images/meals/default-meal.jpg') ?>';">
                                    <div>
                                        <div class="fw-bold small line-clamp-1"><?= e($rel['name']) ?></div>
                                        <div class="text-muted small" style="font-size: 0.75rem;">
                                            <i class="fa-solid fa-fire text-danger me-1"></i><?= $rel['calories'] ?> kcal &bull; <?= $rel['protein'] ?>g P
                                        </div>
                                    </div>
                                </a>
                            <?php endforeach; ?>
                        </div>
                    </div>
                <?php endif; ?>
            </div>
        </div>
    </div>
</div>

<!-- Modal: Add Meal to 7-Day Plan (Included if user logged in) -->
<?php if ($currentUser): ?>
<div class="modal fade" id="addToPlanModal" tabindex="-1" aria-labelledby="addToPlanModalLabel" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content rounded-4 border-0 shadow-lg">
            <div class="modal-header border-0 pb-0">
                <h5 class="modal-title fw-bold" id="addToPlanModalLabel">Add to 7-Day Meal Plan</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body p-4">
                <p class="text-secondary small mb-3">
                    Schedule <strong id="modalMealName" class="text-dark"><?= e($meal['name']) ?></strong> into your active weekly meal planner:
                </p>
                <form id="addToPlanForm">
                    <input type="hidden" name="meal_id" id="modalMealId" value="<?= $meal['id'] ?>">
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
                            <option value="Breakfast" <?= $meal['meal_type'] === 'Breakfast' ? 'selected' : '' ?>>Breakfast</option>
                            <option value="Lunch" <?= $meal['meal_type'] === 'Lunch' ? 'selected' : '' ?>>Lunch</option>
                            <option value="Dinner" <?= $meal['meal_type'] === 'Dinner' ? 'selected' : '' ?>>Dinner</option>
                            <option value="Snack" <?= in_array($meal['meal_type'], ['Snacks', 'Smoothies']) ? 'selected' : '' ?>>Snack</option>
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
<?php endif; ?>

<?php require_once __DIR__ . '/includes/footer.php'; ?>
