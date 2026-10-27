import { MetricsShell } from './MetricsShell';

export function CpuWidget() {
  return (
    <MetricsShell>
      {metrics => (
        <div className="h-full flex flex-col gap-3">
          <div className="metric-value @xs:text-3xl">{metrics.cpu.usage}%</div>
          <div className="flex-1 grid grid-cols-[repeat(auto-fill,minmax(6.5rem,1fr))] auto-rows-fr gap-x-3 gap-y-2 content-end">
            {metrics.cpu.cores.slice(0, 16).map((core, i) => (
              <div key={i} className="text-xs flex flex-col justify-end gap-1">
                <div className="flex justify-between gap-2">
                  <span className="text-text-dim whitespace-nowrap">Core {i}</span>
                  <span
                    className={`font-bold ${
                      parseFloat(core.usage) > 80 ? 'text-accent-bright' : 'text-accent'
                    }`}
                  >
                    {core.usage}%
                  </span>
                </div>
                <div
                  className="ds-progress hidden @md:block"
                  style={{ '--v': Number(core.usage) / 100 } as React.CSSProperties}
                >
                  <span />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </MetricsShell>
  );
}
