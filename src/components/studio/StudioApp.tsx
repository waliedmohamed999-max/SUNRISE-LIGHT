"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { nanoid } from "nanoid";
import { StudioContext, type StudioApi, type UploadedAssetInfo } from "./context";
import { ColorsPanel, DimensionsPanel, ElementsPanel, InspectorPanel, LayersPanel, MaterialPanel, PresetsPanel, SummaryPanel, SurfacesPanel, TemplatesPanel, TextPanel, UploadsPanel } from "./panels";
import { useI18n } from "@/i18n/client";
import type { Catalog } from "@/lib/catalog";
import {
  designDocumentSchema,
  effectiveDpi,
  isOutsideSafeArea,
  elementBounds,
  MIN_PRINT_DPI,
  newDocument,
  reflowSurfaces,
  type DesignDocument,
  type DesignElement,
  type TextElement,
} from "@/design/document";
import { useAssetImages, useDebouncedEffect, useDesignHistory, useFontsReady } from "@/design/hooks";
import { canvasToBlob, downloadBlob, measureText, renderFinishMaps, renderIsoThumbnail, renderSurfaceCanvases } from "@/design/render";
import type { FinishMaps } from "@/components/three/BoxModel";
import { ICONS, type IconKey } from "@/design/icons";
import type { TextStyle } from "./context";
import { getEngine, hasErrors, validateDimensions } from "@/packaging/engine";
import { dielineToSvg } from "@/packaging/svg";
import { SURFACE_KEYS, type Dimensions, type SurfaceKey, type ValidationIssue } from "@/packaging/types";
import type { CameraPreset } from "@/components/three/BoxViewer";
import { fmt } from "@/i18n/dictionaries";
import {
  Alert,
  Button,
  buttonClass,
  CubeIcon,
  cx,
  DownloadIcon,
  EyeIcon,
  FlatIcon,
  GridIcon,
  SparkIcon,
  LayersIcon,
  PaletteIcon,
  PenIcon,
  RedoIcon,
  ResetIcon,
  RulerIcon,
  SaveIcon,
  Spinner,
  TextIcon,
  UndoIcon,
  UploadIcon,
  XIcon,
  ZoomInIcon,
  ZoomOutIcon,
  BoxIcon,
  SettingsIcon,
  RotateIcon,
} from "@/components/ui";

const SurfaceEditor = dynamic(() => import("./SurfaceEditor"), { ssr: false, loading: () => <CenterSpinner /> });
const BoxViewer = dynamic(() => import("@/components/three/BoxViewer"), { ssr: false, loading: () => <CenterSpinner /> });
const DielineView = dynamic(() => import("./DielineView"), { ssr: false, loading: () => <CenterSpinner /> });

function CenterSpinner() {
  return (
    <div className="absolute inset-0 grid place-items-center text-sun">
      <Spinner className="size-6" />
    </div>
  );
}

const DRAFT_KEY = "sl_studio_draft_v1";

export interface StudioInitial {
  id: string;
  name: string;
  document: DesignDocument;
}

type View = "split" | "2d" | "3d" | "dieline";
type LeftTab = "templates" | "presets" | "colors" | "text" | "elements" | "uploads" | "material" | "layers";
type SaveState = "idle" | "dirty" | "saving" | "saved" | "error" | "local";

export default function StudioApp({
  catalog,
  initial,
  initialTemplateCode,
  isLoggedIn,
  maxUploadMb,
}: {
  catalog: Catalog;
  initial: StudioInitial | null;
  initialTemplateCode?: string;
  isLoggedIn: boolean;
  maxUploadMb: number;
}) {
  const { t, locale } = useI18n();
  const router = useRouter();

  const makeDefault = useCallback(
    (code?: string): DesignDocument => {
      const tpl = catalog.templates.find((x) => x.code === code) ?? catalog.templates[0];
      return newDocument({ templateCode: tpl.code, templateVersion: tpl.version.version, dimensions: tpl.version.defaults, materialCode: tpl.materialCodes[0] ?? null });
    },
    [catalog.templates],
  );

  const history = useDesignHistory(initial?.document ?? makeDefault(initialTemplateCode));
  const { doc, update, undo, redo, replace } = history;

  const [designId, setDesignId] = useState<string | null>(initial?.id ?? null);
  const [name, setName] = useState(initial?.name ?? t.studio.untitled);
  const [saveState, setSaveState] = useState<SaveState>(initial ? "saved" : "local");
  const [surfaceKey, setSurfaceKey] = useState<SurfaceKey>("front");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [view, setView] = useState<View>("split");
  const [zoom, setZoom] = useState(1);
  const [snap, setSnap] = useState(false);
  const [lidOpen, setLidOpen] = useState(false);
  const [preset, setPreset] = useState<{ p: CameraPreset; n: number }>({ p: "iso", n: 0 });
  const [leftTab, setLeftTab] = useState<LeftTab>("templates");
  const [mobileSheet, setMobileSheet] = useState<string | null>(null);
  const [focusMode, setFocusMode] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [unit, setUnit] = useState<"mm" | "cm">("mm");
  const [dimIssues, setDimIssues] = useState<ValidationIssue[]>([]);
  const [loginPrompt, setLoginPrompt] = useState(false);
  const [uploads, setUploads] = useState<UploadedAssetInfo[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ tone: "ok" | "danger"; text: string } | null>(null);
  const [busy, setBusy] = useState<null | "save" | "quote">(null);
  const glCanvas = useRef<HTMLCanvasElement | null>(null);

  /* ── derived ── */
  const template = catalog.templates.find((x) => x.code === doc.templateCode) ?? catalog.templates[0];
  const engine = getEngine(template.engineKey);
  const specs = useMemo(() => engine.surfaces(doc.dimensions), [engine, doc.dimensions]);
  const spec = specs.find((s) => s.key === surfaceKey) ?? specs[0];
  const dieline = useMemo(() => engine.dieline(doc.dimensions), [engine, doc.dimensions]);
  const compatibleMaterials = catalog.materials.filter((m) => template.materialCodes.includes(m.code));
  const material = catalog.materials.find((m) => m.code === doc.materialCode) ?? null;
  const materialColor = material?.colorHex ?? "#C9A06B";
  const textured = material ? ["KRAFT", "CORRUGATED"].includes(material.kind) : true;
  const printable = useCallback((k: SurfaceKey) => template.version.panels.find((p) => p.key === k)?.printable ?? true, [template]);
  const selected = doc.surfaces[surfaceKey].elements.find((e) => e.id === selectedId) ?? null;

  const { images, version: imagesVersion } = useAssetImages(doc);
  const fontsReady = useFontsReady();

  /* ── surface canvases shared by 3D textures, dieline and exports ── */
  const canvasesRef = useRef<Record<SurfaceKey, HTMLCanvasElement> | null>(null);
  const finishRef = useRef<FinishMaps | null>(null);
  const [texVersion, setTexVersion] = useState(0);
  /** per-face texture versions: only faces whose content changed are re-uploaded to the GPU */
  const [faceVersions, setFaceVersions] = useState<Partial<Record<SurfaceKey, number>>>({});
  const faceSigs = useRef<Partial<Record<SurfaceKey, string>>>({});
  // while dimensions are changing (slider drag) the 3D box resizes with its existing textures;
  // the faces are re-rendered once the size settles (300 ms after the last change)
  const lastDims = useRef("");
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [settle, setSettle] = useState(0);
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      const dimsKey = `${doc.dimensions.length}x${doc.dimensions.width}x${doc.dimensions.height}`;
      const resizing = lastDims.current !== "" && dimsKey !== lastDims.current;
      lastDims.current = dimsKey;
      if (resizing && canvasesRef.current) {
        if (settleTimer.current) clearTimeout(settleTimer.current);
        settleTimer.current = setTimeout(() => setSettle((n) => n + 1), 300);
        return;
      }
      const maxPx = 1024;
      const shared = `${materialColor}|${textured}|${imagesVersion}|${fontsReady}|${engine.boxStyle}|${doc.finishingCodes.join(",")}`;
      const changed = specs.filter((s) => {
        const sig = `${s.w}x${s.h}|${shared}|${JSON.stringify(doc.surfaces[s.key])}`;
        if (faceSigs.current[s.key] === sig && canvasesRef.current?.[s.key]) return false;
        faceSigs.current[s.key] = sig;
        return true;
      });
      if (!changed.length) return;
      const fresh = renderSurfaceCanvases(doc, changed, { materialColor, textured, images, maxPx, structure: { codes: doc.finishingCodes, boxStyle: engine.boxStyle } }, canvasesRef.current ?? undefined);
      canvasesRef.current = { ...(canvasesRef.current ?? {}), ...fresh } as Record<SurfaceKey, HTMLCanvasElement>;
      const maps = renderFinishMaps(doc, changed, images);
      const nextMaps: FinishMaps = { ...(finishRef.current ?? {}) };
      for (const s of changed) {
        if (maps[s.key]) nextMaps[s.key] = maps[s.key];
        else delete nextMaps[s.key];
      }
      finishRef.current = nextMaps;
      setFaceVersions((v) => {
        const n = { ...v };
        for (const s of changed) n[s.key] = (n[s.key] ?? 0) + 1;
        return n;
      });
      setTexVersion((v) => v + 1);
    });
    return () => cancelAnimationFrame(id);
  }, [doc, specs, materialColor, textured, images, imagesVersion, fontsReady, settle, engine.boxStyle]);

  /* ── load local draft / uploads ── */
  useEffect(() => {
    if (initial) return;
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      const d = designDocumentSchema.safeParse(parsed.document);
      if (d.success && catalog.templates.some((x) => x.code === d.data.templateCode) && (!initialTemplateCode || initialTemplateCode === d.data.templateCode)) {
        replace(d.data);
        if (typeof parsed.name === "string") setName(parsed.name);
      }
    } catch {
      /* ignore corrupt drafts */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isLoggedIn) return;
    fetch("/api/assets?kind=LOGO")
      .then((r) => (r.ok ? r.json() : { assets: [] }))
      .then((j) => setUploads(j.assets ?? []))
      .catch(() => undefined);
  }, [isLoggedIn]);

  /* ── persistence: server autosave for saved designs, local draft otherwise ── */
  const lastSaved = useRef<{ doc: DesignDocument; name: string } | null>(initial ? { doc: initial.document, name: initial.name } : null);
  useEffect(() => {
    if (lastSaved.current && lastSaved.current.doc === doc && lastSaved.current.name === name) return;
    setSaveState(designId ? "dirty" : "local");
  }, [doc, name, designId]);

  useDebouncedEffect(
    () => {
      if (designId) return;
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify({ document: doc, name }));
      } catch {
        /* storage full or blocked */
      }
    },
    [doc, name, designId],
    400,
  );

  const patchDesign = useCallback(
    async (body: Record<string, unknown>) => {
      const res = await fetch(`/api/designs/${designId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error(String(res.status));
    },
    [designId],
  );

  useDebouncedEffect(
    () => {
      if (!designId || saveState !== "dirty") return;
      setSaveState("saving");
      const snapshot = { doc, name };
      patchDesign({ document: doc, name })
        .then(() => {
          lastSaved.current = snapshot;
          setSaveState("saved");
        })
        .catch(() => setSaveState("error"));
    },
    [doc, name, designId, saveState],
    2000,
  );

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (saveState === "dirty" || saveState === "saving") e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [saveState]);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(id);
  }, [toast]);

  /* ── element operations ── */
  const updateSurface = useCallback(
    (k: SurfaceKey, fn: (els: DesignElement[]) => DesignElement[], coalesceKey?: string) =>
      update((d) => ({ ...d, surfaces: { ...d.surfaces, [k]: { ...d.surfaces[k], elements: fn(d.surfaces[k].elements) } } }), coalesceKey),
    [update],
  );

  const updateElement = useCallback(
    (id: string, patch: Partial<DesignElement>, coalesceKey?: string) =>
      updateSurface(
        surfaceKey,
        (els) =>
          els.map((el) => {
            if (el.id !== id) return el;
            const next = { ...el, ...patch } as DesignElement;
            if (next.type === "text" && !("width" in patch) && ["text", "font", "bold", "fontSizeMm", "letterSpacing", "lineHeight", "strokeWidth"].some((k) => k in patch)) {
              const m = measureText(next as TextElement);
              return { ...next, width: m.width, height: m.height };
            }
            return next;
          }),
        coalesceKey,
      ),
    [updateSurface, surfaceKey],
  );

  const removeElement = useCallback(
    (id: string) => {
      updateSurface(surfaceKey, (els) => els.filter((e) => e.id !== id));
      setSelectedId(null);
    },
    [updateSurface, surfaceKey],
  );

  const duplicateElement = useCallback(
    (id: string) => {
      const nid = nanoid(10);
      updateSurface(surfaceKey, (els) => {
        const el = els.find((e) => e.id === id);
        return el ? [...els, { ...el, id: nid, x: el.x + 5, y: el.y + 5, locked: false }] : els;
      });
      setSelectedId(nid);
    },
    [updateSurface, surfaceKey],
  );

  const moveElement = useCallback(
    (id: string, dir: 1 | -1) =>
      updateSurface(surfaceKey, (els) => {
        const i = els.findIndex((e) => e.id === id);
        const j = i + dir;
        if (i < 0 || j < 0 || j >= els.length) return els;
        const copy = [...els];
        [copy[i], copy[j]] = [copy[j], copy[i]];
        return copy;
      }),
    [updateSurface, surfaceKey],
  );

  const centerElement = useCallback((id: string, axis: "x" | "y") => updateElement(id, axis === "x" ? { x: spec.w / 2 } : { y: spec.h / 2 }), [updateElement, spec]);

  /** Snap an element to one of 9 anchor points inside the safe area (col/row: 0 start, 1 centre, 2 end). */
  const placeElement = useCallback(
    (id: string, col: 0 | 1 | 2, row: 0 | 1 | 2) => {
      const el = doc.surfaces[surfaceKey].elements.find((e) => e.id === id);
      if (!el) return;
      const b = elementBounds({ ...el, x: 0, y: 0 });
      const m = template.version.safeMarginMm;
      const pos = (n: 0 | 1 | 2, size: number, half: number) => (n === 0 ? m + half : n === 1 ? size / 2 : size - m - half);
      updateElement(id, { x: pos(col, spec.w, (b.x1 - b.x0) / 2), y: pos(row, spec.h, (b.y1 - b.y0) / 2) });
    },
    [doc.surfaces, surfaceKey, template, spec, updateElement],
  );

  /** Copy of an element fitted onto another face, keeping its relative position. */
  const fitTo = useCallback(
    (el: DesignElement, from: { w: number; h: number }, to: { w: number; h: number }, id = el.id): DesignElement => {
      const k = Math.min(1, (to.w * 0.9) / el.width, (to.h * 0.9) / el.height);
      const next = { ...el, id, x: (el.x / from.w) * to.w, y: (el.y / from.h) * to.h, width: el.width * k, height: el.height * k } as DesignElement;
      if (next.type === "text") (next as TextElement).fontSizeMm = (el as TextElement).fontSizeMm * k;
      return next;
    },
    [],
  );

  const moveElementToSurface = useCallback(
    (id: string, target: SurfaceKey) => {
      if (target === surfaceKey || !printable(target)) return;
      const el = doc.surfaces[surfaceKey].elements.find((e) => e.id === id);
      const to = specs.find((s) => s.key === target);
      if (!el || !to) return;
      const moved = fitTo(el, spec, to);
      update((d) => ({
        ...d,
        surfaces: {
          ...d.surfaces,
          [surfaceKey]: { ...d.surfaces[surfaceKey], elements: d.surfaces[surfaceKey].elements.filter((e) => e.id !== id) },
          [target]: { ...d.surfaces[target], elements: [...d.surfaces[target].elements, moved] },
        },
      }));
      setSurfaceKey(target);
      setTimeout(() => setSelectedId(id), 0);
    },
    [surfaceKey, printable, doc.surfaces, specs, spec, fitTo, update],
  );

  /** Copy the active face's colour, coating and elements onto another face (or all). */
  const copySurface = useCallback(
    (target: SurfaceKey | "all") => {
      const from = doc.surfaces[surfaceKey];
      update((d) => {
        const surfaces = { ...d.surfaces };
        for (const s of specs) {
          if (s.key === surfaceKey || !printable(s.key) || (target !== "all" && s.key !== target)) continue;
          surfaces[s.key] = { background: from.background, coating: from.coating, fill: from.fill, elements: from.elements.map((el) => fitTo(el, spec, s, nanoid(10))) };
        }
        return { ...d, surfaces };
      });
    },
    [doc.surfaces, surfaceKey, specs, printable, spec, fitTo, update],
  );

  const applyElementToAllSurfaces = useCallback(
    (id: string) => {
      const el = doc.surfaces[surfaceKey].elements.find((e) => e.id === id);
      if (!el) return;
      update((d) => {
        const surfaces = { ...d.surfaces };
        for (const s of specs) {
          if (s.key === surfaceKey || !printable(s.key)) continue;
          surfaces[s.key] = { ...surfaces[s.key], elements: [...surfaces[s.key].elements, fitTo(el, spec, s, nanoid(10))] };
        }
        return { ...d, surfaces };
      });
    },
    [doc.surfaces, surfaceKey, specs, printable, spec, fitTo, update],
  );

  const addText = useCallback((style?: TextStyle) => {
    if (!printable(surfaceKey)) return;
    const sizeFrac = style?.sizeFrac ?? 0.12;
    const fontSizeMm = Math.round(Math.min(Math.max(Math.min(spec.w, spec.h) * sizeFrac, 2.5), 60) * 10) / 10;
    const text = style?.text ?? (locale === "ar" ? "علامتك التجارية" : "Your brand");
    const font: TextElement["font"] = style?.font ?? (/[\u0600-\u06FF]/.test(text) || locale === "ar" ? "plexArabic" : "inter");
    const base = { text, font, bold: style?.bold ?? true, fontSizeMm, letterSpacing: style?.letterSpacing, lineHeight: style?.lineHeight };
    const m = measureText(base);
    const el: TextElement = {
      id: nanoid(10),
      type: "text",
      ...base,
      color: style?.color ?? "#2F357C",
      align: style?.align ?? "center",
      x: spec.w / 2,
      y: spec.h * (style?.yFrac ?? 0.5),
      width: Math.min(m.width, spec.w),
      height: m.height,
      rotation: 0,
    };
    updateSurface(surfaceKey, (els) => [...els, el]);
    setSelectedId(el.id);
    setView((v) => (v === "2d" || v === "split" ? v : "split"));
  }, [printable, surfaceKey, spec, locale, updateSurface]);

  const addCode = useCallback(
    (kind: "qr" | "ean13") => {
      if (!printable(surfaceKey)) return;
      const side = Math.round(Math.min(spec.w, spec.h) * 0.35 * 10) / 10;
      const el: DesignElement = {
        id: nanoid(10),
        type: "code",
        kind,
        // QR: the customer types their link; EAN: 12 digits get their check digit automatically
        value: kind === "qr" ? "https://" : "629000000000",
        color: "#1D2235",
        background: "#FFFFFF",
        x: spec.w / 2,
        y: spec.h / 2,
        width: kind === "qr" ? side : Math.min(spec.w * 0.6, side * 1.6),
        height: kind === "qr" ? side : side * 0.9,
        rotation: 0,
      };
      updateSurface(surfaceKey, (els) => [...els, el]);
      setSelectedId(el.id);
    },
    [printable, surfaceKey, spec, updateSurface],
  );

  /* clipboard (Ctrl+C / Ctrl+V) — paste lands on the active face, fitted to it */
  const clipboard = useRef<{ el: DesignElement; from: { w: number; h: number } } | null>(null);

  const addIcon = useCallback(
    (icon: IconKey, color: string) => {
      if (!printable(surfaceKey)) return;
      const shape = ICONS[icon].shape;
      const side = Math.round(Math.min(spec.w, spec.h) * (shape ? 0.3 : 0.22) * 10) / 10;
      const el: DesignElement = {
        id: nanoid(10),
        type: "icon",
        icon,
        color,
        x: spec.w / 2,
        y: spec.h / 2,
        // bands and lines span the face
        width: icon === "shape-line" || icon === "shape-ribbon" ? spec.w * 0.8 : side,
        height: icon === "shape-line" ? Math.max(1.5, spec.h * 0.02) : icon === "shape-ribbon" ? side * 0.6 : side,
        rotation: 0,
      };
      updateSurface(surfaceKey, (els) => [...els, el]);
      setSelectedId(el.id);
      setView((v) => (v === "2d" || v === "split" ? v : "split"));
    },
    [printable, surfaceKey, spec, updateSurface],
  );

  const placeAsset = useCallback(
    (a: UploadedAssetInfo) => {
      if (!printable(surfaceKey)) return;
      const maxW = spec.w * 0.5;
      const maxH = spec.h * 0.5;
      const k = Math.min(maxW / a.width, maxH / a.height);
      const el: DesignElement = {
        id: nanoid(10),
        type: "image",
        assetId: a.id,
        mime: a.mime,
        naturalWidth: a.width,
        naturalHeight: a.height,
        x: spec.w / 2,
        y: spec.h / 2,
        width: Math.max(1, a.width * k),
        height: Math.max(1, a.height * k),
        rotation: 0,
      };
      updateSurface(surfaceKey, (els) => [...els, el]);
      setSelectedId(el.id);
      setView((v) => (v === "2d" || v === "split" ? v : "split"));
    },
    [printable, surfaceKey, spec, updateSurface],
  );

  const uploadLogo = useCallback(
    async (file: File) => {
      setUploadError(null);
      if (file.size > maxUploadMb * 1024 * 1024) {
        setUploadError(locale === "ar" ? "حجم الملف أكبر من المسموح" : "File is larger than allowed");
        return;
      }
      setUploading(true);
      try {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("kind", "LOGO");
        const res = await fetch("/api/assets", { method: "POST", body: fd });
        const j = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(j.error ?? "upload_failed");
        const asset = j.asset as UploadedAssetInfo;
        setUploads((u) => [asset, ...u]);
        placeAsset(asset);
      } catch (e) {
        const code = (e as Error).message;
        const msgs: Record<string, [string, string]> = {
          unsupported_type: ["نوع الملف غير مدعوم. استخدم PNG أو JPEG أو SVG.", "Unsupported file type. Use PNG, JPEG or SVG."],
          too_large: ["حجم الملف أكبر من المسموح.", "File is too large."],
          svg_external_ref: ["ملف SVG يحتوي مراجع خارجية غير مسموحة.", "The SVG references external resources, which is not allowed."],
          rate_limited: ["محاولات كثيرة، انتظر قليلاً.", "Too many attempts, please wait."],
        };
        setUploadError((msgs[code] ?? [t.common.error, t.common.error])[locale === "ar" ? 0 : 1]);
      } finally {
        setUploading(false);
      }
    },
    [maxUploadMb, locale, placeAsset, t],
  );

  /* ── dimensions & template ── */
  const applyDims = useCallback(
    (next: Dimensions) => {
      const issues = validateDimensions(engine, next, template.version.limits);
      setDimIssues(issues);
      if (hasErrors(issues)) return;
      update((d) => ({ ...d, dimensions: next, surfaces: reflowSurfaces(d.surfaces, engine.surfaces(d.dimensions), engine.surfaces(next)) }), "dims");
    },
    [engine, template, update],
  );

  useEffect(() => {
    setDimIssues(validateDimensions(engine, doc.dimensions, template.version.limits));
  }, [engine, doc.dimensions, template]);

  const switchTemplate = useCallback(
    (code: string) => {
      const next = catalog.templates.find((x) => x.code === code);
      if (!next) return;
      const hasContent = Object.values(doc.surfaces).some((s) => s.elements.length || s.background);
      if (hasContent && !window.confirm(t.studio.templateSwitchConfirm)) return;
      const nextEngine = getEngine(next.engineKey);
      const dims = next.version.defaults;
      update((d) => ({
        ...d,
        templateCode: next.code,
        templateVersion: next.version.version,
        dimensions: { ...dims },
        materialCode: d.materialCode && next.materialCodes.includes(d.materialCode) ? d.materialCode : next.materialCodes[0] ?? null,
        printOption: d.printOption && next.version.printOptions.includes(d.printOption) ? d.printOption : null,
        surfaces: reflowSurfaces(d.surfaces, engine.surfaces(d.dimensions), nextEngine.surfaces(dims)),
      }));
      setSelectedId(null);
    },
    [catalog.templates, doc.surfaces, engine, t, update],
  );

  const resetDesign = () => {
    if (!window.confirm(t.studio.resetConfirm)) return;
    update(() => makeDefault(template.code));
    setSelectedId(null);
  };

  /* ── issues ── */
  const allIssues = useMemo(() => {
    const list: ValidationIssue[] = [...dimIssues];
    for (const s of specs) {
      for (const el of doc.surfaces[s.key].elements) {
        if (isOutsideSafeArea(el, s, template.version.safeMarginMm)) {
          list.push({ level: "warning", code: "safe", message: { ar: `${s.label.ar}: ${t.studio.outsideSafe}`, en: `${s.label.en}: ${t.studio.outsideSafe}` } });
        }
        if (el.type === "image") {
          const dpi = effectiveDpi(el);
          if (dpi !== null && dpi < MIN_PRINT_DPI) list.push({ level: "warning", code: "dpi", message: { ar: `${s.label.ar}: ${fmt(t.studio.lowRes, { dpi })}`, en: `${s.label.en}: ${fmt(t.studio.lowRes, { dpi })}` } });
        }
      }
    }
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dimIssues, specs, doc.surfaces, template]);

  /* ── save / export / quote ── */
  const requireLogin = useCallback(() => setLoginPrompt(true), []);

  async function makeThumbnail(): Promise<string | null> {
    if (!canvasesRef.current) return null;
    try {
      const iso = renderIsoThumbnail(doc.dimensions, canvasesRef.current, { width: 640, height: 480 });
      const fd = new FormData();
      fd.append("file", await canvasToBlob(iso), "preview.png");
      fd.append("kind", "PREVIEW");
      const res = await fetch("/api/assets", { method: "POST", body: fd });
      if (!res.ok) return null;
      return (await res.json()).asset.id as string;
    } catch {
      return null;
    }
  }

  async function save(): Promise<string | null> {
    if (!isLoggedIn) {
      requireLogin();
      return null;
    }
    if (hasErrors(dimIssues)) return null;
    setBusy("save");
    setSaveState("saving");
    try {
      const thumbnailAssetId = await makeThumbnail();
      let id = designId;
      if (!id) {
        const res = await fetch("/api/designs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, document: doc, thumbnailAssetId }) });
        if (!res.ok) throw new Error(String(res.status));
        id = (await res.json()).design.id as string;
        setDesignId(id);
        localStorage.removeItem(DRAFT_KEY);
        router.replace(`/${locale}/studio?design=${id}`, { scroll: false });
      } else {
        const res = await fetch(`/api/designs/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, document: doc, thumbnailAssetId, snapshot: true }) });
        if (!res.ok) throw new Error(String(res.status));
      }
      lastSaved.current = { doc, name };
      setSaveState("saved");
      setToast({ tone: "ok", text: t.common.saved });
      return id;
    } catch {
      setSaveState("error");
      setToast({ tone: "danger", text: t.common.error });
      return null;
    } finally {
      setBusy(null);
    }
  }

  async function requestQuote() {
    if (!isLoggedIn) return requireLogin();
    if (hasErrors(dimIssues)) return;
    setBusy("quote");
    const id = await save();
    setBusy(null);
    if (id) router.push(`/${locale}/quote?design=${id}`);
  }

  async function exportPng() {
    const fileBase = name.replace(/[^\p{L}\p{N}_-]+/gu, "-").slice(0, 60) || "design";
    if (view === "3d" && glCanvas.current) {
      downloadBlob(await canvasToBlob(glCanvas.current), `${fileBase}-3d.png`);
    } else if (canvasesRef.current) {
      downloadBlob(await canvasToBlob(renderIsoThumbnail(doc.dimensions, canvasesRef.current, { width: 1600, height: 1200 })), `${fileBase}.png`);
    }
  }

  function exportSvg() {
    const svg = dielineToSvg(dieline, { title: `${template.nameEn} ${doc.dimensions.length}x${doc.dimensions.width}x${doc.dimensions.height}`, locale, validated: template.version.dielineValidated });
    downloadBlob(new Blob([svg], { type: "image/svg+xml" }), `dieline-${template.code}-${doc.dimensions.length}x${doc.dimensions.width}x${doc.dimensions.height}.svg`);
  }

  function exportJson() {
    downloadBlob(new Blob([JSON.stringify({ name, document: doc }, null, 2)], { type: "application/json" }), `${template.code}-design.json`);
  }

  /* ── keyboard shortcuts ── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || (e.target as HTMLElement)?.isContentEditable) return;
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if (mod && e.key.toLowerCase() === "y") {
        e.preventDefault();
        redo();
      } else if (mod && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void save();
      } else if (selected && mod && e.key.toLowerCase() === "c") {
        clipboard.current = { el: selected, from: { w: spec.w, h: spec.h } };
        setToast({ tone: "ok", text: locale === "ar" ? "نُسخ العنصر — الصقه على أي وجه بـ Ctrl+V" : "Copied — paste on any face with Ctrl+V" });
      } else if (mod && e.key.toLowerCase() === "v" && clipboard.current && printable(surfaceKey)) {
        e.preventDefault();
        const pasted = fitTo(clipboard.current.el, clipboard.current.from, spec, nanoid(10));
        updateSurface(surfaceKey, (els) => [...els, pasted]);
        setSelectedId(pasted.id);
      } else if (e.key === "?" || (e.shiftKey && e.key === "/")) {
        setShortcutsOpen((o) => !o);
      } else if (selected && mod && e.key.toLowerCase() === "d") {
        e.preventDefault();
        duplicateElement(selected.id);
      } else if (selected && (e.key === "Delete" || e.key === "Backspace")) {
        e.preventDefault();
        removeElement(selected.id);
      } else if (selected && !selected.locked && e.key.startsWith("Arrow")) {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        const dx = e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0;
        const dy = e.key === "ArrowUp" ? -step : e.key === "ArrowDown" ? step : 0;
        updateElement(selected.id, { x: selected.x + dx, y: selected.y + dy }, `nudge-${selected.id}`);
      } else if (e.key === "Escape") {
        setSelectedId(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  useEffect(() => setSelectedId(null), [surfaceKey]);

  const api: StudioApi = {
    t,
    locale,
    catalog,
    template,
    engine,
    doc,
    update,
    specs,
    spec,
    surfaceKey,
    setSurfaceKey,
    printable,
    selectedId,
    setSelectedId,
    selected,
    material,
    compatibleMaterials,
    unit,
    setUnit,
    dimIssues,
    applyDims,
    switchTemplate,
    addText,
    updateElement,
    removeElement,
    duplicateElement,
    moveElement,
    centerElement,
    placeElement,
    moveElementToSurface,
    applyElementToAllSurfaces,
    copySurface,
    uploads,
    uploading,
    uploadError,
    uploadLogo,
    placeAsset,
    addIcon,
    addCode,
    isLoggedIn,
    requireLogin,
    images,
    maxUploadMb,
  };

  const leftTabs: { key: LeftTab; label: string; Icon: typeof BoxIcon }[] = [
    { key: "templates", label: t.studio.templates, Icon: BoxIcon },
    { key: "presets", label: locale === "ar" ? "تصاميم جاهزة" : "Ready designs", Icon: SparkIcon },
    { key: "colors", label: t.studio.colors, Icon: PaletteIcon },
    { key: "text", label: t.studio.text, Icon: TextIcon },
    { key: "elements", label: locale === "ar" ? "العناصر" : "Elements", Icon: GridIcon },
    { key: "uploads", label: t.studio.uploads, Icon: UploadIcon },
    { key: "material", label: t.studio.material, Icon: SettingsIcon },
    { key: "layers", label: t.studio.layers, Icon: LayersIcon },
  ];
  const PANELS: Record<string, () => React.ReactNode> = {
    templates: () => <TemplatesPanel />,
    presets: () => <PresetsPanel />,
    colors: () => <ColorsPanel />,
    text: () => <TextPanel />,
    elements: () => <ElementsPanel />,
    uploads: () => <UploadsPanel />,
    material: () => <MaterialPanel />,
    layers: () => <LayersPanel />,
  };
  const leftPanel = (k: string) => PANELS[k]?.() ?? null;

  const statusText =
    saveState === "saving" ? t.common.saving : saveState === "saved" ? (designId ? t.studio.autosaved : t.common.saved) : saveState === "dirty" ? t.studio.unsaved : saveState === "error" ? t.common.error : t.studio.localDraft;

  const views: { key: View; label: string; Icon: typeof BoxIcon }[] = [
    { key: "split", label: locale === "ar" ? "تحرير + معاينة" : "Edit + preview", Icon: LayersIcon },
    { key: "2d", label: t.studio.view2d, Icon: PenIcon },
    { key: "3d", label: t.studio.view3d, Icon: CubeIcon },
    { key: "dieline", label: t.studio.viewDieline, Icon: FlatIcon },
  ];

  return (
    <StudioContext.Provider value={api}>
      {/* white workspace for the studio, its dialogs and toasts */}
      <div className="theme-light contents">
      <div className="flex h-[calc(100dvh-4.5rem)] min-h-[560px] flex-col bg-paper">
        {/* ── Top toolbar ── */}
        <div className="flex flex-wrap items-center gap-2 border-b border-navy/8 bg-white px-3 py-2 sm:flex-nowrap">
          <input
            aria-label={t.studio.nameDesign}
            value={name}
            onChange={(e) => setName(e.target.value.slice(0, 120))}
            className="w-full min-w-0 rounded-lg border border-transparent bg-transparent px-2 py-1.5 text-sm font-semibold text-navy hover:border-navy/10 focus:border-sun focus:outline-none sm:w-56"
          />
          <span className={cx("hidden text-xs sm:inline", saveState === "error" ? "text-danger" : "text-ink-500")} aria-live="polite">
            {statusText}
          </span>
          <div className="mx-auto flex items-center gap-0.5">
            <ToolButton label={t.studio.undo} onClick={undo} disabled={!history.canUndo}>
              <UndoIcon className="size-4 rtl:-scale-x-100" />
            </ToolButton>
            <ToolButton label={t.studio.redo} onClick={redo} disabled={!history.canRedo}>
              <RedoIcon className="size-4 rtl:-scale-x-100" />
            </ToolButton>
            <ToolButton label={t.studio.reset} onClick={resetDesign}>
              <ResetIcon className="size-4" />
            </ToolButton>
            <ToolButton
              label={t.studio.preview}
              active={focusMode}
              onClick={() => {
                setFocusMode((f) => !f);
                setView("3d");
              }}
            >
              <EyeIcon className="size-4" />
            </ToolButton>
            <ExportMenu onPng={exportPng} onSvg={exportSvg} onJson={exportJson} />
            <ToolButton label={locale === "ar" ? "اختصارات لوحة المفاتيح" : "Keyboard shortcuts"} onClick={() => setShortcutsOpen(true)}>
              <span className="text-sm font-bold">?</span>
            </ToolButton>
          </div>
          <Button variant="outline" size="sm" onClick={() => void save()} disabled={busy !== null || hasErrors(dimIssues)}>
            {busy === "save" ? <Spinner /> : <SaveIcon className="size-4" />}
            <span className="hidden md:inline">{t.studio.save}</span>
          </Button>
          <Button variant="accent" size="sm" onClick={() => void requestQuote()} disabled={busy !== null || hasErrors(dimIssues)}>
            {busy === "quote" ? <Spinner /> : null}
            <span>{t.studio.requestQuote}</span>
          </Button>
        </div>

        <StepsBar
          steps={[
            { label: locale === "ar" ? "الشكل" : "Shape", done: true, tab: "templates" },
            { label: locale === "ar" ? "المقاس" : "Size", done: !hasErrors(dimIssues), tab: "templates" },
            { label: locale === "ar" ? "الألوان" : "Colours", done: SURFACE_KEYS.some((k) => doc.surfaces[k].background), tab: "colors" },
            { label: locale === "ar" ? "الشعار والنص" : "Logo & text", done: SURFACE_KEYS.some((k) => doc.surfaces[k].elements.length > 0), tab: "uploads" },
            {
              label: locale === "ar" ? "التشطيب" : "Finish",
              done: doc.finishingCodes.length > 0 || SURFACE_KEYS.some((k) => (doc.surfaces[k].coating ?? "none") !== "none" || doc.surfaces[k].elements.some((e) => e.finish && e.finish !== "none")),
              tab: "material",
            },
            { label: locale === "ar" ? "الكمية" : "Quantity", done: !!doc.quantity, tab: "material" },
          ]}
          onStep={(tab) => {
            setLeftTab(tab as LeftTab);
            setMobileSheet(tab);
          }}
          cta={locale === "ar" ? "جاهز؟ اطلب عرض السعر" : "Ready? Request a quote"}
          onCta={() => void requestQuote()}
        />
        <div className="flex min-h-0 flex-1">
          {/* ── Left sidebar (desktop) ── */}
          {!focusMode && (
            <aside className="hidden w-[340px] shrink-0 border-e border-navy/8 bg-white lg:flex">
              <nav aria-label={t.studio.tools} className="flex w-[76px] shrink-0 flex-col gap-1 border-e border-navy/6 p-2">
                {leftTabs.map(({ key, label, Icon }) => (
                  <button
                    key={key}
                    onClick={() => setLeftTab(key)}
                    aria-pressed={leftTab === key}
                    className={cx("flex flex-col items-center gap-1 rounded-xl px-1 py-2.5 text-[10px] font-semibold", leftTab === key ? "bg-navy text-white" : "text-ink-500 hover:bg-paper-200")}
                  >
                    <Icon className="size-5" />
                    {label}
                  </button>
                ))}
              </nav>
              <div className="min-w-0 flex-1 overflow-y-auto p-4">{leftPanel(leftTab)}</div>
            </aside>
          )}

          {/* ── Centre ── */}
          <section className="flex min-w-0 flex-1 flex-col" aria-label={t.studio.preview}>
            <div className="flex flex-wrap items-center justify-between gap-2 px-3 pt-3">
              <div role="tablist" className="flex rounded-full bg-white p-1 shadow-sm">
                {views.map(({ key, label, Icon }) => (
                  <button
                    key={key}
                    role="tab"
                    aria-selected={view === key}
                    onClick={() => setView(key)}
                    className={cx("flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold", view === key ? "bg-navy text-white" : "text-ink-500 hover:text-navy")}
                  >
                    <Icon className="size-4" />
                    <span className="hidden sm:inline">{label}</span>
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-1 rounded-full bg-white p-1 shadow-sm">
                {(view === "3d" || view === "split") && (
                  <>
                    {(["front", "back", "side", "top"] as const).map((p) => (
                      <button key={p} onClick={() => setPreset({ p, n: preset.n + 1 })} className="rounded-full px-2.5 py-1 text-xs font-medium text-ink-500 hover:bg-paper-200 hover:text-navy">
                        {t.studio[p]}
                      </button>
                    ))}
                    <ToolButton label={t.studio.cameraReset} onClick={() => setPreset({ p: "iso", n: preset.n + 1 })}>
                      <RotateIcon className="size-4" />
                    </ToolButton>
                    {(engine.boxStyle === "mailer" || engine.boxStyle === "tuck") && (
                      <button onClick={() => setLidOpen((o) => !o)} className="rounded-full bg-sun-100 px-3 py-1 text-xs font-semibold text-sun-600">
                        {lidOpen ? t.studio.closeLid : t.studio.openLid}
                      </button>
                    )}
                  </>
                )}
                {view !== "3d" && (
                  <>
                    {(view === "2d" || view === "split") && (
                      <ToolButton label={t.studio.snap} active={snap} onClick={() => setSnap((s) => !s)}>
                        <GridIcon className="size-4" />
                      </ToolButton>
                    )}
                    <ToolButton label={t.studio.zoomOut} onClick={() => setZoom((z) => Math.max(0.3, z / 1.2))}>
                      <ZoomOutIcon className="size-4" />
                    </ToolButton>
                    <button onClick={() => setZoom(1)} className="num w-12 text-center text-xs font-semibold text-navy">
                      {Math.round(zoom * 100)}%
                    </button>
                    <ToolButton label={t.studio.zoomIn} onClick={() => setZoom((z) => Math.min(6, z * 1.2))}>
                      <ZoomInIcon className="size-4" />
                    </ToolButton>
                  </>
                )}
              </div>
            </div>

            <div className={cx("relative m-3 min-h-0 flex-1 gap-3", view === "split" ? "grid grid-rows-2 lg:grid-cols-2 lg:grid-rows-1" : "flex")}>
              {(view === "2d" || view === "split") && (
                <div className="relative min-h-0 flex-1 overflow-hidden rounded-2xl border border-navy/10 bg-white bg-grid shadow-sm">
                  {printable(surfaceKey) ? (
                    <SurfaceEditor
                      spec={spec}
                      surface={doc.surfaces[surfaceKey]}
                      structure={{ codes: doc.finishingCodes, boxStyle: engine.boxStyle }}
                      materialColor={materialColor}
                      safeMargin={template.version.safeMarginMm}
                      images={images}
                      imagesVersion={imagesVersion + (fontsReady ? 1000 : 0)}
                      selectedId={selectedId}
                      onSelect={setSelectedId}
                      onChange={updateElement}
                      snap={snap}
                      zoom={zoom}
                      onZoom={setZoom}
                      labels={{ safe: t.studio.outsideSafe, edge: "" }}
                    />
                  ) : (
                    <div className="absolute inset-0 grid place-items-center p-6 text-center text-sm text-ink-500">{t.studio.notPrintable}</div>
                  )}
                  {printable(surfaceKey) && doc.surfaces[surfaceKey].elements.length === 0 && (
                    <div className="absolute inset-x-3 bottom-3 flex flex-wrap items-center justify-center gap-2 rounded-xl border border-navy/10 bg-white/95 p-2 shadow-sm backdrop-blur">
                      <span className="px-1 text-[11px] text-ink-500">{locale === "ar" ? "هذا الوجه فارغ — ابدأ بـ:" : "This face is empty — start with:"}</span>
                      {[
                        { label: locale === "ar" ? "تصميم جاهز" : "Ready design", tab: "presets" },
                        { label: locale === "ar" ? "شعارك" : "Your logo", tab: "uploads" },
                        { label: locale === "ar" ? "نص" : "Text", tab: "text" },
                        { label: locale === "ar" ? "عناصر" : "Elements", tab: "elements" },
                        { label: locale === "ar" ? "لون" : "Colour", tab: "colors" },
                      ].map((b) => (
                        <button key={b.tab} onClick={() => (setLeftTab(b.tab as LeftTab), setMobileSheet(b.tab))} className="rounded-full border border-navy/15 px-3 py-1 text-[11px] font-medium text-navy hover:border-sun hover:bg-sun-100">
                          {b.label}
                        </button>
                      ))}
                    </div>
                  )}
                  <span className="pointer-events-none absolute end-3 top-3 rounded-full bg-navy px-3 py-1 text-xs font-semibold text-white shadow-sm">
                    {spec.label[locale]} · <span className="num">{fmt(t.studio.sizeLabel, { w: Math.round(spec.w), h: Math.round(spec.h) })}</span>
                  </span>
                </div>
              )}
              {(view === "3d" || view === "split") && (
                <div className="relative min-h-0 flex-1 overflow-hidden rounded-2xl border border-navy/10 bg-paper shadow-sm">
                  <BoxViewer
                    className="absolute inset-0"
                    theme="light"
                    dims={doc.dimensions}
                    boxStyle={engine.boxStyle}
                    canvases={canvasesRef.current}
                    finishMaps={finishRef.current}
                    textureVersion={faceVersions}
                    materialColor={materialColor}
                    insideColor={doc.interior}
                    addons={doc.finishingCodes}
                    lidOpen={lidOpen}
                    preset={preset.p}
                    presetNonce={preset.n}
                    onFaceClick={(k) => printable(k) && setSurfaceKey(k)}
                    selectedFace={surfaceKey}
                    onCanvas={(c) => (glCanvas.current = c)}
                    fallback={<div className="absolute inset-0 grid place-items-center p-6 text-center text-sm text-ink-500">{t.studio.webglFallback}</div>}
                  />
                  <span className="pointer-events-none absolute inset-x-0 top-3 mx-auto w-fit rounded-full bg-white/90 px-3 py-1 text-[11px] text-ink-500 shadow-sm">
                    {locale === "ar" ? "اضغط على أي وجه لتعديله · اسحب للتدوير" : "Click any face to edit it · drag to rotate"}
                  </span>
                </div>
              )}
              {view === "dieline" && (
                <div className="relative min-h-0 flex-1 overflow-hidden rounded-2xl border border-navy/10 bg-white shadow-sm">
                  <DielineView dieline={dieline} specs={specs} canvases={canvasesRef.current} version={texVersion} materialColor={materialColor} locale={locale} zoom={zoom} />
                </div>
              )}

              <div className="pointer-events-none absolute start-3 bottom-3 flex flex-wrap items-center gap-2">
                <span className="num rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-navy shadow-sm">
                  {doc.dimensions.length} × {doc.dimensions.width} × {doc.dimensions.height} mm
                </span>
              </div>
              {focusMode && (
                <button onClick={() => setFocusMode(false)} className={buttonClass("outline", "sm", "absolute end-3 top-3")}>
                  <XIcon className="size-4" />
                  {t.nav.close}
                </button>
              )}
            </div>

            {/* surface strip */}
            <div className="flex gap-1.5 overflow-x-auto px-3 pb-3">
              {specs.map((s) => (
                <button
                  key={s.key}
                  disabled={!printable(s.key)}
                  onClick={() => {
                    setSurfaceKey(s.key);
                    if (view === "dieline") setView("2d");
                  }}
                  aria-pressed={surfaceKey === s.key}
                  className={cx(
                    "shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition disabled:opacity-40",
                    surfaceKey === s.key ? "border-navy bg-navy text-white" : "border-navy/10 bg-white text-navy hover:border-navy/30",
                  )}
                >
                  {s.label[locale]}
                </button>
              ))}
            </div>
          </section>

          {/* ── Right sidebar (desktop) ── */}
          {!focusMode && (
            <aside className="hidden w-[320px] shrink-0 space-y-6 overflow-y-auto border-s border-navy/8 bg-white p-4 xl:block">
              <InspectorPanel />
              <DimensionsPanel />
              <SurfacesPanel />
              <SummaryPanel issues={allIssues.filter((i) => !dimIssues.includes(i))} />
            </aside>
          )}
          {/* On lg (no xl), right column content is reachable via the left "material" tab and mobile sheet */}
          {!focusMode && (
            <aside className="hidden w-[300px] shrink-0 space-y-6 overflow-y-auto border-s border-navy/8 bg-white p-4 lg:block xl:hidden">
              <InspectorPanel />
              <DimensionsPanel />
              <SummaryPanel issues={allIssues.filter((i) => !dimIssues.includes(i))} />
            </aside>
          )}
        </div>

        {/* ── Mobile bottom bar + sheets ── */}
        <div className="border-t border-navy/8 bg-white lg:hidden">
          {mobileSheet && (
            <div className="max-h-[46dvh] overflow-y-auto border-b border-navy/8 p-4">
              <div className="mb-2 flex justify-end">
                <button onClick={() => setMobileSheet(null)} aria-label={t.nav.close} className="rounded-full p-1.5 text-ink-500 hover:bg-paper-200">
                  <XIcon className="size-5" />
                </button>
              </div>
              {mobileSheet === "dims" ? (
                <div className="space-y-6">
                  <DimensionsPanel />
                  <SurfacesPanel />
                </div>
              ) : mobileSheet === "summary" ? (
                <SummaryPanel issues={allIssues.filter((i) => !dimIssues.includes(i))} />
              ) : (
                <div className="space-y-6">
                  {mobileSheet !== "layers" && mobileSheet !== "text" && <InspectorPanel />}
                  {leftPanel(mobileSheet)}
                </div>
              )}
            </div>
          )}
          <nav aria-label={t.studio.tools} className="flex overflow-x-auto">
            {[
              { key: "dims", label: t.studio.dimensions, Icon: RulerIcon },
              ...leftTabs,
              { key: "summary", label: t.studio.summary, Icon: EyeIcon },
            ].map(({ key, label, Icon }) => (
              <button
                key={key}
                onClick={() => setMobileSheet((s) => (s === key ? null : key))}
                aria-pressed={mobileSheet === key}
                className={cx("flex min-w-[72px] flex-1 flex-col items-center gap-1 px-2 py-2.5 text-[10px] font-semibold", mobileSheet === key ? "text-sun-600" : "text-ink-500")}
              >
                <Icon className="size-5" />
                {label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {shortcutsOpen && (
        <div role="dialog" aria-modal="true" aria-labelledby="shortcuts-title" className="fixed inset-0 z-50 grid place-items-center bg-navy-950/40 p-4" onClick={() => setShortcutsOpen(false)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-[var(--shadow-lift)]" onClick={(e) => e.stopPropagation()}>
            <h2 id="shortcuts-title" className="text-lg font-bold text-navy">
              {locale === "ar" ? "اختصارات لوحة المفاتيح" : "Keyboard shortcuts"}
            </h2>
            <dl className="mt-4 divide-y divide-navy/8 text-sm">
              {[
                ["Ctrl + Z", locale === "ar" ? "تراجع" : "Undo"],
                ["Ctrl + Shift + Z / Ctrl + Y", locale === "ar" ? "إعادة" : "Redo"],
                ["Ctrl + C / Ctrl + V", locale === "ar" ? "نسخ ولصق عنصر (حتى بين الأوجه)" : "Copy & paste an element (across faces too)"],
                ["Ctrl + D", locale === "ar" ? "تكرار العنصر" : "Duplicate element"],
                ["Delete", locale === "ar" ? "حذف العنصر" : "Delete element"],
                ["← ↑ → ↓", locale === "ar" ? "تحريك 1 مم (مع Shift: 10 مم)" : "Nudge 1 mm (Shift: 10 mm)"],
                ["Ctrl + S", locale === "ar" ? "حفظ التصميم" : "Save design"],
                ["Esc", locale === "ar" ? "إلغاء التحديد" : "Deselect"],
                ["?", locale === "ar" ? "هذه القائمة" : "This list"],
              ].map(([k, v]) => (
                <div key={k} className="flex items-center justify-between gap-4 py-2">
                  <dt className="text-ink-500">{v}</dt>
                  <dd>
                    <kbd className="num rounded-md border border-navy/15 bg-paper px-2 py-0.5 text-xs text-navy" dir="ltr">
                      {k}
                    </kbd>
                  </dd>
                </div>
              ))}
            </dl>
            <Button className="mt-5 w-full" variant="outline" onClick={() => setShortcutsOpen(false)}>
              {t.nav.close}
            </Button>
          </div>
        </div>
      )}

      {/* ── Login prompt ── */}
      {loginPrompt && (
        <div role="dialog" aria-modal="true" aria-labelledby="login-prompt-title" className="fixed inset-0 z-50 grid place-items-center bg-navy-950/50 p-4" onClick={() => setLoginPrompt(false)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-[var(--shadow-lift)]" onClick={(e) => e.stopPropagation()}>
            <h2 id="login-prompt-title" className="text-lg font-bold text-navy">
              {t.auth.loginTitle}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-500">{t.auth.loginRequired}</p>
            <div className="mt-6 flex flex-wrap gap-2">
              <Link href={`/${locale}/login?next=${encodeURIComponent(`/${locale}/studio`)}`} className={buttonClass("primary", "md")}>
                {t.nav.login}
              </Link>
              <Link href={`/${locale}/register?next=${encodeURIComponent(`/${locale}/studio`)}`} className={buttonClass("outline", "md")}>
                {t.nav.register}
              </Link>
              <Button variant="ghost" onClick={() => setLoginPrompt(false)}>
                {t.common.cancel}
              </Button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-20 start-1/2 z-50 -translate-x-1/2 rtl:translate-x-1/2 lg:bottom-6">
          <Alert tone={toast.tone} className="bg-white shadow-[var(--shadow-lift)]">
            {toast.text}
          </Alert>
        </div>
      )}
      </div>
    </StudioContext.Provider>
  );
}

function ToolButton({ label, onClick, disabled, active, children }: { label: string; onClick: () => void; disabled?: boolean; active?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className={cx("grid size-9 place-items-center rounded-full transition disabled:opacity-30", active ? "bg-navy text-white" : "text-navy hover:bg-paper-200")}
    >
      {children}
    </button>
  );
}

function ExportMenu({ onPng, onSvg, onJson }: { onPng: () => void; onSvg: () => void; onJson: () => void }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);
  const item = (label: string, fn: () => void) => (
    <button
      role="menuitem"
      onClick={() => {
        fn();
        setOpen(false);
      }}
      className="block w-full rounded-lg px-3 py-2 text-start text-sm text-navy hover:bg-paper-200"
    >
      {label}
    </button>
  );
  return (
    <div ref={ref} className="relative">
      <ToolButton label={t.studio.exportPng} onClick={() => setOpen((o) => !o)} active={open}>
        <DownloadIcon className="size-4" />
      </ToolButton>
      {open && (
        <div role="menu" className="absolute end-0 top-11 z-30 w-56 rounded-xl border border-navy/10 bg-white p-1.5 shadow-[var(--shadow-lift)]">
          {item(t.studio.exportPng, onPng)}
          {item(t.studio.exportSvg, onSvg)}
          {item(t.studio.exportJson, onJson)}
        </div>
      )}
    </div>
  );
}

function StepsBar({ steps, onStep, cta, onCta }: { steps: { label: string; done: boolean; tab: string }[]; onStep: (tab: string) => void; cta: string; onCta: () => void }) {
  const done = steps.filter((s) => s.done).length;
  return (
    <div className="hidden items-center gap-2 border-b border-navy/8 bg-white px-3 py-1.5 lg:flex">
      <ol className="flex flex-1 items-center gap-1">
        {steps.map((s, i) => (
          <li key={s.label} className="flex items-center gap-1">
            {i > 0 && <span className={cx("h-px w-5", steps[i - 1].done ? "bg-sun" : "bg-navy/15")} />}
            <button onClick={() => onStep(s.tab)} className={cx("flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium transition", s.done ? "bg-sun-100 text-navy" : "text-ink-500 hover:bg-paper-200")}>
              <span className={cx("grid size-4 place-items-center rounded-full text-[9px] text-white", s.done ? "bg-sun" : "bg-navy/25")}>{s.done ? "✓" : i + 1}</span>
              {s.label}
            </button>
          </li>
        ))}
      </ol>
      <span className="num text-[11px] text-ink-500">
        {done}/{steps.length}
      </span>
      {done >= steps.length - 1 && (
        <button onClick={onCta} className="rounded-full bg-sun px-3 py-1 text-[11px] font-semibold text-white">
          {cta}
        </button>
      )}
    </div>
  );
}
