const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'store.json');

const DEFAULT_HABITS = [
  { id: 'caffeine_cutoff', name: 'No Caffeine After 2 PM', category: 'Sleep', icon: '☕', description: 'Prevents adenosine receptor blockage at bedtime' },
  { id: 'magnesium', name: 'Magnesium / Sleep Stack', category: 'Nutrition', icon: '💊', description: 'Enhances GABA and deep restorative sleep' },
  { id: 'zero_alcohol', name: 'Zero Alcohol', category: 'Recovery', icon: '🍷', description: 'Avoids HRV crash and REM sleep disruption' },
  { id: 'screen_cutoff', name: 'No Screens 1h Before Bed', category: 'Sleep', icon: '📱', description: 'Preserves melatonin production' },
  { id: 'cold_therapy', name: 'Cold Plunge / Shower', category: 'Recovery', icon: '❄️', description: 'Stimulates parasympathetic vagus nerve tone' },
  { id: 'morning_sunlight', name: 'Morning Sunlight (15 min)', category: 'Circadian', icon: '☀️', description: 'Calibrates circadian cortisol rhythm' },
  { id: 'sauna', name: 'Sauna / Heat Therapy', category: 'Recovery', icon: '🔥', description: 'Heat shock proteins and cardiovascular relaxation' },
  { id: 'no_late_meals', name: 'No Food Within 3h of Bed', category: 'Nutrition', icon: '🍽️', description: 'Prevents elevated core body temp during early sleep' }
];

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
