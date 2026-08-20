import { useEffect, useState } from 'react';

export function useRotatingStatus(phrases: string[], intervalMs = 900): string {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (phrases.length <= 1) return;
    const id = setInterval(() => setIndex(i => (i + 1) % phrases.length), intervalMs);
    return () => clearInterval(id);
  }, [phrases, intervalMs]);

  return phrases[index % phrases.length];
}