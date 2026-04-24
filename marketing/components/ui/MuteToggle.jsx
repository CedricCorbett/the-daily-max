'use client';

import { useEffect, useRef, useState } from 'react';

export default function MuteToggle() {
  const [muted, setMuted] = useState(true);
  const audioRef = useRef(null);

  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.muted = muted;
    if (!muted) audioRef.current.play().catch(() => {});
  }, [muted]);

  return (
    <>
      <audio
        ref={audioRef}
        loop
        preload="none"
        src=""
        aria-hidden="true"
      />
      <button
        onClick={() => setMuted((m) => !m)}
        className="fixed top-4 right-4 z-50 mono-label px-3 py-2 border border-border bg-void/70 backdrop-blur hover:border-oxblood transition-colors"
        aria-pressed={!muted}
        aria-label={muted ? 'Unmute ambient audio' : 'Mute ambient audio'}
      >
        {muted ? 'SOUND · OFF' : 'SOUND · ON'}
      </button>
    </>
  );
}
