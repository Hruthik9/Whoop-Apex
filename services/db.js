const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'store.json');

const PREDEFINED_HABITS_CATALOG = [
  // Sleep & Circadian Architecture
  { id: 'caffeine_cutoff', name: 'No Caffeine After 2 PM', category: 'Sleep', icon: '☕', description: 'Prevents adenosine receptor blockade; preserves slow-wave sleep.', impact: '+8% Deep Sleep' },
  { id: 'screen_cutoff', name: 'No Screens 1h Before Bed', category: 'Sleep', icon: '📱', description: 'Eliminates 450-480nm blue light melatonin suppression.', impact: '+12% Sleep Efficiency' },
  { id: 'morning_sunlight', name: 'Morning Sunlight (15 min)', category: 'Circadian', icon: '☀️', description: 'Sets the suprachiasmatic nucleus circadian clock and triggers evening melatonin.', impact: '+15m Sleep Duration' },
  { id: 'cool_bedroom', name: 'Cool Bedroom (66°F / 19°C)', category: 'Sleep', icon: '❄️', description: 'Facilitates core body temperature drop required for deep Slow Wave Sleep.', impact: '+14% Slow Wave Sleep' },
  { id: 'dark_room_mask', name: 'Blackout Room / Sleep Mask', category: 'Sleep', icon: '🌑', description: 'Eliminates ambient photon exposure to prevent micro-arousals and REM sleep disruption.', impact: '+9% REM Sleep' },
  { id: 'mouth_taping', name: 'Nasal Breathing / Mouth Tape', category: 'Sleep', icon: '💤', description: 'Promotes nitric oxide uptake, eliminates snoring, and stabilizes blood oxygen (SpO2).', impact: '+6% HRV, +2% SpO2' },
  { id: 'consistent_bedtime', name: 'Consistent Bedtime (±30m)', category: 'Circadian', icon: '⏰', description: 'Anchors peripheral circadian oscillators, reducing social jetlag and sleep debt.', impact: '+11% Recovery' },

  // Recovery & Autonomic Regulation
  { id: 'zero_alcohol', name: 'Zero Alcohol', category: 'Recovery', icon: '🍷', description: 'Eliminates nocturnal sympathetic tachycardia, prevents HRV crash, and preserves REM sleep.', impact: '+22% HRV, -6 bpm RHR' },
  { id: 'cold_therapy', name: 'Cold Plunge / Shower (3 min)', category: 'Recovery', icon: '🧊', description: 'Stimulates vagal tone, norepinephrine surge, and parasympathetic rebound.', impact: '+14% HRV' },
  { id: 'sauna', name: 'Sauna / Heat Therapy (20 min)', category: 'Recovery', icon: '🔥', description: 'Activates Heat Shock Proteins (HSP70), enhances vascular elasticity, and lowers resting HR.', impact: '+10% Recovery, -4 bpm RHR' },
  { id: 'breathwork', name: '4-7-8 / Physiological Sigh', category: 'Recovery', icon: '🫁', description: 'Activates parasympathetic brake on heart rate, downregulating pre-bed cortisol.', impact: '+15% HRV' },
  { id: 'active_recovery', name: 'Zone 1 Active Recovery Walk', category: 'Recovery', icon: '🚶', description: 'Promotes lymphatic flow and waste clearance without imposing cardiovascular fatigue.', impact: '+8% Recovery' },
  { id: 'foam_rolling', name: 'Mobility & Foam Rolling (15 min)', category: 'Recovery', icon: '🧘', description: 'Reduces muscle spindle hypertonicity and improves nocturnal parasympathetic state.', impact: '+5% Deep Sleep' },

  // Nutrition & Supplementation
  { id: 'magnesium', name: 'Magnesium / Sleep Stack', category: 'Nutrition', icon: '💊', description: 'Crosses blood-brain barrier to agonize GABA receptors, lengthening restorative SWS deep sleep.', impact: '+16% Deep Sleep' },
  { id: 'no_late_meals', name: 'No Food Within 3h of Bed', category: 'Nutrition', icon: '🍽️', description: 'Prevents nocturnal digestive thermogenesis, elevated core temp, and elevated resting HR.', impact: '-5 bpm RHR, +9% HRV' },
  { id: 'creatine', name: 'Creatine Monohydrate (5g)', category: 'Nutrition', icon: '⚡', description: 'Saturates cellular phosphocreatine stores for ATP regeneration and brain recovery.', impact: '+Anaerobic Power' },
  { id: 'hydration_electrolytes', name: 'Morning Hydration + Electrolytes (1L)', category: 'Nutrition', icon: '💧', description: 'Restores extracellular volume, optimizes stroke volume, and stabilizes blood pressure.', impact: '-4 bpm RHR' },
  { id: 'tart_cherry', name: 'Tart Cherry Juice / Apigenin', category: 'Nutrition', icon: '🍒', description: 'Supplies exogenous phytomelatonin and antioxidants to reduce muscle inflammation.', impact: '+12m Deep Sleep' },
  { id: 'high_protein_target', name: 'Hit Protein Target (≥2.0g/kg)', category: 'Nutrition', icon: '🥩', description: 'Maximizes Muscle Protein Synthesis (MPS) and stimulates overnight muscular remodeling.', impact: '+MPS Velocity' },

  // Training & Conditioning
  { id: 'zone2_cardio', name: 'Zone 2 Polarized Cardio (45 min)', category: 'Training', icon: '🏃', description: 'Expands mitochondrial density, fat oxidation capacity, and aerobic cardiovascular ceiling.', impact: '+VO2 Max, +12% HRV' },
  { id: 'hypertrophy_lifting', name: 'Hypertrophy Resistance Training', category: 'Training', icon: '🏋️', description: 'Progressive mechanical tension driving muscle fiber recruitment and anabolic signaling.', impact: '+Lean Mass' },
  { id: 'daily_10k_steps', name: '10,000 Steps Daily Baseline', category: 'Training', icon: '👟', description: 'Sustains baseline NEAT energy expenditure and enhances insulin sensitivity.', impact: '+350 kcal TDEE' },

  // Mindset & Neuro-Downregulation
  { id: 'meditation', name: 'Mindfulness Meditation (10 min)', category: 'Mindset', icon: '🧠', description: 'Suppresses default mode network (DMN) rumination and sympathetic stress arousal.', impact: '+10% HRV' },
  { id: 'nsdr', name: 'Non-Sleep Deep Rest (NSDR / 20 min)', category: 'Mindset', icon: '🎧', description: 'Accelerates cortical dopamine reset and restores parasympathetic balance.', impact: '+Cognitive Recovery' },
  { id: 'evening_brain_dump', name: 'Evening Journal / Brain Dump', category: 'Mindset', icon: '📝', description: 'Externalizes cognitive rumination and anticipatory stress to lower sleep-onset latency.', impact: '-18m Sleep Latency' }
];

const DEFAULT_HABITS = PREDEFINED_HABITS_CATALOG.slice(0, 8);

class DB {
  constructor() {
    this.ensureDataDir();
    this.data = this.load();
  }

  ensureDataDir() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  }

  load() {
    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        if (!parsed.habits || parsed.habits.length === 0) {
          parsed.habits = DEFAULT_HABITS;
        }
        return parsed;
      } catch (e) {
        console.error('Error reading db file, reinitializing', e);
      }
    }
    const initial = {
      tokens: null,
      user: null,
      biometrics: {}, // date string (YYYY-MM-DD) -> biometric record
      habits: DEFAULT_HABITS,
      habit_logs: {} // date string (YYYY-MM-DD) -> { [habitId]: boolean }
    };
    this.save(initial);
    return initial;
  }

  save(data = this.data) {
    this.ensureDataDir();
    const tempFile = `${DB_FILE}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tempFile, DB_FILE);
  }

  getSnapshot() {
    return this.load();
  }

  // Token management
  getTokens() {
    return this.load().tokens;
  }

  saveTokens(tokens) {
    this.data.tokens = tokens;
    this.save();
  }

  clearTokens() {
    this.data.tokens = null;
    this.save();
  }

  // User info
  getUser() {
    return this.load().user;
  }

  saveUser(user) {
    this.data.user = user;
    this.save();
  }

  // Biometrics
  getBiometrics(date) {
    const bios = this.load().biometrics || {};
    if (date) return bios[date] || null;
    return bios;
  }

  saveBiometrics(date, record) {
    this.data.biometrics[date] = {
      ...(this.data.biometrics[date] || {}),
      ...record,
      updated_at: new Date().toISOString()
    };
    this.save();
  }

  saveBulkBiometrics(recordsMap) {
    for (const [date, record] of Object.entries(recordsMap)) {
      this.data.biometrics[date] = {
        ...(this.data.biometrics[date] || {}),
        ...record,
        updated_at: new Date().toISOString()
      };
    }
    this.save();
  }

  replaceWithWhoopBiometrics(recordsMap) {
    for (const [date, record] of Object.entries(recordsMap)) {
      if (record.workouts) {
        record.workouts = record.workouts.filter(w => !String(w.id).startsWith('w_'));
      }
      this.data.biometrics[date] = {
        ...record,
        updated_at: new Date().toISOString()
      };
    }
    this.save();
  }

  // Habits
  getHabits() {
    return this.data.habits || DEFAULT_HABITS;
  }

  addHabit(habit) {
    const exists = this.data.habits.some(h => h.id === habit.id);
    if (!exists) {
      this.data.habits.push(habit);
      this.save();
    }
  }

  deleteHabit(habitId) {
    this.data.habits = this.data.habits.filter(h => h.id !== habitId);
    this.save();
  }

  getCatalog() {
    return PREDEFINED_HABITS_CATALOG;
  }

  // Habit Logs
  getHabitLogs(date) {
    if (date) return this.data.habit_logs[date] || {};
    return this.data.habit_logs;
  }

  logHabits(date, habitsMap) {
    this.data.habit_logs[date] = {
      ...(this.data.habit_logs[date] || {}),
      ...habitsMap
    };
    this.save();
    return this.data.habit_logs[date];
  }
}

module.exports = new DB();
