"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { DesignDocument } from "./document";
import { assetUrl, loadImage, type ImageMap } from "./render";
import { ensureStudioFonts } from "./fonts";
import { SURFACE_KEYS } from "@/packaging/types";

/** Loads every image referenced by the document. `version` bumps when new images arrive. */
export function useAssetImages(doc: DesignDocument | null) {
  const mapRef = useRef<ImageMap>(new Map());
  const [version, setVersion] = useState(0);
  const ids = doc ? [...new Set(SURFACE_KEYS.flatMap((k) => doc.surfaces[k].elements.filter((e) => e.type === "image").map((e) => (e as { assetId: string }).assetId)))] : [];
  const key = ids.sort().join(",");

  useEffect(() => {
    let alive = true;
    for (const id of key ? key.split(",") : []) {
      if (mapRef.current.has(id)) continue;
      loadImage(assetUrl(id))
        .then((img) => {
          if (!alive) return;
          mapRef.current.set(id, img);
          setVersion((v) => v + 1);
        })
        .catch(() => undefined);
    }
    return () => {
      alive = false;
    };
  }, [key]);

  return { images: mapRef.current, version };
}

export function useFontsReady() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    ensureStudioFonts().then(() => setReady(true));
  }, []);
  return ready;
}

/* ───────────────────────── History ───────────────────────── */

interface HistoryState {
  doc: DesignDocument;
  past: DesignDocument[];
  future: DesignDocument[];
}

const LIMIT = 100;
const COALESCE_MS = 700;

/**
 * Document state with undo/redo. Rapid updates that share a coalesce key
 * (e.g. dragging a colour picker or typing) collapse into one history entry.
 */
export function useDesignHistory(initial: DesignDocument) {
  const [state, setState] = useState<HistoryState>({ doc: initial, past: [], future: [] });
  const last = useRef<{ key: string | null; at: number }>({ key: null, at: 0 });

  const update = useCallback((recipe: (d: DesignDocument) => DesignDocument, coalesceKey?: string) => {
    setState((s) => {
      const next = recipe(s.doc);
      if (next === s.doc) return s;
      const now = Date.now();
      const merge = !!coalesceKey && last.current.key === coalesceKey && now - last.current.at < COALESCE_MS;
      last.current = { key: coalesceKey ?? null, at: now };
      return { doc: next, past: merge ? s.past : [...s.past, s.doc].slice(-LIMIT), future: [] };
    });
  }, []);

  const replace = useCallback((doc: DesignDocument) => {
    last.current = { key: null, at: 0 };
    setState({ doc, past: [], future: [] });
  }, []);

  const undo = useCallback(() => {
    last.current = { key: null, at: 0 };
    setState((s) => (s.past.length ? { doc: s.past[s.past.length - 1], past: s.past.slice(0, -1), future: [s.doc, ...s.future] } : s));
  }, []);

  const redo = useCallback(() => {
    last.current = { key: null, at: 0 };
    setState((s) => (s.future.length ? { doc: s.future[0], past: [...s.past, s.doc], future: s.future.slice(1) } : s));
  }, []);

  return { doc: state.doc, update, replace, undo, redo, canUndo: state.past.length > 0, canRedo: state.future.length > 0 };
}

export function useDebouncedEffect(fn: () => void, deps: unknown[], ms: number) {
  useEffect(() => {
    const t = setTimeout(fn, ms);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, ms]);
}

export function hasWebGL(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}
