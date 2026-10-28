import { AlertTriangle } from 'lucide-react';
import type { ReactNode } from 'react';
import type { MetricsData } from '../../../shared/types';
import { useMetrics } from '../../lib/metricsStore';

interface MetricsShellProps {
  children: (metrics: MetricsData) => ReactNode;
}

const statusLabel = {
  connected: 'LIVE',
  connecting: 'CONNECTING',
  disconnected: 'OFFLINE',
} as const;

// Live status dot, rendered by the tile header of every metrics widget.
export function MetricsStatusDot() {
  const { status } = useMetrics();
  return (
    <span
      className={`w-2 h-2 rounded-full ${
        status === 'connected'
          ? 'bg-good animate-pulse'
          : status === 'connecting'
            ? 'bg-warn animate-pulse'
            : 'bg-bad'
      }`}
      title={statusLabel[status]}
    />
  );
}

// The tile frame already shows the widget name and live status; the shell lets the content
// fill the whole tile.
export function MetricsShell({ children }: MetricsShellProps) {
  const { metrics, loading, error, status } = useMetrics();

  return (
    <div className="relative h-full flex flex-col">
      <span className="sr-only" aria-live="polite">
        {statusLabel[status]}
      </span>

      <div className="flex-1 min-h-0 flex flex-col">
        {loading ? (
          <div className="text-accent text-sm">
            CONNECTING
            <span className="blink-cursor" />
          </div>
        ) : error ? (
          <div className="text-bad text-sm">
            <AlertTriangle size={14} className="inline mr-1" />
            {error}
            {status !== 'connected' && (
              <div className="text-xs text-text-muted mt-1">Attempting to reconnect…</div>
            )}
          </div>
        ) : !metrics ? (
          <div className="text-text-dim text-sm">Waiting for data...</div>
        ) : (
          children(metrics)
        )}
      </div>
    </div>
  );
}
