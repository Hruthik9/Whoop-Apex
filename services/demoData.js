const db = require('./db');

function populateDemoData() {
  const biometrics = {};
  const habitLogs = {};
  const today = new Date();

  // Generate 30 days of realistic history
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateKey = d.toISOString().split('T')[0];

    // Determine habits for this day
    const isWeekend = d.getDay() === 0 || d.getDay() === 6;
    const hasAlcohol = isWeekend ? Math.random() < 0.6 : Math.random() < 0.15;
    const hasCaffeineCutoff = Math.random() < 0.7;
    const hasMagnesium = Math.random() < 0.65;
    const hasScreenCutoff = Math.random() < 0.55;
    const hasColdTherapy = Math.random() < 0.45;
    const hasMorningSun = Math.random() < 0.6;
    const hasSauna = Math.random() < 0.35;
    const hasNoLateMeal = Math.random() < 0.65;

    habitLogs[dateKey] = {
      caffeine_cutoff: hasCaffeineCutoff,
      magnesium: hasMagnesium,
      zero_alcohol: !hasAlcohol,
      screen_cutoff: hasScreenCutoff,
      cold_therapy: hasColdTherapy,
      morning_sunlight: hasMorningSun,
      sauna: hasSauna,
      no_late_meals: hasNoLateMeal
    };

    // Calculate biometric impacts based on habits
    let recoveryScore = 72; // baseline
    let hrv = 65; // baseline ms
    let rhr = 54; // baseline bpm
    let deepSleepMin = 85; // baseline min
    let remSleepMin = 95; // baseline min
    let sleepEff = 90; // baseline %

    if (hasAlcohol) {
      recoveryScore -= Math.floor(20 + Math.random() * 15);
      hrv -= Math.floor(14 + Math.random() * 8);
      rhr += Math.floor(5 + Math.random() * 4);
      remSleepMin -= Math.floor(25 + Math.random() * 15);
      sleepEff -= 8;
    } else {
      recoveryScore += Math.floor(4 + Math.random() * 6);
      hrv += Math.floor(4 + Math.random() * 5);
    }

    if (hasMagnesium) {
      deepSleepMin += Math.floor(15 + Math.random() * 12);
      recoveryScore += Math.floor(4 + Math.random() * 4);
      hrv += Math.floor(3 + Math.random() * 4);
    }

    if (hasCaffeineCutoff) {
      remSleepMin += Math.floor(12 + Math.random() * 10);
      sleepEff += 3;
    }

    if (hasScreenCutoff) {
      deepSleepMin += Math.floor(8 + Math.random() * 8);
      sleepEff += 4;
    }

    if (hasNoLateMeal) {
      rhr -= Math.floor(2 + Math.random() * 2);
      deepSleepMin += Math.floor(6 + Math.random() * 6);
    }

    if (hasColdTherapy) {
      hrv += Math.floor(5 + Math.random() * 5);
      recoveryScore += Math.floor(5 + Math.random() * 5);
    }

    // Add slight random daily variance
    recoveryScore = Math.max(22, Math.min(98, recoveryScore + Math.floor((Math.random() - 0.5) * 8)));
    hrv = Math.max(35, Math.min(105, hrv + Math.floor((Math.random() - 0.5) * 6)));
    rhr = Math.max(46, Math.min(68, rhr + Math.floor((Math.random() - 0.5) * 3)));
    deepSleepMin = Math.max(45, Math.min(135, deepSleepMin + Math.floor((Math.random() - 0.5) * 10)));
    remSleepMin = Math.max(50, Math.min(130, remSleepMin + Math.floor((Math.random() - 0.5) * 10)));
    sleepEff = Math.max(76, Math.min(98, sleepEff + Math.floor((Math.random() - 0.5) * 4)));

    const lightSleepMin = 210 + Math.floor((Math.random() - 0.5) * 30);
    const awakeMin = Math.floor((100 - sleepEff) * 4.5);
    const totalInBed = deepSleepMin + remSleepMin + lightSleepMin + awakeMin;
    const totalAsleep = deepSleepMin + remSleepMin + lightSleepMin;

    const sleepScore = Math.min(100, Math.round((totalAsleep / 480) * 100));
    const strainScore = Math.round((8 + Math.random() * 9.5) * 10) / 10;

    biometrics[dateKey] = {
      recovery: {
        score: recoveryScore,
        hrv_ms: hrv,
        resting_heart_rate: rhr,
        spo2: 98.2,
        skin_temp_c: 33.3
      },
      sleep: {
        score: sleepScore,
        performance_percentage: sleepScore,
        efficiency_percentage: sleepEff,
        total_in_bed_min: totalInBed,
        total_asleep_min: totalAsleep,
        slow_wave_sleep_min: deepSleepMin,
        rem_sleep_min: remSleepMin,
        light_sleep_min: lightSleepMin,
        awake_min: awakeMin,
        disturbance_count: Math.floor(4 + Math.random() * 8)
      },
      strain: {
        score: strainScore,
        kilojoules: Math.round(strainScore * 650 + Math.random() * 200),
        average_heart_rate: 110 + Math.floor(Math.random() * 15),
        max_heart_rate: 172 + Math.floor(Math.random() * 12)
      },
      workouts: [
        {
          id: `w_${dateKey}`,
          sport_id: 1,
          strain: Math.round((strainScore * 0.75) * 10) / 10,
          average_heart_rate: 145,
          max_heart_rate: 176,
          kilojoules: Math.round(strainScore * 450),
          duration_min: 45
        }
      ]
    };
  }

  db.saveBulkBiometrics(biometrics);
  for (const [date, habits] of Object.entries(habitLogs)) {
    db.logHabits(date, habits);
  }

  return { success: true, count: 30 };
}

module.exports = { populateDemoData };
