import { MetricsShell } from './MetricsShell';
import { formatBytes } from '../../lib/format';

export function StorageWidget() {
  return (
    <MetricsShell>
      {metrics => {
        // Skip pseudo filesystems (size 0, e.g. efivars) and bind mounts of the same volume (/ and /srv).
        const seen = new Set<string>();
        const disks = metrics.disk
          .filter(d => d.size > 0)
          .filter(d => {
            const key = `${d.fs}|${d.size}|${d.used}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          })
          .slice(0, 4);
        return disks.length > 0 ? (
          <div className="h-full flex flex-col justify-around gap-3">
            {disks.map(disk => (
              <div key={disk.mount} className="space-y-1.5">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-text-dim font-mono text-xs truncate" title={disk.mount}>
                    {disk.mount}
                  </span>
                  <span className="text-accent font-bold text-lg tabular-nums">
                    {disk.percentage.toFixed(1)}%
                  </span>
                </div>
                <div
                  className={`ds-progress${disk.percentage > 90 ? ' over' : ''}`}
                  style={{ '--v': Number(disk.percentage) / 100 } as React.CSSProperties}
                >
                  <span />
                </div>
                <div className="flex justify-between text-xs text-text-muted tabular-nums">
                  <span>
                    {formatBytes(disk.used)} / {formatBytes(disk.size)}
                  </span>
                  <span>{formatBytes(disk.size - disk.used)} frei</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-text-dim text-sm">Keine Laufwerke erkannt</div>
        );
      }}
    </MetricsShell>
  );
}
