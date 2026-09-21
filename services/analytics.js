const db = require('./db');

class AnalyticsService {
  /**
   * Calculates correlation of habits against recovery, HRV, deep sleep, and resting heart rate.
   */
  calculateCorrelations() {
    const biometrics = db.getBiometrics();
    const habitLogs = db.getHabitLogs();
    const habits = db.getHabits();

    const dates = Object.keys(biometrics).sort();
    if (dates.length === 0) {
      return {
        has_data: false,
        total_tracked_days: 0,
        correlations: [],
        insights: [],
        recommendations: null
      };
    }

    // Prepare habit analysis maps
    const habitStats = {};
    for (const h of habits) {
      habitStats[h.id] = {
        id: h.id,
        name: h.name,
        category: h.category,
        icon: h.icon,
        description: h.description,
        with_habit: {
          count: 0,
          recovery_sum: 0,
          hrv_sum: 0,
          rhr_sum: 0,
          deep_sleep_sum: 0,
          rem_sleep_sum: 0,
          sleep_eff_sum: 0
        },
        without_habit: {
          count: 0,
          recovery_sum: 0,
          hrv_sum: 0,
          rhr_sum: 0,
          deep_sleep_sum: 0,
          rem_sleep_sum: 0,
          sleep_eff_sum: 0
        }
      };
    }

    let overallMetrics = {
      recovery: [],
      hrv: [],
      rhr: [],
      deep_sleep: [],
      rem_sleep: [],
      sleep_eff: [],
      strain: []
    };

    // Iterate through dates with biometric data
    for (const date of dates) {
      const bio = biometrics[date];
      if (!bio) continue;

      const rec = bio.recovery?.score;
      const hrv = bio.recovery?.hrv_ms;
      const rhr = bio.recovery?.resting_heart_rate;
      const deep = bio.sleep?.slow_wave_sleep_min;
      const rem = bio.sleep?.rem_sleep_min;
      const eff = bio.sleep?.efficiency_percentage;
      const str = bio.strain?.score;

      if (rec != null) overallMetrics.recovery.push(rec);
      if (hrv != null) overallMetrics.hrv.push(hrv);
      if (rhr != null) overallMetrics.rhr.push(rhr);
      if (deep != null) overallMetrics.deep_sleep.push(deep);
      if (rem != null) overallMetrics.rem_sleep.push(rem);
      if (eff != null) overallMetrics.sleep_eff.push(eff);
      if (str != null) overallMetrics.strain.push(str);

      const dayHabits = habitLogs[date] || {};

      for (const h of habits) {
        const isActive = !!dayHabits[h.id];
        const group = isActive ? habitStats[h.id].with_habit : habitStats[h.id].without_habit;

        group.count++;
        if (rec != null) group.recovery_sum += rec;
        if (hrv != null) group.hrv_sum += hrv;
        if (rhr != null) group.rhr_sum += rhr;
        if (deep != null) group.deep_sleep_sum += deep;
        if (rem != null) group.rem_sleep_sum += rem;
        if (eff != null) group.sleep_eff_sum += eff;
      }
    }

    const avg = (arr) => arr.length ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10 : 0;

    const baselines = {
      recovery: avg(overallMetrics.recovery),
      hrv: avg(overallMetrics.hrv),
      rhr: avg(overallMetrics.rhr),
      deep_sleep: avg(overallMetrics.deep_sleep),
      rem_sleep: avg(overallMetrics.rem_sleep),
      sleep_eff: avg(overallMetrics.sleep_eff),
      strain: avg(overallMetrics.strain)
    };

    // Calculate deltas and impact scores
    const correlations = [];
    const insights = [];

    for (const h of habits) {
      const stat = habitStats[h.id];
      const withC = stat.with_habit.count;
      const withoutC = stat.without_habit.count;

      if (withC === 0 && withoutC === 0) continue;

      const calcAvg = (sum, count) => count > 0 ? Math.round((sum / count) * 10) / 10 : null;

      const withRec = calcAvg(stat.with_habit.recovery_sum, withC);
      const withoutRec = calcAvg(stat.without_habit.recovery_sum, withoutC);
      const deltaRec = (withRec !== null && withoutRec !== null) ? Math.round((withRec - withoutRec) * 10) / 10 : 0;

      const withHrv = calcAvg(stat.with_habit.hrv_sum, withC);
      const withoutHrv = calcAvg(stat.without_habit.hrv_sum, withoutC);
      const deltaHrv = (withHrv !== null && withoutHrv !== null) ? Math.round((withHrv - withoutHrv) * 10) / 10 : 0;

      const withRhr = calcAvg(stat.with_habit.rhr_sum, withC);
      const withoutRhr = calcAvg(stat.without_habit.rhr_sum, withoutC);
      // For RHR, negative delta is BETTER (resting heart rate lowered)
      const deltaRhr = (withRhr !== null && withoutRhr !== null) ? Math.round((withRhr - withoutRhr) * 10) / 10 : 0;

      const withDeep = calcAvg(stat.with_habit.deep_sleep_sum, withC);
      const withoutDeep = calcAvg(stat.without_habit.deep_sleep_sum, withoutC);
      const deltaDeep = (withDeep !== null && withoutDeep !== null) ? Math.round((withDeep - withoutDeep) * 10) / 10 : 0;

      const withRem = calcAvg(stat.with_habit.rem_sleep_sum, withC);
      const withoutRem = calcAvg(stat.without_habit.rem_sleep_sum, withoutC);
      const deltaRem = (withRem !== null && withoutRem !== null) ? Math.round((withRem - withoutRem) * 10) / 10 : 0;

      // Confidence level
      let confidence = 'Low';
      if (withC >= 7 && withoutC >= 7) confidence = 'High';
      else if (withC >= 3 && withoutC >= 3) confidence = 'Medium';

      // Impact rating
      let impactScore = deltaRec + (deltaHrv * 0.5) - (deltaRhr * 1.5) + (deltaDeep * 0.2);
      let status = 'Neutral';
      if (impactScore >= 8) status = 'Super Booster';
      else if (impactScore >= 3) status = 'Positive';
      else if (impactScore <= -8) status = 'Severe Disrupter';
      else if (impactScore <= -3) status = 'Negative';

      const correlationItem = {
        habit_id: h.id,
        name: h.name,
        icon: h.icon,
        category: h.category,
        days_active: withC,
        days_inactive: withoutC,
        confidence,
        status,
        impact_score: Math.round(impactScore * 10) / 10,
        metrics: {
          recovery: { with: withRec, without: withoutRec, delta: deltaRec },
          hrv: { with: withHrv, without: withoutHrv, delta: deltaHrv },
          rhr: { with: withRhr, without: withoutRhr, delta: deltaRhr },
          deep_sleep: { with: withDeep, without: withoutDeep, delta: deltaDeep },
          rem_sleep: { with: withRem, without: withoutRem, delta: deltaRem }
        }
      };

      correlations.push(correlationItem);

      // Generate natural language takeaway
      if (withC >= 2 && withoutC >= 2) {
        if (deltaRec >= 5 || deltaHrv >= 5 || deltaDeep >= 15) {
          let highlights = [];
          if (deltaRec >= 4) highlights.push(`+${deltaRec}% Recovery`);
          if (deltaHrv >= 4) highlights.push(`+${deltaHrv}ms HRV`);
          if (deltaDeep >= 10) highlights.push(`+${deltaDeep} min Deep Sleep`);
          if (deltaRhr <= -2) highlights.push(`${deltaRhr} bpm Resting HR`);

          insights.push({
            type: 'positive',
            habit: h.name,
            icon: h.icon,
            title: `${h.name} is a major recovery booster`,
            description: `When logged, you see ${highlights.join(', ')} compared to days without it.`,
            confidence
          });
        } else if (deltaRec <= -5 || deltaHrv <= -5 || deltaRhr >= 3) {
          let highlights = [];
          if (deltaRec <= -4) highlights.push(`${deltaRec}% Recovery`);
          if (deltaHrv <= -4) highlights.push(`${deltaHrv}ms HRV`);
          if (deltaRhr >= 2) highlights.push(`+${deltaRhr} bpm Resting HR`);

          insights.push({
            type: 'negative',
            habit: h.name,
            icon: h.icon,
            title: `${h.name} disrupts your biometrics`,
            description: `Correlated with ${highlights.join(', ')}. Try modifying timing or avoiding before critical performance days.`,
            confidence
          });
        }
      }
    }

    // Sort correlations by impact score descending
    correlations.sort((a, b) => b.impact_score - a.impact_score);

    // Generate today's personalized recommendation
    const latestDate = dates[dates.length - 1];
    const latestBio = biometrics[latestDate] || {};
    const todayRecovery = latestBio.recovery?.score ?? baselines.recovery;
    const todayHrv = latestBio.recovery?.hrv_ms ?? baselines.hrv;

    let recommendation = {
      recovery_tier: todayRecovery >= 67 ? 'GREEN' : todayRecovery >= 34 ? 'YELLOW' : 'RED',
      headline: '',
      advice: '',
      target_strain: '',
      suggested_habits: []
    };

    if (todayRecovery >= 67) {
      recommendation.headline = 'Green Day: Prime for High Performance';
      recommendation.advice = `Your body is primed (Recovery ${todayRecovery}%, HRV ${todayHrv}ms). You have high capacity for strenuous workouts or demanding cognitive output. Push yourself today!`;
      recommendation.target_strain = '14.0 - 18.5+';
      recommendation.suggested_habits = ['High intensity training', 'Optimal hydration', 'Cold plunge post-workout', 'Magnesium before bed'];
    } else if (todayRecovery >= 34) {
      recommendation.headline = 'Yellow Day: Steady & Adaptive State';
      recommendation.advice = `Your nervous system is balanced but maintaining homeostasis (Recovery ${todayRecovery}%). Maintain steady volume, avoid overtraining, and prioritize sleep hygiene.`;
      recommendation.target_strain = '10.0 - 14.0';
      recommendation.suggested_habits = ['Zone 2 cardio', 'No caffeine after 2 PM', 'No screens 1h before bed', 'No food 3h before sleep'];
    } else {
      recommendation.headline = 'Red Day: Active Recovery Protocol';
      recommendation.advice = `Your recovery is compromised (${todayRecovery}%). Your sympathetic nervous system is elevated. Focus on parasympathetic recovery, light mobility, sauna, and early sleep.`;
      recommendation.target_strain = 'Under 9.0';
      recommendation.suggested_habits = ['Sauna / gentle heat', 'Zero alcohol', 'Early wind-down', 'Breathwork / meditation'];
    }

    return {
      has_data: true,
      total_tracked_days: dates.length,
      baselines,
      correlations,
      insights,
      recommendation,
      latest_date: latestDate
    };
  }
}

module.exports = new AnalyticsService();
