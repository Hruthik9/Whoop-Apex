require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const db = require('./services/db');
const whoopService = require('./services/whoop');
const googleHealthService = require('./services/googleHealth');
const aiCoachService = require('./services/aiCoach');
const analyticsService = require('./services/analytics');
const hypertrophyService = require('./services/hypertrophy');
const { populateDemoData } = require('./services/demoData');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// -------------------------------------------------------------
// WHOOP OAuth 2.0 Endpoints
// -------------------------------------------------------------

// 1. Initiate OAuth Login
app.get('/api/auth/login', (req, res) => {
  try {
    const authUrl = whoopService.getAuthorizationUrl();
    res.redirect(authUrl);
  } catch (err) {
    console.error('Error generating auth URL:', err);
    res.status(500).json({ error: 'Failed to generate authorization URL', details: err.message });
  }
});

// 2. OAuth Callback
app.get('/api/auth/callback', async (req, res) => {
  const { code, error, error_description } = req.query;

  if (error) {
    console.error('OAuth callback error:', error, error_description);
    return res.redirect(`/?auth_error=${encodeURIComponent(error_description || error)}`);
  }

  if (!code) {
    return res.redirect('/?auth_error=No_authorization_code_received');
  }

  try {
    await whoopService.exchangeCodeForTokens(code);
    // Initial sync
    try {
      await whoopService.syncAllData();
    } catch (syncErr) {
      console.warn('Initial sync warning:', syncErr.message);
    }
    res.redirect('/?connected=true');
  } catch (err) {
    console.error('Error in OAuth callback:', err);
    res.redirect(`/?auth_error=${encodeURIComponent(err.message)}`);
  }
});

// 3. Auth & Multi-Wearable Status
app.get('/api/auth/status', (req, res) => {
  const activeProvider = db.getActiveProvider();
  const tokensWhoop = db.getTokens('whoop');
  const tokensGoogle = db.getTokens('google_fitbit');
  const user = db.getUser();
  const biometrics = db.getBiometrics();
  const dates = Object.keys(biometrics).sort();

  res.json({
    active_provider: activeProvider,
    connected: activeProvider === 'google_fitbit' ? !!(tokensGoogle && tokensGoogle.access_token) : !!(tokensWhoop && tokensWhoop.access_token),
    providers: {
      whoop: {
        connected: !!(tokensWhoop && tokensWhoop.access_token),
        has_data: Object.keys(db.getBiometrics(null, 'whoop')).length > 0
      },
      google_fitbit: {
        connected: !!(tokensGoogle && tokensGoogle.access_token),
        has_data: Object.keys(db.getBiometrics(null, 'google_fitbit')).length > 0
      }
    },
    user: user || null,
    has_data: dates.length > 0,
    total_days: dates.length,
    latest_date: dates.length ? dates[dates.length - 1] : null
  });
});

// 4. Disconnect Active Wearable
app.post('/api/auth/disconnect', (req, res) => {
  const provider = db.getActiveProvider();
  db.clearTokens(provider);
  res.json({ success: true, message: `Disconnected ${provider} account` });
});

// -------------------------------------------------------------
// Google Health / Fitbit OAuth Endpoints
// -------------------------------------------------------------

app.get('/api/auth/google/login', (req, res) => {
  try {
    const authUrl = googleHealthService.getAuthorizationUrl();
    res.redirect(authUrl);
  } catch (err) {
    console.warn('Google/Fitbit auth redirect warning:', err.message);
    res.redirect(`/?auth_error=${encodeURIComponent('Fitbit / Google credentials not found in .env. Please configure GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET or use pre-seeded 30-day biometrics.')}`);
  }
});

app.get('/api/auth/google/status', (req, res) => {
  res.json({
    configured: !!(googleHealthService.clientId && googleHealthService.clientSecret),
    client_id_set: !!googleHealthService.clientId,
    redirect_uri: googleHealthService.redirectUri,
    provider: db.getActiveProvider()
  });
});

app.get('/api/auth/google/callback', async (req, res) => {
  const { code, error, error_description } = req.query;

  if (error) {
    console.error('Google/Fitbit OAuth callback error:', error, error_description);
    return res.redirect(`/?auth_error=${encodeURIComponent(error_description || error)}`);
  }

  if (!code) {
    return res.redirect('/?auth_error=No_authorization_code_received');
  }

  try {
    await googleHealthService.exchangeCodeForTokens(code);
    db.setActiveProvider('google_fitbit');
    try {
      await googleHealthService.syncAllData();
    } catch (syncErr) {
      console.warn('Initial Google sync warning:', syncErr.message);
    }
    res.redirect('/?connected=google_fitbit');
  } catch (err) {
    console.error('Error in Google OAuth callback:', err);
    res.redirect(`/?auth_error=${encodeURIComponent(err.message)}`);
  }
});

// -------------------------------------------------------------
// Wearable Provider Switching & Syncing
// -------------------------------------------------------------

app.post('/api/wearable/switch', (req, res) => {
  const { provider } = req.body;
  try {
    const active = db.setActiveProvider(provider);
    // If switching to google_fitbit and no biometrics exist yet, auto seed demo biometrics
    if (active === 'google_fitbit' && Object.keys(db.getBiometrics(null, 'google_fitbit')).length === 0) {
      googleHealthService.seedGoogleDemoData();
    }
    res.json({ success: true, active_provider: active });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/whoop/sync', async (req, res) => {
  try {
    const active = db.getActiveProvider();
    let result;
    if (active === 'google_fitbit') {
      result = await googleHealthService.syncAllData();
    } else {
      result = await whoopService.syncAllData();
    }
    res.json(result);
  } catch (err) {
    console.error('Sync failed:', err);
    res.status(500).json({ error: 'Sync failed', message: err.message });
  }
});

app.post('/api/wearable/sync', async (req, res) => {
  try {
    const active = db.getActiveProvider();
    const result = active === 'google_fitbit'
      ? await googleHealthService.syncAllData()
      : await whoopService.syncAllData();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Sync failed', message: err.message });
  }
});

// -------------------------------------------------------------
// Biometrics & Dashboard Data
// -------------------------------------------------------------

app.get('/api/data', (req, res) => {
  const provider = db.getActiveProvider();
  const biometrics = db.getBiometrics();
  const dates = Object.keys(biometrics).sort();

  const history = dates.map(date => ({
    date,
    ...biometrics[date]
  }));

  const latestDate = dates.length ? dates[dates.length - 1] : null;
  const latest = latestDate ? { date: latestDate, ...biometrics[latestDate] } : null;

  res.json({
    provider,
    user: db.getUser(),
    latest,
    history,
    total_days: dates.length
  });
});

// -------------------------------------------------------------
// Habits Management & Daily Logging
// -------------------------------------------------------------

// Get list of habits and today's logs
app.get('/api/habits', (req, res) => {
  const date = req.query.date || new Date().toISOString().split('T')[0];
  const habits = db.getHabits();
  const dailyLogs = db.getHabitLogs(date);
  const allLogs = db.getHabitLogs();

  res.json({
    date,
    habits,
    daily_logs: dailyLogs,
    all_logs: allLogs
  });
});

// Log habits for a specific date
app.post('/api/habits/log', (req, res) => {
  const { date, habits } = req.body;
  if (!date || !habits) {
    return res.status(400).json({ error: 'Date and habits object are required' });
  }

  const updated = db.logHabits(date, habits);
  res.json({ success: true, date, habits: updated });
});

// Get predefined habit catalog
app.get('/api/habits/catalog', (req, res) => {
  res.json({ catalog: db.getCatalog() });
});

// Add a habit (from catalog or custom)
app.post('/api/habits/create', (req, res) => {
  const { id: customId, name, category, icon, description, impact } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Habit name is required' });
  }

  const id = customId || name.toLowerCase().replace(/[^a-z0-9]+/g, '_');
  const habit = {
    id,
    name,
    category: category || 'General',
    icon: icon || '⚡',
    description: description || '',
    impact: impact || ''
  };

  db.addHabit(habit);
  res.json({ success: true, habit });
});

// Delete a habit
app.delete('/api/habits/:id', (req, res) => {
  db.deleteHabit(req.params.id);
  res.json({ success: true });
});

// -------------------------------------------------------------
// Analytics & Correlation Engine
// -------------------------------------------------------------

app.get('/api/correlations', (req, res) => {
  const result = analyticsService.calculateCorrelations();
  res.json(result);
});

// -------------------------------------------------------------
// Muscle Mass & Hypertrophy Lab
// -------------------------------------------------------------

app.get('/api/hypertrophy', (req, res) => {
  try {
    const profile = hypertrophyService.getHypertrophyProfile(req.query.date, req.query.goal);
    res.json(profile);
  } catch (err) {
    console.error('Error in hypertrophy profile:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/hypertrophy/log', (req, res) => {
  try {
    const { date, ...data } = req.body;
    if (!date) return res.status(400).json({ error: 'Date is required' });
    const updated = hypertrophyService.logNutrition(date, data);
    res.json({ success: true, log: updated });
  } catch (err) {
    console.error('Error logging nutrition:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/user/body', (req, res) => {
  const user = db.getUser() || {};
  res.json({
    body: user.body || { height_meter: 1.70, weight_kilogram: 78.5, max_heart_rate: 190 }
  });
});

// -------------------------------------------------------------
// Demo / Mock Data Endpoints
// -------------------------------------------------------------

app.post('/api/demo/populate', (req, res) => {
  const result = populateDemoData();
  res.json(result);
});

app.post('/api/demo/clear', (req, res) => {
  db.save({
    tokens: db.getTokens(),
    user: db.getUser(),
    biometrics: {},
    habits: db.getHabits(),
    habit_logs: {}
  });
  res.json({ success: true, message: 'Cleared all biometric and habit data' });
});

// -------------------------------------------------------------
// Apex AI Physiological Copilot Endpoints
// -------------------------------------------------------------

app.get('/api/ai/coach/insights', (req, res) => {
  try {
    const date = req.query.date;
    const biometrics = db.getBiometrics();
    const dates = Object.keys(biometrics).sort();
    const history = dates.map(d => ({ date: d, ...biometrics[d] }));

    let targetRecord = null;
    if (date && biometrics[date]) {
      targetRecord = { date, ...biometrics[date] };
    } else if (dates.length > 0) {
      const latestDate = dates[dates.length - 1];
      targetRecord = { date: latestDate, ...biometrics[latestDate] };
    }

    if (!targetRecord) {
      return res.status(404).json({ error: 'No biometric record found to analyze' });
    }

    const insights = aiCoachService.analyzeVitals(targetRecord, history);
    res.json({ success: true, insights });
  } catch (err) {
    console.error('Error generating AI coach insights:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/ai/coach/chat', async (req, res) => {
  try {
    const { prompt, date, sync = true, conversationHistory = [] } = req.body;
    if (!prompt) return res.status(400).json({ error: 'Prompt is required' });

    const activeProvider = db.getActiveProvider();
    let syncResult = { attempted: false, success: false, message: 'Sync not requested' };

    // 1. Auto-sync latest wearable biometrics if requested
    if (sync) {
      const tokens = db.getTokens(activeProvider);
      if (tokens && tokens.access_token) {
        syncResult.attempted = true;
        try {
          const syncPromise = activeProvider === 'google_fitbit'
            ? googleHealthService.syncAllData()
            : whoopService.syncAllData();

          // Safety timeout of 6 seconds to prevent slow wearable APIs from hanging chat
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Sync timeout')), 6000)
          );

          const resSync = await Promise.race([syncPromise, timeoutPromise]);
          syncResult.success = resSync?.success !== false;
          syncResult.message = resSync?.message || 'Biometrics synced successfully';
          syncResult.newRecords = resSync?.synced || 0;
        } catch (syncErr) {
          console.warn('AI Coach pre-query sync warning:', syncErr.message);
          syncResult.message = syncErr.message;
        }
      } else {
        syncResult.message = 'Using local telemetry store (live wearable not connected)';
      }
    }

    // 2. Load latest biometrics & baselines after sync
    const biometrics = db.getBiometrics();
    const dates = Object.keys(biometrics).sort();
    const history = dates.map(d => ({ date: d, ...biometrics[d] }));

    let targetDate = date;
    if (!targetDate || !biometrics[targetDate]) {
      targetDate = dates.length > 0 ? dates[dates.length - 1] : new Date().toISOString().split('T')[0];
    }
    const targetRecord = biometrics[targetDate] ? { date: targetDate, ...biometrics[targetDate] } : null;

    // Yesterday's record for cumulative fatigue analysis
    const targetIndex = dates.indexOf(targetDate);
    const yesterdayRecord = targetIndex > 0 ? { date: dates[targetIndex - 1], ...biometrics[dates[targetIndex - 1]] } : null;

    // User profile
    const user = db.getUser() || {};

    // Habits & correlations
    const habitLogs = db.getHabitLogs(targetDate);
    const habitList = db.getHabits();
    let correlations = null;
    try {
      correlations = analyticsService.calculateCorrelations();
    } catch (e) {
      console.warn('Correlation calculation warning:', e.message);
    }

    // Hypertrophy & Nutrition profile
    let hypertrophy = null;
    try {
      hypertrophy = hypertrophyService.getHypertrophyProfile(targetDate, 'gain');
    } catch (e) {
      console.warn('Hypertrophy profile warning:', e.message);
    }

    const context = {
      currentVitals: targetRecord || {},
      yesterdayVitals: yesterdayRecord || {},
      history,
      user,
      habits: {
        loggedToday: habitLogs,
        catalog: habitList,
        correlations
      },
      hypertrophy,
      provider: activeProvider,
      date: targetDate,
      syncResult
    };

    const response = await aiCoachService.chatWithCoach(prompt, context, history, conversationHistory);

    res.json({
      success: true,
      ...response,
      syncDetails: {
        synced: syncResult.attempted && syncResult.success,
        attempted: syncResult.attempted,
        message: syncResult.message,
        provider: activeProvider,
        totalDays: dates.length,
        latestDate: dates[dates.length - 1] || targetDate
      }
    });
  } catch (err) {
    console.error('Error in AI coach chat:', err);
    res.status(500).json({ error: err.message });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`\n=================================================`);
  console.log(`🚀 WHOOP Performance & Habit Dashboard running!`);
  console.log(`📡 URL: http://localhost:${PORT}`);
  console.log(`🔑 Redirect URI: ${process.env.REDIRECT_URI || `http://localhost:${PORT}/api/auth/callback`}`);
  console.log(`=================================================\n`);
});
