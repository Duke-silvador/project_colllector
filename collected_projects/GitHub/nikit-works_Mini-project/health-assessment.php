<?php
/**
 * HealthyDiet — Health & Nutritional Assessment Questionnaire
 */

require_once __DIR__ . '/includes/auth.php';
require_once __DIR__ . '/includes/functions.php';

require_login();

$user = current_user();
$db = getDB();

$pageTitle = "Personalized Health & Nutrition Assessment";
$errors = [];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!verify_csrf()) {
        $errors[] = 'Invalid security token. Please try again.';
    } else {
        $age = (int)($_POST['age'] ?? 0);
        $gender = in_array($_POST['gender'] ?? '', ['male', 'female', 'other']) ? $_POST['gender'] : 'female';
        $heightCm = (float)($_POST['height_cm'] ?? 0);
        $weightKg = (float)($_POST['weight_kg'] ?? 0);
        $activityLevel = in_array($_POST['activity_level'] ?? '', ['sedentary', 'lightly_active', 'moderately_active', 'very_active', 'extremely_active']) ? $_POST['activity_level'] : 'moderately_active';
        $goal = in_array($_POST['goal'] ?? '', ['weight_loss', 'weight_gain', 'muscle_gain', 'weight_maintenance', 'healthy_eating']) ? $_POST['goal'] : 'healthy_eating';
        $dietaryPref = in_array($_POST['dietary_preference'] ?? '', ['vegetarian', 'vegan', 'non_vegetarian', 'eggetarian', 'pescatarian']) ? $_POST['dietary_preference'] : 'vegetarian';
        
        $allergiesArr = $_POST['allergies'] ?? [];
        $allergies = is_array($allergiesArr) ? implode(',', array_map('sanitize_string', $allergiesArr)) : '';
        $medicalRestrictions = sanitize_string($_POST['medical_restrictions'] ?? 'None');
        $favoriteFoods = sanitize_string($_POST['favorite_foods'] ?? '');
        $foodsToAvoid = sanitize_string($_POST['foods_to_avoid'] ?? '');

        if ($age < 12 || $age > 120) {
            $errors[] = 'Please specify a valid age (12-120).';
        }
        if ($heightCm < 80 || $heightCm > 250) {
            $errors[] = 'Please enter a valid height in cm (80-250 cm).';
        }
        if ($weightKg < 25 || $weightKg > 350) {
            $errors[] = 'Please enter a valid weight in kg (25-350 kg).';
        }

        if (empty($errors)) {
            // 1. Calculate BMI
            $bmiData = calculate_bmi($weightKg, $heightCm);
            
            // 2. Calculate TDEE & Nutrition Targets
            $targets = calculate_nutrition_targets($gender, $age, $heightCm, $weightKg, $activityLevel, $goal);

            if ($db) {
                try {
                    $db->beginTransaction();

                    // Upsert user profile
                    $stmt = $db->prepare("
                        INSERT INTO user_profiles (
                            user_id, age, gender, height_cm, weight_kg, activity_level, 
                            goal, dietary_preference, allergies, medical_restrictions, 
                            favorite_foods, foods_to_avoid, calculated_bmi, bmi_category, 
                            daily_calories_target, target_protein_g, target_carbs_g, target_fat_g
                        ) VALUES (
                            ?, ?, ?, ?, ?, ?, 
                            ?, ?, ?, ?, 
                            ?, ?, ?, ?, 
                            ?, ?, ?, ?
                        )
                        ON DUPLICATE KEY UPDATE
                            age = VALUES(age),
                            gender = VALUES(gender),
                            height_cm = VALUES(height_cm),
                            weight_kg = VALUES(weight_kg),
                            activity_level = VALUES(activity_level),
                            goal = VALUES(goal),
                            dietary_preference = VALUES(dietary_preference),
                            allergies = VALUES(allergies),
                            medical_restrictions = VALUES(medical_restrictions),
                            favorite_foods = VALUES(favorite_foods),
                            foods_to_avoid = VALUES(foods_to_avoid),
                            calculated_bmi = VALUES(calculated_bmi),
                            bmi_category = VALUES(bmi_category),
                            daily_calories_target = VALUES(daily_calories_target),
                            target_protein_g = VALUES(target_protein_g),
                            target_carbs_g = VALUES(target_carbs_g),
                            target_fat_g = VALUES(target_fat_g),
                            updated_at = NOW()
                    ");
                    
                    $stmt->execute([
                        $user['id'], $age, $gender, $heightCm, $weightKg, $activityLevel,
                        $goal, $dietaryPref, $allergies, $medicalRestrictions,
                        $favoriteFoods, $foodsToAvoid, $bmiData['bmi'], $bmiData['category'],
                        $targets['daily_calories'], $targets['protein_g'], $targets['carbs_g'], $targets['fat_g']
                    ]);

                    // Add / update today's progress log
                    $logStmt = $db->prepare("
                        INSERT INTO progress_logs (user_id, log_date, weight_kg, bmi, notes)
                        VALUES (?, CURDATE(), ?, ?, 'Health profile updated')
                        ON DUPLICATE KEY UPDATE weight_kg = VALUES(weight_kg), bmi = VALUES(bmi)
                    ");
                    $logStmt->execute([$user['id'], $weightKg, $bmiData['bmi']]);

                    $db->commit();

                    set_flash('success', 'Health assessment updated successfully! Your customized meal recommendations are ready below.');
                    header('Location: ' . url('recommendations.php'));
                    exit;
                } catch (PDOException $e) {
                    if ($db->inTransaction()) {
                        $db->rollBack();
                    }
                    $errors[] = 'Failed to save health profile: ' . $e->getMessage();
                }
            }
        }
    }
}

// Current values from profile or defaults
$currentAge = $user['age'] ?: 26;
$currentGender = $user['gender'] ?: 'female';
$currentHeight = $user['height_cm'] ?: 165;
$currentWeight = $user['weight_kg'] ?: 65;
$currentActivity = $user['activity_level'] ?: 'moderately_active';
$currentGoal = $user['goal'] ?: 'weight_loss';
$currentDiet = $user['dietary_preference'] ?: 'vegetarian';
$userAllergies = array_filter(array_map('trim', explode(',', strtolower($user['allergies'] ?? ''))));

require_once __DIR__ . '/includes/header.php';
?>

<div class="bg-light py-5 border-bottom">
    <div class="container text-center">
        <h6 class="text-success text-uppercase fw-bold ls-1">Precision Biology</h6>
        <h1 class="display-5 fw-bold text-dark mb-2">Health & Nutritional Assessment</h1>
        <p class="lead text-secondary max-w-650 mx-auto">
            Answer a few quick questions to allow our recommendation algorithm to calibrate your BMI, BMR, daily caloric expenditure, and macro splits.
        </p>
    </div>
</div>

<div class="container py-5">
    <?php if (!empty($errors)): ?>
        <div class="alert alert-danger rounded-4 shadow-sm p-4 mb-4">
            <h6 class="fw-bold mb-2"><i class="fa-solid fa-triangle-exclamation me-1"></i> Please correct the following:</h6>
            <ul class="mb-0 ps-3">
                <?php foreach ($errors as $err): ?>
                    <li><?= e($err) ?></li>
                <?php endforeach; ?>
            </ul>
        </div>
    <?php endif; ?>

    <form method="POST" action="<?= url('health-assessment.php') ?>" class="needs-validation" novalidate>
        <input type="hidden" name="csrf_token" value="<?= csrf_token() ?>">

        <div class="row g-5">
            <!-- Left: Questionnaire Form -->
            <div class="col-lg-8">
                <!-- Section 1: Biometrics -->
                <div class="card border-0 rounded-4 shadow-sm p-4 p-md-5 bg-white mb-4">
                    <div class="d-flex align-items-center gap-2 mb-4">
                        <div class="bg-success-subtle text-success rounded-circle p-2 fs-5">
                            <i class="fa-solid fa-person-running"></i>
                        </div>
                        <h4 class="fw-bold text-dark mb-0">1. Body & Personal Metrics</h4>
                    </div>

                    <div class="row g-3">
                        <div class="col-sm-6 col-md-3">
                            <label class="form-label fw-semibold small text-secondary">Age (Years) *</label>
                            <input type="number" id="calcAge" name="age" class="form-control" value="<?= e($currentAge) ?>" min="12" max="120" required>
                        </div>
                        <div class="col-sm-6 col-md-3">
                            <label class="form-label fw-semibold small text-secondary">Biological Gender *</label>
                            <select id="calcGender" name="gender" class="form-select" required>
                                <option value="female" <?= $currentGender === 'female' ? 'selected' : '' ?>>Female</option>
                                <option value="male" <?= $currentGender === 'male' ? 'selected' : '' ?>>Male</option>
                                <option value="other" <?= $currentGender === 'other' ? 'selected' : '' ?>>Other</option>
                            </select>
                        </div>
                        <div class="col-sm-6 col-md-3">
                            <label class="form-label fw-semibold small text-secondary">Height (cm) *</label>
                            <div class="input-group">
                                <input type="number" id="calcHeight" name="height_cm" class="form-control" value="<?= e($currentHeight) ?>" min="80" max="250" step="0.5" required>
                                <span class="input-group-text bg-light small">cm</span>
                            </div>
                        </div>
                        <div class="col-sm-6 col-md-3">
                            <label class="form-label fw-semibold small text-secondary">Weight (kg) *</label>
                            <div class="input-group">
                                <input type="number" id="calcWeight" name="weight_kg" class="form-control" value="<?= e($currentWeight) ?>" min="25" max="350" step="0.1" required>
                                <span class="input-group-text bg-light small">kg</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Section 2: Lifestyle & Goals -->
                <div class="card border-0 rounded-4 shadow-sm p-4 p-md-5 bg-white mb-4">
                    <div class="d-flex align-items-center gap-2 mb-4">
                        <div class="bg-primary-subtle text-primary rounded-circle p-2 fs-5">
                            <i class="fa-solid fa-bullseye"></i>
                        </div>
                        <h4 class="fw-bold text-dark mb-0">2. Activity & Primary Goal</h4>
                    </div>

                    <div class="row g-4">
                        <div class="col-md-6">
                            <label class="form-label fw-semibold small text-secondary">Daily Physical Activity *</label>
                            <select id="calcActivity" name="activity_level" class="form-select" required>
                                <option value="sedentary" <?= $currentActivity === 'sedentary' ? 'selected' : '' ?>>Sedentary (Little or no exercise)</option>
                                <option value="lightly_active" <?= $currentActivity === 'lightly_active' ? 'selected' : '' ?>>Lightly Active (1-3 days/week)</option>
                                <option value="moderately_active" <?= $currentActivity === 'moderately_active' ? 'selected' : '' ?>>Moderately Active (3-5 days/week)</option>
                                <option value="very_active" <?= $currentActivity === 'very_active' ? 'selected' : '' ?>>Very Active (6-7 days/week intense)</option>
                                <option value="extremely_active" <?= $currentActivity === 'extremely_active' ? 'selected' : '' ?>>Extremely Active (Athletic/Hard labor)</option>
                            </select>
                        </div>
                        <div class="col-md-6">
                            <label class="form-label fw-semibold small text-secondary">Primary Nutrition Goal *</label>
                            <select id="calcGoal" name="goal" class="form-select" required>
                                <option value="weight_loss" <?= $currentGoal === 'weight_loss' ? 'selected' : '' ?>>🔥 Weight Loss & Fat Burn (-450 kcal)</option>
                                <option value="muscle_gain" <?= $currentGoal === 'muscle_gain' ? 'selected' : '' ?>>💪 Muscle Hypertrophy & Strength (+300 kcal)</option>
                                <option value="weight_maintenance" <?= $currentGoal === 'weight_maintenance' ? 'selected' : '' ?>>⚖️ Weight Maintenance (TDEE balance)</option>
                                <option value="healthy_eating" <?= $currentGoal === 'healthy_eating' ? 'selected' : '' ?>>🥗 General Longevity & Vitality</option>
                                <option value="weight_gain" <?= $currentGoal === 'weight_gain' ? 'selected' : '' ?>>📈 Caloric Surplus Weight Gain (+450 kcal)</option>
                            </select>
                        </div>
                    </div>
                </div>

                <!-- Section 3: Dietary Preferences & Allergies -->
                <div class="card border-0 rounded-4 shadow-sm p-4 p-md-5 bg-white mb-4">
                    <div class="d-flex align-items-center gap-2 mb-4">
                        <div class="bg-warning-subtle text-warning-emphasis rounded-circle p-2 fs-5">
                            <i class="fa-solid fa-utensils"></i>
                        </div>
                        <h4 class="fw-bold text-dark mb-0">3. Dietary Lifestyle & Allergies</h4>
                    </div>

                    <div class="mb-4">
                        <label class="form-label fw-semibold small text-secondary">Dietary Framework *</label>
                        <div class="row g-3">
                            <?php
                            $dietOptions = [
                                'vegetarian'     => ['🌱 Vegetarian', 'No meat or poultry; includes dairy and plant proteins.'],
                                'vegan'          => ['🥦 100% Vegan', 'Exclusively plant-based; no dairy, eggs, or animal derivatives.'],
                                'eggetarian'     => ['🥚 Eggetarian', 'Vegetarian nutrition supplemented with whole eggs & whites.'],
                                'pescatarian'    => ['🐟 Pescatarian', 'Plant foods plus ocean seafood & omega-3 fish.'],
                                'non_vegetarian' => ['🍗 Non-Vegetarian', 'Full flexibility including lean poultry, fish, and meats.']
                            ];
                            foreach ($dietOptions as $val => $info):
                            ?>
                                <div class="col-md-6">
                                    <label class="card p-3 border rounded-3 h-100 cursor-pointer <?= $currentDiet === $val ? 'border-success bg-success-subtle bg-opacity-25' : '' ?>">
                                        <div class="form-check">
                                            <input class="form-check-input" type="radio" name="dietary_preference" value="<?= $val ?>" <?= $currentDiet === $val ? 'checked' : '' ?> required>
                                            <span class="form-check-label fw-bold text-dark"><?= $info[0] ?></span>
                                        </div>
                                        <div class="text-secondary small mt-1 ps-4"><?= $info[1] ?></div>
                                    </label>
                                </div>
                            <?php endforeach; ?>
                        </div>
                    </div>

                    <!-- Allergen Strict Checklist -->
                    <div class="mb-4">
                        <label class="form-label fw-semibold small text-secondary">
                            Strict Food Allergens <span class="badge bg-danger-subtle text-danger ms-1">Hard Filter</span>
                        </label>
                        <p class="text-muted small mb-2">Check any foods our recommendation algorithm must <strong>never</strong> recommend:</p>
                        
                        <div class="row g-2">
                            <?php
                            $allergensList = [
                                'peanuts'   => 'Peanuts',
                                'tree-nuts' => 'Tree Nuts (Almonds/Walnuts)',
                                'dairy'     => 'Dairy / Lactose',
                                'gluten'    => 'Gluten / Wheat',
                                'shellfish' => 'Shellfish',
                                'eggs'      => 'Eggs',
                                'soy'       => 'Soybeans / Tofu',
                                'sesame'    => 'Sesame'
                            ];
                            foreach ($allergensList as $key => $label):
                                $checked = in_array($key, $userAllergies) ? 'checked' : '';
                            ?>
                                <div class="col-sm-6 col-md-3">
                                    <div class="form-check bg-light p-2 rounded-3 border">
                                        <input class="form-check-input ms-0 me-2" type="checkbox" name="allergies[]" value="<?= $key ?>" id="allergy_<?= $key ?>" <?= $checked ?>>
                                        <label class="form-check-label small fw-semibold text-dark" for="allergy_<?= $key ?>">
                                            <?= $label ?>
                                        </label>
                                    </div>
                                </div>
                            <?php endforeach; ?>
                        </div>
                    </div>

                    <!-- Food Likes & Dislikes -->
                    <div class="row g-3">
                        <div class="col-md-6">
                            <label class="form-label fw-semibold small text-secondary">Favorite Foods / Ingredients (Bonus points)</label>
                            <input type="text" name="favorite_foods" class="form-control" placeholder="e.g. Paneer, Quinoa, Avocados, Berries" value="<?= e($user['favorite_foods'] ?? '') ?>">
                            <span class="text-muted small">Comma-separated list</span>
                        </div>
                        <div class="col-md-6">
                            <label class="form-label fw-semibold small text-secondary">Foods to Avoid / Dislikes</label>
                            <input type="text" name="foods_to_avoid" class="form-control" placeholder="e.g. Mushrooms, Spicy foods, Raw onions" value="<?= e($user['foods_to_avoid'] ?? '') ?>">
                            <span class="text-muted small">Comma-separated list</span>
                        </div>
                    </div>
                </div>

                <div class="text-end">
                    <button type="submit" class="btn btn-success btn-lg rounded-pill px-5 shadow fw-bold">
                        <i class="fa-solid fa-sparkles me-2"></i>Save Assessment & Generate Recommendations &rarr;
                    </button>
                </div>
            </div>

            <!-- Right: Real-time Scientific Calibration Sidebar -->
            <div class="col-lg-4">
                <div class="sticky-top" style="top: 90px;">
                    <div class="card border-0 rounded-4 shadow-sm p-4 bg-white mb-4">
                        <div class="d-flex align-items-center gap-2 mb-3">
                            <i class="fa-solid fa-microchip text-success fs-5"></i>
                            <h5 class="fw-bold text-dark mb-0">Live Calibration</h5>
                        </div>

                        <!-- Live BMI Widget -->
                        <div class="bg-light rounded-4 p-3 mb-3 border text-center">
                            <span class="text-secondary small d-block">Estimated BMI</span>
                            <div class="display-6 fw-bold text-dark my-1" id="calcBmiValue">23.5</div>
                            <span id="calcBmiCategory" class="badge bg-success rounded-pill px-3 py-1 mb-2">Normal Weight</span>
                            <div class="progress" style="height: 6px;">
                                <div id="calcBmiBar" class="progress-bar bg-success" style="width: 58%;"></div>
                            </div>
                        </div>

                        <!-- Daily Calorie Target Display -->
                        <div class="bg-success-subtle p-3 rounded-4 border border-success-subtle mb-3">
                            <span class="text-success-emphasis small d-block mb-1">Target Daily Energy Expenditure:</span>
                            <div class="fs-4 fw-extrabold text-success">
                                <span id="calcTargetCalories">2,150</span> <span class="fs-6 font-normal">kcal / day</span>
                            </div>
                            <div class="d-flex justify-content-between text-muted small mt-2 pt-2 border-top border-success-subtle">
                                <span>Basal Rate (BMR):</span>
                                <span id="calcBmrValue" class="fw-semibold">1,450 kcal</span>
                            </div>
                            <div class="d-flex justify-content-between text-muted small mt-1">
                                <span>Total Energy (TDEE):</span>
                                <span id="calcTdeeValue" class="fw-semibold">2,250 kcal</span>
                            </div>
                        </div>

                        <!-- Recommendation Engine Summary Box -->
                        <div class="small text-secondary">
                            <div class="d-flex align-items-center gap-2 mb-1 text-dark fw-semibold">
                                <i class="fa-solid fa-shield-check text-success"></i> Strict Safety Guarantee
                            </div>
                            <p class="mb-0" style="font-size: 0.82rem;">
                                Selected allergens will be completely excluded from your recommendations and meal planning calculations.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </form>
</div>

<?php require_once __DIR__ . '/includes/footer.php'; ?>
