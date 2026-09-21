// WHOOP Performance & Hypertrophy Engine - Client Application Logic

const CIRCLE_CIRCUMFERENCE = 414.69; // 2 * Math.PI * 66

let state = {
  selectedDate: new Date().toISOString().split('T')[0],
  currentTab: 'overview',
  currentGoal: 'gain',
  auth: { connected: false, user: null, has_data: false },
  data: { latest: null, history: [] },
  habits: [],
  dailyLogs: {},
  correlations: null,
  hypertrophy: null,
  charts: {}
};

// -------------------------------------------------------------
// Initialization
// -------------------------------------------------------------
document.addEventListener('DOMContentLoaded', async () => {
  initEventListeners();
  checkQueryParams();
  await loadAuthStatus();
  await loadDashboardData();
  await loadHabitsAndLogs();
  await loadCorrelations();
  await loadHypertrophyData();
});

function checkQueryParams() {
  const urlParams = new URLSearchParams(window.location.search);
  const connected = urlParams.get('connected');
  const authError = urlParams.get('auth_error');

  const banner = document.getElementById('alert-banner');
  const message = document.getElementById('alert-message');

  if (connected) {
    banner.classList.remove('hidden');
    banner.style.borderColor = 'rgba(0, 240, 118, 0.4)';
    banner.style.background = 'rgba(0, 240, 118, 0.15)';
    message.textContent = 'Successfully connected to WHOOP. Live biometrics have been synced.';
    window.history.replaceState({}, document.title, window.location.pathname);
  } else if (authError) {
    banner.classList.remove('hidden');
    banner.style.borderColor = 'rgba(255, 59, 48, 0.4)';
    banner.style.background = 'rgba(255, 59, 48, 0.15)';
    message.textContent = `WHOOP Authentication Error: ${authError}`;
    window.history.replaceState({}, document.title, window.location.pathname);
  }
}

function initEventListeners() {
  // Tab Navigation (supports both .nav-tab and .nav-tab-pill)
  const tabs = document.querySelectorAll('.nav-tab, .nav-tab-pill');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const targetTab = tab.getAttribute('data-tab');
      switchTab(targetTab);
    });
  });

  // Date Selector
  const dateInput = document.getElementById('date-selector');
  dateInput.value = state.selectedDate;
  dateInput.addEventListener('change', async (e) => {
    state.selectedDate = e.target.value;
    updateDateDisplay();
    await loadHabitsAndLogs();
    await loadHypertrophyData();
    updateAllViews();
  });

  // Action Buttons
  document.getElementById('btn-connect').addEventListener('click', () => {
    window.location.href = '/api/auth/login';
  });

  document.getElementById('btn-sync').addEventListener('click', async () => {
    await syncWhoopData();
  });

  document.getElementById('btn-demo').addEventListener('click', async () => {
    await populateDemoData();
  });

  const btnDismissAlert = document.getElementById('btn-dismiss-alert');
  if (btnDismissAlert) {
    btnDismissAlert.addEventListener('click', () => {
      document.getElementById('alert-banner').classList.add('hidden');
    });
  }

  // Quick Action Tiles and Direct Navigation
  const btnGotoProtocol = document.getElementById('btn-goto-protocol-card');
  if (btnGotoProtocol) {
    btnGotoProtocol.addEventListener('click', () => switchTab('recovery'));
  }

  const btnGotoSleep = document.getElementById('btn-goto-sleep-card');
  if (btnGotoSleep) {
    btnGotoSleep.addEventListener('click', () => switchTab('sleep'));
  }

  // Additional Cards Click Handlers (VO2 Max and Metabolism)
  const btnGotoVo2 = document.getElementById('btn-goto-vo2-card');
  if (btnGotoVo2) {
    btnGotoVo2.addEventListener('click', () => {
      switchTab('hypertrophy');
      const vo2Card = document.getElementById('vo2-max-val');
      if (vo2Card) vo2Card.scrollIntoView({ behavior: 'smooth' });
    });
  }

  const btnGotoHyp = document.getElementById('btn-goto-hyp-card');
  if (btnGotoHyp) {
    btnGotoHyp.addEventListener('click', () => switchTab('hypertrophy'));
  }

  const btnTileRecovery = document.getElementById('btn-tile-recovery');
  if (btnTileRecovery) {
    btnTileRecovery.addEventListener('click', () => switchTab('recovery'));
  }

  const btnTileHypertrophy = document.getElementById('btn-tile-hypertrophy');
  if (btnTileHypertrophy) {
    btnTileHypertrophy.addEventListener('click', () => switchTab('hypertrophy'));
  }

  const btnTileVo2 = document.getElementById('btn-tile-vo2');
  if (btnTileVo2) {
    btnTileVo2.addEventListener('click', () => {
      switchTab('hypertrophy');
      const vo2Card = document.getElementById('vo2-max-val');
      if (vo2Card) vo2Card.scrollIntoView({ behavior: 'smooth' });
    });
  }

  const btnTileSleep = document.getElementById('btn-tile-sleep');
  if (btnTileSleep) {
    btnTileSleep.addEventListener('click', () => switchTab('sleep'));
  }

  // Assistant Prompt Bar Handler
  const assistantInput = document.getElementById('assistant-input-click');
  if (assistantInput) {
    assistantInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const query = assistantInput.value.toLowerCase().trim();
        if (!query) return;

        if (query.includes('sleep') || query.includes('rem') || query.includes('sws')) {
          switchTab('sleep');
        } else if (query.includes('recovery') || query.includes('hrv') || query.includes('rhr')) {
          switchTab('recovery');
        } else if (query.includes('muscle') || query.includes('gain') || query.includes('protein') || query.includes('hypertrophy') || query.includes('calorie') || query.includes('eat')) {
          switchTab('hypertrophy');
        } else if (query.includes('strain') || query.includes('workout') || query.includes('exercise')) {
          switchTab('workouts');
        } else if (query.includes('habit') || query.includes('routine')) {
          switchTab('habits');
        } else if (query.includes('vo2')) {
          switchTab('hypertrophy');
          const vo2Card = document.getElementById('vo2-max-val');
          if (vo2Card) vo2Card.scrollIntoView({ behavior: 'smooth' });
        }
        assistantInput.value = '';
      }
    });
  }

  // Modal Handlers
  const modal = document.getElementById('modal-add-habit');
  const openModal = () => modal.classList.remove('hidden');
  const closeModal = () => modal.classList.add('hidden');

  const btnAddHabit = document.getElementById('btn-add-habit');
  if (btnAddHabit) btnAddHabit.addEventListener('click', openModal);
  const btnAddTab = document.getElementById('btn-add-habit-tab');
  if (btnAddTab) btnAddTab.addEventListener('click', openModal);

  const btnCloseModal = document.getElementById('btn-close-modal');
  if (btnCloseModal) btnCloseModal.addEventListener('click', closeModal);
  const btnCancelModal = document.getElementById('btn-cancel-modal');
  if (btnCancelModal) btnCancelModal.addEventListener('click', closeModal);

  const formAddHabit = document.getElementById('form-add-habit');
  if (formAddHabit) {
    formAddHabit.addEventListener('submit', async (e) => {
      e.preventDefault();
      await createCustomHabit();
    });
  }

  // Nutrition Form Handler
  const formNutrition = document.getElementById('form-log-nutrition');
  if (formNutrition) {
    formNutrition.addEventListener('submit', async (e) => {
      e.preventDefault();
      await logDailyNutrition();
    });
  }

  // Goal Switcher Handlers (Muscle Gain vs Fat Loss)
  const btnGoalGain = document.getElementById('btn-goal-gain');
  const btnGoalLoss = document.getElementById('btn-goal-loss');
  if (btnGoalGain && btnGoalLoss) {
    btnGoalGain.addEventListener('click', async () => {
      if (state.currentGoal === 'gain') return;
      state.currentGoal = 'gain';
      btnGoalGain.classList.add('active');
      btnGoalLoss.classList.remove('active');
      await loadHypertrophyData();
    });

    btnGoalLoss.addEventListener('click', async () => {
      if (state.currentGoal === 'loss') return;
      state.currentGoal = 'loss';
      btnGoalLoss.classList.add('active');
      btnGoalGain.classList.remove('active');
      await loadHypertrophyData();
    });
  }
}

function switchTab(tabId) {
  state.currentTab = tabId;

  document.querySelectorAll('.nav-tab, .nav-tab-pill').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));

  const activeTabBtn = document.getElementById(`tab-btn-${tabId}`);
  const activePane = document.getElementById(`pane-${tabId}`);

  if (activeTabBtn) activeTabBtn.classList.add('active');
  if (activePane) activePane.classList.add('active');

  // Trigger chart resize / update for newly visible tab
  setTimeout(() => {
    renderAllCharts();
  }, 50);
}

function updateDateDisplay() {
  const label = document.getElementById('habit-selected-date-label');
  const todayStr = new Date().toISOString().split('T')[0];
  if (label) {
    if (state.selectedDate === todayStr) {
      label.textContent = 'Today';
    } else {
      label.textContent = state.selectedDate;
    }
  }
}

// -------------------------------------------------------------
// API Calls & Data Loading
// -------------------------------------------------------------

async function loadAuthStatus() {
  try {
    const res = await fetch('/api/auth/status');
    const auth = await res.json();
    state.auth = auth;

    const pill = document.getElementById('connection-status-pill');
    const text = document.getElementById('connection-status-text');
    const btnConnect = document.getElementById('btn-connect');

    if (auth.connected) {
      pill.className = 'status-pill status-connected';
      text.textContent = auth.user ? (auth.user.first_name || 'Connected') : 'Connected';
      btnConnect.textContent = 'WHOOP Linked';
      btnConnect.style.background = 'rgba(0, 240, 118, 0.15)';
      btnConnect.style.color = '#00F076';
      btnConnect.style.border = '1px solid rgba(0, 240, 118, 0.3)';
    } else if (auth.has_data) {
      pill.className = 'status-pill status-demo';
      text.textContent = 'Demo Mode';
    } else {
      pill.className = 'status-pill status-disconnected';
      text.textContent = 'Disconnected';
    }

    if (auth.latest_date && !state.selectedDate) {
      state.selectedDate = auth.latest_date;
      document.getElementById('date-selector').value = auth.latest_date;
      updateDateDisplay();
    }
  } catch (err) {
    console.error('Error fetching auth status:', err);
  }
}

async function loadDashboardData() {
  try {
    const res = await fetch('/api/data');
    const data = await res.json();
    state.data = data;

    if (data.history.length > 0) {
      const latestDate = data.history[data.history.length - 1].date;
      if (!document.getElementById('date-selector').value || document.getElementById('date-selector').value === new Date().toISOString().split('T')[0]) {
        state.selectedDate = latestDate;
        document.getElementById('date-selector').value = latestDate;
        updateDateDisplay();
      }
    }

    updateAllViews();
  } catch (err) {
    console.error('Error loading dashboard data:', err);
  }
}

async function loadHabitsAndLogs() {
  try {
    const res = await fetch(`/api/habits?date=${state.selectedDate}`);
    const data = await res.json();
    state.habits = data.habits || [];
    state.dailyLogs = data.daily_logs || {};
    renderHabitCards();
  } catch (err) {
    console.error('Error loading habits:', err);
  }
}

async function loadCorrelations() {
  try {
    const res = await fetch('/api/correlations');
    const data = await res.json();
    state.correlations = data;
    renderCoachRecommendation(data.recommendation);
    renderInsights(data.insights);
    renderImpactTable(data.correlations);
  } catch (err) {
    console.error('Error loading correlations:', err);
  }
}

async function loadHypertrophyData() {
  try {
    const goal = state.currentGoal || 'gain';
    const res = await fetch(`/api/hypertrophy?date=${state.selectedDate}&goal=${goal}`);
    const data = await res.json();
    state.hypertrophy = data;
    renderHypertrophyLab(data);
  } catch (err) {
    console.error('Error loading hypertrophy data:', err);
  }
}

async function syncWhoopData() {
  const btn = document.getElementById('btn-sync');
  const originalHtml = btn.innerHTML;
  btn.innerHTML = '<span>Syncing...</span>';
  btn.disabled = true;

  try {
    const res = await fetch('/api/whoop/sync', { method: 'POST' });
    const result = await res.json();
    if (res.ok) {
      await loadDashboardData();
      await loadCorrelations();
      await loadHypertrophyData();
      alert(`Synced ${result.synced_days} days of WHOOP data!`);
    } else {
      alert(`Sync failed: ${result.message || 'Check your WHOOP connection.'}`);
    }
  } catch (err) {
    alert(`Sync error: ${err.message}`);
  } finally {
    btn.innerHTML = originalHtml;
    btn.disabled = false;
  }
}

async function populateDemoData() {
  const btn = document.getElementById('btn-demo');
  btn.textContent = 'Loading 30d Data...';
  btn.disabled = true;

  try {
    const res = await fetch('/api/demo/populate', { method: 'POST' });
    if (res.ok) {
      await loadAuthStatus();
      await loadDashboardData();
      await loadHabitsAndLogs();
      await loadCorrelations();
      await loadHypertrophyData();
    }
  } catch (err) {
    console.error('Error loading demo data:', err);
  } finally {
    btn.textContent = 'Demo Mode';
    btn.disabled = false;
  }
}

async function createCustomHabit() {
  const name = document.getElementById('habit-name').value.trim();
  const icon = document.getElementById('habit-icon').value.trim() || '⚡';
  const category = document.getElementById('habit-category').value;
  const description = document.getElementById('habit-desc').value.trim();

  try {
    const res = await fetch('/api/habits/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, icon, category, description })
    });

    if (res.ok) {
      document.getElementById('modal-add-habit').classList.add('hidden');
      document.getElementById('form-add-habit').reset();
      await loadHabitsAndLogs();
      await loadCorrelations();
    }
  } catch (err) {
    console.error('Failed to create habit:', err);
  }
}

async function logDailyNutrition() {
  const calories = parseInt(document.getElementById('input-log-calories').value) || 0;
  const protein = parseInt(document.getElementById('input-log-protein').value) || 0;
  const carbs = parseInt(document.getElementById('input-log-carbs').value) || 0;
  const fats = parseInt(document.getElementById('input-log-fats').value) || 0;

  try {
    const res = await fetch('/api/hypertrophy/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date: state.selectedDate,
        calories_consumed: calories,
        protein_consumed: protein,
        carbs_consumed: carbs,
        fats_consumed: fats
      })
    });

    if (res.ok) {
      await loadHypertrophyData();
      alert('Nutrition logged successfully!');
    }
  } catch (err) {
    console.error('Error saving nutrition log:', err);
  }
}

// -------------------------------------------------------------
// View Updaters
// -------------------------------------------------------------

function updateAllViews() {
  const dayRecord = state.data.history.find(h => h.date === state.selectedDate) || state.data.latest;

  updateOverviewGauges(dayRecord);
  updateRecoveryLabView(dayRecord);
  updateSleepArchitectureView(dayRecord);
  updateStrainWorkoutsView(dayRecord);
  renderAllCharts();
}

function formatMinutesToHours(min) {
  if (min === null || min === undefined || isNaN(min)) return '--';
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return `${h}h ${m}m`;
}

// 1. Overview Gauges
function updateOverviewGauges(dayRecord) {
  const recValEl = document.getElementById('recovery-val');
  const recRingEl = document.getElementById('recovery-ring');
  const recBadgeEl = document.getElementById('recovery-state-badge');

  const strainValEl = document.getElementById('strain-val');
  const strainRingEl = document.getElementById('strain-ring');

  const sleepValEl = document.getElementById('sleep-val');
  const sleepRingEl = document.getElementById('sleep-ring');

  if (!dayRecord) {
    if (recValEl) recValEl.textContent = '--';
    if (strainValEl) strainValEl.textContent = '--';
    if (sleepValEl) sleepValEl.textContent = '--';
    if (recRingEl) setRingProgress(recRingEl, 0);
    if (strainRingEl) setRingProgress(strainRingEl, 0);
    if (sleepRingEl) setRingProgress(sleepRingEl, 0);
    return;
  }

  // Recovery
  const recovery = dayRecord.recovery || {};
  const score = recovery.score || 0;
  if (recValEl) recValEl.textContent = score;
  if (recRingEl) setRingProgress(recRingEl, score);

  const tierText = score >= 67 ? 'OPTIMAL' : score >= 34 ? 'ADEQUATE' : 'REDUCED';
  if (recRingEl && recBadgeEl) {
    if (score >= 67) {
      recRingEl.style.stroke = 'var(--whoop-green)';
      recBadgeEl.className = 'badge badge-green';
      recBadgeEl.textContent = 'OPTIMAL';
    } else if (score >= 34) {
      recRingEl.style.stroke = 'var(--whoop-yellow)';
      recBadgeEl.className = 'badge badge-yellow';
      recBadgeEl.textContent = 'ADEQUATE';
    } else {
      recRingEl.style.stroke = 'var(--whoop-red)';
      recBadgeEl.className = 'badge badge-red';
      recBadgeEl.textContent = 'REDUCED';
    }
  }

  const hrvEl = document.getElementById('hrv-val');
  if (hrvEl) hrvEl.innerHTML = `${recovery.hrv_ms || '--'} <small>ms</small>`;
  const rhrEl = document.getElementById('rhr-val');
  if (rhrEl) rhrEl.innerHTML = `${recovery.resting_heart_rate || '--'} <small>bpm</small>`;
  const tempEl = document.getElementById('temp-val');
  if (tempEl) tempEl.innerHTML = `${recovery.skin_temp_c || '--'} <small>°C</small>`;
  const spo2El = document.getElementById('spo2-val');
  if (spo2El) spo2El.innerHTML = `${recovery.spo2 || '--'} <small>%</small>`;

  // Strain
  const strain = dayRecord.strain || {};
  const strainScore = strain.score || 0;
  if (strainValEl) strainValEl.textContent = strainScore;
  if (strainRingEl) setRingProgress(strainRingEl, (strainScore / 21) * 100);

  const calEl = document.getElementById('calories-val');
  if (calEl) calEl.innerHTML = `${strain.kilojoules || '--'} <small>kJ</small>`;
  const avgHrEl = document.getElementById('avg-hr-val');
  if (avgHrEl) avgHrEl.innerHTML = `${strain.average_heart_rate || '--'} <small>bpm</small>`;
  const maxHrEl = document.getElementById('max-hr-val');
  if (maxHrEl) maxHrEl.innerHTML = `${strain.max_heart_rate || '--'} <small>bpm</small>`;
  const workoutCountEl = document.getElementById('workout-count-val');
  if (workoutCountEl) workoutCountEl.textContent = dayRecord.workouts ? dayRecord.workouts.length : 0;

  // Sleep
  const sleep = dayRecord.sleep || {};
  const sleepScore = sleep.score || sleep.performance_percentage || 0;
  if (sleepValEl) sleepValEl.textContent = sleepScore;
  if (sleepRingEl) setRingProgress(sleepRingEl, sleepScore);

  // EXACT sleep duration format (e.g. 3h 46m)
  const sleepTimeEl = document.getElementById('sleep-time-val');
  if (sleepTimeEl) sleepTimeEl.textContent = formatMinutesToHours(sleep.total_asleep_min);
  const deepSleepEl = document.getElementById('deep-sleep-val');
  if (deepSleepEl) deepSleepEl.innerHTML = `${sleep.slow_wave_sleep_min || '--'} <small>m</small>`;
  const remSleepEl = document.getElementById('rem-sleep-val');
  if (remSleepEl) remSleepEl.innerHTML = `${sleep.rem_sleep_min || '--'} <small>m</small>`;
  const sleepEffEl = document.getElementById('sleep-eff-val');
  if (sleepEffEl) sleepEffEl.innerHTML = `${sleep.efficiency_percentage || '--'} <small>%</small>`;

  // -------------------------------------------------------------
  // Reference Layout (Resq.io Style) Elements Population
  // -------------------------------------------------------------

  // 1. Status Capsules in Hero Welcome
  const capRec = document.getElementById('cap-rec-val');
  if (capRec) capRec.textContent = `${score}%`;
  const capSleep = document.getElementById('cap-sleep-val');
  if (capSleep) capSleep.textContent = `${sleepScore}%`;
  const capStrain = document.getElementById('cap-strain-val');
  if (capStrain) capStrain.textContent = `${strainScore}`;
  const capHrv = document.getElementById('cap-hrv-val');
  if (capHrv) capHrv.textContent = `${recovery.hrv_ms || '--'}ms`;

  // 2. Top-Right Micro-Trend Stats
  const topHrv = document.getElementById('top-stat-hrv');
  if (topHrv) topHrv.textContent = `${recovery.hrv_ms || '--'}`;
  const topRhr = document.getElementById('top-stat-rhr');
  if (topRhr) topRhr.textContent = `${recovery.resting_heart_rate || '--'}`;
  const topSleep = document.getElementById('top-stat-sleep');
  if (topSleep) topSleep.textContent = formatMinutesToHours(sleep.total_asleep_min);

  // 3. Summary Box Card
  const sumBadge = document.getElementById('summary-badge-tier');
  if (sumBadge) {
    sumBadge.textContent = score >= 67 ? 'OPTIMAL' : score >= 34 ? 'MODERATE' : 'RESTRICTED';
    sumBadge.className = `badge ${score >= 67 ? 'badge-green' : score >= 34 ? 'badge-yellow' : 'badge-red'}`;
  }
  const sumRec = document.getElementById('sum-rec-score');
  if (sumRec) sumRec.textContent = `${score}%`;

  const vo2Val = state.hypertrophy?.vo2_max?.vo2_max;
  const sumVo2 = document.getElementById('sum-vo2-score');
  if (sumVo2) sumVo2.textContent = vo2Val ? vo2Val.toFixed(1) : '44.7';

  const debtMin = sleep.need?.debt_min || (sleep.need?.total_min ? Math.max(0, sleep.need.total_min - (sleep.total_asleep_min || 0)) : 49);
  const sumDebt = document.getElementById('sum-debt-score');
  if (sumDebt) sumDebt.textContent = `${debtMin} min`;

  const tdeeVal = state.hypertrophy?.metabolism?.tdee;
  const sumTdee = document.getElementById('sum-tdee-score');
  if (sumTdee) sumTdee.textContent = tdeeVal ? tdeeVal.toLocaleString() : '2,418';

  const sumFooter = document.getElementById('sum-footer-text');
  if (sumFooter) {
    if (score >= 67) {
      sumFooter.textContent = 'Optimal autonomic recovery. Primed for peak strain, PR lifts, or high-intensity intervals.';
    } else if (score >= 34) {
      sumFooter.textContent = 'Moderate physiological readiness. Target steady-state hypertrophy or aerobic conditioning.';
    } else {
      sumFooter.textContent = 'Elevated sympathetic stress today. Prioritize early sleep, hydration, and Zone 2 recovery.';
    }
  }

  // 4. Vibrant Electric Cobalt Card (Daily Protocol)
  const featAdvice = document.getElementById('feature-card-advice');
  if (featAdvice) {
    if (score >= 67) {
      featAdvice.textContent = `All systems green at ${score}%! Push your physical limits today and increase workout strain.`;
    } else if (score >= 34) {
      featAdvice.textContent = `Recovery is adequate at ${score}%. Moderate training volume and focused compound work recommended.`;
    } else {
      featAdvice.textContent = `Your recovery is restricted at ${score}%. Push cardiovascular active recovery rather than high-tension heavy lifting today.`;
    }
  }
  const featStrain = document.getElementById('feat-target-strain');
  if (featStrain) {
    featStrain.textContent = score >= 67 ? '15.0 - 18.0' : score >= 34 ? '12.0 - 14.5' : '9.0 - 11.4';
  }
  const featFocus = document.getElementById('feat-focus-label');
  if (featFocus) {
    featFocus.textContent = score >= 67 ? 'Max Effort / PR' : score >= 34 ? 'Hypertrophy Volume' : 'Zone 2 Aerobic';
  }

  // 5. Bubble Statistics Card (Sleep Architecture)
  const swsMin = sleep.slow_wave_sleep_min || 0;
  const remMin = sleep.rem_sleep_min || 0;
  const lightMin = sleep.light_sleep_min || 0;
  const totalStaged = swsMin + remMin + lightMin;

  const bubbleSws = document.getElementById('bubble-sws-pct');
  const bubbleRem = document.getElementById('bubble-rem-pct');
  const bubbleLight = document.getElementById('bubble-light-pct');

  if (totalStaged > 0) {
    const swsPct = Math.round((swsMin / totalStaged) * 100);
    const remPct = Math.round((remMin / totalStaged) * 100);
    const lightPct = Math.max(0, 100 - swsPct - remPct);
    if (bubbleSws) bubbleSws.textContent = `${swsPct}%`;
    if (bubbleRem) bubbleRem.textContent = `${remPct}%`;
    if (bubbleLight) bubbleLight.textContent = `${lightPct}%`;
  } else {
    if (bubbleSws) bubbleSws.textContent = '37%';
    if (bubbleRem) bubbleRem.textContent = '20%';
    if (bubbleLight) bubbleLight.textContent = '43%';
  }

  // Exact stage durations in minutes
  const bubbleSwsTime = document.getElementById('bubble-sws-time');
  if (bubbleSwsTime) bubbleSwsTime.textContent = `${swsMin || 84}m`;
  const bubbleRemTime = document.getElementById('bubble-rem-time');
  if (bubbleRemTime) bubbleRemTime.textContent = `${remMin || 43}m`;
  const bubbleLightTime = document.getElementById('bubble-light-time');
  if (bubbleLightTime) bubbleLightTime.textContent = `${lightMin || 98}m`;

  // 6. Additional Cards (VO2 Max and Metabolic Flux)
  const vo2Data = state.hypertrophy?.vo2_max || {};
  const glanceVo2 = document.getElementById('glance-vo2-val');
  if (glanceVo2) glanceVo2.textContent = vo2Data.vo2_max ? vo2Data.vo2_max.toFixed(1) : '44.7';
  const glanceVo2Badge = document.getElementById('glance-vo2-badge');
  if (glanceVo2Badge) glanceVo2Badge.textContent = `${vo2Data.percentile || 'Top 30%'} • ${vo2Data.fitness_age || 24} yrs`;

  const metaData = state.hypertrophy?.metabolism || {};
  const glanceBmr = document.getElementById('glance-bmr-val');
  if (glanceBmr) glanceBmr.innerHTML = `${(metaData.bmr || 1727).toLocaleString()} <small>kcal</small>`;
  const activeKcal = strain.kilojoules ? Math.round(strain.kilojoules * 0.239) : (metaData.active_calories || 593);
  const glanceActive = document.getElementById('glance-active-val');
  if (glanceActive) glanceActive.innerHTML = `${activeKcal.toLocaleString()} <small>kcal</small>`;
  const glanceTdee = document.getElementById('glance-tdee-val');
  if (glanceTdee) glanceTdee.innerHTML = `${(metaData.tdee || 2418).toLocaleString()} <small>kcal</small>`;

  const isGain = state.currentGoal !== 'loss';
  const targetCals = state.hypertrophy?.targets?.calories || (isGain ? 2768 : 1968);
  const glanceGoalLabel = document.getElementById('glance-goal-label');
  if (glanceGoalLabel) glanceGoalLabel.textContent = isGain ? 'Surplus Target (+350 kcal)' : 'Deficit Target (-450 kcal)';
  const glanceGoalCals = document.getElementById('glance-goal-cals');
  if (glanceGoalCals) glanceGoalCals.textContent = `${targetCals.toLocaleString()} kcal`;
  const glanceGoalProgress = document.getElementById('glance-goal-progress');
  if (glanceGoalProgress) {
    const consumed = state.hypertrophy?.nutrition_log?.calories_consumed || 0;
    const pct = targetCals > 0 ? Math.min(100, Math.round((consumed / targetCals) * 100)) : 75;
    glanceGoalProgress.style.width = `${pct > 0 ? pct : 75}%`;
  }
}

// 2. Recovery Lab View
function updateRecoveryLabView(dayRecord) {
  const history = state.data.history || [];
  if (history.length === 0) return;

  const hrvVals = history.map(h => h.recovery?.hrv_ms).filter(v => v != null);
  const rhrVals = history.map(h => h.recovery?.resting_heart_rate).filter(v => v != null);
  const recVals = history.map(h => h.recovery?.score).filter(v => v != null);

  const avg = (arr) => arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : '--';

  const last7Hrv = hrvVals.slice(-7);
  const last30Rhr = rhrVals.slice(-30);

  document.getElementById('hrv-7d-avg').textContent = `${avg(last7Hrv)} ms`;
  document.getElementById('rhr-30d-avg').textContent = `${avg(last30Rhr)} bpm`;

  const greenCount = recVals.filter(r => r >= 67).length;
  const yellowCount = recVals.filter(r => r >= 34 && r < 67).length;
  const redCount = recVals.filter(r => r < 34).length;
  const total = recVals.length || 1;

  const greenPct = Math.round((greenCount / total) * 100);
  const yellowPct = Math.round((yellowCount / total) * 100);
  const redPct = Math.round((redCount / total) * 100);

  document.getElementById('green-day-ratio').textContent = `${greenPct}%`;
  document.getElementById('spo2-avg').textContent = `${dayRecord?.recovery?.spo2 || 94}%`;

  document.getElementById('tier-bar-green').style.width = `${greenPct}%`;
  document.getElementById('tier-bar-yellow').style.width = `${yellowPct}%`;
  document.getElementById('tier-bar-red').style.width = `${redPct}%`;

  document.getElementById('count-green').textContent = `${greenCount}d`;
  document.getElementById('count-yellow').textContent = `${yellowCount}d`;
  document.getElementById('count-red').textContent = `${redCount}d`;
}

// 3. Sleep Architecture View
function updateSleepArchitectureView(dayRecord) {
  const sleep = dayRecord?.sleep || {};

  document.getElementById('sleep-exact-time').textContent = formatMinutesToHours(sleep.total_asleep_min);
  document.getElementById('sleep-sws-exact').textContent = `${sleep.slow_wave_sleep_min || '--'} min`;
  document.getElementById('sleep-eff-exact').textContent = `${sleep.efficiency_percentage || '--'}%`;

  const debtMin = sleep.need?.debt_min || (sleep.need?.total_min ? Math.max(0, sleep.need.total_min - (sleep.total_asleep_min || 0)) : 0);
  document.getElementById('sleep-debt-val').textContent = `${debtMin} min`;
}

// 4. Strain & Workouts View
function updateStrainWorkoutsView(dayRecord) {
  const strain = dayRecord?.strain || {};
  const totalKj = strain.kilojoules || 0;
  const totalKcal = Math.round(totalKj * 0.239006);

  document.getElementById('strain-exact-val').textContent = strain.score || '--';
  document.getElementById('energy-kcal-val').textContent = `${totalKcal} kcal`;
  document.getElementById('energy-kj-sub').textContent = `${totalKj.toLocaleString()} kJ burned`;
  document.getElementById('max-hr-exact').textContent = `${strain.max_heart_rate || '--'} bpm`;

  const workouts = dayRecord?.workouts || [];
  document.getElementById('total-workouts-val').textContent = workouts.length;

  const container = document.getElementById('workouts-list-container');
  if (workouts.length === 0) {
    container.innerHTML = '<p style="color: var(--text-muted); font-size: 13px;">No workouts recorded for this date.</p>';
  } else {
    container.innerHTML = workouts.map(w => `
      <div class="stat-chip" style="margin-bottom: 12px;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <strong style="font-family: var(--font-display); font-size: 15px; color: var(--whoop-blue);">Activity #${w.id}</strong>
          <span class="badge badge-blue">Strain: ${w.strain}</span>
        </div>
        <div style="display: flex; gap: 20px; font-size: 12px; color: var(--text-secondary); margin-top: 8px;">
          <span>Duration: <strong>${w.duration_min}m</strong></span>
          <span>Avg HR: <strong>${w.average_heart_rate || '--'} bpm</strong></span>
          <span>Max HR: <strong>${w.max_heart_rate || '--'} bpm</strong></span>
          <span>Energy: <strong>${Math.round((w.kilojoules || 0) * 0.239)} kcal</strong></span>
        </div>
      </div>
    `).join('');
  }
}

// 5. Hypertrophy & Muscle Lab View
function renderHypertrophyLab(data) {
  if (!data) return;

  const body = data.body || {};
  const targets = data.targets || {};
  const readiness = data.muscle_readiness || {};
  const log = data.nutrition_log || {};
  const isGain = data.goal !== 'loss';

  // Goal Switcher UI sync
  const btnGain = document.getElementById('btn-goal-gain');
  const btnLoss = document.getElementById('btn-goal-loss');
  if (btnGain && btnLoss) {
    if (isGain) {
      btnGain.classList.add('active');
      btnLoss.classList.remove('active');
    } else {
      btnLoss.classList.add('active');
      btnGain.classList.remove('active');
    }
  }

  const goalSummaryEl = document.getElementById('goal-summary-badge');
  if (goalSummaryEl && data.goal_summary) {
    goalSummaryEl.textContent = data.goal_summary;
  }

  document.getElementById('hyp-body-weight').innerHTML = `${body.weight_kg} <small>kg</small>`;
  document.getElementById('hyp-body-height').innerHTML = `${(body.height_cm / 100).toFixed(2)} <small>m</small>`;
  document.getElementById('hyp-body-maxhr').innerHTML = `${body.max_heart_rate} <small>bpm</small>`;

  const readinessEl = document.getElementById('hyp-readiness-tier');
  readinessEl.textContent = readiness.tier;
  if (readiness.status_color === 'green') readinessEl.style.color = 'var(--whoop-green)';
  else if (readiness.status_color === 'yellow') readinessEl.style.color = 'var(--whoop-yellow)';
  else readinessEl.style.color = 'var(--whoop-red)';

  document.getElementById('hyp-readiness-desc').textContent = readiness.training_recommendation;

  // Targets
  document.getElementById('hyp-target-calories').textContent = targets.calories;
  document.getElementById('hyp-burned-calories').textContent = targets.burned_calories;
  document.getElementById('hyp-target-protein').textContent = targets.protein_grams;
  document.getElementById('hyp-target-carbs').textContent = targets.carb_grams;
  document.getElementById('hyp-target-fats').textContent = targets.fat_grams;

  // Calorie & Macro Header Badges
  const calBadge = document.querySelector('.macro-calories .macro-badge');
  if (calBadge) {
    calBadge.textContent = isGain ? '+350 kcal Lean Bulk Surplus' : '-450 kcal Fat Loss Deficit';
    calBadge.className = `macro-badge ${isGain ? 'badge-blue' : 'badge-orange'}`;
  }
  const calFooterSurplus = document.querySelector('.macro-calories .macro-footer span:last-child');
  if (calFooterSurplus) {
    calFooterSurplus.innerHTML = isGain ? 'Surplus Goal: <strong>+350</strong> kcal' : 'Deficit Goal: <strong>-450</strong> kcal';
  }
  const protBadge = document.querySelector('.macro-protein .macro-badge');
  if (protBadge) {
    protBadge.textContent = isGain ? '2.1 g/kg (Optimal MPS)' : '2.3 g/kg (Lean Sparing)';
  }

  // Progress Bars
  const calPct = Math.min(100, Math.round(((log.calories_consumed || 0) / targets.calories) * 100));
  const protPct = Math.min(100, Math.round(((log.protein_consumed || 0) / targets.protein_grams) * 100));
  const carbPct = Math.min(100, Math.round(((log.carbs_consumed || 0) / targets.carb_grams) * 100));
  const fatPct = Math.min(100, Math.round(((log.fats_consumed || 0) / targets.fat_grams) * 100));

  document.getElementById('bar-calories').style.width = `${calPct}%`;
  document.getElementById('bar-protein').style.width = `${protPct}%`;
  document.getElementById('bar-carbs').style.width = `${carbPct}%`;
  document.getElementById('bar-fats').style.width = `${fatPct}%`;

  // Prepopulate form if logged
  if (log.calories_consumed) document.getElementById('input-log-calories').value = log.calories_consumed;
  if (log.protein_consumed) document.getElementById('input-log-protein').value = log.protein_consumed;
  if (log.carbs_consumed) document.getElementById('input-log-carbs').value = log.carbs_consumed;
  if (log.fats_consumed) document.getElementById('input-log-fats').value = log.fats_consumed;

  // Render VO2 Max Card
  const vo2 = data.vo2_max || {};
  const vo2ValEl = document.getElementById('vo2-max-val');
  if (vo2ValEl && vo2.vo2_max != null) vo2ValEl.textContent = vo2.vo2_max.toFixed(1);
  const vo2Badge = document.getElementById('vo2-percentile-badge');
  if (vo2Badge) vo2Badge.textContent = `${vo2.percentile || 'Top 30%'} / ${vo2.tier || 'Good'}`;
  const vo2FitAge = document.getElementById('vo2-fitness-age');
  if (vo2FitAge) vo2FitAge.textContent = `${vo2.fitness_age || 24} yrs`;

  const vo2ProtocolsContainer = document.getElementById('vo2-protocols-container');
  if (vo2ProtocolsContainer && vo2.protocols) {
    vo2ProtocolsContainer.innerHTML = vo2.protocols.map(p => `
      <div class="vo2-protocol-item">
        <strong>${p.title}:</strong> ${p.description}
      </div>
    `).join('');
  }

  // Render Metabolic Efficiency Lab Card
  const meta = data.metabolism || {};
  const metaBmr = document.getElementById('meta-bmr-val');
  if (metaBmr) metaBmr.innerHTML = `${(meta.bmr || 1730).toLocaleString()} <small>kcal</small>`;
  const metaTef = document.getElementById('meta-tef-val');
  if (metaTef) metaTef.innerHTML = `~${(meta.tef || 210).toLocaleString()} <small>kcal</small>`;
  const metaTdee = document.getElementById('meta-tdee-val');
  if (metaTdee) metaTdee.innerHTML = `${(meta.tdee || 2420).toLocaleString()} <small>kcal</small>`;
  const metaActive = document.getElementById('meta-active-val');
  if (metaActive) metaActive.innerHTML = `${(meta.active_calories || 0).toLocaleString()} <small>kcal</small>`;
  const metaFlexBadge = document.getElementById('meta-flex-badge');
  if (metaFlexBadge) metaFlexBadge.textContent = `Flexibility: ${meta.metabolic_flexibility || 'Moderate'}`;
  const metaAdvice = document.getElementById('meta-advice-text');
  if (metaAdvice && meta.advice) {
    metaAdvice.innerHTML = `<strong>Metabolic Recommendation:</strong> ${meta.advice}`;
  }

  // Render MPS Timeline
  const mpsContainer = document.getElementById('mps-timeline-container');
  mpsContainer.innerHTML = (readiness.protein_distribution || []).map(m => `
    <div class="mps-meal-card">
      <span class="mps-meal-title">${m.meal}</span>
      <span class="mps-meal-grams">${m.protein}g <small style="font-size: 12px; color: var(--text-muted);">protein</small></span>
      <span class="mps-meal-sub">Timing: ${m.timing}</span>
      <span class="mps-meal-leucine">Leucine: ${m.leucine_target}</span>
    </div>
  `).join('');

  // HGH Status Box
  document.getElementById('hgh-current-status-box').innerHTML = `
    <strong>Today's Hormonal Assessment:</strong> ${readiness.hgh_status}
  `;

  // Render Timeline Projections (Muscle Gain vs Fat Loss)
  const proj = data.projections;
  if (proj) {
    const projBadge = document.getElementById('proj-badge');
    if (projBadge) {
      projBadge.textContent = isGain ? 'HYPERTROPHY VELOCITY' : 'FAT LOSS VELOCITY';
      projBadge.style.color = isGain ? '#306EE8' : '#E84375';
    }

    const projTitle = document.getElementById('proj-title');
    if (projTitle) projTitle.textContent = proj.title;

    const projSub = document.getElementById('proj-subtitle');
    if (projSub) projSub.textContent = proj.subtitle;

    const projRateVal = document.getElementById('proj-rate-val');
    if (projRateVal) projRateVal.textContent = proj.rate_headline;

    const projRateChip = document.getElementById('proj-rate-chip');
    if (projRateChip) {
      if (isGain) {
        projRateChip.style.background = 'rgba(48, 110, 232, 0.12)';
        projRateChip.style.borderColor = 'rgba(48, 110, 232, 0.3)';
        projRateChip.style.color = '#93C5FD';
      } else {
        projRateChip.style.background = 'rgba(232, 67, 117, 0.12)';
        projRateChip.style.borderColor = 'rgba(232, 67, 117, 0.3)';
        projRateChip.style.color = '#F472B6';
      }
    }

    const milestonesGrid = document.getElementById('proj-milestones-grid');
    if (milestonesGrid && proj.milestones) {
      milestonesGrid.innerHTML = proj.milestones.map(m => `
        <div class="projection-milestone-card">
          <div class="milestone-header-row">
            <span class="milestone-span">${m.span}</span>
            <span class="milestone-badge">${m.badge}</span>
          </div>
          <div class="milestone-primary-group">
            <span class="milestone-val">${m.primary_val}</span>
            <span class="milestone-pct ${isGain ? 'milestone-pct-gain' : 'milestone-pct-loss'}">${m.primary_pct}</span>
          </div>
          <div class="milestone-sub">${m.sub}</div>
          <div class="milestone-detail">${m.detail}</div>
        </div>
      `).join('');
    }

    const summaryBar = document.getElementById('proj-summary-bar');
    if (summaryBar && proj.summary_chips) {
      summaryBar.innerHTML = proj.summary_chips.map(c => `
        <div class="proj-summary-item">
          <span>${c.label}:</span>
          <strong>${c.value}</strong>
        </div>
      `).join('');
    }
  }
}

function setRingProgress(circleEl, percent) {
  const clamped = Math.max(0, Math.min(100, percent));
  const offset = CIRCLE_CIRCUMFERENCE - (CIRCLE_CIRCUMFERENCE * clamped / 100);
  circleEl.style.strokeDashoffset = offset;
}

// -------------------------------------------------------------
// Coach Recommendation & Insights
// -------------------------------------------------------------

function renderCoachRecommendation(rec) {
  if (!rec) return;

  const tierBadge = document.getElementById('coach-tier-badge');
  const targetStrain = document.getElementById('coach-target-strain');
  const headline = document.getElementById('coach-headline');
  const advice = document.getElementById('coach-advice');
  const tagsContainer = document.getElementById('coach-tags');

  tierBadge.textContent = `${rec.recovery_tier} READINESS`;
  if (rec.recovery_tier === 'GREEN') {
    tierBadge.style.color = 'var(--whoop-green)';
    tierBadge.style.background = 'var(--whoop-green-subtle)';
  } else if (rec.recovery_tier === 'YELLOW') {
    tierBadge.style.color = 'var(--whoop-yellow)';
    tierBadge.style.background = 'var(--whoop-yellow-subtle)';
  } else {
    tierBadge.style.color = 'var(--whoop-red)';
    tierBadge.style.background = 'var(--whoop-red-subtle)';
  }

  targetStrain.textContent = `Target Strain: ${rec.target_strain}`;
  headline.textContent = rec.headline;
  advice.textContent = rec.advice;

  tagsContainer.innerHTML = '';
  (rec.suggested_habits || []).forEach(h => {
    const tag = document.createElement('span');
    tag.className = 'coach-tag-item';
    tag.textContent = h;
    tagsContainer.appendChild(tag);
  });
}

function renderHabitCards() {
  const container = document.getElementById('habits-grid');
  container.innerHTML = '';

  state.habits.forEach(habit => {
    const isActive = !!state.dailyLogs[habit.id];

    const card = document.createElement('div');
    card.className = `habit-card ${isActive ? 'active' : ''}`;
    card.id = `habit-card-${habit.id}`;

    card.innerHTML = `
      <div class="habit-info-group">
        <span class="habit-icon">${habit.icon}</span>
        <div class="habit-text">
          <span class="habit-name">${habit.name}</span>
          <span class="habit-desc">${habit.description || habit.category}</span>
        </div>
      </div>
      <div class="toggle-switch">
        <div class="toggle-knob"></div>
      </div>
    `;

    card.addEventListener('click', async () => {
      await toggleHabit(habit.id);
    });

    container.appendChild(card);
  });
}

async function toggleHabit(habitId) {
  const current = !!state.dailyLogs[habitId];
  const updated = !current;
  state.dailyLogs[habitId] = updated;

  const card = document.getElementById(`habit-card-${habitId}`);
  if (card) {
    if (updated) card.classList.add('active');
    else card.classList.remove('active');
  }

  try {
    await fetch('/api/habits/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date: state.selectedDate,
        habits: { [habitId]: updated }
      })
    });
    await loadCorrelations();
  } catch (err) {
    console.error('Failed to save habit log:', err);
  }
}

function renderInsights(insights) {
  const container = document.getElementById('insights-cards-container-tab');
  if (!container) return;
  container.innerHTML = '';

  if (!insights || insights.length === 0) {
    container.innerHTML = `
      <div class="insight-card" style="grid-column: 1 / -1; text-align: center; color: var(--text-muted);">
        Log more daily habits or click <strong>Demo Mode</strong> to discover physiological correlations.
      </div>
    `;
    return;
  }

  insights.forEach(item => {
    const card = document.createElement('div');
    card.className = `insight-card ${item.type}`;
    card.innerHTML = `
      <div class="insight-header">
        <span class="insight-habit">${item.icon} ${item.habit}</span>
        <span class="badge ${item.type === 'positive' ? 'badge-green' : 'badge-red'}">
          ${item.type === 'positive' ? 'BOOSTER' : 'DISRUPTER'}
        </span>
      </div>
      <h4 class="insight-title">${item.title}</h4>
      <p class="insight-desc">${item.description}</p>
    `;
    container.appendChild(card);
  });
}

function renderImpactTable(correlations) {
  const tbody = document.getElementById('impact-table-body-tab');
  if (!tbody) return;
  tbody.innerHTML = '';

  if (!correlations || correlations.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align: center; color: var(--text-muted); padding: 30px;">
          No correlation data available yet. Start logging habits or load Demo Mode!
        </td>
      </tr>
    `;
    return;
  }

  const formatDelta = (val, suffix = '', invert = false) => {
    if (val === null || val === undefined) return '<span class="delta-neutral">--</span>';
    const isPositive = invert ? val < 0 : val > 0;
    const isNegative = invert ? val > 0 : val < 0;
    const sign = val > 0 ? '+' : '';
    const cls = isPositive ? 'delta-pos' : isNegative ? 'delta-neg' : 'delta-neutral';
    return `<span class="impact-delta ${cls}">${sign}${val}${suffix}</span>`;
  };

  correlations.forEach(c => {
    const m = c.metrics;
    const tr = document.createElement('tr');

    let statusBadgeClass = 'badge-blue';
    if (c.status === 'Super Booster') statusBadgeClass = 'badge-green';
    else if (c.status === 'Positive') statusBadgeClass = 'badge-green';
    else if (c.status === 'Severe Disrupter') statusBadgeClass = 'badge-red';
    else if (c.status === 'Negative') statusBadgeClass = 'badge-red';

    tr.innerHTML = `
      <td><strong>${c.icon} ${c.name}</strong></td>
      <td><span class="coach-tag-item">${c.category}</span></td>
      <td>${formatDelta(m.recovery.delta, '%')}</td>
      <td>${formatDelta(m.hrv.delta, ' ms')}</td>
      <td>${formatDelta(m.deep_sleep.delta, ' m')}</td>
      <td>${formatDelta(m.rhr.delta, ' bpm', true)}</td>
      <td><span class="badge badge-blue">${c.confidence} (${c.days_active}d)</span></td>
      <td><span class="badge ${statusBadgeClass}">${c.status}</span></td>
    `;
    tbody.appendChild(tr);
  });
}

// -------------------------------------------------------------
// Interactive Chart.js Initializers
// -------------------------------------------------------------

function renderAllCharts() {
  const history = state.data.history || [];
  if (history.length === 0) return;

  const labels = history.map(h => {
    const parts = h.date.split('-');
    return `${parts[1]}/${parts[2]}`;
  });

  const recoveryData = history.map(h => h.recovery?.score ?? null);
  const hrvData = history.map(h => h.recovery?.hrv_ms ?? null);
  const rhrData = history.map(h => h.recovery?.resting_heart_rate ?? null);
  const strainData = history.map(h => h.strain?.score ?? null);
  const caloriesData = history.map(h => Math.round((h.strain?.kilojoules || 0) * 0.239006));

  const deepSleepData = history.map(h => h.sleep?.slow_wave_sleep_min ?? 0);
  const remSleepData = history.map(h => h.sleep?.rem_sleep_min ?? 0);
  const lightSleepData = history.map(h => h.sleep?.light_sleep_min ?? 0);
  const awakeData = history.map(h => h.sleep?.awake_min ?? 0);
  const sleepNeedData = history.map(h => h.sleep?.need?.total_min ? Math.round((h.sleep.need.total_min / 60) * 10) / 10 : 8.0);
  const sleepActualData = history.map(h => h.sleep?.total_asleep_min ? Math.round((h.sleep.total_asleep_min / 60) * 10) / 10 : 0);

  // Common options
  const commonScales = {
    x: {
      grid: { color: 'rgba(255, 255, 255, 0.04)' },
      ticks: { color: '#64748B', font: { size: 10 } }
    },
    y: {
      grid: { color: 'rgba(255, 255, 255, 0.04)' },
      ticks: { color: '#94A3B8', font: { size: 10 } }
    }
  };

  // 1. Overview Trend Chart (Spline Waveform in Resq.io Style)
  const elOverview = document.getElementById('overview-trend-chart');
  if (elOverview && (!state.charts.overview || state.currentTab === 'overview')) {
    if (state.charts.overview) state.charts.overview.destroy();

    const ctx = elOverview.getContext('2d');
    const gradRose = ctx.createLinearGradient(0, 0, 0, 240);
    gradRose.addColorStop(0, 'rgba(232, 67, 117, 0.18)');
    gradRose.addColorStop(1, 'rgba(232, 67, 117, 0.00)');

    const gradBlue = ctx.createLinearGradient(0, 0, 0, 240);
    gradBlue.addColorStop(0, 'rgba(48, 110, 232, 0.16)');
    gradBlue.addColorStop(1, 'rgba(48, 110, 232, 0.00)');

    state.charts.overview = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Recovery (%)',
            data: recoveryData,
            borderColor: '#E84375',
            backgroundColor: gradRose,
            fill: true,
            borderWidth: 2.8,
            pointRadius: 0,
            pointHoverRadius: 5,
            pointHoverBackgroundColor: '#E84375',
            tension: 0.45,
            yAxisID: 'y'
          },
          {
            label: 'Strain & HRV Wave',
            data: hrvData,
            borderColor: '#306EE8',
            backgroundColor: gradBlue,
            fill: true,
            borderWidth: 2.8,
            pointRadius: 0,
            pointHoverRadius: 5,
            pointHoverBackgroundColor: '#306EE8',
            tension: 0.45,
            yAxisID: 'y1'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false
        },
        scales: {
          x: {
            grid: { color: 'rgba(255, 255, 255, 0.03)' },
            ticks: { color: '#6A7282', font: { size: 10, family: 'Inter' }, maxTicksLimit: 8 }
          },
          y: {
            position: 'left',
            min: 0,
            max: 100,
            grid: { color: 'rgba(255, 255, 255, 0.03)' },
            ticks: { color: '#E84375', font: { size: 10, family: 'Inter' }, stepSize: 25 }
          },
          y1: {
            position: 'right',
            grid: { drawOnChartArea: false },
            ticks: { color: '#306EE8', font: { size: 10, family: 'Inter' }, maxTicksLimit: 5 }
          }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#1A1D24',
            titleColor: '#FFFFFF',
            bodyColor: '#94A3B8',
            borderColor: 'rgba(255, 255, 255, 0.08)',
            borderWidth: 1,
            padding: 10,
            cornerRadius: 8
          }
        }
      }
    });
  }

  // 2. Recovery & HRV Deep Chart
  const elHrvDeep = document.getElementById('recovery-hrv-deep-chart');
  if (elHrvDeep && (!state.charts.hrvDeep || state.currentTab === 'recovery')) {
    if (state.charts.hrvDeep) state.charts.hrvDeep.destroy();
    state.charts.hrvDeep = new Chart(elHrvDeep.getContext('2d'), {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'HRV (ms)',
            data: hrvData,
            borderColor: '#00F076',
            backgroundColor: 'rgba(0, 240, 118, 0.1)',
            fill: true,
            borderWidth: 2.5,
            pointRadius: 3,
            tension: 0.3
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: commonScales,
        plugins: { legend: { display: false } }
      }
    });
  }

  // 3. Resting Heart Rate Chart
  const elRhr = document.getElementById('rhr-trend-chart');
  if (elRhr && (!state.charts.rhr || state.currentTab === 'recovery')) {
    if (state.charts.rhr) state.charts.rhr.destroy();
    state.charts.rhr = new Chart(elRhr.getContext('2d'), {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Resting Heart Rate (bpm)',
            data: rhrData,
            borderColor: '#FF3B30',
            backgroundColor: 'rgba(255, 59, 48, 0.08)',
            borderWidth: 2,
            pointRadius: 2.5,
            tension: 0.3
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: commonScales,
        plugins: { legend: { display: false } }
      }
    });
  }

  // 4. Sleep Stages Deep Chart
  const elSleepStages = document.getElementById('sleep-stages-deep-chart');
  if (elSleepStages && (!state.charts.sleepStages || state.currentTab === 'sleep')) {
    if (state.charts.sleepStages) state.charts.sleepStages.destroy();
    state.charts.sleepStages = new Chart(elSleepStages.getContext('2d'), {
      type: 'bar',
      data: {
        labels,
        datasets: [
          { label: 'Deep (SWS)', data: deepSleepData, backgroundColor: '#00E5FF', stack: 'Sleep' },
          { label: 'REM', data: remSleepData, backgroundColor: '#A855F7', stack: 'Sleep' },
          { label: 'Light', data: lightSleepData, backgroundColor: '#334155', stack: 'Sleep' },
          { label: 'Awake', data: awakeData, backgroundColor: '#FF3B30', stack: 'Sleep' }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { grid: { display: false }, ticks: { color: '#64748B', font: { size: 10 } } },
          y: { stacked: true, grid: { color: 'rgba(255, 255, 255, 0.04)' }, ticks: { color: '#64748B', font: { size: 10 } } }
        },
        plugins: {
          legend: { labels: { color: '#94A3B8', font: { size: 11 }, boxWidth: 12 } }
        }
      }
    });
  }

  // 5. Sleep Need vs Actual Chart
  const elSleepNeed = document.getElementById('sleep-need-chart');
  if (elSleepNeed && (!state.charts.sleepNeed || state.currentTab === 'sleep')) {
    if (state.charts.sleepNeed) state.charts.sleepNeed.destroy();
    state.charts.sleepNeed = new Chart(elSleepNeed.getContext('2d'), {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Sleep Needed (h)',
            data: sleepNeedData,
            borderColor: '#FFDE37',
            borderDash: [5, 5],
            borderWidth: 2,
            pointRadius: 0
          },
          {
            label: 'Actual Sleep (h)',
            data: sleepActualData,
            borderColor: '#00E5FF',
            backgroundColor: 'rgba(0, 229, 255, 0.1)',
            fill: true,
            borderWidth: 2.5,
            pointRadius: 2.5
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: commonScales,
        plugins: {
          legend: { labels: { color: '#94A3B8', font: { size: 11 }, boxWidth: 12 } }
        }
      }
    });
  }

  // 6. Strain vs Recovery Balance Chart
  const elStrainRec = document.getElementById('strain-recovery-chart');
  if (elStrainRec && (!state.charts.strainRec || state.currentTab === 'workouts')) {
    if (state.charts.strainRec) state.charts.strainRec.destroy();
    state.charts.strainRec = new Chart(elStrainRec.getContext('2d'), {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            type: 'bar',
            label: 'Day Strain',
            data: strainData,
            backgroundColor: 'rgba(43, 127, 255, 0.7)',
            yAxisID: 'y'
          },
          {
            type: 'line',
            label: 'Recovery %',
            data: recoveryData,
            borderColor: '#00F076',
            borderWidth: 2,
            pointRadius: 2.5,
            yAxisID: 'y1'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: commonScales.x,
          y: { ...commonScales.y, min: 0, max: 21, position: 'left' },
          y1: { position: 'right', min: 0, max: 100, grid: { drawOnChartArea: false }, ticks: { color: '#00F076', font: { size: 10 } } }
        },
        plugins: {
          legend: { labels: { color: '#94A3B8', font: { size: 11 }, boxWidth: 12 } }
        }
      }
    });
  }

  // 7. Calories Burned Chart
  const elCalories = document.getElementById('calories-burned-chart');
  if (elCalories && (!state.charts.calories || state.currentTab === 'workouts')) {
    if (state.charts.calories) state.charts.calories.destroy();
    state.charts.calories = new Chart(elCalories.getContext('2d'), {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Energy Burned (kcal)',
            data: caloriesData,
            backgroundColor: 'rgba(255, 222, 55, 0.65)'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: commonScales,
        plugins: { legend: { display: false } }
      }
    });
  }
}
