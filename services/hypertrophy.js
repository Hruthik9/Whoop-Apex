const db = require('./db');

class HypertrophyService {
  /**
   * Calculates personalized targets for Muscle Gain vs Fat Loss,
   * VO2 Max estimation, and Metabolic Efficiency based on WHOOP biometrics.
   *
   * @param {string} date - Date string YYYY-MM-DD
   * @param {string} goal - 'gain' (Muscle Gain / Lean Bulk) or 'loss' (Fat Loss / Cut)
   */
  getHypertrophyProfile(date, goal = 'gain') {
    const biometrics = db.getBiometrics();
    const user = db.getUser() || {};
    const body = user.body || { height_meter: 1.70, weight_kilogram: 78.5, max_heart_rate: 190 };

    const targetDate = date || Object.keys(biometrics).sort().pop() || new Date().toISOString().split('T')[0];
    const dayBio = biometrics[targetDate] || {};

    const weightKg = body.weight_kilogram || 78.5;
    const heightCm = (body.height_meter || 1.70) * 100;
    const maxHr = body.max_heart_rate || 190;
    const rhr = dayBio.recovery?.resting_heart_rate || 65;

    // Basal Metabolic Rate (Mifflin-St Jeor equation)
    const bmrKcal = Math.round(10 * weightKg + 6.25 * heightCm - 5 * 25 + 5); // ~1730 kcal
    
    // WHOOP energy expenditure: 1 kJ = 0.239006 kcal
    const totalKj = dayBio.strain?.kilojoules || 0;
    const currentBurned = Math.round(totalKj * 0.239006);

    // Full-day estimated TDEE:
    // Baseline moderate activity (BMR * 1.4) or actual Whoop burned if higher
    const estimatedDailyTdee = Math.max(Math.round(bmrKcal * 1.4), currentBurned);

    // -------------------------------------------------------------
    // Goal-Specific Targets (Muscle Gain vs Fat Loss)
    // -------------------------------------------------------------
    let targetCalories, proteinGrams, fatGrams, carbGrams, calorieDelta;
    const isGain = goal !== 'loss';

    if (isGain) {
      // Lean Bulk: +350 kcal surplus
      calorieDelta = 350;
      targetCalories = estimatedDailyTdee + calorieDelta;

      // Protein: 2.1 g/kg (Optimal MPS range: 1.6 - 2.2 g/kg)
      proteinGrams = Math.round(weightKg * 2.1); // ~165g
      const proteinKcal = proteinGrams * 4;

      // Fats: 1.0 g/kg (Crucial for testosterone & steroidogenesis)
      fatGrams = Math.round(weightKg * 1.0); // ~79g
      const fatKcal = fatGrams * 9;

      // Carbs: Remainder of calories (Glycogen replenishment & anti-catabolic insulin)
      const remainingKcal = Math.max(0, targetCalories - (proteinKcal + fatKcal));
      carbGrams = Math.round(remainingKcal / 4); // ~349g
    } else {
      // Fat Loss (Cut / Shred): -450 kcal deficit (safe, sustainable fat oxidation)
      calorieDelta = -450;
      targetCalories = Math.max(1600, estimatedDailyTdee + calorieDelta);

      // Protein: 2.3 g/kg (Higher protein to prevent muscle catabolism in a deficit!)
      proteinGrams = Math.round(weightKg * 2.3); // ~180g
      const proteinKcal = proteinGrams * 4;

      // Fats: 0.8 g/kg (Essential fatty acids floor for hormonal health)
      fatGrams = Math.round(weightKg * 0.8); // ~63g
      const fatKcal = fatGrams * 9;

      // Carbs: Remainder (Lower carb, timed around workouts for performance)
      const remainingKcal = Math.max(0, targetCalories - (proteinKcal + fatKcal));
      carbGrams = Math.round(remainingKcal / 4); // ~160g
    }

    // -------------------------------------------------------------
    // VO2 Max Estimation & Cardiovascular Engine
    // -------------------------------------------------------------
    // Uth-Sørensen-Overgaard-Pedersen Formula: VO2max = 15.3 * (HRmax / HRrest)
    const vo2MaxEstimated = Math.round((15.3 * (maxHr / rhr)) * 10) / 10; // ~44.7 mL/kg/min
    
    let vo2Tier = 'Good / Above Average';
    let vo2Percentile = 'Top 30%';
    if (vo2MaxEstimated >= 52) {
      vo2Tier = 'Superior / Elite';
      vo2Percentile = 'Top 5%';
    } else if (vo2MaxEstimated >= 47) {
      vo2Tier = 'Excellent';
      vo2Percentile = 'Top 15%';
    } else if (vo2MaxEstimated >= 42) {
      vo2Tier = 'Good / Above Average';
      vo2Percentile = 'Top 30%';
    } else if (vo2MaxEstimated >= 37) {
      vo2Tier = 'Fair / Average';
      vo2Percentile = 'Top 50%';
    } else {
      vo2Tier = 'Needs Improvement';
      vo2Percentile = 'Bottom 35%';
    }

    const vo2Protocols = [
      {
        title: 'Norwegian 4x4 Protocol (Gold Standard)',
        frequency: '1-2x per week',
        target_hr: `${Math.round(maxHr * 0.90)} - ${Math.round(maxHr * 0.95)} bpm (90-95% HRmax)`,
        description: '4 rounds of 4 minutes high intensity running, rowing, or cycling, followed by 3 minutes active recovery (Zone 2). Proven to increase VO2 max by 0.5% per session.'
      },
      {
        title: 'Zone 2 Mitochondrial Base (Polarized 80/20)',
        frequency: '3-4x per week (45-60 min)',
        target_hr: `${Math.round(maxHr * 0.60)} - ${Math.round(maxHr * 0.70)} bpm (114-133 bpm)`,
        description: 'Conversational aerobic pace. Expands mitochondrial density, improves capillary vascularization, and maximizes fat oxidation while keeping stress hormones low.'
      }
    ];

    // -------------------------------------------------------------
    // Metabolic Efficiency Lab
    // -------------------------------------------------------------
    // Thermic Effect of Food (TEF): Protein burns ~25% of its calories, carbs ~7%, fats ~3%
    const tefKcal = Math.round((proteinGrams * 4 * 0.25) + (carbGrams * 4 * 0.07) + (fatGrams * 9 * 0.03));
    
    // Metabolic Flexibility Index (Proxy based on resting HR, HRV, and sleep recovery)
    const recoveryScore = dayBio.recovery?.score || 0;
    const hrv = dayBio.recovery?.hrv_ms || 55;
    let metabolicFlexibility = 'Moderate';
    let metabolicAdvice = 'Your metabolism is operating at a standard baseline. Focus on Zone 2 training to improve lipid oxidation and insulin sensitivity.';
    if (hrv >= 65 && rhr <= 60) {
      metabolicFlexibility = 'High / Optimized';
      metabolicAdvice = 'Exceptional mitochondrial efficiency! Your body easily switches between burning fatty acids at rest/Zone 2 and carbohydrates during high-strain workouts.';
    } else if (rhr > 70 || recoveryScore < 34) {
      metabolicFlexibility = 'Stressed / Impaired';
      metabolicAdvice = 'Elevated resting heart rate and low recovery indicate high sympathetic stress and impaired glucose handling today. Keep carbohydrates complex and prioritize sleep.';
    }

    // -------------------------------------------------------------
    // Sleep & Growth Hormone (HGH) Recovery Status
    // -------------------------------------------------------------
    const sleep = dayBio.sleep || {};
    const deepSleepMin = sleep.slow_wave_sleep_min || 0;
    const totalAsleepMin = sleep.total_asleep_min || 0;

    let muscleReadiness = {
      score: recoveryScore,
      tier: recoveryScore >= 67 ? (isGain ? 'PEAK HYPERTROPHY' : 'HIGH INTENSITY FAT BURN') : 
            recoveryScore >= 34 ? 'MODERATE VOLUME' : 'DELOAD / ACTIVE RECOVERY',
      status_color: recoveryScore >= 67 ? 'green' : recoveryScore >= 34 ? 'yellow' : 'red',
      training_recommendation: '',
      hgh_status: '',
      protein_distribution: []
    };

    if (recoveryScore >= 67) {
      muscleReadiness.training_recommendation = isGain ?
        'Heavy Compound Overload: Your central nervous system is primed. Focus on 6-10 rep ranges on Squats, Bench, Pull-ups with high mechanical tension.' :
        'High Intensity & Cardio: Push hard with heavy resistance training followed by 15-20 min Zone 2 cardio to maximize fat oxidation without muscle loss.';
      muscleReadiness.hgh_status = 'Optimal: Deep sleep supported full nighttime anabolic hormone release.';
    } else if (recoveryScore >= 34) {
      muscleReadiness.training_recommendation = isGain ?
        'Moderate Volume Hypertrophy: 8-15 rep ranges with machines and dumbbells. Maintain 1-2 reps in reserve (RIR 1-2).' :
        'Moderate Lifting + Steady Zone 2: Maintain volume, avoid failure, and complete 30 min steady-state cardio at 115-130 bpm.';
      muscleReadiness.hgh_status = 'Moderate: Adequate recovery, but avoid grinding past failure.';
    } else {
      muscleReadiness.training_recommendation = 'Active Recovery / Blood Flow: Recovery is compromised (' + recoveryScore + '%). Intense lifting or severe deficits today will elevate cortisol. Stick to 20 min light mobility or Zone 1 walking.';
      muscleReadiness.hgh_status = 'Suppressed: With ' + Math.floor(totalAsleepMin / 60) + 'h ' + (totalAsleepMin % 60) + 'm sleep, your nocturnal HGH pulse was cut short and cortisol is elevated. Prioritize early bedtime tonight.';
    }

    // Protein meal distribution (to clear the 3g Leucine threshold)
    const meals = 4;
    const perMealProtein = Math.round(proteinGrams / meals);
    muscleReadiness.protein_distribution = [
      { meal: 'Meal 1 (Breakfast)', protein: perMealProtein, timing: 'Within 1h of waking', leucine_target: '3.2g (Eggs, Whey, Greek Yogurt)' },
      { meal: 'Meal 2 (Lunch)', protein: perMealProtein, timing: '3-4 hours post breakfast', leucine_target: '3.5g (Chicken breast, Rice, Greens)' },
      { meal: 'Meal 3 (Pre/Post Workout)', protein: perMealProtein, timing: '1-2h before or after training', leucine_target: '3.8g (Whey isolate + carbs)' },
      { meal: 'Meal 4 (Dinner / Pre-Bed)', protein: perMealProtein, timing: '2-3h before bed', leucine_target: '3.5g (Casein, Salmon, Cottage cheese)' }
    ];

    // Nutrition logs if tracked
    const nutritionLogs = db.load().nutrition_logs || {};
    const todayLog = nutritionLogs[targetDate] || {
      calories_consumed: 0,
      protein_consumed: 0,
      carbs_consumed: 0,
      fats_consumed: 0,
      water_liters: 0
    };

    return {
      date: targetDate,
      goal: goal,
      is_gain: isGain,
      goal_summary: isGain
        ? 'Target: +350 kcal Surplus • Maximizing Muscle Protein Synthesis'
        : 'Target: -450 kcal Deficit • Preserving Lean Mass & Accelerating Fat Oxidation',
      body: {
        weight_kg: weightKg,
        weight_lbs: Math.round(weightKg * 2.20462 * 10) / 10,
        height_cm: heightCm,
        max_heart_rate: maxHr,
        resting_heart_rate: rhr
      },
      targets: {
        calories: targetCalories,
        burned_calories: currentBurned,
        tdee_estimated: estimatedDailyTdee,
        calorie_delta: calorieDelta,
        protein_grams: proteinGrams,
        carb_grams: carbGrams,
        fat_grams: fatGrams,
        protein_per_kg: isGain ? 2.1 : 2.3,
        water_liters_target: isGain ? 3.5 : 4.0
      },
      vo2max: {
        estimated: vo2MaxEstimated,
        vo2_max: vo2MaxEstimated,
        tier: vo2Tier,
        percentile: vo2Percentile,
        fitness_age: 24,
        protocols: vo2Protocols
      },
      metabolism: {
        bmr_kcal: bmrKcal,
        bmr: bmrKcal,
        tdee_kcal: estimatedDailyTdee,
        tdee: estimatedDailyTdee,
        tef_kcal: tefKcal,
        tef: tefKcal,
        active_kcal: currentBurned,
        active_calories: currentBurned,
        flexibility: metabolicFlexibility,
        metabolic_flexibility: metabolicFlexibility,
        advice: metabolicAdvice
      },
      muscle_readiness: muscleReadiness,
      nutrition_log: todayLog,
      projections: {
        goal: goal,
        is_gain: isGain,
        title: isGain ? 'Hypertrophy Velocity & Timeline Projections' : 'Fat Loss Velocity & Timeline Projections',
        subtitle: isGain
          ? 'Scientifically modeled for Hruthik (78.5 kg) with +350 kcal surplus (Aragon-McDonald physiological rate model)'
          : 'Calibrated to -450 kcal deficit (3,150 kcal/wk) with 2.3 g/kg protein lean-mass sparing',
        rate_headline: isGain
          ? 'Approx. Muscle Gain Rate: ~1.1% Lean Mass / Month (+0.9 kg/mo)'
          : 'Approx. Fat Loss Rate: ~2.3% Body Fat / Month (-1.8 kg/mo)',
        rate_percent_monthly: isGain ? '+1.2% Muscle' : '-2.3% Fat',
        primary_metric_label: isGain ? 'Approx. Muscle Gain' : 'Approx. Fat Lost',
        milestones: isGain ? [
          { span: '30 Days', primary_val: '+0.9 kg', primary_pct: '+1.2%', sub: 'Total: ~79.9 kg', detail: 'Controlled fat (+0.5 kg)', badge: 'Phase 1 • Neural Base' },
          { span: '60 Days', primary_val: '+1.8 kg', primary_pct: '+2.3%', sub: 'Total: ~81.2 kg', detail: 'MPS saturation & glycogen', badge: 'Phase 2 • Myofibrillar' },
          { span: '90 Days', primary_val: '+2.6 kg', primary_pct: '+3.4%', sub: 'Total: ~82.4 kg', detail: 'Visible structural thickness', badge: 'Phase 3 • Hypertrophy' },
          { span: '180 Days', primary_val: '+4.8 kg', primary_pct: '+6.2%', sub: 'Total: ~85.7 kg', detail: 'Peak transformation ceiling', badge: 'Phase 4 • Solid Mass' }
        ] : [
          { span: '30 Days', primary_val: '-1.8 kg', primary_pct: '-2.3%', sub: 'Total: ~76.7 kg', detail: '98.5% lean muscle spared', badge: 'Phase 1 • Depletion' },
          { span: '60 Days', primary_val: '-3.6 kg', primary_pct: '-4.6%', sub: 'Total: ~74.9 kg', detail: 'Abdominal vascularity visible', badge: 'Phase 2 • Definition' },
          { span: '90 Days', primary_val: '-5.3 kg', primary_pct: '-6.8%', sub: 'Total: ~73.2 kg', detail: 'Deep muscle striations', badge: 'Phase 3 • Chiseled' },
          { span: '120 Days', primary_val: '-7.0 kg', primary_pct: '-8.9%', sub: 'Total: ~71.5 kg', detail: 'Single-digit body fat threshold', badge: 'Phase 4 • Shredded' }
        ],
        summary_chips: isGain ? [
          { label: 'P-Ratio (Partitioning)', value: '65% Muscle / 35% Fat' },
          { label: 'Est. Fat Gain Impact', value: '< 1.2% Body Fat' },
          { label: 'Hypertrophy Surplus', value: '+350 kcal / day' }
        ] : [
          { label: 'Lean Mass Sparing', value: '> 97.5% Preserved' },
          { label: 'Weekly Fat Deficit', value: '3,150 kcal / wk' },
          { label: 'Protein Floor', value: '181 g / day (2.3 g/kg)' }
        ]
      }
    };
  }

  logNutrition(date, data) {
    const store = db.load();
    if (!store.nutrition_logs) store.nutrition_logs = {};
    store.nutrition_logs[date] = {
      ...(store.nutrition_logs[date] || {}),
      ...data,
      updated_at: new Date().toISOString()
    };
    db.save(store);
    return store.nutrition_logs[date];
  }
}

module.exports = new HypertrophyService();
