import { MetricsShell } from './MetricsShell';
import { Sparkline } from './Sparkline';
import { formatBytes } from '../../lib/format';
import { useMetrics } from '../../lib/metricsStore';

export function MemoryWidget() {
  const { history } = useMetrics();
  return (
    <MetricsShell>
      {metrics => (
        <div className="h-full flex flex-col justify-between gap-2">
          <div className="metric-value text-accent-bright">{metrics.memory.percentage}%</div>
          <Sparkline values={history.map(h => h.memory)} />
          <div className="text-xs text-text-dim">
            {formatBytes(metrics.memory.used)} von {formatBytes(metrics.memory.total)}
          </div>
        </div>
      )}
    </MetricsShell>
  );
}
