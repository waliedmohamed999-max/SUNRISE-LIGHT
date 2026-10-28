"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { OPEN_TOP, type BoxStyle, type Dimensions, type SurfaceKey } from "@/packaging/types";

/** Per-surface finish maps (grayscale): roughness, metalness, bump (128 = flat). */
export type FinishMaps = Partial<Record<SurfaceKey, { rough: HTMLCanvasElement; metal: HTMLCanvasElement; bump: HTMLCanvasElement }>>;

/**
 * Box built from six textured planes so every surface maps 1:1 to its artwork canvas.
 * Orientation conventions are documented in src/packaging/types.ts (SurfaceKey).
 * Units: the longest edge is normalised to `size` scene units.
 */
export interface BoxModelProps {
  dims: Dimensions;
  boxStyle: BoxStyle;
  canvases: Record<SurfaceKey, HTMLCanvasElement> | null;
  /** one number for all faces, or a version per face (only changed faces re-upload) */
  textureVersion: number | Partial<Record<SurfaceKey, number>>;
  materialColor: string;
  lidOpen?: boolean;
  size?: number;
  /** Optional physical finishes (foil, emboss, spot UV) */
  finishMaps?: FinishMaps | null;
  /** Inside colour of the box (defaults to a darker tone of the board) */
  insideColor?: string | null;
  /** Click on a face (studio: selects that face for editing) */
  onFaceClick?: (key: SurfaceKey) => void;
  /** Face to outline as selected */
  selectedFace?: SurfaceKey | null;
}

function Outline({ w, h }: { w: number; h: number }) {
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const x = w / 2, y = h / 2;
    g.setAttribute("position", new THREE.Float32BufferAttribute([-x, -y, 0.003, x, -y, 0.003, x, y, 0.003, -x, y, 0.003], 3));
    return g;
  }, [w, h]);
  useEffect(() => () => geo.dispose(), [geo]);
  return (
    <lineLoop geometry={geo}>
      <lineBasicMaterial color="#EA5B32" linewidth={2} />
    </lineLoop>
  );
}

function useCanvasTexture(canvas: HTMLCanvasElement | undefined, version: number, color = true) {
  const texture = useMemo(() => {
    if (!canvas) return null;
    const t = new THREE.CanvasTexture(canvas);
    if (color) t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  }, [canvas, color]);
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    if (texture) {
      texture.needsUpdate = true;
      invalidate();
    }
  }, [texture, version, invalidate]);
  useEffect(() => () => texture?.dispose(), [texture]);
  return texture;
}

function Face({
  w,
  h,
  canvas,
  finish,
  version,
  inside,
  position,
  rotation,
  faceKey,
  onPick,
  selected,
}: {
  w: number;
  h: number;
  canvas?: HTMLCanvasElement;
  finish?: { rough: HTMLCanvasElement; metal: HTMLCanvasElement; bump: HTMLCanvasElement };
  version: number;
  inside: string;
  position: [number, number, number];
  rotation: [number, number, number];
  faceKey?: SurfaceKey;
  onPick?: (key: SurfaceKey) => void;
  selected?: boolean;
}) {
  const map = useCanvasTexture(canvas, version);
  const roughnessMap = useCanvasTexture(finish?.rough, version, false);
  const metalnessMap = useCanvasTexture(finish?.metal, version, false);
  const bumpMap = useCanvasTexture(finish?.bump, version, false);
  const finished = !!(roughnessMap && metalnessMap);
  return (
    <group position={position} rotation={rotation}>
      <mesh
        castShadow
        receiveShadow
        scale={[w, h, 1]}
        onClick={
          onPick && faceKey
            ? (e) => {
                e.stopPropagation();
                onPick(faceKey);
              }
            : undefined
        }
        onPointerOver={onPick ? () => (document.body.style.cursor = "pointer") : undefined}
        onPointerOut={onPick ? () => (document.body.style.cursor = "") : undefined}
      >
        <planeGeometry args={[1, 1]} />
        <meshStandardMaterial
          key={finished ? "finished" : "plain"}
          map={map ?? undefined}
          color={map ? "#ffffff" : inside}
          roughness={finished ? 1 : 0.82}
          metalness={finished ? 1 : 0}
          roughnessMap={roughnessMap ?? undefined}
          metalnessMap={metalnessMap ?? undefined}
          bumpMap={bumpMap ?? undefined}
          bumpScale={bumpMap ? 0.9 : 0}
          side={THREE.FrontSide}
        />
      </mesh>
      <mesh scale={[w, h, 1]}>
        <planeGeometry args={[1, 1]} />
        <meshStandardMaterial color={inside} roughness={0.95} side={THREE.BackSide} />
      </mesh>
      {selected && <Outline w={w} h={h} />}
    </group>
  );
}

/** Twisted paper handle for carrier bags. */
function Handle({ L, H, z, color }: { L: number; H: number; z: number; color: string }) {
  const geo = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-L * 0.22, H * 0.48, z),
      new THREE.Vector3(-L * 0.2, H * 0.72, z),
      new THREE.Vector3(0, H * 0.84, z),
      new THREE.Vector3(L * 0.2, H * 0.72, z),
      new THREE.Vector3(L * 0.22, H * 0.48, z),
    ]);
    return new THREE.TubeGeometry(curve, 48, Math.max(0.012, L * 0.012), 8, false);
  }, [L, H, z]);
  useEffect(() => () => geo.dispose(), [geo]);
  return (
    <mesh geometry={geo} castShadow>
      <meshStandardMaterial color={color} roughness={0.9} />
    </mesh>
  );
}

export function BoxModel({ dims, boxStyle, canvases, textureVersion, materialColor, lidOpen = false, size = 2.6, finishMaps, insideColor, onFaceClick, selectedFace }: BoxModelProps) {
  const openTop = OPEN_TOP.includes(boxStyle);
  const k = size / Math.max(dims.length, dims.width, dims.height);
  const L = dims.length * k;
  const W = dims.width * k;
  const H = dims.height * k;
  const inside = useMemo(() => insideColor ?? new THREE.Color(materialColor).multiplyScalar(0.82).getStyle(), [materialColor, insideColor]);
  const pick = (k: SurfaceKey) => ({ faceKey: k, onPick: onFaceClick, selected: selectedFace === k });
  const lidRef = useRef<THREE.Group>(null);
  const hinged = boxStyle === "mailer" || boxStyle === "tuck";

  const invalidate = useThree((s) => s.invalidate);
  // on-demand rendering: kick a frame when the lid state changes, keep requesting until it settles
  useEffect(() => invalidate(), [lidOpen, invalidate]);
  useFrame((state, dt) => {
    if (!lidRef.current) return;
    const target = hinged && lidOpen ? -Math.PI * 0.62 : 0;
    const cur = lidRef.current.rotation.x;
    if (Math.abs(target - cur) < 0.0005) return;
    lidRef.current.rotation.x = cur + (target - cur) * Math.min(1, dt * 6);
    state.invalidate();
  });

  const edges = useMemo(() => new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1)), []);
  useEffect(() => () => edges.dispose(), [edges]);

  const c = canvases ?? ({} as Record<SurfaceKey, HTMLCanvasElement>);
  const fm = finishMaps ?? {};
  const v = (k: SurfaceKey) => (typeof textureVersion === "number" ? textureVersion : (textureVersion[k] ?? 0));

  return (
    <group position={[0, H / 2, 0]}>
      <Face w={L} h={H} canvas={c.front} finish={fm.front} version={v("front")} inside={inside} position={[0, 0, W / 2]} rotation={[0, 0, 0]} {...pick("front")} />
      <Face w={L} h={H} canvas={c.back} finish={fm.back} version={v("back")} inside={inside} position={[0, 0, -W / 2]} rotation={[0, Math.PI, 0]} {...pick("back")} />
      <Face w={W} h={H} canvas={c.right} finish={fm.right} version={v("right")} inside={inside} position={[L / 2, 0, 0]} rotation={[0, Math.PI / 2, 0]} {...pick("right")} />
      <Face w={W} h={H} canvas={c.left} finish={fm.left} version={v("left")} inside={inside} position={[-L / 2, 0, 0]} rotation={[0, -Math.PI / 2, 0]} {...pick("left")} />
      <Face w={L} h={W} canvas={c.bottom} finish={fm.bottom} version={v("bottom")} inside={inside} position={[0, -H / 2, 0]} rotation={[Math.PI / 2, 0, 0]} {...pick("bottom")} />
      {openTop ? (
        boxStyle === "bag" && (
          <>
            <Handle L={L} H={H} z={W / 2 - 0.002} color={materialColor} />
            <Handle L={L} H={H} z={-W / 2 + 0.002} color={materialColor} />
          </>
        )
      ) : (
        /* Top / lid hinges along the back-top edge */
        <group ref={lidRef} position={[0, H / 2, -W / 2]}>
          <Face w={L} h={W} canvas={c.top} finish={fm.top} version={v("top")} inside={inside} position={[0, 0.0005, W / 2]} rotation={[-Math.PI / 2, 0, 0]} {...pick("top")} />
        </group>
      )}
      {!lidOpen && !openTop && (
        <lineSegments geometry={edges} scale={[L, H, W]}>
          <lineBasicMaterial color="#100904" transparent opacity={0.35} />
        </lineSegments>
      )}
    </group>
  );
}
