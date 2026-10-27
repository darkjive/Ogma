import { MetricsShell } from './MetricsShell';
import { formatBytes } from '../../lib/format';

export function StorageWidget() {
  return (
    <MetricsShell>
      {metrics =>
        metrics.disk.length > 0 ? (
          <div className="grid gap-3 grid-cols-[repeat(auto-fit,minmax(14rem,1fr))]">
            {metrics.disk.slice(0, 3).map((disk, i) => (
              <div key={i} className="border-t border-line pt-3 first:border-t-0 first:pt-0">
                <div className="flex justify-between mb-1">
                  <span className="text-text-dim font-mono text-xs">{disk.mount}</span>
                  <span className="text-accent font-bold text-sm">
                    {disk.percentage.toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between text-xs mb-2">
                  <span className="text-text-muted">
                    {formatBytes(disk.used)} / {formatBytes(disk.size)}
                  </span>
                  <span className="text-text-muted">{formatBytes(disk.size - disk.used)} free</span>
                </div>
                <div
                  className={`ds-progress${disk.percentage > 90 ? ' over' : ''}`}
                  style={{ '--v': Number(disk.percentage) / 100 } as React.CSSProperties}
                >
                  <span />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-text-dim text-sm">Keine Laufwerke erkannt</div>
        )
      }
    </MetricsShell>
  );
}
