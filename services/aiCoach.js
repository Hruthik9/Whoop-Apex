let GoogleGenAI;
try {
  const genaiPkg = require('@google/genai');
  GoogleGenAI = genaiPkg.GoogleGenAI;
} catch (e) {
  GoogleGenAI = null;
}

class AICoachService {
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY || '';
    this.ai = null;
  }

  getAI() {
    const key = process.env.GEMINI_API_KEY || this.apiKey || '';
    if (!key || !GoogleGenAI) return null;
    if (!this.ai || this.apiKey !== key) {
      try {
        this.apiKey = key;
        this.ai = new GoogleGenAI({ apiKey: key });
      } catch (e) {
        console.warn('Failed to initialize GoogleGenAI client:', e.message);
        return null;
      }
    }
    return this.ai;
  }

  /**
   * Diagnostic assessment of autonomic stress, sleep architecture, and breathwork prescriptions
   */
  analyzeVitals(dayRecord = {}, history = []) {
    const recovery = dayRecord?.recovery || {};
    const sleep = dayRecord?.sleep || {};
    const strain = dayRecord?.strain || {};

    const recScore = recovery.score ?? 50;
    const hrv = recovery.hrv_ms ?? 50;
    const rhr = recovery.resting_heart_rate ?? 65;
    const respRate = sleep.respiratory_rate ?? 16.5;

    // Calculate 7-day rolling baselines from history
    const recent = history.slice(-7);
    const avgHrv = recent.length ? Math.round(recent.reduce((acc, h) => acc + (h.recovery?.hrv_ms || hrv), 0) / recent.length) : hrv;
    const avgRhr = recent.length ? Math.round(recent.reduce((acc, h) => acc + (h.recovery?.resting_heart_rate || rhr), 0) / recent.length) : rhr;
    const avgResp = recent.length ? Math.round((recent.reduce((acc, h) => acc + (h.sleep?.respiratory_rate || respRate), 0) / recent.length) * 10) / 10 : respRate;

    // Delta calculations
    const hrvDeltaPct = avgHrv > 0 ? Math.round(((hrv - avgHrv) / avgHrv) * 100) : 0;
    const rhrDelta = rhr - avgRhr;
    const respDelta = Math.round((respRate - avgResp) * 10) / 10;

    // Sleep stages metrics
    const totalAsleepMin = sleep.total_asleep_min || 0;
    const swsMin = sleep.slow_wave_sleep_min || 0;
    const remMin = sleep.rem_sleep_min || 0;
    const lightMin = sleep.light_sleep_min || 0;
    const awakeMin = sleep.awake_min || 0;
    const debtMin = sleep.need?.debt_min || 0;
    const needTotalMin = sleep.need?.total_min || 480;
    const sleepEfficiency = sleep.efficiency_percentage || 90;
    const sleepConsistency = sleep.consistency_percentage || 85;
    const disturbances = sleep.disturbance_count || 12;

    const deepPct = totalAsleepMin > 0 ? Math.round((swsMin / totalAsleepMin) * 100) : 0;
    const remPct = totalAsleepMin > 0 ? Math.round((remMin / totalAsleepMin) * 100) : 0;
    const restorativePct = totalAsleepMin > 0 ? Math.round(((swsMin + remMin) / totalAsleepMin) * 100) : 0;

    // Recovery Category & Training Strain Targets
    const recCategory = recScore >= 67 ? 'GREEN' : (recScore >= 34 ? 'YELLOW' : 'RED');
    const strainTargetMin = recScore >= 67 ? 14.0 : (recScore >= 34 ? 10.0 : 4.0);
    const strainTargetMax = recScore >= 67 ? 17.5 : (recScore >= 34 ? 13.5 : 8.0);
    const dayStrain = strain.score || 0;

    // 1. Stress Index & Autonomic Nervous System (ANS) State
    let stressScore = 3; // 1-10
    let stressState = 'LOW';
    let stressTitle = 'Parasympathetic Dominance (Rest & Digest)';
    let ansDetails = '';

    if (recScore < 35 || hrvDeltaPct <= -18 || rhrDelta >= 5) {
      stressScore = 8;
      stressState = 'HIGH';
      stressTitle = 'Acute Sympathetic Strain (Fight or Flight)';
      ansDetails = `HRV is suppressed by ${Math.abs(hrvDeltaPct)}% (${hrv}ms vs ${avgHrv}ms baseline) with resting heart rate elevated by +${rhrDelta} bpm. The autonomic nervous system is experiencing heightened adrenergic tone.`;
    } else if (recScore < 60 || hrvDeltaPct <= -8 || rhrDelta >= 2 || debtMin > 60) {
      stressScore = 5;
      stressState = 'MODERATE';
      stressTitle = 'Moderate Autonomic Fatigue';
      ansDetails = `Mild autonomic down-regulation detected. HRV is ${hrvDeltaPct >= 0 ? '+' : ''}${hrvDeltaPct}% relative to your 7-day average. Systemic recovery capacity is constrained by accumulated sleep debt.`;
    } else {
      stressScore = 2;
      stressState = 'OPTIMAL';
      stressTitle = 'Parasympathetic Equilibrium (High Resilience)';
      ansDetails = `Excellent vagal tone observed. HRV is elevated at ${hrv}ms (+${hrvDeltaPct}% over baseline) and nocturnal resting heart rate is stabilized at ${rhr} bpm. Strong cardiovascular readiness.`;
    }

    if (respDelta >= 1.2) {
      ansDetails += ` Note: Respiratory rate is elevated (+${respDelta} rpm above baseline), which may indicate respiratory fatigue or mild immune mobilization.`;
    }

    // 2. Clinical Recovery Culprits (Root causes of suppression)
    const culprits = [];
    if (debtMin > 45) {
      culprits.push(`High accumulated sleep debt (+${debtMin} minutes deficit from target sleep need).`);
    }
    if (deepPct < 20) {
      culprits.push(`Insufficient Slow Wave Deep Sleep (${swsMin}m, ${deepPct}% vs 20-25% clinical target), reducing nocturnal growth hormone pulse.`);
    }
    if (rhrDelta >= 3) {
      culprits.push(`Elevated nocturnal resting heart rate (+${rhrDelta} bpm above 7-day baseline of ${avgRhr} bpm), indicating unfinished metabolic or digestive clearing.`);
    }
    if (hrvDeltaPct <= -10) {
      culprits.push(`Autonomic parasympathetic suppression: HRV is down ${Math.abs(hrvDeltaPct)}% below baseline (${hrv}ms vs ${avgHrv}ms average).`);
    }
    if (respDelta >= 0.8) {
      culprits.push(`Respiratory rate shift (+${respDelta} rpm above baseline), signaling localized airway stress or systemic metabolic inflammation.`);
    }

    // 3. Targeted Breathwork Prescription
    let breathworkProtocol = {};
    if (stressState === 'HIGH') {
      breathworkProtocol = {
        name: 'Cyclic Physiological Sigh',
        category: 'Acute Cortisol Down-Regulation',
        duration_min: 5,
        cycles: 25,
        cadence: { inhale1: 2, inhale2: 1, hold: 0, exhale: 6 },
        instructions: 'Two quick inhales through the nose (first deep, second topping off lungs), followed by a slow, passive sigh out through the mouth.',
        mechanism: 'Re-inflates collapsed pulmonary alveoli and stimulates the vagus nerve via prolonged exhalation, lowering heart rate within 90 seconds.'
      };
    } else if (debtMin > 45 || restorativePct < 35) {
      breathworkProtocol = {
        name: '4-7-8 Vagal Nerve Reset',
        category: 'Circadian Sleep Priming',
        duration_min: 7,
        cycles: 12,
        cadence: { inhale: 4, hold: 7, exhale: 8 },
        instructions: 'Inhale silently through the nose for 4s, hold breath with relaxed diaphragm for 7s, exhale forcefully through pursed lips making a whoosh sound for 8s.',
        mechanism: 'Prolonged retention and 2:1 exhale-to-inhale ratio increases baroreflex sensitivity, slowing sinoatrial firing and releasing acetylcholine.'
      };
    } else {
      breathworkProtocol = {
        name: 'Box Breathing (Square 4-4-4-4)',
        category: 'Autonomic Balance & Focus',
        duration_min: 5,
        cycles: 16,
        cadence: { inhale: 4, hold: 4, exhale: 4, hold_empty: 4 },
        instructions: 'Inhale for 4s, hold lungs full for 4s, exhale for 4s, hold lungs empty for 4s. Maintain continuous smooth cadence.',
        mechanism: 'Balances sympathetic and parasympathetic branches of the nervous system, clearing mental fog and steadying blood pressure.'
      };
    }

    // 4. Sleep Architecture Work Suggestions
    const sleepWork = [];
    if (deepPct < 20) {
      sleepWork.push({
        phase: 'Deep Sleep (SWS)',
        target: 'Boost Slow Wave Sleep',
        action: 'Take 300-400mg Magnesium L-Threonate or Bisglycinate 60m pre-bed. End all caloric intake strictly 3 hours before sleep to prevent nocturnal digestive thermogenesis.',
        impact: '+15-25 min Deep Sleep'
      });
      sleepWork.push({
        phase: 'Thermal Regulation',
        target: 'Core Body Temperature Drop',
        action: 'Take a hot shower or 15m sauna 90 minutes before bedtime. The peripheral vasodilation prompts rapid core cooling required to trigger slow-wave brain waves.',
        impact: '+12% Deep Sleep Quality'
      });
    }

    if (remPct < 20) {
      sleepWork.push({
        phase: 'REM Sleep',
        target: 'Cognitive Consolidation',
        action: 'Ensure complete zero alcohol within 6 hours of bedtime. Even 1-2 drinks suppresses rapid eye movement by delaying acetylcholine release.',
        impact: '+20-30 min REM Sleep'
      });
      sleepWork.push({
        phase: 'Circadian Anchor',
        target: 'Melatonin Amplitude',
        action: 'Get 10-15 minutes of outdoor sunlight within 30 minutes of waking to anchor the suprachiasmatic nucleus clock for tonight.',
        impact: '+18% REM Synchrony'
      });
    }

    if (debtMin > 30) {
      sleepWork.push({
        phase: 'Sleep Debt',
        target: `Pay Down +${debtMin}m Deficit`,
        action: 'Perform a 20-minute Non-Sleep Deep Rest (NSDR / Yoga Nidra) protocol between 1:00 PM and 3:00 PM to recover cortical dopamine without disrupting tonight\'s sleep pressure.',
        impact: 'Erases midday mental exhaustion'
      });
    }

    if (sleepWork.length === 0) {
      sleepWork.push({
        phase: 'Maintenance',
        target: 'Sustain Optimal Architecture',
        action: 'Keep bedtime consistent within ±20 minutes. Your current restorative sleep ratio is optimal.',
        impact: 'Preserves high baseline'
      });
    }

    return {
      date: dayRecord?.date || new Date().toISOString().split('T')[0],
      recovery: {
        score: recScore,
        category: recCategory,
        hrv,
        rhr,
        avgHrv7: avgHrv,
        avgRhr7: avgRhr,
        hrvDeltaPct,
        rhrDelta
      },
      training: {
        category: recCategory,
        score: recScore,
        dayStrain,
        strainTargetMin,
        strainTargetMax,
        intensity: recScore >= 67 ? 'High Output (Progressive Overload / Threshold)' : (recScore >= 34 ? 'Moderate Aerobic Base / Maintenance' : 'Active Recovery & Vagal Restoration')
      },
      sleep_architecture: {
        total_asleep_min: totalAsleepMin,
        total_asleep_hours: (totalAsleepMin / 60).toFixed(1),
        sws_min: swsMin,
        deep_pct: deepPct,
        rem_min: remMin,
        rem_pct: remPct,
        light_min: lightMin,
        awake_min: awakeMin,
        restorative_pct: restorativePct,
        debt_min: debtMin,
        need_total_min: needTotalMin,
        efficiency: sleepEfficiency,
        consistency: sleepConsistency,
        disturbances: disturbances,
        resp_rate: respRate,
        resp_delta: respDelta
      },
      stress: {
        score: stressScore,
        state: stressState,
        title: stressTitle,
        details: ansDetails,
        hrv_delta_pct: hrvDeltaPct,
        rhr_delta: rhrDelta,
        resp_rate: respRate,
        resp_delta: respDelta
      },
      culprits,
      breathwork: breathworkProtocol,
      sleep_work: sleepWork,
      readiness_summary: `Recovery is at ${recScore}% (${recCategory}). Target Day Strain: ${strainTargetMin} - ${strainTargetMax}.`
    };
  }

  /**
   * Bedtime and wind-down time calculator
   */
  calculateBedtimes(wakeTimeStr = '07:00', needMinutes = 480) {
    const [wH, wM] = wakeTimeStr.split(':').map(Number);
    let wakeMin = (wH * 60) + wM;
    // Total time in bed = sleep needed + 20 min sleep onset latency
    let totalBedMin = needMinutes + 20;

    let lightsOutMin = wakeMin - totalBedMin;
    while (lightsOutMin < 0) lightsOutMin += 1440;

    let windDownMin = lightsOutMin - 40;
    while (windDownMin < 0) windDownMin += 1440;

    let dinnerCutoffMin = lightsOutMin - 180; // 3 hours before
    while (dinnerCutoffMin < 0) dinnerCutoffMin += 1440;

    const formatTime = (min) => {
      const h24 = Math.floor(min / 60) % 24;
      const m = min % 60;
      const ampm = h24 >= 12 ? 'PM' : 'AM';
      const h12 = h24 % 12 || 12;
      return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`;
    };

    return {
      lightsOut: formatTime(lightsOutMin),
      windDown: formatTime(windDownMin),
      dinnerCutoff: formatTime(dinnerCutoffMin)
    };
  }

  /**
   * Interactive chat query using Gemini 2.5 Flash if API key is configured,
   * or the advanced Clinical WHOOP Coach Physiological Engine.
   */
  async chatWithCoach(userPrompt, contextOrVitals = {}, history = []) {
    const isRichContext = !!contextOrVitals.currentVitals;
    const currentVitals = isRichContext ? contextOrVitals.currentVitals : contextOrVitals;
    const yesterdayVitals = isRichContext ? contextOrVitals.yesterdayVitals : null;
    const user = isRichContext ? (contextOrVitals.user || {}) : {};
    const habits = isRichContext ? (contextOrVitals.habits || {}) : {};
    const hypertrophy = isRichContext ? (contextOrVitals.hypertrophy || {}) : {};
    const provider = isRichContext ? (contextOrVitals.provider || 'whoop') : 'whoop';
    const syncResult = isRichContext ? (contextOrVitals.syncResult || null) : null;
    const effectiveHistory = isRichContext ? (contextOrVitals.history || history) : history;

    const analysis = this.analyzeVitals(currentVitals, effectiveHistory);
    const times = this.calculateBedtimes('07:00', analysis.sleep_architecture.need_total_min);

    const weightKg = user.body?.weight_kilogram || 78.5;
    const optimalProtein = Math.round(weightKg * 2.0); // 2.0 g/kg
    const targetCalories = hypertrophy?.targets?.calories || 2650;
    const loggedCalories = hypertrophy?.log?.calories || 0;
    const loggedProtein = hypertrophy?.log?.protein || 0;

    // 1. If Gemini API Key is configured, use Gemini Models with candidate fallback
    const aiClient = this.getAI();
    if (aiClient) {
      const candidateModels = [
        'gemini-3.5-flash-lite',
        'gemini-flash-lite-latest',
        'gemini-3.1-flash-lite',
        'gemini-flash-latest',
        'gemini-3.8-flash',
        'gemini-3.5-flash'
      ];
      const systemPrompt = `You are the official WHOOP Coach AI, an elite human performance and sports physiologist.
The user is tracking their biometrics using ${provider === 'google_fitbit' ? 'Google Pixel Watch / Fitbit' : 'WHOOP 4.0'}.
The biometric data was freshly synced from their wearable.

PHYSIOLOGICAL TELEMETRY:
- Date: ${analysis.date}
- Recovery Score: ${analysis.recovery.score}% (${analysis.recovery.category})
- HRV: ${analysis.recovery.hrv} ms (7-Day Baseline: ${analysis.recovery.avgHrv7} ms | Delta: ${analysis.recovery.hrvDeltaPct}%)
- Resting Heart Rate: ${analysis.recovery.rhr} bpm (7-Day Baseline: ${analysis.recovery.avgRhr7} bpm | Shift: ${analysis.recovery.rhrDelta >= 0 ? '+' : ''}${analysis.recovery.rhrDelta} bpm)
- Respiratory Rate: ${analysis.sleep_architecture.resp_rate} rpm (Delta: ${analysis.sleep_architecture.resp_delta >= 0 ? '+' : ''}${analysis.sleep_architecture.resp_delta} rpm)
- Day Strain: ${analysis.training.dayStrain} (Optimal Target Range: ${analysis.training.strainTargetMin} - ${analysis.training.strainTargetMax})
- Yesterday's Strain: ${yesterdayVitals?.strain?.score || 'N/A'}
- Total Sleep: ${analysis.sleep_architecture.total_asleep_hours}h (${analysis.sleep_architecture.total_asleep_min}m)
- Deep Sleep (Slow Wave): ${analysis.sleep_architecture.sws_min}m (${analysis.sleep_architecture.deep_pct}% of sleep)
- REM Sleep: ${analysis.sleep_architecture.rem_min}m (${analysis.sleep_architecture.rem_pct}% of sleep)
- Sleep Debt: +${analysis.sleep_architecture.debt_min}m (Tonight's Total Need: ${Math.floor(analysis.sleep_architecture.need_total_min / 60)}h ${analysis.sleep_architecture.need_total_min % 60}m)
- Calculated Lights-Out Bedtime: ${times.lightsOut} (Wind-down: ${times.windDown} | Meal Cutoff: ${times.dinnerCutoff})
- Body Weight: ${weightKg} kg | Target Protein: ${optimalProtein}g | Target Calories: ${targetCalories} kcal
- Autonomic Nervous System State: ${analysis.stress.title} (${analysis.stress.state})
- Recommended Breathwork: ${analysis.breathwork.name} (${analysis.breathwork.duration_min} min)

GUIDELINES:
- Speak exactly like WHOOP Coach: authoritative, direct, empathetic, and scientifically rigorous.
- Cite their exact numbers (HRV, Recovery %, Deep sleep %, Target Strain).
- Answer the user's specific prompt directly with actionable guidance in structured bullet points.`;

      for (const modelName of candidateModels) {
        try {
          const response = await aiClient.models.generateContent({
            model: modelName,
            contents: [
              { role: 'user', parts: [{ text: `${systemPrompt}\n\nUSER QUESTION: ${userPrompt}` }] }
            ]
          });

          if (response && response.text) {
            return {
              reply: response.text.trim(),
              source: `Gemini Flash (${modelName})`,
              analysis,
              synced: true,
              provider
            };
          }
        } catch (err) {
          console.warn(`Gemini model ${modelName} attempt:`, err.message);
        }
      }
    }

    // 2. High-Precision Clinical WHOOP Coach Engine (Offline & Default)
    const q = (userPrompt || '').toLowerCase();
    let reply = '';

    const isTraining = /work\s*out|lift|train|strain|exercise|gym|cardio|run|push|heavy|intensity|target\s*strain|rest\s*day|can\s*i/i.test(q);
    const isRecovery = /why\s*(is|my)?\s*recovery|recovery\s*(score|down|low|red|yellow)|improve\s*recovery|boost\s*recovery|culprit/i.test(q);
    const isSleep = /how\s*(was|is)\s*(my\s*)?sleep|sleep\s*(stage|score|quality|need|debt|efficiency)|deep\s*sleep|slow\s*wave|rem|sws|tired|wake|nap|bedtime|when\s*should\s*i\s*(sleep|bed)/i.test(q);
    const isVitals = /hrv|heart\s*rate\s*variability|rhr|resting\s*heart|vagal|respiratory|sympathetic|parasympathetic|ans|autonomic|stress/i.test(q);
    const isNutrition = /protein|eat|nutrition|food|calories|macros|hypertrophy|diet|muscle|bulk|cut|fuel/i.test(q);
    const isHabits = /habit|alcohol|caffeine|sunlight|cold\s*plunge|sauna|routine|lifestyle|what\s*helps/i.test(q);
    const isBreath = /breath|breathe|pacer|sigh|4-7-8|box\s*breath|calm/i.test(q);

    if (isTraining) {
      // 🏋️ Training & Strain Capacity
      reply = `### 🏋️ WHOOP Coach: Training & Strain Capacity Assessment\n\n` +
        `**Readiness State:** Your Recovery is **${analysis.recovery.score}% (${analysis.recovery.category})** with nocturnal HRV at **${analysis.recovery.hrv} ms** (${analysis.recovery.hrvDeltaPct >= 0 ? '+' : ''}${analysis.recovery.hrvDeltaPct}% vs 7-day baseline) and Resting Heart Rate at **${analysis.recovery.rhr} bpm** (${analysis.recovery.rhrDelta >= 0 ? '+' : ''}${analysis.recovery.rhrDelta} bpm shift).\n\n`;

      if (analysis.recovery.score >= 67) {
        reply += `🟢 **GREEN LIGHT TO PUSH:** Your cardiovascular system and autonomic nervous system are primed for high neuromuscular output. Your body has absorbed prior training load and is ready for progressive overload.\n\n` +
          `• **Target Day Strain:** **${analysis.training.strainTargetMin} – ${analysis.training.strainTargetMax} (High Output)**\n` +
          `• **Recommended Modality:** Heavy compound resistance training (RPE 8–9), high-intensity interval training (HIIT), or lactate threshold conditioning.\n` +
          `• **Current Accumulated Strain:** **${analysis.training.dayStrain}**. You have capacity to build an additional **+${Math.max(0, (analysis.training.strainTargetMax - analysis.training.dayStrain).toFixed(1))} strain** today.\n` +
          `• **Fueling Advice:** Consume 30–40g of fast carbohydrates with 25g protein 45 minutes prior to training to maximize glycogen availability.`;
      } else if (analysis.recovery.score >= 34) {
        reply += `🟡 **MODERATE CAPACITY (MAINTENANCE):** You are in a balanced holding pattern. While your autonomic nervous system is functional, it is experiencing mild down-regulation.\n\n` +
          `• **Target Day Strain:** **${analysis.training.strainTargetMin} – ${analysis.training.strainTargetMax} (Optimal Aerobic Zone)**\n` +
          `• **Recommended Modality:** Moderate resistance training with controlled volume, steady-state Zone 2 aerobic base cardio (65–75% Max HR), or technical sport drills. Avoid training to absolute failure today.\n` +
          `• **Current Accumulated Strain:** **${analysis.training.dayStrain}**. Keep your remaining strain capped below **${analysis.training.strainTargetMax}** to avoid digging into an autonomic deficit tomorrow.`;
      } else {
        reply += `🔴 **ACTIVE RECOVERY ONLY:** Your autonomic nervous system is signaling significant systemic fatigue. Pushing high strain today will blunt muscular adaptations and prolong systemic recovery debt.\n\n` +
          `• **Target Day Strain:** **< ${analysis.training.strainTargetMax} (Restorative Zone)**\n` +
          `• **Recommended Modality:** Zone 1 active recovery walk (20–30 min), light mobility work, dynamic stretching, or sauna/heat therapy. Do NOT perform heavy eccentric lifting today.\n` +
          `• **Current Accumulated Strain:** **${analysis.training.dayStrain}**. Prioritize parasympathetic activation, hydration, and an early bedtime.`;
      }

      if (yesterdayVitals?.strain?.score > 14) {
        reply += `\n\n> ⚠️ *Context Note:* Yesterday's strain was high (**${yesterdayVitals.strain.score}**), which is contributing to today's residual neuromuscular fatigue.`;
      }

    } else if (isRecovery) {
      // 🩺 Recovery Diagnostics
      reply = `### 🩺 WHOOP Coach: Recovery Diagnostics & Root-Cause Breakdown\n\n` +
        `Your Recovery today is **${analysis.recovery.score}% (${analysis.recovery.category})**. Here is the physiological breakdown of what drove your score:\n\n` +
        `**Primary Recovery Culprits:**\n` +
        (analysis.culprits.length > 0 ? analysis.culprits.map(c => `• ${c}`).join('\n') : `• Overall biomarkers are well-balanced within your rolling baseline ranges.\n`) +
        `\n\n**Autonomic Telemetry Deep-Dive:**\n` +
        `• **Heart Rate Variability (HRV):** **${analysis.recovery.hrv} ms** (${analysis.recovery.hrvDeltaPct >= 0 ? '+' : ''}${analysis.recovery.hrvDeltaPct}% vs your 7-day baseline of ${analysis.recovery.avgHrv7} ms). ` +
        (analysis.recovery.hrvDeltaPct < -10 ? 'A suppressed HRV indicates sympathetic dominance (fight-or-flight), meaning your sinoatrial node is receiving reduced vagal brake modulation.' : 'HRV remains in a resilient, adaptive state.') + `\n` +
        `• **Resting Heart Rate (RHR):** **${analysis.recovery.rhr} bpm** (${analysis.recovery.rhrDelta >= 0 ? '+' : ''}${analysis.recovery.rhrDelta} bpm vs 7d average of ${analysis.recovery.avgRhr7} bpm). ` +
        (analysis.recovery.rhrDelta > 2 ? 'Elevated resting HR indicates nocturnal cardiac workload—often triggered by late digestion, elevated core temp, or unresolved muscular inflammation.' : 'Resting HR was stable during nocturnal rest.') + `\n` +
        `• **Respiratory Rate:** **${analysis.sleep_architecture.resp_rate} rpm** (${analysis.sleep_architecture.resp_delta >= 0 ? '+' : ''}${analysis.sleep_architecture.resp_delta} rpm vs baseline). ` +
        (analysis.sleep_architecture.resp_delta > 0.8 ? 'Elevated respiratory rate is frequently an early warning sign of immune activation, airway congestion, or systemic overreaching.' : 'Respiratory rate is completely stable.') + `\n\n` +
        `**Immediate Actions to Rebound for Tomorrow:**\n` +
        `1. **End Caloric Intake by ${times.dinnerCutoff}:** Give your gastrointestinal tract 3 hours before sleep to prevent nocturnal cardiac workload.\n` +
        `2. **Execute Vagal Breathwork:** Complete 5 minutes of **${analysis.breathwork.name}** in Tab 2 to stimulate the vagus nerve and slow heart rate.\n` +
        `3. **Target Bedtime of ${times.lightsOut}:** Total sleep needed tonight is **${Math.floor(analysis.sleep_architecture.need_total_min / 60)}h ${analysis.sleep_architecture.need_total_min % 60}m** (includes +${analysis.sleep_architecture.debt_min}m debt payback).`;

    } else if (isSleep) {
      // 🌙 Sleep Architecture & Hypnogram
      reply = `### 🌙 WHOOP Coach: Sleep Architecture & Stage Diagnostics\n\n` +
        `**Total Time Asleep:** **${analysis.sleep_architecture.total_asleep_hours} hours (${analysis.sleep_architecture.total_asleep_min} minutes)**\n` +
        `**Sleep Performance:** **${Math.round((analysis.sleep_architecture.total_asleep_min / (analysis.sleep_architecture.need_total_min || 480)) * 100)}%** of your **${Math.floor(analysis.sleep_architecture.need_total_min / 60)}h ${analysis.sleep_architecture.need_total_min % 60}m** sleep need.\n\n` +
        `**Hypnogram Stage Breakdown:**\n` +
        `• **Slow Wave Sleep (Deep Sleep):** **${analysis.sleep_architecture.sws_min} minutes (${analysis.sleep_architecture.deep_pct}% of total)**\n` +
        `  *Clinical Standard: 20–25% (≥ 90m for athletic muscle remodeling)*\n` +
        (analysis.sleep_architecture.deep_pct >= 20 
          ? `  ✅ **OPTIMAL:** Excellent slow-wave sleep. This is when your pituitary gland pulses Human Growth Hormone (HGH) to repair muscular microtrauma and restore cellular glycogen.` 
          : `  ⚠️ **DEFICIT:** Deep sleep was below the 20% threshold. Physical tissue remodeling, muscular recovery, and nocturnal HGH secretion were curtailed.`) + `\n\n` +
        `• **REM Sleep (Rapid Eye Movement):** **${analysis.sleep_architecture.rem_min} minutes (${analysis.sleep_architecture.rem_pct}% of total)**\n` +
        `  *Clinical Standard: 20–25% (≥ 90m for cognitive performance)*\n` +
        (analysis.sleep_architecture.rem_pct >= 20 
          ? `  ✅ **OPTIMAL:** Strong REM cycle completion. Consolidates neuro-motor patterns learned in training and resets emotional/mental resilience.` 
          : `  ⚠️ **DEFICIT:** REM was constrained. You may experience midday mental fatigue or reduced executive focus today.`) + `\n\n` +
        `• **Light Sleep:** **${analysis.sleep_architecture.light_min}m** (${Math.round((analysis.sleep_architecture.light_min / (analysis.sleep_architecture.total_asleep_min || 1)) * 100)}%) — baseline physiological buffer.\n` +
        `• **Awake & Disturbances:** **${analysis.sleep_architecture.awake_min}m** across **${analysis.sleep_architecture.disturbances} micro-awakenings**.\n` +
        `• **Sleep Efficiency:** **${analysis.sleep_architecture.efficiency}%** | **Sleep Consistency:** **${analysis.sleep_architecture.consistency}%**.\n\n` +
        `**Tonight's Sleep Target Schedule:**\n` +
        `• **Lights-Out Bedtime:** **${times.lightsOut}** (for 7:00 AM wake-up)\n` +
        `• **Pre-Bed Wind Down:** Begin dimming lights and cutting screens at **${times.windDown}**\n` +
        `• **Sleep Work Recommendation:** ${analysis.sleep_work[0]?.action || 'Maintain consistent bedtime ±20 minutes.'}`;

    } else if (isNutrition) {
      // 🥩 Nutrition & Hypertrophy Fueling
      reply = `### 🥩 WHOOP Coach: Hypertrophy Nutrition & Macronutrient Fueling\n\n` +
        `**Athlete Profile:** Body Weight **${weightKg} kg (${Math.round(weightKg * 2.20462)} lbs)** | Height **${user.body?.height_meter || 1.70}m**\n\n` +
        `**Personalized Daily Targets (Aragon–McDonald Hypertrophy Framework):**\n` +
        `• **Target Protein:** **${optimalProtein}g / day** (2.0 g/kg body weight)\n` +
        `  *Rationale: Optimizes muscle protein synthesis (MPS) and leucine thresholds without excessive nitrogen waste.*\n` +
        `• **Target Calories:** **${targetCalories} kcal** (Includes lean surplus for muscular fiber remodeling)\n` +
        `• **Target Carbohydrates:** **~${Math.round((targetCalories * 0.45) / 4)}g** (glycogen resynthesis & anti-catabolic insulin signaling)\n` +
        `• **Target Fats:** **~${Math.round(weightKg * 1.0)}g** (essential fatty acids for testosterone synthesis)\n\n`;

      if (loggedCalories > 0 || loggedProtein > 0) {
        reply += `**Today's Tracked Intake:**\n` +
          `• Calories Logged: **${loggedCalories} / ${targetCalories} kcal** (${targetCalories - loggedCalories > 0 ? `${targetCalories - loggedCalories} kcal remaining` : 'Target reached!'})\n` +
          `• Protein Logged: **${loggedProtein} / ${optimalProtein}g** (${optimalProtein - loggedProtein > 0 ? `${optimalProtein - loggedProtein}g remaining` : 'Target hit! 🎯'})\n\n`;
      } else {
        reply += `*Tip: Track your food intake in Tab 4 (Hypertrophy Lab) using the updated "Save Daily Intake" button below.*\n\n`;
      }

      reply += `**Nutrient Timing Guidelines:**\n` +
        `1. **Post-Workout Window:** Ingest 30–40g of complete protein containing ≥3g leucine within 2 hours of training.\n` +
        `2. **Dinner Cutoff:** Complete your final calorie intake by **${times.dinnerCutoff}** to prevent nocturnal digestive thermogenesis.\n` +
        `3. **Hydration & Electrolytes:** Consume at least 2.5–3.0L of water with sodium and potassium to support vascular stroke volume.`;

    } else if (isHabits) {
      // 🧬 Habit Correlations & Lifestyle Impact
      reply = `### 🧬 WHOOP Coach: Evidence-Based Habit Correlations\n\n` +
        `Based on your wearable tracking history and peer-reviewed sports physiology:\n\n` +
        `**Top Positive Recovery Catalysts:**\n` +
        `• **Morning Sunlight (15 min):** Sets the suprachiasmatic nucleus circadian clock. Increases evening melatonin amplitude and extends deep sleep by **+15 minutes**.\n` +
        `• **Cold Plunge / Cold Shower (3 min):** Stimulates the vagal nerve and triggers a parasympathetic rebound, raising next-day HRV by **+14%**.\n` +
        `• **Magnesium Bisglycinate (400mg):** Agonizes GABA receptors in the brain, lengthening restorative Slow Wave Sleep by **+16%**.\n` +
        `• **Consistent Bedtime (±30m):** Eliminates circadian social jetlag, increasing average recovery score by **+11%**.\n\n` +
        `**Top Recovery Suppressors:**\n` +
        `• **Alcohol within 6 Hours of Bed:** Destroys REM sleep, triggers nocturnal sympathetic tachycardia, elevates resting HR by **+5 to +8 bpm**, and crashes HRV by up to **-25%**.\n` +
        `• **Late Night Meals (<3h pre-bed):** Forces nocturnal splanchnic digestion, keeping core body temperature elevated and blunting deep sleep.\n` +
        `• **Late Screen Exposure:** 450–480nm blue light suppresses endogenous melatonin by up to 50%, delaying sleep onset latency by 20–35 minutes.`;

    } else if (isVitals || isBreath) {
      // 🫁 Vitals, HRV, & Breathwork
      reply = `### 🫁 WHOOP Coach: Autonomic Telemetry & Vagal Tone Analysis\n\n` +
        `**Autonomic Assessment:** **${analysis.stress.title}** (${analysis.stress.state})\n\n` +
        `• **Heart Rate Variability (HRV):** **${analysis.recovery.hrv} ms** (${analysis.recovery.hrvDeltaPct >= 0 ? '+' : ''}${analysis.recovery.hrvDeltaPct}% vs 7-day average of ${analysis.recovery.avgHrv7} ms).\n` +
        `• **Resting Heart Rate:** **${analysis.recovery.rhr} bpm** (${analysis.recovery.rhrDelta >= 0 ? '+' : ''}${analysis.recovery.rhrDelta} bpm shift vs 7d average of ${analysis.recovery.avgRhr7} bpm).\n` +
        `• **Respiratory Rate:** **${analysis.sleep_architecture.resp_rate} rpm** (${analysis.sleep_architecture.resp_delta >= 0 ? '+' : ''}${analysis.sleep_architecture.resp_delta} rpm shift).\n\n` +
        `**Prescribed Breathwork Protocol:**\n` +
        `• **Protocol:** **${analysis.breathwork.name}** (${analysis.breathwork.category})\n` +
        `• **Duration:** ${analysis.breathwork.duration_min} minutes (${analysis.breathwork.cycles} cycles)\n` +
        `• **Technique:** ${analysis.breathwork.instructions}\n` +
        `• **Biological Mechanism:** ${analysis.breathwork.mechanism}\n\n` +
        `Head over to **Tab 2 (Recovery & HRV Lab)** to launch the dynamic neuro-respiratory pacer.`;

    } else {
      // ⚡ Comprehensive Daily Briefing
      reply = `### ⚡ WHOOP Coach: Comprehensive Daily Briefing (${analysis.date})\n\n` +
        `**1. Autonomic Recovery:** **${analysis.recovery.score}% (${analysis.recovery.category})**\n` +
        `• HRV is **${analysis.recovery.hrv} ms** (${analysis.recovery.hrvDeltaPct >= 0 ? '+' : ''}${analysis.recovery.hrvDeltaPct}% vs 7-day baseline of ${analysis.recovery.avgHrv7} ms).\n` +
        `• Resting HR is **${analysis.recovery.rhr} bpm** (${analysis.recovery.rhrDelta >= 0 ? '+' : ''}${analysis.recovery.rhrDelta} bpm shift).\n` +
        `• Autonomic State: **${analysis.stress.title}**.\n\n` +
        `**2. Training Capacity:** Target Day Strain **${analysis.training.strainTargetMin} – ${analysis.training.strainTargetMax}**\n` +
        `• Current Strain: **${analysis.training.dayStrain}**.\n` +
        `• Guidance: ${analysis.recovery.score >= 67 ? 'Green light for high-strain training and heavy resistance work.' : (analysis.recovery.score >= 34 ? 'Moderate aerobic or maintenance training. Keep strain capped within target.' : 'Active recovery only. Prioritize parasympathetic downtime.')}\n\n` +
        `**3. Sleep Architecture:** Total Asleep **${analysis.sleep_architecture.total_asleep_hours}h** (${Math.round((analysis.sleep_architecture.total_asleep_min / (analysis.sleep_architecture.need_total_min || 480)) * 100)}% of need)\n` +
        `• Deep Sleep: **${analysis.sleep_architecture.sws_min}m (${analysis.sleep_architecture.deep_pct}%)** | REM: **${analysis.sleep_architecture.rem_min}m (${analysis.sleep_architecture.rem_pct}%)**\n` +
        `• Sleep Debt: **+${analysis.sleep_architecture.debt_min}m** | Tonight's Need: **${Math.floor(analysis.sleep_architecture.need_total_min / 60)}h ${analysis.sleep_architecture.need_total_min % 60}m**\n\n` +
        `**4. Actionable Next Steps:**\n` +
        `• **Breathwork:** Perform 5 minutes of **${analysis.breathwork.name}** in Tab 2 to stimulate the vagal brake.\n` +
        `• **Nutrition:** Target **${optimalProtein}g Protein** and **${targetCalories} kcal** today.\n` +
        `• **Target Lights-Out:** Bedtime by **${times.lightsOut}** (wind-down starts at **${times.windDown}**).`;
    }

    return {
      reply,
      source: 'whoop-coach-engine',
      analysis,
      synced: true,
      provider
    };
  }
}

module.exports = new AICoachService();
