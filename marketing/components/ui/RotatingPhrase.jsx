'use client';

import { useEffect, useState } from 'react';
import { AUTH_PHRASES } from '@/lib/phrases';

export default function RotatingPhrase() {
  const [i, setI] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const id = setInterval(() => setVisible(false), 4500);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (visible) return;
    const t = setTimeout(() => {
      setI((prev) => (prev + 1) % AUTH_PHRASES.length);
      setVisible(true);
    }, 500);
    return () => clearTimeout(t);
  }, [visible]);

  return (
    <div
      className="mono-gold"
      style={{
        minHeight: 22,
        fontSize: 13,
        textAlign: 'center',
        opacity: visible ? 1 : 0,
        transition: 'opacity 500ms ease',
      }}
    >
      {AUTH_PHRASES[i]}
    </div>
  );
}
