"""CSV checks and offline evaluation for static pricing and the fairness bonus."""
import numpy as np
import pandas as pd
from pathlib import Path

FAIRNESS_GAMMAS = (0, 0.1, 0.9)
STATIC_COLUMNS = {
    0: ('price_item', 'expected_revenue'),
}
BONUS_COLUMNS = {
    gamma: tuple(name + ('' if gamma == 0 else f'_gamma_{gamma:g}')
                 for name in ('price_item', 'expected_revenue'))
    for gamma in FAIRNESS_GAMMAS
}
STATIC_PRICE_FILENAME = 'static_prices_submission.csv'
BONUS_PRICE_FILENAME = 'bonus_fairness_prices.csv'


def finite_mean(values):
    """Average finite numbers without overflowing their sum."""
    values = np.asarray(values, dtype=float)
    if values.ndim != 1 or not len(values) or not np.isfinite(values).all():
        raise ValueError('Supply a nonempty vector of finite numbers.')
    scale = np.max(np.abs(values))
    return float(np.mean(values / scale) * scale) if scale else 0.


def _median_nonnegative(values):
    """Use an overflow-safe midpoint for an even number of prices."""
    ordered = np.sort(values)
    middle = len(ordered) // 2
    if len(ordered) % 2:
        return ordered[middle]
    lower, upper = ordered[middle - 1:middle + 1]
    return lower + (upper - lower) / 2


def fairness_summary(prices, groups, gamma, revenues=None):
    """Audit offered prices; optional revenues can be predicted or realized."""
    prices = np.asarray(prices, dtype=float)
    groups = np.asarray(groups)
    if prices.ndim != 1 or prices.shape != groups.shape:
        raise ValueError('Supply one group for each offered price.')
    if not np.isfinite(prices).all() or (prices < 0).any():
        raise ValueError('Prices must be finite and nonnegative.')
    if not np.isfinite(gamma) or gamma < 0 or set(np.unique(groups)) != {0, 1}:
        raise ValueError('Use nonnegative gamma and both binary groups.')
    median0 = _median_nonnegative(prices[groups == 0])
    median1 = _median_nonnegative(prices[groups == 1])
    gap = abs(median0 - median1)
    with np.errstate(over='ignore', invalid='ignore'):
        penalty = gamma * gap
    summary = {'median0': median0, 'median1': median1, 'median_gap': gap, 'penalty': penalty}
    if revenues is not None:
        revenues = np.asarray(revenues, dtype=float)
        if revenues.shape != prices.shape or not np.isfinite(revenues).all():
            raise ValueError('Supply one finite revenue for each offered price.')
        revenue = finite_mean(revenues)
        summary.update(average_revenue=revenue, score=revenue-penalty)
    if not np.isfinite(list(summary.values())).all():
        raise ValueError('Fairness summary overflow: derived medians, penalty, and score must be finite.')
    return summary


def read_static_prices(filename, test_ids, column_groups):
    """Require complete numeric prices for precisely the supplied customer IDs."""
    if filename.is_symlink():
        raise ValueError(f'{filename.name}: submit an actual CSV file, not a symlink.')
    if not filename.is_file():
        raise ValueError(f'Missing required file: {filename}.')
    prices = pd.read_csv(filename)
    submission_columns = [column for group in column_groups.values() for column in group]
    headers = {'user_index', *submission_columns}
    if len(prices.columns) != len(headers) or set(prices.columns) != headers:
        raise ValueError(f'{filename.name}: headers must be user_index, ' + ', '.join(submission_columns) + '.')
    for column in headers:
        if pd.api.types.is_bool_dtype(prices[column]):
            raise ValueError(f'{filename.name}: {column} must contain numbers, not True/False values.')
        try:
            prices[column] = pd.to_numeric(prices[column], errors='raise')
        except (TypeError, ValueError) as error:
            raise ValueError(f'{filename.name}: {column} must be fully filled with numbers.') from error
        if not np.isfinite(prices[column]).all():
            raise ValueError(f'{filename.name}: {column} contains blanks, NaN, or infinity.')
    ids = prices['user_index']
    if (ids != np.floor(ids)).any() or ids.duplicated().any():
        raise ValueError(f'{filename.name}: user_index must contain unique integer IDs.')
    if len(prices) != len(test_ids) or set(ids) != set(test_ids):
        raise ValueError(f'{filename.name}: include every test customer exactly once, and no others.')
    for price_column, revenue_column in column_groups.values():
        if (prices[[price_column, revenue_column]] < 0).any().any():
            raise ValueError(f'{filename.name}: prices and predicted revenues must be nonnegative.')
    return prices[['user_index', *submission_columns]]


def evaluate_static_prices(filename, data_folder='data', bonus=False):
    """Score a validation CSV without returning the encrypted valuation labels."""
    from algopricing.MultiAgentEnv_algopricing import DATA_ENCRYPTION_KEY, read_secret_dataframe
    data_folder = Path(data_folder)
    customers = pd.read_csv(data_folder / 'validation_user_info_2026.csv')
    columns = BONUS_COLUMNS if bonus else STATIC_COLUMNS
    submitted = read_static_prices(Path(filename), customers.user_index, columns)
    valuations = read_secret_dataframe(str(data_folder / 'validation_valuations_2026.csv'), DATA_ENCRYPTION_KEY)
    if not valuations.index.is_unique or set(valuations.index) != set(customers.user_index):
        raise ValueError('Validation covariates and valuations must have the same unique IDs.')
    joined = customers.merge(submitted, on='user_index', validate='one_to_one')
    values = valuations.valuation.reindex(joined.user_index).to_numpy()
    if not np.isfinite(values).all() or (values < 0).any():
        raise ValueError('Validation valuations must be finite and nonnegative.')
    results = []
    for gamma, (price_column, predicted_column) in columns.items():
        revenue = joined[price_column] * (joined[price_column] <= values)
        average_revenue = finite_mean(revenue)
        summary = {'average_revenue': average_revenue, 'score': average_revenue}
        if bonus:
            summary = {'gamma': gamma, **fairness_summary(
                joined[price_column], joined.Covariate1, gamma, revenue)}
        results.append({'customers': len(joined),
                        'predicted_average_revenue': finite_mean(joined[predicted_column]),
                        **summary})
    return pd.DataFrame(results)
