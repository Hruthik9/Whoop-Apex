const db = require('./db');

class GoogleHealthService {
  constructor() {
    this.clientId = process.env.GOOGLE_CLIENT_ID || process.env.FITBIT_CLIENT_ID || '';
    this.clientSecret = process.env.GOOGLE_CLIENT_SECRET || process.env.FITBIT_CLIENT_SECRET || '';
    this.redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/auth/google/callback';
    
    // Auth endpoints: Supports Fitbit Web API / Google Health API OAuth
    this.authUrl = 'https://www.fitbit.com/oauth2/authorize';
    this.tokenUrl = 'https://api.fitbit.com/oauth2/token';
    this.apiBase = 'https://api.fitbit.com';
    this.scopes = ['activity', 'heartrate', 'sleep', 'respiratory_rate', 'cardio_fitness', 'profile'];
  }

  getAuthorizationUrl() {
    if (!this.clientId) {
      throw new Error('GOOGLE_CLIENT_ID or FITBIT_CLIENT_ID is not configured in .env');
    }
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      scope: this.scopes.join(' '),
      expires_in: '604800' // 1 week
    });
    return `${this.authUrl}?${params.toString()}`;
  }

  async exchangeCodeForTokens(code) {
    const authHeader = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      code
    });

    const res = await fetch(this.tokenUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${authHeader}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params
    });

    if (!res.ok) {
      const errTxt = await res.text();
      throw new Error(`Token exchange failed (${res.status}): ${errTxt}`);
    }

    const data = await res.json();
    const tokens = {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: Date.now() + (data.expires_in * 1000),
      scope: data.scope,
      user_id: data.user_id
    };

    db.saveTokens(tokens, 'google_fitbit');
    return tokens;
  }

  async refreshAccessToken() {
    const tokens = db.getTokens('google_fitbit');
    if (!tokens || !tokens.refresh_token) {
      throw new Error('No refresh token available for Google/Fitbit');
    }

    const authHeader = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: tokens.refresh_token
    });

    const res = await fetch(this.tokenUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${authHeader}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params
    });

    if (!res.ok) {
      throw new Error(`Failed to refresh Google/Fitbit token: ${res.statusText}`);
    }

    const data = await res.json();
    const updated = {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: Date.now() + (data.expires_in * 1000),
      scope: data.scope,
      user_id: data.user_id || tokens.user_id
    };

    db.saveTokens(updated, 'google_fitbit');
    return updated;
  }

  async getValidToken() {
    const tokens = db.getTokens('google_fitbit');
    if (!tokens || !tokens.access_token) return null;

    if (Date.now() >= tokens.expires_at - (60 * 1000)) {
      const refreshed = await this.refreshAccessToken();
      return refreshed.access_token;
    }
    return tokens.access_token;
  }

  async syncAllData() {
    const token = await this.getValidToken();
    if (!token) {
      // If no active live token, seed demo data for immediate testing
      return this.seedGoogleDemoData();
    }

    const headers = { 'Authorization': `Bearer ${token}` };
    const today = new Date().toISOString().split('T')[0];

    // 1. Fetch Profile
    try {
      const profRes = await fetch(`${this.apiBase}/1/user/-/profile.json`, { headers });
      if (profRes.ok) {
        const profData = await profRes.json();
        const u = profData.user || {};
        db.saveUser({
          first_name: u.firstName || 'Hruthik',
          last_name: u.lastName || 'Sreeperumbudur',
          device: 'Google Pixel Watch / Fitbit Sense 2',
          body: {
            weight_kilogram: u.weight || 78.5,
            height_meter: (u.height || 170) / 100,
            max_heart_rate: 190
          }
        }, 'google_fitbit');
      }
    } catch (e) {
      console.warn('Google/Fitbit profile fetch warning:', e.message);
    }

    // 2. Fetch Sleep (last 30 days)
    const recordsMap = {};
    try {
      const sleepRes = await fetch(`${this.apiBase}/1.2/user/-/sleep/date/${today}/30d.json`, { headers });
      if (sleepRes.ok) {
        const sleepData = await sleepRes.json();
        const logs = sleepData.sleep || [];
        for (const s of logs) {
          const date = s.dateOfSleep;
          if (!recordsMap[date]) recordsMap[date] = {};

          const levels = s.levels || {};
          const summary = levels.summary || {};

          const deepMin = summary.deep?.minutes || 0;
          const remMin = summary.rem?.minutes || 0;
          const lightMin = summary.light?.minutes || 0;
          const awakeMin = summary.wake?.minutes || 0;
          const totalAsleepMin = deepMin + remMin + lightMin || s.minutesAsleep || 0;
          const inBedMin = s.timeInBed || totalAsleepMin + awakeMin;

          recordsMap[date].sleep = {
            score: s.efficiency || 80,
            performance_percentage: Math.min(100, Math.round((totalAsleepMin / 480) * 100)),
            efficiency_percentage: s.efficiency || Math.round((totalAsleepMin / inBedMin) * 100),
            consistency_percentage: 75,
            respiratory_rate: 16.5,
            total_in_bed_min: inBedMin,
            total_asleep_min: totalAsleepMin,
            slow_wave_sleep_min: deepMin,
            rem_sleep_min: remMin,
            light_sleep_min: lightMin,
            awake_min: awakeMin,
            disturbance_count: summary.wake?.count || 8,
            sleep_cycles: Math.floor(totalAsleepMin / 90),
            need: {
              total_min: 480,
              baseline_min: 450,
              debt_min: Math.max(0, 480 - totalAsleepMin),
              strain_min: 15
            },
            start: s.startTime,
            end: s.endTime
          };
        }
      }
    } catch (e) {
      console.warn('Google/Fitbit sleep fetch warning:', e.message);
    }

    // Save synced data
    if (Object.keys(recordsMap).length > 0) {
      db.saveBulkBiometrics(recordsMap, 'google_fitbit');
      return { success: true, count: Object.keys(recordsMap).length, synced_at: new Date().toISOString() };
    }

    return this.seedGoogleDemoData();
  }

  seedGoogleDemoData() {
    const recordsMap = {};
    const today = new Date();

    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateKey = d.toISOString().split('T')[0];

      // Realistic Google Pixel Watch / Fitbit Sense 2 metrics
      const rhr = 60 + Math.floor(Math.sin(i * 0.4) * 5) + (i % 3 === 0 ? 3 : 0);
      const hrv = 55 + Math.floor(Math.cos(i * 0.5) * 14) + (i % 4 === 0 ? -8 : 6);
      const readiness = Math.min(96, Math.max(28, Math.round((hrv * 0.6) + (100 - rhr) * 0.3 + (i % 5 === 0 ? -12 : 5))));

      // Sleep Stages
      const deepMin = 75 + Math.floor(Math.sin(i * 0.7) * 25);
      const remMin = 80 + Math.floor(Math.cos(i * 0.6) * 20);
      const lightMin = 180 + Math.floor(Math.sin(i * 0.3) * 35);
      const awakeMin = 45 + Math.floor(Math.random() * 25);
      const totalAsleepMin = deepMin + remMin + lightMin;
      const inBedMin = totalAsleepMin + awakeMin;

      // Activity / Strain
      const steps = 8500 + Math.floor(Math.sin(i * 0.5) * 3500);
      const azm = 25 + Math.floor(Math.cos(i * 0.4) * 20); // Active Zone Minutes
      const kcalBurned = 2100 + Math.floor(steps * 0.04) + (azm * 6);
      const strainEquiv = Math.round(((azm / 45) * 10 + (steps / 10000) * 4) * 10) / 10;

      recordsMap[dateKey] = {
        recovery: {
          score: readiness,
          hrv_ms: hrv,
          resting_heart_rate: rhr,
          spo2: 97.2 + (Math.random() * 1.5),
          skin_temp_c: 34.0 + (Math.random() * 0.4 - 0.2),
          state: 'SCORED'
        },
        sleep: {
          score: Math.min(95, Math.round((totalAsleepMin / 480) * 100)),
          performance_percentage: Math.min(100, Math.round((totalAsleepMin / 480) * 100)),
          efficiency_percentage: Math.round((totalAsleepMin / inBedMin) * 100),
          consistency_percentage: 78,
          respiratory_rate: 15.8 + Math.round(Math.random() * 1.4 * 10) / 10,
          total_in_bed_min: inBedMin,
          total_asleep_min: totalAsleepMin,
          slow_wave_sleep_min: deepMin,
          rem_sleep_min: remMin,
          light_sleep_min: lightMin,
          awake_min: awakeMin,
          disturbance_count: 7 + (i % 6),
          sleep_cycles: Math.floor(totalAsleepMin / 90),
          need: {
            total_min: 495,
            baseline_min: 460,
            debt_min: Math.max(0, 495 - totalAsleepMin),
            strain_min: Math.round(azm * 0.5)
          },
          start: `${dateKey}T23:15:00.000Z`,
          end: `${dateKey}T07:05:00.000Z`
        },
        strain: {
          score: Math.min(20.5, Math.max(4.0, strainEquiv)),
          kilojoules: Math.round(kcalBurned / 0.239006),
          calories: kcalBurned,
          steps,
          active_zone_minutes: azm,
          average_heart_rate: 74,
          max_heart_rate: 158
        },
        workouts: steps > 10000 ? [
          {
            id: `fitbit_act_${i}`,
            sport_id: 1,
            name: 'Outdoor Run / Cardio',
            strain: Math.round((azm / 4) * 10) / 10,
            duration_min: Math.round(azm * 1.2),
            average_heart_rate: 138,
            max_heart_rate: 165,
            kilojoules: Math.round((azm * 8.5) / 0.239)
          }
        ] : []
      };
    }

    db.saveBulkBiometrics(recordsMap, 'google_fitbit');
    return {
      success: true,
      demo: true,
      provider: 'google_fitbit',
      count: Object.keys(recordsMap).length,
      synced_at: new Date().toISOString()
    };
  }
}

module.exports = new GoogleHealthService();
