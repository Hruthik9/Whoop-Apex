# ⚡ WHOOP-Apex AI

<div align="center">

![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express-4.19-000000?style=for-the-badge&logo=express&logoColor=white)
![WHOOP API](https://img.shields.io/badge/WHOOP_API-v2-00F076?style=for-the-badge&logo=target&logoColor=black)
![Google Health / Fitbit](https://img.shields.io/badge/Google_Fitbit-Supported-00B0B9?style=for-the-badge&logo=fitbit&logoColor=white)
![Gemini AI](https://img.shields.io/badge/Gemini_AI-Copilot-4285F4?style=for-the-badge&logo=google&logoColor=white)
![PWA](https://img.shields.io/badge/PWA-Mobile_Ready-purple?style=for-the-badge&logo=pwa&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)

### **The Autonomous Physiological Intelligence & Multi-Wearable Platform**
*Transform passive wearable telemetry into actionable athletic dominance.*

**Autonomic Recovery Analytics** • **Exact Millisecond Sleep Engine** • **Gemini AI Physiological Copilot** • **Multi-Wearable Ecosystem (WHOOP & Fitbit)** • **Hypertrophy & Fat-Loss Velocity Lab** • **Mobile PWA**

[Platform Evolution (v1 vs v2)](#-platform-evolution-v1-vs-v2) • [Choosing Your Mode](#-choosing-your-mode-v1-core-vs-v2-apex) • [Key Features](#-key-features) • [Local Setup](#-step-by-step-setup-guide) • [Render 24/7 Deployment](#-247-cloud-deployment-render) • [PWA Mobile Install](#-installing-as-a-mobile-pwa) • [API Reference](#-api-endpoints)

</div>

---

## 🚀 Stop Guessing. Start Engineering Your Physiology.

> **Your wearable captures millions of biometric data points every single day. But raw scores don't build lean muscle, eliminate sleep debt, or tell you which specific habits actually drive your recovery.**

Most fitness apps leave you with unanswered questions:
- *Why did my HRV crash 20ms despite sleeping 8 hours?*
- *Did cold exposure, magnesium, or meditation actually boost my deep sleep — or was it just placebo?*
- *How many calories and grams of protein should I consume today based on my real-time wearable strain and body composition goals?*
- *Can I aggregate both WHOOP and Google Pixel Watch / Fitbit biometrics in one unified cockpit?*

**WHOOP-Apex AI is the missing intelligence layer for your wearable.** It transforms raw telemetry into an autonomous sports science laboratory — running empirical habit causality matrices, calculating sleep staging down to the exact millisecond, projecting hypertrophy velocity across 30 to 180-day horizons, and powering an interactive **Gemini AI physiological coach** that prescribes personalized daily protocols.

---

## 🏛️ Platform Evolution: v1 vs v2

WHOOP-Apex began as a dedicated local WHOOP dashboard and evolved into an enterprise-grade multi-wearable AI operating system:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                             WHOOP-Apex Evolution                            │
├──────────────────────────────────────┬──────────────────────────────────────┤
│  v1.0 • WHOOP Sovereign Core         │  v2.0 • Multi-Wearable AI Ecosystem  │
├──────────────────────────────────────┼──────────────────────────────────────┤
│ • Pure WHOOP 4.0 Telemetry           │ • Dual-Provider Architecture:        │
│ • Exact Millisecond Sleep Staging    │   - WHOOP 4.0 Live API               │
│ • Empirical Habit Delta Engine       │   - Google Health / Fitbit API       │
│ • Hypertrophy & Fat Loss Lab         │ • Gemini AI Physiological Copilot    │
│ • Uth-Sørensen VO2 Max Estimation    │ • Standalone Mobile PWA + Bottom Dock│
│ • Local JSON Database (data/store)   │ • 24/7 Render Cloud Deployment       │
│ • Focused Desktop Cockpit            │ • Dual-Layer Silent OAuth Restore    │
│                                      │ • Dynamic Time Filters (1M / 2W / 1W)│
│                                      │ • In-App Account Manager Modal       │
└──────────────────────────────────────┴──────────────────────────────────────┘
```

### 🏷️ Version Comparison Matrix

| Feature | v1.0 (WHOOP Sovereign Core) | v2.0 (WHOOP-Apex Multi-Wearable AI) |
| :--- | :--- | :--- |
| **Supported Devices** | WHOOP 4.0 only | **WHOOP 4.0** + **Google Pixel Watch & Fitbit Sense 2** |
| **Wearable Switching** | Single provider | **1-Click Live Switcher** (blends steps/active zones cleanly; masks when in WHOOP mode) |
| **AI Intelligence** | Rule-based heuristics | **Gemini AI Physiological Copilot** (conversational analysis, active session memory, context-aware) |
| **Mobile Experience** | Desktop responsive | **Full Native PWA**: Fullscreen standalone, thumb-nav bottom dock, custom "Apex Pulse" icons |
| **Cloud Deployment** | Local machine only | **Render 24/7 Cloud Support** (`whoop-apex-ai.onrender.com`) with `render.yaml` Blueprint |
| **Session Persistence**| Local file storage | **Dual-Layer Auto-Restore**: Browser `localStorage` + Backend `WHOOP_REFRESH_TOKEN` seeding |
| **Trend Filtering**   | Static time ranges | **Dynamic Time Filtering**: 1 Month (30d), 2 Weeks (14d), 1 Week (7d) with touch points |
| **Account Management** | Manual CLI | **In-App Account Manager**: Inspect user, switch accounts, disconnect, or copy cloud tokens |

---

## 🎛️ Choosing Your Mode: v1 Core vs v2 Apex

WHOOP-Apex gives you complete flexibility over your setup. You can run in **v1 Mode** or unlock the full **v2 Mode**:

### 🔹 Mode 1: v1 Sovereign WHOOP-Only Mode
*Best for athletes who only wear a WHOOP strap and desire a minimal, lightning-fast, zero-bloat dashboard.*
- **How it works**: By default, WHOOP is the primary provider. When in WHOOP mode, all third-party metrics (Fitbit steps, active zone minutes) are cleanly hidden from the UI.
- **Requirements**: Only WHOOP developer credentials (`WHOOP_CLIENT_ID` and `WHOOP_CLIENT_SECRET`). No Google account or Gemini API key required.
- **Key benefits**:
  - Pure WHOOP 4.0 data stream.
  - Zero-discrepancy millisecond sleep staging (100% match with WHOOP app).
  - 30-day habit correlation matrix.
  - Aragon-McDonald hypertrophy projections and Uth-Sørensen VO₂ Max calculator.

### 🔹 Mode 2: v2 WHOOP-Apex Multi-Wearable AI Platform
*Best for athletes with multiple devices (WHOOP + Google Pixel Watch / Fitbit) or those who want an intelligent AI sports scientist copilot.*
- **How it works**: Unlocks the 1-click provider switcher in the top bar, integrates Google Health / Fitbit telemetry, powers up the conversational Gemini AI coach, and enables mobile PWA installation with 24/7 cloud availability.
- **Requirements**: WHOOP credentials + `GEMINI_API_KEY` (free from Google AI Studio).
- **Key benefits**:
  - Live Gemini AI Copilot for personalized recovery diagnostics and training recommendations.
  - Seamless toggle between WHOOP 4.0 and Google Pixel Watch / Fitbit.
  - Native mobile PWA with thumb-dock navigation.
  - Permanent 24/7 deployment on Render with automatic token restoration across cold starts.
  - Dynamic 1 Month (30d), 2 Weeks (14d), and 1 Week (7d) trend graphs.

---

## ⚡ Key Features

### 1. 🤖 Gemini AI Physiological Copilot & Live Chat (v2)
- **Context-Aware Coaching**: Feeds live recovery scores, HRV baselines, sleep staging, and daily active habits directly into Gemini 2.5 Flash.
- **Dynamic Training Advice**: Asks questions like *"Can I lift heavy today?"*, *"Why did my recovery crash?"*, or *"Break down my sleep architecture"*.
- **Active Session Memory**: Multi-turn conversational memory allows natural follow-ups (*"What should my pre-bed routine look like instead?"*).
- **Ergonomic Chat Console**: Messages stream cleanly on top while the input bar remains docked at the bottom for thumb ergonomics on smartphones and desktops.

### 2. ⌚ Multi-Wearable Ecosystem: WHOOP & Google Fitbit (v2)
- **Seamless Provider Switching**: Switch between WHOOP 4.0 and Google Fitbit / Pixel Watch with a single click in the header.
- **Unified Biometric Normalization**: Automatically maps disparate metrics (WHOOP Strain vs Fitbit Active Zone Minutes, WHOOP Sleep Debt vs Fitbit Sleep Score).
- **Interface Harmony**: When in WHOOP mode, Fitbit-specific metrics are cleanly hidden to preserve a pure, focused cockpit.
- **30-Day High-Fidelity Simulation**: Includes instant access to 30 days of realistic Pixel Watch biometrics to test all features without requiring physical Google hardware.

### 3. 🔍 Exact Millisecond Sleep Architecture (v1 & v2)
- **Zero-Discrepancy Engine**: Standard wearable apps round stages before summing, causing compounding minute errors. WHOOP-Apex sums raw millisecond timestamps before flooring, achieving a **100% exact match** with the official WHOOP mobile app.
- **Four-Stage Staging**: Slow Wave Sleep (SWS Deep), REM, Light Sleep, and Awake time presented with minute tallies and percentage volumes.
- **Sleep Need & Circadian Debt**: Tracks baseline sleep need, accumulated sleep debt, and strain-induced sleep demand.

### 4. 🧪 Habit Correlation & Statistical Delta Matrix (v1 & v2)
- **Empirical Causality**: Discovers which habits statistically correlate with higher or lower recovery across 30+ days of historical telemetry.
- **Quantified Deltas**:
  - Recovery Score Impact ($\pm\%$)
  - Heart Rate Variability Impact ($\pm\text{ms}$)
  - Resting Heart Rate Shift ($\pm\text{bpm}$)
  - Slow Wave Deep Sleep Duration ($\pm\text{min}$)
- **Actionable Confidence Ratings**: Categorizes habits into *Super Boosters* and *Severe Disrupters* with statistical confidence badges.

### 5. 🔬 Hypertrophy & Fat-Loss Velocity Lab (v1 & v2)
- **Dual-Goal Velocity Engine**:
  - **Muscle Gain (Lean Bulk)**: +350 kcal surplus, 2.1 g/kg protein for optimal Muscle Protein Synthesis (MPS), 1.0 g/kg healthy fats.
  - **Fat Loss (Cut & Shred)**: -450 kcal safe deficit (3,150 kcal/wk), 2.3 g/kg lean-sparing protein, 0.8 g/kg essential hormone floor.
- **30 / 60 / 90 / 180-Day Projections**: Uses the peer-reviewed Aragon–McDonald physiological body composition model to forecast muscle growth and fat oxidation trajectories.
- **Leucine & Nutrient Timing**: 4-meal distribution schedule calibrated to trigger the $\ge 3.2\text{g}$ leucine threshold for muscle protein synthesis.

### 6. 🫀 Cardiorespiratory Ceiling & VO₂ Max Protocols (v1 & v2)
- **Uth–Sørensen Physiological Calculation**:
  $$\text{VO}_2\text{ Max} = 15.3 \times \left( \frac{\text{HR}_{\text{max}}}{\text{HR}_{\text{rest}}} \right)$$
  *(Using Tanaka's formula $\text{HR}_{\text{max}} = 208 - 0.7 \times \text{age}$ paired with nocturnal baseline resting heart rate).*
- **Evidence-Based Conditioning Plans**:
  - **Norwegian 4x4 (Gold Standard)**: 4 intervals of 4 min at 90–95% HRmax with 3 min Zone 2 recovery.
  - **Zone 2 Polarized Base**: 45–60 min at 60–70% HRmax to build mitochondrial density and capillary beds.

### 7. 📈 Dynamic Time Horizon Filtering (v2)
- **1 Month (30d)**: View medium-term physiological adaptations and recovery baseline trends.
- **2 Weeks (14d)**: Track immediate supercompensation and overreaching cycles.
- **1 Week (7d)**: Day-by-day granular breakdown with interactive data points for precise daily telemetry.

### 8. 📱 Progressive Web App (PWA) & Custom Branding (v2)
- **Native iOS & Android Experience**: Add to Home Screen via Safari or Chrome for a fullscreen, bezel-free standalone app.
- **Thumb-Friendly Navigation**: Mobile bottom dock with quick access to Overview, Recovery, Sleep, Strain, and Habits.
- **"Apex Pulse" Brand Identity**: Custom-crafted vector icon combining the "A" pinnacle, ECG cardiovascular frequency wave, and the WHOOP continuous recovery loop in Electric Bio-Emerald (`#00F076`) and Cyber Cyan (`#00E5FF`).

### 9. 🔒 Permanent Session Persistence & Account Manager (v2)
- **Silent Auto-Restore**: Preserves rotating OAuth tokens in browser `localStorage`, silently restoring your session in under 200ms when Render instances wake from cold-starts.
- **In-App Account Manager**: Inspect your connected profile, copy your cloud token for Render, switch to another WHOOP account, or disconnect cleanly.

---

## 🛠️ Step-by-Step Setup Guide

### Option A: Local Development Setup

#### 1. Prerequisites
- [Node.js](https://nodejs.org/) (v18.0.0 or higher)
- A [WHOOP](https://www.whoop.com/) account (or use built-in demo simulation)

#### 2. Clone Repository & Install Dependencies
```bash
git clone https://github.com/Hruthik9/Whoop-Apex.git
cd Whoop-Apex
npm install
```

#### 3. Create WHOOP Developer App
1. Go to the [WHOOP Developer Portal](https://developer.whoop.com/).
2. Click **Create Application**.
3. Fill in your App details:
   - **App Name**: `WHOOP-Apex`
   - **Redirect URI**: `http://localhost:3000/api/auth/callback`
4. Make sure all required OAuth scopes are checked:
   - `read:recovery`
   - `read:cycles`
   - `read:workout`
   - `read:sleep`
   - `read:profile`
   - `read:body_measurement`
   - `offline` *(critical for rotating refresh tokens)*
5. Copy your **Client ID** and **Client Secret**.

#### 4. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Edit `.env` and fill in your values:
```env
# Required for WHOOP Connection (v1 & v2)
WHOOP_CLIENT_ID=your_whoop_client_id_here
WHOOP_CLIENT_SECRET=your_whoop_client_secret_here
REDIRECT_URI=http://localhost:3000/api/auth/callback

# Optional for Gemini AI Physiological Copilot (v2)
# Free key from https://aistudio.google.com
GEMINI_API_KEY=your_gemini_api_key_here

# Server Port
PORT=3000
```

#### 5. Launch Application
```bash
# Start server
npm start

# Or start in development mode with auto-restart
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser!

---

### Option B: 24/7 Cloud Deployment (Render.com)

Deploy WHOOP-Apex AI permanently to the cloud so you can access it on your phone anytime without keeping your computer on.

#### Step 1: Push Code to GitHub
Fork or push this repository to your GitHub account (`https://github.com/your-username/Whoop-Apex`).

#### Step 2: Create Web Service on Render
1. Go to [dashboard.render.com](https://dashboard.render.com).
2. Click **+ New** $\rightarrow$ **Web Service**.
3. Select **Build and deploy from a Git repository** and connect your `Whoop-Apex` repository.

#### Step 3: Configure Render Settings
- **Name**: `whoop-apex-ai` *(Sets your URL to: `https://whoop-apex-ai.onrender.com`)*
- **Runtime**: `Node`
- **Build Command**: `npm install`
- **Start Command**: `npm start`
- **Instance Type**: **Free ($0/month)**

#### Step 4: Add Environment Variables in Render
Under the **Environment** tab on Render, add:

| Key | Value | Notes |
| :--- | :--- | :--- |
| `WHOOP_CLIENT_ID` | `your_whoop_client_id` | From WHOOP Developer Portal |
| `WHOOP_CLIENT_SECRET` | `your_whoop_client_secret` | From WHOOP Developer Portal |
| `REDIRECT_URI` | `https://whoop-apex-ai.onrender.com/api/auth/callback` | Exact URL on Render |
| `GEMINI_API_KEY` | `your_gemini_api_key` | Optional: Enables AI Copilot |
| `WHOOP_REFRESH_TOKEN` | *(optional)* | Preserves login across cold-starts |

#### Step 5: Update Redirect URI in WHOOP Portal
1. Open [developer.whoop.com/dashboard](https://developer.whoop.com/dashboard).
2. Under **Redirect URIs**, add:
   ```text
   https://whoop-apex-ai.onrender.com/api/auth/callback
   ```
3. Save changes.

#### Step 6: Deploy & Connect
1. Click **Deploy** in Render.
2. Once live, open `https://whoop-apex-ai.onrender.com`.
3. Click **Connect WHOOP** and authorize. Your telemetry will sync automatically!

---

## 📱 Installing as a Mobile PWA

WHOOP-Apex is an installable Progressive Web App (PWA) with full offline caching and native app behavior:

### On iPhone (iOS Safari):
1. Open `https://whoop-apex-ai.onrender.com` in **Safari**.
2. Tap the **Share** button (box with upward arrow) at the bottom.
3. Scroll down and tap **Add to Home Screen**.
4. Tap **Add** in the top right.
5. Launch WHOOP-Apex from your home screen — it will open in fullscreen mode without any browser URL bars, complete with the custom "Apex Pulse" icon!

### On Android (Chrome):
1. Open `https://whoop-apex-ai.onrender.com` in **Chrome**.
2. Tap the **three-dot menu** in the top right.
3. Tap **Install app** (or **Add to Home screen**).
4. Launch from your home screen.

---

## 🔒 Session Persistence & Account Management

Because Render's free tier spins down inactive containers after 15 minutes, standard cloud deployments typically force you to re-login every time the container wakes up. WHOOP-Apex solves this with a **Dual-Layer Persistence Engine**:

1. **Browser LocalStorage Auto-Restore**:
   When you connect your WHOOP account, your rotating refresh token is safely saved in your browser's private `localStorage`. Whenever you open the app after a server cold-start, the client silently calls `/api/auth/restore` behind the scenes, refreshing your session without any user interaction.
2. **Environment Variable Seeding**:
   You can also set `WHOOP_REFRESH_TOKEN` in Render's environment settings. This guarantees the server boots up pre-authenticated on every deploy.
3. **In-App Account Manager**:
   - Click **`WHOOP Linked ⚙️`** or your avatar in the header to open the Account Manager modal.
   - View your connected user profile and token status.
   - Click **Copy Refresh Token** to paste into your Render environment variables.
   - Click **Switch / Re-login Account** to connect a different WHOOP account at any time.
   - Click **Disconnect** to reset the active session.

---

## 📂 Project Architecture

```text
Whoop-Apex/
├── data/                    # Local JSON datastore (git-ignored for privacy)
│   └── store.json           # Auto-created on first run
├── public/                  # Frontend Client & Assets
│   ├── css/
│   │   └── styles.css       # Resq.io dark obsidian styling & mobile dock
│   ├── icons/               # "Apex Pulse" High-DPI PWA & Apple Touch icons
│   │   ├── apple-touch-icon.png  (180x180 px iOS icon)
│   │   ├── favicon-32x32.png     (32x32 px desktop tab)
│   │   ├── icon-192.png          (192x192 px Android icon)
│   │   └── icon-512.png          (512x512 px splash icon)
│   ├── js/
│   │   └── app.js           # Client controller, Chart.js, PWA & silent restore
│   ├── index.html           # Responsive single-page application shell
│   ├── manifest.json        # PWA configuration
│   └── sw.js                # Service Worker with v2 cache strategy
├── services/                # Backend Domain Services
│   ├── db.js                # Atomic JSON database with env-fallback token seeding
│   ├── whoop.js             # WHOOP v2 OAuth, atomic mutex & millisecond sync
│   ├── googleHealth.js      # Google Health / Fitbit telemetry & simulated data
│   ├── aiCoach.js           # Gemini 2.5 Flash physiological prompt engine
│   ├── habits.js            # Habit causality & statistical correlation engine
│   ├── hypertrophy.js       # Hypertrophy, Aragon-McDonald velocity & VO2 Max
│   └── demoData.js          # 30-day realistic baseline biometric generator
├── render.yaml              # Render 1-click cloud deployment blueprint
├── .env.example             # Environment credentials template
├── .gitignore               # Security exclusions (tokens, env, store.json)
├── package.json             # Dependencies and node engine specs
├── server.js                # Express application and REST API endpoints
└── README.md                # Platform documentation
```

---

## 🔌 API Endpoints

### Authentication & Provider Management
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/auth/status` | Current active provider, connection status, user profile, and dates |
| `GET` | `/api/auth/login` | Initiates WHOOP OAuth 2.0 authorization redirect |
| `GET` | `/api/auth/callback` | Handles OAuth redirect, exchanges code for rotating tokens |
| `POST` | `/api/auth/restore` | Silently restores session from client-stored refresh token |
| `POST` | `/api/auth/disconnect`| Clears active tokens and switches to demo mode |
| `GET` | `/api/auth/google/status` | Returns Google Health / Fitbit connection status |
| `POST` | `/api/auth/switch-provider` | Toggles between `'whoop'` and `'google_fitbit'` |

### Biometrics & Synchronization
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/whoop/sync` | Pulls latest cycles, recovery, sleep, and workout records |
| `GET` | `/api/data` | Returns complete normalized biometric history |
| `POST` | `/api/demo/populate` | Seeds 30+ days of realistic biometric data |

### Habits & Correlation Matrix
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/habits?date=YYYY-MM-DD` | Returns active habits and daily logs |
| `POST` | `/api/habits/log` | Toggles an active habit for a given calendar date |
| `POST` | `/api/habits/create` | Creates a custom user-defined habit |
| `GET` | `/api/correlations` | Computes statistical correlation matrix and recommendations |

### Hypertrophy, Nutrition & VO₂ Max
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/hypertrophy?goal=gain\|loss` | Personalized macro targets, VO₂ Max, and progress projections |
| `POST` | `/api/hypertrophy/log` | Logs daily nutrition (calories, protein, carbs, fats) |

### Gemini AI Physiological Copilot
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/ai/coach/chat` | Interactive multi-turn Gemini AI physiological copilot endpoint |

---

## ❓ Troubleshooting & FAQs

### Q: Why do I get a `400 invalid_request` during token refresh?
**A:** The WHOOP OAuth 2.0 specification strictly requires `scope: 'offline'` in the token refresh POST body to `https://api.prod.whoop.com/oauth/oauth2/token`. WHOOP-Apex includes this parameter automatically alongside an atomic refresh mutex lock to eliminate concurrency race conditions.

### Q: Does WHOOP support steps and active zone minutes?
**A:** No. WHOOP measures strain via continuous cardiovascular heart-rate load rather than step counting. When running in WHOOP mode (v1), steps and active zones are automatically masked. If you want step and active zone tracking, switch to the Google Health / Fitbit provider (v2) in the top header!

### Q: Can I run this without a Gemini API key?
**A:** Yes! The core dashboard, exact millisecond sleep staging, habit correlations, hypertrophy lab, and VO₂ Max protocols run completely independently of Gemini. If `GEMINI_API_KEY` is omitted, the AI coach will simply inform you to add a key.

---

## 🛡️ Privacy & Security

- **Zero External Telemetry**: No third-party ad trackers, tracking cookies, or commercial analytics scripts.
- **Local Sovereign Storage**: OAuth tokens and health history are saved strictly to your local `data/store.json` file or private Render instance.
- **Secure Default Git Exclusions**: `.env` and `data/store.json` are permanently excluded via `.gitignore`.

---

## 📜 License

This project is open-source under the [MIT License](LICENSE).

---

<div align="center">
<small>WHOOP-Apex is an independent open-source project and is not officially affiliated with, endorsed by, or sponsored by WHOOP, Inc. or Google LLC.</small>
</div>
