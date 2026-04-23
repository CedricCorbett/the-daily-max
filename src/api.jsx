// Supabase client + thin wrapper over the RPCs in supabase/migrations/*.sql.
// Loads as a plain <script> and attaches to window. Safe to run before env is wired: if
// SUPABASE_URL / SUPABASE_ANON_KEY are missing, api.enabled is false and calls return null.

(function () {
  const W = window;

  // Set these two globals from your deploy/host (e.g. inject a <script> that assigns them before loading this file):
  //   window.SUPABASE_URL = 'https://xxx.supabase.co';
  //   window.SUPABASE_ANON_KEY = 'eyJ...';
  const URL_ = W.SUPABASE_URL || null;
  const KEY_ = W.SUPABASE_ANON_KEY || null;

  let client = null;
  if (URL_ && KEY_ && W.supabase && W.supabase.createClient) {
    client = W.supabase.createClient(URL_, KEY_, {
      auth: { persistSession: true, autoRefreshToken: true },
    });
  }

  const isEmail = (s) => typeof s === 'string' && s.includes('@');

  const api = {
    enabled: !!client,
    client,

    // ───────── auth ─────────

    async signUp({ username, pin, displayName, email, regionState, ageBracket }) {
      if (!client) return null;
      const uname = String(username || '').trim().toLowerCase();
      if (!uname || !/^[a-z0-9_]{3,20}$/.test(uname)) {
        return { error: { message: 'Username must be 3–20 letters/numbers/underscores.' } };
      }
      if (!/^\d{6}$/.test(pin)) {
        return { error: { message: 'PIN must be 6 digits.' } };
      }
      const cleanEmail = String(email || '').trim().toLowerCase();
      if (!cleanEmail || !/^\S+@\S+\.\S+$/.test(cleanEmail)) {
        return { error: { message: 'Enter a valid email.' } };
      }
      const { data: avail } = await client.rpc('username_available', { p_username: uname });
      if (avail === false) {
        return { error: { message: 'That username is taken.' } };
      }
      return client.auth.signUp({
        email: cleanEmail,
        password: pin,
        options: {
          data: {
            username: uname,
            display_name: displayName || uname,
            region_state: regionState || null,
            age_bracket: ageBracket || null,
          },
        },
      });
    },

    async signIn({ handle, pin }) {
      if (!client) return null;
      const raw = String(handle || '').trim();
      if (!raw) return { error: { message: 'Enter a username or email.' } };
      if (!/^\d{6}$/.test(pin)) return { error: { message: 'PIN must be 6 digits.' } };

      const throttleKey = isEmail(raw) ? raw.toLowerCase() : raw.toLowerCase();
      const { data: lockedFor } = await client.rpc('throttle_status', { p_username: throttleKey });
      if (lockedFor && lockedFor > 0) {
        return { lockedFor };
      }

      // Resolve username → synth email. Email passes through.
      const { data: email } = await client.rpc('resolve_login', { p_handle: raw });
      if (!email) {
        // Don't leak enumeration — burn a throttle attempt and return generic error.
        await client.rpc('register_failed_pin', { p_username: throttleKey });
        return { error: { message: 'Wrong username or PIN.' } };
      }

      const res = await client.auth.signInWithPassword({ email, password: pin });
      if (res.error) {
        const { data: status } = await client.rpc('register_failed_pin', { p_username: throttleKey });
        if (status === -1) {
          return { lockedFor: 15 * 60 };
        }
        return { error: { message: 'Wrong username or PIN.' } };
      }
      await client.rpc('clear_throttle', { p_username: throttleKey });
      return res;
    },

    async signOut() {
      if (!client) return null;
      return client.auth.signOut();
    },

    async getUser() {
      if (!client) return null;
      const { data } = await client.auth.getUser();
      return data.user;
    },

    async getSession() {
      if (!client) return null;
      const { data } = await client.auth.getSession();
      return data.session;
    },

    onAuthChange(cb) {
      if (!client) return () => {};
      const { data } = client.auth.onAuthStateChange((_event, session) => cb(session));
      return () => data.subscription.unsubscribe();
    },

    async myProfile() {
      if (!client) return null;
      const { data: u } = await client.auth.getUser();
      if (!u.user) return null;
      return client.from('profiles').select('*').eq('id', u.user.id).single();
    },

    async upsertProfile(patch) {
      if (!client) return null;
      const { data: u } = await client.auth.getUser();
      if (!u.user) return null;
      return client.from('profiles').upsert({ id: u.user.id, ...patch }).select().single();
    },

    // ───────── push ─────────

    async subscribePush({ endpoint, p256dh, auth, ua }) {
      if (!client) return null;
      return client.rpc('subscribe_push', {
        p_endpoint: endpoint, p_p256dh: p256dh, p_auth: auth, p_ua: ua || null,
      });
    },

    async unsubscribePush(endpoint) {
      if (!client) return null;
      return client.rpc('unsubscribe_push', { p_endpoint: endpoint });
    },

    // ───────── workouts + rally + clan ─────────

    async logWorkout({ pushups = 0, squats = 0, hollow = 0, pullups = 0, notes = null }) {
      if (!client) return null;
      return client.rpc('log_workout', {
        p_pushups: pushups,
        p_squats: squats,
        p_hollow_sec: hollow,
        p_pullups: pullups,
        p_notes: notes,
      });
    },

    // Push the entire local history to the server in one call. Fills in every
    // day the fire-and-forget client skipped, rebuilds PBs, and recomputes the
    // streak server-side. Safe to re-run — greatest(...) on conflict means
    // re-submitting never regresses.
    async backfillHistory(history) {
      if (!client) return { data: null, error: { message: 'API disabled.' } };
      const entries = (Array.isArray(history) ? history : [])
        .filter(h => h && h.date)
        .map(h => ({
          day: h.date,
          pushups:    Number(h.pushups) || 0,
          squats:     Number(h.squats) || 0,
          hollow_sec: Number(h.hollow || h.hollow_sec) || 0,
          pullups:    Number(h.pullups) || 0,
        }));
      return client.rpc('backfill_workouts', { p_entries: entries });
    },

    async listLeaderboard({ bracket = null, day = null, limit = 25 } = {}) {
      if (!client) return { data: null, error: null };
      return client.rpc('list_leaderboard', {
        p_bracket: bracket,
        p_day: day,
        p_limit: limit,
      });
    },

    async sendRally(toUser, msg, cap = 7) {
      if (!client) return null;
      return client.rpc('send_rally', { p_to: toUser, p_msg: msg, p_cap: cap });
    },

    async clanScore(clanId, day) {
      if (!client) return null;
      return client.rpc('clan_score', {
        p_clan_id: clanId,
        p_day: day ?? new Date().toISOString().slice(0, 10),
      });
    },

    // ───────── crew ops (0010_crew.sql) ─────────

    async crewTotals(clanId, day) {
      if (!client) return null;
      return client.rpc('crew_totals', {
        p_clan_id: clanId,
        p_day: day ?? new Date().toISOString().slice(0, 10),
      });
    },

    async crewRoster(clanId, day) {
      if (!client) return null;
      return client.rpc('crew_roster', {
        p_clan_id: clanId,
        p_day: day ?? new Date().toISOString().slice(0, 10),
      });
    },

    async postCrewRoundup({ title, cue, hours = 24 }) {
      if (!client) return null;
      return client.rpc('post_crew_roundup', {
        p_title: title, p_cue: cue, p_hours: hours,
      });
    },

    async listCrewRoundups() {
      if (!client) return null;
      return client.rpc('list_crew_roundups');
    },

    async checkinCrewRoundup(roundupId) {
      if (!client) return null;
      return client.rpc('checkin_crew_roundup', { p_roundup_id: roundupId });
    },

    async endCrewRoundup(roundupId) {
      if (!client) return null;
      return client.rpc('end_crew_roundup', { p_roundup_id: roundupId });
    },

    async listRallyBoard() {
      if (!client) return null;
      return client.rpc('list_rally_board');
    },

    async myInbox() {
      if (!client) return null;
      const { data: u } = await client.auth.getUser();
      if (!u.user) return null;
      return client
        .from('rallies')
        .select('id, from_user, msg, sent_at, pushed, profiles:from_user(handle, city)')
        .eq('to_user', u.user.id)
        .order('sent_at', { ascending: false });
    },

    async myClan() {
      if (!client) return null;
      const { data: u } = await client.auth.getUser();
      if (!u.user) return null;
      return client
        .from('clan_members')
        .select('role, clan:clan_id(id, name, tag, description, is_public, is_system, invite_code, region_state, age_bracket)')
        .eq('user_id', u.user.id)
        .order('joined_at', { ascending: false })
        .limit(1)
        .maybeSingle();
    },

    async createClan({ name, tag, description, isPublic, regionState, ageBracket }) {
      if (!client) return null;
      return client.rpc('create_clan', {
        p_name: name,
        p_tag: tag || null,
        p_description: description || null,
        p_is_public: isPublic !== false,
        p_region_state: regionState || null,
        p_age_bracket: ageBracket || null,
      });
    },

    async joinClan(clanId) {
      if (!client) return null;
      return client.rpc('join_clan', { p_clan_id: clanId });
    },

    async joinClanByCode(code) {
      if (!client) return null;
      return client.rpc('join_clan_by_code', { p_code: code });
    },

    async leaveClan() {
      if (!client) return null;
      return client.rpc('leave_clan');
    },

    async listRegionalClans({ state, bracket, limit = 20 } = {}) {
      if (!client) return null;
      return client.rpc('list_regional_clans', {
        p_state: state || null,
        p_bracket: bracket || null,
        p_limit: limit,
      });
    },

    async transferLeadership(toUserId) {
      if (!client) return null;
      return client.rpc('transfer_leadership', { p_to_user: toUserId });
    },

    async kickMember(userId) {
      if (!client) return null;
      return client.rpc('kick_member', { p_user_id: userId });
    },

    async regenerateInviteCode() {
      if (!client) return null;
      return client.rpc('regenerate_invite_code');
    },

    async updateClan({ name, description, isPublic }) {
      if (!client) return null;
      return client.rpc('update_clan', {
        p_name: name ?? null,
        p_description: description ?? null,
        p_is_public: isPublic ?? null,
      });
    },

    async clanMembers(clanId) {
      if (!client) return null;
      return client
        .from('clan_members')
        .select('user_id, role, joined_at, profile:user_id(display_name, username, region_state, age_bracket)')
        .eq('clan_id', clanId)
        .order('joined_at', { ascending: true });
    },

    async liveBattles(clanId) {
      if (!client) return null;
      const now = new Date().toISOString();
      return client
        .from('clan_battles')
        .select('*')
        .or(`a_clan_id.eq.${clanId},b_clan_id.eq.${clanId}`)
        .lte('starts_at', now)
        .gte('ends_at', now);
    },
  };

  Object.assign(W, { api });
})();
