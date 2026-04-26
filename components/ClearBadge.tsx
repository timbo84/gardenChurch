'use client';

import { useEffect } from 'react';

export default function ClearBadge() {
  useEffect(() => {
    if ('clearAppBadge' in navigator) {
      navigator.clearAppBadge();
    }
  }, []);

  return null;
}
