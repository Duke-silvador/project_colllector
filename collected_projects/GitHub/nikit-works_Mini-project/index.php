<?php
/**
 * HealthyDiet — Landing Page
 */

$pageTitle = "Personalized Nutrition & Healthy Meal Recommendations";
require_once __DIR__ . '/includes/header.php';

$db = getDB();
$featuredMeals = [];
$categories = [];

if ($db) {
    // Fetch featured meals
    $stmt = $db->query("
        SELECT m.*, c.name as category_name, c.icon as category_icon
        FROM meals m
        JOIN meal_categories c ON m.category_id = c.id
        WHERE m.is_featured = 1
        ORDER BY m.calories ASC
        LIMIT 6
    ");
    $featuredMeals = $stmt->fetchAll();

    // Fetch popular categories
    $categories = $db->query("SELECT * FROM meal_categories ORDER BY id ASC LIMIT 6")->fetchAll();
}
?>

<!-- Hero Section -->
<section class="hero-gradient py-5 py-lg-6 position-relative">
    <div class="container position-relative" style="z-index: 2;">
        <div class="row align-items-center g-5">
            <div class="col-lg-6 text-center text-lg-start">
                <div class="d-inline-flex align-items-center gap-2 px-3 py-1 rounded-pill bg-success-subtle text-success border border-success-subtle mb-3 fw-semibold small">
                    <i class="fa-solid fa-sparkles"></i> Scientific Nutrition & Precision AI Engine
                </div>
                <h1 class="display-4 fw-extrabold text-dark lh-sm mb-3">
                    Personalized Healthy Diets Tailored To <span class="text-success">Your Body</span>.
                </h1>
                <p class="lead text-secondary mb-4">
                    Stop guessing your meals. Get custom, chef-curated nutrition plans based on your BMI, caloric expenditure, metabolic goals, allergies, and dietary lifestyle.
                </p>
                <div class="d-flex flex-column flex-sm-row gap-3 justify-content-center justify-content-lg-start mb-4">
                    <a href="<?= url('health-assessment.php') ?>" class="btn btn-success btn-lg rounded-pill px-4 py-3 shadow">
                        <i class="fa-solid fa-wand-magic-sparkles me-2"></i>Get Personalized Diet Plan
                    </a>
                    <a href="<?= url('meals.php') ?>" class="btn btn-outline-dark btn-lg rounded-pill px-4 py-3">
                        <i class="fa-solid fa-bowl-food me-2"></i>Explore Healthy Meals
                    </a>
                </div>
                <div class="d-flex align-items-center justify-content-center justify-content-lg-start gap-4 pt-2 text-muted small">
                    <div class="d-flex align-items-center gap-2">
                        <i class="fa-solid fa-check text-success"></i> 100% Free Assessment
                    </div>
                    <div class="d-flex align-items-center gap-2">
                        <i class="fa-solid fa-check text-success"></i> Allergen Safe
                    </div>
                    <div class="d-flex align-items-center gap-2">
                        <i class="fa-solid fa-check text-success"></i> Evidence-Based
                    </div>
                </div>
            </div>

            <!-- Quick BMI & Calorie Interactive Card -->
            <div class="col-lg-6">
                <div class="glass-card p-4 p-md-5 shadow-lg border-0 position-relative">
                    <div class="d-flex align-items-center justify-content-between mb-3">
                        <div class="d-flex align-items-center gap-2">
                            <div class="bg-success-subtle text-success rounded-circle p-2">
                                <i class="fa-solid fa-calculator fs-5"></i>
                            </div>
                            <h5 class="fw-bold mb-0 text-dark">Instant Health Preview</h5>
                        </div>
                        <span class="badge bg-light text-secondary border">Real-Time</span>
                    </div>
                    <p class="text-secondary small mb-4">
                        Adjust your height and weight to see your instant scientific BMI score and target calorie baseline.
                    </p>

                    <div class="row g-3 mb-3">
                        <div class="col-6">
                            <label class="form-label small fw-semibold text-secondary">Weight (kg)</label>
                            <div class="input-group">
                                <input type="number" id="calcWeight" class="form-control fw-bold" value="68" min="30" max="250" step="0.5">
                                <span class="input-group-text bg-light text-muted small">kg</span>
                            </div>
                        </div>
                        <div class="col-6">
                            <label class="form-label small fw-semibold text-secondary">Height (cm)</label>
                            <div class="input-group">
                                <input type="number" id="calcHeight" class="form-control fw-bold" value="170" min="100" max="230" step="1">
                                <span class="input-group-text bg-light text-muted small">cm</span>
                            </div>
                        </div>
                    </div>

                    <!-- Live BMI Result Display -->
                    <div class="bg-light rounded-4 p-3 mb-3 border">
                        <div class="d-flex justify-content-between align-items-center mb-2">
                            <div>
                                <span class="text-secondary small">Calculated BMI</span>
                                <div class="fs-3 fw-extrabold text-dark" id="calcBmiValue">23.5</div>
                            </div>
                            <div class="text-end">
                                <span class="text-secondary small d-block mb-1">Status</span>
                                <span id="calcBmiCategory" class="badge bg-success rounded-pill px-3 py-1 fs-6">Normal Weight</span>
                            </div>
                        </div>
                        <div class="progress" style="height: 8px;">
                            <div id="calcBmiBar" class="progress-bar bg-success" role="progressbar" style="width: 58%;"></div>
                        </div>
                    </div>

                    <!-- Calorie Estimation Row -->
                    <div class="row g-2 mb-3">
                        <div class="col-6">
                            <label class="form-label small text-muted mb-1">Primary Goal</label>
                            <select id="calcGoal" class="form-select form-select-sm">
                                <option value="weight_loss">Weight Loss</option>
                                <option value="weight_maintenance" selected>Maintenance</option>
                                <option value="muscle_gain">Muscle Gain</option>
                                <option value="weight_gain">Weight Gain</option>
                            </select>
                        </div>
                        <div class="col-6">
                            <label class="form-label small text-muted mb-1">Activity Level</label>
                            <select id="calcActivity" class="form-select form-select-sm">
                                <option value="sedentary">Sedentary</option>
                                <option value="moderately_active" selected>Moderate (3-5d)</option>
                                <option value="very_active">Very Active</option>
                            </select>
                        </div>
                    </div>

                    <div class="d-flex justify-content-between align-items-center bg-success-subtle p-3 rounded-4 border border-success-subtle mb-4">
                        <span class="text-success-emphasis fw-semibold small">
                            <i class="fa-solid fa-fire text-danger me-1"></i>Est. Daily Calorie Target:
                        </span>
                        <span class="fw-bold text-success fs-5"><span id="calcTargetCalories">2,150</span> kcal</span>
                    </div>

                    <a href="<?= url('health-assessment.php') ?>" class="btn btn-dark w-100 rounded-pill py-2 fw-semibold">
                        Unlock Full Diet Plan For These Stats &rarr;
                    </a>
                </div>
            </div>
        </div>
    </div>
</section>

<!-- How It Works Section -->
<section class="py-5 bg-white border-top border-bottom">
    <div class="container py-4">
        <div class="text-center max-w-700 mx-auto mb-5">
            <h6 class="text-success text-uppercase fw-bold ls-1">Simple 3-Step Process</h6>
            <h2 class="fw-bold text-dark">How HealthyDiet Works For You</h2>
            <p class="text-secondary">Our scientific engine matches your unique metabolic rate with chef-developed recipes in seconds.</p>
        </div>

        <div class="row g-4 text-center">
            <div class="col-md-4">
                <div class="card card-feature h-100 p-4 border-0 shadow-sm">
                    <div class="rounded-circle bg-success-subtle text-success d-inline-flex align-items-center justify-content-center mx-auto mb-3" style="width: 70px; height: 70px;">
                        <i class="fa-solid fa-clipboard-question fs-3"></i>
                    </div>
                    <h5 class="fw-bold mb-2">1. Health Assessment</h5>
                    <p class="text-secondary small mb-0">Input your age, gender, height, weight, activity frequency, and dietary boundaries (vegan, keto, allergies).</p>
                </div>
            </div>
            <div class="col-md-4">
                <div class="card card-feature h-100 p-4 border-0 shadow-sm">
                    <div class="rounded-circle bg-primary-subtle text-primary d-inline-flex align-items-center justify-content-center mx-auto mb-3" style="width: 70px; height: 70px;">
                        <i class="fa-solid fa-microchip fs-3"></i>
                    </div>
                    <h5 class="fw-bold mb-2">2. Multi-Factor Scoring</h5>
                    <p class="text-secondary small mb-0">Our engine calculates your exact Mifflin-St Jeor TDEE and filters 25+ rich recipes, eliminating allergens completely.</p>
                </div>
            </div>
            <div class="col-md-4">
                <div class="card card-feature h-100 p-4 border-0 shadow-sm">
                    <div class="rounded-circle bg-warning-subtle text-warning d-inline-flex align-items-center justify-content-center mx-auto mb-3" style="width: 70px; height: 70px;">
                        <i class="fa-solid fa-calendar-check fs-3"></i>
                    </div>
                    <h5 class="fw-bold mb-2">3. 7-Day Meal Planner</h5>
                    <p class="text-secondary small mb-0">Schedule breakfast, lunch, dinner & snacks into an interactive weekly planner and track weight progress over time.</p>
                </div>
            </div>
        </div>
    </div>
</section>

<!-- Popular Categories Section -->
<section class="py-5 bg-light">
    <div class="container py-3">
        <div class="d-flex flex-column flex-md-row justify-content-between align-items-md-end mb-4">
            <div>
                <h6 class="text-success text-uppercase fw-bold ls-1">Dietary Focus</h6>
                <h2 class="fw-bold text-dark mb-0">Explore Meal Categories</h2>
            </div>
            <a href="<?= url('meals.php') ?>" class="text-success fw-semibold text-decoration-none mt-2 mt-md-0">
                Browse All Meals &rarr;
            </a>
        </div>

        <div class="row g-3">
            <?php foreach ($categories as $cat): ?>
                <div class="col-lg-4 col-md-6">
                    <a href="<?= url('meals.php?category=' . $cat['id']) ?>" class="card h-100 p-3 border rounded-4 text-decoration-none bg-white hover-shadow transition">
                        <div class="d-flex align-items-center gap-3">
                            <div class="bg-success-subtle text-success rounded-3 p-3">
                                <i class="fa-solid <?= e($cat['icon']) ?> fs-4"></i>
                            </div>
                            <div>
                                <h6 class="fw-bold text-dark mb-1"><?= e($cat['name']) ?></h6>
                                <p class="text-secondary small mb-0 text-truncate-2" style="font-size: 0.82rem;"><?= e($cat['description']) ?></p>
                            </div>
                        </div>
                    </a>
                </div>
            <?php endforeach; ?>
        </div>
    </div>
</section>

<!-- Featured Healthy Meals Grid -->
<section class="py-5 bg-white">
    <div class="container py-3">
        <div class="text-center max-w-700 mx-auto mb-5">
            <h6 class="text-success text-uppercase fw-bold ls-1">Chef-Crafted & Macro-Balanced</h6>
            <h2 class="fw-bold text-dark">Featured Healthy Dishes</h2>
            <p class="text-secondary">Nutrient-dense recipes formulated by nutritionists with complete ingredients and macro breakdowns.</p>
        </div>

        <div class="row g-4">
            <?php foreach ($featuredMeals as $meal): 
                $dietClass = 'badge-dietary-' . strtolower(str_replace(' ', '-', $meal['dietary_type']));
            ?>
                <div class="col-lg-4 col-md-6">
                    <div class="meal-card shadow-sm">
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
                                    <i class="fa-regular fa-clock me-1"></i><?= $meal['prep_time_minutes'] ?> mins
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

                            <!-- Macronutrient Split -->
                            <div class="d-flex justify-content-between text-center mt-auto pt-3 border-top">
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

                            <a href="<?= url('meal-details.php?id=' . $meal['id']) ?>" class="btn btn-outline-success btn-sm rounded-pill w-100 mt-3 fw-semibold">
                                View Recipe & Instructions &rarr;
                            </a>
                        </div>
                    </div>
                </div>
            <?php endforeach; ?>
        </div>

        <div class="text-center mt-5">
            <a href="<?= url('meals.php') ?>" class="btn btn-success rounded-pill px-5 py-3 shadow fw-bold">
                View All <?= count($featuredMeals) ? '25+' : '' ?> Recipes in Food Database &rarr;
            </a>
        </div>
    </div>
</section>

<!-- Testimonials & Scientific Credibility -->
<section class="py-5 bg-light">
    <div class="container py-3">
        <div class="text-center max-w-700 mx-auto mb-5">
            <h6 class="text-success text-uppercase fw-bold ls-1">Success Stories</h6>
            <h2 class="fw-bold text-dark">Trusted by Health Enthusiasts</h2>
        </div>

        <div class="row g-4">
            <div class="col-md-4">
                <div class="card h-100 p-4 border-0 rounded-4 shadow-sm bg-white">
                    <div class="text-warning mb-3">
                        <i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i>
                    </div>
                    <p class="text-secondary small mb-4 italic">
                        "As a strict vegetarian with peanut allergies, finding high-protein recipes was always frustrating. HealthyDiet gave me exactly 100% nut-free recipes that hit my 105g daily protein target!"
                    </p>
                    <div class="d-flex align-items-center gap-3 mt-auto">
                        <div class="bg-success text-white rounded-circle fw-bold d-flex align-items-center justify-content-center" style="width: 40px; height: 40px;">
                            EW
                        </div>
                        <div>
                            <div class="fw-bold text-dark small">Emily Watson</div>
                            <div class="text-muted small">Lost 3.2 kg in 5 Weeks</div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="col-md-4">
                <div class="card h-100 p-4 border-0 rounded-4 shadow-sm bg-white">
                    <div class="text-warning mb-3">
                        <i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i>
                    </div>
                    <p class="text-secondary small mb-4 italic">
                        "The automatic 7-day meal planner is fantastic. It balances calories per day dynamically and lets me swap out meals without breaking my macro ratios."
                    </p>
                    <div class="d-flex align-items-center gap-3 mt-auto">
                        <div class="bg-primary text-white rounded-circle fw-bold d-flex align-items-center justify-content-center" style="width: 40px; height: 40px;">
                            MC
                        </div>
                        <div>
                            <div class="fw-bold text-dark small">Marcus Chen</div>
                            <div class="text-muted small">Muscle Hypertrophy Target</div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="col-md-4">
                <div class="card h-100 p-4 border-0 rounded-4 shadow-sm bg-white">
                    <div class="text-warning mb-3">
                        <i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i>
                    </div>
                    <p class="text-secondary small mb-4 italic">
                        "Clean UI, fast calculations, and real practical food that doesn't require 40 exotic ingredients. A must-have tool for sustainable wellness."
                    </p>
                    <div class="d-flex align-items-center gap-3 mt-auto">
                        <div class="bg-dark text-white rounded-circle fw-bold d-flex align-items-center justify-content-center" style="width: 40px; height: 40px;">
                            PS
                        </div>
                        <div>
                            <div class="fw-bold text-dark small">Priya Sharma</div>
                            <div class="text-muted small">Plant-Based Lifestyle</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</section>

<!-- Call to Action Banner -->
<section class="py-5 bg-dark text-white text-center position-relative">
    <div class="container py-4">
        <h2 class="display-6 fw-bold mb-3 text-white">Ready to Transform Your Nutrition Journey?</h2>
        <p class="lead text-secondary max-w-600 mx-auto mb-4">
            Take our 2-minute health questionnaire and receive your customized meal plans, macro targets, and personalized recipes right away.
        </p>
        <a href="<?= url('health-assessment.php') ?>" class="btn btn-success btn-lg rounded-pill px-5 py-3 shadow">
            Begin Free Health Assessment Now &rarr;
        </a>
    </div>
</section>

<?php require_once __DIR__ . '/includes/footer.php'; ?>
