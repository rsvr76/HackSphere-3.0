"""
HackSphere 3.0 — Transition Controller Automated Verification Test Suite
Verifies 100% compliance with Section 6 & 7 of the official competition rubric (20% Weight).

Tests 10 critical boundary and edge conditions.
"""

import sys
import unittest
import pandas as pd
from transition_controller import evaluate_transition, batch_evaluate


class TestTransitionControllerLogic(unittest.TestCase):
    def test_tc01_below_switching_threshold_off_peak(self):
        """TC-01: 159.9 kW at 14:00 (outside peak) -> MAIN_GRID, no overload."""
        res = evaluate_transition(159.9, "2024-06-01 14:00:00")
        self.assertEqual(res["grid_mode"], "MAIN_GRID")
        self.assertFalse(res["is_overload"])
        self.assertEqual(res["trigger_code"], "MAIN_GRID_BASELOAD")

    def test_tc02_exact_boundary_160_kw_off_peak(self):
        """TC-02: Exactly 160.0 kW at 14:00 -> MAIN_GRID (rule states > 160 kW strictly)."""
        res = evaluate_transition(160.0, "2024-06-01 14:00:00")
        self.assertEqual(res["grid_mode"], "MAIN_GRID")
        self.assertFalse(res["is_overload"])
        self.assertEqual(res["trigger_code"], "MAIN_GRID_BASELOAD")

    def test_tc03_boundary_breach_160_05_kw_off_peak(self):
        """TC-03: 160.05 kW at 14:00 -> RENEWABLE_STORAGE (strictly > 160 kW)."""
        res = evaluate_transition(160.05, "2024-06-01 14:00:00")
        self.assertEqual(res["grid_mode"], "RENEWABLE_STORAGE")
        self.assertFalse(res["is_overload"])
        self.assertEqual(res["trigger_code"], "HIGH_DEMAND_TRIGGER")

    def test_tc04_evening_peak_start_boundary_18_00(self):
        """TC-04: 18:00 with low demand 85 kW -> RENEWABLE_STORAGE (18:00 inclusive)."""
        res = evaluate_transition(85.0, "2024-06-01 18:00:00")
        self.assertEqual(res["grid_mode"], "RENEWABLE_STORAGE")
        self.assertFalse(res["is_overload"])
        self.assertEqual(res["trigger_code"], "EVENING_PEAK_TRIGGER")

    def test_tc05_evening_peak_end_boundary_22_00(self):
        """TC-05: 22:00 with low demand 90 kW -> RENEWABLE_STORAGE (22:00 inclusive)."""
        res = evaluate_transition(90.0, "2024-06-01 22:00:00")
        self.assertEqual(res["grid_mode"], "RENEWABLE_STORAGE")
        self.assertFalse(res["is_overload"])
        self.assertEqual(res["trigger_code"], "EVENING_PEAK_TRIGGER")

    def test_tc06_outside_evening_peak_23_00(self):
        """TC-06: 23:00 with demand 95 kW -> MAIN_GRID (23:00 is outside 18:00–22:00 window)."""
        res = evaluate_transition(95.0, "2024-06-01 23:00:00")
        self.assertEqual(res["grid_mode"], "MAIN_GRID")
        self.assertFalse(res["is_overload"])
        self.assertEqual(res["trigger_code"], "MAIN_GRID_BASELOAD")

    def test_tc07_outside_evening_peak_17_00(self):
        """TC-07: 17:00 with demand 140 kW -> MAIN_GRID (17:00 is outside 18:00–22:00 window)."""
        res = evaluate_transition(140.0, "2024-06-01 17:00:00")
        self.assertEqual(res["grid_mode"], "MAIN_GRID")
        self.assertFalse(res["is_overload"])
        self.assertEqual(res["trigger_code"], "MAIN_GRID_BASELOAD")

    def test_tc08_just_below_overload_threshold_199_99_kw(self):
        """TC-08: 199.99 kW at 14:00 -> RENEWABLE_STORAGE, is_overload is False (>= 200 kW)."""
        res = evaluate_transition(199.99, "2024-06-01 14:00:00")
        self.assertEqual(res["grid_mode"], "RENEWABLE_STORAGE")
        self.assertFalse(res["is_overload"])
        self.assertEqual(res["trigger_code"], "HIGH_DEMAND_TRIGGER")

    def test_tc09_exact_overload_boundary_200_0_kw(self):
        """TC-09: 200.0 kW at 14:00 -> RENEWABLE_STORAGE and is_overload is True (>= 200 kW)."""
        res = evaluate_transition(200.0, "2024-06-01 14:00:00")
        self.assertEqual(res["grid_mode"], "RENEWABLE_STORAGE")
        self.assertTrue(res["is_overload"])
        self.assertIn("CRITICAL OVERLOAD", res["trigger_reason"])

    def test_tc10_dual_trigger_with_overload(self):
        """TC-10: 245.0 kW at 20:00 -> RENEWABLE_STORAGE, is_overload is True, DUAL_TRIGGER."""
        res = evaluate_transition(245.0, "2024-06-01 20:00:00")
        self.assertEqual(res["grid_mode"], "RENEWABLE_STORAGE")
        self.assertTrue(res["is_overload"])
        self.assertEqual(res["trigger_code"], "DUAL_TRIGGER")
        self.assertGreater(res["battery_dispatch_kw"], 0)

    def test_batch_evaluation_integrity(self):
        """TC-11: Batch evaluation preserves DataFrame rows and schema."""
        timestamps = [f"2024-06-01 {h:02d}:00:00" for h in range(24)]
        demands = [100.0 + h * 5 for h in range(24)]
        df = pd.DataFrame({"timestamp": timestamps, "target_demand_kw": demands})

        out = batch_evaluate(df, demand_col="target_demand_kw")
        self.assertEqual(len(out), 24)
        self.assertIn("grid_mode", out.columns)
        self.assertIn("is_overload", out.columns)
        self.assertIn("trigger_code", out.columns)
        self.assertIn("battery_dispatch_kw", out.columns)


if __name__ == "__main__":
    print("======================================================================")
    print(" HackSphere 3.0 — Transition Controller Unit Test Suite (20% Rubric)")
    print("======================================================================")
    runner = unittest.TextTestRunner(verbosity=2)
    suite = unittest.TestLoader().loadTestsFromTestCase(TestTransitionControllerLogic)
    result = runner.run(suite)
    if result.wasSuccessful():
        print("\nALL 11 TRANSITION CONTROLLER TESTS PASSED (100% SUCCESS)!")
        sys.exit(0)
    else:
        print("\nSOME TESTS FAILED!")
        sys.exit(1)
