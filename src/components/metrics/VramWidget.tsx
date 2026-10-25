import { MemoryStick } from 'lucide-react';
import { MetricsShell } from './MetricsShell';
import { formatMb } from '../../lib/format';

export function VramWidget() {
  return (
    <MetricsShell title="VRAM" icon={<MemoryStick className="text-accent w-4 h-4" />}>
      {metrics =>
        metrics.vram && metrics.vram.available ? (
          <div className="grid gap-3 @md:grid-cols-2">
            {metrics.vram.gpus.map((gpu, i) => (
              <div key={i} className="border-t border-line pt-3 first:border-t-0 first:pt-0">
                <div className="flex justify-between mb-1">
                  <span className="text-text-dim font-mono text-xs truncate" title={gpu.model}>
                    {gpu.model}
                  </span>
                  {gpu.percentage !== undefined && (
                    <span className="text-accent font-bold text-sm">{gpu.percentage}%</span>
                  )}
                </div>
                <div className="flex justify-between text-xs mb-2">
                  <span className="text-text-muted">
                    {gpu.usedMb !== undefined ? formatMb(gpu.usedMb) : '—'} /{' '}
                    {formatMb(gpu.totalMb)}
                  </span>
                  <span className="text-text-muted">{gpu.vendor}</span>
                </div>
                {gpu.percentage !== undefined && (
                  <div
                    className="ds-progress"
                    style={{ '--v': Number(gpu.percentage) / 100 } as React.CSSProperties}
                  >
                    <span />
                  </div>
                )}
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
