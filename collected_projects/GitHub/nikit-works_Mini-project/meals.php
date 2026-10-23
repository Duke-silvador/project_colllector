<?php
/**
 * HealthyDiet — Food Catalog, Search & Filter
 *
 * @category Nutrition
 * @package  HealthyDiet
 * @author   HealthyDiet Systems
 * @license  MIT https://opensource.org/licenses/MIT
 * @link     https://healthydiet.local
 */

$pageTitle = "Explore Healthy Recipes & Meals";
require_once __DIR__ . '/includes/header.php';

$db = getDB();

// Filter Inputs
$search = sanitize_string($_GET['q'] ?? '');
$categoryId = !empty($_GET['category']) ? (int)$_GET['category'] : null;
$dietaryType = sanitize_string($_GET['dietary'] ?? '');
$mealType = sanitize_string($_GET['meal_type'] ?? '');
$sortBy = sanitize_string($_GET['sort'] ?? 'newest');
$maxCal = !empty($_GET['max_calories']) ? (int)$_GET['max_calories'] : null;

// Pagination
$page = max(1, (int)($_GET['page'] ?? 1));
$limit = 9;
$offset = ($page - 1) * $limit;

$whereClauses = ['1=1'];
$params = [];

if ($search !== '') {
    $whereClauses[] = "(m.name LIKE ? OR m.description LIKE ? OR m.ingredients LIKE ? OR m.tags LIKE ?)";
    $like = '%' . $search . '%';
    $params[] = $like;
    $params[] = $like;
    $params[] = $like;
    $params[] = $like;
}

if ($categoryId) {
    $whereClauses[] = "m.category_id = ?";
    $params[] = $categoryId;
}

if ($dietaryType !== '') {
    $whereClauses[] = "m.dietary_type = ?";
    $params[] = $dietaryType;
}

if ($mealType !== '') {
    $whereClauses[] = "m.meal_type = ?";
    $params[] = $mealType;
}

if ($maxCal) {
    $whereClauses[] = "m.calories <= ?";
    $params[] = $maxCal;
}

$whereSql = implode(' AND ', $whereClauses);

// Sorting
$orderBy = match ($sortBy) {
    'cal_asc'     => 'm.calories ASC',
    'cal_desc'    => 'm.calories DESC',
    'protein_desc'=> 'm.protein DESC',
    'time_asc'    => 'm.prep_time_minutes ASC',
    default       => 'm.id DESC'
};

// Count total & Fetch meals
$totalMeals = 0;
$totalPages = 1;
$meals = [];
$categories = [];

if ($db) {
    try {
        $countStmt = $db->prepare("SELECT COUNT(*) FROM meals m WHERE {$whereSql}");
        $countStmt->execute($params);
        $totalMeals = (int)$countStmt->fetchColumn();
        $totalPages = max(1, (int)ceil($totalMeals / $limit));

        // Fetch meals
        $query = "
            SELECT m.*, c.name as category_name, c.icon as category_icon
            FROM meals m
            JOIN meal_categories c ON m.category_id = c.id
            WHERE {$whereSql}
            ORDER BY {$orderBy}
            LIMIT {$limit} OFFSET {$offset}
        ";
        $stmt = $db->prepare($query);
        $stmt->execute($params);
        $meals = $stmt->fetchAll();

        // Categories for filter
        $catStmt = $db->query("SELECT * FROM meal_categories ORDER BY name ASC");
        if ($catStmt) {
            $categories = $catStmt->fetchAll();
        }
    } catch (PDOException $e) {
        error_log("Database error in meals.php: " . $e->getMessage());
    }
}
?>

<div class="bg-light py-4 border-bottom">
    <div class="container">
        <div class="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
            <div>
                <h6 class="text-success text-uppercase fw-bold ls-1 mb-1">Food Database</h6>
                <h1 class="h2 fw-bold text-dark mb-0">Explore Healthy Dishes</h1>
                <p class="text-secondary small mb-0">Showing <?= $totalMeals ?> chef-curated wholesome recipes</p>
            </div>
            <div class="d-flex gap-2">
                <a href="<?= url('recommendations.php') ?>" class="btn btn-success btn-sm rounded-pill px-3 shadow-xs">
                    <i class="fa-solid fa-wand-magic-sparkles me-1"></i>Personalized Engine
                </a>
            </div>
        </div>
    </div>
</div>

<div class="container py-4">
    <!-- Search & Filter Controls -->
    <div class="card border-0 rounded-4 shadow-sm p-4 bg-white mb-4">
        <form method="GET" action="<?= url('meals.php') ?>">
            <div class="row g-3">
                <!-- Search Text -->
                <div class="col-lg-4 col-md-6">
                    <label class="form-label fw-semibold small text-secondary">Search Keyword / Ingredient</label>
                    <div class="input-group">
                        <span class="input-group-text bg-light"><i class="fa-solid fa-magnifying-glass text-muted"></i></span>
                        <input type="text" name="q" id="liveMealSearch" class="form-control" placeholder="e.g. Paneer, Quinoa, Salmon, Low Calorie..." value="<?= e($search) ?>">
                    </div>
                </div>

                <!-- Category -->
                <div class="col-lg-2 col-md-3">
                    <label class="form-label fw-semibold small text-secondary">Category</label>
                    <select name="category" class="form-select form-select-sm" onchange="this.form.submit()">
                        <option value="">All Categories</option>
                        <?php foreach ($categories as $cat): ?>
                            <option value="<?= $cat['id'] ?>" <?= $categoryId == $cat['id'] ? 'selected' : '' ?>><?= e($cat['name']) ?></option>
                        <?php endforeach; ?>
                    </select>
                </div>

                <!-- Dietary Preference -->
                <div class="col-lg-2 col-md-3">
                    <label class="form-label fw-semibold small text-secondary">Dietary Type</label>
                    <select name="dietary" class="form-select form-select-sm" onchange="this.form.submit()">
                        <option value="">All Diets</option>
                        <option value="Vegetarian" <?= $dietaryType === 'Vegetarian' ? 'selected' : '' ?>>🌱 Vegetarian</option>
                        <option value="Vegan" <?= $dietaryType === 'Vegan' ? 'selected' : '' ?>>🥦 Vegan</option>
                        <option value="Non-Vegetarian" <?= $dietaryType === 'Non-Vegetarian' ? 'selected' : '' ?>>🍗 Non-Vegetarian</option>
                        <option value="Eggetarian" <?= $dietaryType === 'Eggetarian' ? 'selected' : '' ?>>🥚 Eggetarian</option>
                        <option value="Pescatarian" <?= $dietaryType === 'Pescatarian' ? 'selected' : '' ?>>🐟 Pescatarian</option>
                    </select>
                </div>

                <!-- Meal Slot -->
                <div class="col-lg-2 col-md-3">
                    <label class="form-label fw-semibold small text-secondary">Meal Time</label>
                    <select name="meal_type" class="form-select form-select-sm" onchange="this.form.submit()">
                        <option value="">All Meal Slots</option>
                        <option value="Breakfast" <?= $mealType === 'Breakfast' ? 'selected' : '' ?>>Breakfast</option>
                        <option value="Lunch" <?= $mealType === 'Lunch' ? 'selected' : '' ?>>Lunch</option>
                        <option value="Dinner" <?= $mealType === 'Dinner' ? 'selected' : '' ?>>Dinner</option>
                        <option value="Snacks" <?= $mealType === 'Snacks' ? 'selected' : '' ?>>Snacks</option>
                        <option value="Smoothies" <?= $mealType === 'Smoothies' ? 'selected' : '' ?>>Smoothies</option>
                    </select>
                </div>

                <!-- Sort By -->
                <div class="col-lg-2 col-md-3">
                    <label class="form-label fw-semibold small text-secondary">Sort By</label>
                    <select name="sort" class="form-select form-select-sm" onchange="this.form.submit()">
                        <option value="newest" <?= $sortBy === 'newest' ? 'selected' : '' ?>>Newest Added</option>
                        <option value="protein_desc" <?= $sortBy === 'protein_desc' ? 'selected' : '' ?>>Highest Protein</option>
                        <option value="cal_asc" <?= $sortBy === 'cal_asc' ? 'selected' : '' ?>>Lowest Calories</option>
                        <option value="cal_desc" <?= $sortBy === 'cal_desc' ? 'selected' : '' ?>>Highest Calories</option>
                        <option value="time_asc" <?= $sortBy === 'time_asc' ? 'selected' : '' ?>>Quickest Prep Time</option>
                    </select>
                </div>
            </div>

            <div class="d-flex justify-content-between align-items-center mt-3 pt-3 border-top">
                <div class="small text-muted">
                    <?php if ($search || $categoryId || $dietaryType || $mealType): ?>
                        Active filters applied. <a href="<?= url('meals.php') ?>" class="text-danger ms-1 text-decoration-none">Clear all filters</a>
                    <?php endif; ?>
                </div>
                <button type="submit" class="btn btn-dark btn-sm rounded-pill px-4">
                    Filter Recipes
                </button>
            </div>
        </form>
    </div>

    <!-- Meals Grid -->
    <?php if (empty($meals)): ?>
        <div class="card border-0 rounded-4 shadow-sm p-5 text-center bg-white">
            <div class="rounded-circle bg-light text-muted d-inline-flex align-items-center justify-content-center mx-auto mb-3" style="width: 70px; height: 70px;">
                <i class="fa-solid fa-magnifying-glass fs-2"></i>
            </div>
            <h4 class="fw-bold text-dark mb-2">No Recipes Found</h4>
            <p class="text-secondary max-w-500 mx-auto mb-4">
                We couldn't find any dishes matching your exact criteria. Try searching with broader keywords or removing dietary restrictions.
            </p>
            <a href="<?= url('meals.php') ?>" class="btn btn-success rounded-pill px-4">
                Reset All Filters
            </a>
        </div>
    <?php else: ?>
        <div class="row g-4">
            <?php foreach ($meals as $meal): 
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
                            <?php if ($currentUser): ?>
                                <button class="meal-fav-btn <?= is_meal_favorited($currentUser['id'], $meal['id']) ? 'active' : '' ?>" data-meal-id="<?= $meal['id'] ?>" title="Favorite">
                                    <i class="<?= is_meal_favorited($currentUser['id'], $meal['id']) ? 'fa-solid text-danger' : 'fa-regular' ?> fa-heart"></i>
                                </button>
                            <?php endif; ?>
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
                                <?php if ($currentUser): ?>
                                    <button type="button" class="btn btn-success btn-sm rounded-pill px-3 fw-semibold btn-add-to-plan" data-meal-id="<?= $meal['id'] ?>" data-meal-name="<?= e($meal['name']) ?>" data-default-slot="<?= e($meal['meal_type']) ?>">
                                        <i class="fa-solid fa-plus"></i> Plan
                                    </button>
                                <?php endif; ?>
                            </div>
                        </div>
                    </div>
                </div>
            <?php endforeach; ?>
        </div>

        <!-- Pagination Navigation -->
        <?php if ($totalPages > 1): ?>
            <nav class="mt-5" aria-label="Meals pagination">
                <ul class="pagination justify-content-center">
                    <?php if ($page > 1): ?>
                        <li class="page-item">
                            <a class="page-link rounded-pill me-1" href="?<?= http_build_query(array_merge($_GET, ['page' => $page - 1])) ?>">
                                &laquo; Previous
                            </a>
                        </li>
                    <?php endif; ?>

                    <?php for ($i = 1; $i <= $totalPages; $i++): ?>
                        <li class="page-item <?= $page === $i ? 'active' : '' ?>">
                            <a class="page-link rounded-pill mx-1" href="?<?= http_build_query(array_merge($_GET, ['page' => $i])) ?>">
                                <?= $i ?>
                            </a>
                        </li>
                    <?php endfor; ?>

                    <?php if ($page < $totalPages): ?>
                        <li class="page-item">
                            <a class="page-link rounded-pill ms-1" href="?<?= http_build_query(array_merge($_GET, ['page' => $page + 1])) ?>">
                                Next &raquo;
                            </a>
                        </li>
                    <?php endif; ?>
                </ul>
            </nav>
        <?php endif; ?>
    <?php endif; ?>
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
<?php endif; ?>

<?php require_once __DIR__ . '/includes/footer.php'; ?>
