'use client';

import { useEffect, useState } from 'react';

/** A 0-100 bar that fills from empty when it mounts (or instantly with reduced motion). */
export default function ScoreBar({
  value,
  color,
  align = 'left',
  dim = false,
  height = 10,
}: {
  value: number;
  color: string;
  align?: 'left' | 'right';
  dim?: boolean;
  height?: number;
}) {
  const [shown, setShown] = useState(0);

  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(value));
    return () => cancelAnimationFrame(id);
  }, [value]);

  return (
    <div className="w-full overflow-hidden rounded-full bg-white/[0.06]" style={{ height }}>
      <div
        className={`score-fill h-full rounded-full ${align === 'right' ? 'ml-auto' : ''}`}
        style={{ width: `${shown}%`, background: color, opacity: dim ? 0.45 : 1 }}
      />
    </div>
  );
}
