/**
 * Mock Mode singleton for workspace simulation.
 *
 * Activation:
 *  - URL param: ?mock=1
 *  - Programmatic: enableMockMode() / disableMockMode()
 *
 * Storage: in-memory only (no localStorage). Lives for the session.
 * Scope: workspace routes only (auto-disabled when navigating away).
 */

let _enabled = false;
const listeners = new Set<() => void>();

export function isMockMode(): boolean {
  if (typeof window === 'undefined') return false;
  if (_enabled) return true;
  const params = new URLSearchParams(window.location.search);
  return params.get('mock') === '1';
}

export function enableMockMode() {
  if (_enabled) return;
  _enabled = true;
  notify();
}

export function disableMockMode() {
  if (!_enabled) return;
  _enabled = false;
  notify();
}

export function toggleMockMode() {
  _enabled ? disableMockMode() : enableMockMode();
}

export function subscribeMockMode(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function notify() {
  listeners.forEach((fn) => {
    try { fn(); } catch (e) { /* noop */ }
  });
}

// Sync enabled flag from URL on first load
if (typeof window !== 'undefined') {
  const params = new URLSearchParams(window.location.search);
  if (params.get('mock') === '1') _enabled = true;
}
