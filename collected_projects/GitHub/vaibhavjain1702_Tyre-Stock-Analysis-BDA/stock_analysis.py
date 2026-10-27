import os
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.model_selection import TimeSeriesSplit
from sklearn.preprocessing import MinMaxScaler, StandardScaler
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
from sklearn.linear_model import LinearRegression, Ridge, Lasso, ElasticNet
from sklearn.ensemble import RandomForestRegressor, ExtraTreesRegressor, GradientBoostingRegressor
import joblib

# =====================
# 1) DATA LOADING
# =====================

def load_data():
    print("[1/4] Loading tyre stock data…")
    df = pd.read_csv('tyre_stock_data.csv')
    df['Date'] = pd.to_datetime(df['Date'])
    companies = df['Company'].unique()
    print(f"  - Rows: {len(df)}, Cols: {df.shape[1]}, Companies: {len(companies)} -> {list(companies)}")
    print("  - Date range:", df['Date'].min().date(), "to", df['Date'].max().date())
    print("  - Missing values (total):", int(df.isnull().sum().sum()))
    return df

# =====================
# 2) PREPROCESSING & FEATURES
# =====================

def preprocess_data(df):
    print("[2/4] Preprocessing & feature engineering…")
    df = df.copy()
    if df.isnull().sum().sum() > 0:
        df = df.fillna(method='ffill')

    frames = []
    for c in df['Company'].unique():
        d = df[df['Company'] == c].copy().sort_values('Date')
        d['MA_5'] = d['Close'].rolling(5).mean()
        d['MA_20'] = d['Close'].rolling(20).mean()
        d['MA_50'] = d['Close'].rolling(50).mean()
        d['Daily_Return'] = d['Close'].pct_change() * 100
        d['Volatility_20'] = d['Daily_Return'].rolling(20).std()
        d['Volume_MA_5'] = d['Volume'].rolling(5).mean()
        # Next-day log return target (%) to predict
        d['Next_LogReturn'] = (np.log(d['Close']).shift(-1) - np.log(d['Close'])) * 100.0
        frames.append(d)
    out = pd.concat(frames)
    print("  - Added features: MA_5, MA_20, MA_50, Daily_Return, Volatility_20, Volume_MA_5")
    return out

# =====================
# 3) VISUALS
# =====================

def visualize_stock_data(df):
    print("[3/4] Creating key visualizations…")
    os.makedirs('plots', exist_ok=True)

    # Closing prices overview
    plt.figure(figsize=(12, 6))
    for company in df['Company'].unique():
        d = df[df['Company'] == company]
        plt.plot(d['Date'], d['Close'], label=company)
    plt.title('Stock Closing Prices Over Time')
    plt.xlabel('Date'); plt.ylabel('Closing Price (₹)'); plt.legend(); plt.grid(True)
    plt.tight_layout(); plt.savefig('plots/closing_prices.png')
    print("  - Saved: plots/closing_prices.png")

    # Per-company moving averages
    for company in df['Company'].unique():
        d = df[df['Company'] == company].dropna(subset=['MA_20'])
        if len(d) < 50: continue
        plt.figure(figsize=(12, 6))
        plt.plot(d['Date'], d['Close'], label='Close', alpha=0.6)
        plt.plot(d['Date'], d['MA_5'], label='MA_5')
        plt.plot(d['Date'], d['MA_20'], label='MA_20')
        plt.plot(d['Date'], d['MA_50'], label='MA_50')
        plt.title(f'{company} - Price & MAs')
        plt.xlabel('Date'); plt.ylabel('Price (₹)'); plt.legend(); plt.grid(True)
        plt.tight_layout(); plt.savefig(f'plots/{company.replace(" ", "_")}_moving_averages.png')
        print(f"  - Saved: plots/{company.replace(' ', '_')}_moving_averages.png")

# =====================
# 4) MODELING & COMPARISON (TEST SPLIT + CV)
# =====================

def build_prediction_model(df):
    print("[4/4] Training, evaluating, and saving concise outputs…")
    os.makedirs('models', exist_ok=True)
    os.makedirs('plots', exist_ok=True)

    FEATURES = ['MA_5', 'MA_20', 'MA_50', 'Daily_Return', 'Volatility_20', 'Volume_MA_5', 'Volume']
    test_records = []  # test split metrics
    cv_records = []    # CV metrics
    # For global summary across tickers
    global_summary = []

    for company in df['Company'].unique():
        print(f"  > {company}")
        data = df[df['Company'] == company].copy().sort_values('Date').dropna()
        if len(data) < 100:
            print("    - Not enough data, skipped")
            continue

        # Drop last row to avoid NaN in next-day target
        data = data.iloc[:-1]
        X = data[FEATURES]
        y = data['Next_LogReturn']
        split_idx = int(len(data) * 0.8)
        X_train, X_test = X.iloc[:split_idx], X.iloc[split_idx:]
        y_train, y_test = y.iloc[:split_idx], y.iloc[split_idx:]

        # Scalers
        mm, std = MinMaxScaler(), StandardScaler()
        X_train_mm, X_test_mm = mm.fit_transform(X_train), mm.transform(X_test)
        X_train_std, X_test_std = std.fit_transform(X_train), std.transform(X_test)

        # Baselines (test split) for returns
        # Naive return baseline: predict 0% (no change)
        naive_pred = np.zeros_like(y_test.values)
        # SMA baseline: mean of past 5 returns
        sma5_pred = np.full_like(y_test.values, fill_value=y_train.rolling(5).mean().iloc[-1])

        def metrics(y_true, y_hat):
            return {
                'RMSE': float(np.sqrt(mean_squared_error(y_true, y_hat))),
                'MAE': float(mean_absolute_error(y_true, y_hat)),
                'R2': float(r2_score(y_true, y_hat))
            }

        # Models (test split)
        models = {
            'Naive': None,
            'SMA5': None,
            'LinearRegression': LinearRegression().fit(X_train_mm, y_train),
            'Ridge': Ridge(alpha=1.0, random_state=42).fit(X_train_std, y_train),
            'Lasso': Lasso(alpha=0.001, random_state=42, max_iter=10000).fit(X_train_std, y_train),
            'ElasticNet': ElasticNet(alpha=0.001, l1_ratio=0.5, random_state=42, max_iter=10000).fit(X_train_std, y_train),
            'RandomForest': RandomForestRegressor(n_estimators=100, random_state=42).fit(X_train_mm, y_train),
            'ExtraTrees': ExtraTreesRegressor(n_estimators=200, random_state=42).fit(X_train_mm, y_train),
            'GradientBoosting': GradientBoostingRegressor(random_state=42).fit(X_train_mm, y_train),
        }

        preds = {
            'Naive': naive_pred,
            'SMA5': sma5_pred,
            'LinearRegression': models['LinearRegression'].predict(X_test_mm),
            'Ridge': models['Ridge'].predict(X_test_std),
            'Lasso': models['Lasso'].predict(X_test_std),
            'ElasticNet': models['ElasticNet'].predict(X_test_std),
            'RandomForest': models['RandomForest'].predict(X_test_mm),
            'ExtraTrees': models['ExtraTrees'].predict(X_test_mm),
            'GradientBoosting': models['GradientBoosting'].predict(X_test_mm),
        }

        results = {m: metrics(y_test, preds[m]) for m in preds}
        for m, met in results.items():
            test_records.append({'Company': company, 'Model': m, **met})

        # Save best model by R² (exclude baselines)
        ml_models = {k: v for k, v in results.items() if k not in ['Naive', 'SMA5']}
        best_name = max(ml_models, key=lambda k: ml_models[k]['R2'])
        best_is_tree = best_name in ['RandomForest', 'ExtraTrees']
        if best_name in ['LinearRegression', 'RandomForest', 'ExtraTrees']:
            scaler_to_save = mm
        else:
            scaler_to_save = std
        joblib.dump(models[best_name], f'models/{company.replace(" ", "_")}_{best_name.lower()}_model.pkl')
        joblib.dump(scaler_to_save, f'models/{company.replace(" ", "_")}_scaler.pkl')

        # Feature importance (only for best tree)
        if best_is_tree:
            model = models[best_name]
            plt.figure(figsize=(10, 5))
            importances = model.feature_importances_
            idx = np.argsort(importances)[::-1]
            plt.title(f'{company} - Feature Importance ({best_name})')
            plt.bar(range(len(FEATURES)), importances[idx])
            plt.xticks(range(len(FEATURES)), [FEATURES[i] for i in idx], rotation=90)
            plt.tight_layout(); plt.savefig(f'plots/{company.replace(" ", "_")}_feature_importance.png')
            print(f"    - Saved: plots/{company.replace(' ', '_')}_feature_importance.png")

        # Prediction plot (Actual vs a few models) for next-day returns
        plt.figure(figsize=(12, 5))
        plt.plot(y_test.values, label='Actual %')
        plt.plot(preds['RandomForest'], label='RF %')
        plt.plot(preds['LinearRegression'], label='LR %')
        plt.plot(preds['Ridge'], label='Ridge %')
        plt.plot(preds['GradientBoosting'], label='GB %')
        plt.title(f'{company} - Actual vs Predicted Next-day Log-Returns (Test)')
        plt.xlabel('Test Samples'); plt.ylabel('Return (%)'); plt.legend(); plt.grid(True)
        plt.tight_layout(); plt.savefig(f'plots/{company.replace(" ", "_")}_predictions.png')
        print(f"    - Saved: plots/{company.replace(' ', '_')}_predictions.png")

        # Bar charts (test split)
        order = ['Naive', 'SMA5', 'LinearRegression', 'Ridge', 'Lasso', 'ElasticNet', 'RandomForest', 'ExtraTrees', 'GradientBoosting']
        rmse_vals = [results[m]['RMSE'] for m in order]
        r2_vals = [results[m]['R2'] for m in order]

        plt.figure(figsize=(10, 4))
        sns.barplot(x=order, y=rmse_vals, color='skyblue')
        plt.title(f'{company} - RMSE (Test Split)'); plt.ylabel('RMSE'); plt.xticks(rotation=45)
        plt.tight_layout(); plt.savefig(f'plots/{company.replace(" ", "_")}_rmse_bar.png')
        print(f"    - Saved: plots/{company.replace(' ', '_')}_rmse_bar.png")

        plt.figure(figsize=(10, 4))
        sns.barplot(x=order, y=r2_vals, color='lightgreen')
        plt.title(f'{company} - R² (Test Split)'); plt.ylabel('R²'); plt.xticks(rotation=45)
        plt.tight_layout(); plt.savefig(f'plots/{company.replace(" ", "_")}_r2_bar.png')
        print(f"    - Saved: plots/{company.replace(' ', '_')}_r2_bar.png")

        # Rolling CV (3 folds) — store results only (no extra plots)
        tscv = TimeSeriesSplit(n_splits=3)
        for fold, (tr, va) in enumerate(tscv.split(X), start=1):
            X_tr, X_va = X.iloc[tr], X.iloc[va]
            y_tr, y_va = y.iloc[tr], y.iloc[va]
            mm_f, std_f = MinMaxScaler().fit(X_tr), StandardScaler().fit(X_tr)
            X_tr_mm, X_va_mm = mm_f.transform(X_tr), mm_f.transform(X_va)
            X_tr_std, X_va_std = std_f.transform(X_tr), std_f.transform(X_va)

            def rec(name, y_true, y_hat):
                cv_records.append({'Company': company, 'Fold': fold, 'Model': name,
                                   'RMSE': float(np.sqrt(mean_squared_error(y_true, y_hat))),
                                   'MAE': float(mean_absolute_error(y_true, y_hat)),
                                   'R2': float(r2_score(y_true, y_hat))})

            # Baselines for returns
            rec('Naive', y_va, np.zeros_like(y_va.values))
            rec('SMA5', y_va, np.full_like(y_va.values, fill_value=y_tr.rolling(5).mean().iloc[-1]))
            # Models
            rec('LinearRegression', y_va, LinearRegression().fit(X_tr_mm, y_tr).predict(X_va_mm))
            rec('Ridge', y_va, Ridge(alpha=1.0, random_state=42).fit(X_tr_std, y_tr).predict(X_va_std))
            rec('Lasso', y_va, Lasso(alpha=0.001, random_state=42, max_iter=10000).fit(X_tr_std, y_tr).predict(X_va_std))
            rec('ElasticNet', y_va, ElasticNet(alpha=0.001, l1_ratio=0.5, random_state=42, max_iter=10000).fit(X_tr_std, y_tr).predict(X_va_std))
            rec('RandomForest', y_va, RandomForestRegressor(n_estimators=100, random_state=42).fit(X_tr_mm, y_tr).predict(X_va_mm))
            rec('ExtraTrees', y_va, ExtraTreesRegressor(n_estimators=200, random_state=42).fit(X_tr_mm, y_tr).predict(X_va_mm))
            rec('GradientBoosting', y_va, GradientBoostingRegressor(random_state=42).fit(X_tr_mm, y_tr).predict(X_va_mm))

    # Save concise CSVs
    if test_records:
        pd.DataFrame(test_records).to_csv('models/model_comparison.csv', index=False)
        print("  - Saved: models/model_comparison.csv (test split)")
    if cv_records:
        cv_df = pd.DataFrame(cv_records)
        cv_df.to_csv('models/model_cv_results_detailed.csv', index=False)
        cv_avg_df = cv_df.groupby(['Company', 'Model']).agg({'RMSE':'mean','MAE':'mean','R2':'mean'}).reset_index()
        cv_avg_df.to_csv('models/model_cv_results.csv', index=False)
        print("  - Saved: models/model_cv_results.csv (CV avg) and detailed folds")

    # Create summary_metrics.txt and global comparison plot
    summary_lines = []
    if cv_records:
        src_df = cv_avg_df.copy()
        metric_label = 'CV'
    else:
        src_df = pd.DataFrame(test_records)
        metric_label = 'Test'
    if not src_df.empty:
        # Build per-company summary
        for comp in sorted(src_df['Company'].unique()):
            summary_lines.append(f"Company: {comp}")
            sub = src_df[src_df['Company'] == comp].copy()
            sub = sub.sort_values('R2', ascending=False)
            for _, r in sub.iterrows():
                summary_lines.append(f"  - {r['Model']}: {metric_label} RMSE={r['RMSE']:.4f}, R2={r['R2']:.4f}")
            best = sub.iloc[0]
            summary_lines.append(f"  Best: {best['Model']} (by {metric_label} R2={best['R2']:.4f})")
            summary_lines.append("")
        os.makedirs('models', exist_ok=True)
        with open('models/summary_metrics.txt', 'w') as f:
            f.write("\n".join(summary_lines))
        print("  - Saved: models/summary_metrics.txt")

        # Global comparison plot: average R2 per model across tickers
        avg_by_model = src_df.groupby('Model')['R2'].mean().sort_values(ascending=False)
        plt.figure(figsize=(10, 5))
        sns.barplot(x=avg_by_model.index, y=avg_by_model.values, color='mediumpurple')
        plt.title(f'Model Comparison Across All Tickers ({metric_label} Avg R²)')
        plt.ylabel('Average R²'); plt.xticks(rotation=45)
        plt.tight_layout(); os.makedirs('plots', exist_ok=True)
        plt.savefig('plots/Model_Comparison_All_Tickers.png')
        print("  - Saved: plots/Model_Comparison_All_Tickers.png")

    # Concise terminal summary: best by CV R² if available, else test
    print("\n[Summary] Best model per company:")
    if cv_records:
        cv_avg = pd.DataFrame(cv_records).groupby(['Company', 'Model']).agg({'RMSE':'mean','R2':'mean'}).reset_index()
        winners = cv_avg.sort_values(['Company','R2'], ascending=[True, False]).groupby('Company').head(1)
        for _, r in winners.iterrows():
            print(f"  - {r['Company']}: {r['Model']} (CV R²={r['R2']:.4f}, RMSE={r['RMSE']:.2f})")
    else:
        df_test = pd.DataFrame(test_records)
        for comp, grp in df_test[df_test['Model'].isin(['LinearRegression','Ridge','Lasso','ElasticNet','RandomForest','ExtraTrees'])].groupby('Company'):
            best = grp.sort_values('R2', ascending=False).iloc[0]
            print(f"  - {comp}: {best['Model']} (Test R²={best['R2']:.4f}, RMSE={best['RMSE']:.2f})")

    return {'test': test_records, 'cv': cv_records}

# =====================
# MAIN
# =====================

if __name__ == "__main__":
    stock_data = load_data()
    processed_data = preprocess_data(stock_data)
    visualize_stock_data(processed_data)
    _ = build_prediction_model(processed_data)
    print("\nDone. Key artifacts saved under 'plots/' and 'models/'.")
