let GoogleGenAI;
try {
  const genaiPkg = require('@google/genai');
  GoogleGenAI = genaiPkg.GoogleGenAI;
} catch (e) {
  // Graceful fallback if package is still loading
  GoogleGenAI = null;
}

class AICoachService {
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY || '';
    this.ai = null;
    if (this.apiKey && GoogleGenAI) {
      try {
        this.ai = new GoogleGenAI({ apiKey: this.apiKey });
      } catch (e) {
        console.warn('Failed to initialize GoogleGenAI client:', e.message);
      }
    }
  }

  /**
   * Diagnostic assessment of autonomic stress, sleep architecture, and breathwork prescriptions
   */
  analyzeVitals(dayRecord, history = []) {
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
    const debtMin = sleep.need?.debt_min || 0;
    const deepPct = totalAsleepMin > 0 ? Math.round((swsMin / totalAsleepMin) * 100) : 0;
    const remPct = totalAsleepMin > 0 ? Math.round((remMin / totalAsleepMin) * 100) : 0;
    const restorativePct = totalAsleepMin > 0 ? Math.round(((swsMin + remMin) / totalAsleepMin) * 100) : 0;

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

    // 2. Targeted Breathwork Prescription
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

    // 3. Sleep Architecture Work Suggestions
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
      breathwork: breathworkProtocol,
      sleep_work: sleepWork,
      readiness_summary: `Recovery is at ${recScore}%. Target Day Strain: ${recScore > 66 ? '12.0 - 15.5 (High)' : (recScore > 33 ? '9.0 - 11.4 (Optimal)' : '4.0 - 7.0 (Restorative)')}.`
    };
  }

  /**
   * Interactive chat query using Gemini 2.5 Flash if API key is configured,
   * with seamless evidence-based clinical heuristic fallback.
   */
  async chatWithCoach(userPrompt, currentVitals = {}, history = []) {
    const analysis = this.analyzeVitals(currentVitals, history);

    // If Gemini API is configured, use Gemini 2.5 Flash
    if (this.ai && this.apiKey) {
      try {
        const systemPrompt = `You are the Apex AI Physiological Copilot, an elite human performance and sports physiology coach.
The user is tracking their biometrics using WHOOP or Google Fitbit.
Analyze their question in the exact context of their physiological metrics:

CURRENT VITALS:
- Date: ${analysis.date}
- Recovery Score: ${currentVitals.recovery?.score || 50}%
- HRV: ${currentVitals.recovery?.hrv_ms || 50} ms (7d Delta: ${analysis.stress.hrv_delta_pct}%)
- Resting Heart Rate: ${currentVitals.recovery?.resting_heart_rate || 65} bpm (7d Delta: ${analysis.stress.rhr_delta >= 0 ? '+' : ''}${analysis.stress.rhr_delta} bpm)
- Total Sleep: ${currentVitals.sleep?.total_asleep_min || 0} minutes (${Math.floor((currentVitals.sleep?.total_asleep_min || 0) / 60)}h ${(currentVitals.sleep?.total_asleep_min || 0) % 60}m)
- Deep Sleep (SWS): ${currentVitals.sleep?.slow_wave_sleep_min || 0}m
- REM Sleep: ${currentVitals.sleep?.rem_sleep_min || 0}m
- Sleep Debt: ${currentVitals.sleep?.need?.debt_min || 0}m
- Respiratory Rate: ${currentVitals.sleep?.respiratory_rate || 16.5} rpm
- Autonomic Stress Status: ${analysis.stress.title} (${analysis.stress.state})
- Recommended Breathwork: ${analysis.breathwork.name} (${analysis.breathwork.duration_min} min)

GUIDELINES:
- Provide concise, science-backed, actionable guidance (2-4 punchy paragraphs or bullet points).
- Speak with professional authority (like Dr. Andy Galpin, Dr. Peter Attia, or a team physiologist).
- Always tie your answer back to their specific live biometrics (HRV, Deep sleep, Recovery, etc.).
- Suggest specific breathing cadences (4-7-8, Cyclic Sighing, Box Breathing) or sleep hygiene work when appropriate.`;

        const response = await this.ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: [
            { role: 'user', parts: [{ text: `${systemPrompt}\n\nUSER QUESTION: ${userPrompt}` }] }
          ]
        });

        if (response && response.text) {
          return {
            reply: response.text.trim(),
            source: 'gemini-2.5-flash',
            analysis
          };
        }
      } catch (err) {
        console.warn('Gemini API call failed, falling back to clinical heuristics:', err.message);
      }
    }

    // High-quality clinical heuristic fallback response
    const qLower = (userPrompt || '').toLowerCase();
    let reply = '';

    if (qLower.includes('stress') || qLower.includes('anxiety') || qLower.includes('ans') || qLower.includes('sympathetic')) {
      reply = `**Autonomic Stress Assessment:** Your biometrics currently indicate **${analysis.stress.title}**.\n\n` +
        `• **HRV Baseline:** Your HRV is at **${currentVitals.recovery?.hrv_ms || 50} ms** (${analysis.stress.hrv_delta_pct >= 0 ? '+' : ''}${analysis.stress.hrv_delta_pct}% compared to your 7-day average).\n` +
        `• **Resting Heart Rate:** **${currentVitals.recovery?.resting_heart_rate || 65} bpm** (${analysis.stress.rhr_delta >= 0 ? '+' : ''}${analysis.stress.rhr_delta} bpm shift).\n\n` +
        `**Prescribed Immediate Action:** Perform **${analysis.breathwork.name}** for ${analysis.breathwork.duration_min} minutes. ${analysis.breathwork.instructions} This rapidly engages the vagal nerve brake to down-regulate sympathetic cortisol tone.`;
    } else if (qLower.includes('breath') || qLower.includes('breathe') || qLower.includes('lung') || qLower.includes('cadence')) {
      reply = `**Targeted Breathwork Prescription:** Based on your current recovery state, your primary protocol is **${analysis.breathwork.name}** (${analysis.breathwork.category}).\n\n` +
        `• **Duration:** ${analysis.breathwork.duration_min} minutes (${analysis.breathwork.cycles} cycles)\n` +
        `• **Technique:** ${analysis.breathwork.instructions}\n` +
        `• **Physiological Impact:** ${analysis.breathwork.mechanism}\n\n` +
        `Click the **"Start Breathing Pacer"** button in your Copilot card to follow the real-time visual rhythm.`;
    } else if (qLower.includes('sleep') || qLower.includes('deep') || qLower.includes('rem') || qLower.includes('debt') || qLower.includes('bed')) {
      const topWork = analysis.sleep_work[0] || {};
      reply = `**Sleep Architecture Optimization:** Tonight's priority is **${topWork.target || 'Circadian Alignment'}**.\n\n` +
        `• **Current Sleep Window:** Total asleep was ${Math.floor((currentVitals.sleep?.total_asleep_min || 0) / 60)}h ${(currentVitals.sleep?.total_asleep_min || 0) % 60}m with **${currentVitals.sleep?.slow_wave_sleep_min || 0}m Deep** and **${currentVitals.sleep?.rem_sleep_min || 0}m REM**.\n` +
        `• **Sleep Debt:** Accumulated debt is currently **+${currentVitals.sleep?.need?.debt_min || 0} min**.\n\n` +
        `**Key Intervention:** ${topWork.action}\n*Expected Impact:* ${topWork.impact}`;
    } else {
      reply = `**Physiological Overview for ${analysis.date}:**\n\n` +
        `• **Autonomic Readiness:** Recovery is at **${currentVitals.recovery?.score || 50}%** (${analysis.stress.title}).\n` +
        `• **Vascular Telemetry:** HRV is **${currentVitals.recovery?.hrv_ms || 50} ms** and Resting HR is **${currentVitals.recovery?.resting_heart_rate || 65} bpm**.\n` +
        `• **Sleep Need:** Sleep debt is **+${currentVitals.sleep?.need?.debt_min || 0}m**. Recommended bedtime target is **${Math.floor((currentVitals.sleep?.need?.total_min || 480) / 60)}h ${(currentVitals.sleep?.need?.total_min || 480) % 60}m**.\n\n` +
        `**Recommended Protocol:** Start with 5 minutes of **${analysis.breathwork.name}** to optimize autonomic tone for today's training target (${analysis.readiness_summary}).`;
    }

    return {
      reply,
      source: 'clinical-heuristics',
      analysis
    };
  }
}

module.exports = new AICoachService();
