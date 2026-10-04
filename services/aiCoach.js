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

    // Calculate 7-day rolling baselines from history, EXCLUDING the target day itself
    // (B4 fix — including it biased every delta toward zero)
    const targetDate = dayRecord && dayRecord.date;
    let priorDays = history;
    if (targetDate) {
      const filtered = history.filter(h => h && h.date && h.date < targetDate);
      if (filtered.length) priorDays = filtered;
    } else if (history.length) {
      priorDays = history.slice(0, -1);
    }
    const recent = priorDays.slice(-7);
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
    const steps = strain.steps || null;
    const activeZoneMinutes = strain.active_zone_minutes || null;

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
        steps,
        activeZoneMinutes,
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
   * Interactive chat query using Gemini if API key is configured,
   * or the advanced Clinical Apex Coach Physiological Engine.
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

      const systemInstruction = `You are Apex Coach, an elite, caring human performance and physiological coach.
The user is tracking their biometrics using ${provider === 'google_fitbit' ? 'Google Pixel Watch / Fitbit' : 'WHOOP (Latest 5.0 / API)'}.
The biometrics are freshly synced from their wearable.

PHYSIOLOGICAL TELEMETRY (${analysis.date}):
- Recovery: ${analysis.recovery.score}% (${analysis.recovery.category})
- HRV: ${analysis.recovery.hrv} ms (7d Baseline: ${analysis.recovery.avgHrv7} ms | Delta: ${analysis.recovery.hrvDeltaPct}%)
- Resting HR: ${analysis.recovery.rhr} bpm (7d Baseline: ${analysis.recovery.avgRhr7} bpm | Shift: ${analysis.recovery.rhrDelta >= 0 ? '+' : ''}${analysis.recovery.rhrDelta} bpm)
- Respiratory Rate: ${analysis.sleep_architecture.resp_rate} rpm
- Day Strain: ${analysis.training.dayStrain} (Optimal Target: ${analysis.training.strainTargetMin} - ${analysis.training.strainTargetMax})${analysis.training.steps ? `\n- Daily Steps: ${analysis.training.steps.toLocaleString()}${analysis.training.activeZoneMinutes ? ` (${analysis.training.activeZoneMinutes} Active Zone Min)` : ''}` : ''}
- Total Sleep: ${analysis.sleep_architecture.total_asleep_hours}h (${analysis.sleep_architecture.total_asleep_min}m)
- Deep Sleep (Slow Wave): ${analysis.sleep_architecture.sws_min}m (${analysis.sleep_architecture.deep_pct}%)
- REM Sleep: ${analysis.sleep_architecture.rem_min}m (${analysis.sleep_architecture.rem_pct}%)
- Sleep Debt: +${analysis.sleep_architecture.debt_min}m | Target Bedtime: ${times.lightsOut} (Wind-down: ${times.windDown} | Meal Cutoff: ${times.dinnerCutoff})
- Body Weight: ${weightKg} kg | Target Protein: ${optimalProtein}g | Target Calories: ${targetCalories} kcal
- Autonomic State: ${analysis.stress.title} (${analysis.stress.state})
- Prescribed Breathwork: ${analysis.breathwork.name} (${analysis.breathwork.duration_min} min)

CORE COACHING INSTRUCTIONS:
1. NATURAL PARAGRAPHS: Write mainly in 2 to 3 smooth, conversational paragraphs. Avoid making responses feel like a rigid list or bullet-point outline. Use points only when listing specific items is truly needed.
2. BALANCED LENGTH: Keep your responses moderately concise (around 120 to 180 words). Not overly brief, but never long, tedious, or hard to read.
3. EMPATHETIC & HUMAN: Speak with genuine warmth, care, and encouragement like an attentive personal coach. Validate how their body is feeling today before offering advice.
4. INFORMATIVE & SUGGESTIVE: Weave physiological telemetry and practical next steps naturally into your advice.
5. WEARABLE PHILOSOPHY: If the user asks about steps, note that Google Health / Fitbit tracks mechanical steps and Active Zone Minutes, whereas WHOOP prioritizes cardiovascular and muscular strain (0 to 21) to capture actual cardiac demand rather than step counts.
6. ACTIVE SESSION MEMORY: Remember earlier questions and answers from this active conversation. Answer follow-up questions naturally based on previous context.`;

      // Build multi-turn messages array from conversationHistory
      const contents = [];
      if (Array.isArray(conversationHistory) && conversationHistory.length > 0) {
        const recentTurns = conversationHistory.slice(-6);
        for (const turn of recentTurns) {
          const role = (turn.role === 'model' || turn.role === 'assistant' || turn.role === 'coach') ? 'model' : 'user';
          const text = typeof turn.text === 'string' ? turn.text.trim() : (typeof turn.content === 'string' ? turn.content.trim() : '');
          if (text) {
            const last = contents[contents.length - 1];
            if (last && last.role === role) {
              // B3 fix: merge consecutive same-role turns instead of silently dropping them
              last.parts[0].text += `\n${text}`;
            } else {
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

    // 2. High-Precision Clinical Apex Coach Engine (Offline & Default)
    // Conversational paragraphs with gentle suggestions
    const q = (userPrompt || '').toLowerCase();
    let reply = '';
    const hasHistory = Array.isArray(conversationHistory) && conversationHistory.length > 0;
    const historyPrefix = hasHistory ? 'Building on our conversation, ' : '';

    const isTraining = /work\s*out|lift|train|strain|exercise|gym|cardio|run|push|heavy|intensity|target\s*strain|rest\s*day|can\s*i/i.test(q);
    const isRecovery = /why\s*(is|my)?\s*recovery|recovery\s*(score|down|low|red|yellow)|improve\s*recovery|boost\s*recovery|culprit/i.test(q);
    const isSleep = /how\s*(was|is)\s*(my\s*)?sleep|sleep\s*(stage|score|quality|need|debt|efficiency)|deep\s*sleep|slow\s*wave|rem|sws|tired|wake|nap|bedtime|when\s*should\s*i\s*(sleep|bed)/i.test(q);
    const isVitals = /hrv|heart\s*rate\s*variability|rhr|resting\s*heart|vagal|respiratory|sympathetic|parasympathetic|ans|autonomic|stress/i.test(q);
    const isNutrition = /protein|eat|nutrition|food|calories|macros|hypertrophy|diet|muscle|bulk|cut|fuel|dinner|lunch|breakfast/i.test(q);
    const isHabits = /habit|alcohol|caffeine|sunlight|cold\s*plunge|sauna|routine|lifestyle|what\s*helps/i.test(q);
    const isBreath = /breath|breathe|pacer|sigh|4-7-8|box\s*breath|calm/i.test(q);
    const isSteps = /step|walk(ing)?\s*count|how\s*many\s*steps|daily\s*steps/i.test(q);

    if (isSteps) {
      if (provider === 'google_fitbit' && analysis.training.steps) {
        reply = `${historyPrefix}you have recorded **${analysis.training.steps.toLocaleString()} steps** today${analysis.training.activeZoneMinutes ? ` with **${analysis.training.activeZoneMinutes} Active Zone Minutes**` : ''} via Google Health / Fitbit.\n\n` +
          `Hitting your daily movement threshold provides essential non-exercise baseline circulation without creating central nervous system fatigue. Combined with your optimal day strain target of **${analysis.training.strainTargetMin} - ${analysis.training.strainTargetMax}**, you are in a great position to balance active metabolic conditioning with adequate recovery.`;
      } else {
        reply = `${historyPrefix}in WHOOP mode, mechanical step counts are intentionally not tracked or displayed on the interface. Instead, WHOOP focuses on your true cardiovascular and muscular strain (0 to 21 scale), capturing your actual heart rate response whether you are cycling, lifting weights, or sprinting.\n\n` +
          `Your current day strain is **${analysis.training.dayStrain}**, and based on your recovery score of **${analysis.recovery.score}%**, your recommended optimal strain target for today is between **${analysis.training.strainTargetMin} and ${analysis.training.strainTargetMax}**.`;
      }
    } else if (isTraining) {
      if (analysis.recovery.score >= 67) {
        reply = `${historyPrefix}your recovery is in great shape today at **${analysis.recovery.score}% (${analysis.recovery.category})**. Your nocturnal HRV is resilient at **${analysis.recovery.hrv} ms**, which means your autonomic nervous system is refreshed and primed to absorb meaningful training strain.\n\n` +
          `You have a green light to take on heavier compound lifting or high-intensity conditioning today, aiming for an optimal day strain between **${analysis.training.strainTargetMin} and ${analysis.training.strainTargetMax}**. Remember to refuel with 25–30g of protein post-workout, and start easing into relaxation around **${times.windDown}** to keep your metrics strong tomorrow.`;
      } else if (analysis.recovery.score >= 34) {
        reply = `${historyPrefix}your recovery is sitting in a balanced maintenance zone at **${analysis.recovery.score}% (${analysis.recovery.category})**. You have solid functional energy, but your nervous system is working steadily to process earlier training load rather than peak performance.\n\n` +
          `I recommend keeping your strain moderate today—ideally between **${analysis.training.strainTargetMin} and ${analysis.training.strainTargetMax}**. Steady-state Zone 2 aerobic work or controlled resistance training without pushing to failure will keep your fitness progressing without digging into fatigue. Stay well hydrated, and spend a few minutes stretching after your session.`;
      } else {
        reply = `${historyPrefix}your body is clearly signaling that it needs some care today. With your recovery down at **${analysis.recovery.score}% (${analysis.recovery.category})** and HRV lower at **${analysis.recovery.hrv} ms**, your autonomic nervous system is carrying notable fatigue, and pushing through hard strain right now will only prolong your recovery deficit.\n\n` +
          `I strongly suggest treating today as a restorative day. If you want to move, an easy 20-minute walk or gentle mobility work is plenty, keeping total strain capped under **${analysis.training.strainTargetMax}**. Try 5 minutes of **${analysis.breathwork.name}** in the Recovery Lab to help down-regulate stress, and aim for lights-out by **${times.lightsOut}** so your body can rebuild.`;
      }
    } else if (isRecovery) {
      reply = `${historyPrefix}your recovery today is at **${analysis.recovery.score}% (${analysis.recovery.category})**, reflecting how your nervous system rested overnight. Your nocturnal HRV registered at **${analysis.recovery.hrv} ms** (${analysis.recovery.hrvDeltaPct >= 0 ? '+' : ''}${analysis.recovery.hrvDeltaPct}% vs your 7-day baseline) with a resting heart rate of **${analysis.recovery.rhr} bpm**.\n\n` +
        `To help your autonomic nervous system rebound smoothly for tomorrow, try wrapping up dinner by **${times.dinnerCutoff}** so digestion doesn't elevate your resting heart rate through the night. Practicing 5 minutes of **${analysis.breathwork.name}** and aiming for bed by **${times.lightsOut}** will give you the restorative window needed to erase your +${analysis.sleep_architecture.debt_min}m sleep debt.`;
    } else if (isSleep) {
      reply = `${historyPrefix}you logged **${analysis.sleep_architecture.total_asleep_hours} hours** of sleep last night, covering ${Math.round((analysis.sleep_architecture.total_asleep_min / (analysis.sleep_architecture.need_total_min || 480)) * 100)}% of your calculated sleep need. You spent **${analysis.sleep_architecture.sws_min} minutes** in deep slow-wave sleep (${analysis.sleep_architecture.deep_pct}%) and **${analysis.sleep_architecture.rem_min} minutes** in REM sleep (${analysis.sleep_architecture.rem_pct}%).\n\n` +
        `Your restorative sleep balance looks ${analysis.sleep_architecture.deep_pct >= 20 ? 'healthy and supportive of cellular repair' : 'a bit light, so giving your body a cooler bedroom tonight will help'}. Begin dimming screens and overhead lights around **${times.windDown}**, and target lights-out by **${times.lightsOut}** to catch up on your sleep need comfortably.`;
    } else if (isNutrition) {
      reply = `${historyPrefix}for your body weight of **${weightKg} kg**, your target daily nutrition anchors are **${optimalProtein}g of protein** and **${targetCalories} kcal** to support muscle remodeling and energy expenditure.\n\n` +
        `Try distributing your protein across your main meals with roughly 30–35g per sitting to keep muscle protein synthesis active. Finishing your final calorie intake by **${times.dinnerCutoff}** will keep digestive thermogenesis from elevating your nocturnal heart rate, and keeping water intake steady will support vascular blood volume throughout the afternoon.`;
    } else if (isBreath || isVitals) {
      reply = `${historyPrefix}your autonomic nervous system is currently reflecting **${analysis.stress.title}** (${analysis.stress.state}), with resting heart rate sitting at **${analysis.recovery.rhr} bpm** and HRV at **${analysis.recovery.hrv} ms**.\n\n` +
        `To help shift your system toward restorative parasympathetic tone, I recommend 5 minutes of **${analysis.breathwork.name}** (${analysis.breathwork.instructions}). You can launch the live neuro-respiratory pacer directly in Tab 2 (Recovery Lab) to follow the guided visual cadence whenever you need to reset.`;
    } else if (isHabits) {
      reply = `${historyPrefix}looking at your physiological baselines, a few consistent daily habits have the strongest positive correlation with your recovery scores.\n\n` +
        `Getting 10 to 15 minutes of outdoor sunlight shortly after waking anchors your circadian rhythm and deepens slow-wave sleep tonight. Pair that with completing dinner by **${times.dinnerCutoff}** and keeping your bedtime within a consistent 20-minute window to eliminate social jetlag and support steady HRV.`;
    } else {
      reply = `${historyPrefix}here is your quick daily briefing for today: your recovery is at **${analysis.recovery.score}% (${analysis.recovery.category})** with HRV at **${analysis.recovery.hrv} ms**, and your target strain is between **${analysis.training.strainTargetMin} and ${analysis.training.strainTargetMax}**.\n\n` +
        `Focus on nourishing your body with **${optimalProtein}g of protein**, wrap up your last meal by **${times.dinnerCutoff}**, and take 5 minutes for **${analysis.breathwork.name}** in the Recovery Lab before aiming for lights-out by **${times.lightsOut}**.`;
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
