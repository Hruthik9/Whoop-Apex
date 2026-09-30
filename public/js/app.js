// WHOOP Performance & Hypertrophy Engine - Client Application Logic

const CIRCLE_CIRCUMFERENCE = 414.69; // 2 * Math.PI * 66

function getLocalDateString(d = new Date()) {
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().split('T')[0];
}

let state = {
  selectedDate: getLocalDateString(),
  currentTab: 'overview',
  currentGoal: 'gain',
  overviewRangeDays: 30,
  auth: { connected: false, user: null, has_data: false },
  activeProvider: 'whoop',
  data: { latest: null, history: [] },
  habits: [],
  catalog: [],
  dailyLogs: {},
  correlations: null,
  hypertrophy: null,
  charts: {},
  aiInsights: null,
  chatHistory: [],
  pacer: {
    active: false,
    paused: false,
    intervalId: null,
    protocol: null,
    phaseIndex: 0,
    secondsLeft: 0,
    currentCycle: 1,
    totalCycles: 25
  }
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
  await loadHabitCatalog();
  await loadCorrelations();
  await loadHypertrophyData();
  await loadAICoachInsights();
  initPacerEngine('sigh');
  initPwaController();
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
    if (connected === 'google_fitbit') {
      message.textContent = 'Successfully connected to Google Health / Fitbit. Live biometrics have been synced.';
    } else {
      message.textContent = 'Successfully connected to WHOOP. Live biometrics have been synced.';
    }
    window.history.replaceState({}, document.title, window.location.pathname);
  } else if (authError) {
    banner.classList.remove('hidden');
    banner.style.borderColor = 'rgba(255, 59, 48, 0.4)';
    banner.style.background = 'rgba(255, 59, 48, 0.15)';
    message.textContent = `Authentication Error: ${authError}`;
    window.history.replaceState({}, document.title, window.location.pathname);
  }
}

function initEventListeners() {
  // Tab Navigation (supports .nav-tab, .nav-tab-pill, and smartphone .bottom-dock-tab)
  const tabs = document.querySelectorAll('.nav-tab, .nav-tab-pill, .bottom-dock-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const targetTab = tab.getAttribute('data-tab');
      switchTab(targetTab);
    });
  });

  // Date Selector
  const dateInput = document.getElementById('date-selector');
  const todayLocal = getLocalDateString();
  dateInput.max = todayLocal;
  dateInput.value = state.selectedDate;
  dateInput.addEventListener('change', async (e) => {
    if (e.target.value > todayLocal) {
      e.target.value = todayLocal;
    }
    state.selectedDate = e.target.value;
    updateDateDisplay();
    await loadHabitsAndLogs();
    await loadHypertrophyData();
    await loadAICoachInsights();
    updateAllViews();
  });

  // Wearable Provider Switcher Buttons
  const btnWearableWhoop = document.getElementById('btn-wearable-whoop');
  if (btnWearableWhoop) {
    btnWearableWhoop.addEventListener('click', async () => {
      if (state.activeProvider !== 'whoop') {
        await switchWearableProvider('whoop');
      }
    });
  }

  const btnWearableGoogle = document.getElementById('btn-wearable-google');
  if (btnWearableGoogle) {
    btnWearableGoogle.addEventListener('click', async () => {
      if (state.activeProvider !== 'google_fitbit') {
        await switchWearableProvider('google_fitbit');
      }
    });
  }

  // Action Buttons
  document.getElementById('btn-connect').addEventListener('click', () => {
    if (state.activeProvider === 'google_fitbit') {
      const modal = document.getElementById('modal-fitbit-connect');
      if (modal) modal.classList.remove('hidden');
    } else {
      window.location.href = '/api/auth/login';
    }
  });

  // Fitbit Connect Modal Listeners
  const btnCloseFitbitModal = document.getElementById('btn-close-fitbit-modal');
  if (btnCloseFitbitModal) {
    btnCloseFitbitModal.addEventListener('click', () => {
      const modal = document.getElementById('modal-fitbit-connect');
      if (modal) modal.classList.add('hidden');
    });
  }

  const btnFitbitUseDemo = document.getElementById('btn-fitbit-use-demo');
  if (btnFitbitUseDemo) {
    btnFitbitUseDemo.addEventListener('click', () => {
      const modal = document.getElementById('modal-fitbit-connect');
      if (modal) modal.classList.add('hidden');
      const banner = document.getElementById('alert-banner');
      const msg = document.getElementById('alert-message');
      if (banner && msg) {
        banner.classList.remove('hidden');
        banner.style.borderColor = 'rgba(0, 240, 118, 0.4)';
        banner.style.background = 'rgba(0, 240, 118, 0.15)';
        msg.textContent = 'Active: 30-Day Simulated Google Pixel Watch / Fitbit Sense 2 Biometrics.';
      }
    });
  }

  const btnFitbitOAuth = document.getElementById('btn-fitbit-oauth-login');
  if (btnFitbitOAuth) {
    btnFitbitOAuth.addEventListener('click', () => {
      window.location.href = '/api/auth/google/login';
    });
  }

  document.getElementById('btn-sync').addEventListener('click', async () => {
    await syncWearableData();
  });

  document.getElementById('btn-demo').addEventListener('click', async () => {
    await populateDemoData();
  });

  // Apex AI Coach Interaction Listeners
  const formAiChat = document.getElementById('form-ai-coach-chat');
  if (formAiChat) {
    formAiChat.addEventListener('submit', async (e) => {
      e.preventDefault();
      const input = document.getElementById('ai-coach-input');
      const prompt = input ? input.value.trim() : '';
      if (!prompt) return;
      await handleAICoachQuery(prompt);
      if (input) input.value = '';
    });
  }

  const promptPills = document.querySelectorAll('.ai-prompt-pill');
  promptPills.forEach(pill => {
    pill.addEventListener('click', async () => {
      const prompt = pill.getAttribute('data-prompt');
      const input = document.getElementById('ai-coach-input');
      if (input) input.value = prompt;
      await handleAICoachQuery(prompt);
    });
  });

  const btnCloseAiResponse = document.getElementById('btn-close-ai-response');
  if (btnCloseAiResponse) {
    btnCloseAiResponse.addEventListener('click', () => {
      const box = document.getElementById('ai-chat-response-box');
      if (box) box.classList.add('hidden');
    });
  }

  const btnClearAiChat = document.getElementById('btn-clear-ai-chat');
  if (btnClearAiChat) {
    btnClearAiChat.addEventListener('click', () => {
      state.chatHistory = [];
      const container = document.getElementById('ai-chat-messages-container');
      if (container) container.innerHTML = '';
      const box = document.getElementById('ai-chat-response-box');
      if (box) box.classList.add('hidden');
    });
  }

  // Overview Breathwork Button -> switches to Recovery tab and scrolls to Pacer Lab
  const btnOpenPacer = document.getElementById('btn-open-breath-pacer');
  if (btnOpenPacer) {
    btnOpenPacer.addEventListener('click', () => {
      switchTab('recovery');
      const lab = document.getElementById('vagal-pacer-lab');
      if (lab) {
        lab.scrollIntoView({ behavior: 'smooth' });
        lab.style.borderColor = '#306EE8';
        lab.style.boxShadow = '0 0 35px rgba(48, 110, 232, 0.45)';
        setTimeout(() => {
          lab.style.borderColor = '';
          lab.style.boxShadow = '';
        }, 2500);
      }
    });
  }

  // Pacer Protocol Selector Buttons
  const btnProtoSigh = document.getElementById('btn-proto-sigh');
  if (btnProtoSigh) {
    btnProtoSigh.addEventListener('click', () => selectPacerProtocol('sigh'));
  }
  const btnProto478 = document.getElementById('btn-proto-478');
  if (btnProto478) {
    btnProto478.addEventListener('click', () => selectPacerProtocol('478'));
  }
  const btnProtoBox = document.getElementById('btn-proto-box');
  if (btnProtoBox) {
    btnProtoBox.addEventListener('click', () => selectPacerProtocol('box'));
  }

  // Pacer Controls (In-Page)
  const btnPacerMain = document.getElementById('btn-pacer-main');
  if (btnPacerMain) {
    btnPacerMain.addEventListener('click', () => togglePacerSession());
  }

  const btnPacerReset = document.getElementById('btn-pacer-reset');
  if (btnPacerReset) {
    btnPacerReset.addEventListener('click', () => resetPacerSession());
  }

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

  // Modal Handlers & Tab Switcher
  const modal = document.getElementById('modal-add-habit');
  const openModal = (tab = 'catalog') => {
    switchModalTab(tab);
    renderCatalog();
    modal.classList.remove('hidden');
  };
  const closeModal = () => modal.classList.add('hidden');

  function switchModalTab(tab) {
    const tabBtnCatalog = document.getElementById('tab-btn-catalog');
    const tabBtnCustom = document.getElementById('tab-btn-custom');
    const viewCatalog = document.getElementById('view-habit-catalog');
    const viewCustom = document.getElementById('form-add-habit');

    if (tab === 'catalog') {
      if (tabBtnCatalog) tabBtnCatalog.classList.add('active');
      if (tabBtnCustom) tabBtnCustom.classList.remove('active');
      if (viewCatalog) viewCatalog.classList.remove('hidden');
      if (viewCustom) viewCustom.classList.add('hidden');
    } else {
      if (tabBtnCustom) tabBtnCustom.classList.add('active');
      if (tabBtnCatalog) tabBtnCatalog.classList.remove('active');
      if (viewCustom) viewCustom.classList.remove('hidden');
      if (viewCatalog) viewCatalog.classList.add('hidden');
    }
  }

  const tabBtnCatalog = document.getElementById('tab-btn-catalog');
  if (tabBtnCatalog) tabBtnCatalog.addEventListener('click', () => switchModalTab('catalog'));
  const tabBtnCustom = document.getElementById('tab-btn-custom');
  if (tabBtnCustom) tabBtnCustom.addEventListener('click', () => switchModalTab('custom'));

  const btnAddHabit = document.getElementById('btn-add-habit');
  if (btnAddHabit) btnAddHabit.addEventListener('click', () => openModal('catalog'));
  const btnAddTab = document.getElementById('btn-add-habit-tab');
  if (btnAddTab) btnAddTab.addEventListener('click', () => openModal('catalog'));
  const btnOpenBanner = document.getElementById('btn-open-catalog-banner');
  if (btnOpenBanner) btnOpenBanner.addEventListener('click', () => openModal('catalog'));

  const btnCloseModal = document.getElementById('btn-close-modal');
  if (btnCloseModal) btnCloseModal.addEventListener('click', closeModal);
  const btnCancelModal = document.getElementById('btn-cancel-modal');
  if (btnCancelModal) btnCancelModal.addEventListener('click', closeModal);

  // Catalog Category Filter Pills
  const filterPills = document.querySelectorAll('.catalog-pill');
  filterPills.forEach(pill => {
    pill.addEventListener('click', () => {
      filterPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      currentCatalogFilter = pill.getAttribute('data-filter');
      renderCatalog();
    });
  });

  // Catalog Search Input
  const searchInput = document.getElementById('catalog-search');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      currentCatalogSearch = e.target.value;
      renderCatalog();
    });
  }

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

  // Overview Trend Chart Time Range (1 Month, 2 Weeks, 1 Week)
  const overviewTimePills = document.querySelectorAll('#overview-time-pills .time-pill-btn');
  overviewTimePills.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      overviewTimePills.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const days = parseInt(btn.getAttribute('data-days'), 10) || 30;
      state.overviewRangeDays = days;
      renderOverviewTrendChart(days);
    });
  });
}

function switchTab(tabId) {
  state.currentTab = tabId;

  document.querySelectorAll('.nav-tab, .nav-tab-pill, .bottom-dock-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));

  const activeTabBtn = document.getElementById(`tab-btn-${tabId}`);
  const activeDockBtn = document.getElementById(`dock-btn-${tabId}`);
  const activePane = document.getElementById(`pane-${tabId}`);

  if (activeTabBtn) activeTabBtn.classList.add('active');
  if (activeDockBtn) activeDockBtn.classList.add('active');
  if (activePane) activePane.classList.add('active');

  // Trigger chart resize / update for newly visible tab
  setTimeout(() => {
    renderAllCharts();
  }, 50);
}

function updateDateDisplay() {
  const label = document.getElementById('habit-selected-date-label');
  const todayStr = getLocalDateString();
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
    state.activeProvider = auth.active_provider || 'whoop';

    // Update switcher pill buttons
    const btnWhoop = document.getElementById('btn-wearable-whoop');
    const btnGoogle = document.getElementById('btn-wearable-google');
    if (btnWhoop && btnGoogle) {
      if (state.activeProvider === 'google_fitbit') {
        btnGoogle.classList.add('active');
        btnWhoop.classList.remove('active');
      } else {
        btnWhoop.classList.add('active');
        btnGoogle.classList.remove('active');
      }
    }

    const pill = document.getElementById('connection-status-pill');
    const text = document.getElementById('connection-status-text');
    const btnConnect = document.getElementById('btn-connect');
    const isConnected = auth.connected;
    const providerName = state.activeProvider === 'google_fitbit' ? 'Fitbit' : 'WHOOP';

    if (isConnected) {
      pill.className = 'status-pill status-connected';
      text.textContent = auth.user ? (auth.user.first_name || `${providerName} Linked`) : `${providerName} Linked`;
      btnConnect.textContent = `${providerName} Linked`;
      btnConnect.style.background = 'rgba(0, 240, 118, 0.15)';
      btnConnect.style.color = '#00F076';
      btnConnect.style.border = '1px solid rgba(0, 240, 118, 0.3)';
    } else if (auth.has_data) {
      pill.className = 'status-pill status-demo';
      text.textContent = `${providerName} Demo`;
      btnConnect.textContent = `Connect ${providerName}`;
      btnConnect.style.background = '';
      btnConnect.style.color = '';
      btnConnect.style.border = '';
    } else {
      pill.className = 'status-pill status-disconnected';
      text.textContent = 'Disconnected';
      btnConnect.textContent = `Connect ${providerName}`;
      btnConnect.style.background = '';
      btnConnect.style.color = '';
      btnConnect.style.border = '';
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
      const todayStr = getLocalDateString();
      const currentVal = document.getElementById('date-selector').value;
      if (!currentVal || currentVal > todayStr || currentVal === todayStr) {
        state.selectedDate = latestDate;
        document.getElementById('date-selector').value = latestDate;
        updateDateDisplay();
      }
    }

    updateAllViews();
    await loadAICoachInsights();
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
      renderCatalog();
    }
  } catch (err) {
    console.error('Failed to create habit:', err);
  }
}

// -------------------------------------------------------------
// Predefined Habit Catalog Logic
// -------------------------------------------------------------
let currentCatalogFilter = 'All';
let currentCatalogSearch = '';

async function loadHabitCatalog() {
  try {
    const res = await fetch('/api/habits/catalog');
    const data = await res.json();
    state.catalog = data.catalog || [];
    renderCatalog();
  } catch (err) {
    console.error('Failed to load habit catalog:', err);
  }
}

function renderCatalog() {
  const container = document.getElementById('catalog-grid');
  if (!container) return;
  container.innerHTML = '';

  const trackedIds = new Set((state.habits || []).map(h => h.id));
  const query = currentCatalogSearch.toLowerCase().trim();

  const filtered = (state.catalog || []).filter(item => {
    const matchesFilter = currentCatalogFilter === 'All' || item.category === currentCatalogFilter;
    const matchesSearch = !query || 
      item.name.toLowerCase().includes(query) || 
      item.description.toLowerCase().includes(query) ||
      item.category.toLowerCase().includes(query);
    return matchesFilter && matchesSearch;
  });

  if (filtered.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; color: var(--text-muted); padding: 30px 10px;">
        No habits match your search or filter. Try another keyword or create a custom habit!
      </div>
    `;
    return;
  }

  filtered.forEach(item => {
    const isTracked = trackedIds.has(item.id);
    const card = document.createElement('div');
    card.className = 'catalog-card';
    card.innerHTML = `
      <div>
        <div class="catalog-card-header">
          <div class="catalog-card-title">
            <span class="catalog-card-icon">${item.icon}</span>
            <span>${item.name}</span>
          </div>
          <span class="catalog-impact-badge">${item.impact || '+Impact'}</span>
        </div>
        <p class="catalog-card-desc" style="margin-top: 8px;">${item.description}</p>
      </div>
      <div class="catalog-card-footer">
        <span class="catalog-category-tag">${item.category}</span>
        ${isTracked ? 
          '<button class="btn-catalog-action btn-catalog-tracked" disabled>✓ Active in Tracker</button>' : 
          `<button class="btn-catalog-action btn-catalog-add" data-id="${item.id}">+ Add to Tracker</button>`
        }
      </div>
    `;

    const addBtn = card.querySelector('.btn-catalog-add');
    if (addBtn) {
      addBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        addBtn.disabled = true;
        addBtn.textContent = 'Adding...';
        await addPredefinedHabit(item);
      });
    }

    container.appendChild(card);
  });
}

async function addPredefinedHabit(item) {
  try {
    const res = await fetch('/api/habits/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: item.id,
        name: item.name,
        category: item.category,
        icon: item.icon,
        description: item.description,
        impact: item.impact
      })
    });
    if (res.ok) {
      await loadHabitsAndLogs();
      await loadCorrelations();
      renderCatalog();
    }
  } catch (err) {
    console.error('Failed to add habit from catalog:', err);
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
  const todayLocal = getLocalDateString();
  if (state.selectedDate > todayLocal) {
    state.selectedDate = todayLocal;
    const dateInput = document.getElementById('date-selector');
    if (dateInput) dateInput.value = todayLocal;
  }

  const dayRecord = state.data.history.find(h => h.date === state.selectedDate) || null;

  updateOverviewGauges(dayRecord);
  updateRecoveryLabView(dayRecord);
  updateSleepArchitectureView(dayRecord);
  updateStrainWorkoutsView(dayRecord);
  renderAICoachInsights(state.aiInsights);
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

    // Reset status capsules
    const capRec = document.getElementById('cap-rec-val');
    if (capRec) capRec.textContent = '--';
    const capSleep = document.getElementById('cap-sleep-val');
    if (capSleep) capSleep.textContent = '--';
    const capStrain = document.getElementById('cap-strain-val');
    if (capStrain) capStrain.textContent = '--';
    const capHrv = document.getElementById('cap-hrv-val');
    if (capHrv) capHrv.textContent = '--';

    // Reset micro-trend stats
    const topHrv = document.getElementById('top-stat-hrv');
    if (topHrv) topHrv.textContent = '--';
    const topRhr = document.getElementById('top-stat-rhr');
    if (topRhr) topRhr.textContent = '--';
    const topSleep = document.getElementById('top-stat-sleep');
    if (topSleep) topSleep.textContent = '--';

    // Reset summary box
    const sumBadge = document.getElementById('summary-badge-tier');
    if (sumBadge) {
      sumBadge.textContent = 'NO DATA';
      sumBadge.className = 'badge badge-yellow';
    }
    const sumRec = document.getElementById('sum-rec-score');
    if (sumRec) sumRec.textContent = '--';
    const sumDebt = document.getElementById('sum-debt-score');
    if (sumDebt) sumDebt.textContent = '--';
    const sumFooter = document.getElementById('sum-footer-text');
    if (sumFooter) sumFooter.textContent = 'No biometric telemetry recorded for this selected date.';

    // Reset protocol card
    const featAdvice = document.getElementById('feature-card-advice');
    if (featAdvice) featAdvice.textContent = 'No WHOOP telemetry recorded for this date. Log activity or sync WHOOP to view protocol.';
    const featStrain = document.getElementById('feat-target-strain');
    if (featStrain) featStrain.textContent = '--';
    const featFocus = document.getElementById('feat-focus-label');
    if (featFocus) featFocus.textContent = 'Rest & Recovery';

    // Reset steps
    const capSteps = document.getElementById('cap-steps');
    if (capSteps) capSteps.classList.add('hidden');
    const sumStepsRow = document.getElementById('sum-steps-row');
    if (sumStepsRow) sumStepsRow.classList.add('hidden');

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

  // Status Capsules: Steps (Visible ONLY in Google Fitbit mode; clearly hidden in WHOOP mode)
  const isGoogle = state.activeProvider === 'google_fitbit';
  const capSteps = document.getElementById('cap-steps');
  const capStepsVal = document.getElementById('cap-steps-val');
  const sumStepsRow = document.getElementById('sum-steps-row');
  const sumStepsVal = document.getElementById('sum-steps-val');

  if (isGoogle && dayRecord.strain && dayRecord.strain.steps !== undefined && dayRecord.strain.steps !== null) {
    const formattedSteps = Number(dayRecord.strain.steps).toLocaleString();
    if (capSteps) {
      capSteps.classList.remove('hidden');
      if (capStepsVal) capStepsVal.textContent = formattedSteps;
    }
    if (sumStepsRow) {
      sumStepsRow.classList.remove('hidden');
      if (sumStepsVal) sumStepsVal.textContent = formattedSteps;
    }
  } else {
    if (capSteps) capSteps.classList.add('hidden');
    if (sumStepsRow) sumStepsRow.classList.add('hidden');
  }

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
  const hasSleep = sleep && (sleep.total_asleep_min > 0 || sleep.total_in_bed_min > 0);

  if (!hasSleep) {
    const elWindow = document.getElementById('sleep-window-times');
    if (elWindow) elWindow.textContent = 'No sleep recorded for this date';
    const elRestVal = document.getElementById('sleep-restorative-val');
    if (elRestVal) elRestVal.textContent = '--%';
    const elRestStatus = document.getElementById('sleep-restorative-status');
    if (elRestStatus) {
      elRestStatus.textContent = 'NO DATA';
      elRestStatus.className = 'pill-badge badge-slate';
    }

    ['hypno-seg-deep', 'hypno-seg-rem', 'hypno-seg-light', 'hypno-seg-awake'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.width = '0%';
    });

    ['legend-deep-val', 'legend-rem-val', 'legend-light-val', 'legend-awake-val'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = '--';
    });

    const setTxt = (id, txt) => { const el = document.getElementById(id); if (el) el.textContent = txt; };
    setTxt('stage-deep-time', '--');
    setTxt('stage-deep-pct', '--% of sleep');
    setTxt('stage-rem-time', '--');
    setTxt('stage-rem-pct', '--% of sleep');
    setTxt('stage-light-time', '--');
    setTxt('stage-light-pct', '--% of sleep');
    setTxt('stage-awake-time', '--');
    setTxt('stage-awake-disturbances', '-- disturbances');
    setTxt('stage-cycles-val', '--');
    setTxt('stage-inbed-val', '--');

    setTxt('sleep-eff-exact', '--%');
    setTxt('sleep-consistency-val', '--%');
    setTxt('sleep-resp-rate-val', '-- rpm');
    setTxt('sleep-perf-val', '--%');

    setTxt('sleep-baseline-need', '--h --m');
    setTxt('sleep-debt-val', '-- min');
    setTxt('sleep-strain-need', '-- min');
    setTxt('sleep-total-need-val', '--h --m');
    return;
  }

  // Active sleep values
  const totalAsleepMin = sleep.total_asleep_min || 0;
  const swsMin = sleep.slow_wave_sleep_min || 0;
  const remMin = sleep.rem_sleep_min || 0;
  const lightMin = sleep.light_sleep_min || 0;
  const awakeMin = sleep.awake_min || 0;
  const inBedMin = sleep.total_in_bed_min || (totalAsleepMin + awakeMin);

  // Percentages of total asleep time
  const deepPct = totalAsleepMin > 0 ? Math.round((swsMin / totalAsleepMin) * 100) : 0;
  const remPct = totalAsleepMin > 0 ? Math.round((remMin / totalAsleepMin) * 100) : 0;
  const lightPct = totalAsleepMin > 0 ? Math.round((lightMin / totalAsleepMin) * 100) : 0;

  // Hypnogram bar percentages (out of total in bed)
  const barTotal = Math.max(inBedMin, totalAsleepMin + awakeMin, 1);
  const barDeepPct = Math.round((swsMin / barTotal) * 100);
  const barRemPct = Math.round((remMin / barTotal) * 100);
  const barLightPct = Math.round((lightMin / barTotal) * 100);
  const barAwakePct = Math.max(0, 100 - (barDeepPct + barRemPct + barLightPct));

  // Restorative Sleep (Deep + REM)
  const restorativeMin = swsMin + remMin;
  const restorativePct = totalAsleepMin > 0 ? Math.round((restorativeMin / totalAsleepMin) * 100) : 0;

  // Sleep Window
  const elWindow = document.getElementById('sleep-window-times');
  if (elWindow) {
    if (sleep.start && sleep.end) {
      const startD = new Date(sleep.start);
      const endD = new Date(sleep.end);
      const startStr = startD.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
      const endStr = endD.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
      elWindow.textContent = `Bedtime: ${startStr} ➔ Wake: ${endStr} • Total In Bed: ${formatMinutesToHours(inBedMin)} • Total Asleep: ${formatMinutesToHours(totalAsleepMin)}`;
    } else {
      elWindow.textContent = `Total In Bed: ${formatMinutesToHours(inBedMin)} • Total Asleep: ${formatMinutesToHours(totalAsleepMin)}`;
    }
  }

  // Restorative status
  const elRestVal = document.getElementById('sleep-restorative-val');
  if (elRestVal) elRestVal.textContent = `${restorativePct}% (${formatMinutesToHours(restorativeMin)})`;
  const restStatus = document.getElementById('sleep-restorative-status');
  if (restStatus) {
    if (restorativePct >= 40) {
      restStatus.textContent = 'OPTIMAL (≥40%)';
      restStatus.className = 'pill-badge badge-green';
    } else if (restorativePct >= 35) {
      restStatus.textContent = 'GOOD (35-39%)';
      restStatus.className = 'pill-badge badge-yellow';
    } else {
      restStatus.textContent = 'SUB-OPTIMAL (<35%)';
      restStatus.className = 'pill-badge badge-red';
    }
  }

  // Update Hypnogram bar widths
  const setWidth = (id, pct) => { const el = document.getElementById(id); if (el) el.style.width = `${pct}%`; };
  setWidth('hypno-seg-deep', barDeepPct);
  setWidth('hypno-seg-rem', barRemPct);
  setWidth('hypno-seg-light', barLightPct);
  setWidth('hypno-seg-awake', barAwakePct);

  const setTxt = (id, txt) => { const el = document.getElementById(id); if (el) el.textContent = txt; };
  setTxt('legend-deep-val', `${swsMin}m (${deepPct}%)`);
  setTxt('legend-rem-val', `${remMin}m (${remPct}%)`);
  setTxt('legend-light-val', `${lightMin}m (${lightPct}%)`);
  setTxt('legend-awake-val', `${awakeMin}m`);

  // Stage Cards
  setTxt('stage-deep-time', formatMinutesToHours(swsMin));
  setTxt('stage-deep-pct', `${deepPct}% of sleep (${swsMin} min)`);
  const chipDeep = document.getElementById('chip-deep-optimal');
  if (chipDeep) {
    chipDeep.textContent = deepPct >= 20 && deepPct <= 25 ? '✓ Optimal (20-25%)' : (deepPct > 25 ? '↑ High (>25%)' : '↓ Low (<20%)');
  }

  setTxt('stage-rem-time', formatMinutesToHours(remMin));
  setTxt('stage-rem-pct', `${remPct}% of sleep (${remMin} min)`);
  const chipRem = document.getElementById('chip-rem-optimal');
  if (chipRem) {
    chipRem.textContent = remPct >= 20 && remPct <= 25 ? '✓ Optimal (20-25%)' : (remPct > 25 ? '↑ High (>25%)' : '↓ Low (<20%)');
  }

  setTxt('stage-light-time', formatMinutesToHours(lightMin));
  setTxt('stage-light-pct', `${lightPct}% of sleep (${lightMin} min)`);

  setTxt('stage-awake-time', `${awakeMin} min`);
  const distCount = sleep.disturbance_count ?? '--';
  setTxt('stage-awake-disturbances', `${distCount} wake events`);
  setTxt('stage-cycles-val', sleep.sleep_cycles ?? '--');
  setTxt('stage-inbed-val', formatMinutesToHours(inBedMin));

  // Quality Metrics
  const effPct = sleep.efficiency_percentage || (inBedMin > 0 ? Math.round((totalAsleepMin / inBedMin) * 100) : 0);
  setTxt('sleep-eff-exact', `${effPct}%`);
  setTxt('sleep-consistency-val', sleep.consistency_percentage ? `${sleep.consistency_percentage}%` : 'N/A');
  setTxt('sleep-resp-rate-val', sleep.respiratory_rate ? `${sleep.respiratory_rate} rpm` : '-- rpm');
  setTxt('sleep-perf-val', `${sleep.performance_percentage || sleep.score || '--'}%`);

  // Sleep Need Decomposition
  const need = sleep.need || {};
  const baseNeed = need.baseline_min || 480;
  const debt = need.debt_min || 0;
  const strainNeed = need.strain_min || 0;
  const totalNeed = need.total_min || (baseNeed + debt + strainNeed);

  setTxt('sleep-baseline-need', formatMinutesToHours(baseNeed));
  setTxt('sleep-debt-val', `+${debt} min`);
  setTxt('sleep-strain-need', `+${strainNeed} min`);
  setTxt('sleep-total-need-val', formatMinutesToHours(totalNeed));
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

  // Steps Chip Handling: Only visible in Google Fitbit mode; clearly hidden in WHOOP mode
  const isGoogle = state.activeProvider === 'google_fitbit';
  const stepsChip = document.getElementById('fitbit-steps-chip');

  if (isGoogle && dayRecord && dayRecord.strain && dayRecord.strain.steps !== undefined && dayRecord.strain.steps !== null) {
    if (stepsChip) {
      stepsChip.classList.remove('hidden');
      const steps = Number(dayRecord.strain.steps) || 0;
      const stepsValEl = document.getElementById('fitbit-steps-val');
      if (stepsValEl) stepsValEl.textContent = steps.toLocaleString();

      const pct = Math.round((steps / 10000) * 100);
      const badge = document.getElementById('fitbit-step-goal-badge');
      if (badge) {
        badge.textContent = `${pct}% GOAL`;
        badge.className = `badge ${pct >= 100 ? 'badge-green' : pct >= 60 ? 'badge-blue' : 'badge-yellow'}`;
      }

      const fill = document.getElementById('fitbit-step-progress-fill');
      if (fill) fill.style.width = `${Math.min(100, pct)}%`;

      const sub = document.getElementById('fitbit-steps-sub');
      if (sub) {
        const azm = dayRecord.strain.active_zone_minutes || 0;
        sub.textContent = `Goal: 10,000 • ${azm} Active Zone Min`;
      }
    }
  } else {
    if (stepsChip) stepsChip.classList.add('hidden');
  }

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

function renderOverviewTrendChart(rangeDays = state.overviewRangeDays || 30) {
  const elOverview = document.getElementById('overview-trend-chart');
  if (!elOverview) return;

  const rawHistory = state.data.history || [];
  if (rawHistory.length === 0) return;

  // Filter or slice history according to selected range
  const history = rawHistory.slice(-rangeDays);

  const labels = history.map(h => {
    const parts = h.date.split('-');
    return `${parts[1]}/${parts[2]}`;
  });

  const recoveryData = history.map(h => h.recovery?.score ?? null);
  const hrvData = history.map(h => h.recovery?.hrv_ms ?? null);

  if (state.charts.overview) {
    state.charts.overview.destroy();
  }

  const ctx = elOverview.getContext('2d');
  const gradRose = ctx.createLinearGradient(0, 0, 0, 240);
  gradRose.addColorStop(0, 'rgba(232, 67, 117, 0.18)');
  gradRose.addColorStop(1, 'rgba(232, 67, 117, 0.00)');

  const gradBlue = ctx.createLinearGradient(0, 0, 0, 240);
  gradBlue.addColorStop(0, 'rgba(48, 110, 232, 0.16)');
  gradBlue.addColorStop(1, 'rgba(48, 110, 232, 0.00)');

  // Point radius: for shorter windows like 7 or 14 days, show subtle dots for easier reading & tapping
  const ptRadius = rangeDays <= 14 ? 3 : 0;

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
          pointRadius: ptRadius,
          pointHoverRadius: 6,
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
          pointRadius: ptRadius,
          pointHoverRadius: 6,
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
          ticks: { color: '#6A7282', font: { size: 10, family: 'Inter' }, maxTicksLimit: rangeDays <= 7 ? 7 : (rangeDays <= 14 ? 7 : 8) }
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

  // Dedicated Sleep History (filtering to when sleep data is available from 08/21 onwards, capped to last 30 days)
  const sleepEligible = history.filter(h => h.date >= '2026-08-21');
  const sleepHistory = sleepEligible.length > 30 ? sleepEligible.slice(-30) : (sleepEligible.length > 0 ? sleepEligible : history.slice(-30));

  const sleepLabels = sleepHistory.map(h => {
    const parts = h.date.split('-');
    return `${parts[1]}/${parts[2]}`;
  });

  const deepSleepData = sleepHistory.map(h => h.sleep?.slow_wave_sleep_min ?? 0);
  const remSleepData = sleepHistory.map(h => h.sleep?.rem_sleep_min ?? 0);
  const lightSleepData = sleepHistory.map(h => h.sleep?.light_sleep_min ?? 0);
  const awakeData = sleepHistory.map(h => h.sleep?.awake_min ?? 0);
  const sleepNeedData = sleepHistory.map(h => h.sleep?.need?.total_min ? Math.round((h.sleep.need.total_min / 60) * 10) / 10 : 8.0);
  const sleepActualData = sleepHistory.map(h => h.sleep?.total_asleep_min ? Math.round((h.sleep.total_asleep_min / 60) * 10) / 10 : 0);

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
  if (!state.charts.overview || state.currentTab === 'overview') {
    renderOverviewTrendChart(state.overviewRangeDays || 30);
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

  // 4. Sleep Stages Deep Chart (Filtered to last 30 days of available sleep data)
  const elSleepStages = document.getElementById('sleep-stages-deep-chart');
  if (elSleepStages && (!state.charts.sleepStages || state.currentTab === 'sleep')) {
    if (state.charts.sleepStages) state.charts.sleepStages.destroy();
    state.charts.sleepStages = new Chart(elSleepStages.getContext('2d'), {
      type: 'bar',
      data: {
        labels: sleepLabels,
        datasets: [
          { label: 'Deep (SWS)', data: deepSleepData, backgroundColor: '#00E5FF', stack: 'Sleep' },
          { label: 'REM', data: remSleepData, backgroundColor: '#A855F7', stack: 'Sleep' },
          { label: 'Light', data: lightSleepData, backgroundColor: '#475569', stack: 'Sleep' },
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

  // 5. Sleep Need vs Actual Chart (Filtered to last 30 days of available sleep data)
  const elSleepNeed = document.getElementById('sleep-need-chart');
  if (elSleepNeed && (!state.charts.sleepNeed || state.currentTab === 'sleep')) {
    if (state.charts.sleepNeed) state.charts.sleepNeed.destroy();
    state.charts.sleepNeed = new Chart(elSleepNeed.getContext('2d'), {
      type: 'line',
      data: {
        labels: sleepLabels,
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

// -------------------------------------------------------------
// Multi-Wearable Provider & Sync Operations
// -------------------------------------------------------------

async function switchWearableProvider(provider) {
  try {
    const res = await fetch('/api/wearable/switch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider })
    });
    const result = await res.json();
    if (result.success) {
      state.activeProvider = result.active_provider;
      await loadAuthStatus();
      await loadDashboardData();
      await loadHabitsAndLogs();
      await loadCorrelations();
      await loadHypertrophyData();
      await loadAICoachInsights();
    }
  } catch (err) {
    console.error('Error switching wearable provider:', err);
  }
}

async function syncWearableData() {
  const btn = document.getElementById('btn-sync');
  const originalHtml = btn.innerHTML;
  btn.innerHTML = '<span>Syncing...</span>';
  btn.disabled = true;

  try {
    const res = await fetch('/api/wearable/sync', { method: 'POST' });
    const result = await res.json();
    if (res.ok) {
      await loadDashboardData();
      await loadCorrelations();
      await loadHypertrophyData();
      await loadAICoachInsights();
      const pName = state.activeProvider === 'google_fitbit' ? 'Fitbit / Google Health' : 'WHOOP';
      alert(`Synced ${result.synced_days || 30} days of ${pName} data!`);
    } else {
      alert(`Sync failed: ${result.message || 'Check your wearable connection.'}`);
    }
  } catch (err) {
    alert(`Sync error: ${err.message}`);
  } finally {
    btn.innerHTML = originalHtml;
    btn.disabled = false;
  }
}

// -------------------------------------------------------------
// Apex AI Physiological Copilot Operations
// -------------------------------------------------------------

async function loadAICoachInsights() {
  try {
    const res = await fetch(`/api/ai/coach/insights?date=${state.selectedDate}`);
    if (!res.ok) return;
    const data = await res.json();
    if (data.success && data.insights) {
      state.aiInsights = data.insights;
      renderAICoachInsights(data.insights);
    }
  } catch (err) {
    console.error('Error fetching AI coach insights:', err);
  }
}

function renderAICoachInsights(insights) {
  if (!insights) return;

  // Engine model tag
  const elModel = document.getElementById('ai-engine-tag');
  if (elModel && insights.model) {
    elModel.textContent = `⚡ ${insights.model}`;
  }

  // Vitals timestamp subtext
  const elTimestamp = document.getElementById('ai-vitals-timestamp');
  if (elTimestamp && insights.vitals) {
    const hrv = insights.vitals.hrv ? `${insights.vitals.hrv}ms` : '--';
    const rhr = insights.vitals.rhr ? `${insights.vitals.rhr}bpm` : '--';
    const rec = insights.vitals.recovery ? `${insights.vitals.recovery}%` : '--';
    elTimestamp.textContent = `Analyzing ${insights.date || state.selectedDate} • HRV: ${hrv} • RHR: ${rhr} • Recovery: ${rec}`;
  }

  // Stress Status Pill & Details
  if (insights.stress) {
    const elStressPill = document.getElementById('ai-stress-pill');
    const elStressDot = document.getElementById('ai-stress-dot');
    const elStressLabel = document.getElementById('ai-stress-label');
    const elStressScore = document.getElementById('ai-stress-score');
    const elHrvDelta = document.getElementById('ai-hrv-delta');
    const elStressDetails = document.getElementById('ai-stress-details');

    const score = insights.stress.score !== undefined ? insights.stress.score : 3;
    const label = insights.stress.title || insights.stress.label || insights.stress.state || (score <= 3 ? 'Parasympathetic Equilibrium' : 'Autonomic Alert');
    const details = insights.stress.details || insights.stress.summary || '';
    const hrvDelta = insights.stress.hrv_delta_pct !== undefined ? insights.stress.hrv_delta_pct : (insights.stress.hrvDeltaPct || 0);

    let color = '#00F076';
    if (score >= 8) color = '#FF3B30';
    else if (score >= 6) color = '#FF9F0A';
    else if (score >= 4) color = '#FFDE37';

    if (elStressLabel) elStressLabel.textContent = label.toUpperCase();
    if (elStressScore) elStressScore.textContent = `Score: ${score}/10`;

    if (elHrvDelta) {
      const deltaSign = hrvDelta >= 0 ? '+' : '';
      elHrvDelta.textContent = `HRV: ${deltaSign}${hrvDelta}% vs 7d Baseline`;
      elHrvDelta.style.color = hrvDelta >= 0 ? '#00F076' : '#FF9F0A';
    }

    if (elStressDetails) elStressDetails.textContent = details;

    if (elStressPill) {
      elStressPill.style.borderColor = `${color}55`;
      elStressPill.style.background = `${color}15`;
    }
    if (elStressDot) {
      elStressDot.className = 'status-dot';
      elStressDot.style.background = color;
      elStressDot.style.boxShadow = `0 0 10px ${color}`;
    }
  }

  // Breathwork Prescription Card
  if (insights.breathwork) {
    const elName = document.getElementById('ai-breath-name');
    const elDuration = document.getElementById('ai-breath-duration');
    const elDesc = document.getElementById('ai-breath-desc');

    const durationText = insights.breathwork.duration || 
      (insights.breathwork.duration_min ? `${insights.breathwork.duration_min} min • ${insights.breathwork.cycles || 12} cycles` : '5 min • 25 cycles');

    if (elName) elName.textContent = insights.breathwork.name;
    if (elDuration) elDuration.textContent = durationText;
    if (elDesc) elDesc.textContent = insights.breathwork.instructions;

    const bName = (insights.breathwork.name || '').toLowerCase();
    if (bName.includes('4-7-8') || bName.includes('vagal')) {
      selectPacerProtocol('478', false);
    } else if (bName.includes('box')) {
      selectPacerProtocol('box', false);
    } else {
      selectPacerProtocol('sigh', false);
    }
  }

  // Sleep Work Card
  const sleepWork = Array.isArray(insights.sleep_work) ? insights.sleep_work[0] : (insights.sleepWork || null);
  if (sleepWork) {
    const elTarget = document.getElementById('ai-sleep-target');
    const elImpact = document.getElementById('ai-sleep-impact');
    const elAction = document.getElementById('ai-sleep-action');

    if (elTarget) elTarget.textContent = sleepWork.target;
    if (elImpact) elImpact.textContent = sleepWork.impact || sleepWork.expectedImpact || '';
    if (elAction) elAction.textContent = sleepWork.action || sleepWork.actionProtocol || '';
  }
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

async function handleAICoachQuery(prompt) {
  const box = document.getElementById('ai-chat-response-box');
  const container = document.getElementById('ai-chat-messages-container');
  if (!box || !container) return;

  if (!Array.isArray(state.chatHistory)) {
    state.chatHistory = [];
  }

  box.classList.remove('hidden');
  const providerName = state.activeProvider === 'google_fitbit' ? 'Google Fitbit' : 'WHOOP';

  // 1. Append User Message Bubble
  const userRow = document.createElement('div');
  userRow.className = 'chat-message-row chat-user-row';
  userRow.innerHTML = `
    <div class="chat-bubble chat-bubble-user">
      <div class="chat-sender-label-user">You</div>
      <div>${escapeHtml(prompt)}</div>
    </div>
  `;
  container.appendChild(userRow);

  // 2. Append Loading / Syncing Indicator Bubble
  const loadingRow = document.createElement('div');
  loadingRow.className = 'chat-message-row chat-coach-row';
  loadingRow.id = 'chat-loading-bubble';
  loadingRow.innerHTML = `
    <div class="chat-bubble chat-bubble-coach chat-bubble-loading">
      <div class="chat-loading-spinner"></div>
      <span id="chat-loading-text">🔄 Step 1/2: Syncing latest telemetry from ${providerName}...</span>
    </div>
  `;
  container.appendChild(loadingRow);
  container.scrollTop = container.scrollHeight;
  const formInput = document.getElementById('form-ai-coach-chat');
  if (formInput) formInput.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

  // Transition loading text to synthesis after 650ms
  const stageTimer = setTimeout(() => {
    const textEl = document.getElementById('chat-loading-text');
    if (textEl) {
      textEl.textContent = '🧠 Step 2/2: WHOOP Coach: Synthesizing recovery & biometrics...';
      textEl.style.color = '#38BDF8';
    }
  }, 650);

  try {
    const res = await fetch('/api/ai/coach/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        date: state.selectedDate,
        sync: true,
        conversationHistory: state.chatHistory.slice(-6)
      })
    });
    clearTimeout(stageTimer);
    const data = await res.json();

    // Remove loading bubble
    const loader = document.getElementById('chat-loading-bubble');
    if (loader) loader.remove();

    if (!data.success) {
      const errRow = document.createElement('div');
      errRow.className = 'chat-message-row chat-coach-row';
      errRow.innerHTML = `
        <div class="chat-bubble chat-bubble-coach" style="border-color: rgba(239,68,68,0.4);">
          <p style="color: #F87171; margin: 0;">⚠️ ${escapeHtml(data.error || 'Failed to generate physiological assessment')}</p>
        </div>
      `;
      container.appendChild(errRow);
      container.scrollTop = container.scrollHeight;
      return;
    }

    // Refresh dashboard if new wearable records were synced
    if (data.syncDetails?.synced && data.syncDetails?.newRecords > 0) {
      try {
        loadData(false);
      } catch (e) {
        console.warn('Silent dashboard reload error:', e);
      }
    }

    let formatted = data.reply
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\*\*(.*?)\*\*/g, '<strong style="color: #FFFFFF;">$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/^### (.*$)/gim, '<h4 style="color: #FFFFFF; font-size: 14.5px; margin: 10px 0 6px 0; font-family: var(--font-display);">$1</h4>')
      .replace(/^## (.*$)/gim, '<h3 style="color: #FFFFFF; font-size: 15px; margin: 12px 0 8px 0; font-family: var(--font-display);">$1</h3>')
      .replace(/^>\s*(.*$)/gim, '<div style="background: rgba(48,110,232,0.1); border-left: 3px solid #306EE8; padding: 6px 10px; margin: 6px 0; border-radius: 4px; font-size: 12px; color: #94A3B8;">$1</div>')
      .replace(/^\s*[-•]\s+(.*$)/gim, '<li style="margin-bottom: 4px; color: #CBD5E1; line-height: 1.5;">$1</li>')
      .replace(/\n\n+/g, '</p><p style="margin-bottom: 10px; color: #E2E8F0; line-height: 1.55;">')
      .replace(/\n/g, '<br>');

    if (formatted.includes('<li')) {
      formatted = formatted.replace(/(<li.*<\/li>)/s, '<ul style="padding-left: 18px; margin: 6px 0 10px 0;">$1</ul>');
    }

    const badgeSource = (data.source && data.source.includes('Gemini'))
      ? `${data.source}`
      : 'WHOOP Clinical Engine';

    // 3. Append Coach Response Bubble
    const coachRow = document.createElement('div');
    coachRow.className = 'chat-message-row chat-coach-row';
    coachRow.innerHTML = `
      <div class="chat-bubble chat-bubble-coach">
        <div class="chat-sender-header-coach">
          <span class="coach-sender-title">⚡ WHOOP Coach</span>
          <span class="coach-model-badge">${badgeSource}</span>
        </div>
        <div style="font-size: 13px; line-height: 1.55; color: #E2E8F0;">
          <p style="margin-bottom: 0;">${formatted}</p>
        </div>
      </div>
    `;
    container.appendChild(coachRow);
    container.scrollTop = container.scrollHeight;

    // 4. Memorize this turn in active session memory
    state.chatHistory.push(
      { role: 'user', text: prompt },
      { role: 'model', text: data.reply }
    );

    const formInput = document.getElementById('form-ai-coach-chat');
    if (formInput) formInput.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  } catch (err) {
    clearTimeout(stageTimer);
    const loader = document.getElementById('chat-loading-bubble');
    if (loader) loader.remove();

    const errRow = document.createElement('div');
    errRow.className = 'chat-message-row chat-coach-row';
    errRow.innerHTML = `
      <div class="chat-bubble chat-bubble-coach" style="border-color: rgba(239,68,68,0.4);">
        <p style="color: #F87171; margin: 0;">⚠️ Network error: ${escapeHtml(err.message)}</p>
      </div>
    `;
    container.appendChild(errRow);
    container.scrollTop = container.scrollHeight;
  }
}

// -------------------------------------------------------------
// Autonomic Vagal Regulation & Guided Breathwork Engine (In-Page)
// -------------------------------------------------------------

const PACER_PROTOCOLS = {
  sigh: {
    key: 'sigh',
    title: 'Cyclic Physiological Sigh',
    purpose: 'Acute Cortisol Reduction & Parasympathetic Tone Boost',
    cadence: '2s Inhale • 1s Sip • 6s Slow Exhale',
    durationText: '5 min • 25 cycles',
    totalCycles: 25,
    phases: [
      { name: 'Inhale Nose', duration: 2, scale: 1.28, glow: 0.5, instruction: 'Inhale deeply through your nose' },
      { name: 'Top-Off Sip', duration: 1, scale: 1.5, glow: 0.9, instruction: 'Take a second quick sip of air at the top' },
      { name: 'Slow Sigh Out', duration: 6, scale: 0.85, glow: 0.15, instruction: 'Slowly sigh all air out through your mouth' }
    ]
  },
  '478': {
    key: '478',
    title: '4-7-8 Vagal Nerve Reset',
    purpose: 'Circadian Sleep Priming & Deep Sleep Consolidation',
    cadence: '4s Inhale • 7s Hold • 8s Exhale',
    durationText: '3 min • 8 cycles',
    totalCycles: 8,
    phases: [
      { name: 'Inhale Nose', duration: 4, scale: 1.4, glow: 0.5, instruction: 'Inhale silently through the nose' },
      { name: 'Hold Breath', duration: 7, scale: 1.4, glow: 0.7, instruction: 'Hold breath with relaxed diaphragm' },
      { name: 'Whoosh Exhale', duration: 8, scale: 0.85, glow: 0.2, instruction: 'Exhale completely with whoosh sound' }
    ]
  },
  box: {
    key: 'box',
    title: 'Box Breathing (4-4-4-4)',
    purpose: 'Autonomic Nervous System Stabilization & Focus',
    cadence: '4s Inhale • 4s Hold • 4s Exhale • 4s Empty',
    durationText: '4 min • 12 cycles',
    totalCycles: 12,
    phases: [
      { name: 'Inhale', duration: 4, scale: 1.35, glow: 0.5, instruction: 'Inhale smooth and even through nose' },
      { name: 'Hold Full', duration: 4, scale: 1.35, glow: 0.6, instruction: 'Hold breath comfortably' },
      { name: 'Exhale', duration: 4, scale: 0.85, glow: 0.2, instruction: 'Smooth, slow exhale through mouth' },
      { name: 'Hold Empty', duration: 4, scale: 0.85, glow: 0.3, instruction: 'Hold breath with lungs empty' }
    ]
  }
};

function selectPacerProtocol(protocolKey, resetTimer = true) {
  const proto = PACER_PROTOCOLS[protocolKey] || PACER_PROTOCOLS.sigh;
  state.pacer.selectedKey = proto.key;
  state.pacer.protocol = proto;
  state.pacer.phases = proto.phases;
  state.pacer.totalCycles = proto.totalCycles;

  // Update switcher buttons UI
  ['sigh', '478', 'box'].forEach(k => {
    const btn = document.getElementById(`btn-proto-${k}`);
    if (btn) {
      if (k === proto.key) btn.classList.add('active');
      else btn.classList.remove('active');
    }
  });

  // Update Intel Card
  const elTitle = document.getElementById('pacer-protocol-title');
  const elPurpose = document.getElementById('pacer-protocol-purpose');
  const elCadence = document.getElementById('pacer-protocol-cadence');
  const elDur = document.getElementById('pacer-protocol-duration');
  const elTotCycles = document.getElementById('pacer-total-cycles');

  if (elTitle) elTitle.textContent = proto.title;
  if (elPurpose) elPurpose.textContent = proto.purpose;
  if (elCadence) elCadence.textContent = proto.cadence;
  if (elDur) elDur.textContent = proto.durationText;
  if (elTotCycles) elTotCycles.textContent = proto.totalCycles;

  if (resetTimer) {
    resetPacerSession();
  }
}

function initPacerEngine(protocolKey = 'sigh') {
  selectPacerProtocol(protocolKey, true);
}

function togglePacerSession() {
  if (!state.pacer.active) {
    state.pacer.active = true;
    state.pacer.paused = false;
    state.pacer.currentCycle = 1;
    state.pacer.phaseIndex = 0;
    const currentPhase = state.pacer.phases[0];
    state.pacer.secondsLeft = currentPhase.duration;

    updatePacerControlsUI(true, false);
    applyPacerPhaseUI(currentPhase);

    if (state.pacer.intervalId) clearInterval(state.pacer.intervalId);
    state.pacer.intervalId = setInterval(tickPacer, 1000);
  } else if (state.pacer.paused) {
    state.pacer.paused = false;
    updatePacerControlsUI(true, false);
  } else {
    state.pacer.paused = true;
    updatePacerControlsUI(true, true);
  }
}

function resetPacerSession() {
  if (state.pacer.intervalId) {
    clearInterval(state.pacer.intervalId);
    state.pacer.intervalId = null;
  }
  state.pacer.active = false;
  state.pacer.paused = false;
  state.pacer.currentCycle = 0;
  state.pacer.phaseIndex = 0;
  state.pacer.secondsLeft = 0;

  updatePacerControlsUI(false, false);

  const elTimer = document.getElementById('pacer-timer');
  const elPhase = document.getElementById('pacer-phase');
  const elInst = document.getElementById('pacer-instructions');
  const elCurCycle = document.getElementById('pacer-current-cycle');
  const elProgBar = document.getElementById('pacer-progress-bar');
  const circle = document.getElementById('pacer-circle');
  const glow = document.getElementById('pacer-glow');

  if (elTimer) elTimer.textContent = '--';
  if (elPhase) elPhase.textContent = 'Get Ready';
  if (elInst) elInst.textContent = 'Click "Start Breathing Session" below to begin neuro-respiratory regulation.';
  if (elCurCycle) elCurCycle.textContent = '0';
  if (elProgBar) elProgBar.style.width = '0%';
  if (circle) {
    circle.style.transition = 'transform 0.5s ease-out';
    circle.style.transform = 'scale(1)';
  }
  if (glow) glow.style.opacity = '0.3';
}

function updatePacerControlsUI(isActive, isPaused) {
  const btnMainText = document.getElementById('btn-pacer-main-text');
  const statusText = document.getElementById('pacer-status-text');

  if (!btnMainText) return;

  if (!isActive) {
    btnMainText.textContent = '▶ Start Breathing Session';
    if (statusText) statusText.textContent = 'Standby';
  } else if (isPaused) {
    btnMainText.textContent = '▶ Resume Session';
    if (statusText) statusText.textContent = 'Session Paused';
  } else {
    btnMainText.textContent = '⏸ Pause Session';
    if (statusText) statusText.textContent = 'Live Pacing Active';
  }
}

function applyPacerPhaseUI(phase) {
  const elPhase = document.getElementById('pacer-phase');
  const elTimer = document.getElementById('pacer-timer');
  const elInst = document.getElementById('pacer-instructions');
  const elCurCycle = document.getElementById('pacer-current-cycle');
  const elProgBar = document.getElementById('pacer-progress-bar');
  const circle = document.getElementById('pacer-circle');
  const glow = document.getElementById('pacer-glow');

  if (elPhase) elPhase.textContent = phase.name;
  if (elTimer) elTimer.textContent = `${state.pacer.secondsLeft}s`;
  if (elInst) elInst.textContent = phase.instruction;
  if (elCurCycle) elCurCycle.textContent = state.pacer.currentCycle;

  if (elProgBar && state.pacer.totalCycles) {
    const pct = Math.min(100, Math.round((state.pacer.currentCycle / state.pacer.totalCycles) * 100));
    elProgBar.style.width = `${pct}%`;
  }

  if (circle) {
    circle.style.transition = `transform ${phase.duration}s cubic-bezier(0.4, 0, 0.2, 1)`;
    circle.style.transform = `scale(${phase.scale})`;
  }
  if (glow) {
    glow.style.opacity = phase.glow;
  }
}

function tickPacer() {
  if (!state.pacer.active || state.pacer.paused) return;

  state.pacer.secondsLeft -= 1;
  const elTimer = document.getElementById('pacer-timer');
  if (elTimer) elTimer.textContent = `${Math.max(0, state.pacer.secondsLeft)}s`;

  if (state.pacer.secondsLeft <= 0) {
    state.pacer.phaseIndex += 1;
    if (state.pacer.phaseIndex >= state.pacer.phases.length) {
      state.pacer.phaseIndex = 0;
      state.pacer.currentCycle += 1;

      if (state.pacer.currentCycle > state.pacer.totalCycles) {
        resetPacerSession();
        const statusText = document.getElementById('pacer-status-text');
        if (statusText) statusText.textContent = 'Session Complete! 🎉';
        alert('🎉 Neuro-Respiratory Session Complete! Autonomic tone down-regulated.');
        return;
      }
    }

    const nextPhase = state.pacer.phases[state.pacer.phaseIndex];
    state.pacer.secondsLeft = nextPhase.duration;
    applyPacerPhaseUI(nextPhase);
  }
}

// -------------------------------------------------------------
// PWA & Smartphone App Installation Controller
// -------------------------------------------------------------

let deferredPwaPrompt = null;

function initPwaController() {
  // 1. Register Service Worker for offline support & fast app load
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').then((reg) => {
        console.log('WHOOP-Apex PWA Service Worker registered:', reg.scope);
      }).catch((err) => {
        console.warn('PWA Service Worker registration warning:', err);
      });
    });
  }

  // 2. Check if already running as standalone installed app
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  if (isStandalone) {
    console.log('WHOOP-Apex is running in standalone PWA app mode');
    return;
  }

  // 3. Listen for Android/Chrome install prompt
  const banner = document.getElementById('pwa-install-banner');
  const btnInstall = document.getElementById('btn-pwa-install');
  const btnDismiss = document.getElementById('btn-pwa-dismiss');
  const instruction = document.getElementById('pwa-banner-instruction');

  const isDismissed = sessionStorage.getItem('pwa_banner_dismissed') === 'true';

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPwaPrompt = e;
    if (banner && !isDismissed) {
      banner.classList.remove('hidden');
    }
  });

  if (btnInstall) {
    btnInstall.addEventListener('click', async () => {
      if (deferredPwaPrompt) {
        deferredPwaPrompt.prompt();
        const { outcome } = await deferredPwaPrompt.userChoice;
        console.log('PWA installation prompt outcome:', outcome);
        deferredPwaPrompt = null;
        if (banner) banner.classList.add('hidden');
      } else {
        alert('📲 To install WHOOP-Apex on your smartphone:\n1. Tap the Share button in Safari/Chrome\n2. Select "Add to Home Screen"');
      }
    });
  }

  if (btnDismiss && banner) {
    btnDismiss.addEventListener('click', () => {
      banner.classList.add('hidden');
      sessionStorage.setItem('pwa_banner_dismissed', 'true');
    });
  }

  // 4. iOS Safari detection
  const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  if (isIos && !isStandalone && banner && !isDismissed) {
    if (instruction) {
      instruction.textContent = 'Tap Share [⎋] then "Add to Home Screen"';
    }
    if (window.innerWidth <= 768) {
      setTimeout(() => {
        banner.classList.remove('hidden');
      }, 2000);
    }
  }
}

