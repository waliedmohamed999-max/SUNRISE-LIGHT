"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { BoxStyle, Dimensions, SurfaceKey } from "@/packaging/types";

/**
 * Box built from six textured planes so every surface maps 1:1 to its artwork canvas.
 * Orientation conventions are documented in src/packaging/types.ts (SurfaceKey).
 * Units: the longest edge is normalised to `size` scene units.
 */
export interface BoxModelProps {
  dims: Dimensions;
  boxStyle: BoxStyle;
  canvases: Record<SurfaceKey, HTMLCanvasElement> | null;
  textureVersion: number;
  materialColor: string;
  lidOpen?: boolean;
  size?: number;
}

function useCanvasTexture(canvas: HTMLCanvasElement | undefined, version: number) {
  const texture = useMemo(() => {
    if (!canvas) return null;
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  }, [canvas]);
  useEffect(() => {
    if (texture) texture.needsUpdate = true;
  }, [texture, version]);
  useEffect(() => () => texture?.dispose(), [texture]);
  return texture;
}

function Face({ w, h, canvas, version, inside, position, rotation }: { w: number; h: number; canvas?: HTMLCanvasElement; version: number; inside: string; position: [number, number, number]; rotation: [number, number, number] }) {
  const map = useCanvasTexture(canvas, version);
  return (
    <group position={position} rotation={rotation}>
      <mesh castShadow receiveShadow>
        <planeGeometry args={[w, h]} />
        <meshStandardMaterial map={map ?? undefined} color={map ? "#ffffff" : inside} roughness={0.82} metalness={0} side={THREE.FrontSide} />
      </mesh>
      <mesh>
        <planeGeometry args={[w, h]} />
        <meshStandardMaterial color={inside} roughness={0.95} side={THREE.BackSide} />
      </mesh>
    </group>
  );
}

export function BoxModel({ dims, boxStyle, canvases, textureVersion, materialColor, lidOpen = false, size = 2.6 }: BoxModelProps) {
  const k = size / Math.max(dims.length, dims.width, dims.height);
  const L = dims.length * k;
  const W = dims.width * k;
  const H = dims.height * k;
  const inside = useMemo(() => new THREE.Color(materialColor).multiplyScalar(0.82).getStyle(), [materialColor]);
  const lidRef = useRef<THREE.Group>(null);
  const hinged = boxStyle !== "closed";

  useFrame((_, dt) => {
    if (!lidRef.current) return;
    const target = hinged && lidOpen ? -Math.PI * 0.62 : 0;
    const cur = lidRef.current.rotation.x;
    lidRef.current.rotation.x = cur + (target - cur) * Math.min(1, dt * 6);
  });

  const edges = useMemo(() => new THREE.EdgesGeometry(new THREE.BoxGeometry(L, H, W)), [L, H, W]);
  useEffect(() => () => edges.dispose(), [edges]);

  const c = canvases ?? ({} as Record<SurfaceKey, HTMLCanvasElement>);
  const v = textureVersion;

  return (
    <group position={[0, H / 2, 0]}>
      <Face w={L} h={H} canvas={c.front} version={v} inside={inside} position={[0, 0, W / 2]} rotation={[0, 0, 0]} />
      <Face w={L} h={H} canvas={c.back} version={v} inside={inside} position={[0, 0, -W / 2]} rotation={[0, Math.PI, 0]} />
      <Face w={W} h={H} canvas={c.right} version={v} inside={inside} position={[L / 2, 0, 0]} rotation={[0, Math.PI / 2, 0]} />
      <Face w={W} h={H} canvas={c.left} version={v} inside={inside} position={[-L / 2, 0, 0]} rotation={[0, -Math.PI / 2, 0]} />
      <Face w={L} h={W} canvas={c.bottom} version={v} inside={inside} position={[0, -H / 2, 0]} rotation={[Math.PI / 2, 0, 0]} />
      {/* Top / lid hinges along the back-top edge */}
      <group ref={lidRef} position={[0, H / 2, -W / 2]}>
        <Face w={L} h={W} canvas={c.top} version={v} inside={inside} position={[0, 0.0005, W / 2]} rotation={[-Math.PI / 2, 0, 0]} />
      </group>
      {!lidOpen && (
        <lineSegments geometry={edges}>
          <lineBasicMaterial color="#100904" transparent opacity={0.35} />
        </lineSegments>
      )}
    </group>
  );
}
