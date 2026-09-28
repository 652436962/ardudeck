/**
 * Alerts raised by modules (host.alerts), routed into the host's own message
 * stream so they look and sort like every other alert. Advisory only.
 */

import type { ModuleAlert, ModuleAlertSeverity } from '@ardudeck/module-sdk';
import { useMessagesStore } from '../stores/messages-store';
import type { StatusSeverity } from '../../shared/ipc-channels';

/** Module severities onto the host's MAVLink-shaped ones. */
const MAP: Record<ModuleAlertSeverity, { n: number; label: StatusSeverity }> = {
  info: { n: 6, label: 'INFO' },
  notice: { n: 5, label: 'NOTICE' },
  caution: { n: 4, label: 'WARNING' },
  warning: { n: 3, label: 'ERROR' },
  critical: { n: 2, label: 'CRITICAL' },
};

/** Last text shown per alert, so re-raising the same thing stays quiet. */
const shown = new Map<string, string>();

function keyFor(slug: string, id: string): string {
  return `${slug}::${id}`;
}

export function raiseModuleAlert(slug: string, alert: ModuleAlert): void {
  if (!alert?.id || !alert.message) return;
  const sev = MAP[alert.severity] ?? MAP.info;
  const key = keyFor(slug, alert.id);
  const text = `${alert.message}`;
  if (shown.get(key) === `${alert.severity}:${text}`) return;
  shown.set(key, `${alert.severity}:${text}`);
  useMessagesStore.getState().addMessage(sev.n, sev.label, text);
}

export function clearModuleAlert(slug: string, id: string): void {
  shown.delete(keyFor(slug, id));
}

export function clearModuleAlertsFor(slug: string): void {
  for (const k of [...shown.keys()]) {
    if (k.startsWith(`${slug}::`)) shown.delete(k);
  }
}
