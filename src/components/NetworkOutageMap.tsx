import { useState, useEffect } from 'react';
import { RefreshCw, WifiOff, Wifi } from 'lucide-react';
import { apiFetch } from '../lib/api';

interface ConnectivityCheck {
  name: string;
  reachable: boolean;
  latencyMs: number | null;
}

export function NetworkOutageMap() {
  const [checks, setChecks] = useState<ConnectivityCheck[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchConnectivity = async () => {
    try {
      const res = await apiFetch('/api/connectivity');
      if (!res.ok) return;
      const data = await res.json();
      setChecks(data.checks);
      setLastUpdated(new Date(data.timestamp));
    } catch {
      // Backend not ready yet or unavailable
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConnectivity();
    const interval = setInterval(fetchConnectivity, 60000);
    return () => clearInterval(interval);
  }, []);

  const getLatencyColor = (reachable: boolean, latencyMs: number | null) => {
    if (!reachable) return 'text-bad';
    if (latencyMs === null) return 'text-text-muted';
    if (latencyMs < 100) return 'text-good';
    if (latencyMs < 400) return 'text-warn';
    return 'text-bad';
  };

  const getLatencyLabel = (reachable: boolean, latencyMs: number | null) => {
    if (!reachable) return 'UNREACHABLE';
    if (latencyMs === null) return '—';
    return `${latencyMs}ms`;
  };

  const allReachable = checks.length > 0 && checks.every(c => c.reachable);
  const someUnreachable = checks.some(c => !c.reachable);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-accent">
          SCANNING NETWORK<span className="blink-cursor"></span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="flex justify-end -mt-2 mb-1">
        <button onClick={fetchConnectivity} className="ds-btn ghost icon" title="Refresh">
          <RefreshCw className="w-4 h-4 text-text-dim hover:text-accent" />
        </button>
      </div>

      {/* Overall status banner */}
      <div
        className={`mb-4 p-3 rounded border flex items-center gap-2 ${
          allReachable
            ? 'bg-good/15 border-good/40 text-good'
            : someUnreachable
              ? 'bg-bad/15 border-bad/40 text-bad'
              : 'bg-hover/20 border-line-strong/40 text-text-dim'
        }`}
      >
        {allReachable ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
        <span className="text-sm font-bold">
          {allReachable
            ? 'All targets reachable'
            : someUnreachable
              ? 'Some targets unreachable'
              : 'Checking...'}
        </span>
      </div>

      {/* Individual checks */}
      <div className="space-y-2">
        {checks.map(check => (
          <div
            key={check.name}
            className="flex items-center justify-between p-3 bg-bg rounded border border-line"
          >
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${check.reachable ? 'bg-good' : 'bg-bad'}`} />
              <span className="font-mono text-sm">{check.name}</span>
            </div>
            <span
              className={`text-xs font-bold font-mono ${getLatencyColor(check.reachable, check.latencyMs)}`}
            >
              {getLatencyLabel(check.reachable, check.latencyMs)}
            </span>
          </div>
        ))}
      </div>

      {lastUpdated && (
        <div className="mt-4 text-xs text-text-muted text-right">
          Updated {lastUpdated.toLocaleTimeString()}
        </div>
      )}
    </div>
  );
}
