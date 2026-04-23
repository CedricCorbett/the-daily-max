// CLAN SETTINGS — members, invite code, leader tools, leave.
// Opened from the clan screen via the gear icon.

function ClanSettingsScreen({ state, setState, go }) {
  const [clan, setClan] = useState(null);
  const [role, setRole] = useState(null);
  const [members, setMembers] = useState([]);
  const [err, setErr] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(null); // { kind: 'leave' | 'kick', user, name }
  const api = window.api;

  const load = async () => {
    if (!api || !api.enabled) {
      setErr('Supabase not configured.');
      return;
    }
    const { data: mine } = await api.myClan();
    if (!mine || !mine.clan) {
      setErr('No crew found.');
      return;
    }
    setClan(mine.clan);
    setRole(mine.role);
    const { data: mem } = await api.clanMembers(mine.clan.id);
    setMembers(mem || []);
  };

  useEffect(() => { load(); }, []);

  const isLeader = role === 'leader';
  const isSystem = !!(clan && clan.is_system);

  const copy = (txt) => {
    try { navigator.clipboard.writeText(txt); setInfo('Copied.'); setTimeout(() => setInfo(''), 1500); }
    catch { setErr('Copy failed.'); }
  };

  const regenerate = async () => {
    setErr(''); setInfo(''); setBusy(true);
    try {
      const { data, error } = await api.regenerateInviteCode();
      if (error) setErr(error.message);
      else { setClan(c => ({ ...c, invite_code: data })); setInfo('New code issued.'); }
    } finally { setBusy(false); }
  };

  const togglePublic = async () => {
    setBusy(true);
    try {
      const { data, error } = await api.updateClan({ isPublic: !clan.is_public });
      if (error) setErr(error.message);
      else setClan(data);
    } finally { setBusy(false); }
  };

  const leave = async () => {
    setBusy(true);
    try {
      const { error } = await api.leaveClan();
      if (error) { setErr(error.message); return; }
      setState(s => ({ ...s, clanId: null, clanRole: null, clanIsSystem: true }));
      go('clan-entry');
    } finally { setBusy(false); }
  };

  const kick = async (userId) => {
    setBusy(true);
    try {
      const { error } = await api.kickMember(userId);
      if (error) setErr(error.message);
      else setMembers(ms => ms.filter(m => m.user_id !== userId));
    } finally { setBusy(false); setConfirm(null); }
  };

  const transfer = async (userId) => {
    setBusy(true);
    try {
      const { error } = await api.transferLeadership(userId);
      if (error) setErr(error.message);
      else {
        setRole('member');
        setMembers(ms => ms.map(m => {
          if (m.user_id === userId) return { ...m, role: 'leader' };
          if (m.role === 'leader') return { ...m, role: 'member' };
          return m;
        }));
        setInfo('Leadership transferred.');
      }
    } finally { setBusy(false); }
  };

  return (
    <Shell>
      <TopBar
        left={<IconBtn onClick={() => go('clan')}>←</IconBtn>}
        title="CREW SETTINGS"
        right={<span />}
      />
      <HazardBar height={4} />

      <div style={{ padding: '14px 20px 60px', flex: 1 }}>
        {err && <Banner tone="err">{err}</Banner>}
        {info && <Banner tone="ok">{info}</Banner>}

        {clan && (
          <>
            <section style={{ marginBottom: 18 }}>
              <div className="display" style={{ fontSize: 22, color: 'var(--text)' }}>
                {clan.name} {clan.tag && <span className="mono" style={{ fontSize: 13, color: 'var(--gold, #C9A24A)' }}>[{clan.tag}]</span>}
              </div>
              {clan.description && (
                <div style={{ fontSize: 13, color: 'var(--text-mute)', marginTop: 4, lineHeight: 1.45 }}>
                  {clan.description}
                </div>
              )}
              <div className="mono" style={{ fontSize: 11, color: 'var(--text-mute)', marginTop: 6, letterSpacing: 1 }}>
                {members.length} / 25 · {clan.is_public ? 'PUBLIC' : 'PRIVATE'} · {clan.region_state || '—'} · {clan.age_bracket || '—'}
                {isSystem && <span style={{ color: 'var(--gold, #C9A24A)' }}> · SYSTEM</span>}
              </div>
            </section>

            {!isSystem && (
              <section style={{ marginBottom: 18, padding: 12, background: 'var(--card, #150D0D)', border: '1px solid var(--border)' }}>
                <div className="mono uppercase" style={{ fontSize: 11, letterSpacing: 3, color: 'var(--gold, #C9A24A)', marginBottom: 8 }}>
                  INVITE CODE
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div className="display" style={{ fontSize: 24, letterSpacing: 6, flex: 1, color: 'var(--text)' }}>
                    {clan.invite_code || '——————'}
                  </div>
                  <SmallBtn onClick={() => copy(clan.invite_code || '')}>COPY</SmallBtn>
                  {isLeader && <SmallBtn onClick={regenerate} disabled={busy}>ROTATE</SmallBtn>}
                </div>
                <div className="mono" style={{ fontSize: 10, color: 'var(--text-mute)', marginTop: 6, letterSpacing: 1, lineHeight: 1.4 }}>
                  {isLeader ? 'Share with crew. Rotate anytime if it leaks.' : 'Ask your leader to share.'}
                </div>
              </section>
            )}

            {isLeader && !isSystem && (
              <section style={{ marginBottom: 18 }}>
                <SectionTitle>LEADER CONTROLS</SectionTitle>
                <div style={{ display: 'grid', gap: 8 }}>
                  <SmallBtn onClick={togglePublic} disabled={busy} block>
                    {clan.is_public ? 'MAKE PRIVATE' : 'MAKE PUBLIC'}
                  </SmallBtn>
                </div>
              </section>
            )}

            <section style={{ marginBottom: 18 }}>
              <SectionTitle>CREW ({members.length})</SectionTitle>
              <div style={{ display: 'grid', gap: 6 }}>
                {members.map((m) => {
                  const p = m.profile || {};
                  const self = state && state.userId && m.user_id === state.userId;
                  return (
                    <div key={m.user_id} style={{
                      padding: 10,
                      background: 'var(--card, #150D0D)',
                      border: '1px solid var(--border)',
                      display: 'flex', alignItems: 'center', gap: 10,
                    }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, color: 'var(--text)' }}>
                          {p.display_name || p.username || 'Crew'} {self && <span className="mono" style={{ fontSize: 10, color: 'var(--gold, #C9A24A)', marginLeft: 4 }}>(YOU)</span>}
                          {m.role === 'leader' && <span className="mono" style={{ fontSize: 10, color: 'var(--accent, #8B1A1A)', marginLeft: 6, letterSpacing: 2 }}>LEADER</span>}
                        </div>
                        <div className="mono" style={{ fontSize: 10, color: 'var(--text-mute)', marginTop: 2, letterSpacing: 1 }}>
                          {p.region_state || '—'} · {p.age_bracket || '—'}
                        </div>
                      </div>
                      {isLeader && !self && !isSystem && (
                        <>
                          {m.role !== 'leader' && (
                            <SmallBtn onClick={() => transfer(m.user_id)} disabled={busy}>PROMOTE</SmallBtn>
                          )}
                          <SmallBtn
                            onClick={() => setConfirm({ kind: 'kick', user: m.user_id, name: p.display_name || 'Crew' })}
                            disabled={busy}
                            tone="danger"
                          >KICK</SmallBtn>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>

            {!isSystem && (
              <section style={{ marginTop: 24 }}>
                <SmallBtn
                  onClick={() => setConfirm({ kind: 'leave' })}
                  disabled={busy}
                  tone="danger"
                  block
                >LEAVE CREW</SmallBtn>
                {isLeader && members.length > 1 && (
                  <div className="mono" style={{ fontSize: 10, color: 'var(--text-mute)', marginTop: 6, letterSpacing: 1, lineHeight: 1.4 }}>
                    Leaders must promote someone before leaving.
                  </div>
                )}
              </section>
            )}
          </>
        )}
      </div>

      {confirm && (
        <ConfirmModal
          title={confirm.kind === 'leave' ? 'LEAVE THIS CREW?' : `KICK ${confirm.name?.toUpperCase()}?`}
          body={confirm.kind === 'leave'
            ? 'You\'ll drop back to The DM Crew until you find another.'
            : 'They\'ll need an invite to rejoin.'}
          onCancel={() => setConfirm(null)}
          onConfirm={() => confirm.kind === 'leave' ? leave() : kick(confirm.user)}
        />
      )}
    </Shell>
  );
}

function SectionTitle({ children }) {
  return (
    <div className="mono uppercase" style={{
      fontSize: 11, letterSpacing: 3, color: 'var(--text-mute, #8F857A)', marginBottom: 8, fontWeight: 700,
    }}>{children}</div>
  );
}

function Banner({ tone, children }) {
  const colors = tone === 'err'
    ? { bg: '#1F0D0D', bd: '#5A1F1F', fg: '#FF6B6B' }
    : { bg: '#0F1A0A', bd: '#2A4E1F', fg: '#9BD067' };
  return (
    <div className="mono" style={{
      fontSize: 12, letterSpacing: 1, marginBottom: 12,
      padding: '10px 12px', border: `1px solid ${colors.bd}`, background: colors.bg, color: colors.fg,
    }}>{children}</div>
  );
}

function SmallBtn({ children, onClick, disabled, tone = 'default', block = false }) {
  const palette = tone === 'danger'
    ? { bg: '#2A0909', bd: '#8B1A1A', fg: '#FF9B8A' }
    : { bg: 'transparent', bd: 'var(--border-2, #3A2626)', fg: 'var(--text-dim, #E5E0D6)' };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="mono uppercase"
      style={{
        padding: '8px 12px',
        background: palette.bg,
        border: `1px solid ${palette.bd}`,
        color: palette.fg,
        fontSize: 11, letterSpacing: 2, fontWeight: 700,
        cursor: disabled ? 'not-allowed' : 'pointer',
        width: block ? '100%' : 'auto',
      }}
    >{children}</button>
  );
}

function ConfirmModal({ title, body, onCancel, onConfirm }) {
  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 40,
      background: 'rgba(0,0,0,0.75)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24,
    }}>
      <div style={{
        width: '100%', maxWidth: 320,
        background: 'var(--bg, #0A0707)',
        border: '1px solid var(--accent, #8B1A1A)',
        padding: 18,
      }}>
        <div className="display" style={{ fontSize: 18, color: 'var(--text)', lineHeight: 1.1, marginBottom: 10 }}>
          {title}
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-mute)', lineHeight: 1.5, marginBottom: 16 }}>{body}</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={onCancel}
            className="mono uppercase"
            style={{
              flex: 1, padding: '10px 0',
              background: 'transparent',
              border: '1px solid var(--border-2, #3A2626)',
              color: 'var(--text-mute, #8F857A)',
              fontSize: 12, letterSpacing: 2,
              cursor: 'pointer',
            }}
          >CANCEL</button>
          <button
            onClick={onConfirm}
            className="mono uppercase"
            style={{
              flex: 1, padding: '10px 0',
              background: 'var(--accent, #8B1A1A)',
              border: '1px solid var(--accent, #8B1A1A)',
              color: '#F2ECE2',
              fontSize: 12, letterSpacing: 2, fontWeight: 700,
              cursor: 'pointer',
            }}
          >CONFIRM</button>
        </div>
      </div>
    </div>
  );
}

window.ClanSettingsScreen = ClanSettingsScreen;
