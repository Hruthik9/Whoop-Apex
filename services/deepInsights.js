/**
 * Deep Insights Engine — WHOOP CSV export analysis
 * =================================================
 * Parses WHOOP's manual data export (physiological_cycles.csv, sleeps.csv,
 * workouts.csv, journal_entries.csv), surfaces hidden habit correlations,
 * and generates 12-week goal roadmaps (VO2 max / sleep / strength).
 *
 * Export format reference (researched 2026-10-04):
 *  - Timestamps: local wall-clock "YYYY-MM-DD HH:MM:SS" (no T, no offset)
 *  - Timezone column: "UTC±HH:MM" (non-standard, offset parsed separately)
 *  - Encoding may include a BOM (utf-8-sig); booleans are lowercase true/false
 *  - Rows are newest-first; the newest cycle row is always incomplete
 *  - Headers drift across app versions -> normalized before matching
 */

'use strict';

// ---------------------------------------------------------------------------
// CSV parsing (BOM-tolerant, quote-aware)
// ---------------------------------------------------------------------------

function stripBom(text) {
  return text.charCodeAt(0) === 0xFEFF ? text.slice(1) : text;
}

function parseCsv(text) {
  text = stripBom(String(text || '')).replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const rows = [];
  let row = [], field = '', inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(field); field = '';
    } else if (c === '\n') {
      row.push(field); field = '';
      if (row.length > 1 || row[0].trim() !== '') rows.push(row);
      row = [];
    } else field += c;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  if (!rows.length) return { headers: [], rows: [] };
  const headers = rows[0].map(h => h.trim());
  return { headers, rows: rows.slice(1).map(r => {
    const o = {};
    headers.forEach((h, idx) => { o[h] = (r[idx] ?? '').trim(); });
    return o;
  })};
}

// Normalize a header for version-drift-tolerant matching:
// lowercase, "%" -> "pct", drop parenthetical units, non-alnum -> "_"
function normHeader(h) {
  return String(h || '').toLowerCase()
    .replace(/%/g, 'pct')
    .replace(/\([^)]*\)/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function findCol(row, ...candidates) {
  const keys = Object.keys(row);
  const normMap = {};
  keys.forEach(k => { normMap[normHeader(k)] = k; });
  for (const c of candidates) {
    const n = normHeader(c);
    if (normMap[n]) return row[normMap[n]];
  }
  return '';
}

function num(v) {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  if (s === '' || s.toLowerCase() === 'null' || s.toLowerCase() === 'nan') return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function bool(v) {
  const s = String(v || '').trim().toLowerCase();
  if (['true', 'yes', '1', 'y'].includes(s)) return true;
  if (['false', 'no', '0', 'n'].includes(s)) return false;
  return null;
}

// "2026-07-13 00:12:45" -> "2026-07-13" (wall-clock date of the cycle)
function wallDate(ts) {
  const m = String(ts || '').match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : null;
}

// "UTC+02:00" -> +120 (minutes)
function tzOffsetMinutes(tz) {
  const m = String(tz || '').match(/UTC([+-])(\d{1,2}):(\d{2})/);
  if (!m) return null;
  const sign = m[1] === '+' ? 1 : -1;
  return sign * (parseInt(m[2], 10) * 60 + parseInt(m[3], 10));
}

// "2026-07-13 23:20:00" -> minutes since midnight (for workout-timing analysis)
function wallMinutes(ts) {
  const m = String(ts || '').match(/(\d{2}):(\d{2})(?::(\d{2}))?/);
  if (!m) return null;
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
}

// ---------------------------------------------------------------------------
// WHOOP export -> normalized daily records
// ---------------------------------------------------------------------------

function parseWhoopExport(files) {
  const warnings = [];
  const records = {}; // date -> record

  function getRecord(date, cycleStart) {
    // Keyed by full cycle start time: two cycles can share a wall-clock date
    // (e.g. sleep 00:12 -> 07:55, then next sleep onset 23:59 the same day)
    const key = cycleStart || date;
    if (!records[key]) {
      records[key] = {
        date, cycle_start: cycleStart || null, incomplete: false,
        timezone: null, recovery_score: null, resting_hr: null, hrv_ms: null,
        skin_temp_c: null, spo2_pct: null, day_strain: null, energy_kcal: null,
        max_hr: null, avg_hr: null,
        sleep: null, naps: [], workouts: [], journal: {}
      };
    }
    return records[key];
  }

  // ---- physiological_cycles.csv ----
  if (files.cycles) {
    const { headers, rows } = parseCsv(files.cycles);
    if (!headers.length) warnings.push('physiological_cycles.csv is empty or unreadable.');
    let matched = 0;
    for (const r of rows) {
      const cycleStart = findCol(r, 'Cycle start time', 'cycle start');
      const date = wallDate(cycleStart);
      if (!date) continue;
      matched++;
      const rec = getRecord(date, cycleStart);
      const cycleEnd = findCol(r, 'Cycle end time', 'cycle end');
      rec.incomplete = !cycleEnd;
      rec.timezone = findCol(r, 'Cycle timezone', 'cycle timezone') || rec.timezone;
      rec.recovery_score = num(findCol(r, 'Recovery score %', 'recovery score pct', 'recovery'));
      rec.resting_hr = num(findCol(r, 'Resting heart rate (bpm)', 'resting heart rate'));
      rec.hrv_ms = num(findCol(r, 'Heart rate variability (ms)', 'heart rate variability'));
      rec.skin_temp_c = num(findCol(r, 'Skin temp (celsius)', 'skin temp'));
      rec.spo2_pct = num(findCol(r, 'Blood oxygen %', 'blood oxygen pct', 'blood oxygen'));
      rec.day_strain = num(findCol(r, 'Day Strain', 'day strain'));
      rec.energy_kcal = num(findCol(r, 'Energy burned (cal)', 'energy burned'));
      rec.max_hr = num(findCol(r, 'Max HR (bpm)', 'max hr'));
      rec.avg_hr = num(findCol(r, 'Average HR (bpm)', 'average hr'));
      rec.sleep = {
        onset: findCol(r, 'Sleep onset') || null,
        wake: findCol(r, 'Wake onset', 'wake onset') || null,
        performance_pct: num(findCol(r, 'Sleep performance %', 'sleep performance pct')),
        resp_rate: num(findCol(r, 'Respiratory rate (rpm)', 'respiratory rate')),
        asleep_min: num(findCol(r, 'Asleep duration (min)', 'asleep duration')),
        in_bed_min: num(findCol(r, 'In bed duration (min)', 'in bed duration')),
        light_min: num(findCol(r, 'Light sleep duration (min)', 'light sleep duration')),
        deep_min: num(findCol(r, 'Deep (SWS) duration (min)', 'deep sws duration', 'deep sleep duration')),
        rem_min: num(findCol(r, 'REM duration (min)', 'rem duration')),
        awake_min: num(findCol(r, 'Awake duration (min)', 'awake duration')),
        need_min: num(findCol(r, 'Sleep need (min)', 'sleep need')),
        debt_min: num(findCol(r, 'Sleep debt (min)', 'sleep debt')),
        efficiency_pct: num(findCol(r, 'Sleep efficiency %', 'sleep efficiency pct')),
        consistency_pct: num(findCol(r, 'Sleep consistency %', 'sleep consistency pct')),
      };
    }
    if (!matched) warnings.push('physiological_cycles.csv: no rows with a valid Cycle start time.');
  }

  // ---- sleeps.csv (naps only — primary sleep already comes from cycles) ----
  if (files.sleeps) {
    const { headers, rows } = parseCsv(files.sleeps);
    for (const r of rows) {
      const isNap = bool(findCol(r, 'Nap'));
      if (!isNap) continue;
      const cycleStart = findCol(r, 'Cycle start time', 'cycle start');
      const date = wallDate(cycleStart);
      if (!date || !records[cycleStart]) continue;
      records[cycleStart].naps.push({
        onset: findCol(r, 'Sleep onset') || null,
        wake: findCol(r, 'Wake onset', 'wake onset') || null,
        asleep_min: num(findCol(r, 'Asleep duration (min)', 'asleep duration')),
      });
    }
    if (headers.length === 0) warnings.push('sleeps.csv is empty or unreadable.');
  }

  // ---- workouts.csv ----
  if (files.workouts) {
    const { headers, rows } = parseCsv(files.workouts);
    for (const r of rows) {
      const cycleStart = findCol(r, 'Cycle start time', 'cycle start');
      const date = wallDate(cycleStart);
      if (!date || !records[cycleStart]) continue;
      const zones = [1, 2, 3, 4, 5].map(z => num(findCol(r, `HR Zone ${z} %`, `hr zone ${z} pct`)));
      records[cycleStart].workouts.push({
        start: findCol(r, 'Workout start time', 'workout start') || null,
        end: findCol(r, 'Workout end time', 'workout end') || null,
        duration_min: num(findCol(r, 'Duration (min)', 'duration')),
        activity: findCol(r, 'Activity name', 'activity') || 'Activity',
        strain: num(findCol(r, 'Activity Strain', 'activity strain')),
        energy_kcal: num(findCol(r, 'Energy burned (cal)', 'energy burned')),
        max_hr: num(findCol(r, 'Max HR (bpm)', 'max hr')),
        avg_hr: num(findCol(r, 'Average HR (bpm)', 'average hr')),
        zones, gps: bool(findCol(r, 'GPS enabled', 'gps enabled')),
      });
    }
    if (headers.length === 0) warnings.push('workouts.csv is empty or unreadable.');
  }

  // ---- journal_entries.csv (long format: one row per cycle x question) ----
  const journalQuestions = new Set();
  if (files.journals) {
    const { headers, rows } = parseCsv(files.journals);
    for (const r of rows) {
      const cycleStart = findCol(r, 'Cycle start time', 'cycle start');
      const date = wallDate(cycleStart);
      const question = findCol(r, 'Question text', 'question');
      if (!date || !question || !records[cycleStart]) continue;
      const q = question.trim();
      journalQuestions.add(q);
      const answered = bool(findCol(r, 'Answered yes', 'answered yes'));
      const notes = findCol(r, 'Notes', 'notes');
      records[cycleStart].journal[q] = answered === null
        ? (notes ? { text: notes } : null)
        : { yes: answered, notes: notes || null };
    }
    if (headers.length === 0) warnings.push('journal_entries.csv is empty or unreadable.');
  }

  const list = Object.values(records).sort((a, b) => String(a.cycle_start).localeCompare(String(b.cycle_start)));
  return { records: list, warnings, journalQuestions: [...journalQuestions] };
}

// ---------------------------------------------------------------------------
// Hidden-habit analytics
// ---------------------------------------------------------------------------

function avg(nums) {
  const v = nums.filter(n => n !== null && n !== undefined && Number.isFinite(n));
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
}
function round1(n) { return n === null ? null : Math.round(n * 10) / 10; }

// Least-squares slope of y over the last n points (for trend detection)
function slope(values) {
  const v = values.filter(n => Number.isFinite(n));
  if (v.length < 3) return null;
  const n = v.length, xs = v.map((_, i) => i);
  const mx = (n - 1) / 2, my = v.reduce((a, b) => a + b, 0) / n;
  let num = 0, den = 0;
  for (let i = 0; i < n; i++) { num += (xs[i] - mx) * (v[i] - my); den += (xs[i] - mx) ** 2; }
  return den ? num / den : null;
}

const METRICS = [
  { key: 'recovery_score', label: 'Recovery', unit: '%', better: 'high', get: r => r.recovery_score },
  { key: 'hrv_ms', label: 'HRV', unit: 'ms', better: 'high', get: r => r.hrv_ms },
  { key: 'resting_hr', label: 'Resting HR', unit: 'bpm', better: 'low', get: r => r.resting_hr },
  { key: 'deep_min', label: 'Deep sleep', unit: 'min', better: 'high', get: r => r.sleep?.deep_min ?? null },
  { key: 'efficiency_pct', label: 'Sleep efficiency', unit: '%', better: 'high', get: r => r.sleep?.efficiency_pct ?? null },
  { key: 'rem_min', label: 'REM sleep', unit: 'min', better: 'high', get: r => r.sleep?.rem_min ?? null },
];

function analyzeDeepInsights(records) {
  const usable = records.filter(r => !r.incomplete || r.recovery_score !== null);
  const n = usable.length;
  const insights = [];
  const habitImpacts = [];

  const A = (fn) => round1(avg(usable.map(fn)));

  const summary = {
    record_count: n,
    date_from: n ? usable[0].date : null,
    date_to: n ? usable[n - 1].date : null,
    avg_recovery: A(r => r.recovery_score),
    avg_hrv: A(r => r.hrv_ms),
    avg_rhr: A(r => r.resting_hr),
    avg_strain: A(r => r.day_strain),
    avg_asleep_min: A(r => r.sleep?.asleep_min ?? null),
    avg_deep_min: A(r => r.sleep?.deep_min ?? null),
    avg_rem_min: A(r => r.sleep?.rem_min ?? null),
    avg_efficiency: A(r => r.sleep?.efficiency_pct ?? null),
    avg_debt_min: A(r => r.sleep?.debt_min ?? null),
    avg_consistency: A(r => r.sleep?.consistency_pct ?? null),
    workout_days: usable.filter(r => r.workouts.length > 0).length,
    nap_count: usable.reduce((a, r) => a + r.naps.length, 0),
  };

  // ---- 1. Journal habit impacts (with/without deltas) ----
  const questions = new Set();
  usable.forEach(r => Object.keys(r.journal).forEach(q => questions.add(q)));
  for (const q of questions) {
    const yes = usable.filter(r => r.journal[q]?.yes === true);
    const no = usable.filter(r => r.journal[q]?.yes === false);
    if (yes.length < 4 || no.length < 4) continue;
    const deltas = {};
    let sigCount = 0;
    for (const m of METRICS) {
      const yAvg = avg(yes.map(m.get)), nAvg = avg(no.map(m.get));
      if (yAvg === null || nAvg === null) { deltas[m.key] = null; continue; }
      const d = round1(yAvg - nAvg);
      deltas[m.key] = d;
      // meaningful if the shift is >= ~8% of a typical range
      const scale = { recovery_score: 100, hrv_ms: 60, resting_hr: 15, deep_min: 90, efficiency_pct: 100, rem_min: 90 }[m.key];
      if (Math.abs(d) >= scale * 0.08) sigCount++;
    }
    const direction = (deltas.recovery_score ?? 0) >= 0 ? 'positive' : 'negative';
    habitImpacts.push({
      question: q, n_yes: yes.length, n_no: no.length,
      deltas, direction, significant: sigCount >= 2,
    });
  }
  habitImpacts.sort((a, b) =>
    (b.significant - a.significant) ||
    Math.abs(b.deltas.recovery_score ?? 0) - Math.abs(a.deltas.recovery_score ?? 0));

  // ---- 2. Sleep debt & consistency ----
  if (summary.avg_debt_min !== null && summary.avg_debt_min > 45) {
    insights.push({
      icon: '😴', severity: 'high', title: 'Chronic sleep debt',
      detail: `You're carrying an average sleep debt of ${Math.round(summary.avg_debt_min)} minutes. Debt above ~45 min measurably suppresses HRV and next-day recovery — repaying it is the single highest-leverage change in your data.`,
    });
  }
  if (summary.avg_consistency !== null && summary.avg_consistency < 70) {
    insights.push({
      icon: '🕰️', severity: 'medium', title: 'Irregular sleep schedule',
      detail: `Sleep consistency is ${Math.round(summary.avg_consistency)}%. Shifting bedtime by more than ~1 hour day-to-day fragments deep sleep even when total hours look fine. Anchoring a fixed wake time is the fastest fix.`,
    });
  }
  const eff = summary.avg_efficiency;
  if (eff !== null && eff < 85) {
    insights.push({
      icon: '🛏️', severity: 'medium', title: 'Low sleep efficiency',
      detail: `Sleep efficiency averages ${Math.round(eff)}% (target 85%+). Time awake in bed points to late caffeine, alcohol, or an over-warm room — your journal answers can confirm which.`,
    });
  }

  // ---- 3. Trends (last 14 days) ----
  const tail = usable.slice(-14);
  const hrvSlope = slope(tail.map(r => r.hrv_ms));
  const rhrSlope = slope(tail.map(r => r.resting_hr));
  const debtSlope = slope(tail.map(r => r.sleep?.debt_min ?? null));
  const trends = {
    hrv_slope: hrvSlope !== null ? round1(hrvSlope) : null,
    rhr_slope: rhrSlope !== null ? round1(rhrSlope) : null,
    debt_slope: debtSlope !== null ? round1(debtSlope) : null,
  };
  if (hrvSlope !== null && hrvSlope < -0.8) {
    insights.push({
      icon: '📉', severity: 'high', title: 'HRV trending down',
      detail: `HRV is falling ~${Math.abs(round1(hrvSlope))} ms per day over the last two weeks. Sustained drops like this usually mean accumulated strain, illness onset, or chronic under-sleeping — ease off intensity until it stabilizes.`,
    });
  } else if (hrvSlope !== null && hrvSlope > 0.8) {
    insights.push({
      icon: '📈', severity: 'low', title: 'HRV trending up',
      detail: `HRV is climbing ~${round1(hrvSlope)} ms per day — your aerobic base and recovery habits are compounding. Great time to layer in a harder training block.`,
    });
  }
  if (rhrSlope !== null && rhrSlope > 0.25) {
    insights.push({
      icon: '❤️', severity: 'medium', title: 'Resting HR creeping up',
      detail: `Resting heart rate is rising ~${round1(rhrSlope)} bpm per day over two weeks. Often the first signal of overreaching, poor sleep, or coming illness — before you feel it.`,
    });
  }

  // ---- 4. Late-workout effect (hidden pattern) ----
  const lateDays = [], earlyDays = [];
  usable.forEach(r => {
    const late = r.workouts.some(w => { const m = wallMinutes(w.end || w.start); return m !== null && m >= 21 * 60; });
    if (!r.workouts.length) return;
    (late ? lateDays : earlyDays).push(r);
  });
  if (lateDays.length >= 4 && earlyDays.length >= 4) {
    const lateRhr = avg(lateDays.map(r => r.resting_hr)), earlyRhr = avg(earlyDays.map(r => r.resting_hr));
    const lateHrv = avg(lateDays.map(r => r.hrv_ms)), earlyHrv = avg(earlyDays.map(r => r.hrv_ms));
    if (lateRhr !== null && earlyRhr !== null && lateRhr - earlyRhr >= 2) {
      insights.push({
        icon: '🌙', severity: 'medium', title: 'Late workouts cost you recovery',
        detail: `On nights after workouts ending past 9 PM, your resting HR runs ${round1(lateRhr - earlyRhr)} bpm higher (${lateDays.length} late vs ${earlyDays.length} earlier sessions). Evening intensity delays parasympathetic rebound — move hard sessions earlier when you can.`,
      });
    } else if (lateHrv !== null && earlyHrv !== null && earlyHrv - lateHrv >= 5) {
      insights.push({
        icon: '🌙', severity: 'medium', title: 'Late workouts blunt HRV',
        detail: `HRV averages ${round1(earlyHrv - lateHrv)} ms lower after workouts ending past 9 PM. Your nervous system needs ~3 hours to downshift — finish training by early evening on key recovery nights.`,
      });
    }
  }

  // ---- 5. Strain / recovery mismatch ----
  const highStrainLowRec = usable.filter(r =>
    r.day_strain !== null && r.day_strain >= 16 && r.recovery_score !== null && r.recovery_score < 40);
  if (highStrainLowRec.length >= 3) {
    insights.push({
      icon: '⚠️', severity: 'high', title: 'Training through red recoveries',
      detail: `${highStrainLowRec.length} days paired 16+ strain with sub-40% recovery. Stacking hard efforts on depleted days is how overtraining starts — on red mornings, cap strain under 12 and let HRV rebound.`,
    });
  }

  // ---- 6. Deep / REM deficits ----
  if (summary.avg_deep_min !== null && summary.avg_asleep_min) {
    const deepPct = (summary.avg_deep_min / summary.avg_asleep_min) * 100;
    if (deepPct < 13) {
      insights.push({
        icon: '🌊', severity: 'medium', title: 'Light on deep sleep',
        detail: `Deep sleep is only ${round1(deepPct)}% of your night (13–23% is typical). Deep sleep drives growth-hormone release and physical restoration — cooler room, consistent bedtime, and daytime Zone 2 work all expand it.`,
      });
    }
  }
  if (summary.avg_rem_min !== null && summary.avg_asleep_min) {
    const remPct = (summary.avg_rem_min / summary.avg_asleep_min) * 100;
    if (remPct < 18) {
      insights.push({
        icon: '💭', severity: 'low', title: 'REM running low',
        detail: `REM is ${round1(remPct)}% of sleep (20–25% typical). Alcohol and late-night screen stress fragment REM most — if your journal tracks either, the habit table above will show the link.`,
      });
    }
  }

  // ---- 7. Caffeine / alcohol keyword scan in journal ----
  const qLower = [...questions].map(q => q.toLowerCase());
  const hasCaffeineQ = qLower.some(q => q.includes('caffein') || q.includes('coffee'));
  const hasAlcoholQ = qLower.some(q => q.includes('alcohol') || q.includes('drink'));
  if (!hasCaffeineQ) {
    insights.push({
      icon: '☕', severity: 'low', title: 'Blind spot: caffeine timing',
      detail: `Your journal doesn't track caffeine. Late caffeine is one of the strongest hidden suppressors of deep sleep — adding "No caffeine after 12 PM" to your WHOOP journal for 2 weeks would let this engine quantify its effect on you.`,
    });
  }
  if (!hasAlcoholQ) {
    insights.push({
      icon: '🍷', severity: 'low', title: 'Blind spot: alcohol',
      detail: `Your journal doesn't track alcohol. Even 1–2 drinks measurably fragment REM and elevate resting HR — tracking it would unlock a precise personal impact score here.`,
    });
  }

  // ---- 8. Best / worst recovery weekdays ----
  const byDow = {};
  usable.forEach(r => {
    if (r.recovery_score === null) return;
    const dow = new Date(r.date + 'T12:00:00').getDay();
    (byDow[dow] = byDow[dow] || []).push(r.recovery_score);
  });
  const dowAvg = Object.entries(byDow).map(([d, v]) => ({ dow: +d, avg: avg(v), n: v.length }))
    .filter(x => x.n >= 3);
  if (dowAvg.length >= 4) {
    dowAvg.sort((a, b) => b.avg - a.avg);
    const names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const best = dowAvg[0], worst = dowAvg[dowAvg.length - 1];
    if (best.avg - worst.avg >= 8) {
      insights.push({
        icon: '📅', severity: 'low', title: `${names[best.dow]}s recharge you, ${names[worst.dow]}s drain you`,
        detail: `Average recovery peaks on ${names[best.dow]} (${Math.round(best.avg)}%) and bottoms on ${names[worst.dow]} (${Math.round(worst.avg)}%). Your week has a rhythm — schedule hard training after your high-recovery days.`,
      });
    }
  }

  return { summary, habitImpacts, insights, trends };
}


// ---------------------------------------------------------------------------
// 12-week goal roadmaps (VO2 max / sleep / strength)
// ---------------------------------------------------------------------------

const GOALS = {
  vo2max: {
    title: 'VO2 Max Engine',
    unit: 'mL/kg/min',
    intro: 'A polarized 12-week build: aerobic base first, then high-intensity intervals, then a peak test week. Expect +8–15% VO2 max for most trained beginners.',
  },
  sleep: {
    title: 'Sleep Architecture Rebuild',
    unit: 'sleep score',
    intro: 'Fix schedule first, then depth, then REM. Sleep is the foundation every other adaptation is built on — this comes before harder training.',
  },
  strength: {
    title: 'Strength & Hypertrophy Base',
    unit: 'strength',
    intro: 'Progressive overload with recovery-gated intensity. Muscle is built in the gym but grown during sleep — the plan ties both together.',
  },
};

function phase(weeks, title, focus, actions, measure, outcome) {
  return { weeks, title, focus, actions, measure, outcome };
}

function buildRoadmap(goal, analysis, body) {
  const g = GOALS[goal] ? goal : 'vo2max';
  const s = analysis.summary;
  const maxHr = body?.max_heart_rate || 190;
  const z2lo = Math.round(maxHr * 0.60), z2hi = Math.round(maxHr * 0.70);
  const hi = Math.round(maxHr * 0.90), hiTop = Math.round(maxHr * 0.95);
  const weightKg = body?.weight_kilogram || null;

  // Personalize from the analysis
  const weakRecovery = s.avg_recovery !== null && s.avg_recovery < 55;
  const bigDebt = s.avg_debt_min !== null && s.avg_debt_min > 45;
  const lowConsistency = s.avg_consistency !== null && s.avg_consistency < 70;
  const topBadHabit = (analysis.habitImpacts || []).find(h => h.direction === 'negative' && h.significant);

  const sleepFix = [];
  if (bigDebt) sleepFix.push('Repay sleep debt first: add 30–60 min/night until debt < 30 min');
  if (lowConsistency) sleepFix.push('Anchor a fixed wake time (±30 min), even on weekends');
  sleepFix.push('No caffeine after 12:00 PM; dim lights 1h before bed');

  let phases;
  if (g === 'vo2max') {
    phases = [
      phase('Weeks 1–4', 'Aerobic Base', 'Build mitochondrial density with easy volume.',
        [
          `3–4x/week Zone 2 cardio, 40–60 min at ${z2lo}–${z2hi} bpm (conversational pace)`,
          '1x/week easy long session, 75–90 min, same zone',
          'Cap all other training at strain 14 — base phase is not the time to redline',
          ...(weakRecovery ? ['Extra rest day weekly until avg recovery > 55%'] : []),
        ],
        'Resting HR trend + HRV 7-day average',
        'RHR drops 2–4 bpm; HRV baseline lifts; you can hold a conversation at pace that used to wind you.'),
      phase('Weeks 5–8', 'Threshold Build', 'Add intensity on top of the base.',
        [
          `1x/week Norwegian 4x4: 4 min at ${hi}–${hiTop} bpm × 4, 3 min easy between`,
          `2–3x/week Zone 2 maintenance (${z2lo}–${z2hi} bpm), 45 min`,
          '1x/week tempo: 20 min comfortably hard (85–88% HRmax)',
          'Never stack the 4x4 the day after a sub-40% recovery',
        ],
        'Estimated VO2 max (Uth–Sørensen from HR ratio) every 2 weeks',
        'VO2 max estimate up 5–8%; 4x4 feels hard but repeatable.'),
      phase('Weeks 9–12', 'Peak & Test', 'Sharpen, then measure.',
        [
          'Weeks 9–10: keep 4x4 + one tempo; trim Zone 2 to 2x/week',
          'Week 11: deload — halve interval volume, keep easy movement',
          'Week 12: test week — rested 5K time trial or lab-style estimate',
          'Log the result; it becomes the baseline for the next cycle',
        ],
        'Time-trial result + recovery the morning after',
        'Target: +8–15% VO2 max vs week 1. If HRV stayed stable, the gain is real fitness, not fatigue.'),
    ];
  } else if (g === 'sleep') {
    phases = [
      phase('Weeks 1–4', 'Schedule Anchor', 'Make sleep regular before making it deep.',
        [
          ...sleepFix,
          'Morning daylight within 30 min of waking (anchors circadian rhythm)',
          'No screens in bed — charge the phone outside the bedroom',
        ],
        'Sleep consistency % (target 80%+) and sleep debt trend',
        'Consistency > 80%; debt falling; wake-ups feel less groggy.'),
      phase('Weeks 5–8', 'Depth Engineering', 'Expand deep (SWS) sleep.',
        [
          'Bedroom 18–19°C; hot shower 90 min before bed (triggers core temp drop)',
          'Finish training 3+ hours before bed; hard days → easier evenings',
          ...(topBadHabit ? [`Cut back on "${topBadHabit.question}" — your data links it to worse recovery`] : []),
          'Magnesium glycinate 200–400 mg 1h before bed (if tolerated)',
        ],
        'Deep sleep minutes + sleep efficiency %',
        'Deep sleep share climbing toward 15%+; fewer night wakings.'),
      phase('Weeks 9–12', 'REM & Resilience', 'Protect the second half of the night.',
        [
          'Alcohol: none within 3h of bed (it selectively destroys REM)',
          'Keep wake time fixed even after late nights — no 2h lie-ins',
          'Add 10-min evening wind-down: breathwork, reading, or NSDR',
          'Review: compare weeks 9–12 averages to weeks 1–4',
        ],
        'REM minutes, HRV, and morning recovery score',
        'REM 20%+, HRV at a new higher baseline — sleep is now a performance asset.'),
    ];
  } else {
    const protein = weightKg ? `${Math.round(weightKg * 1.8)}–${Math.round(weightKg * 2.2)}g` : '1.8–2.2g/kg';
    phases = [
      phase('Weeks 1–4', 'Movement Quality', 'Groove technique and work capacity.',
        [
          '3x/week full-body: squat, hinge, push, pull, carry — 3 sets of 8–12, 2 reps from failure',
          `Protein ${protein}/day, spread over 3–4 meals`,
          'Walk 8–10k steps daily; sleep 7.5h+ (muscle protein synthesis peaks in deep sleep)',
        ],
        'Training log: reps × load trending up; recovery staying > 50%',
        'All lifts up 5–10%; no nagging joint pain; sleep holding steady.'),
      phase('Weeks 5–8', 'Progressive Overload', 'Add load systematically.',
        [
          '4x/week upper/lower split; add 2.5–5% load when you hit top of rep range',
          '1x/week Zone 2 cardio 30–40 min (supports recovery, doesn’t blunt gains at this dose)',
          `Keep protein at ${protein}/day; slight surplus (+200 kcal) if gaining`,
          'Deload automatically any week avg recovery < 45%: cut volume 40%',
        ],
        'Estimated 1RM per lift + bodyweight trend + HRV',
        'Strength up 10–15% on main lifts; HRV stable = recovering enough to adapt.'),
      phase('Weeks 9–12', 'Peak & Consolidate', 'Realize the gains.',
        [
          'Weeks 9–10: push top sets; introduce one heavy single/double per lift weekly',
          'Week 11: deload to 60% volume — supercompensation happens here',
          'Week 12: test 1RM or 5RM on main lifts; take progress photos/measurements',
          'Decide next block: continue building or shift to fat-loss phase',
        ],
        'Test-day numbers + 12-week strength curve',
        'Target: +15–25% on main lifts vs week 1, with recovery and sleep intact.'),
    ];
  }

  return {
    goal: g,
    title: GOALS[g].title,
    intro: GOALS[g].intro,
    personalized_notes: [
      ...(weakRecovery ? ['Your average recovery is under 55% — every phase starts easier than textbook plans. Earn intensity.'] : []),
      ...(topBadHabit ? [`Your #1 recovery drag is "${topBadHabit.question}" — the roadmap assumes you cut it in phase 1.`] : []),
    ],
    phases,
    disclaimer: 'Training guidance for healthy adults, not medical advice. Stop and consult a professional if you feel pain, dizziness, or unusual fatigue.',
  };
}

module.exports = { parseCsv, parseWhoopExport, analyzeDeepInsights, buildRoadmap, GOALS };
