import { useState } from 'react';
import { Dialog } from './Dialog';
import { Plus, Trash2, Cloud, Github, GitBranch, KeyRound } from 'lucide-react';
import { getSetting, getSettingJSON, setSetting, setSettingRaw } from '../lib/settings';
import { getDashboardToken, setDashboardToken } from '../lib/api';

interface SettingsPanelProps {
  open: boolean;
  onClose: () => void;
}

type SectionId = 'general' | 'sound' | 'git';

const SECTIONS: Array<{ id: SectionId; label: string }> = [
  { id: 'general', label: 'General' },
  { id: 'sound', label: 'Sound' },
  { id: 'git', label: 'Git Roots' },
];

export function SettingsPanel({ open, onClose }: SettingsPanelProps) {
  const [section, setSection] = useState<SectionId>('general');

  return (
    <Dialog open={open} onClose={onClose} title="Einstellungen" wide>
      <div className="ds-segment self-start" role="group" aria-label="Bereich">
        {SECTIONS.map(s => (
          <button
            key={s.id}
            type="button"
            onClick={() => setSection(s.id)}
            aria-pressed={section === s.id}
          >
            {s.label}
          </button>
        ))}
      </div>
      {section === 'general' && <GeneralSection />}
      {section === 'sound' && <SoundSection />}
      {section === 'git' && <GitSection />}
    </Dialog>
  );
}

// ============================================================
// Reusable bits
// ============================================================

function SectionHeader({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="mb-5">
      <h3 className="text-sm font-bold text-accent">{title}</h3>
      {hint && <p className="text-xs text-text-muted mt-1">{hint}</p>}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="ds-label">{label}</span>
      {children}
    </label>
  );
}

const inputClass = 'ds-input w-full';

// ============================================================
// General: GitHub Username + Weather Location
// ============================================================

function GeneralSection() {
  const [githubUsername, setGithubUsername] = useState(() => getSetting('github-username', ''));
  const [weatherLocation, setWeatherLocation] = useState(() =>
    getSetting('weather-location', 'Munich')
  );
  const [dashboardToken, setToken] = useState(() => getDashboardToken());

  return (
    <div className="space-y-6 max-w-md">
      <SectionHeader title="GENERAL" hint="Global scalar settings used across widgets." />

      <Field label="GITHUB USERNAME">
        <div className="flex items-center gap-2">
          <Github className="w-4 h-4 text-text-muted shrink-0" />
          <input
            type="text"
            value={githubUsername}
            onChange={e => setGithubUsername(e.target.value)}
            onBlur={() => setSettingRaw('github-username', githubUsername.trim())}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                setSettingRaw('github-username', githubUsername.trim());
              }
            }}
            placeholder="e.g. torvalds"
            className={inputClass}
          />
        </div>
      </Field>

      <Field label="WEATHER LOCATION">
        <div className="flex items-center gap-2">
          <Cloud className="w-4 h-4 text-text-muted shrink-0" />
          <input
            type="text"
            value={weatherLocation}
            onChange={e => setWeatherLocation(e.target.value)}
            onBlur={() => setSettingRaw('weather-location', weatherLocation.trim() || 'Munich')}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                setSettingRaw('weather-location', weatherLocation.trim() || 'Munich');
              }
            }}
            placeholder="e.g. Berlin"
            className={inputClass}
          />
        </div>
      </Field>

      <Field label="DASHBOARD TOKEN">
        <div className="flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-text-muted shrink-0" />
          <input
            type="password"
            value={dashboardToken}
            onChange={e => setToken(e.target.value)}
            onBlur={() => setDashboardToken(dashboardToken.trim())}
            onKeyDown={e => {
              if (e.key === 'Enter') setDashboardToken(dashboardToken.trim());
            }}
            placeholder="only needed when backend is LAN-exposed"
            autoComplete="off"
            className={inputClass}
          />
        </div>
      </Field>

      <p className="text-xs text-text-muted">
        GitHub username and weather use public data only. The dashboard token is sent as{' '}
        <code className="text-accent">X-Dashboard-Token</code> on every API request and is only
        required if you set <code className="text-accent">DASHBOARD_TOKEN</code> on a LAN-exposed
        backend.
      </p>
    </div>
  );
}

// ============================================================
// Sound
// ============================================================

function SoundSection() {
  const [enabled, setEnabled] = useState(() => getSetting('sound-enabled', 'true'));
  const [volume, setVolume] = useState(() => getSetting('sound-volume', '0.3'));

  const isEnabled = enabled !== 'false';

  const toggle = () => {
    const next = !isEnabled;
    setEnabled(String(next));
    setSettingRaw('sound-enabled', String(next));
  };

  const changeVolume = (v: string) => {
    setVolume(v);
    setSettingRaw('sound-volume', v);
  };

  return (
    <div className="space-y-6 max-w-md">
      <SectionHeader title="SOUND" hint="Background ambiance playback." />

      <div className="flex items-center justify-between p-3 bg-bg border border-line rounded">
        <div>
          <div className="text-sm font-mono text-text">Ambiance Enabled</div>
          <div className="text-xs text-text-muted mt-1">Toggle background sound playback.</div>
        </div>
        <input
          type="checkbox"
          className="ds-switch"
          checked={isEnabled}
          onChange={toggle}
          aria-label="Ambiance Enabled"
        />
      </div>

      <Field label={`VOLUME — ${Math.round(parseFloat(volume) * 100)}%`}>
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={parseFloat(volume) || 0.3}
          onChange={e => changeVolume(e.target.value)}
          className="w-full accent-accent"
        />
      </Field>
    </div>
  );
}

// ============================================================
// Generic list editor
// ============================================================

function ListEditor<T>({
  storageKey,
  defaultItems,
  renderItem,
  emptyLabel,
  addLabel,
  buildNew,
}: {
  storageKey: string;
  defaultItems: T[];
  renderItem: (item: T, replace: (next: T) => void, remove: () => void) => React.ReactNode;
  emptyLabel: string;
  addLabel: string;
  buildNew: () => T;
}) {
  const [items, setItems] = useState<T[]>(() => getSettingJSON<T[]>(storageKey, defaultItems));

  const persist = (next: T[]) => {
    setItems(next);
    setSetting(storageKey, next);
  };

  const add = () => persist([...items, buildNew()]);
  const remove = (idx: number) => persist(items.filter((_, i) => i !== idx));
  const replace = (idx: number, next: T) => persist(items.map((it, i) => (i === idx ? next : it)));

  return (
    <div className="space-y-2">
      {items.length === 0 && (
        <div className="text-xs text-text-muted italic px-3 py-4 border border-dashed border-line rounded text-center">
          {emptyLabel}
        </div>
      )}

      {items.map((item, idx) => (
        <div key={idx} className="flex items-start gap-2 p-2 bg-bg border border-line rounded">
          <div className="flex-1">
            {renderItem(
              item,
              next => replace(idx, next),
              () => remove(idx)
            )}
          </div>
          <button onClick={() => remove(idx)} className="ds-btn danger sm icon" title="Remove">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ))}

      <button onClick={add} className="ds-btn sm">
        <Plus className="w-3.5 h-3.5" />
        <span>{addLabel}</span>
      </button>
    </div>
  );
}

// ============================================================
// Git Roots (string[])
// ============================================================

function GitSection() {
  return (
    <div className="space-y-4 max-w-2xl">
      <SectionHeader title="GIT ROOTS" hint="Directories scanned by the Git Status widget." />
      <ListEditor<string>
        storageKey="git-roots"
        defaultItems={[]}
        emptyLabel="No git roots configured."
        addLabel="Add root"
        buildNew={() => ''}
        renderItem={(root, replace) => (
          <div className="flex items-center gap-2">
            <GitBranch className="w-4 h-4 text-text-muted shrink-0" />
            <input
              type="text"
              value={root}
              onChange={e => replace(e.target.value)}
              placeholder="/home/user/projects"
              className={inputClass}
            />
          </div>
        )}
      />
    </div>
  );
}
