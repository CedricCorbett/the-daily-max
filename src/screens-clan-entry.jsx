// CLAN ENTRY — create / join-by-code / browse-regional.
// Shown when user is only in the DM Clan (system fallback). From the clan settings
// panel, "Leave crew → Find a new one" also lands here.

const US_STATES_CLAN = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
  'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
  'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY','DC','OTHER',
];
const AGE_BRACKETS_CLAN = ['20s','30s','40s','50s','60+'];

function ClanEntryScreen({ state, setState, go }) {
  const [panel, setPanel] = useState(null); // null | 'create' | 'code' | 'browse'
  const [err, setErr] = useState('');
  const api = window.api;
  const apiEnabled = api && api.enabled;

  const onJoined = async () => {
    setErr('');
    if (apiEnabled) {
      const { data } = await api.myClan();
      setState(s => ({
        ...s,
        clanId: data?.clan?.id || null,
        clanRole: data?.role || null,
        clanIsSystem: !!data?.clan?.is_system,
      }));
    }
    go('clan');
  };

  return (
    <Shell>
      <TopBar
        left={<IconBtn onClick={() => go('home')}>←</IconBtn>}
        title="FIND YOUR CREW"
        right={<span />}
      />
      <HazardBar height={4} />

      <div style={{ padding: '14px 20px 40px', flex: 1 }}>
        <div style={{ marginBottom: 14 }}>
          <div className="display" style={{ fontSize: 28, lineHeight: 1.05, color: 'var(--text)' }}>
            A CREW OF 2–25.
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-mute)', marginTop: 8, lineHeight: 1.5 }}>
            Your commitment is yours. Your absence is everyone's.
            Start a crew, join one with a code, or browse crews in your state.
          </div>
        </div>

        {err && (
          <div className="mono" style={{
            fontSize: 11, color: '#FF6B6B', letterSpacing: 1, marginBottom: 12,
            padding: '10px 12px', border: '1px solid #5A1F1F', background: '#1F0D0D',
          }}>{err}</div>
        )}

        {!panel && (
          <div style={{ display: 'grid', gap: 10 }}>
            <EntryCard glyph="◆" label="CREATE A CREW"  sub="Name it. Lead it."               onClick={() => setPanel('create')} />
            <EntryCard glyph="✊" label="JOIN BY CODE"    sub="Got an invite? Enter it."        onClick={() => setPanel('code')} />
            <EntryCard glyph="⌕" label="BROWSE REGIONAL" sub="Public crews in your state."     onClick={() => setPanel('browse')} />
            <div style={{ marginTop: 8 }}>
              <button
                onClick={() => go('home')}
                className="mono uppercase"
                style={{
                  width: '100%', padding: '12px 0',
                  background: 'transparent',
                  border: '1px solid var(--border, #2A1B1B)',
                  color: 'var(--text-mute, #8F857A)',
                  fontSize: 10, letterSpacing: 2,
                  cursor: 'pointer',
                }}
              >
                STAY IN THE DM CREW FOR NOW
              </button>
            </div>
          </div>
        )}

        {panel === 'create' && (
          <CreatePanel
            state={state}
            onCancel={() => setPanel(null)}
            onCreated={onJoined}
            setErr={setErr}
          />
        )}

        {panel === 'code' && (
          <CodePanel onCancel={() => setPanel(null)} onJoined={onJoined} setErr={setErr} />
        )}

        {panel === 'browse' && (
          <BrowsePanel state={state} onCancel={() => setPanel(null)} onJoined={onJoined} setErr={setErr} />
        )}
      </div>
    </Shell>
  );
}

function EntryCard({ glyph, label, sub, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'block', width: '100%', textAlign: 'left',
        padding: 16,
        background: 'var(--card, #150D0D)',
        border: '1px solid var(--border, #2A1B1B)',
        cursor: 'pointer',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div className="display" style={{
          width: 40, height: 40, fontSize: 22,
          background: 'var(--accent, #8B1A1A)', color: '#F2ECE2',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>{glyph}</div>
        <div>
          <div className="mono uppercase" style={{
            fontSize: 12, letterSpacing: 2, fontWeight: 700, color: 'var(--text, #F2ECE2)',
          }}>{label}</div>
          <div className="mono" style={{ fontSize: 10, color: 'var(--text-mute, #8F857A)', marginTop: 2 }}>{sub}</div>
        </div>
      </div>
    </button>
  );
}

function PanelShell({ title, onCancel, children }) {
  return (
    <div style={{
      padding: 14,
      background: 'var(--card, #150D0D)',
      border: '1px solid var(--border, #2A1B1B)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div className="mono uppercase" style={{ fontSize: 11, letterSpacing: 3, color: 'var(--gold, #C9A24A)', fontWeight: 700 }}>{title}</div>
        <button
          onClick={onCancel}
          className="mono uppercase"
          style={{
            background: 'transparent', border: 'none',
            color: 'var(--text-mute, #8F857A)',
            fontSize: 10, letterSpacing: 2, cursor: 'pointer',
          }}
        >CANCEL</button>
      </div>
      {children}
    </div>
  );
}

function CreatePanel({ state, onCancel, onCreated, setErr }) {
  const [name, setName] = useState('');
  const [tag, setTag] = useState('');
  const [desc, setDesc] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [regionState, setRegionState] = useState(state.regionState || '');
  const [bracket, setBracket] = useState(state.ageBracket || '');
  const [busy, setBusy] = useState(false);
  const api = window.api;

  const submit = async () => {
    setErr('');
    if (!name.trim() || name.length < 3 || name.length > 24) return setErr('Name: 3–24 chars.');
    if (tag && (tag.length < 2 || tag.length > 4)) return setErr('Tag: 2–4 chars.');

    setBusy(true);
    try {
      if (!api || !api.enabled) {
        setErr('Supabase not configured — can\'t create yet.');
        return;
      }
      const { data, error } = await api.createClan({
        name: name.trim(), tag: tag.trim(), description: desc.trim(),
        isPublic, regionState, ageBracket: bracket,
      });
      if (error) return setErr(error.message || 'Could not create.');
      onCreated(data);
    } finally {
      setBusy(false);
    }
  };

  return (
    <PanelShell title="CREATE A CREW" onCancel={onCancel}>
      <div style={{ display: 'grid', gap: 10 }}>
        <FieldText label="NAME" value={name} onChange={setName} placeholder="3–24 chars" maxLength={24} />
        <FieldText label="TAG (OPTIONAL)" value={tag} onChange={(v) => setTag(v.toUpperCase())} placeholder="2–4 chars" maxLength={4} />
        <FieldText label="DESCRIPTION (OPTIONAL)" value={desc} onChange={setDesc} placeholder="140 chars" maxLength={140} />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <FieldSelect label="STATE" value={regionState} onChange={setRegionState} options={US_STATES_CLAN} />
          <FieldSelect label="AGE BRACKET" value={bracket} onChange={setBracket} options={AGE_BRACKETS_CLAN} />
        </div>

        <label className="mono uppercase" style={{
          display: 'flex', alignItems: 'center', gap: 8,
          fontSize: 10, letterSpacing: 2, color: 'var(--text-mute, #8F857A)',
        }}>
          <input
            type="checkbox"
            checked={isPublic}
            onChange={(e) => setIsPublic(e.target.checked)}
            style={{ accentColor: 'var(--accent, #8B1A1A)' }}
          />
          PUBLIC (APPEARS IN REGIONAL BROWSE)
        </label>

        <PrimaryBtn onClick={submit} disabled={busy}>{busy ? '...' : 'CREATE'}</PrimaryBtn>
      </div>
    </PanelShell>
  );
}

function CodePanel({ onCancel, onJoined, setErr }) {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const api = window.api;

  const submit = async () => {
    setErr('');
    const v = code.trim().toUpperCase();
    if (v.length !== 6) return setErr('Codes are 6 characters.');

    setBusy(true);
    try {
      if (!api || !api.enabled) return setErr('Supabase not configured.');
      const { data, error } = await api.joinClanByCode(v);
      if (error) return setErr(error.message || 'Bad code.');
      onJoined(data);
    } finally {
      setBusy(false);
    }
  };

  return (
    <PanelShell title="JOIN BY CODE" onCancel={onCancel}>
      <div style={{ display: 'grid', gap: 10 }}>
        <div>
          <div className="mono uppercase" style={{
            fontSize: 9, letterSpacing: 3, color: 'var(--text-mute, #8F857A)', marginBottom: 6,
          }}>INVITE CODE</div>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/[^A-Za-z0-9]/g, '').slice(0, 6).toUpperCase())}
            placeholder="K4R7VM"
            autoCapitalize="characters"
            style={{
              width: '100%', padding: '16px 12px',
              background: '#0A0707',
              border: '1px solid var(--border, #2A1B1B)',
              color: 'var(--text, #F2ECE2)',
              fontSize: 22, letterSpacing: 8, textAlign: 'center',
              fontFamily: 'JetBrains Mono, monospace',
              borderRadius: 0, outline: 'none',
            }}
          />
        </div>
        <PrimaryBtn onClick={submit} disabled={busy || code.length !== 6}>
          {busy ? '...' : 'JOIN'}
        </PrimaryBtn>
      </div>
    </PanelShell>
  );
}

function BrowsePanel({ state, onCancel, onJoined, setErr }) {
  const [filterState, setFilterState] = useState(state.regionState || '');
  const [filterBracket, setFilterBracket] = useState('');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [joining, setJoining] = useState(null);
  const api = window.api;

  const load = async () => {
    setErr('');
    setLoading(true);
    try {
      if (!api || !api.enabled) { setRows([]); return; }
      const { data, error } = await api.listRegionalClans({
        state: filterState || null,
        bracket: filterBracket || null,
      });
      if (error) setErr(error.message || 'Could not load.');
      else setRows(data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [filterState, filterBracket]);

  const join = async (id) => {
    setErr('');
    setJoining(id);
    try {
      const { data, error } = await api.joinClan(id);
      if (error) setErr(error.message || 'Could not join.');
      else onJoined(data);
    } finally {
      setJoining(null);
    }
  };

  return (
    <PanelShell title="BROWSE REGIONAL" onCancel={onCancel}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
        <FieldSelect label="STATE" value={filterState} onChange={setFilterState} options={US_STATES_CLAN} />
        <FieldSelect label="AGE BRACKET" value={filterBracket} onChange={setFilterBracket} options={AGE_BRACKETS_CLAN} />
      </div>

      {loading && (
        <div className="mono" style={{ fontSize: 10, letterSpacing: 2, color: 'var(--text-mute, #8F857A)', padding: 12, textAlign: 'center' }}>
          LOADING...
        </div>
      )}

      {!loading && rows.length === 0 && (
        <div className="mono" style={{ fontSize: 11, color: 'var(--text-mute, #8F857A)', padding: 12, textAlign: 'center', lineHeight: 1.5 }}>
          No public crews match. Start one — be the founding 1.
        </div>
      )}

      <div style={{ display: 'grid', gap: 8 }}>
        {rows.map((c) => (
          <div key={c.id} style={{
            padding: 12, background: '#0A0707',
            border: '1px solid var(--border, #2A1B1B)',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text, #F2ECE2)' }}>
                {c.name} {c.tag && <span className="mono" style={{ color: 'var(--gold, #C9A24A)', fontSize: 10, marginLeft: 4 }}>[{c.tag}]</span>}
              </div>
              <div className="mono" style={{ fontSize: 9, color: 'var(--text-mute, #8F857A)', marginTop: 2, letterSpacing: 1 }}>
                {c.member_count} / 25 · {c.region_state || '—'} · {c.age_bracket || '—'}
              </div>
              {c.description && (
                <div style={{ fontSize: 11, color: 'var(--text-dim, #E5E0D6)', marginTop: 4, lineHeight: 1.4 }}>
                  {c.description}
                </div>
              )}
            </div>
            <button
              onClick={() => join(c.id)}
              disabled={joining === c.id || c.member_count >= 25}
              className="mono uppercase"
              style={{
                padding: '8px 12px',
                background: c.member_count >= 25 ? '#333' : 'var(--accent, #8B1A1A)',
                border: 'none',
                color: '#F2ECE2',
                fontSize: 10, letterSpacing: 2, fontWeight: 700,
                cursor: c.member_count >= 25 ? 'not-allowed' : 'pointer',
              }}
            >
              {c.member_count >= 25 ? 'FULL' : joining === c.id ? '...' : 'JOIN'}
            </button>
          </div>
        ))}
      </div>
    </PanelShell>
  );
}

function FieldText({ label, value, onChange, placeholder, maxLength }) {
  return (
    <div>
      <div className="mono uppercase" style={{
        fontSize: 9, letterSpacing: 3, color: 'var(--text-mute, #8F857A)', marginBottom: 6,
      }}>{label}</div>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        style={{
          width: '100%', padding: '12px 12px',
          background: '#0A0707',
          border: '1px solid var(--border, #2A1B1B)',
          color: 'var(--text, #F2ECE2)',
          fontSize: 14,
          fontFamily: 'JetBrains Mono, monospace',
          borderRadius: 0, outline: 'none',
        }}
      />
    </div>
  );
}

function FieldSelect({ label, value, onChange, options }) {
  return (
    <div>
      <div className="mono uppercase" style={{
        fontSize: 9, letterSpacing: 3, color: 'var(--text-mute, #8F857A)', marginBottom: 6,
      }}>{label}</div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: '100%', padding: '12px 10px',
          background: '#0A0707',
          border: '1px solid var(--border, #2A1B1B)',
          color: 'var(--text, #F2ECE2)',
          fontSize: 13,
          fontFamily: 'JetBrains Mono, monospace',
          borderRadius: 0, outline: 'none',
        }}
      >
        <option value="">— ALL —</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

window.ClanEntryScreen = ClanEntryScreen;
