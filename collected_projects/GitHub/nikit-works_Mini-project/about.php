<?php
/**
 * HealthyDiet — About Us & Scientific Nutrition Guidelines
 */

$pageTitle = "About Our Nutritional Science & Engine";
require_once __DIR__ . '/includes/header.php';
?>

<div class="bg-light py-5 border-bottom">
    <div class="container text-center">
        <h6 class="text-success text-uppercase fw-bold ls-1">Evidence-Based Wellness</h6>
        <h1 class="display-5 fw-bold text-dark mb-3">The Science Behind HealthyDiet</h1>
        <p class="lead text-secondary max-w-700 mx-auto">
            Discover how our personalized nutrition algorithms compute metabolic energy expenditure, balance macronutrients, and safeguard against food allergens.
        </p>
    </div>
</div>

<div class="container py-5">
    <!-- Mission & Approach -->
    <div class="row g-5 align-items-center mb-5">
        <div class="col-lg-6">
            <h2 class="fw-bold text-dark mb-3">Our Core Mission</h2>
            <p class="text-secondary">
                Nutrition is never one-size-fits-all. What fuels an endurance runner or bodybuilding enthusiast differs vastly from what optimizes cardiovascular health or gradual, healthy fat loss.
            </p>
            <p class="text-secondary">
                <strong>HealthyDiet</strong> bridges the gap between clinical nutrition research and everyday cooking. By integrating recognized metabolic formulas like the <strong>Mifflin-St Jeor Equation</strong> and dynamic allergy-filtering databases, we ensure every recipe presented on your plate serves your personal biology.
            </p>
            <div class="row g-3 pt-2">
                <div class="col-sm-6">
                    <div class="border rounded-4 p-3 bg-white shadow-sm">
                        <i class="fa-solid fa-calculator text-primary fs-4 mb-2"></i>
                        <h6 class="fw-bold text-dark mb-1">Mifflin-St Jeor BMR</h6>
                        <p class="text-muted small mb-0">Gold standard formula for clinical metabolic rate estimation.</p>
                    </div>
                </div>
                <div class="col-sm-6">
                    <div class="border rounded-4 p-3 bg-white shadow-sm">
                        <i class="fa-solid fa-shield-virus text-danger fs-4 mb-2"></i>
                        <h6 class="fw-bold text-dark mb-1">Zero-Allergen Filter</h6>
                        <p class="text-muted small mb-0">Strict automated isolation of peanuts, gluten, dairy, shellfish, and soy.</p>
                    </div>
                </div>
            </div>
        </div>
        <div class="col-lg-6">
            <div class="card border-0 rounded-4 shadow-lg p-4 bg-dark text-white">
                <div class="d-flex align-items-center gap-2 mb-3 text-success">
                    <i class="fa-solid fa-dna fs-4"></i>
                    <h5 class="fw-bold text-white mb-0">The Recommendation Algorithm</h5>
                </div>
                <p class="text-secondary small mb-4">
                    Our recommendation engine computes a dynamic composite score for every recipe in the food repository:
                </p>
                <div class="bg-secondary bg-opacity-10 rounded-3 p-3 mb-3 border border-secondary border-opacity-25 font-monospace small">
                    Score = (Dietary Compatibility × 40)<br>
                    &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;+ (Caloric Proximity to Meal Slot × 30)<br>
                    &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;+ (Goal Alignment Bonus × 25)<br>
                    &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;+ (Ingredient Preference Bonus × 15)<br>
                    &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;- (Allergen Conflict: Strict Exclude)
                </div>
                <p class="text-muted small mb-0">
                    * Recipes that violate user-stated food allergies (e.g., peanuts or dairy) receive an immediate hard exclusion and are never displayed in personalized recommendations.
                </p>
            </div>
        </div>
    </div>

    <!-- Supported Dietary Lifestyles -->
    <div class="mb-5">
        <div class="text-center mb-5">
            <h3 class="fw-bold text-dark">Supported Dietary Frameworks</h3>
            <p class="text-secondary">Explore how we curate balanced nutrition for diverse dietary lifestyles.</p>
        </div>

        <div class="row g-4">
            <div class="col-md-4">
                <div class="card h-100 p-4 border rounded-4 bg-white shadow-sm">
                    <div class="d-flex align-items-center gap-2 mb-2 text-success">
                        <i class="fa-solid fa-seedling fs-4"></i>
                        <h5 class="fw-bold text-dark mb-0">Pure Vegetarian</h5>
                    </div>
                    <p class="text-secondary small">
                        Packed with wholesome legumes, Indian paneer, lentils, Greek yogurt, and nutrient-dense greens to ensure high bioavailable protein without meat.
                    </p>
                </div>
            </div>
            <div class="col-md-4">
                <div class="card h-100 p-4 border rounded-4 bg-white shadow-sm">
                    <div class="d-flex align-items-center gap-2 mb-2 text-success">
                        <i class="fa-solid fa-leaf fs-4"></i>
                        <h5 class="fw-bold text-dark mb-0">100% Plant Vegan</h5>
                    </div>
                    <p class="text-secondary small">
                        Zero animal derivatives. Powered by tempeh, organic tofu, chia seeds, edamame, whole grains, and cold-pressed nut & seed dressings.
                    </p>
                </div>
            </div>
            <div class="col-md-4">
                <div class="card h-100 p-4 border rounded-4 bg-white shadow-sm">
                    <div class="d-flex align-items-center gap-2 mb-2 text-primary">
                        <i class="fa-solid fa-fish fs-4"></i>
                        <h5 class="fw-bold text-dark mb-0">Omega-3 Pescatarian</h5>
                    </div>
                    <p class="text-secondary small">
                        Incorporates wild-caught Atlantic salmon, Mediterranean sea bass, and ocean shrimp for anti-inflammatory EPA and DHA essential fats.
                    </p>
                </div>
            </div>
        </div>
    </div>
</div>

<?php require_once __DIR__ . '/includes/footer.php'; ?>
