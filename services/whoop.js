const db = require('./db');

const WHOOP_AUTH_URL = 'https://api.prod.whoop.com/oauth/oauth2/auth';
const WHOOP_TOKEN_URL = 'https://api.prod.whoop.com/oauth/oauth2/token';
const WHOOP_API_BASE = 'https://api.prod.whoop.com/developer/v2';

const SCOPES = [
  'read:recovery',
  'read:cycles',
  'read:workout',
  'read:sleep',
  'read:profile',
  'read:body_measurement',
  'offline'
].join(' ');

class WhoopService {
  constructor() {
    this.clientId = process.env.WHOOP_CLIENT_ID;
    this.clientSecret = process.env.WHOOP_CLIENT_SECRET;
    this.redirectUri = process.env.REDIRECT_URI || 'http://localhost:3000/api/auth/callback';
  }

  getAuthorizationUrl() {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      scope: SCOPES,
      state: 'whoop_dashboard_' + Math.random().toString(36).substring(2, 10)
    });
    return `${WHOOP_AUTH_URL}?${params.toString()}`;
  }

  async exchangeCodeForTokens(code) {
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code: code,
      client_id: this.clientId,
      client_secret: this.clientSecret,
      redirect_uri: this.redirectUri
    });

    const res = await fetch(WHOOP_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString()
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Failed to exchange code: ${res.status} - ${errText}`);
    }

    const data = await res.json();
    const tokenRecord = {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: Date.now() + (data.expires_in * 1000),
      scope: data.scope
    };

    db.saveTokens(tokenRecord);
    return tokenRecord;
  }

  async refreshTokens() {
    const tokens = db.getTokens();
    if (!tokens || !tokens.refresh_token) {
      throw new Error('No refresh token available');
    }

    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: tokens.refresh_token,
      client_id: this.clientId,
      client_secret: this.clientSecret
    });

    const res = await fetch(WHOOP_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString()
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Failed to refresh token: ${res.status} - ${errText}`);
    }

    const data = await res.json();
    const updated = {
      access_token: data.access_token,
      refresh_token: data.refresh_token || tokens.refresh_token,
      expires_at: Date.now() + (data.expires_in * 1000),
      scope: data.scope || tokens.scope
    };

    db.saveTokens(updated);
    return updated;
  }

  async getValidAccessToken() {
    let tokens = db.getTokens();
    if (!tokens) return null;

    // If token expires in less than 5 minutes, refresh it
    if (Date.now() > tokens.expires_at - 300000) {
      tokens = await this.refreshTokens();
    }
    return tokens.access_token;
  }

  async apiRequest(endpoint, params = {}) {
    const accessToken = await this.getValidAccessToken();
    if (!accessToken) {
      throw new Error('Not authenticated with WHOOP');
    }

    const url = new URL(`${WHOOP_API_BASE}${endpoint}`);
    for (const [key, val] of Object.entries(params)) {
      if (val !== undefined && val !== null) {
        url.searchParams.append(key, val);
      }
    }

    const res = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (res.status === 401) {
      // Try refresh once
      await this.refreshTokens();
      const retryToken = await this.getValidAccessToken();
      const retryRes = await fetch(url.toString(), {
        headers: {
          'Authorization': `Bearer ${retryToken}`,
          'Content-Type': 'application/json'
        }
      });
      if (!retryRes.ok) throw new Error(`WHOOP API error: ${retryRes.status}`);
      return retryRes.json();
    }

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`WHOOP API request failed [${res.status}]: ${text}`);
    }

    return res.json();
  }

  async fetchProfile() {
    return this.apiRequest('/user/profile/basic');
  }

  async fetchBodyMeasurements() {
    return this.apiRequest('/user/measurement/body');
  }

  async fetchCycles(limit = 25, nextToken = null) {
    const params = { limit };
    if (nextToken) params.nextToken = nextToken;
    return this.apiRequest('/cycle', params);
  }

  async fetchRecoveries(limit = 25, nextToken = null) {
    const params = { limit };
    if (nextToken) params.nextToken = nextToken;
    return this.apiRequest('/recovery', params);
  }

  async fetchSleep(limit = 25, nextToken = null) {
    const params = { limit };
    if (nextToken) params.nextToken = nextToken;
    return this.apiRequest('/activity/sleep', params);
  }

  async fetchWorkouts(limit = 25, nextToken = null) {
    const params = { limit };
    if (nextToken) params.nextToken = nextToken;
    return this.apiRequest('/activity/workout', params);
  }

  async fetchAllPages(fetchFn, maxPages = 2) {
    let allRecords = [];
    let nextToken = null;
    for (let page = 0; page < maxPages; page++) {
      try {
        const res = await fetchFn(25, nextToken);
        if (res && res.records) {
          allRecords = allRecords.concat(res.records);
        }
        if (!res || !res.next_token) break;
        nextToken = res.next_token;
      } catch (err) {
        console.error('Fetch page error:', err.message);
        break;
      }
    }
    return { records: allRecords };
  }

  async syncAllData() {
    const token = await this.getValidAccessToken();
    if (!token) return { success: false, message: 'Not authenticated with WHOOP' };

    try {
      // Fetch profile & body measurements
      try {
        const [profile, body] = await Promise.all([
          this.fetchProfile().catch(() => null),
          this.fetchBodyMeasurements().catch(() => null)
        ]);
        if (profile) {
          if (body) profile.body = body;
          db.saveUser(profile);
        }
      } catch (e) {
        console.warn('Profile/Body fetch warning:', e.message);
      }

      // Fetch last 30+ days of data with pagination
      const [cyclesData, recoveriesData, sleepData, workoutsData] = await Promise.all([
        this.fetchAllPages((limit, token) => this.fetchCycles(limit, token), 2),
        this.fetchAllPages((limit, token) => this.fetchRecoveries(limit, token), 2),
        this.fetchAllPages((limit, token) => this.fetchSleep(limit, token), 2),
        this.fetchAllPages((limit, token) => this.fetchWorkouts(limit, token), 2)
      ]);

      const recordsMap = {};

      // Helper to compute local date YYYY-MM-DD given ISO string and timezone offset
      const getLocalDate = (isoStr, offsetStr) => {
        if (!isoStr) return null;
        const d = new Date(isoStr);
        if (offsetStr) {
          const sign = offsetStr[0] === '-' ? -1 : 1;
          const [h, m] = offsetStr.slice(1).split(':').map(Number);
          const totalOffsetMinutes = sign * (h * 60 + m);
          const localTime = new Date(d.getTime() + (totalOffsetMinutes * 60000));
          return localTime.toISOString().split('T')[0];
        }
        return d.toISOString().split('T')[0];
      };

      // Map cycles by cycle_id and determine their local date
      const cycleDateMap = {}; // cycle_id -> dateKey
      const cycles = cyclesData.records || [];
      for (const c of cycles) {
        const dateKey = getLocalDate(c.start, c.timezone_offset);
        if (!dateKey) continue;
        cycleDateMap[c.id] = dateKey;

        if (!recordsMap[dateKey]) recordsMap[dateKey] = {};

        const score = c.score || {};
        recordsMap[dateKey].strain = {
          score: score.strain !== undefined ? Math.round(score.strain * 10) / 10 : 0,
          kilojoules: Math.round(score.kilojoule || 0),
          average_heart_rate: score.average_heart_rate || null,
          max_heart_rate: score.max_heart_rate || null
        };
      }

      // Process Recoveries (linked by cycle_id)
      const recoveries = recoveriesData.records || [];
      for (const rec of recoveries) {
        let dateKey = cycleDateMap[rec.cycle_id];
        if (!dateKey) {
          dateKey = getLocalDate(rec.created_at);
        }
        if (!dateKey) continue;
        if (!recordsMap[dateKey]) recordsMap[dateKey] = {};

        const score = rec.score || {};
        recordsMap[dateKey].recovery = {
          score: score.recovery_score !== undefined ? score.recovery_score : 0,
          hrv_ms: Math.round(score.hrv_rmssd_milli || 0),
          resting_heart_rate: Math.round(score.resting_heart_rate || 0),
          spo2: score.spo2_percentage ? Math.round(score.spo2_percentage * 10) / 10 : null,
          skin_temp_c: score.skin_temp_celsius ? Math.round(score.skin_temp_celsius * 10) / 10 : null,
          state: rec.score_state
        };
      }

      // Process Sleep (linked by cycle_id)
      const sleeps = sleepData.records || [];
      for (const s of sleeps) {
        let dateKey = cycleDateMap[s.cycle_id];
        if (!dateKey) {
          dateKey = getLocalDate(s.end || s.start, s.timezone_offset);
        }
        if (!dateKey) continue;
        if (!recordsMap[dateKey]) recordsMap[dateKey] = {};

        const score = s.score || {};
        const stageSummary = score.stage_summary || {};
        const sleepNeeded = score.sleep_needed || {};

        // EXACT CALCULATION: Sum raw milliseconds first to avoid compounding rounding errors
        const lightMs = stageSummary.total_light_sleep_time_milli || 0;
        const swsMs = stageSummary.total_slow_wave_sleep_time_milli || 0;
        const remMs = stageSummary.total_rem_sleep_time_milli || 0;
        const awakeMs = stageSummary.total_awake_time_milli || 0;
        const inBedMs = stageSummary.total_in_bed_time_milli || 0;

        const totalAsleepMs = lightMs + swsMs + remMs;
        const totalAsleepMin = Math.floor(totalAsleepMs / 60000); // Exact minutes matching Whoop app
        const totalInBedMin = Math.floor(inBedMs / 60000);
        const awakeMin = Math.floor(awakeMs / 60000);
        const swsMin = Math.floor(swsMs / 60000);
        const remMin = Math.floor(remMs / 60000);
        const lightMin = Math.floor(lightMs / 60000);

        // Sleep need and debt in minutes
        const baselineNeedMin = sleepNeeded.baseline_milli ? Math.round(sleepNeeded.baseline_milli / 60000) : 480;
        const debtMin = sleepNeeded.need_from_sleep_debt_milli ? Math.round(sleepNeeded.need_from_sleep_debt_milli / 60000) : 0;
        const strainNeedMin = sleepNeeded.need_from_recent_strain_milli ? Math.round(sleepNeeded.need_from_recent_strain_milli / 60000) : 0;
        const totalNeedMin = baselineNeedMin + debtMin + strainNeedMin;

        recordsMap[dateKey].sleep = {
          score: score.sleep_performance_percentage || 0,
          performance_percentage: score.sleep_performance_percentage || 0,
          efficiency_percentage: Math.round(score.sleep_efficiency_percentage || 0),
          consistency_percentage: score.sleep_consistency_percentage || null,
          respiratory_rate: score.respiratory_rate ? Math.round(score.respiratory_rate * 10) / 10 : null,
          total_in_bed_min: totalInBedMin,
          total_asleep_min: totalAsleepMin,
          slow_wave_sleep_min: swsMin,
          rem_sleep_min: remMin,
          light_sleep_min: lightMin,
          awake_min: awakeMin,
          disturbance_count: stageSummary.disturbance_count || 0,
          sleep_cycles: stageSummary.sleep_cycle_count || 0,
          need: {
            total_min: totalNeedMin,
            baseline_min: baselineNeedMin,
            debt_min: debtMin,
            strain_min: strainNeedMin
          },
          start: s.start,
          end: s.end
        };
      }

      // Process Workouts
      const workouts = workoutsData.records || [];
      for (const w of workouts) {
        const dateKey = getLocalDate(w.start, w.timezone_offset);
        if (!dateKey) continue;
        if (!recordsMap[dateKey]) recordsMap[dateKey] = {};
        if (!recordsMap[dateKey].workouts) recordsMap[dateKey].workouts = [];

        const score = w.score || {};
        const durationMin = w.end && w.start ? Math.round((new Date(w.end) - new Date(w.start)) / 60000) : 0;

        recordsMap[dateKey].workouts.push({
          id: w.id,
          sport_id: w.sport_id,
          strain: Math.round((score.strain || 0) * 10) / 10,
          average_heart_rate: score.average_heart_rate,
          max_heart_rate: score.max_heart_rate,
          kilojoules: Math.round(score.kilojoule || 0),
          duration_min: durationMin
        });
      }

      // Save real data
      db.replaceWithWhoopBiometrics(recordsMap);

      return {
        success: true,
        synced_days: Object.keys(recordsMap).length,
        latest_date: Object.keys(recordsMap).sort().pop(),
        records: recordsMap
      };
    } catch (err) {
      console.error('Error syncing WHOOP data:', err);
      throw err;
    }
  }
}

module.exports = new WhoopService();
