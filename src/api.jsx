// Supabase client + thin wrapper over the RPCs defined in supabase/migrations/0003_functions.sql.
// Loads as a plain <script> and attaches to window. Safe to run before env is wired: if
// SUPABASE_URL / SUPABASE_ANON_KEY are missing, api calls return null and the app stays local.

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

  const api = {
    enabled: !!client,
    client,

    async signIn(email) {
      if (!client) return null;
      return client.auth.signInWithOtp({ email });
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

    async upsertProfile(patch) {
      if (!client) return null;
      const { data: u } = await client.auth.getUser();
      if (!u.user) return null;
      return client.from('profiles').upsert({ id: u.user.id, ...patch }).select().single();
    },

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
        .select('clan:clan_id(id, name, tag)')
        .eq('user_id', u.user.id)
        .single();
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
