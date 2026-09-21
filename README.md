# ⚡ WHOOP-Apex

<div align="center">

![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express-4.19-000000?style=for-the-badge&logo=express&logoColor=white)
![Chart.js](https://img.shields.io/badge/Chart.js-4.x-FF6384?style=for-the-badge&logo=chartdotjs&logoColor=white)
![WHOOP API](https://img.shields.io/badge/WHOOP_API-v2-00F076?style=for-the-badge&logo=target&logoColor=black)
![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)

### **The Autonomous Physiological Intelligence Platform**
*Turn passive wearable telemetry into actionable athletic dominance.*

**Autonomic Recovery Analytics** • **Exact Millisecond Sleep Architecture** • **Empirical Habit Matrix** • **VO₂ Max Protocols** • **Hypertrophy & Fat-Loss Velocity Lab**

[Explore Features](#-key-features) • [Quick Start](#-quick-start) • [Why WHOOP-Apex](#-why-athletes--biohackers-choose-whoop-apex) • [API Endpoints](#-api-endpoints) • [License](#-license)

</div>

---

## 🚀 Stop Guessing. Start Engineering Your Physiology.

> **Your WHOOP captures millions of biometric data points every single day. But raw scores don't build lean muscle, eliminate sleep debt, or tell you which specific habits actually drive your recovery.**

Most fitness trackers leave you with unanswered questions:
- *Why did my HRV crash 20ms despite sleeping 8 hours?*
- *Did cold exposure, magnesium, or meditation actually boost my deep sleep — or was it just placebo?*
- *How many calories and grams of protein should I consume today based on my real-time wearable strain and body composition goals?*

**WHOOP-Apex is the missing intelligence layer for your wearable.** It transforms raw WHOOP telemetry into an autonomous sports science laboratory — calculating empirical habit impact scores, eliminating sleep staging discrepancies down to the exact millisecond, predicting body composition velocity across 30 to 180-day horizons, and prescribing evidence-based cardiovascular training protocols.

---

### 💡 The Four Pillars of WHOOP-Apex

| 🔬 Habit Causality Engine | ⏱️ Zero-Discrepancy Sleep | 📈 Hypertrophy & Fat Loss Lab | 🫀 Aerobic Power & VO₂ Max |
| :--- | :--- | :--- | :--- |
| Discovers exactly which habits boost or destroy your recovery with empirical ±% deltas. | Sums raw millisecond durations to eliminate rounding errors. 100% match with WHOOP mobile. | Toggle between Lean Bulk and Shred with 30/60/90/180-day progress projections. | Uth–Sørensen VO₂ Max estimation paired with Norwegian 4x4 and Zone 2 protocols. |

---

### ⚔️ Why Athletes & Biohackers Choose WHOOP-Apex

| Capability | Standard Wearable Apps | WHOOP-Apex |
| :--- | :--- | :--- |
| **Habit Intelligence** | Static checklists with zero statistical correlation | **Empirical Delta Matrix**: Quantifies exact ±% recovery, ±ms HRV, and ±min slow wave sleep for every habit |
| **Body Composition** | Generic calorie counters ignoring wearable strain | **Dynamic Velocity Engine**: Calibrated +350 kcal lean bulk vs -450 kcal cut with 30/60/90/180-day progress projections |
| **Sleep Architecture** | Compounding rounding discrepancies between stages | **Exact Millisecond Engine**: Raw duration summation that eliminates compounding minute errors (`3h 46m` exact match) |
| **Cardio Ceiling** | Vague cardiovascular load scores | **VO₂ Max & Protocols**: Uth–Sørensen calculation with Norwegian 4x4 and Zone 2 polarized training plans |
| **Data Privacy** | Cloud telemetry, third-party trackers, ad monetization | **100% Sovereign & Local**: Zero external tracking, zero cloud telemetry, self-hosted on your machine |

---

## 💎 Engineered for High Performance

Designed with an ultra-minimalist, distraction-free interface inspired by professional athletic cockpits:
- **Zero-Distraction Segmented Dock**: Instant seamless navigation across Overview, Recovery, Sleep, Strain, Habits, and Hypertrophy.
- **Dynamic Trend Stat Capsules**: Instant visibility into rolling HRV baselines, resting heart rate shifts, and sleep duration.
- **Biometric Waveform Canvas**: Dual-axis spline charts with smooth gradient fills and dynamic time-range toggles.
- **Proportional Concentric Bubbles**: Sleep architecture breakdown displaying exact stage durations in minutes alongside percentage volumes.

---

## ⚡ Key Features

### 1. 🔍 Exact Millisecond Sleep Architecture
- **Discrepancy-Free**: WHOOP v2 sleep records can suffer from compounding rounding errors when individual stages are rounded before summing. WHOOP-Apex sums raw millisecond durations before flooring, guaranteeing an exact match with the official WHOOP mobile app.
- **Sleep Staging**: Deep Slow Wave Sleep (SWS), REM, Light Sleep, and Awake time tracked with exact minutes and percentage breakdowns.
- **Sleep Need & Debt**: Tracks baseline circadian sleep need, accumulated sleep debt, and strain-induced sleep need.

### 2. 🧪 Habit Correlation & Delta Engine
- **Empirical Impact Matrix**: Correlates daily active habits against nocturnal recovery metrics across 30+ days of history.
- **Statistical Deltas**: Calculates precise impact on:
  - Recovery Score (±%)
  - Heart Rate Variability (±ms)
  - Resting Heart Rate (±bpm)
  - Slow Wave Sleep (±min)
- **Actionable Insights**: Identifies personal "Super Boosters" and "Severe Disrupters" with statistical confidence ratings.

### 3. 🔬 Hypertrophy & Fat Loss Velocity Lab
- **Dynamic Goal Switcher**: Seamlessly toggle between **Muscle Gain (Lean Bulk)** and **Fat Loss (Cut & Shred)** with real-time target adjustments:
  - **Muscle Gain**: +350 kcal clean surplus, 2.1 g/kg protein for optimal Muscle Protein Synthesis (MPS), 1.0 g/kg healthy fats.
  - **Fat Loss**: -450 kcal safe deficit (3,150 kcal/wk), 2.3 g/kg lean-sparing protein, 0.8 g/kg essential hormone floor.
- **Timeline Projections & Velocity Engine**:
  - Models approximate rate of progress across **30, 60, 90, and 180 days**.
  - Shows both absolute weight change (kg / lbs) and percentage change (% muscle gained / % fat lost).
  - Based on the peer-reviewed Aragon–McDonald physiological hypertrophy and fat-oxidation models.
- **Protein Distribution & Leucine Schedule**: 4-meal timing schedule calibrated to trigger the ≥ 3.2g leucine threshold for MPS.

### 4. 🫀 VO₂ Max & Metabolic Engine
- **Cardiovascular Ceiling**: Computes cardiorespiratory fitness (VO₂ Max in $\text{mL}\cdot\text{kg}^{-1}\cdot\text{min}^{-1}$) via the validated **Uth–Sørensen** physiological model:

$$
\text{VO}_2\text{ Max} = 15.3 \times \left( \frac{\text{HR}_{\text{max}}}{\text{HR}_{\text{rest}}} \right)
$$

  - **$\text{HR}_{\text{max}}$**: Estimated max heart rate using Tanaka's physiological formula ($208 - 0.7 \times \text{age}$)
  - **$\text{HR}_{\text{rest}}$**: Baseline nocturnal resting heart rate synced directly from WHOOP

- **Evidence-Based Protocols**:
  - **Norwegian 4x4 (Gold Standard)**: 4 rounds of 4 min at 90–95% HRmax with 3 min Zone 2 active recovery.
  - **Zone 2 Polarized Base**: 45–60 min at 60–70% HRmax to build mitochondrial density and lipid oxidation.
- **Metabolic Flux**: Detailed breakdown of Basal Metabolic Rate (BMR), Thermic Effect of Food (TEF), and Total Daily Energy Expenditure (TDEE).

### 5. 🔒 100% Private & Self-Hosted
- Zero third-party tracking or cloud telemetry.
- All tokens and biometric records are stored strictly on your local machine in a local JSON datastore.

---

## 🚀 Quick Start

### Prerequisites
- [Node.js](https://nodejs.org/) (v18.0.0 or higher)
- A [WHOOP](https://www.whoop.com/) account and membership

### 1. Clone the Repository
```bash
git clone https://github.com/Hruthik9/Whoop-Apex.git
cd Whoop-Apex
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Open `.env` and fill in your WHOOP Developer credentials:
```env
WHOOP_CLIENT_ID=your_client_id_here
WHOOP_CLIENT_SECRET=your_client_secret_here
REDIRECT_URI=http://localhost:3000/api/auth/callback
PORT=3000
```

> **How to get WHOOP API Credentials:**
> 1. Go to the [WHOOP Developer Portal](https://developer.whoop.com/).
> 2. Create a new application.
> 3. Set the **Redirect URI** to `http://localhost:3000/api/auth/callback`.
> 4. Request the following OAuth scopes: `read:recovery`, `read:cycles`, `read:workout`, `read:sleep`, `read:profile`, `read:body_measurement`.
> 5. Copy your **Client ID** and **Client Secret** into your `.env` file.

### 3. Run the Dashboard
```bash
# Start production server
npm start

# Or run with auto-reload during development
npm run dev
```

Open **[http://localhost:3000](http://localhost:3000)** in your browser!

- Click **Connect** to link your live WHOOP account via OAuth 2.0.
- Or click the **Demo** button to explore the dashboard with 30+ days of realistic biometric data.

---

## 📂 Project Structure

```text
Whoop-Apex/
├── data/                    # Local JSON datastore (git-ignored for privacy)
│   └── store.json           # Auto-generated on first run
├── public/                  # Frontend client
│   ├── css/
│   │   └── styles.css       # Resq.io dark slate design tokens & animations
│   ├── js/
│   │   └── app.js           # Client controller, Chart.js, and event handlers
│   └── index.html           # Semantic single-page application shell
├── services/                # Backend domain services
│   ├── db.js                # Atomic local JSON database
│   ├── whoop.js             # WHOOP v2 OAuth & biometrics synchronization
│   ├── habits.js            # Habit correlation & statistical delta engine
│   └── hypertrophy.js       # Hypertrophy, VO2 max & timeline velocity models
├── .env.example             # Template for API credentials
├── .gitignore               # Security exclusions (tokens, env, local db)
├── package.json             # Project metadata and dependencies
├── server.js                # Express application entry point
└── README.md                # Documentation
```

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/auth/status` | Current WHOOP connection status and latest synced date |
| `GET` | `/api/auth/login` | Initiates WHOOP OAuth 2.0 authorization flow |
| `GET` | `/api/auth/callback` | OAuth redirect handler that exchanges auth code for tokens |
| `POST` | `/api/whoop/sync` | Fetches and stores latest cycles, recovery, sleep, and workouts |
| `GET` | `/api/data` | Retrieves full biometric history and latest daily record |
| `GET` | `/api/habits?date=YYYY-MM-DD` | Returns active habits and daily logs for a specific date |
| `POST` | `/api/habits/log` | Toggles an active habit for a given date |
| `POST` | `/api/habits/create` | Adds a custom user-defined habit |
| `GET` | `/api/correlations` | Computes statistical correlation matrix and recommendations |
| `GET` | `/api/hypertrophy?goal=gain\|loss` | Returns personalized macros, VO₂ Max, and timeline projections |
| `POST` | `/api/hypertrophy/log` | Logs daily nutritional intake (calories, protein, carbs, fats) |
| `POST` | `/api/demo/populate` | Seeds 30+ days of sample biometric data for evaluation |

---

## 🛡️ Privacy & Security

WHOOP-Apex was built from the ground up to protect your sensitive health data:
- **Zero Third-Party Telemetry**: No Google Analytics, no tracking pixels, no external logging.
- **Local Credential Storage**: OAuth tokens and biometric history remain strictly inside your local `data/store.json` file.
- **Secure Defaults**: `.env` and `data/store.json` are permanently excluded in `.gitignore`.

---

## 📜 License

This project is open-source under the [MIT License](LICENSE).

---

<div align="center">
<small>WHOOP-Apex is an independent open-source project and is not officially affiliated with, endorsed by, or sponsored by WHOOP, Inc.</small>
</div>
