"""Inference using the validated CV7001 mudflow models.

Place alongside quadratic_yieldstress_combined_9_cases.csv.
Requires ML_Results/Validation/validation_summary.csv from the main script.
Example: python ML_Inference_Demo_Updated.py --stress 500 --x 610
"""
from pathlib import Path
import argparse
import ast
import numpy as np
import pandas as pd
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler, PolynomialFeatures
from sklearn.linear_model import Ridge
from sklearn.ensemble import RandomForestRegressor

BASE_DIR = Path(__file__).resolve().parent
DATA_FILE = BASE_DIR / 'quadratic_yieldstress_combined_9_cases.csv'
VALIDATION_FILE = BASE_DIR / 'ML_Results' / 'Validation' / 'validation_summary.csv'
X0, H0 = 305.0, 30.5
FEATURES = ['x_ratio', 'yield_stress']
TEST_STRESSES = (50, 500, 2000)


def validated_parameters(summary, stress, model_name):
    rows = summary.loc[
        np.isclose(summary['yield_stress_Pa'].astype(float), stress)
        & summary['model'].eq(model_name)
    ]
    if len(rows) != 1:
        raise ValueError(f'Expected one validation row for {stress:g} Pa / {model_name}; found {len(rows)}')
    params = ast.literal_eval(rows.iloc[0]['best_parameters'])
    if not isinstance(params, dict):
        raise ValueError('Validation parameters must be a dictionary.')
    return params


def main():
    parser = argparse.ArgumentParser(description='Infer mudflow depth using validated held-out models.')
    parser.add_argument('--stress', type=float, default=500.0, help='Held-out yield stress: 50, 500 or 2000 Pa')
    parser.add_argument('--x', type=float, default=610.0, help='Spatial coordinate (m)')
    args = parser.parse_args()
    stress, x = args.stress, args.x
    if not np.isfinite(stress) or not np.isfinite(x):
        parser.error('Inputs must be finite.')
    if stress not in TEST_STRESSES:
        parser.error('Choose a validated held-out stress: 50, 500 or 2000 Pa.')
    if x < 0:
        parser.error('Spatial coordinate must be nonnegative.')
    for path in (DATA_FILE, VALIDATION_FILE):
        if not path.is_file():
            raise FileNotFoundError(f'Missing required file: {path}')

    df = pd.read_csv(DATA_FILE)
    required = {'yield_stress', 'x', 'flow_depth'}
    if not required.issubset(df.columns):
        raise ValueError(f'Missing dataset columns: {sorted(required - set(df.columns))}')
    if df[list(required)].isna().any().any():
        raise ValueError('Dataset contains missing values.')
    df['x_ratio'] = df['x'] / X0
    df['h_ratio'] = df['flow_depth'] / H0
    held_out_mask = np.isclose(df['yield_stress'].to_numpy(), stress)
    if not held_out_mask.any():
        raise ValueError(f'No {stress:g} Pa profile exists in the dataset.')
    train = df.loc[~held_out_mask]
    if train.empty:
        raise ValueError('Training data are empty.')
    X_train, y_train = train[FEATURES], train['h_ratio']
    X_new = pd.DataFrame({'x_ratio': [x / X0], 'yield_stress': [stress]})
    summary = pd.read_csv(VALIDATION_FILE)
    for col in ('yield_stress_Pa', 'model', 'best_parameters'):
        if col not in summary.columns:
            raise ValueError(f'Missing validation summary column: {col}')

    ridge_params = validated_parameters(summary, stress, 'Polynomial Ridge')
    forest_params = validated_parameters(summary, stress, 'Random Forest')

    ridge = Pipeline([
        ('scale', StandardScaler()),
        ('poly', PolynomialFeatures(include_bias=False)),
        ('poly_scale', StandardScaler()),
        ('ridge', Ridge()),
    ])
    ridge.set_params(**ridge_params)
    forest = Pipeline([
        ('rf', RandomForestRegressor(random_state=42, n_jobs=1)),
    ])
    forest.set_params(**forest_params)

    print('=' * 60)
    print('VALIDATED MUDFLOW DEPTH INFERENCE DEMONSTRATION')
    print('=' * 60)
    print(f'Excluded test stress: {stress:g} Pa')
    print(f'Training points: {len(train):,}')
    print(f'Training stresses: {sorted(train["yield_stress"].unique().tolist())}')
    print(f'Position: x = {x:.3f} m (x/x0 = {x / X0:.6f})')

    for name, model, params in (
        ('Polynomial Ridge', ridge, ridge_params),
        ('Random Forest', forest, forest_params),
    ):
        print(f'\nTraining {name} with validated parameters: {params}')
        model.fit(X_train, y_train)
        h_ratio = max(float(model.predict(X_new)[0]), 0.0)
        print(f'  Predicted normalized depth (h/h0): {h_ratio:.6f}')
        print(f'  Predicted depth (m): {h_ratio * H0:.6f}')

    print('\nInference completed successfully.')


if __name__ == '__main__':
    main()
