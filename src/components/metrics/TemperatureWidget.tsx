import { MetricsShell } from './MetricsShell';
import { Sparkline } from './Sparkline';
import { useMetrics } from '../../lib/metricsStore';

export function TemperatureWidget() {
  const { history } = useMetrics();
  return (
    <MetricsShell>
      {metrics =>
        metrics.temperature.available ? (
          <div className="h-full flex flex-col justify-between gap-3">
            <div className="space-y-1">
              <div className="metric-value text-accent-bright">
                {metrics.temperature.main.toFixed(1)}°C
              </div>
              <div className="text-xs text-text-dim">
                Max: {metrics.temperature.max.toFixed(1)}°C
              </div>
            </div>
            <Sparkline values={history.map(h => h.temp ?? 0)} max={100} />
          </div>
        ) : (
          <div className="space-y-2">
            <div className="text-text-dim text-sm">Nicht verfügbar</div>
            <div className="text-xs text-text-muted border-l-2 border-line-strong pl-3">
              {metrics.temperature.reason || 'Keine Temperatursensoren erkannt'}
            </div>
          </div>
        )
      }
    </MetricsShell>
  );
}
