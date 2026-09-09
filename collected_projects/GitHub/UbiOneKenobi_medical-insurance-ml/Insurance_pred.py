import numpy as np
import pandas as pd
import kagglehub
import matplotlib.pyplot as plt

from pandas.plotting import scatter_matrix
from scipy.stats import randint
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestRegressor
from sklearn.linear_model import LinearRegression
from sklearn.metrics import root_mean_squared_error
from sklearn.model_selection import RandomizedSearchCV, cross_val_score, train_test_split
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler


# -----------------------------------------------------------------------------
# 1. Load and clean the dataset
# -----------------------------------------------------------------------------

# Download the latest version of the dataset from Kaggle.
path = kagglehub.dataset_download(
    "harishkumardatalab/medical-insurance-price-prediction"
)

insurance = pd.read_csv(path + "/Medical_insurance.csv")

# The original Kaggle dataset contains many duplicated rows.
insurance = insurance.drop_duplicates()

# Useful checks during data exploration.
# print(insurance.info())
# print(insurance.head())
# print(insurance.describe())


# -----------------------------------------------------------------------------
# 2. Exploratory data analysis
# -----------------------------------------------------------------------------

plt.rc("font", size=8)
plt.rc("axes", labelsize=8, titlesize=14)
plt.rc("legend", fontsize=14)
plt.rc("xtick", labelsize=7)
plt.rc("ytick", labelsize=10)

# Correlation matrix for numerical features only.
corr_matrix = insurance.corr(numeric_only=True)
# print(corr_matrix)

# Visual comparison between the numerical features and the target.
attributes = ["bmi", "age", "children", "charges"]
scatter_matrix(insurance[attributes], figsize=(12, 8))
# plt.show()

# Compare average charges across categorical groups.
# smoker_charges = insurance.groupby("smoker")["charges"].mean()
# sex_charges = insurance.groupby("sex")["charges"].mean()
# region_charges = insurance.groupby("region")["charges"].mean()

# Check the distribution of categorical values.
# print(insurance["sex"].value_counts())
# print(insurance["smoker"].value_counts())
# print(insurance["region"].value_counts())


# -----------------------------------------------------------------------------
# 3. Create training and test sets
# -----------------------------------------------------------------------------

# Use a stratified split so that the proportion of smokers is preserved
# in both the training and test sets.
train_insurance, test_insurance = train_test_split(
    insurance,
    test_size=0.15,
    random_state=42,
    stratify=insurance["smoker"],
)

# Check that the smoker proportions were preserved.
# print(train_insurance["smoker"].value_counts(normalize=True))
# print(test_insurance["smoker"].value_counts(normalize=True))

# Separate the input features from the target.
insurance_labels = train_insurance["charges"].copy()
insurance_features = train_insurance.drop("charges", axis=1)


# -----------------------------------------------------------------------------
# 4. Preprocessing
# -----------------------------------------------------------------------------

numeric_features = ["age", "bmi", "children"]
categorical_features = ["region", "smoker", "sex"]

# Standardize numerical features and one-hot encode categorical features.
# ColumnTransformer applies each transformation only to the specified columns.
preprocessing = ColumnTransformer(
    [
        ("num", StandardScaler(), numeric_features),
        ("cat", OneHotEncoder(), categorical_features),
    ]
)


# -----------------------------------------------------------------------------
# 5. Linear regression baseline
# -----------------------------------------------------------------------------

lin_reg = make_pipeline(preprocessing, LinearRegression())
lin_reg.fit(insurance_features, insurance_labels)

lin_predictions = lin_reg.predict(insurance_features)
lin_rmse = root_mean_squared_error(insurance_labels, lin_predictions)

lin_cross = -cross_val_score(
    lin_reg,
    insurance_features,
    insurance_labels,
    scoring="neg_root_mean_squared_error",
    cv=5,
)

# Results obtained:
# Training RMSE: about 6210
# Cross-validation RMSE: about 6253
# The similar and relatively high errors suggest that the linear model
# is probably too simple for the relationships in this dataset.


# -----------------------------------------------------------------------------
# 6. Random Forest
# -----------------------------------------------------------------------------

forest_reg = make_pipeline(
    preprocessing,
    RandomForestRegressor(random_state=42),
)

forest_reg.fit(insurance_features, insurance_labels)

forest_predictions = forest_reg.predict(insurance_features)
forest_rmse = root_mean_squared_error(insurance_labels, forest_predictions)

forest_cross = -cross_val_score(
    forest_reg,
    insurance_features,
    insurance_labels,
    scoring="neg_root_mean_squared_error",
    cv=5,
)

# Results obtained with the default Random Forest:
# Training RMSE: about 1893
# Cross-validation RMSE: about 5043
# The large gap indicates clear overfitting, even though the model performs
# better than Linear Regression on validation data.


# -----------------------------------------------------------------------------
# 7. Hyperparameter tuning with RandomizedSearchCV
# -----------------------------------------------------------------------------

param_distributions = {
    "randomforestregressor__max_depth": randint(low=2, high=15),
    "randomforestregressor__min_samples_leaf": randint(low=1, high=50),
    "randomforestregressor__n_estimators": randint(low=50, high=500),
}

rnd_search = RandomizedSearchCV(
    forest_reg,
    param_distributions=param_distributions,
    n_iter=10,
    scoring="neg_root_mean_squared_error",
    cv=5,
    verbose=1,
    random_state=42,
)

rnd_search.fit(insurance_features, insurance_labels)

final_model = rnd_search.best_estimator_

# Best parameters obtained:
# max_depth = 12
# min_samples_leaf = 8
# n_estimators = 238
# Best cross-validation RMSE: about 4703
# print(rnd_search.best_params_)
# print(-rnd_search.best_score_)

final_train_predictions = final_model.predict(insurance_features)
final_train_rmse = root_mean_squared_error(
    insurance_labels,
    final_train_predictions,
)

# Training RMSE after tuning: about 4035
# The gap between training and CV error is much smaller, so the tuning
# substantially reduced overfitting.
# print(final_train_rmse)


# -----------------------------------------------------------------------------
# 8. Optional experiment: log-transform the target
# -----------------------------------------------------------------------------

# A log transformation was tested because "charges" has a long right tail.
# The cross-validation RMSE improved only slightly (about 4703 -> 4681),
# so the simpler model without target transformation was kept as final model.

# from sklearn.compose import TransformedTargetRegressor
#
# log_model = TransformedTargetRegressor(
#     regressor=final_model,
#     func=np.log,
#     inverse_func=np.exp,
# )
#
# log_model.fit(insurance_features, insurance_labels)
# log_predictions = log_model.predict(insurance_features)
# log_rmse = root_mean_squared_error(insurance_labels, log_predictions)
#
# log_cross = -cross_val_score(
#     log_model,
#     insurance_features,
#     insurance_labels,
#     scoring="neg_root_mean_squared_error",
#     cv=5,
# )
#
# print(pd.Series(log_cross).describe())


# -----------------------------------------------------------------------------
# 9. Final evaluation on the untouched test set
# -----------------------------------------------------------------------------

X_test = test_insurance.drop("charges", axis=1)
y_test = test_insurance["charges"].copy()

final_test_predictions = final_model.predict(X_test)
final_test_rmse = root_mean_squared_error(y_test, final_test_predictions)

# Final test RMSE: about 3332
# print(final_test_rmse)


# -----------------------------------------------------------------------------
# 10. Example prediction on new data
# -----------------------------------------------------------------------------

my_data = pd.DataFrame(
    [
        {
            "age": 20,
            "sex": "male",
            "bmi": 23.5,
            "children": 0,
            "smoker": "no",
            "region": "northeast",
        }
    ]
)

my_prediction = final_model.predict(my_data)
print(my_prediction)
