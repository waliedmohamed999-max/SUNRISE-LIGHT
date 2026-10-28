"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html, Line } from "@react-three/drei";
import * as THREE from "three";
import { timeline } from "./scroll";
import { annotationsAt, dimsAt, macroAt, MM } from "./story";

function grainTexture(base: string, amount: number) {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 256, 256);
  const img = ctx.getImageData(0, 0, 256, 256);
  let s = 5;
  for (let i = 0; i < img.data.length; i += 4) {
    s = (s * 16807) % 2147483647;
    const n = ((s % 100) / 100 - 0.5) * amount;
    img.data[i] += n;
    img.data[i + 1] += n;
    img.data[i + 2] += n;
  }
  ctx.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(4, 4);
  return t;
}

/**
 * Cross-section of single-wall corrugated board, scaled up for the macro shot:
 * printed outer liner, sinusoidal fluting, kraft inner liner.
 */
export function CorrugatedSample() {
  const group = useRef<THREE.Group>(null);
  const width = 3.4;
  const depth = 1.8;
  const H = 0.36; // liner-to-liner
  const T = 0.028; // paper thickness
  const period = 0.24;

  const flute = useMemo(() => {
    const shape = new THREE.Shape();
    const steps = 340;
    const amp = H / 2 - T;
    const wave = (x: number) => Math.sin((x / period) * Math.PI * 2) * amp;
    for (let i = 0; i <= steps; i++) {
      const x = -width / 2 + (width * i) / steps;
      if (i === 0) shape.moveTo(x, wave(x) + T / 2);
      else shape.lineTo(x, wave(x) + T / 2);
    }
    for (let i = steps; i >= 0; i--) {
      const x = -width / 2 + (width * i) / steps;
      shape.lineTo(x, wave(x) - T / 2);
    }
    shape.closePath();
    const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, steps: 1 });
    g.translate(0, 0, -depth / 2);
    return g;
  }, []);

  const mats = useMemo(
    () => ({
      flute: new THREE.MeshStandardMaterial({ map: grainTexture("#B8854F", 26), roughness: 0.92 }),
      inner: new THREE.MeshStandardMaterial({ map: grainTexture("#C29262", 20), roughness: 0.9 }),
      printed: new THREE.MeshStandardMaterial({ color: "#C2470C", roughness: 0.45 }),
    }),
    [],
  );

  useFrame(() => {
    const m = macroAt(timeline.screens);
    if (!group.current) return;
    group.current.visible = m > 0.01;
    group.current.scale.setScalar(Math.max(0.001, 0.6 + 0.4 * m));
    group.current.position.y = -0.2 + (1 - m) * -1.5;
  });

  return (
    <group ref={group} rotation={[0, -0.35, 0]}>
      {/* printed outer liner */}
      <mesh position={[0, H / 2, 0]} castShadow receiveShadow material={mats.printed}>
        <boxGeometry args={[width, T, depth]} />
      </mesh>
      <mesh geometry={flute} castShadow receiveShadow material={mats.flute} />
      {/* inner liner */}
      <mesh position={[0, -H / 2, 0]} castShadow receiveShadow material={mats.inner}>
        <boxGeometry args={[width, T, depth]} />
      </mesh>
    </group>
  );
}

/** Live L / W / H dimension lines around the carton while the feature panels are on screen. */
export function DimensionAnnotations() {
  const group = useRef<THREE.Group>(null);
  const [l, w, h] = [useRef<HTMLSpanElement>(null), useRef<HTMLSpanElement>(null), useRef<HTMLSpanElement>(null)];

  useFrame(() => {
    const s = timeline.screens;
    const a = annotationsAt(s);
    const g = group.current;
    if (!g) return;
    g.visible = a > 0.02;
    const d = dimsAt(s);
    if (l.current) l.current.textContent = `${d.length} mm`;
    if (w.current) w.current.textContent = `${d.width} mm`;
    if (h.current) h.current.textContent = `${d.height} mm`;
    g.traverse((o) => {
      const mat = (o as THREE.Mesh).material as THREE.Material | undefined;
      if (mat && "opacity" in mat) {
        mat.transparent = true;
        mat.opacity = a;
      }
    });
  });

  const d = dimsAt(9);
  const L = d.length * MM;
  const W = d.width * MM;
  const H = d.height * MM;
  const o = 0.22;
  const orange = "#E0601A";
  const label = (ref: React.RefObject<HTMLSpanElement | null>) => (
    <span ref={ref} className="num rounded-full bg-[#E0601A] px-2 py-0.5 text-[11px] font-medium whitespace-nowrap text-cream" />
  );
  return (
    <group ref={group}>
      {/* length along the front-bottom edge */}
      <Line points={[[-L / 2, -H / 2, W / 2 + o], [L / 2, -H / 2, W / 2 + o]]} color={orange} lineWidth={1.4} />
      {/* width along the right-bottom edge */}
      <Line points={[[L / 2 + o, -H / 2, -W / 2], [L / 2 + o, -H / 2, W / 2]]} color={orange} lineWidth={1.4} />
      {/* height on the front-right corner */}
      <Line points={[[L / 2 + o, -H / 2, W / 2 + o], [L / 2 + o, H / 2, W / 2 + o]]} color={orange} lineWidth={1.4} />
      <Html position={[0, -H / 2, W / 2 + o + 0.2]} center zIndexRange={[5, 0]}>
        {label(l)}
      </Html>
      <Html position={[L / 2 + o + 0.35, -H / 2, 0]} center zIndexRange={[5, 0]}>
        {label(w)}
      </Html>
      <Html position={[L / 2 + o + 0.35, 0, W / 2 + o]} center zIndexRange={[5, 0]}>
        {label(h)}
      </Html>
    </group>
  );
}
