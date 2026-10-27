import { MetricsShell } from './MetricsShell';

export function TemperatureWidget() {
  return (
    <MetricsShell>
      {metrics =>
        metrics.temperature.available ? (
          <div className="h-full flex flex-col justify-between gap-3">
            <div className="space-y-1">
              <div className="metric-value @xs:text-3xl text-accent-bright">
                {metrics.temperature.main.toFixed(1)}°C
              </div>
              <div className="text-xs text-text-dim">
                Max: {metrics.temperature.max.toFixed(1)}°C
              </div>
            </div>
            <div
              className={`ds-progress${metrics.temperature.main > 85 ? ' over' : ''}`}
              style={
                { '--v': Math.min(metrics.temperature.main, 100) / 100 } as React.CSSProperties
              }
            >
              <span />
            </div>
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
