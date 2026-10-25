import { useState } from 'react';
import { Monitor, Moon, Sun } from 'lucide-react';

type Mode = 'system' | 'light' | 'dark';

const MODES: Mode[] = ['system', 'light', 'dark'];
const LABELS: Record<Mode, string> = { system: 'System', light: 'Hell', dark: 'Dunkel' };
const ICONS = { system: Monitor, light: Sun, dark: Moon };
const KEY = 'vault-theme';

function readMode(): Mode {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'light' || v === 'dark' ? v : 'system';
  } catch {
    return 'system';
  }
}

function apply(mode: Mode) {
  const root = document.documentElement;
  if (mode === 'system') delete root.dataset.theme;
  else root.dataset.theme = mode;
  try {
    if (mode === 'system') localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, mode);
  } catch {
    // storage unavailable: the choice only applies to this page view
  }
}

/** Cycles system -> light -> dark; the stored value is shared with the vault (key vault-theme). */
export function ThemeToggle() {
  const [mode, setMode] = useState<Mode>(readMode);
  const Icon = ICONS[mode];
  const label = `Theme: ${LABELS[mode]} (klicken zum Wechseln)`;

  return (
    <button
      type="button"
      className="ds-btn icon"
      title={label}
      aria-label={label}
      onClick={() => {
        const next = MODES[(MODES.indexOf(mode) + 1) % MODES.length];
        apply(next);
        setMode(next);
      }}
    >
      <Icon size={16} />
    </button>
  );
}
