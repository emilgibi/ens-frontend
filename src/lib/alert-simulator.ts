'use client';

import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { AlertEvent } from '@/types/ccm';
import { seedAlerts, simulatedAlertPool } from '@/data/ccm-dummy/alerts';

let idCounter = 1000;

export function useAlertSimulator(intervalMs = 18000) {
  const [alerts, setAlerts] = useState<AlertEvent[]>(
    [...seedAlerts].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
  );
  const poolIndex = useRef(0);

  useEffect(() => {
    const timer = setInterval(() => {
      const template = simulatedAlertPool[poolIndex.current % simulatedAlertPool.length];
      poolIndex.current += 1;

      const newAlert: AlertEvent = {
        ...template,
        id: `a-live-${idCounter++}`,
        timestamp: new Date().toISOString(),
      };

      setAlerts((prev) => [newAlert, ...prev]);

      toast(newAlert.title, {
        description: `${newAlert.vendorName} · ${newAlert.severity}`,
      });
    }, intervalMs);

    return () => clearInterval(timer);
  }, [intervalMs]);

  return alerts;
}
