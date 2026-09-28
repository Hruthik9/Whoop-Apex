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
   */  async chatWithCoach(userPrompt, contextOrVitals = {}, history = [], conversationHistory = []) {
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

    // 1. If Gemini API Key is configured, use Gemini Models with active conversation memory
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

      const systemInstruction = `You are WHOOP Coach AI, an elite, caring human performance coach.
The user is tracking their biometrics using ${provider === 'google_fitbit' ? 'Google Pixel Watch / Fitbit' : 'WHOOP 4.0'}.
Biometrics are freshly synced from their wearable.

PHYSIOLOGICAL TELEMETRY (${analysis.date}):
- Recovery: ${analysis.recovery.score}% (${analysis.recovery.category})
- HRV: ${analysis.recovery.hrv} ms (7d Baseline: ${analysis.recovery.avgHrv7} ms | Delta: ${analysis.recovery.hrvDeltaPct}%)
- Resting HR: ${analysis.recovery.rhr} bpm (7d Baseline: ${analysis.recovery.avgRhr7} bpm | Shift: ${analysis.recovery.rhrDelta >= 0 ? '+' : ''}${analysis.recovery.rhrDelta} bpm)
- Respiratory Rate: ${analysis.sleep_architecture.resp_rate} rpm
- Day Strain: ${analysis.training.dayStrain} (Optimal Target: ${analysis.training.strainTargetMin} - ${analysis.training.strainTargetMax})
- Total Sleep: ${analysis.sleep_architecture.total_asleep_hours}h (${analysis.sleep_architecture.total_asleep_min}m)
- Deep Sleep (Slow Wave): ${analysis.sleep_architecture.sws_min}m (${analysis.sleep_architecture.deep_pct}%)
- REM Sleep: ${analysis.sleep_architecture.rem_min}m (${analysis.sleep_architecture.rem_pct}%)
- Sleep Debt: +${analysis.sleep_architecture.debt_min}m | Target Bedtime: ${times.lightsOut} (Wind-down: ${times.windDown} | Meal Cutoff: ${times.dinnerCutoff})
- Body Weight: ${weightKg} kg | Target Protein: ${optimalProtein}g | Target Calories: ${targetCalories} kcal
- Autonomic State: ${analysis.stress.title} (${analysis.stress.state})
- Prescribed Breathwork: ${analysis.breathwork.name} (${analysis.breathwork.duration_min} min)

CORE COACHING INSTRUCTIONS:
1. SHORT & SIMPLE: Strictly keep your response concise (50-90 words, never more than 110 words). Avoid dense medical jargon, walls of text, or overly long lectures.
2. EMPATHETIC & WARM: Talk like a supportive coach who cares about how their body feels today.
3. CLEAR & SUGGESTIVE: Provide 2-3 gentle, practical suggestions they can act on right now.
4. ACTIVE SESSION MEMORY: Remember earlier questions and answers from this active conversation. Answer follow-up questions naturally based on previous context.`;

      // Build multi-turn messages array from conversationHistory
      const contents = [];
      if (Array.isArray(conversationHistory) && conversationHistory.length > 0) {
        const recentTurns = conversationHistory.slice(-6);
        for (const turn of recentTurns) {
          const role = (turn.role === 'model' || turn.role === 'assistant' || turn.role === 'coach') ? 'model' : 'user';
          const text = typeof turn.text === 'string' ? turn.text.trim() : (typeof turn.content === 'string' ? turn.content.trim() : '');
          if (text) {
            if (contents.length === 0 || contents[contents.length - 1].role !== role) {
              contents.push({ role, parts: [{ text }] });
            }
          }
        }
      }

      if (contents.length > 0 && contents[contents.length - 1].role === 'user') {
        contents[contents.length - 1].parts[0].text += `\n${userPrompt.trim()}`;
      } else {
        contents.push({ role: 'user', parts: [{ text: userPrompt.trim() }] });
      }

      for (const modelName of candidateModels) {
        try {
          const response = await aiClient.models.generateContent({
            model: modelName,
            contents,
            config: {
              systemInstruction
            }
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
    // Short, clear, empathetic, and suggestive
    const q = (userPrompt || '').toLowerCase();
    let reply = '';
    const hasHistory = Array.isArray(conversationHistory) && conversationHistory.length > 0;
    const historyPrefix = hasHistory ? 'Building on our conversation: ' : '';

    const isTraining = /work\s*out|lift|train|strain|exercise|gym|cardio|run|push|heavy|intensity|target\s*strain|rest\s*day|can\s*i/i.test(q);
    const isRecovery = /why\s*(is|my)?\s*recovery|recovery\s*(score|down|low|red|yellow)|improve\s*recovery|boost\s*recovery|culprit/i.test(q);
    const isSleep = /how\s*(was|is)\s*(my\s*)?sleep|sleep\s*(stage|score|quality|need|debt|efficiency)|deep\s*sleep|slow\s*wave|rem|sws|tired|wake|nap|bedtime|when\s*should\s*i\s*(sleep|bed)/i.test(q);
    const isVitals = /hrv|heart\s*rate\s*variability|rhr|resting\s*heart|vagal|respiratory|sympathetic|parasympathetic|ans|autonomic|stress/i.test(q);
    const isNutrition = /protein|eat|nutrition|food|calories|macros|hypertrophy|diet|muscle|bulk|cut|fuel|dinner|lunch|breakfast/i.test(q);
    const isHabits = /habit|alcohol|caffeine|sunlight|cold\s*plunge|sauna|routine|lifestyle|what\s*helps/i.test(q);
    const isBreath = /breath|breathe|pacer|sigh|4-7-8|box\s*breath|calm/i.test(q);

    if (isTraining) {
      if (analysis.recovery.score >= 67) {
        reply = `${historyPrefix}Your recovery is looking great at **${analysis.recovery.score}% (${analysis.recovery.category})**! Your cardiovascular system and nervous system are primed to push.\n\n` +
          `• **Target Strain:** **${analysis.training.strainTargetMin} – ${analysis.training.strainTargetMax}** (Heavy lifts or intense cardio are welcome today)\n` +
          `• **Fueling:** Grab 25–30g protein and some light carbs after training to rebuild glycogen\n` +
          `• **Wind-down:** Aim to start relaxing around **${times.windDown}** so tomorrow stays green.`;
      } else if (analysis.recovery.score >= 34) {
        reply = `${historyPrefix}Your recovery is in a moderate zone at **${analysis.recovery.score}% (${analysis.recovery.category})**. You have solid energy, but your nervous system is in a balanced maintenance state.\n\n` +
          `• **Target Strain:** Keep it between **${analysis.training.strainTargetMin} – ${analysis.training.strainTargetMax}**\n` +
          `• **Workout Style:** Steady Zone 2 cardio or moderate lifting without pushing to failure\n` +
          `• **Suggestion:** Stay well hydrated today and take 5 minutes to stretch post-workout.`;
      } else {
        reply = `${historyPrefix}Your body is carrying some fatigue today with recovery at **${analysis.recovery.score}% (${analysis.recovery.category})** and HRV down to **${analysis.recovery.hrv} ms**. Be kind to yourself today.\n\n` +
          `• **Recommendation:** Prioritize active recovery—a 20-minute walk or gentle mobility\n` +
          `• **Strain Cap:** Keep total strain low (< **${analysis.training.strainTargetMax}**)\n` +
          `• **Suggestion:** Try 5 minutes of **${analysis.breathwork.name}** and aim for lights-out by **${times.lightsOut}**.`;
      }
    } else if (isRecovery) {
      reply = `${historyPrefix}Your recovery is at **${analysis.recovery.score}% (${analysis.recovery.category})**. Here is what influenced it most:\n\n` +
        `• **HRV:** **${analysis.recovery.hrv} ms** (${analysis.recovery.hrvDeltaPct >= 0 ? '+' : ''}${analysis.recovery.hrvDeltaPct}% vs your 7-day average of ${analysis.recovery.avgHrv7} ms)\n` +
        `• **Resting HR:** **${analysis.recovery.rhr} bpm** (${analysis.recovery.rhrDelta >= 0 ? '+' : ''}${analysis.recovery.rhrDelta} bpm shift)\n` +
        (analysis.culprits.length > 0 ? `• **Key Factor:** ${analysis.culprits[0]}\n\n` : `\n`) +
        `**Gentle Suggestions:**\n` +
        `1. Wrap up dinner by **${times.dinnerCutoff}** to give your digestion a full rest\n` +
        `2. Take 5 minutes for **${analysis.breathwork.name}** in the Recovery Lab\n` +
        `3. Target bedtime at **${times.lightsOut}** to clear your +${analysis.sleep_architecture.debt_min}m sleep debt.`;
    } else if (isSleep) {
      reply = `${historyPrefix}You logged **${analysis.sleep_architecture.total_asleep_hours} hours** of sleep last night (${Math.round((analysis.sleep_architecture.total_asleep_min / (analysis.sleep_architecture.need_total_min || 480)) * 100)}% of your sleep need).\n\n` +
        `• **Deep Sleep:** **${analysis.sleep_architecture.sws_min}m (${analysis.sleep_architecture.deep_pct}%)** — ${analysis.sleep_architecture.deep_pct >= 20 ? 'Optimal physical remodeling' : 'Slightly low, keep tonight cool'}\n` +
        `• **REM Sleep:** **${analysis.sleep_architecture.rem_min}m (${analysis.sleep_architecture.rem_pct}%)** — ${analysis.sleep_architecture.rem_pct >= 20 ? 'Great mental restoration' : 'Light consolidation'}\n\n` +
        `**Tonight's Sleep Suggestions:**\n` +
        `• Start dimming screens at **${times.windDown}**\n` +
        `• Target lights-out by **${times.lightsOut}** (sleep need: ${Math.floor(analysis.sleep_architecture.need_total_min / 60)}h ${analysis.sleep_architecture.need_total_min % 60}m)`;
    } else if (isNutrition) {
      reply = `${historyPrefix}For your body weight (${weightKg} kg), here are your daily nutrition anchors:\n\n` +
        `• **Protein Target:** **${optimalProtein}g / day** (supports muscle repair and satiety)\n` +
        `• **Energy Target:** **${targetCalories} kcal** (supports current strain demands)\n\n` +
        `**Practical Suggestions:**\n` +
        `1. Include 30–35g of protein in your main meals today\n` +
        `2. Finish heavier calories by **${times.dinnerCutoff}** so digestion doesn't spike nocturnal heart rate\n` +
        `3. Keep water and electrolytes steady throughout the afternoon.`;
    } else if (isBreath || isVitals) {
      reply = `${historyPrefix}Your autonomic state is currently **${analysis.stress.title}** with HRV at **${analysis.recovery.hrv} ms** and resting heart rate at **${analysis.recovery.rhr} bpm**.\n\n` +
        `**Suggested Breathwork Protocol:**\n` +
        `• **${analysis.breathwork.name}** (${analysis.breathwork.duration_min} minutes, ${analysis.breathwork.cycles} cycles)\n` +
        `• ${analysis.breathwork.instructions}\n\n` +
        `*Tip: Launch the live vagal pacer in the Recovery Lab to follow along with the rhythm.*`;
    } else if (isHabits) {
      reply = `${historyPrefix}Here are 3 small habits that have the biggest positive impact on your recovery:\n\n` +
        `1. **Morning Sunlight (10-15m):** Anchors your circadian clock and deepens slow-wave sleep tonight\n` +
        `2. **Early Dinner (by ${times.dinnerCutoff}):** Lowers nocturnal resting heart rate and boosts next-day HRV\n` +
        `3. **Consistent Bedtime (±20m):** Keeps your internal rhythm in sync for smoother wake-ups.`;
    } else {
      reply = `${historyPrefix}Here is your quick daily briefing for today:\n\n` +
        `• **Recovery:** **${analysis.recovery.score}% (${analysis.recovery.category})** | HRV: **${analysis.recovery.hrv} ms**\n` +
        `• **Strain Target:** **${analysis.training.strainTargetMin} – ${analysis.training.strainTargetMax}** (Current: ${analysis.training.dayStrain})\n` +
        `• **Sleep:** **${analysis.sleep_architecture.total_asleep_hours}h** (+${analysis.sleep_architecture.debt_min}m debt)\n\n` +
        `**Suggestions for Today:**\n` +
        `1. Aim for **${optimalProtein}g Protein** and finish dinner by **${times.dinnerCutoff}**\n` +
        `2. Try 5 minutes of **${analysis.breathwork.name}** to settle the nervous system\n` +
        `3. Target lights-out by **${times.lightsOut}**.`;
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
