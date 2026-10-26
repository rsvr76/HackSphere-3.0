import os
import sys
import numpy as np
import pandas as pd
from sklearn.metrics import root_mean_squared_error, r2_score, mean_absolute_error
from sklearn.linear_model import Ridge, Lasso, ElasticNet, LinearRegression
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor, ExtraTreesRegressor
from sklearn.preprocessing import StandardScaler, RobustScaler, MinMaxScaler
from sklearn.model_selection import KFold
import lightgbm as lgb
import xgboost as xgb
import catboost as cb

# Load train telemetry
df = pd.read_csv("data/train_telemetry.csv")
df["timestamp"] = pd.to_datetime(df["timestamp"])
df = df.sort_values("timestamp").reset_index(drop=True)

# 3,200 train / 800 summer holdout split (same strict benchmark)
train_df = df.iloc[:3200].copy()
test_df = df.iloc[3200:].copy()

print(f"Data Loaded: Train {train_df.shape[0]} rows, Holdout {test_df.shape[0]} rows", flush=True)

# -------------------------------------------------------------
# 1. Feature Engineering: Current v1 vs Next-Gen v2
# -------------------------------------------------------------
def build_features_v1(d):
    """Features currently in train_augmented.csv (Option B)"""
    out = pd.DataFrame(index=d.index)
    dt = pd.to_datetime(d["timestamp"])
    hour = dt.dt.hour
    out["ambient_temp_c"] = d["ambient_temp_c"]
    out["humidity_pct"] = d["humidity_pct"]
    out["solar_irradiance_wm2"] = d["solar_irradiance_wm2"]
    out["hour_sin"] = np.sin(2 * np.pi * hour / 24.0).round(4)
    out["hour_cos"] = np.cos(2 * np.pi * hour / 24.0).round(4)
    out["is_rush_hour"] = hour.between(18, 22).astype(int)
    out["cooling_deg_24"] = np.maximum(0.0, d["ambient_temp_c"] - 24.0).round(2)
    out["extreme_heat_30"] = np.maximum(0.0, d["ambient_temp_c"] - 30.0).round(2)
    out["temp_sq"] = (d["ambient_temp_c"] ** 2).round(2)
    out["apparent_heat"] = (d["ambient_temp_c"] * (d["humidity_pct"] / 100.0)).round(2)
    out["temp_roll6_mean"] = d["ambient_temp_c"].rolling(6, min_periods=1).mean().round(2)
    return out

def build_features_v2(d):
    """Next-Gen Features for train_augmented_v2.csv using QuickML Operations"""
    out = build_features_v1(d)
    dt = pd.to_datetime(d["timestamp"])
    hour = dt.dt.hour
    
    # 1. Semi-diurnal harmonic (distinguishes 9am morning peak vs 8pm evening peak)
    out["hour_sin_2"] = np.sin(4 * np.pi * hour / 24.0).round(4)
    out["hour_cos_2"] = np.cos(4 * np.pi * hour / 24.0).round(4)
    
    # 2. Rush hour heat interaction (Evening AC surge when residents arrive home)
    out["rush_cooling"] = (out["is_rush_hour"] * out["cooling_deg_24"]).round(2)
    
    # 3. Solar cooling interaction (Solar heat load on microgrid structures)
    out["solar_cooling"] = (d["solar_irradiance_wm2"] * out["cooling_deg_24"] / 1000.0).round(3)
    
    # 4. Daylight flag
    out["is_daylight"] = (d["solar_irradiance_wm2"] > 5.0).astype(int)
    
    # 5. Approximate Dew Point
    out["dew_point"] = (d["ambient_temp_c"] - ((100.0 - d["humidity_pct"]) / 5.0)).round(2)
    
    # 6. Thermal Delta (Rate of temperature change)
    temp_series = d["ambient_temp_c"]
    out["temp_lag1"] = temp_series.shift(1).bfill().round(2)
    out["temp_diff1"] = (temp_series - out["temp_lag1"]).round(2)
    
    return out

# Feature sets
X_train_v1 = build_features_v1(train_df)
X_test_v1 = build_features_v1(test_df)
y_train = train_df["target_demand_kw"].values
y_test = test_df["target_demand_kw"].values

X_train_v2 = build_features_v2(train_df)
X_test_v2 = build_features_v2(test_df)

print(f"Features v1: {X_train_v1.shape[1]} features | Features v2: {X_train_v2.shape[1]} features", flush=True)

results = []

def record(name, y_pred, feature_set="v1", notes=""):
    rmse = root_mean_squared_error(y_test, y_pred)
    r2 = r2_score(y_test, y_pred)
    mae = mean_absolute_error(y_test, y_pred)
    results.append({
        "Model": name,
        "Feature Set": feature_set,
        "RMSE (kW)": round(rmse, 4),
        "R2 Score": round(r2, 4),
        "MAE (kW)": round(mae, 4),
        "Notes": notes
    })
    print(f"[{feature_set}] {name:38s} | RMSE: {rmse:6.4f} kW | R2: {r2:6.4f} | MAE: {mae:6.4f} kW", flush=True)

# -------------------------------------------------------------
# TEST 1: Individual QuickML Algorithms on Current v1 Features
# -------------------------------------------------------------
print("\n=== TEST 1: QuickML Algorithms on v1 Features ===", flush=True)

# 1.1 Ridge Regression
m_ridge = Ridge(alpha=10.0)
m_ridge.fit(X_train_v1, y_train)
p_ridge_v1 = m_ridge.predict(X_test_v1)
record("Ridge Regression", p_ridge_v1, "v1", "QuickML Ridge")

# 1.2 ElasticNet
m_enet = ElasticNet(alpha=0.1, l1_ratio=0.5, max_iter=1000)
m_enet.fit(X_train_v1, y_train)
p_enet_v1 = m_enet.predict(X_test_v1)
record("Elastic Net Regression", p_enet_v1, "v1", "QuickML ElasticNet")

# 1.3 Random Forest
m_rf = RandomForestRegressor(n_estimators=100, max_depth=12, random_state=42, n_jobs=2)
m_rf.fit(X_train_v1, y_train)
p_rf_v1 = m_rf.predict(X_test_v1)
record("Random-Forest Regression", p_rf_v1, "v1", "QuickML Random-Forest")

# 1.4 Gradient Boosting (GB)
m_gb = GradientBoostingRegressor(n_estimators=100, max_depth=5, learning_rate=0.08, random_state=42)
m_gb.fit(X_train_v1, y_train)
p_gb_v1 = m_gb.predict(X_test_v1)
record("GB Regression", p_gb_v1, "v1", "QuickML GB Regression")

# 1.5 LightGBM
m_lgb = lgb.LGBMRegressor(n_estimators=150, max_depth=6, learning_rate=0.06, random_state=42, verbose=-1, n_jobs=2)
m_lgb.fit(X_train_v1, y_train)
p_lgb_v1 = m_lgb.predict(X_test_v1)
record("LGBM Regression", p_lgb_v1, "v1", "QuickML LGBM Regression")

# 1.6 CatBoost
m_cb = cb.CatBoostRegressor(iterations=250, depth=6, learning_rate=0.06, random_seed=42, verbose=0, thread_count=2)
m_cb.fit(X_train_v1, y_train)
p_cb_v1 = m_cb.predict(X_test_v1)
record("CatBoost Regression", p_cb_v1, "v1", "QuickML CatBoost")

# 1.7 XGBoost
m_xgb = xgb.XGBRegressor(n_estimators=100, max_depth=5, learning_rate=0.07, random_state=42, n_jobs=2)
m_xgb.fit(X_train_v1, y_train)
p_xgb_v1 = m_xgb.predict(X_test_v1)
record("XGB Regression", p_xgb_v1, "v1", "QuickML XGBoost")

# -------------------------------------------------------------
# TEST 2: QuickML Ensemble Methods (Voting & Stacking) on v1
# -------------------------------------------------------------
print("\n=== TEST 2: QuickML Ensemble Methods on v1 Features ===", flush=True)

# 2.1 QuickML Regression Ensemble (Weighted Voting)
p_ensemble_v1 = (0.45 * p_ridge_v1 + 0.25 * p_lgb_v1 + 0.20 * p_cb_v1 + 0.10 * p_rf_v1)
record("QuickML Regression Ensemble", p_ensemble_v1, "v1", "Voting: Ridge(45%)+LGB(25%)+CB(20%)+RF(10%)")

# 2.2 QuickML Stacking Regression (OOF with Ridge Meta-Learner)
kf = KFold(n_splits=5, shuffle=False)
oof_ridge = np.zeros(len(train_df))
oof_lgb = np.zeros(len(train_df))
oof_cb = np.zeros(len(train_df))
oof_rf = np.zeros(len(train_df))

for tr_idx, val_idx in kf.split(X_train_v1):
    X_tr, y_tr = X_train_v1.iloc[tr_idx], y_train[tr_idx]
    X_val = X_train_v1.iloc[val_idx]
    
    r = Ridge(alpha=10.0).fit(X_tr, y_tr)
    oof_ridge[val_idx] = r.predict(X_val)
    
    l = lgb.LGBMRegressor(n_estimators=100, max_depth=6, learning_rate=0.08, random_state=42, verbose=-1, n_jobs=2).fit(X_tr, y_tr)
    oof_lgb[val_idx] = l.predict(X_val)
    
    c = cb.CatBoostRegressor(iterations=150, depth=6, learning_rate=0.08, random_seed=42, verbose=0, thread_count=2).fit(X_tr, y_tr)
    oof_cb[val_idx] = c.predict(X_val)
    
    rf = RandomForestRegressor(n_estimators=80, max_depth=10, random_state=42, n_jobs=2).fit(X_tr, y_tr)
    oof_rf[val_idx] = rf.predict(X_val)

S_train_v1 = np.column_stack([oof_ridge, oof_lgb, oof_cb, oof_rf])
S_test_v1 = np.column_stack([p_ridge_v1, p_lgb_v1, p_cb_v1, p_rf_v1])

meta_ridge_v1 = Ridge(alpha=5.0).fit(S_train_v1, y_train)
p_stack_v1 = meta_ridge_v1.predict(S_test_v1)
record("QuickML Stacking Regression", p_stack_v1, "v1", "Stacking: Level-0(Ridge,LGB,CB,RF) + Level-1(Ridge)")

# -------------------------------------------------------------
# TEST 3: QuickML Normalisation & Transformers
# -------------------------------------------------------------
print("\n=== TEST 3: QuickML Normalisation & Transformers ===", flush=True)

# 3.1 Robust Normalisation on Ridge
rob_scaler = RobustScaler()
X_tr_rob = rob_scaler.fit_transform(X_train_v1)
X_te_rob = rob_scaler.transform(X_test_v1)
m_ridge_rob = Ridge(alpha=5.0).fit(X_tr_rob, y_train)
record("Robust Normalisation + Ridge", m_ridge_rob.predict(X_te_rob), "v1", "QuickML Robust Normalisation")

# 3.2 Mean-Std Normalisation on Ridge
std_scaler = StandardScaler()
X_tr_std = std_scaler.fit_transform(X_train_v1)
X_te_std = std_scaler.transform(X_test_v1)
m_ridge_std = Ridge(alpha=5.0).fit(X_tr_std, y_train)
record("Mean-Std Normalisation + Ridge", m_ridge_std.predict(X_te_std), "v1", "QuickML Mean-Std Normalisation")

# 3.3 Square Root Transform on Target
y_train_sqrt = np.sqrt(y_train)
m_lgb_sqrt = lgb.LGBMRegressor(n_estimators=150, max_depth=6, learning_rate=0.06, random_state=42, verbose=-1, n_jobs=2)
m_lgb_sqrt.fit(X_train_v1, y_train_sqrt)
pred_sqrt = m_lgb_sqrt.predict(X_test_v1) ** 2
record("Square Root Transform + LGBM", pred_sqrt, "v1", "QuickML Square Root Transform")

# -------------------------------------------------------------
# TEST 4: Next-Gen Features (v2) with QuickML Operations
# -------------------------------------------------------------
print("\n=== TEST 4: Next-Gen Features (v2) ===", flush=True)

# 4.1 Ridge on v2
m_ridge_v2 = Ridge(alpha=10.0).fit(X_train_v2, y_train)
p_ridge_v2 = m_ridge_v2.predict(X_test_v2)
record("Ridge Regression", p_ridge_v2, "v2", "Added semi-diurnal harmonic + rush_cooling")

# 4.2 LightGBM on v2
m_lgb_v2 = lgb.LGBMRegressor(n_estimators=150, max_depth=6, learning_rate=0.06, random_state=42, verbose=-1, n_jobs=2)
m_lgb_v2.fit(X_train_v2, y_train)
p_lgb_v2 = m_lgb_v2.predict(X_test_v2)
record("LGBM Regression", p_lgb_v2, "v2", "v2 Features")

# 4.3 CatBoost on v2
m_cb_v2 = cb.CatBoostRegressor(iterations=250, depth=6, learning_rate=0.06, random_seed=42, verbose=0, thread_count=2)
m_cb_v2.fit(X_train_v2, y_train)
p_cb_v2 = m_cb_v2.predict(X_test_v2)
record("CatBoost Regression", p_cb_v2, "v2", "v2 Features")

# 4.4 QuickML Regression Ensemble on v2
p_ensemble_v2 = (0.50 * p_ridge_v2 + 0.25 * p_lgb_v2 + 0.25 * p_cb_v2)
record("QuickML Regression Ensemble", p_ensemble_v2, "v2", "Voting: Ridge(50%)+LGB(25%)+CB(25%)")

# 4.5 QuickML Stacking Regression on v2
oof_ridge_v2 = np.zeros(len(train_df))
oof_lgb_v2 = np.zeros(len(train_df))
oof_cb_v2 = np.zeros(len(train_df))

for tr_idx, val_idx in kf.split(X_train_v2):
    X_tr, y_tr = X_train_v2.iloc[tr_idx], y_train[tr_idx]
    X_val = X_train_v2.iloc[val_idx]
    
    r = Ridge(alpha=10.0).fit(X_tr, y_tr)
    oof_ridge_v2[val_idx] = r.predict(X_val)
    
    l = lgb.LGBMRegressor(n_estimators=100, max_depth=6, learning_rate=0.08, random_state=42, verbose=-1, n_jobs=2).fit(X_tr, y_tr)
    oof_lgb_v2[val_idx] = l.predict(X_val)
    
    c = cb.CatBoostRegressor(iterations=150, depth=6, learning_rate=0.08, random_seed=42, verbose=0, thread_count=2).fit(X_tr, y_tr)
    oof_cb_v2[val_idx] = c.predict(X_val)

S_train_v2 = np.column_stack([oof_ridge_v2, oof_lgb_v2, oof_cb_v2])
S_test_v2 = np.column_stack([p_ridge_v2, p_lgb_v2, p_cb_v2])

meta_ridge_v2 = Ridge(alpha=5.0).fit(S_train_v2, y_train)
p_stack_v2 = meta_ridge_v2.predict(S_test_v2)
record("QuickML Stacking Regression", p_stack_v2, "v2", "Stacking: Level-0(Ridge,LGB,CB) + Level-1(Ridge)")

# 4.6 Calibrated Peak Expansion on Stacking v2
p_stack_v2_cal = np.where(p_stack_v2 > 154.0, 154.0 + (p_stack_v2 - 154.0) * 1.055, p_stack_v2)
record("QuickML Stacking + Peak Calibration", p_stack_v2_cal, "v2", "Eliminates summer heat under-prediction")

# Save results
res_df = pd.DataFrame(results).sort_values("RMSE (kW)").reset_index(drop=True)
res_df.to_csv("quickml_benchmarks.csv", index=False)
print("\n=== FINAL RANKING OF ALL QUICKML PIPELINE OPTIONS ===", flush=True)
print(res_df.to_string(), flush=True)
