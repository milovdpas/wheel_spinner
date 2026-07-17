"use client";

export type SecretSettings = {
  banned: string[];
  forced: string | null;
};

export const EMPTY_SETTINGS: SecretSettings = { banned: [], forced: null };

const norm = (s: string) => s.trim().toLowerCase();

export function isBanned(name: string, settings: SecretSettings): boolean {
  const key = norm(name);
  return settings.banned.some((b) => norm(b) === key);
}

export function isForced(name: string, settings: SecretSettings): boolean {
  return settings.forced != null && norm(settings.forced) === norm(name);
}

type SecretPanelProps = {
  names: string[];
  settings: SecretSettings;
  onChange: (settings: SecretSettings) => void;
  onClose: () => void;
};

export default function SecretPanel({ names, settings, onChange, onClose }: SecretPanelProps) {
  // Unique names currently on the wheel, plus any stale rigged names so they can be cleared.
  const seen = new Set<string>();
  const rows: { name: string; onWheel: boolean }[] = [];
  for (const n of names) {
    if (!seen.has(norm(n))) {
      seen.add(norm(n));
      rows.push({ name: n, onWheel: true });
    }
  }
  for (const b of settings.banned) {
    if (!seen.has(norm(b))) {
      seen.add(norm(b));
      rows.push({ name: b, onWheel: false });
    }
  }
  if (settings.forced && !seen.has(norm(settings.forced))) {
    rows.push({ name: settings.forced, onWheel: false });
  }

  // Ban and force are mutually exclusive per name: enabling one switches the other off.
  const toggleBan = (name: string) => {
    const wasBanned = isBanned(name, settings);
    onChange({
      forced: !wasBanned && isForced(name, settings) ? null : settings.forced,
      banned: wasBanned
        ? settings.banned.filter((b) => norm(b) !== norm(name))
        : [...settings.banned, name],
    });
  };

  const toggleForce = (name: string) => {
    const wasForced = isForced(name, settings);
    onChange({
      forced: wasForced ? null : name,
      banned: wasForced
        ? settings.banned
        : settings.banned.filter((b) => norm(b) !== norm(name)),
    });
  };

  const hasRig = settings.forced != null || settings.banned.length > 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Secret controls"
    >
      <div className="animate-fade-in absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="animate-slide-up relative max-h-[85dvh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 pb-8 shadow-2xl sm:max-w-md sm:rounded-2xl sm:pb-5 dark:bg-neutral-900">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-lg font-bold">🤫 Secret controls</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-full p-2 text-neutral-500 transition hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            ✕
          </button>
        </div>
        <p className="mb-4 text-sm text-neutral-500">
          🎯 wins the next spin &nbsp;·&nbsp; 🚫 never wins
        </p>

        {rows.length === 0 ? (
          <p className="py-6 text-center text-sm text-neutral-500">
            Add some names to the wheel first.
          </p>
        ) : (
          <ul className="flex flex-col gap-1">
            {rows.map(({ name, onWheel }) => {
              const banned = isBanned(name, settings);
              const forced = isForced(name, settings);
              return (
                <li
                  key={norm(name)}
                  className="flex items-center gap-3 rounded-xl px-2 py-1.5 odd:bg-neutral-50 dark:odd:bg-neutral-800/50"
                >
                  <span className={`min-w-0 flex-1 truncate font-medium ${banned && !forced ? "text-neutral-400 line-through" : ""}`}>
                    {name}
                    {!onWheel && (
                      <span className="ml-2 text-xs font-normal text-neutral-400">
                        (not on the wheel)
                      </span>
                    )}
                  </span>
                  <button
                    type="button"
                    onClick={() => toggleForce(name)}
                    aria-pressed={forced}
                    aria-label={`Always let ${name} win`}
                    className={`rounded-full border px-3 py-1.5 text-sm transition active:scale-95 ${
                      forced
                        ? "border-emerald-500 bg-emerald-500 text-white"
                        : "border-neutral-300 text-neutral-500 dark:border-neutral-700"
                    }`}
                  >
                    🎯
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleBan(name)}
                    aria-pressed={banned}
                    aria-label={`Never let ${name} win`}
                    className={`rounded-full border px-3 py-1.5 text-sm transition active:scale-95 ${
                      banned
                        ? "border-red-500 bg-red-500 text-white"
                        : "border-neutral-300 text-neutral-500 dark:border-neutral-700"
                    }`}
                  >
                    🚫
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        <div className="mt-5 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => onChange(EMPTY_SETTINGS)}
            disabled={!hasRig}
            className="rounded-full border border-neutral-300 px-4 py-2 text-sm font-medium transition active:scale-95 disabled:opacity-40 dark:border-neutral-700"
          >
            Reset all
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-neutral-900 px-5 py-2 text-sm font-medium text-white transition active:scale-95 dark:bg-white dark:text-neutral-900"
          >
            Done
          </button>
        </div>

        <p className="mt-4 text-xs leading-relaxed text-neutral-400">
          🎯 applies to the next spin only — after that spin it switches itself off. A name
          can&apos;t be 🎯 and 🚫 at the same time: turning one on turns the other off. If
          every name is banned, bans are ignored so the wheel never gets stuck. Open this
          panel again by tapping the bottom-right corner of the screen 10 times. Panic
          button: tap the bottom-left corner 5 times to silently wipe all of this.
        </p>
      </div>
    </div>
  );
}
