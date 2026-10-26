"""
HackSphere 3.0 — Smart Microgrid Transition Controller Engine
Official Evaluation Specification & Rule Implementation (20% Rubric Weight)

Rules (Section 6 of Problem Statement):
1. Demand > 160 kW OR timestamp hour in [18, 19, 20, 21, 22] (18:00-22:00 inclusive)
   -> Mode: RENEWABLE_STORAGE
2. Otherwise (Demand <= 160 kW AND outside 18:00-22:00)
   -> Mode: MAIN_GRID
3. Demand >= 200 kW
   -> Trigger: CRITICAL_OVERLOAD_ALERT (independent of grid mode)
"""

import argparse
import sys
from datetime import datetime
from typing import Any, Dict, List, Union

import numpy as np
import pandas as pd

SWITCHING_THRESHOLD_KW = 160.0
CRITICAL_OVERLOAD_THRESHOLD_KW = 200.0
PEAK_HOURS = {18, 19, 20, 21, 22}


def evaluate_transition(
    demand_kw: float, timestamp: Union[str, datetime]
) -> Dict[str, Any]:
    """Evaluates the microgrid transition controller logic for a single hourly reading.

    Args:
        demand_kw (float): Predicted or actual demand in kilowatts.
        timestamp (str or datetime): Hourly timestamp (e.g. 'YYYY-MM-DD HH:MM:SS').

    Returns:
        dict: Complete evaluation including grid mode, overload alert, and explanation.
    """
    if isinstance(timestamp, str):
        # Handle standard ISO formats, with or without 'T' or milliseconds
        dt = pd.to_datetime(timestamp)
    else:
        dt = timestamp

    hour = int(dt.hour)
    demand = float(demand_kw)

    is_peak_hour = hour in PEAK_HOURS
    is_high_demand = demand > SWITCHING_THRESHOLD_KW
    is_overload = demand >= CRITICAL_OVERLOAD_THRESHOLD_KW

    if is_high_demand or is_peak_hour:
        mode = "RENEWABLE_STORAGE"
        if is_high_demand and is_peak_hour:
            reason = (
                f"Dual Trigger: High Demand ({demand:.1f} kW > 160 kW) & "
                f"Evening Peak Window ({hour:02d}:00 in 18:00–22:00)"
            )
            trigger_code = "DUAL_TRIGGER"
        elif is_high_demand:
            reason = f"Demand Trigger: High Demand ({demand:.1f} kW > 160 kW)"
            trigger_code = "HIGH_DEMAND_TRIGGER"
        else:
            reason = f"Time Trigger: Evening Peak Window ({hour:02d}:00 in 18:00–22:00)"
            trigger_code = "EVENING_PEAK_TRIGGER"
    else:
        mode = "MAIN_GRID"
        reason = (
            f"Base Load: Demand ({demand:.1f} kW <= 160 kW) and "
            f"outside evening peak window ({hour:02d}:00)"
        )
        trigger_code = "MAIN_GRID_BASELOAD"

    if is_overload:
        reason += f" [CRITICAL OVERLOAD: {demand:.1f} kW >= 200 kW]"

    # Power Dispatch Signals (AppSail / Functions contract)
    # When Renewable Storage is active, battery shaves peak demand above 140 kW
    if mode == "RENEWABLE_STORAGE":
        battery_dispatch_kw = min(60.0, max(15.0, (demand - 140.0) * 0.7))
        grid_import_kw = max(0.0, demand - battery_dispatch_kw)
    else:
        battery_dispatch_kw = 0.0
        grid_import_kw = demand

    return {
        "timestamp": str(dt),
        "hour": hour,
        "demand_kw": round(demand, 2),
        "grid_mode": mode,
        "is_overload": is_overload,
        "is_peak_hour": is_peak_hour,
        "is_high_demand": is_high_demand,
        "trigger_code": trigger_code,
        "trigger_reason": reason,
        "grid_import_kw": round(grid_import_kw, 2),
        "battery_dispatch_kw": round(battery_dispatch_kw, 2),
    }


def batch_evaluate(
    df: pd.DataFrame, demand_col: str = "target_demand_kw"
) -> pd.DataFrame:
    """Evaluates transition controller logic over an entire DataFrame of forecast rows.

    Args:
        df (pd.DataFrame): DataFrame containing 'timestamp' and demand column.
        demand_col (str): Column name for demand kW.

    Returns:
        pd.DataFrame: Original DataFrame enriched with transition controller signals.
    """
    if "timestamp" not in df.columns:
        raise ValueError("DataFrame must contain a 'timestamp' column.")
    if demand_col not in df.columns:
        raise ValueError(f"Demand column '{demand_col}' not found in DataFrame.")

    results = []
    for _, row in df.iterrows():
        eval_result = evaluate_transition(row[demand_col], row["timestamp"])
        results.append(eval_result)

    eval_df = pd.DataFrame(results)

    out_df = df.copy()
    out_df["grid_mode"] = eval_df["grid_mode"]
    out_df["is_overload"] = eval_df["is_overload"]
    out_df["is_peak_hour"] = eval_df["is_peak_hour"]
    out_df["is_high_demand"] = eval_df["is_high_demand"]
    out_df["trigger_code"] = eval_df["trigger_code"]
    out_df["trigger_reason"] = eval_df["trigger_reason"]
    out_df["grid_import_kw"] = eval_df["grid_import_kw"]
    out_df["battery_dispatch_kw"] = eval_df["battery_dispatch_kw"]

    return out_df


def main():
    parser = argparse.ArgumentParser(
        description="HackSphere 3.0 Transition Controller Evaluation CLI"
    )
    parser.add_argument(
        "--input",
        type=str,
        required=True,
        help="Input CSV containing 'timestamp' and demand column (or raw telemetry)",
    )
    parser.add_argument(
        "--output",
        type=str,
        default="transition_dispatch_signals.csv",
        help="Output CSV path for transition signals",
    )
    parser.add_argument(
        "--demand-col",
        type=str,
        default="target_demand_kw",
        help="Column name for demand kW (defaults to 'target_demand_kw')",
    )
    parser.add_argument(
        "--predict-first",
        action="store_true",
        help="If set, calls predict.py to compute predictions first if demand column missing",
    )

    args = parser.parse_args()

    print(f"Loading input file: {args.input}")
    df = pd.read_csv(args.input)

    if args.demand_col not in df.columns:
        if args.predict_first:
            print(f"Demand column '{args.demand_col}' missing. Invoking predict.predict()...")
            from predict import predict

            df[args.demand_col] = predict(df)
        else:
            print(
                f"Error: Column '{args.demand_col}' not found. Use --predict-first if providing raw telemetry."
            )
            sys.exit(1)

    print("Evaluating transition controller logic...")
    dispatch_df = batch_evaluate(df, demand_col=args.demand_col)
    dispatch_df.to_csv(args.output, index=False)

    renewable_hours = (dispatch_df["grid_mode"] == "RENEWABLE_STORAGE").sum()
    overload_hours = dispatch_df["is_overload"].sum()
    total_hours = len(dispatch_df)

    print(f"Successfully exported {total_hours} hourly transition signals to '{args.output}'.")
    print(
        f"Summary: {renewable_hours}/{total_hours} ({renewable_hours/total_hours*100:.1f}%) Renewable Mode, "
        f"{overload_hours}/{total_hours} ({overload_hours/total_hours*100:.1f}%) Critical Overloads."
    )


if __name__ == "__main__":
    main()
