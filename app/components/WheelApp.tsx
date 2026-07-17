"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Wheel from "./Wheel";
import SecretPanel, { EMPTY_SETTINGS, isBanned, isForced, type SecretSettings } from "./SecretPanel";
import WinnerOverlay from "./WinnerOverlay";

const DEFAULT_NAMES = ["Ali", "Beatriz", "Charles", "Diya", "Eric", "Fatima", "Gabriel", "Hanna"];
const NAMES_STORAGE_KEY = "wheel.names";
const SECRET_STORAGE_KEY = "wheel.cfg";

const CORNER_TAPS_TO_OPEN = 10;
const CORNER_TAPS_TO_RESET = 5;
const CORNER_TAP_TIMEOUT_MS = 2500;

const parseNames = (text: string) =>
  text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

export default function WheelApp() {
  const [namesText, setNamesText] = useState(DEFAULT_NAMES.join("\n"));
  const [settings, setSettings] = useState<SecretSettings>(EMPTY_SETTINGS);
  const [spinning, setSpinning] = useState(false);
  const [winner, setWinner] = useState<{ name: string; index: number } | null>(null);
  const [secretOpen, setSecretOpen] = useState(false);

  const loadedRef = useRef(false);
  const cornerTapsRef = useRef({ count: 0, last: 0 });
  const resetTapsRef = useRef({ count: 0, last: 0 });

  const names = useMemo(() => parseNames(namesText), [namesText]);

  // Load persisted state after mount (SSR renders the defaults).
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- one-time hydration from localStorage */
    try {
      const storedNames = localStorage.getItem(NAMES_STORAGE_KEY);
      if (storedNames !== null) setNamesText(storedNames);
      const storedSettings = localStorage.getItem(SECRET_STORAGE_KEY);
      if (storedSettings !== null) {
        const parsed = JSON.parse(storedSettings);
        if (parsed && Array.isArray(parsed.banned)) {
          setSettings({
            banned: parsed.banned.filter((b: unknown) => typeof b === "string"),
            forced: typeof parsed.forced === "string" ? parsed.forced : null,
          });
        }
      }
    } catch {
      // Storage unavailable (private mode, etc.) — run without persistence.
    }
    /* eslint-enable react-hooks/set-state-in-effect */
    loadedRef.current = true;
  }, []);

  useEffect(() => {
    if (!loadedRef.current) return;
    try {
      localStorage.setItem(NAMES_STORAGE_KEY, namesText);
    } catch {}
  }, [namesText]);

  useEffect(() => {
    if (!loadedRef.current) return;
    try {
      localStorage.setItem(SECRET_STORAGE_KEY, JSON.stringify(settings));
    } catch {}
  }, [settings]);

  // The rig: the winner is decided here, before the wheel ever starts moving.
  const pickWinnerIndex = () => {
    if (names.length === 0) return null;

    if (settings.forced) {
      const forcedIndexes = names
        .map((name, i) => ({ name, i }))
        .filter(({ name }) => isForced(name, settings))
        .map(({ i }) => i);
      if (forcedIndexes.length > 0) {
        // One-shot: the force applies to this spin only, then disarms itself.
        setSettings((s) => ({ ...s, forced: null }));
        return forcedIndexes[Math.floor(Math.random() * forcedIndexes.length)];
      }
    }

    let eligible = names.map((_, i) => i).filter((i) => !isBanned(names[i], settings));
    if (eligible.length === 0) eligible = names.map((_, i) => i);
    return eligible[Math.floor(Math.random() * eligible.length)];
  };

  const shuffleNames = () => {
    const shuffled = [...names];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    setNamesText(shuffled.join("\n"));
  };

  const sortNames = () => {
    const sorted = [...names].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
    setNamesText(sorted.join("\n"));
  };

  const removeWinner = () => {
    if (!winner) return;
    setNamesText(names.filter((_, i) => i !== winner.index).join("\n"));
    setWinner(null);
  };

  const handleCornerTap = () => {
    const now = Date.now();
    const taps = cornerTapsRef.current;
    if (now - taps.last > CORNER_TAP_TIMEOUT_MS) taps.count = 0;
    taps.last = now;
    taps.count += 1;
    if (taps.count >= CORNER_TAPS_TO_OPEN) {
      taps.count = 0;
      setSecretOpen(true);
    }
  };

  // 5 quick taps in the bottom-left corner silently wipe all cheat settings.
  const handleResetCornerTap = () => {
    const now = Date.now();
    const taps = resetTapsRef.current;
    if (now - taps.last > CORNER_TAP_TIMEOUT_MS) taps.count = 0;
    taps.last = now;
    taps.count += 1;
    if (taps.count >= CORNER_TAPS_TO_RESET) {
      taps.count = 0;
      setSettings(EMPTY_SETTINGS);
    }
  };

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="px-4 pb-2 pt-5 text-center">
        <h1 className="text-2xl font-bold tracking-tight">🎡 Spin the Wheel</h1>
        <p className="mt-1 text-sm text-neutral-500">Tap the wheel and let fate decide</p>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 pb-24 pt-2 lg:flex-row lg:items-start lg:gap-12 lg:pt-8">
        <section className="w-full lg:flex-1">
          <Wheel
            names={names}
            disabled={spinning || winner !== null || secretOpen}
            pickWinnerIndex={pickWinnerIndex}
            onSpinStart={() => setSpinning(true)}
            onSpinEnd={(name, index) => {
              setSpinning(false);
              setWinner({ name, index });
            }}
          />
        </section>

        <section className="flex w-full flex-col gap-3 lg:w-80 lg:pt-4 xl:w-96">
          <div className="flex items-center justify-between">
            <label htmlFor="names" className="text-sm font-semibold">
              Names <span className="font-normal text-neutral-500">(one per line)</span>
            </label>
            <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-medium text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
              {names.length} {names.length === 1 ? "name" : "names"}
            </span>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={shuffleNames}
              disabled={spinning || names.length < 2}
              className="flex-1 rounded-full bg-neutral-100 px-4 py-2.5 text-sm font-medium transition active:scale-95 disabled:opacity-40 dark:bg-neutral-800"
            >
              🔀 Shuffle
            </button>
            <button
              type="button"
              onClick={sortNames}
              disabled={spinning || names.length < 2}
              className="flex-1 rounded-full bg-neutral-100 px-4 py-2.5 text-sm font-medium transition active:scale-95 disabled:opacity-40 dark:bg-neutral-800"
            >
              🔤 Sort
            </button>
          </div>

          <textarea
            id="names"
            value={namesText}
            onChange={(e) => setNamesText(e.target.value)}
            disabled={spinning}
            rows={10}
            placeholder={"Ali\nBeatriz\nCharles"}
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            className="min-h-48 w-full resize-y rounded-xl border border-neutral-300 bg-white p-3 text-base font-medium leading-7 outline-none transition focus:border-neutral-500 disabled:opacity-60 dark:border-neutral-700 dark:bg-neutral-900 dark:focus:border-neutral-400"
          />
        </section>
      </main>

      {/* Invisible unlock zone: 10 quick taps open the secret panel. */}
      <button
        type="button"
        tabIndex={-1}
        aria-hidden="true"
        onPointerDown={handleCornerTap}
        className="fixed bottom-0 right-0 z-30 h-16 w-16 cursor-default appearance-none border-0 bg-transparent outline-none"
        style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
      />

      {/* Invisible reset zone: 5 quick taps clear all cheat settings. */}
      <button
        type="button"
        tabIndex={-1}
        aria-hidden="true"
        onPointerDown={handleResetCornerTap}
        className="fixed bottom-0 left-0 z-30 h-16 w-16 cursor-default appearance-none border-0 bg-transparent outline-none"
        style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
      />

      {winner && (
        <WinnerOverlay name={winner.name} onRemove={removeWinner} onClose={() => setWinner(null)} />
      )}

      {secretOpen && (
        <SecretPanel
          names={names}
          settings={settings}
          onChange={setSettings}
          onClose={() => setSecretOpen(false)}
        />
      )}
    </div>
  );
}
