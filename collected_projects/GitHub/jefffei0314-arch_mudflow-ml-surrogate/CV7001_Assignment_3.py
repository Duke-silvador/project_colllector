"""
Machine Learning Prediction of Mudflow Depth Profiles

Three outer held-out experiments: 50, 500, 2000 Pa.
Nested group-aware validation tunes both Polynomial Ridge and Random Forest.
The held-out yield stress is never used for model selection.

Place this script alongside the combined CSV and three reference CSV files.
Requires: pip install numpy pandas matplotlib scikit-learn
"""
from pathlib import Path
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from sklearn.base import clone
from sklearn.model_selection import GroupKFold, GridSearchCV
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler, PolynomialFeatures
from sklearn.linear_model import Ridge
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import r2_score, mean_squared_error, mean_absolute_error

BASE_DIR = Path(__file__).resolve().parent
DATA_FILE = BASE_DIR / 'quadratic_yieldstress_combined_9_cases.csv'
REFERENCE_FILES = {
    50: BASE_DIR / 'quadratic_50_clean.csv',
    500: BASE_DIR / 'quadratic_500_clean.csv',
    2000: BASE_DIR / 'quadratic_2000_clean.csv',
}
OUTPUT_DIR = BASE_DIR / 'ML_Results'
VALIDATION_DIR = OUTPUT_DIR / 'Validation'
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
VALIDATION_DIR.mkdir(parents=True, exist_ok=True)
X0, H0 = 305.0, 30.5
FEATURES = ['x_ratio', 'yield_stress']

# Change these lists to expand/reduce the hyperparameter search.
RIDGE_GRID = {
    'poly__degree': [2, 3, 4],
    'ridge__alpha': [0.01, 0.1, 1.0, 10.0, 100.0],
}
FOREST_GRID = {
    'rf__n_estimators': [100, 200],
    'rf__max_depth': [8, 12],
    'rf__min_samples_leaf': [1, 3],
}


def create_models():
    ridge = Pipeline([
        ('scale', StandardScaler()),
        ('poly', PolynomialFeatures(include_bias=False)),
        # Scale polynomial terms too, so alpha penalizes them comparably.
        ('poly_scale', StandardScaler()),
        ('ridge', Ridge()),
    ])
    forest = Pipeline([
        ('rf', RandomForestRegressor(random_state=42, n_jobs=1)),
    ])
    return {
        'Polynomial Ridge': (ridge, RIDGE_GRID),
        'Random Forest': (forest, FOREST_GRID),
    }


def calculate_metrics(y_true, y_pred):
    mse = mean_squared_error(y_true, y_pred)
    mae = mean_absolute_error(y_true, y_pred)
    return {
        'R2': r2_score(y_true, y_pred),
        'RMSE_h_ratio': np.sqrt(mse),
        'MAE_h_ratio': mae,
        'RMSE_m': np.sqrt(mse) * H0,
        'MAE_m': mae * H0,
    }


def plot_flow_profile(stress, x, actual, ridge, forest):
    fig, ax = plt.subplots(figsize=(10, 5.5))
    ax.plot(x, actual, color='tab:blue', linewidth=2.2, label='Numerical Simulation')
    ax.plot(x, ridge, color='tab:orange', linestyle='--', linewidth=1.8, label='Polynomial Ridge')
    ax.plot(x, forest, color='tab:green', linestyle='-.', linewidth=1.8, label='Random Forest')
    ax.set(title=f'Flow Depth Profile Comparison - Yield Stress = {stress} Pa',
           xlabel='Normalized Distance (x/x0)', ylabel='Normalized Flow Depth (h/h0)')
    ax.grid(True, alpha=0.3)
    ax.legend()
    fig.tight_layout()
    fig.savefig(OUTPUT_DIR / f'flow_profile_yieldstress_{stress}.png', dpi=300)
    plt.close(fig)


def plot_prediction_error(stress, x, actual, ridge, forest):
    fig, ax = plt.subplots(figsize=(10, 5.5))
    ax.axhline(0, color='black', linestyle=':', linewidth=1.2)
    ax.plot(x, ridge - actual, color='tab:orange', linewidth=1.8, label='Polynomial Ridge')
    ax.plot(x, forest - actual, color='tab:green', linewidth=1.8, label='Random Forest')
    ax.set(title=f'Prediction Error - Yield Stress = {stress} Pa',
           xlabel='Normalized Distance (x/x0)', ylabel='Signed Error in Normalized Flow Depth')
    ax.grid(True, alpha=0.3)
    ax.legend()
    fig.tight_layout()
    fig.savefig(OUTPUT_DIR / f'prediction_error_yieldstress_{stress}.png', dpi=300)
    plt.close(fig)


def validate_model(model_name, estimator, grid, X_train, y_train, groups, stress):
    """Tune with group-held-out CV; aggregate error equally over stress cases."""
    unique_groups = np.unique(groups)
    if len(unique_groups) < 2:
        raise ValueError('At least two distinct training stresses are needed for validation.')

    # With <= 8 training stress cases this becomes leave-one-stress-out CV.
    cv = GroupKFold(n_splits=len(unique_groups))
    search = GridSearchCV(
        estimator=estimator,
        param_grid=grid,
        scoring='neg_mean_squared_error',
        cv=cv,
        refit=True,
        n_jobs=-1,
        return_train_score=False,
        error_score='raise',
    )
    search.fit(X_train, y_train, groups=groups)

    # Full hyperparameter search results for transparency.
    cv_results = pd.DataFrame(search.cv_results_)
    cv_results['validation_RMSE_m'] = np.sqrt(-cv_results['mean_test_score']) * H0
    cv_results['validation_RMSE_std_m'] = cv_results['std_test_score']  # std is in MSE units; see column label below
    cv_results = cv_results.drop(columns=['validation_RMSE_std_m'])
    safe_name = 'ridge' if model_name == 'Polynomial Ridge' else 'random_forest'
    cv_results.to_csv(VALIDATION_DIR / f'{safe_name}_grid_search_test_{stress}.csv', index=False)

    # Produce out-of-fold predictions using the selected hyperparameters.
    # These are diagnostics for the selected configuration; their scores are
    # not an unbiased nested-CV estimate because tuning used the same folds.
    fold_rows = []
    oof_rows = []
    for fold, (idx_fit, idx_val) in enumerate(cv.split(X_train, y_train, groups), start=1):
        fitted = clone(search.best_estimator_)
        fitted.fit(X_train.iloc[idx_fit], y_train.iloc[idx_fit])
        pred = np.clip(fitted.predict(X_train.iloc[idx_val]), 0, None)
        actual = y_train.iloc[idx_val].to_numpy()
        held_out_group = float(np.unique(groups[idx_val])[0])
        metrics = calculate_metrics(actual, pred)
        fold_rows.append({
            'outer_test_stress_Pa': stress,
            'model': model_name,
            'validation_fold': fold,
            'validation_stress_Pa': held_out_group,
            'validation_points': len(idx_val),
            **metrics,
        })
        oof_rows.append(pd.DataFrame({
            'outer_test_stress_Pa': stress,
            'model': model_name,
            'validation_stress_Pa': held_out_group,
            'x_ratio': X_train.iloc[idx_val]['x_ratio'].to_numpy(),
            'actual_h_ratio': actual,
            'predicted_h_ratio': pred,
            'error_h_ratio': pred - actual,
        }))

    pd.DataFrame(fold_rows).to_csv(
        VALIDATION_DIR / f'{safe_name}_validation_folds_test_{stress}.csv', index=False
    )
    pd.concat(oof_rows, ignore_index=True).to_csv(
        VALIDATION_DIR / f'{safe_name}_validation_predictions_test_{stress}.csv', index=False
    )
    # The search selects hyperparameters by mean validation MSE, before clipping.
    # The selected configuration is refit on all outer-training cases by GridSearchCV.
    print(f'  Best parameters: {search.best_params_}')
    print(f'  Mean CV RMSE (m): {np.sqrt(-search.best_score_) * H0:.5f}')
    return search.best_estimator_, {
        'yield_stress_Pa': stress,
        'model': model_name,
        'validation_method': f'GroupKFold ({len(unique_groups)} folds)',
        'validation_RMSE_m': np.sqrt(-search.best_score_) * H0,
        'best_parameters': str(search.best_params_),
    }


def main():
    if not DATA_FILE.exists():
        raise FileNotFoundError(f'Combined dataset not found: {DATA_FILE}')
    df = pd.read_csv(DATA_FILE)
    for col in ['yield_stress', 'x', 'flow_depth']:
        if col not in df.columns:
            raise ValueError(f'Missing column in combined dataset: {col}')
    if df[['yield_stress', 'x', 'flow_depth']].isna().any().any():
        raise ValueError('Combined dataset contains missing values.')
    df['x_ratio'] = df['x'] / X0
    df['h_ratio'] = df['flow_depth'] / H0
    print('=' * 65)
    print('MACHINE LEARNING MUDFLOW DEPTH PREDICTION')
    print('Available yield stresses:', sorted(df['yield_stress'].unique().tolist()))
    print('Total data points:', len(df))
    summary, validation_summary = [], []

    for stress, reference_file in REFERENCE_FILES.items():
        print('\n' + '=' * 65)
        print(f'OUTER HELD-OUT TEST: {stress} Pa')
        print('=' * 65)
        mask = np.isclose(df['yield_stress'].to_numpy(), stress)
        train, held_out = df.loc[~mask].copy(), df.loc[mask].copy()
        if held_out.empty:
            raise ValueError(f'No held-out data for {stress} Pa')
        if np.isclose(train['yield_stress'].to_numpy(), stress).any():
            raise ValueError('Test data leakage detected.')
        if not reference_file.exists():
            raise FileNotFoundError(f'Reference file not found: {reference_file}')
        reference = pd.read_csv(reference_file)
        for col in ['x', 'flow_depth']:
            if col not in reference.columns:
                raise ValueError(f'{reference_file.name} missing {col}')
        if 'yield_stress' in reference.columns and not np.isclose(
            reference['yield_stress'].to_numpy(), stress
        ).all():
            raise ValueError(f'Wrong yield stress in {reference_file.name}')
        reference['x_ratio'] = reference['x'] / X0
        reference['h_ratio'] = reference['flow_depth'] / H0
        reference = reference.sort_values('x_ratio').reset_index(drop=True)
        check = held_out.sort_values('x').reset_index(drop=True)
        if len(check) != len(reference):
            raise ValueError(f'Point count mismatch at {stress} Pa')
        if not np.allclose(check['x'], reference['x'], atol=1e-8, rtol=0):
            raise ValueError(f'Spatial grid mismatch at {stress} Pa')
        max_difference = np.max(np.abs(check['flow_depth'] - reference['flow_depth']))
        if not np.allclose(check['flow_depth'], reference['flow_depth'], atol=1e-8, rtol=0):
            raise ValueError(f'Depth mismatch at {stress} Pa: {max_difference}')
        print(f'Reference verified; maximum depth difference = {max_difference:.3g} m')

        X_train, y_train = train[FEATURES], train['h_ratio']
        groups = train['yield_stress'].to_numpy()
        X_test = pd.DataFrame({
            'x_ratio': reference['x_ratio'].to_numpy(),
            'yield_stress': np.full(len(reference), float(stress)),
        })
        y_true = reference['h_ratio'].to_numpy()
        x_plot = reference['x_ratio'].to_numpy()
        print('Training stresses:', sorted(train['yield_stress'].unique().tolist()))
        print(f'Training points: {len(train)}; test points: {len(reference)}')

        predictions = {}
        for name, (estimator, grid) in create_models().items():
            print(f'\nVALIDATING {name} ...')
            best_model, validation_row = validate_model(
                name, estimator, grid, X_train, y_train, groups, stress
            )
            validation_summary.append(validation_row)
            # GridSearchCV has already retrained best_model on all training data.
            pred = np.clip(best_model.predict(X_test), 0, None)
            predictions[name] = pred
            metrics = calculate_metrics(y_true, pred)
            summary.append({
                'yield_stress_Pa': stress,
                'model': name,
                'training_points': len(train),
                'testing_points': len(reference),
                **metrics,
            })
            print(f'FINAL TEST {name}: R2={metrics["R2"]:.5f}, '
                  f'RMSE={metrics["RMSE_m"]:.5f} m, MAE={metrics["MAE_m"]:.5f} m')

        ridge, forest = predictions['Polynomial Ridge'], predictions['Random Forest']
        comparison = pd.DataFrame({
            'yield_stress_Pa': stress,
            'x_m': reference['x'].to_numpy(),
            'x_ratio': x_plot,
            'Numerical_Simulation_h_ratio': y_true,
            'Polynomial_Ridge_h_ratio': ridge,
            'Random_Forest_h_ratio': forest,
            'Numerical_Simulation_depth_m': y_true * H0,
            'Polynomial_Ridge_depth_m': ridge * H0,
            'Random_Forest_depth_m': forest * H0,
            'Polynomial_Ridge_error_h_ratio': ridge - y_true,
            'Random_Forest_error_h_ratio': forest - y_true,
        })
        comparison.to_csv(OUTPUT_DIR / f'comparison_yieldstress_{stress}.csv', index=False)
        plot_flow_profile(stress, x_plot, y_true, ridge, forest)
        plot_prediction_error(stress, x_plot, y_true, ridge, forest)

    summary_df = pd.DataFrame(summary)
    summary_df.to_csv(OUTPUT_DIR / 'model_performance_summary.csv', index=False)
    validation_df = pd.DataFrame(validation_summary)
    validation_df.to_csv(VALIDATION_DIR / 'validation_summary.csv', index=False)
    print('\n' + '=' * 65)
    print('FINAL HELD-OUT TEST PERFORMANCE')
    print(summary_df[['yield_stress_Pa', 'model', 'R2', 'RMSE_m', 'MAE_m']].to_string(index=False))
    print('\nVALIDATION PERFORMANCE (TRAINING CASES ONLY)')
    print(validation_df[['yield_stress_Pa', 'model', 'validation_RMSE_m', 'best_parameters']].to_string(index=False))
    print(f'\nResults saved to: {OUTPUT_DIR}')
    print('Six PNG graphs and four original CSV outputs generated.')
    print('Additional validation CSVs saved to ML_Results/Validation.')
    print('No graph windows were opened.')


if __name__ == '__main__':
    main()
