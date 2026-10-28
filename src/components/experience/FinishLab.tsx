"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { sunMark } from "@/components/three/showcase";
import { timeline } from "./scroll";
import { finishAt, finishStageAt } from "./story";

const W = 1024;
const H = 640;

function canvas(fill: string) {
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const x = c.getContext("2d")!;
  x.fillStyle = fill;
  x.fillRect(0, 0, W, H);
  return c;
}

/** Paint the three finish zones on one panel: foil logo (left), embossed wordmark (centre), spot-UV pattern (right). */
function paintPanel() {
  const color = canvas("#2A1A10");
  const rough = canvas("rgb(217,217,217)");
  const metal = canvas("rgb(0,0,0)");
  const bump = canvas("rgb(128,128,128)");
  const ctx = color.getContext("2d")!;

  // print: subtle grain on dark board
  const img = ctx.getImageData(0, 0, W, H);
  let s = 9;
  for (let i = 0; i < img.data.length; i += 4) {
    s = (s * 16807) % 2147483647;
    const n = ((s % 100) / 100 - 0.5) * 10;
    img.data[i] += n;
    img.data[i + 1] += n;
    img.data[i + 2] += n;
  }
  ctx.putImageData(img, 0, 0);

  // 1 — gold foil sun mark
  for (const [c, col] of [
    [ctx, "#D4A84B"],
    [metal.getContext("2d")!, "#e1e1e1"],
    [rough.getContext("2d")!, "#383838"],
  ] as [CanvasRenderingContext2D, string][]) {
    sunMark(c, W * 0.22, H * 0.55, 92, col);
  }

  // 2 — embossed wordmark (same ink colour; the relief does the work)
  const word = (c: CanvasRenderingContext2D, col: string, blur = 0) => {
    c.save();
    if (blur) c.filter = `blur(${blur}px)`;
    c.fillStyle = col;
    c.font = "600 72px Inter, Arial, sans-serif";
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillText("SUNRISE", W * 0.52, H * 0.46);
    c.fillText("LIGHT", W * 0.52, H * 0.6);
    c.restore();
  };
  word(ctx, "#3a2617");
  word(bump.getContext("2d")!, "#ffffff", 3);

  // 3 — spot UV diagonal pattern (gloss only)
  const uv = (c: CanvasRenderingContext2D, col: string) => {
    c.save();
    c.beginPath();
    c.rect(W * 0.72, H * 0.18, W * 0.22, H * 0.64);
    c.clip();
    c.strokeStyle = col;
    c.lineWidth = 10;
    for (let i = -H; i < W; i += 30) {
      c.beginPath();
      c.moveTo(i, H);
      c.lineTo(i + H, 0);
      c.stroke();
    }
    c.restore();
  };
  uv(ctx, "#34200f");
  uv(rough.getContext("2d")!, "#1e1e1e");

  const tex = (c: HTMLCanvasElement, srgb: boolean) => {
    const t = new THREE.CanvasTexture(c);
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  };
  return { map: tex(color, true), roughnessMap: tex(rough, false), metalnessMap: tex(metal, false), bumpMap: tex(bump, false) };
}

export function FinishLab() {
  const group = useRef<THREE.Group>(null);
  const light = useRef<THREE.PointLight>(null);
  const textures = useMemo(() => paintPanel(), []);
  useEffect(() => () => Object.values(textures).forEach((t) => t.dispose()), [textures]);

  // panel is 4 × 2.5 scene units; zone centres in x
  const zones = [-1.12, 0.08, 1.32];

  useFrame(() => {
    const s = timeline.screens;
    const p = finishAt(s);
    const g = group.current;
    if (!g) return;
    g.visible = p > 0.01;
    g.position.y = (1 - p) * -2.5;
    const { index, local } = finishStageAt(s);
    if (light.current) {
      // the light sweeps across the active zone; low and raking for the emboss stage
      const x = zones[index] + (local - 0.5) * 1.6;
      const z = index === 1 ? 0.35 : 1.3;
      const y = index === 1 ? 1.1 : 0.8;
      light.current.position.set(x, y, z);
      light.current.intensity = 14 * p;
    }
  });

  return (
    <group ref={group}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[4, 2.5, 0.06]} />
        <meshStandardMaterial attach="material-0" color="#8a6440" />
        <meshStandardMaterial attach="material-1" color="#8a6440" />
        <meshStandardMaterial attach="material-2" color="#8a6440" />
        <meshStandardMaterial attach="material-3" color="#8a6440" />
        <meshStandardMaterial attach="material-4" {...textures} roughness={1} metalness={1} bumpScale={4} />
        <meshStandardMaterial attach="material-5" color="#B98C5A" />
      </mesh>
      <pointLight ref={light} distance={6} decay={1.6} color="#fff1dc" />
    </group>
  );
}
