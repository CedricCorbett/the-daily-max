// Tweaks panel — aesthetic/voice/mods, plus spouse-notify config

function TweaksPanel({ state, setState, onClose }) {
  const [diag, setDiag] = useState({ email: null, userId: null, apiEnabled: false, lastWorkout: null, streak: null, probing: false });
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState('');
  const historyCount = (state.history || []).filter(h => h && h.date).length;
  const syncHistory = async () => {
    setSyncing(true); setSyncMsg('');
    try {
      const api = window.api;
      if (!api || !api.enabled) { setSyncMsg('API disabled — sign in first.'); return; }
      const u = await api.getUser();
      if (!u) { setSyncMsg('Sign in first.'); return; }
      const res = await api.backfillHistory(state.history || []);
      if (res && res.error) {
        setSyncMsg('Error: ' + (res.error.message || 'unknown'));
      } else {
        const d = res && res.data;
        setSyncMsg(d ? `Synced ${d.inserted} day(s). Server streak: ${d.current_streak} (best ${d.longest_streak}).` : 'Synced.');
        // Pull server streak back into local state so the Home screen reflects it.
        if (d && typeof d.current_streak === 'number') {
          setState(s => ({
            ...s,
            streak: d.current_streak,
            bestStreak: Math.max(s.bestStreak || 0, d.longest_streak || 0),
            lastLoggedDate: d.last_day || s.lastLoggedDate,
          }));
        }
      }
    } catch (e) {
      setSyncMsg('Threw: ' + (e.message || 'unknown'));
    } finally {
      setSyncing(false);
    }
  };
  useEffect(() => {
    (async () => {
      const api = window.api;
      const apiEnabled = !!(api && api.enabled);
      let email = null, userId = null;
      try {
        if (apiEnabled) {
          const u = await api.getUser();
          if (u) { email = u.email || null; userId = u.id || null; }
        }
      } catch {}
      setDiag(d => ({ ...d, email, userId, apiEnabled }));
    })();
  }, []);
  const probeServer = async () => {
    setDiag(d => ({ ...d, probing: true }));
    try {
      const api = window.api;
      if (!api || !api.enabled || !api.client) {
        setDiag(d => ({ ...d, probing: false, lastWorkout: 'API DISABLED', streak: 'N/A' }));
        return;
      }
      const u = await api.getUser();
      if (!u) { setDiag(d => ({ ...d, probing: false, lastWorkout: 'NOT SIGNED IN', streak: 'N/A' })); return; }
      const w = await api.client.from('workouts').select('day,pushups,squats,hollow_sec,pullups').eq('user_id', u.id).order('day', { ascending: false }).limit(1);
      const s = await api.client.from('streaks').select('current_len,longest_len,last_day').eq('user_id', u.id).maybeSingle();
      const lw = w && w.data && w.data[0];
      const lastWorkout = lw ? `${lw.day} · P${lw.pushups} S${lw.squats} H${lw.hollow_sec} PU${lw.pullups}` : 'NO ROWS ON SERVER';
      const streak = s && s.data ? `${s.data.current_len} (best ${s.data.longest_len}, last ${s.data.last_day})` : 'NO STREAK ROW';
      setDiag(d => ({ ...d, probing: false, lastWorkout, streak }));
    } catch (e) {
      setDiag(d => ({ ...d, probing: false, lastWorkout: 'ERR: ' + (e.message || 'unknown'), streak: '—' }));
    }
  };
  const voices = [
    { id: 'auto',  label: 'AUTO (streak rotates)' },
    { id: 'dad',   label: 'DRY' },
    { id: 'bro',   label: 'HYPE COACH' },
    { id: 'drill', label: 'DRILL SERGEANT' },
    { id: 'zen',   label: 'ZEN' },
  ];
  const aesthetics = [
    { id: 'oxblood',  label: 'OXBLOOD',       accent: '#8B1A1A' },
    { id: 'gold',     label: 'BRASS GOLD',    accent: '#C9A24A' },
    { id: 'crimson',  label: 'CRIMSON',       accent: '#B32121' },
    { id: 'graphite', label: 'GRAPHITE',      accent: '#6B6159' },
  ];
  const setAesthetic = (a) => {
    document.documentElement.style.setProperty('--accent', a.accent);
    document.documentElement.style.setProperty('--accent-dim', a.accent + '22');
    setState(s => ({ ...s, aesthetic: a.id }));
  };

  return (
    <div style={{
      position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.72)', zIndex: 20,
      display: 'flex', alignItems: 'flex-end',
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        width: '100%', background: 'var(--bg)', borderTop: '1px solid var(--border)',
        maxHeight: '85%', overflowY: 'auto', animation: 'slide-up 0.25s ease-out',
      }}>
        <div style={{ padding: '16px 20px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="mono uppercase" style={{ fontSize: 11, letterSpacing: 3, color: 'var(--accent)' }}>TWEAKS</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', fontSize: 18 }}>×</button>
        </div>
        <HazardBar height={3} />
        <div style={{ padding: 20 }}>

          <Section title="VOICE">
            {voices.map(v => (
              <OptionRow key={v.id} active={state.voice === v.id} onClick={() => setState(s => ({ ...s, voice: v.id }))}>
                {v.label}
              </OptionRow>
            ))}
          </Section>

          <Section title="AESTHETIC">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              {aesthetics.map(a => (
                <button key={a.id} onClick={() => setAesthetic(a)} style={{
                  padding: 12, background: state.aesthetic === a.id ? 'var(--card-2)' : 'var(--card)',
                  border: `1px solid ${state.aesthetic === a.id ? a.accent : 'var(--border)'}`,
                  display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
                }}>
                  <div style={{ width: 18, height: 18, background: a.accent, flexShrink: 0 }} />
                  <div className="mono" style={{ fontSize: 10, letterSpacing: 1.5, color: 'var(--text)', textAlign: 'left' }}>{a.label}</div>
                </button>
              ))}
            </div>
          </Section>

          <Section title="TIME SLOT">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              <OptionRow active={state.slot === 'am'} onClick={() => setState(s => ({ ...s, slot: 'am' }))}>☕ BEFORE KIDS WAKE</OptionRow>
              <OptionRow active={state.slot === 'pm'} onClick={() => setState(s => ({ ...s, slot: 'pm' }))}>🌙 AFTER BEDTIME</OptionRow>
            </div>
          </Section>

          {ACCOUNTABILITY_ENABLED && (
            <Section title="ACCOUNTABILITY PARTNER · STREAK BREAK">
              <div className="mono" style={{ fontSize: 10, color: 'var(--text-mute)', marginBottom: 8, lineHeight: 1.4 }}>
                If you break the streak, we text this person. Extra accountability or pure chaos — your call.
              </div>
              <input
                value={state.partner}
                onChange={e => setState(s => ({ ...s, partner: e.target.value }))}
                placeholder="Name or phone"
                style={{
                  width: '100%', padding: '10px 12px', background: 'var(--card)',
                  border: '1px solid var(--border-2)', color: 'var(--text)',
                  fontFamily: 'JetBrains Mono', fontSize: 12,
                }}
              />
            </Section>
          )}

          <Section title="REFERRAL CODE">
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <div className="mono" style={{
                flex: 1, padding: '10px 12px', background: 'var(--card)', border: '1px solid var(--border)',
                fontSize: 13, letterSpacing: 2, color: 'var(--accent)',
              }}>{state.referralCode}</div>
              <GhostBtn onClick={() => { navigator.clipboard && navigator.clipboard.writeText(`dailymax.app/${state.referralCode}`); }}>COPY LINK</GhostBtn>
            </div>
          </Section>

          <Section title="SYNC LOCAL HISTORY">
            <div className="mono" style={{ fontSize: 10, color: 'var(--text-mute)', marginBottom: 8, lineHeight: 1.5 }}>
              Pushes every locally-logged day to the server at once. Use this if your reps are on this device but not on the leaderboard. Safe to run more than once. <span style={{ color: 'var(--text)' }}>{historyCount}</span> local day(s) on file.
            </div>
            <GhostBtn onClick={syncHistory}>{syncing ? 'SYNCING…' : '↑ SYNC HISTORY'}</GhostBtn>
            {syncMsg && (
              <div className="mono" style={{
                marginTop: 8, padding: '8px 10px',
                background: 'var(--card)', border: '1px solid var(--border)',
                color: 'var(--text-dim)', fontSize: 10, lineHeight: 1.5,
              }}>
                {syncMsg}
              </div>
            )}
          </Section>

          <Section title="DIAGNOSTIC">
            <div className="mono" style={{ fontSize: 10, color: 'var(--text-mute)', lineHeight: 1.6 }}>
              API: <span style={{ color: diag.apiEnabled ? 'var(--streak)' : '#FF8E8E' }}>{diag.apiEnabled ? 'ENABLED' : 'DISABLED'}</span><br/>
              Email: <span style={{ color: 'var(--text)' }}>{diag.email || '— (guest)'}</span><br/>
              User ID: <span style={{ color: 'var(--text)' }}>{diag.userId ? diag.userId.slice(0, 8) + '…' : '—'}</span><br/>
              Local streak: <span style={{ color: 'var(--streak)' }}>{state.streak}</span> · last log: <span style={{ color: 'var(--text)' }}>{state.lastLoggedDate || '—'}</span><br/>
              Server last workout: <span style={{ color: 'var(--text)' }}>{diag.lastWorkout || '— (tap PROBE)'}</span><br/>
              Server streak: <span style={{ color: 'var(--text)' }}>{diag.streak || '— (tap PROBE)'}</span>
            </div>
            <div style={{ marginTop: 8 }}>
              <GhostBtn onClick={probeServer}>{diag.probing ? 'PROBING…' : 'PROBE SERVER'}</GhostBtn>
            </div>
          </Section>

          <Section title="BUILD">
            <div className="mono" style={{ fontSize: 10, color: 'var(--text-mute)', marginBottom: 8, lineHeight: 1.4 }}>
              Running <span style={{ color: 'var(--streak)' }}>{window.APP_BUILD || 'dev'}</span>. Stuck on an old version? Force a clean reload — unregisters the service worker and clears the cache.
            </div>
            <GhostBtn onClick={async () => {
              try {
                if ('serviceWorker' in navigator) {
                  const regs = await navigator.serviceWorker.getRegistrations();
                  await Promise.all(regs.map(r => r.unregister()));
                }
                if (window.caches) {
                  const keys = await caches.keys();
                  await Promise.all(keys.map(k => caches.delete(k)));
                }
              } catch {}
              location.reload();
            }}>↻ FORCE REFRESH</GhostBtn>
          </Section>

          <Section title="ACCOUNT">
            <div className="mono" style={{ fontSize: 10, color: 'var(--text-mute)', marginBottom: 8, lineHeight: 1.5 }}>
              {diag.email ? <>Signed in as <span style={{ color: 'var(--text)' }}>{diag.email}</span>.</> : 'Not signed in.'}
            </div>
            <GhostBtn onClick={async () => {
              if (!confirm('Sign out of The Daily Max?')) return;
              try { window.api && window.api.signOut && (await window.api.signOut()); } catch {}
              // Clear the auth-only session key so re-entry hits the entrance.
              try { localStorage.removeItem('dailymax:entrance'); } catch {}
              location.reload();
            }}>↩ SIGN OUT</GhostBtn>
          </Section>

          <Section title="RESET">
            <GhostBtn onClick={() => {
              if (confirm('Wipe all progress?')) {
                localStorage.removeItem('dailymax:v1');
                localStorage.removeItem('dailymax:v2');
                localStorage.removeItem('dailymax:entrance');
                location.reload();
              }
            }}>WIPE DATA</GhostBtn>
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 22 }}>
      <div className="mono uppercase" style={{ fontSize: 9, letterSpacing: 2.5, color: 'var(--text-dim)', marginBottom: 8 }}>{title}</div>
      {children}
    </div>
  );
}

function OptionRow({ active, children, onClick }) {
  return (
    <button onClick={onClick} className="mono uppercase" style={{
      width: '100%', padding: '10px 12px', marginBottom: 4,
      background: active ? 'var(--accent-dim)' : 'var(--card)',
      border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
      color: active ? 'var(--accent)' : 'var(--text)',
      fontSize: 11, letterSpacing: 1.5, textAlign: 'left', cursor: 'pointer',
    }}>{children}</button>
  );
}

Object.assign(window, { TweaksPanel });
