# HackSphere 3.0 — Smart Energy Microgrid & Demand Forecasting Engine

An end-to-end intelligent microgrid energy management and demand forecasting platform deployed on Zoho Catalyst. Built for the HackSphere 3.0 hackathon challenge, the system forecasts 24-hour hourly energy demand using a high-precision Zoho Catalyst QuickML Stacking Regression model and dynamically dispatches power transitions between the Main Grid and Renewable Battery Storage, while actively monitoring critical grid overload thresholds.

Live Catalyst Application: [https://hacksphere-xnlbnoyd.onslate.in](https://hacksphere-xnlbnoyd.onslate.in)

## Key Highlights & Performance Metrics

* Model Accuracy (35% Rubric): QuickML Stacking Regressor (Gradient Boosting + Random Forest + Ridge Meta-Learner) achieving RMSE = 8.8562 kW, R² = 0.9695, MAE = 7.0972 kW, and MAPE = 5.0693% in Zoho Catalyst.
* Transition Controller Logic (20% Rubric): 100% test pass rate across 11 boundary scenarios in automated test suite (`data/test_transition_controller.py`), strictly enforcing the 160 kW switching boundary, 18:00–22:00 peak window, and 200 kW overload condition.
* Deployment & Live Functionality (35% Rubric): Publicly accessible, responsive single-file production bundle hosted on Zoho Catalyst Slate with complete end-to-end telemetry ingestion, inference, dispatch calculation, and export pipelines.
* UI & User Experience (10% Rubric): Command-center dashboard featuring dynamic 24-hour demand visualization, animated microgrid power flow synoptic topology, 24-hour time-travel scrubber with auto-simulation playback, 1-click judge presets, manual telemetry bounds cleaner, dispatch audit log with CSV export, and full dark/light theme support.

## System Architecture

The solution leverages Zoho Catalyst full-stack serverless capabilities:

```
[ Telemetry Ingestion ]
  │  ├── 24-Hour Weather Telemetry CSV Upload
  │  ├── Interactive Manual Telemetry Form & Validator
  │  └── 1-Click Operational Presets (Heatwave, Solar, Peak, Baseload)
  ▼
[ Catalyst QuickML Forecasting Engine ]
  │  ├── Feature Engineering Pipeline (Cyclical Hour, Cooling Degree, Thermal Inertia)
  │  ├── Stacking Regression Ensemble (Gradient Boosting, Random Forest, Ridge)
  │  └── REST Inference Endpoint (predict.py & client engine)
  ▼
[ Transition Controller Engine ]
  │  ├── Demand Threshold Check (> 160 kW strictly)
  │  ├── Time-of-Use Peak Window (18:00 - 22:00 inclusive)
  │  ├── Critical Overload Detection (>= 200 kW)
  │  └── Power Flow Distribution (Utility Grid vs Solar PV vs Battery BESS)
  ▼
[ Zoho Catalyst Slate UI Dashboard ]
  │  ├── Recharts 24-Hour Demand Curve with Synchronized Inspector
  │  ├── Interactive Microgrid Synoptic Power Flow Topology
  │  ├── 24-Hour Time-Travel Scrubber with 1.2s Simulation Playback
  │  ├── Historical Dispatch Audit Log & Signal Exporter
  │  └── Dark / Light Mode Engine (WCAG AA Compliant)
```

## Transition Controller Logic & Dispatch Rules

The transition controller determines the active power source for each forecast hour and issues alerts according to the official HackSphere 3.0 specification:

| Condition | Grid Mode / Alert State | Description |
| :--- | :--- | :--- |
| Demand > 160 kW OR timestamp hour in [18:00, 22:00] | **Renewable Storage Mode** | Energy drawn from Battery Storage / Solar PV to shave grid peak and reduce carbon emissions. |
| Demand <= 160 kW AND outside [18:00, 22:00] | **Main Grid Mode** | Facility powered by municipal utility grid during off-peak hours. |
| Demand >= 200 kW | **Critical Overload Alert** | Independent system-wide safety alert triggered whenever demand reaches or exceeds 200 kW. |

## Repository Structure

```
Hacksphere/
├── build.zip                          # Catalyst Slate ready-to-deploy bundle
├── LICENSE                            # MIT License
├── README.md                          # Complete project and architecture documentation
├── data/
│   ├── train_telemetry.csv            # Ground-truth training dataset (4,000 hours)
│   ├── sample_test_input.csv          # Chronological test input dataset (1,000 hours)
│   ├── train_augmented.csv            # Feature-engineered dataset (cyclical, cooling degree)
│   ├── train_augmented_v3.csv         # Optimized dataset with rush cooling interaction
│   ├── predict.py                     # Official evaluation inference client (CLI + QuickML REST)
│   ├── test_eval.py                   # Pre-submission contract validation script
│   ├── transition_controller.py       # Standalone transition controller engine & CLI batch evaluator
│   └── test_transition_controller.py  # 11-case automated boundary unit test suite
├── docs/
│   └── competition/
│       ├── PROBLEM_STATEMENT.md       # Official hackathon problem specification
│       └── PROBLEM_STATEMENT.pdf      # Competition briefing document
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── ForecastChart.tsx      # 24-hour demand visualization with reference lines
    │   │   ├── PowerFlowDiagram.tsx   # Synoptic topology with Grid, Solar, Battery, Load
    │   │   ├── TimeScrubber.tsx       # 24-hour scrubber with auto-simulation playback
    │   │   ├── ScenarioPresets.tsx    # 1-click judge test scenarios
    │   │   ├── ManualInputModal.tsx   # Telemetry input form with schema cleaner
    │   │   ├── DispatchLogTable.tsx   # Chronological transition and alert audit log
    │   │   ├── TransitionPanel.tsx    # Active state card, dispatch decision matrix, impact metrics
    │   │   ├── OverloadBanner.tsx     # Critical alert banner for >= 200 kW events
    │   │   └── WhatIfSimulator.tsx    # Interactive single-hour parameter simulator
    │   ├── utils/
    │   │   └── microgridLogic.ts      # Client-side microgrid calculation engine
    │   ├── App.tsx                    # Dashboard container and state orchestration
    │   └── main.tsx                   # React root mount
    ├── dist/
    │   └── index.html                 # Inlined single-file production build
    └── package.json                   # Frontend dependencies and build scripts
```

## Getting Started & Local Setup

### Prerequisites

* Python 3.10 or higher
* Node.js 18 or higher with npm

### 1. Python Inference & Controller Testing

The evaluation scripts can be executed directly from either the **project root** or within the **data/** directory.

Install the required Python packages:

`ash
pip install requests pandas numpy scikit-learn
`

Run the mandatory pre-submission self-test:

`ash
python test_eval.py
`


Expected output:
```
  HACKSPHERE 3.0 - Pre-Submission Self-Tester    
 Found 'predict.py'.
 Found 'sample_test_input.csv'.
 Successfully imported 'predict(input_df)' function.
Loaded 1000 test rows from 'sample_test_input.csv'.
Your predict.py script is completely valid!
SUCCESS
```

Run the transition controller unit test suite:

```bash
python test_transition_controller.py
```

Expected output:
```
Ran 11 tests in 0.427s ... OK
ALL 11 TRANSITION CONTROLLER TESTS PASSED (100% SUCCESS)!
```

Generate predictions via the CLI:

```bash
python predict.py --input sample_test_input.csv --output predictions.csv
```

Evaluate transitions in batch mode:

```bash
python transition_controller.py --input predictions.csv --output transition_schedule.csv
```

### 2. Frontend Dashboard Setup

Navigate to the `frontend/` directory:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

Start the local development server:

```bash
npm run dev
```

Build the single-file distribution bundle:

```bash
npm run build
```

The build compiles into `frontend/dist/index.html`. This single-file bundle is ready for direct deployment to Zoho Catalyst Slate.

## Zoho Catalyst QuickML Configuration

The `data/predict.py` script is pre-configured to communicate with the published Zoho Catalyst QuickML endpoint. You can configure endpoint parameters via environment variables or CLI flags:

| Environment Variable | Description | Default / Current Value |
| :--- | :--- | :--- |
| `QUICKML_ENDPOINT_URL` | Published QuickML REST inference endpoint | `https://api.catalyst.zoho.in/quickml/v1/project/104872000000013051/endpoints/predict` |
| `QUICKML_ENDPOINT_KEY` | Secret authentication key for QuickML endpoint | Configured in `predict.py` |
| `CATALYST_PROJECT_ID` | Zoho Catalyst Project ID | `104872000000013051` |
| `CATALYST_ORG_ID` | Zoho Catalyst Organization ID | `60093159850` |
| `CATALYST_ENVIRONMENT` | Deployment environment | `Development` |

If the remote QuickML API is unreachable or experiences network latency, `predict.py` includes an embedded offline fallback regression model based on the same validated coefficients to ensure zero downtime and uninterrupted evaluation compliance.

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
