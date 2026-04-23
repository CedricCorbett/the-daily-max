// CREW SCREEN — internal crew ops. Live totals, roster, in-crew board,
// leader round-ups. The old battle view moved out; this page is the
// "my crew today" home, which is what members actually need most days.
// Renamed UI-side to "Crew" but the component + route name stay as
// ClanScreen / 'clan' for back-compat.

function ClanScreen({ state, setState, go }) {
  const apiOk = !!(window.api && window.api.enabled);
  const clanId = state.clanId;
  const isLeader = state.clanRole === 'leader';
  const crewName = (state.clanName || 'DM CREW').toUpperCase();

  const [totals, setTotals] = useState(null);
  const [roster, setRoster] = useState(null);
  const [roundups, setRoundups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  const [showRoundupForm, setShowRoundupForm] = useState(false);

  const reload = async () => {
    if (!apiOk || !clanId) { setLoading(false); return; }
    setLoading(true); setErr('');
    try {
      const [t, r, ru] = await Promise.all([
        window.api.crewTotals(clanId),
        window.api.crewRoster(clanId),
        window.api.listCrewRoundups(),
      ]);
      if (t && t.error) throw new Error(t.error.message || 'totals failed');
      if (r && r.error) throw new Error(r.error.message || 'roster failed');
      if (ru && ru.error) throw new Error(ru.error.message || 'roundups failed');
      setTotals((t && t.data) || null);
      setRoster((r && r.data) || []);
      setRoundups((ru && ru.data) || []);
    } catch (e) {
      setErr(e.message || 'Something broke. Tap refresh.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { reload(); }, [clanId]);

  return (
    <Shell>
      <TopBar
        left={<IconBtn onClick={() => go('home')}>←</IconBtn>}
        title={crewName}
        sub={totals ? `${totals.member_count} CREW · ${totals.active_today || 0} IN TODAY` : 'CREW OPS'}
        right={<IconBtn onClick={() => go('clan-settings')}>⚙</IconBtn>}
      />
      <HazardBar height={4} />

      <div style={{ padding: '14px 20px 40px', flex: 1 }}>

        {!apiOk && (
          <InfoBar color="var(--accent)">Sign in to see your crew's live numbers.</InfoBar>
        )}
        {apiOk && !clanId && (
          <InfoBar color="var(--accent)">You're not in a crew yet. Join one from Crew Entry.</InfoBar>
        )}
        {err && (
          <InfoBar color="var(--accent)">{err} · Try refreshing.</InfoBar>
        )}

        {/* TOTALS */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 14 }}>
          <TotalsCard
            label="TODAY"
            big={loading ? '—' : formatBig(totals?.today_reps)}
            sub={loading ? ' ' : `+ ${formatBig(totals?.today_sec || 0)}s HOLD`}
            accent="var(--streak)"
          />
          <TotalsCard
            label="ALL-TIME"
            big={loading ? '—' : formatBig(totals?.alltime_reps)}
            sub={loading ? ' ' : `+ ${formatBig(totals?.alltime_sec || 0)}s HOLD`}
            accent="var(--accent)"
          />
        </div>

        {/* ROUND-UPS */}
        <SectionHead>
          ROUND-UPS
          {isLeader && !showRoundupForm && (
            <button onClick={() => setShowRoundupForm(true)} className="mono uppercase" style={pillBtn}>+ NEW</button>
          )}
        </SectionHead>

        {isLeader && showRoundupForm && (
          <RoundupForm
            onCancel={() => setShowRoundupForm(false)}
            onPosted={() => { setShowRoundupForm(false); reload(); }}
          />
        )}

        {!loading && roundups.length === 0 && !showRoundupForm && (
          <div style={emptyBox}>
            <div className="mono uppercase" style={{ fontSize: 10, letterSpacing: 2, color: 'var(--text-mute)' }}>
              NO ACTIVE ROUND-UPS
            </div>
            <div className="mono" style={{ fontSize: 10, color: 'var(--text-mute)', marginTop: 4, lineHeight: 1.5 }}>
              {isLeader
                ? 'Post one and rally the crew — they all see it on their home screen.'
                : 'Waiting on the leader. When a round-up drops, you can check in here.'}
            </div>
          </div>
        )}

        {roundups.map(r => (
          <RoundupCard
            key={r.id}
            r={r}
            isLeader={isLeader}
            onCheckin={async () => { try { await window.api.checkinCrewRoundup(r.id); } catch {} reload(); }}
            onEnd={async () => { if (confirm('End this round-up?')) { try { await window.api.endCrewRoundup(r.id); } catch {} reload(); } }}
          />
        ))}

        {/* CREW BOARD (in-crew leaderboard today) */}
        <SectionHead>CREW BOARD · TODAY</SectionHead>
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
          {loading && <BoardSkeleton />}
          {!loading && (!roster || roster.length === 0) && (
            <div style={{ padding: 14 }} className="mono">
              <span style={{ color: 'var(--text-mute)', fontSize: 10, letterSpacing: 1.5 }}>NO ROSTER</span>
            </div>
          )}
          {!loading && roster && roster.map((m, i) => {
            const youId = state.userId;
            const isYou = m.user_id === youId;
            const pct = m.pr_total > 0 ? Math.min(1, m.today_total / m.pr_total) : 0;
            return (
              <div key={m.user_id} style={{
                padding: '12px 14px',
                borderBottom: i < roster.length - 1 ? '1px solid var(--border)' : 'none',
                background: isYou ? 'var(--accent-dim)' : 'transparent',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div className="display" style={{
                    width: 28, height: 28, background: 'var(--bg-2)',
                    border: '1px solid var(--border-2)',
                    color: i === 0 ? 'var(--streak)' : 'var(--text-mute)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, flexShrink: 0,
                  }}>{String(i + 1).padStart(2, '0')}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: isYou ? 'var(--accent)' : 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {m.display_name}
                      {isYou && <span className="mono" style={{ fontSize: 9, color: 'var(--accent)', marginLeft: 6 }}>· YOU</span>}
                      {m.role === 'leader' && <span className="mono" style={{ fontSize: 8, color: 'var(--streak)', marginLeft: 6, letterSpacing: 2 }}>★ LEAD</span>}
                    </div>
                    <div className="mono" style={{ fontSize: 9, color: 'var(--text-mute)', marginTop: 2 }}>
                      STREAK {m.current_streak}d · PR {m.pr_total}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div className="display" style={{ fontSize: 18, color: m.today_total > 0 ? 'var(--streak)' : 'var(--text-mute)', lineHeight: 1 }}>
                      {m.today_total}
                    </div>
                    <div className="mono" style={{ fontSize: 8, color: 'var(--text-mute)', marginTop: 2 }}>TODAY</div>
                  </div>
                </div>
                {m.pr_total > 0 && (
                  <div style={{ marginTop: 6, height: 3, background: 'var(--border)' }}>
                    <div style={{ width: `${pct * 100}%`, height: '100%', background: pct >= 1 ? 'var(--streak)' : 'var(--accent)' }} />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Refresh */}
        <div style={{ marginTop: 14 }}>
          <GhostBtn onClick={reload}>↻ REFRESH CREW</GhostBtn>
        </div>

      </div>
    </Shell>
  );
}

// ─────────────── bits ───────────────

const pillBtn = {
  padding: '4px 10px', background: 'transparent',
  border: '1px solid var(--accent)', color: 'var(--accent)',
  fontSize: 9, letterSpacing: 1.5, fontWeight: 700, cursor: 'pointer',
};
const emptyBox = {
  padding: 14, background: 'var(--card)', border: '1px dashed var(--border-2)',
  marginBottom: 14,
};

function SectionHead({ children }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6, marginBottom: 8 }}>
      <div className="mono uppercase" style={{ fontSize: 9, letterSpacing: 2.5, color: 'var(--text-dim)' }}>{children}</div>
    </div>
  );
}

function InfoBar({ children, color }) {
  return (
    <div style={{
      background: 'var(--bg-2)', borderLeft: `3px solid ${color || 'var(--accent)'}`,
      padding: '10px 12px', marginBottom: 12,
    }}>
      <div className="mono" style={{ fontSize: 11, color: 'var(--text-dim)', lineHeight: 1.5 }}>{children}</div>
    </div>
  );
}

function TotalsCard({ label, big, sub, accent }) {
  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', padding: '14px 14px' }}>
      <div className="mono uppercase" style={{ fontSize: 9, letterSpacing: 2, color: 'var(--text-mute)' }}>{label}</div>
      <div className="display" style={{ fontSize: 28, color: accent || 'var(--text)', lineHeight: 1, marginTop: 4 }}>{big}</div>
      <div className="mono" style={{ fontSize: 9, color: 'var(--text-mute)', marginTop: 4 }}>{sub}</div>
    </div>
  );
}

function BoardSkeleton() {
  return (
    <div style={{ padding: 14 }} className="mono">
      <span style={{ color: 'var(--text-mute)', fontSize: 10, letterSpacing: 1.5 }}>LOADING…</span>
    </div>
  );
}

function formatBig(n) {
  if (n == null) return '—';
  if (n >= 10000) return (Math.round(n / 100) / 10).toString() + 'K';
  return Number(n).toLocaleString();
}

function RoundupCard({ r, isLeader, onCheckin, onEnd }) {
  const hoursLeft = Math.max(0, Math.round((new Date(r.expires_at) - Date.now()) / 3600000));
  return (
    <div style={{
      background: 'var(--card)', border: '1px solid var(--border)',
      padding: 14, marginBottom: 8,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="mono uppercase" style={{ fontSize: 9, letterSpacing: 2, color: 'var(--accent)' }}>
            ◆ ROUND-UP · {r.created_by_name.toUpperCase()}
          </div>
          <div className="display" style={{ fontSize: 18, lineHeight: 1.1, marginTop: 4 }}>{r.title}</div>
        </div>
        <div className="mono" style={{ fontSize: 10, color: 'var(--streak)', flexShrink: 0 }}>{hoursLeft}h</div>
      </div>
      <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-dim)', lineHeight: 1.5 }}>{r.cue}</div>
      <div style={{ display: 'flex', gap: 8, marginTop: 12, alignItems: 'center' }}>
        <div className="mono" style={{ fontSize: 10, color: 'var(--text-mute)', letterSpacing: 1.5 }}>
          {r.checkin_count} IN
        </div>
        <div style={{ flex: 1 }} />
        {isLeader && (
          <button onClick={onEnd} className="mono uppercase" style={{
            padding: '6px 10px', background: 'transparent',
            border: '1px solid var(--border-2)', color: 'var(--text-mute)',
            fontSize: 9, letterSpacing: 1.5, cursor: 'pointer',
          }}>END</button>
        )}
        <button
          onClick={onCheckin}
          disabled={r.you_checked_in}
          className="mono uppercase"
          style={{
            padding: '8px 14px',
            background: r.you_checked_in ? 'var(--streak-dim)' : 'var(--accent)',
            border: `1px solid ${r.you_checked_in ? 'var(--streak)' : 'var(--accent)'}`,
            color: r.you_checked_in ? 'var(--streak)' : '#0A0A0A',
            fontSize: 10, letterSpacing: 1.5, fontWeight: 700,
            cursor: r.you_checked_in ? 'default' : 'pointer',
          }}>{r.you_checked_in ? '✓ YOU\'RE IN' : "I'M IN"}</button>
      </div>
    </div>
  );
}

function RoundupForm({ onCancel, onPosted }) {
  const [title, setTitle] = useState('');
  const [cue, setCue] = useState('');
  const [hours, setHours] = useState(24);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const TEMPLATES = [
    { title: '100 Push-up Day', cue: '100 push-ups before bed. Break it up how you want. Chest to floor every rep.' },
    { title: 'No Zeros',        cue: 'Nobody logs a 0 today. Even 5 of each station counts. Show up.' },
    { title: 'The Hold Off',    cue: 'Crew-wide hollow challenge. Post your best hold in chat. Loser buys coffee.' },
    { title: 'Double Day',      cue: 'Today only: double one station of your Daily Max. Your pick. Log it, call it out.' },
  ];

  const submit = async () => {
    setErr('');
    if (!title.trim()) { setErr('Title required.'); return; }
    if (!cue.trim())   { setErr('Cue required.');   return; }
    setBusy(true);
    try {
      const res = await window.api.postCrewRoundup({ title: title.trim(), cue: cue.trim(), hours });
      if (res && res.error) setErr(res.error.message || 'Post failed.');
      else onPosted();
    } catch (e) {
      setErr(e.message || 'Post failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ background: 'var(--bg-2)', border: '1px solid var(--accent)', padding: 14, marginBottom: 14 }}>
      <div className="mono uppercase" style={{ fontSize: 10, letterSpacing: 2, color: 'var(--accent)', marginBottom: 8 }}>
        POST A ROUND-UP
      </div>

      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 10 }}>
        {TEMPLATES.map((t, i) => (
          <button key={i} onClick={() => { setTitle(t.title); setCue(t.cue); }} className="mono uppercase" style={{
            padding: '6px 8px', background: 'var(--card)', border: '1px solid var(--border-2)',
            color: 'var(--text-dim)', fontSize: 9, letterSpacing: 1, cursor: 'pointer',
          }}>{t.title}</button>
        ))}
      </div>

      <input
        value={title}
        onChange={e => setTitle(e.target.value)}
        maxLength={80}
        placeholder="Title · e.g. 100 PUSH-UP DAY"
        style={inputStyle}
      />
      <textarea
        value={cue}
        onChange={e => setCue(e.target.value)}
        maxLength={400}
        rows={3}
        placeholder="The cue. Short. Specific. On-brand."
        style={{ ...inputStyle, resize: 'vertical' }}
      />
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
        <div className="mono" style={{ fontSize: 9, letterSpacing: 1.5, color: 'var(--text-mute)' }}>EXPIRES IN</div>
        {[12, 24, 48, 72].map(h => (
          <button key={h} onClick={() => setHours(h)} className="mono" style={{
            padding: '4px 8px',
            background: hours === h ? 'var(--accent)' : 'transparent',
            border: `1px solid ${hours === h ? 'var(--accent)' : 'var(--border-2)'}`,
            color: hours === h ? '#0A0A0A' : 'var(--text-dim)',
            fontSize: 10, letterSpacing: 1, cursor: 'pointer',
          }}>{h}h</button>
        ))}
      </div>

      {err && <div className="mono" style={{ marginTop: 8, fontSize: 10, color: 'var(--accent)' }}>{err}</div>}

      <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
        <button onClick={onCancel} className="mono uppercase" style={{
          flex: 1, padding: 10, background: 'transparent',
          border: '1px solid var(--border-2)', color: 'var(--text-mute)',
          fontSize: 11, letterSpacing: 2, cursor: 'pointer',
        }}>CANCEL</button>
        <button
          onClick={submit}
          disabled={busy}
          className="mono uppercase"
          style={{
            flex: 2, padding: 10,
            background: busy ? 'var(--card)' : 'var(--accent)',
            border: `1px solid ${busy ? 'var(--border-2)' : 'var(--accent)'}`,
            color: busy ? 'var(--text-mute)' : '#0A0A0A',
            fontSize: 11, letterSpacing: 2, fontWeight: 700,
            cursor: busy ? 'default' : 'pointer',
          }}>{busy ? 'POSTING…' : 'POST TO CREW →'}</button>
      </div>
    </div>
  );
}

const inputStyle = {
  width: '100%', padding: '10px 12px', marginBottom: 6,
  background: 'var(--card)', border: '1px solid var(--border-2)',
  color: 'var(--text)', fontFamily: 'JetBrains Mono, monospace',
  fontSize: 12,
};

Object.assign(window, { ClanScreen });
