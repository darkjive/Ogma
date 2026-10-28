import { MetricsShell } from './MetricsShell';
import { Sparkline } from './Sparkline';
import { formatMb } from '../../lib/format';
import { useMetrics } from '../../lib/metricsStore';

export function VramWidget() {
  const { history } = useMetrics();
  return (
    <MetricsShell>
      {metrics =>
        metrics.vram && metrics.vram.available ? (
          <div className="h-full grid gap-3 grid-cols-[repeat(auto-fit,minmax(14rem,1fr))] auto-rows-fr">
            {metrics.vram.gpus.map((gpu, i) => (
              <div key={i} className="flex flex-col justify-between gap-2">
                <div>
                  {gpu.percentage !== undefined && (
                    <div className="metric-value">{gpu.percentage}%</div>
                  )}
                  <div className="text-text-dim font-mono text-xs truncate" title={gpu.model}>
                    {gpu.model}
                  </div>
                </div>
                <div>
                  <Sparkline values={history.map(h => h.vram ?? 0)} />
                  <div className="flex justify-between text-xs mt-1">
                    <span className="text-text-muted">
                      {gpu.usedMb !== undefined ? formatMb(gpu.usedMb) : '—'} /{' '}
                      {formatMb(gpu.totalMb)}
                    </span>
                    <span className="text-text-muted">{gpu.vendor}</span>
                  </div>
                </div>
              </div>
            ))}
            {!metrics.vram.dynamic && metrics.vram.reason && (
              <div className="text-xs text-text-muted border-l-2 border-line-strong pl-3">
                {metrics.vram.reason}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <div className="text-text-dim text-sm">Nicht verfügbar</div>
            <div className="text-xs text-text-muted border-l-2 border-line-strong pl-3">
              {metrics.vram?.reason || 'Kein GPU-VRAM erkannt'}
            </div>
          </div>
        )
      }
    </MetricsShell>
  );
}
