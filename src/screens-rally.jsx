// RALLY screen — community support board for crew members who broke their streak

function RallyScreen({ state, setState, go }) {
  const [tab, setTab] = useState('board'); // 'board' | 'inbox'
  const [sending, setSending] = useState(null); // id being rallied
  const [customMsg, setCustomMsg] = useState('');

  const sendRally = (dadId, msg) => {
    setState(s => ({
      ...s,
      ralliesSent: s.ralliesSent + 1,
      rallyBoard: s.rallyBoard.map(d => d.id === dadId
        ? { ...d, rallies: d.rallies + 1, sentByYou: true, yourNote: msg }
        : d),
    }));
    setSending(null);
    setCustomMsg('');
  };

  const board = state.rallyBoard || [];
  const inbox = state.rallyInbox || [];

  return (
    <Shell>
      <TopBar
        left={<IconBtn onClick={() => go('home')}>←</IconBtn>}
        title="THE RALLY BOARD"
        sub="NO ONE LEFT BEHIND"
      />
      <HazardBar height={4} />

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
        {[
          { id: 'board', label: `RALLY (${board.filter(d => !d.sentByYou).length})`, sub: 'CREW DOWN' },
          { id: 'inbox', label: `INBOX (${inbox.length})`, sub: 'FROM THE CREW' },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flex: 1, padding: '12px 0', background: 'transparent',
            border: 'none',
            borderBottom: `2px solid ${tab === t.id ? 'var(--accent)' : 'transparent'}`,
            color: tab === t.id ? 'var(--text)' : 'var(--text-mute)',
            cursor: 'pointer',
          }}>
            <div className="mono uppercase" style={{ fontSize: 12, letterSpacing: 1.5, fontWeight: 700 }}>{t.label}</div>
            <div className="mono" style={{ fontSize: 9, letterSpacing: 1.5, marginTop: 2, opacity: 0.7 }}>{t.sub}</div>
          </button>
        ))}
      </div>

      <div style={{ padding: '14px 20px 40px', flex: 1 }}>

        {tab === 'board' && (
          <>
            {state.onRally && (
              <div style={{ background: 'var(--accent-dim)', border: '1px solid var(--accent)', padding: 12, marginBottom: 14 }}>
                <div className="mono uppercase" style={{ fontSize: 11, letterSpacing: 2, color: 'var(--accent)' }}>YOU'RE ON THE BOARD</div>
                <div className="mono" style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 4, lineHeight: 1.4 }}>
                  Streak paused. {inbox.length} of the crew already rallied for you. Check INBOX.
                </div>
              </div>
            )}

            <div className="mono" style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 14, lineHeight: 1.4 }}>
              Crew members who broke their streak. Pick one. Send a rally. Bring them back. You've sent <span style={{ color: 'var(--accent)', fontWeight: 700 }}>{state.ralliesSent}</span> this month.
            </div>

            {board.length === 0 && (
              <div style={{
                background: 'var(--card)', border: '1px dashed var(--border-2)',
                padding: '24px 16px', textAlign: 'center', marginBottom: 14,
              }}>
                <div className="display" style={{ fontSize: 18, color: 'var(--text)', letterSpacing: '-0.01em' }}>
                  NO ONE'S DOWN.
                </div>
                <div className="mono" style={{ fontSize: 12, color: 'var(--text-mute)', marginTop: 8, lineHeight: 1.5 }}>
                  The crew is holding. Keep your streak alive<br/>
                  and this board stays empty.
                </div>
              </div>
            )}

            {board.map(dad => (
              <div key={dad.id} style={{
                background: 'var(--card)',
                border: `1px solid ${dad.sentByYou ? 'var(--streak)' : 'var(--border)'}`,
                padding: 14, marginBottom: 8,
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div className="display" style={{
                    width: 44, height: 44, background: 'var(--accent-dim)', color: 'var(--accent)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
                    flexShrink: 0,
                  }}>{dad.avatar}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                      <div style={{ fontSize: 15, fontWeight: 600 }}>{dad.name}</div>
                      <div className="mono" style={{ fontSize: 10, color: 'var(--text-mute)' }}>{dad.daysOff}D OFF</div>
                    </div>
                    <div className="mono" style={{ fontSize: 11, color: 'var(--text-mute)', marginTop: 2 }}>
                      {dad.city} · Lost a <span style={{ color: 'var(--danger)' }}>{dad.streakLost}d</span> streak
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-dim)', marginTop: 8, fontStyle: 'italic', lineHeight: 1.35 }}>
                      "{dad.note}"
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, gap: 8 }}>
                      <div className="mono" style={{ fontSize: 10, color: 'var(--streak)' }}>
                        ✊ {dad.rallies} {dad.rallies === 1 ? 'RALLY' : 'RALLIES'}
                      </div>
                      {dad.sentByYou ? (
                        <div className="mono uppercase" style={{
                          padding: '6px 10px', background: 'var(--streak-dim)', color: 'var(--streak)',
                          border: '1px solid var(--streak)', fontSize: 10, letterSpacing: 1.5,
                        }}>✓ RALLIED</div>
                      ) : (
                        <button onClick={() => setSending(dad.id)} className="mono uppercase" style={{
                          padding: '6px 10px', background: 'var(--accent)', color: '#0A0A0A',
                          border: 'none', fontSize: 10, letterSpacing: 1.5, fontWeight: 700, cursor: 'pointer',
                        }}>SEND RALLY</button>
                      )}
                    </div>

                    {sending === dad.id && (
                      <div style={{ marginTop: 12, padding: 12, background: 'var(--bg-2)', border: '1px solid var(--border-2)' }}>
                        <div className="mono uppercase" style={{ fontSize: 10, letterSpacing: 2, color: 'var(--text-mute)', marginBottom: 8 }}>
                          PICK A RALLY · OR WRITE ONE
                        </div>
                        {RALLY_ENCOURAGEMENTS.slice(0, 4).map((msg, i) => (
                          <button key={i} onClick={() => sendRally(dad.id, msg)} style={{
                            width: '100%', textAlign: 'left', padding: '8px 10px', marginBottom: 4,
                            background: 'var(--card)', border: '1px solid var(--border)',
                            color: 'var(--text-dim)', fontSize: 12, cursor: 'pointer', lineHeight: 1.35,
                            fontFamily: 'inherit',
                          }}>{msg}</button>
                        ))}
                        <textarea
                          value={customMsg}
                          onChange={e => setCustomMsg(e.target.value)}
                          placeholder="Your words. Make it count."
                          rows={2}
                          style={{
                            width: '100%', marginTop: 6, padding: '8px 10px',
                            background: 'var(--card)', border: '1px solid var(--border-2)',
                            color: 'var(--text)', fontSize: 12, resize: 'none',
                            fontFamily: 'JetBrains Mono',
                          }}
                        />
                        <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                          <button onClick={() => { setSending(null); setCustomMsg(''); }} className="mono uppercase" style={{
                            flex: 1, padding: 8, background: 'transparent',
                            border: '1px solid var(--border-2)', color: 'var(--text-dim)',
                            fontSize: 11, letterSpacing: 1.5, cursor: 'pointer',
                          }}>CANCEL</button>
                          <button
                            disabled={!customMsg.trim()}
                            onClick={() => sendRally(dad.id, customMsg.trim())}
                            className="mono uppercase"
                            style={{
                              flex: 2, padding: 8,
                              background: customMsg.trim() ? 'var(--accent)' : 'var(--bg-2)',
                              border: 'none', color: customMsg.trim() ? '#0A0A0A' : 'var(--text-mute)',
                              fontSize: 11, letterSpacing: 1.5, fontWeight: 700,
                              cursor: customMsg.trim() ? 'pointer' : 'default',
                            }}>SEND CUSTOM RALLY →</button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            <div style={{ marginTop: 14, padding: 12, background: 'var(--bg-2)', border: '1px dashed var(--border-2)' }}>
              <div className="mono uppercase" style={{ fontSize: 10, letterSpacing: 2, color: 'var(--text-mute)' }}>HOW IT WORKS</div>
              <div className="mono" style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 6, lineHeight: 1.5 }}>
                Miss a day → auto-listed here. First {RALLY_PUSH_CAP} rallies push a notification; the rest collect in the inbox (no spam). At 6am we send one combined nudge. First workout back unlists them + logs a comeback badge.
              </div>
            </div>
          </>
        )}

        {tab === 'inbox' && (
          <>
            <div className="mono" style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 14, lineHeight: 1.4 }}>
              {inbox.length === 0
                ? "Empty. Keep the streak alive and it stays empty. If it breaks, the crew shows up."
                : `${inbox.length} from the crew. Read them when you need to.`}
            </div>
            {inbox.map((msg, i) => (
              <div key={i} style={{ background: 'var(--card)', border: '1px solid var(--border)', padding: 14, marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--accent)' }}>✊ {msg.from}</div>
                  <div className="mono" style={{ fontSize: 10, color: 'var(--text-mute)' }}>{msg.when}</div>
                </div>
                <div className="mono" style={{ fontSize: 11, color: 'var(--text-mute)', marginTop: 2 }}>{msg.city}</div>
                <div style={{ fontSize: 14, color: 'var(--text)', marginTop: 10, lineHeight: 1.4, fontStyle: 'italic' }}>
                  "{msg.msg}"
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </Shell>
  );
}

Object.assign(window, { RallyScreen });
