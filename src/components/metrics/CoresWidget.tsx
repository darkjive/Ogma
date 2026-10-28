import { MetricsShell } from './MetricsShell';

export function CoresWidget() {
  return (
    <MetricsShell>
      {metrics => (
        <div className="h-full grid grid-cols-[repeat(auto-fill,minmax(5.5rem,1fr))] auto-rows-fr gap-1">
          {metrics.cpu.cores.map((core, i) => {
            const usage = parseFloat(core.usage);
            return (
              <div
                key={i}
                className="flex items-center justify-between gap-2 rounded-sm px-2 text-xs tabular-nums"
                style={{
                  background: `color-mix(in srgb, var(--accent) ${Math.min(80, 8 + usage * 0.7)}%, var(--bg-hover))`,
                }}
              >
                <span className="text-text-dim">{i}</span>
                <b>{core.usage}%</b>
              </div>
            );
          })}
        </div>
      )}
    </MetricsShell>
  );
}
