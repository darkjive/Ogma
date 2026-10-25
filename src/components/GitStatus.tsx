import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Dialog } from './Dialog';
import {
  ArrowUp,
  ArrowDown,
  RefreshCw,
  GitCommit,
  Upload,
  Download,
  FileText,
  FilePlus,
  FileQuestion,
  FolderGit2,
  Plus,
  X,
  Check,
  ChevronRight,
  Search,
  Cloud,
  CloudOff,
  AlertTriangle,
} from 'lucide-react';

import type {
  RepoState,
  RepoSummary,
  BulkResultItem,
  GitStatus as GitDetail,
} from '../../shared/types';
import { useSettingJSON } from '../lib/settings';
import { apiFetch } from '../lib/api';
import { toast } from '../lib/toast';

type FilterKey = 'all' | 'dirty' | 'ahead' | 'behind' | 'conflict';

// ============================================================
// Helpers
// ============================================================

const STATE_META: Record<RepoState, { label: string; dot: string; text: string; border: string }> =
  {
    clean: {
      label: 'clean',
      dot: 'bg-good',
      text: 'text-good',
      border: 'border-good/40',
    },
    dirty: {
      label: 'dirty',
      dot: 'bg-warn',
      text: 'text-warn',
      border: 'border-warn/40',
    },
    ahead: {
      label: 'ahead',
      dot: 'bg-accent',
      text: 'text-accent',
      border: 'border-accent/40',
    },
    behind: {
      label: 'behind',
      dot: 'bg-warn',
      text: 'text-warn',
      border: 'border-warn/40',
    },
    diverged: {
      label: 'diverged',
      dot: 'bg-[var(--cat-5)]',
      text: 'text-[var(--cat-5)]',
      border: 'border-[var(--cat-5)]/40',
    },
    'no-upstream': {
      label: 'no upstream',
      dot: 'bg-text-muted',
      text: 'text-text-muted',
      border: 'border-line-strong/40',
    },
    conflict: {
      label: 'conflict',
      dot: 'bg-bad',
      text: 'text-bad',
      border: 'border-bad/40',
    },
    error: { label: 'error', dot: 'bg-bad', text: 'text-bad', border: 'border-bad/40' },
  };

function matchesFilter(repo: RepoSummary, filter: FilterKey): boolean {
  switch (filter) {
    case 'all':
      return true;
    case 'dirty':
      return repo.changedFiles > 0;
    case 'ahead':
      return repo.ahead > 0;
    case 'behind':
      return repo.behind > 0;
    case 'conflict':
      return repo.state === 'conflict';
  }
}

function timeAgo(ts: number | null): string {
  if (!ts) return 'never';
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 5) return 'just now';
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

// ============================================================
// Component
// ============================================================

export function GitStatus() {
  // Roots configuration — persisted + synced with SettingsPanel automatically
  const [roots, setRoots] = useSettingJSON<string[]>('git-roots', []);
  const [showAddRoot, setShowAddRoot] = useState(false);
  const [newRoot, setNewRoot] = useState('');

  // Repo list
  const [repos, setRepos] = useState<RepoSummary[]>([]);
  const [scanning, setScanning] = useState(false);
  const [lastScan, setLastScan] = useState<number | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);

  // UI state
  const [expanded, setExpanded] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterKey>('all');
  const [search, setSearch] = useState('');
  const [actionLoading, setActionLoading] = useState<Record<string, string>>({});
  const [bulkLoading, setBulkLoading] = useState<string | null>(null);

  // Detail data (loaded on expand)
  const [detail, setDetail] = useState<GitDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [commitMsg, setCommitMsg] = useState('');
  const [showCommitInput, setShowCommitInput] = useState(false);

  // Bulk commit modal
  const [bulkCommitOpen, setBulkCommitOpen] = useState(false);
  const [bulkCommitMsg, setBulkCommitMsg] = useState('');

  // Confirmation modal for bulk ops
  const [confirm, setConfirm] = useState<{
    title: string;
    body: string;
    paths: string[];
    op: 'pull' | 'push' | 'fetch';
  } | null>(null);

  // ---- scanning ----
  // Roots being typed in SettingsPanel arrive per keystroke; skip blanks and
  // drop responses of superseded scans.
  const scanRoots = useMemo(() => roots.map(r => r.trim()).filter(Boolean), [roots]);
  const scanSeq = useRef(0);
  const scan = useCallback(async () => {
    if (scanRoots.length === 0) return;
    const seq = ++scanSeq.current;
    setScanning(true);
    setScanError(null);
    try {
      const res = await apiFetch('/api/git/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roots: scanRoots }),
      });
      const data = await res.json();
      if (seq !== scanSeq.current) return;
      if (!res.ok) throw new Error(data.error || 'Scan failed');
      setRepos(data.repos as RepoSummary[]);
      setLastScan(Date.now());
    } catch (err) {
      if (seq === scanSeq.current) setScanError(err instanceof Error ? err.message : 'Scan failed');
    } finally {
      if (seq === scanSeq.current) setScanning(false);
    }
  }, [scanRoots]);

  useEffect(() => {
    const id = setTimeout(scan, 500);
    return () => clearTimeout(id);
  }, [scan]);

  // periodic rescan (lightweight, doesn't auto-fetch)
  useEffect(() => {
    if (scanRoots.length === 0) return;
    const id = setInterval(() => scan(), 30000);
    return () => clearInterval(id);
  }, [scanRoots, scan]);

  // ---- root management ----
  const addRoot = () => {
    const r = newRoot.trim();
    if (!r) return;
    if (!roots.includes(r)) {
      setRoots([...roots, r]);
    }
    setNewRoot('');
    setShowAddRoot(false);
  };

  const removeRoot = (r: string) => {
    setRoots(roots.filter(x => x !== r));
  };

  // ---- detail ----
  // Only the latest request may write: a slow response for a previously
  // expanded repo must not overwrite the current one.
  const detailSeq = useRef(0);
  const loadDetail = useCallback(async (path: string) => {
    const seq = ++detailSeq.current;
    setDetailLoading(true);
    try {
      const res = await apiFetch(`/api/git/status?path=${encodeURIComponent(path)}`);
      const data = await res.json();
      if (seq === detailSeq.current) setDetail(data);
    } catch {
      if (seq === detailSeq.current) setDetail(null);
    } finally {
      if (seq === detailSeq.current) setDetailLoading(false);
    }
  }, []);

  const toggleExpand = (path: string) => {
    if (expanded === path) {
      detailSeq.current++;
      setExpanded(null);
      setDetail(null);
      setDetailLoading(false);
      setShowCommitInput(false);
    } else {
      setExpanded(path);
      setCommitMsg('');
      setShowCommitInput(false);
      loadDetail(path);
    }
  };

  // ---- single-repo actions ----
  const runRepoAction = async (path: string, op: 'pull' | 'push' | 'fetch') => {
    setActionLoading(prev => ({ ...prev, [path]: op }));
    try {
      const res = await apiFetch(`/api/git/${op}?path=${encodeURIComponent(path)}`, {
        method: 'POST',
      });
      const result = await res.json();
      if (!result.success) toast(`${op} failed: ${result.message}`);
      await Promise.all([scan(), expanded === path ? loadDetail(path) : Promise.resolve()]);
    } catch {
      toast(`${op} failed`);
    } finally {
      setActionLoading(prev => {
        const next = { ...prev };
        delete next[path];
        return next;
      });
    }
  };

  const handleCommit = async (path: string) => {
    if (!commitMsg.trim()) return;
    setActionLoading(prev => ({ ...prev, [path]: 'commit' }));
    try {
      const res = await apiFetch(`/api/git/commit?path=${encodeURIComponent(path)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: commitMsg }),
      });
      const result = await res.json();
      if (!result.success) {
        toast(`Commit failed: ${result.message}`);
      } else {
        setCommitMsg('');
        setShowCommitInput(false);
      }
      await Promise.all([scan(), loadDetail(path)]);
    } catch {
      toast('Commit failed');
    } finally {
      setActionLoading(prev => {
        const next = { ...prev };
        delete next[path];
        return next;
      });
    }
  };

  // ---- bulk actions ----
  const filteredRepos = useMemo(() => {
    const q = search.trim().toLowerCase();
    return repos
      .filter(r => matchesFilter(r, filter))
      .filter(r => !q || r.name.toLowerCase().includes(q) || r.path.toLowerCase().includes(q))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [repos, filter, search]);

  const bulkEligible = (): string[] => {
    return filteredRepos
      .filter(r => r.state !== 'error' && r.state !== 'conflict')
      .filter(r => r.hasUpstream)
      .map(r => r.path);
  };

  const runBulk = async (op: 'pull' | 'push' | 'fetch', paths: string[]) => {
    setBulkLoading(op);
    setConfirm(null);
    try {
      const res = await apiFetch(`/api/git/bulk/${op}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paths }),
      });
      const data = await res.json();
      const results: BulkResultItem[] = data.results || [];
      const failed = results.filter(r => !r.success);
      if (failed.length > 0) {
        const msg = failed.map(r => `• ${r.name}: ${r.message}`).join('\n');
        toast(`Bulk ${op}: ${failed.length} failed\n${msg}`);
      }
      await scan();
    } catch {
      toast(`Bulk ${op} failed`);
    } finally {
      setBulkLoading(null);
    }
  };

  const openConfirm = (op: 'pull' | 'push' | 'fetch') => {
    const paths = bulkEligible();
    if (paths.length === 0) {
      toast(`No eligible repos for bulk ${op}`, 'info');
      return;
    }
    setConfirm({
      title: `Bulk ${op.toUpperCase()}`,
      body: `Apply ${op} to ${paths.length} repositor${paths.length === 1 ? 'y' : 'ies'}?`,
      paths,
      op,
    });
  };

  const runBulkCommit = async () => {
    if (!bulkCommitMsg.trim()) return;
    const items = filteredRepos
      .filter(r => r.changedFiles > 0 && r.state !== 'conflict' && r.state !== 'error')
      .map(r => ({ path: r.path, message: bulkCommitMsg }));
    if (items.length === 0) {
      toast('No repos with changes to commit', 'info');
      return;
    }
    setBulkLoading('commit');
    setBulkCommitOpen(false);
    try {
      const res = await apiFetch('/api/git/bulk/commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      });
      const data = await res.json();
      const failed = (data.results || []).filter((r: BulkResultItem) => !r.success);
      if (failed.length > 0) {
        const msg = failed.map((r: BulkResultItem) => `• ${r.name}: ${r.message}`).join('\n');
        toast(`Bulk commit: ${failed.length} failed\n${msg}`);
      }
      setBulkCommitMsg('');
      await scan();
    } catch {
      toast('Bulk commit failed');
    } finally {
      setBulkLoading(null);
    }
  };

  // ---- stats ----
  const stats = useMemo(() => {
    const s = { clean: 0, dirty: 0, ahead: 0, behind: 0, conflict: 0, total: repos.length };
    for (const r of repos) {
      if (r.state === 'clean') s.clean++;
      if (r.changedFiles > 0) s.dirty++;
      if (r.ahead > 0) s.ahead++;
      if (r.behind > 0) s.behind++;
      if (r.state === 'conflict') s.conflict++;
    }
    return s;
  }, [repos]);

  // ============================================================
  // Render
  // ============================================================

  if (roots.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-4">
        <FolderGit2 className="w-10 h-12 text-accent mb-3" />
        <h3 className="text-sm font-bold text-text mb-1">Keine Dev-Ordner konfiguriert</h3>
        <p className="text-xs text-text-muted mb-4">
          Ordner hinzufügen, der nach Git-Repositories durchsucht wird.
        </p>
        <div className="w-full max-w-sm">
          <input
            type="text"
            value={newRoot}
            onChange={e => setNewRoot(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addRoot()}
            placeholder="/home/user/Dev"
            className="w-full px-3 py-2 bg-bg border border-line text-text text-xs rounded font-mono mb-2"
            autoFocus
          />
          <button onClick={addRoot} className="ds-btn primary block">
            Add Root & Scan
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* ---- Header ---- */}
      <div className="px-3 py-2 border-b border-line flex-shrink-0">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <FolderGit2 className="w-4 h-4 text-accent" />
            <span className="text-xs font-bold text-text">
              {repos.length} repo{repos.length === 1 ? '' : 's'}
            </span>
            <span className="text-xs text-text-muted">·</span>
            <span className="text-xs text-text-muted">{timeAgo(lastScan)}</span>
          </div>
          <button
            onClick={scan}
            disabled={scanning}
            className={`ds-btn sm icon${scanning ? ' busy' : ''}`}
            title="Rescan"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Roots chips */}
        <div className="flex flex-wrap gap-1 items-center">
          {roots.map(r => (
            <span
              key={r}
              className="inline-flex items-center gap-1 px-2 py-0.5 bg-elevated border border-line rounded text-xs text-text-dim font-mono max-w-36 truncate"
              title={r}
            >
              {r.split('/').pop() || r}
              <button
                onClick={() => removeRoot(r)}
                className="text-text-muted hover:text-bad"
                title={`Remove ${r}`}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </span>
          ))}
          <button
            onClick={() => setShowAddRoot(!showAddRoot)}
            className="inline-flex items-center gap-1 px-2 py-0.5 border border-dashed border-line rounded text-xs text-text-muted hover:text-accent hover:border-accent"
          >
            <Plus className="w-3.5 h-3.5" /> root
          </button>
        </div>

        {showAddRoot && (
          <div className="mt-2 flex gap-1">
            <input
              type="text"
              value={newRoot}
              onChange={e => setNewRoot(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addRoot()}
              placeholder="/home/user/Dev"
              className="flex-1 px-2 py-1 bg-bg border border-line text-text text-xs rounded font-mono"
              autoFocus
            />
            <button onClick={addRoot} className="ds-btn primary sm">
              Add
            </button>
            <button
              onClick={() => {
                setShowAddRoot(false);
                setNewRoot('');
              }}
              className="px-2 py-1 bg-active text-text rounded text-xs"
            >
              Abbrechen
            </button>
          </div>
        )}

        {scanError && <div className="mt-2 text-xs text-bad">Scan error: {scanError}</div>}
      </div>

      {/* ---- Stat strip ---- */}
      <div className="flex flex-wrap items-center gap-x-2 px-3 py-1.5 border-b border-line text-xs flex-shrink-0">
        <span className="text-good">{stats.clean} clean</span>
        <span className="text-text-muted">·</span>
        <span className="text-warn">{stats.dirty} dirty</span>
        <span className="text-text-muted">·</span>
        <span className="text-accent">{stats.ahead} ahead</span>
        <span className="text-text-muted">·</span>
        <span className="text-warn">{stats.behind} behind</span>
        {stats.conflict > 0 && (
          <>
            <span className="text-text-muted">·</span>
            <span className="text-bad">{stats.conflict} conflict</span>
          </>
        )}
      </div>

      {/* ---- Toolbar: filter + search + bulk ---- */}
      <div className="px-3 py-2 border-b border-line space-y-2 flex-shrink-0">
        <div className="flex items-center gap-1 flex-wrap">
          {(['all', 'dirty', 'ahead', 'behind', 'conflict'] as FilterKey[]).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-2 py-0.5 rounded text-xs border transition-colors ${
                filter === f
                  ? 'border-accent text-accent bg-accent/10'
                  : 'border-line text-text-muted hover:text-text'
              }`}
            >
              {f}
            </button>
          ))}
          <div className="ml-auto relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="search"
              className="pl-7 pr-2 py-0.5 bg-bg border border-line text-text text-xs rounded w-32"
            />
          </div>
        </div>

        <div className="grid grid-cols-4 gap-1">
          <button
            onClick={() => openConfirm('fetch')}
            disabled={bulkLoading !== null}
            className={`ds-btn sm${bulkLoading === 'fetch' ? ' busy' : ''}`}
            title="Fetch all filtered (git fetch --all --prune)"
          >
            <Cloud className="w-3.5 h-3.5" />
            <span className="hidden @sm:inline">Fetch</span>
          </button>
          <button
            onClick={() => openConfirm('pull')}
            disabled={bulkLoading !== null}
            className={`ds-btn sm${bulkLoading === 'pull' ? ' busy' : ''}`}
            title="Pull all filtered"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden @sm:inline">Pull</span>
          </button>
          <button
            onClick={() => openConfirm('push')}
            disabled={bulkLoading !== null}
            className={`ds-btn sm${bulkLoading === 'push' ? ' busy' : ''}`}
            title="Push all filtered"
          >
            <Upload className="w-3.5 h-3.5" />
            <span className="hidden @sm:inline">Push</span>
          </button>
          <button
            onClick={() => setBulkCommitOpen(true)}
            disabled={bulkLoading !== null}
            className={`ds-btn sm${bulkLoading === 'commit' ? ' busy' : ''}`}
            title="Commit all dirty repos with one message"
          >
            <GitCommit className="w-3.5 h-3.5" />
            <span className="hidden @sm:inline">Commit</span>
          </button>
        </div>
      </div>

      {/* ---- Repo list ---- */}
      <div className="flex-1 overflow-y-auto">
        {filteredRepos.length === 0 && (
          <div className="p-4 text-center text-xs text-text-muted">
            {repos.length === 0
              ? scanning
                ? 'Suche läuft …'
                : 'Keine Repositories gefunden'
              : 'Kein Repository passt zum Filter'}
          </div>
        )}

        {filteredRepos.map(repo => {
          const meta = STATE_META[repo.state];
          const isExpanded = expanded === repo.path;
          const loading = actionLoading[repo.path];
          return (
            <div key={repo.path} className="border-b border-line">
              {/* Row */}
              <button
                onClick={() => toggleExpand(repo.path)}
                className="w-full text-left px-3 py-2 hover:bg-elevated/50 flex items-center gap-2"
              >
                <ChevronRight
                  className={`w-3.5 h-3.5 text-text-muted flex-shrink-0 transition-transform ${
                    isExpanded ? 'rotate-90' : ''
                  }`}
                />
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${meta.dot}`} />
                <span className="text-xs text-text font-mono truncate flex-1">{repo.name}</span>

                {repo.hasUpstream ? null : (
                  <span title="No upstream" className="flex-shrink-0">
                    <CloudOff className="w-3.5 h-3.5 text-text-muted" />
                  </span>
                )}
                {repo.ahead > 0 && (
                  <span className="inline-flex items-center gap-0.5 text-xs text-accent">
                    <ArrowUp className="w-3.5 h-3.5" />
                    {repo.ahead}
                  </span>
                )}
                {repo.behind > 0 && (
                  <span className="inline-flex items-center gap-0.5 text-xs text-warn">
                    <ArrowDown className="w-3.5 h-3.5" />
                    {repo.behind}
                  </span>
                )}
                {repo.changedFiles > 0 && (
                  <span className="text-xs text-warn">+{repo.changedFiles}</span>
                )}
                {repo.branch && (
                  <span className="text-xs text-text-muted font-mono hidden @sm:inline">
                    {repo.branch}
                  </span>
                )}
              </button>

              {/* Expanded detail */}
              {isExpanded && (
                <div className="px-3 pb-3 bg-bg/40">
                  <div className="text-xs text-text-muted font-mono mb-2 truncate">{repo.path}</div>

                  {repo.state === 'conflict' && (
                    <div className="flex items-center gap-2 text-xs text-bad mb-2 p-2 border border-bad/30 bg-bad/10 rounded">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Merge conflict — resolve manually, skipped by bulk ops
                    </div>
                  )}

                  {repo.lastCommit && (
                    <div className="text-xs text-text-dim mb-2">
                      <span className="font-mono text-accent">{repo.lastCommit.hash}</span>{' '}
                      {repo.lastCommit.message}
                      <span className="text-text-muted">
                        {' '}
                        — {repo.lastCommit.author} · {repo.lastCommit.date}
                      </span>
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="grid grid-cols-3 gap-1 mb-2">
                    <button
                      onClick={() => runRepoAction(repo.path, 'fetch')}
                      disabled={!!loading || !repo.hasUpstream}
                      className={`ds-btn sm${loading === 'fetch' ? ' busy' : ''}`}
                    >
                      <Cloud className="w-3.5 h-3.5" />
                      Fetch
                    </button>
                    <button
                      onClick={() => runRepoAction(repo.path, 'pull')}
                      disabled={!!loading || !repo.hasUpstream}
                      className={`ds-btn sm${loading === 'pull' ? ' busy' : ''}`}
                    >
                      <Download className="w-3.5 h-3.5" />
                      Pull
                    </button>
                    <button
                      onClick={() => runRepoAction(repo.path, 'push')}
                      disabled={!!loading || !repo.hasUpstream}
                      className={`ds-btn sm${loading === 'push' ? ' busy' : ''}`}
                    >
                      <Upload className="w-3.5 h-3.5" />
                      Push
                    </button>
                  </div>

                  {/* Commit input */}
                  {!showCommitInput ? (
                    <button
                      onClick={() => setShowCommitInput(true)}
                      disabled={repo.changedFiles === 0}
                      className="ds-btn sm block"
                    >
                      <GitCommit className="w-3.5 h-3.5" />
                      Commit {repo.changedFiles > 0 ? `(${repo.changedFiles})` : ''}
                    </button>
                  ) : (
                    <div className="space-y-1">
                      <input
                        type="text"
                        value={commitMsg}
                        onChange={e => setCommitMsg(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') handleCommit(repo.path);
                          if (e.key === 'Escape') {
                            setShowCommitInput(false);
                            setCommitMsg('');
                          }
                        }}
                        placeholder="commit message..."
                        className="w-full px-2 py-1 bg-bg border border-line text-text rounded text-xs"
                        autoFocus
                      />
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleCommit(repo.path)}
                          disabled={loading === 'commit' || !commitMsg.trim()}
                          className="ds-btn primary sm flex-1"
                        >
                          {loading === 'commit' ? 'Committing...' : 'Commit All'}
                        </button>
                        <button
                          onClick={() => {
                            setShowCommitInput(false);
                            setCommitMsg('');
                          }}
                          className="px-2 py-1 bg-active text-text rounded text-xs"
                        >
                          Abbrechen
                        </button>
                      </div>
                    </div>
                  )}

                  {/* File lists */}
                  {detailLoading ? (
                    <div className="text-xs text-text-muted mt-2">Loading details...</div>
                  ) : detail ? (
                    <FileLists detail={detail} />
                  ) : null}

                  {repo.error && <div className="text-xs text-bad mt-2">Error: {repo.error}</div>}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ---- Bulk confirm modal ---- */}
      {confirm && (
        <Dialog open title={confirm.title} onClose={() => setConfirm(null)}>
          <p className="text-sm text-text mb-3">{confirm.body}</p>
          <div className="max-h-40 overflow-y-auto mb-3 text-xs text-text-muted font-mono space-y-0.5">
            {confirm.paths.map(p => (
              <div key={p} className="truncate">
                • {p.split('/').pop()}
              </div>
            ))}
          </div>
          <div className="ds-dialog-actions">
            <button onClick={() => setConfirm(null)} className="ds-btn sm">
              Abbrechen
            </button>
            <button
              onClick={() => runBulk(confirm.op, confirm.paths)}
              className="ds-btn primary sm"
            >
              {bulkLoading === confirm.op ? 'Running...' : `Confirm ${confirm.op.toUpperCase()}`}
            </button>
          </div>
        </Dialog>
      )}

      {/* ---- Bulk commit modal ---- */}
      {bulkCommitOpen && (
        <Dialog open title="Bulk Commit" onClose={() => setBulkCommitOpen(false)}>
          <p className="text-xs text-text-dim mb-2">
            Commit all dirty repos ({filteredRepos.filter(r => r.changedFiles > 0).length}) with
            this message:
          </p>
          <textarea
            value={bulkCommitMsg}
            onChange={e => setBulkCommitMsg(e.target.value)}
            placeholder="commit message for all repos..."
            className="w-full px-2 py-1 bg-bg border border-line text-text rounded text-xs font-mono mb-2 h-20 resize-none"
            autoFocus
          />
          <div className="ds-dialog-actions">
            <button onClick={() => setBulkCommitOpen(false)} className="ds-btn sm">
              Abbrechen
            </button>
            <button
              onClick={runBulkCommit}
              disabled={!bulkCommitMsg.trim()}
              className="ds-btn primary sm"
            >
              Commit All
            </button>
          </div>
        </Dialog>
      )}
    </div>
  );
}

// ============================================================
// Sub-components
// ============================================================

function FileLists({ detail }: { detail: GitDetail }) {
  if (!detail.hasChanges) {
    return (
      <div className="mt-2 p-2 bg-good/10 border border-good/30 rounded text-xs text-good flex items-center gap-2">
        <Check className="w-3.5 h-3.5" />
        Working tree clean
      </div>
    );
  }

  return (
    <div className="mt-2 space-y-1">
      {detail.staged.length > 0 && (
        <FileGroup
          icon={<FilePlus className="w-3.5 h-3.5 text-good" />}
          label="STAGED"
          count={detail.staged.length}
          files={detail.staged}
          colorClass="text-good border-good/30 bg-good/10"
        />
      )}
      {detail.unstaged.length > 0 && (
        <FileGroup
          icon={<FileText className="w-3.5 h-3.5 text-warn" />}
          label="MODIFIED"
          count={detail.unstaged.length}
          files={detail.unstaged}
          colorClass="text-warn border-warn/30 bg-warn/10"
        />
      )}
      {detail.untracked.length > 0 && (
        <FileGroup
          icon={<FileQuestion className="w-3.5 h-3.5 text-text-dim" />}
          label="UNTRACKED"
          count={detail.untracked.length}
          files={detail.untracked}
          colorClass="text-text-dim border-line-strong/30 bg-hover/10"
        />
      )}
    </div>
  );
}

function FileGroup({
  icon,
  label,
  count,
  files,
  colorClass,
}: {
  icon: React.ReactNode;
  label: string;
  count: number;
  files: string[];
  colorClass: string;
}) {
  return (
    <div className={`p-1.5 rounded border ${colorClass}`}>
      <div className="flex items-center gap-1 mb-0.5">
        {icon}
        <span className="text-xs font-bold">
          {label} ({count})
        </span>
      </div>
      <div className="text-xs text-text-dim font-mono space-y-0.5 max-h-16 overflow-y-auto">
        {files.slice(0, 8).map((f, i) => (
          <div key={i} className="truncate">
            {f}
          </div>
        ))}
        {files.length > 8 && <div className="text-text-muted">+ {files.length - 8} more</div>}
      </div>
    </div>
  );
}
