<?php
/**
 * HealthyDiet — User's Bookmarked / Favorite Meals
 */

require_once __DIR__ . '/includes/auth.php';
require_once __DIR__ . '/includes/functions.php';

require_login();

$user = current_user();
$db = getDB();

$pageTitle = "My Favorite Healthy Dishes";

// Fetch user's favorite meals
$stmt = $db->prepare("
    SELECT m.*, c.name as category_name, c.icon as category_icon, f.created_at as favorited_at
    FROM favorites f
    JOIN meals m ON f.meal_id = m.id
    JOIN meal_categories c ON m.category_id = c.id
    WHERE f.user_id = ?
    ORDER BY f.created_at DESC
");
$stmt->execute([$user['id']]);
$favoriteMeals = $stmt->fetchAll();

require_once __DIR__ . '/includes/header.php';
?>

<div class="bg-light py-4 border-bottom">
    <div class="container">
        <div class="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
            <div>
                <h6 class="text-danger text-uppercase fw-bold ls-1 mb-1">
                    <i class="fa-solid fa-heart me-1"></i> Saved Collection
                </h6>
                <h1 class="h2 fw-bold text-dark mb-0">My Favorite Recipes</h1>
                <p class="text-secondary small mb-0">You have bookmarked <?= count($favoriteMeals) ?> healthy dishes</p>
            </div>
            <div>
                <a href="<?= url('meals.php') ?>" class="btn btn-outline-dark btn-sm rounded-pill px-3">
                    <i class="fa-solid fa-plus me-1"></i>Discover More Meals
                </a>
            </div>
        </div>
    </div>
</div>

<div class="container py-5">
    <?php if (empty($favoriteMeals)): ?>
        <div class="card border-0 rounded-4 shadow-sm p-5 text-center bg-white">
            <div class="rounded-circle bg-danger-subtle text-danger d-inline-flex align-items-center justify-content-center mx-auto mb-3" style="width: 70px; height: 70px;">
                <i class="fa-regular fa-heart fs-2"></i>
            </div>
            <h4 class="fw-bold text-dark mb-2">No Saved Recipes Yet</h4>
            <p class="text-secondary max-w-500 mx-auto mb-4">
                Whenever you browse meals or personalized recommendations, click the heart icon on any recipe to save it here for quick access!
            </p>
            <div class="d-flex justify-content-center gap-3">
                <a href="<?= url('recommendations.php') ?>" class="btn btn-success rounded-pill px-4">
                    <i class="fa-solid fa-wand-magic-sparkles me-1"></i>View Recommendations
                </a>
                <a href="<?= url('meals.php') ?>" class="btn btn-outline-secondary rounded-pill px-4">
                    Explore Meals Catalog
                </a>
            </div>
        </div>
    <?php else: ?>
        <div class="row g-4">
            <?php foreach ($favoriteMeals as $meal): 
                $dietClass = 'badge-dietary-' . strtolower(str_replace(' ', '-', $meal['dietary_type']));
            ?>
                <div class="col-md-6 col-lg-4 favorite-card-col">
                    <div class="meal-card shadow-sm h-100">
                        <div class="meal-img-wrapper">
                            <img src="<?= meal_image_url($meal['image'] ?? null) ?>" alt="<?= e($meal['name']) ?>" class="meal-img" onerror="this.onerror=null;this.src='<?= asset('images/meals/default-meal.jpg') ?>';">
                            
                            <span class="badge <?= $dietClass ?> position-absolute top-0 start-0 m-3 px-3 py-1 rounded-pill fw-semibold">
                                <?= e($meal['dietary_type']) ?>
                            </span>

                            <button class="meal-fav-btn active" data-meal-id="<?= $meal['id'] ?>" title="Remove from favorites">
                                <i class="fa-solid fa-heart text-danger"></i>
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
                                    Recipe Details &rarr;
                                </a>
                                <button type="button" class="btn btn-success btn-sm rounded-pill px-3 fw-semibold btn-add-to-plan" data-meal-id="<?= $meal['id'] ?>" data-meal-name="<?= e($meal['name']) ?>" data-default-slot="<?= e($meal['meal_type']) ?>">
                                    <i class="fa-solid fa-plus"></i> Plan
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
