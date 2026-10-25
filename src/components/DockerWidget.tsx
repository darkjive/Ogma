import { useState, useEffect } from 'react';
import { Container, Play, Square, AlertCircle, RefreshCw } from 'lucide-react';
import type { DockerInfo } from '../../shared/types';
import { apiFetch } from '../lib/api';

export function DockerWidget() {
  const [dockerInfo, setDockerInfo] = useState<DockerInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDockerInfo = async () => {
    try {
      const res = await apiFetch('/api/docker');
      if (!res.ok) throw new Error('Failed to fetch Docker info');

      const data: DockerInfo = await res.json();
      setDockerInfo(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDockerInfo();
    const interval = setInterval(fetchDockerInfo, 5000); // Update every 5s
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-accent animate-pulse">Loading Docker info...</div>
      </div>
    );
  }

  if (error || !dockerInfo) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-4">
        <AlertCircle className="w-12 h-12 text-bad mb-2" />
        <div className="text-bad text-sm">{error || 'Failed to load Docker info'}</div>
        <button onClick={fetchDockerInfo} className="ds-btn mt-4">
          Retry
        </button>
      </div>
    );
  }

  if (!dockerInfo.available) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-4">
        <Container className="w-12 h-12 text-text-muted mb-2" />
        <div className="text-text-dim text-sm">{dockerInfo.error || 'Docker nicht verfügbar'}</div>
        <div className="text-xs text-text-muted mt-2">Make sure Docker daemon is running</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col space-y-4">
      {/* Stats Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-elevated border border-line rounded-lg p-2 @xs:p-3">
          <div className="text-xs text-text-dim mb-1">TOTAL</div>
          <div className="text-xl @xs:text-2xl font-bold text-accent">{dockerInfo.total}</div>
        </div>
        <div className="bg-elevated border border-good/30 rounded-lg p-2 @xs:p-3">
          <div className="text-xs text-text-dim mb-1">RUNNING</div>
          <div className="text-xl @xs:text-2xl font-bold text-good">{dockerInfo.running}</div>
        </div>
        <div className="bg-elevated border border-bad/30 rounded-lg p-2 @xs:p-3">
          <div className="text-xs text-text-dim mb-1">STOPPED</div>
          <div className="text-xl @xs:text-2xl font-bold text-bad">{dockerInfo.stopped}</div>
        </div>
      </div>

      {/* Container List */}
      <div className="flex-1 overflow-y-auto space-y-2">
        {dockerInfo.containers.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-text-dim">
            <Container className="w-8 h-8 mb-2 opacity-50" />
            <div className="text-sm">Keine Container gefunden</div>
          </div>
        ) : (
          dockerInfo.containers.map(container => (
            <div
              key={container.id}
              className={`bg-elevated border rounded-lg p-3 transition-colors ${
                container.state === 'running'
                  ? 'border-good/50 hover:border-good'
                  : 'border-bad/50 hover:border-bad'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  {container.state === 'running' ? (
                    <Play className="w-4 h-4 text-good" fill="currentColor" />
                  ) : (
                    <Square className="w-4 h-4 text-bad" />
                  )}
                  <div className="font-mono text-sm font-bold text-accent truncate max-w-52">
                    {container.name}
                  </div>
                </div>
                <div
                  className={`text-xs font-mono px-2 py-1 rounded ${
                    container.state === 'running' ? 'bg-good/15 text-good' : 'bg-bad/15 text-bad'
                  }`}
                >
                  {container.state.toUpperCase()}
                </div>
              </div>

              <div className="space-y-1 text-xs text-text-dim">
                <div className="flex items-center gap-2">
                  <span className="text-text-muted">Image:</span>
                  <span className="font-mono truncate">{container.image}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-text-muted">Status:</span>
                  <span className="font-mono">{container.status}</span>
                </div>
                {container.ports && container.ports.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-text-muted">Ports:</span>
                    <span className="font-mono text-accent-bright">
                      {container.ports.join(', ')}
                    </span>
                  </div>
                )}
                {(container.cpu !== undefined || container.memory !== undefined) && (
                  <div className="flex items-center gap-4 mt-2">
                    {container.cpu !== undefined && (
                      <div className="flex items-center gap-1">
                        <span className="text-text-muted">CPU:</span>
                        <span className="font-mono text-accent">{container.cpu.toFixed(1)}%</span>
                      </div>
                    )}
                    {container.memory !== undefined && (
                      <div className="flex items-center gap-1">
                        <span className="text-text-muted">MEM:</span>
                        <span className="font-mono text-accent">
                          {container.memory.toFixed(1)}%
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Auto-refresh indicator */}
      <div className="flex items-center justify-center gap-2 text-xs text-text-muted">
        <RefreshCw className="w-3.5 h-3.5 animate-spin-slow" />
        <span>Auto-refresh every 5s</span>
      </div>
    </div>
  );
}
