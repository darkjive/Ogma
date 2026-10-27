import { MetricsShell } from './MetricsShell';
import { formatBytes } from '../../lib/format';

export function MemoryWidget() {
  return (
    <MetricsShell>
      {metrics => (
        <div className="h-full flex flex-col justify-between gap-3">
          <div className="space-y-3 @md:space-y-0 @md:grid @md:grid-cols-2 @md:items-center @md:gap-4">
            <div className="metric-value @xs:text-3xl text-accent-bright">
              {metrics.memory.percentage}%
            </div>
            <div className="text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-text-dim">Used:</span>
                <span className="text-accent">{formatBytes(metrics.memory.used)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-dim">Free:</span>
                <span className="text-accent">{formatBytes(metrics.memory.free)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-dim">Total:</span>
                <span className="text-accent font-bold">{formatBytes(metrics.memory.total)}</span>
              </div>
            </div>
          </div>
          <div
            className="ds-progress"
            style={{ '--v': Number(metrics.memory.percentage) / 100 } as React.CSSProperties}
          >
            <span />
          </div>
        </div>
      )}
    </MetricsShell>
  );
}
