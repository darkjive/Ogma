import { Thermometer } from 'lucide-react';
import { MetricsShell } from './MetricsShell';

export function TemperatureWidget() {
  return (
    <MetricsShell title="TEMPERATURE" icon={<Thermometer className="text-accent-bright w-4 h-4" />}>
      {metrics =>
        metrics.temperature.available ? (
          <div className="space-y-1">
            <div className="text-3xl @xs:text-3xl font-bold text-accent-bright">
              {metrics.temperature.main.toFixed(1)}°C
            </div>
            <div className="text-xs text-text-dim">Max: {metrics.temperature.max.toFixed(1)}°C</div>
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
