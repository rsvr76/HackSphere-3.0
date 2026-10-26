import numpy as np
import pandas as pd
from sklearn.model_selection import KFold
from sklearn.metrics import root_mean_squared_error, r2_score, mean_absolute_error
from sklearn.ensemble import GradientBoostingRegressor, RandomForestRegressor
from sklearn.linear_model import Ridge
import catboost as cb

# Load base telemetry
df = pd.read_csv("data/train_telemetry.csv")
dt = pd.to_datetime(df["timestamp"])
hour = dt.dt.hour

# Baseline v1 features (currently in train_augmented.csv)
base = pd.DataFrame(index=df.index)
base["ambient_temp_c"] = df["ambient_temp_c"]
base["humidity_pct"] = df["humidity_pct"]
base["solar_irradiance_wm2"] = df["solar_irradiance_wm2"]
base["hour_sin"] = np.sin(2 * np.pi * hour / 24.0).round(4)
base["hour_cos"] = np.cos(2 * np.pi * hour / 24.0).round(4)
base["is_rush_hour"] = hour.between(18, 22).astype(int)
base["cooling_deg_24"] = np.maximum(0.0, df["ambient_temp_c"] - 24.0).round(2)
base["extreme_heat_30"] = np.maximum(0.0, df["ambient_temp_c"] - 30.0).round(2)
base["temp_sq"] = (df["ambient_temp_c"] ** 2).round(2)
base["apparent_heat"] = (df["ambient_temp_c"] * (df["humidity_pct"] / 100.0)).round(2)
base["temp_roll6_mean"] = df["ambient_temp_c"].rolling(6, min_periods=1).mean().round(2)

y = df["target_demand_kw"].values
kf = KFold(n_splits=5, shuffle=True, random_state=42)

def eval_stacking(X, name):
    oof_gb = np.zeros(len(df))
    oof_rf = np.zeros(len(df))
    oof_ridge = np.zeros(len(df))
    oof_cb = np.zeros(len(df))

    for tr, val in kf.split(X):
        X_tr, y_tr = X.iloc[tr], y[tr]
        X_val = X.iloc[val]

        m_gb = GradientBoostingRegressor(n_estimators=130, max_depth=5, learning_rate=0.07, random_state=42).fit(X_tr, y_tr)
        oof_gb[val] = m_gb.predict(X_val)

        m_rf = RandomForestRegressor(n_estimators=100, max_depth=12, random_state=42, n_jobs=2).fit(X_tr, y_tr)
        oof_rf[val] = m_rf.predict(X_val)

        m_ridge = Ridge(alpha=10.0).fit(X_tr, y_tr)
        oof_ridge[val] = m_ridge.predict(X_val)

        m_cb = cb.CatBoostRegressor(iterations=200, depth=6, learning_rate=0.07, random_seed=42, verbose=0, thread_count=2).fit(X_tr, y_tr)
        oof_cb[val] = m_cb.predict(X_val)

    S = np.column_stack([oof_gb, oof_rf, oof_ridge, oof_cb])
    meta = Ridge(alpha=2.0).fit(S, y)
    stack_pred = meta.predict(S)

    rmse = root_mean_squared_error(y, stack_pred)
    r2 = r2_score(y, stack_pred)
    mae = mean_absolute_error(y, stack_pred)
    mape = np.mean(np.abs((y - stack_pred) / y)) * 100
    print(f"[{name}] -> RMSE: {rmse:.4f} kW | R2: {r2:.4f} | MAE: {mae:.4f} kW | MAPE: {mape:.2f}%", flush=True)
    return rmse, r2, mae, mape, stack_pred

print("=== Running QuickML Stacking Benchmark on System ===", flush=True)

# 1. Baseline Current Setup
eval_stacking(base, "1. Current Baseline (train_augmented)")

# 2. Add Rush Hour Heat Interaction (rush_cooling)
opt_a = base.copy()
opt_a["rush_cooling"] = (opt_a["is_rush_hour"] * opt_a["cooling_deg_24"]).round(2)
eval_stacking(opt_a, "2. + rush_cooling (Evening AC Peak)")

# 3. Add rush_cooling + Semi-diurnal Harmonic (hour_sin_2, hour_cos_2)
opt_b = opt_a.copy()
opt_b["hour_sin_2"] = np.sin(4 * np.pi * hour / 24.0).round(4)
opt_b["hour_cos_2"] = np.cos(4 * np.pi * hour / 24.0).round(4)
eval_stacking(opt_b, "3. + Semi-diurnal Harmonic (hour_sin_2, cos_2)")

# 4. Add Dew Point approximation
opt_c = opt_b.copy()
opt_c["dew_point"] = (df["ambient_temp_c"] - ((100.0 - df["humidity_pct"]) / 5.0)).round(2)
eval_stacking(opt_c, "4. + Dew Point Approximation")

# 5. Add Solar Cooling Interaction
opt_d = opt_c.copy()
opt_d["solar_cooling"] = (df["solar_irradiance_wm2"] * opt_d["cooling_deg_24"] / 1000.0).round(3)
eval_stacking(opt_d, "5. + Solar Cooling Interaction")

# 6. Opt_A with Peak Expansion Calibration
rmse_a, r2_a, mae_a, mape_a, preds_a = eval_stacking(opt_a, "6. Testing opt_a with Peak Calibration")
preds_cal = np.where(preds_a > 154.0, 154.0 + (preds_a - 154.0) * 1.035, preds_a)
rmse_cal = root_mean_squared_error(y, preds_cal)
r2_cal = r2_score(y, preds_cal)
mae_cal = mean_absolute_error(y, preds_cal)
mape_cal = np.mean(np.abs((y - preds_cal) / y)) * 100
print(f"[7. opt_a + Peak Calibration] -> RMSE: {rmse_cal:.4f} kW | R2: {r2_cal:.4f} | MAE: {mae_cal:.4f} kW | MAPE: {mape_cal:.2f}%", flush=True)
