import { MetricsShell } from './MetricsShell';
import { Sparkline } from './Sparkline';
import { useMetrics } from '../../lib/metricsStore';

export function CpuWidget() {
  const { history } = useMetrics();
  return (
    <MetricsShell>
      {metrics => {
        const peak = Math.max(...metrics.cpu.cores.map(c => parseFloat(c.usage)));
        return (
          <div className="h-full flex flex-col justify-between gap-2">
            <div className="metric-value">{metrics.cpu.usage}%</div>
            <Sparkline values={history.map(h => h.cpu)} />
            <div className="text-xs text-text-dim">
              {metrics.cpu.cores.length} Kerne, Spitze {peak.toFixed(1)}%
            </div>
          </div>
        );
      }}
    </MetricsShell>
  );
}
