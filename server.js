require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const db = require('./services/db');
const whoopService = require('./services/whoop');
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

// 3. Auth Status
app.get('/api/auth/status', (req, res) => {
  const tokens = db.getTokens();
  const user = db.getUser();
  const biometrics = db.getBiometrics();
  const dates = Object.keys(biometrics).sort();

  res.json({
    connected: !!(tokens && tokens.access_token),
    user: user || null,
    has_data: dates.length > 0,
    total_days: dates.length,
    latest_date: dates.length ? dates[dates.length - 1] : null
  });
});

// 4. Disconnect WHOOP
app.post('/api/auth/disconnect', (req, res) => {
  db.clearTokens();
  res.json({ success: true, message: 'Disconnected WHOOP account' });
});

// -------------------------------------------------------------
// WHOOP Data Sync
// -------------------------------------------------------------

app.post('/api/whoop/sync', async (req, res) => {
  try {
    const result = await whoopService.syncAllData();
    res.json(result);
  } catch (err) {
    console.error('Sync failed:', err);
    res.status(500).json({ error: 'Sync failed', message: err.message });
  }
});

// -------------------------------------------------------------
// Biometrics & Dashboard Data
// -------------------------------------------------------------

app.get('/api/data', (req, res) => {
  const biometrics = db.getBiometrics();
  const dates = Object.keys(biometrics).sort();

  const history = dates.map(date => ({
    date,
    ...biometrics[date]
  }));

  const latestDate = dates.length ? dates[dates.length - 1] : null;
  const latest = latestDate ? { date: latestDate, ...biometrics[latestDate] } : null;

  res.json({
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

// Start Server
app.listen(PORT, () => {
  console.log(`\n=================================================`);
  console.log(`🚀 WHOOP Performance & Habit Dashboard running!`);
  console.log(`📡 URL: http://localhost:${PORT}`);
  console.log(`🔑 Redirect URI: ${process.env.REDIRECT_URI || `http://localhost:${PORT}/api/auth/callback`}`);
  console.log(`=================================================\n`);
});
