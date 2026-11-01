"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { OPEN_TOP, type BoxStyle, type Dimensions, type SurfaceKey } from "@/packaging/types";
import { RIBBON_COLOR } from "@/design/finishing";

/** Per-surface finish maps (grayscale): roughness, metalness, bump (128 = flat). */
export type FinishMaps = Partial<Record<SurfaceKey, { rough: HTMLCanvasElement; metal: HTMLCanvasElement; bump: HTMLCanvasElement }>>;

/**
 * Box built from six textured planes so every surface maps 1:1 to its artwork canvas.
 * Orientation conventions are documented in src/packaging/types.ts (SurfaceKey).
 * Units: the longest edge is normalised to `size` scene units.
 */
/** How each structure opens: hinged lid, carton flaps, lid lifted off the base, or a drawer sliding out of its sleeve. */
export type BoxOpening = "hinge" | "flaps" | "lift" | "slide";

export interface BoxModelProps {
  dims: Dimensions;
  boxStyle: BoxStyle;
  canvases: Record<SurfaceKey, HTMLCanvasElement> | null;
  /** one number for all faces, or a version per face (only changed faces re-upload) */
  textureVersion: number | Partial<Record<SurfaceKey, number>>;
  materialColor: string;
  lidOpen?: boolean;
  /** How the box opens; without it a hinged style swings its lid and a closed one has flaps */
  opening?: BoxOpening | null;
  size?: number;
  /** Optional physical finishes (foil, emboss, spot UV) */
  finishMaps?: FinishMaps | null;
  /** Inside colour of the box (defaults to a darker tone of the board) */
  insideColor?: string | null;
  /** Click on a face (studio: selects that face for editing) */
  onFaceClick?: (key: SurfaceKey) => void;
  /** Face to outline as selected */
  selectedFace?: SurfaceKey | null;
  /** Order add-ons with a 3D effect (ribbon handles, satin bow, foam insert, partitions) */
  addons?: string[];
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
  uv = [0, 0, 1, 1],
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
  /** Part of the artwork this face shows (u0, v0, u1, v1): a carton flap carries half of the lid's artwork */
  uv?: [number, number, number, number];
}) {
  const [u0, v0, u1, v1] = uv;
  const plane = useMemo(() => {
    const g = new THREE.PlaneGeometry(1, 1);
    g.setAttribute("uv", new THREE.Float32BufferAttribute([u0, v1, u1, v1, u0, v0, u1, v0], 2));
    return g;
  }, [u0, v0, u1, v1]);
  useEffect(() => () => plane.dispose(), [plane]);
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
        geometry={plane}
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
      <mesh geometry={plane} scale={[w, h, 1]}>
        <meshStandardMaterial color={inside} roughness={0.95} side={THREE.BackSide} />
      </mesh>
      {selected && <Outline w={w} h={h} />}
    </group>
  );
}

/** Carrier bag handle: twisted paper, or a satin ribbon. */
function Handle({ L, H, z, color, ribbon }: { L: number; H: number; z: number; color: string; ribbon?: boolean }) {
  const geo = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-L * 0.22, H * 0.48, z),
      new THREE.Vector3(-L * 0.2, H * 0.72, z),
      new THREE.Vector3(0, H * 0.84, z),
      new THREE.Vector3(L * 0.2, H * 0.72, z),
      new THREE.Vector3(L * 0.22, H * 0.48, z),
    ]);
    return new THREE.TubeGeometry(curve, 48, Math.max(0.012, L * (ribbon ? 0.016 : 0.012)), ribbon ? 4 : 8, false);
  }, [L, H, z, ribbon]);
  useEffect(() => () => geo.dispose(), [geo]);
  return (
    <mesh geometry={geo} castShadow>
      <meshStandardMaterial color={ribbon ? RIBBON_COLOR : color} roughness={ribbon ? 0.35 : 0.9} />
    </mesh>
  );
}

/** Satin bow sitting on the lid (drawn with the ribbon band on the faces). */
function Bow({ L, W }: { L: number; W: number }) {
  const r = Math.min(L, W) * 0.12;
  return (
    <group position={[0, 0.002, W / 2]}>
      {[-1, 1].map((d) => (
        <mesh key={d} position={[d * r * 0.9, r * 0.35, 0]} rotation={[0, 0, d * 0.35]} scale={[1, 0.62, 0.5]} castShadow>
          <torusGeometry args={[r, r * 0.22, 10, 32]} />
          <meshStandardMaterial color={RIBBON_COLOR} roughness={0.35} />
        </mesh>
      ))}
      <mesh position={[0, r * 0.2, 0]} castShadow>
        <sphereGeometry args={[r * 0.3, 16, 12]} />
        <meshStandardMaterial color={RIBBON_COLOR} roughness={0.35} />
      </mesh>
    </group>
  );
}

/** Inside fittings: a foam bed with a cut-out, or cross partitions. */
function Insert({ L, W, H, kind, color }: { L: number; W: number; H: number; kind: "foam" | "partitions"; color: string }) {
  if (kind === "foam") {
    const t = H * 0.35;
    return (
      <group position={[0, H / 2 - t / 2 - H * 0.04, 0]}>
        <mesh receiveShadow>
          <boxGeometry args={[L * 0.985, t, W * 0.985]} />
          <meshStandardMaterial color="#2B2C31" roughness={1} />
        </mesh>
        <mesh position={[0, t / 2 + 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[L * 0.55, W * 0.5]} />
          <meshStandardMaterial color="#121216" roughness={1} />
        </mesh>
      </group>
    );
  }
  const h = H * 0.92;
  return (
    <group position={[0, -H / 2 + h / 2, 0]}>
      <mesh>
        <boxGeometry args={[L * 0.985, h, 0.006]} />
        <meshStandardMaterial color={color} roughness={0.9} />
      </mesh>
      <mesh>
        <boxGeometry args={[0.006, h, W * 0.985]} />
        <meshStandardMaterial color={color} roughness={0.9} />
      </mesh>
    </group>
  );
}

/** Tapered paper cup: the front canvas wraps around the wall (u = around, v = bottom → mouth). */
function CupBody({ dims, canvases, textureVersion, finishMaps, insideColor, materialColor, size = 2.6, onFaceClick, selectedFace }: BoxModelProps) {
  const k = size / Math.max(dims.length, dims.height);
  const R = (dims.length / 2) * k;
  const r = (dims.width / 2) * k;
  const H = dims.height * k;
  const v = typeof textureVersion === "number" ? textureVersion : (textureVersion.front ?? 0);
  const map = useCanvasTexture(canvases?.front, v);
  const fm = finishMaps?.front;
  const rough = useCanvasTexture(fm?.rough, v, false);
  const metal = useCanvasTexture(fm?.metal, v, false);
  const bump = useCanvasTexture(fm?.bump, v, false);
  const finished = !!(rough && metal);
  // the lathe seam (u = 0) starts at +z; a half turn brings the middle of the artwork (u = 0.5) to the front
  const profile = useMemo(() => [new THREE.Vector2(r, 0), new THREE.Vector2(R, H)], [r, R, H]);
  const inside = insideColor ?? "#EFE6D8";
  return (
    <group>
      <mesh
        castShadow
        rotation={[0, Math.PI, 0]}
        onClick={onFaceClick ? (e) => (e.stopPropagation(), onFaceClick("front")) : undefined}
        onPointerOver={onFaceClick ? () => (document.body.style.cursor = "pointer") : undefined}
        onPointerOut={onFaceClick ? () => (document.body.style.cursor = "") : undefined}
      >
        <latheGeometry args={[profile, 96]} />
        <meshStandardMaterial
          key={finished ? "finished" : "plain"}
          map={map ?? undefined}
          color={map ? "#ffffff" : materialColor}
          roughness={finished ? 1 : 0.7}
          metalness={finished ? 1 : 0}
          roughnessMap={rough ?? undefined}
          metalnessMap={metal ?? undefined}
          bumpMap={bump ?? undefined}
          bumpScale={bump ? 0.9 : 0}
        />
      </mesh>
      <mesh rotation={[0, Math.PI, 0]}>
        <latheGeometry args={[profile, 96]} />
        <meshStandardMaterial color={inside} roughness={0.85} side={THREE.BackSide} />
      </mesh>
      {/* rolled rim and the recessed base */}
      <mesh position={[0, H, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[R, Math.max(0.012, size * 0.006), 12, 96]} />
        <meshStandardMaterial color={inside} roughness={0.6} />
      </mesh>
      <mesh position={[0, H * 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[r + (R - r) * 0.04, 64]} />
        <meshStandardMaterial color={inside} roughness={0.9} />
      </mesh>
      {/* the underside, so the cup is closed when it is seen from below */}
      <mesh position={[0, 0.002, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <circleGeometry args={[r, 64]} />
        <meshStandardMaterial color={materialColor} roughness={0.8} />
      </mesh>
      {selectedFace === "front" && (
        <mesh position={[0, H, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[R * 1.01, Math.max(0.008, size * 0.004), 8, 96]} />
          <meshBasicMaterial color="#EA5B32" />
        </mesh>
      )}
    </group>
  );
}

/** Flat print standing upright (sticker sheet, wrapping paper) or a round die-cut sticker ("disc"). */
function FlatBody({ dims, boxStyle, canvases, textureVersion, materialColor, size = 2.6, onFaceClick, selectedFace }: BoxModelProps) {
  const round = boxStyle === "disc";
  // a disc reads larger than a sheet of the same height, so it gets a little less of the frame
  const k = (round ? size * 0.8 : size) / Math.max(dims.length, round ? dims.length : dims.height);
  const L = dims.length * k;
  const H = round ? L : dims.height * k;
  const T = Math.max(0.006, size * 0.004);
  const v = typeof textureVersion === "number" ? textureVersion : (textureVersion.front ?? 0);
  const map = useCanvasTexture(canvases?.front, v);
  const pick = onFaceClick ? { onClick: (e: { stopPropagation: () => void }) => (e.stopPropagation(), onFaceClick("front")) } : {};
  return (
    <group position={[0, H / 2 + 0.01, 0]}>
      {round ? (
        <mesh castShadow rotation={[Math.PI / 2, Math.PI / 2, 0]} {...pick}>
          <cylinderGeometry args={[L / 2, L / 2, T, 96]} />
          {/* side, top cap (front), bottom cap (back) */}
          <meshStandardMaterial attach="material-0" color="#F4EFE6" roughness={0.6} />
          <meshStandardMaterial attach="material-1" map={map ?? undefined} color={map ? "#ffffff" : materialColor} roughness={0.45} />
          <meshStandardMaterial attach="material-2" color="#FAF8F4" roughness={0.8} />
        </mesh>
      ) : (
        <mesh castShadow {...pick}>
          <boxGeometry args={[L, H, T]} />
          <meshStandardMaterial attach="material-0" color="#F4EFE6" />
          <meshStandardMaterial attach="material-1" color="#F4EFE6" />
          <meshStandardMaterial attach="material-2" color="#F4EFE6" />
          <meshStandardMaterial attach="material-3" color="#F4EFE6" />
          <meshStandardMaterial attach="material-4" map={map ?? undefined} color={map ? "#ffffff" : materialColor} roughness={0.5} />
          <meshStandardMaterial attach="material-5" color="#FAF8F4" roughness={0.8} />
        </mesh>
      )}
      {selectedFace === "front" && !round && <Outline w={L} h={H} />}
    </group>
  );
}

/** Rendered height of the model in scene units, matching each body's own scaling (used to aim the camera). */
export function modelHeight(dims: BoxModelProps["dims"], boxStyle: BoxModelProps["boxStyle"], size = 2.6) {
  if (boxStyle === "disc") return size * 0.8;
  if (boxStyle === "flat") return (size * dims.height) / Math.max(dims.length, dims.height);
  if (boxStyle === "cup") return (size * dims.height) / Math.max(dims.length, dims.height);
  return (size * dims.height) / Math.max(dims.length, dims.width, dims.height);
}

export function BoxModel(props: BoxModelProps) {
  if (props.boxStyle === "cup") return <CupBody {...props} />;
  if (props.boxStyle === "flat" || props.boxStyle === "disc") return <FlatBody {...props} />;
  return <BoxBody {...props} />;
}

// folded right back, so the flaps never stand between the camera and what is inside
const FLAP_ANGLE = Math.PI * 0.9;

/** The inner tray of a drawer box, drawn from its end panel back into the sleeve. */
function DrawerTray({ L, W, H, color }: { L: number; W: number; H: number; color: string }) {
  const wall = H * 0.86;
  const material = <meshStandardMaterial color={color} roughness={0.85} side={THREE.DoubleSide} />;
  return (
    <group position={[L / 2, -H / 2 + wall / 2 + 0.004, 0]}>
      <mesh position={[-L * 0.49, -wall / 2, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[L * 0.98, W * 0.96]} />
        {material}
      </mesh>
      {[1, -1].map((side) => (
        <mesh key={side} position={[-L * 0.49, 0, (side * W * 0.96) / 2]}>
          <planeGeometry args={[L * 0.98, wall]} />
          {material}
        </mesh>
      ))}
      <mesh position={[-L * 0.98, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[W * 0.96, wall]} />
        {material}
      </mesh>
    </group>
  );
}

function BoxBody({ dims, boxStyle, canvases, textureVersion, materialColor, lidOpen = false, opening, size = 2.6, finishMaps, insideColor, onFaceClick, selectedFace, addons = [] }: BoxModelProps) {
  const openTop = OPEN_TOP.includes(boxStyle);
  const k = size / Math.max(dims.length, dims.width, dims.height);
  const L = dims.length * k;
  const W = dims.width * k;
  const H = dims.height * k;
  const inside = useMemo(() => insideColor ?? new THREE.Color(materialColor).multiplyScalar(0.82).getStyle(), [materialColor, insideColor]);
  const pick = (k: SurfaceKey) => ({ faceKey: k, onPick: onFaceClick, selected: selectedFace === k });
  const lidRef = useRef<THREE.Group>(null);
  const skirtRef = useRef<THREE.Group>(null);
  const slideRef = useRef<THREE.Group>(null);
  const flapRefs = useRef<(THREE.Group | null)[]>([]);
  const progress = useRef(0);
  const fitting = addons.includes("foam-insert") ? ("foam" as const) : addons.includes("inserts") ? ("partitions" as const) : null;
  const kind: BoxOpening = opening ?? (boxStyle === "mailer" || boxStyle === "tuck" ? "hinge" : "flaps");

  const invalidate = useThree((s) => s.invalidate);
  // on-demand rendering: kick a frame when the lid state changes, keep requesting until it settles
  useEffect(() => invalidate(), [lidOpen, invalidate]);
  useFrame((state, dt) => {
    if (openTop) return;
    const target = lidOpen ? 1 : 0;
    if (Math.abs(target - progress.current) < 0.0005) return;
    const p = (progress.current += (target - progress.current) * Math.min(1, dt * 5));
    const lid = lidRef.current;
    if (kind === "hinge" && lid) lid.rotation.x = -Math.PI * 0.62 * p;
    if (kind === "lift" && lid) {
      lid.position.set(p * L * 0.1, H / 2 + p * H * 0.8, -W / 2);
      lid.rotation.z = -0.1 * p;
      if (skirtRef.current) skirtRef.current.visible = p > 0.01;
    }
    if (kind === "slide" && slideRef.current) slideRef.current.position.x = p * L * 0.45;
    if (kind === "flaps") {
      // the long flaps fold back first, then the short ones under them
      const long = Math.min(1, p / 0.6) * FLAP_ANGLE;
      const short = Math.max(0, (p - 0.35) / 0.65) * FLAP_ANGLE;
      const [front, back, left, right] = flapRefs.current;
      if (front) front.rotation.x = long;
      if (back) back.rotation.x = -long;
      if (left) left.rotation.z = short;
      if (right) right.rotation.z = -short;
    }
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
      {/* a drawer's end panel pulls out with the tray behind it */}
      <group ref={slideRef}>
        <Face w={W} h={H} canvas={c.right} finish={fm.right} version={v("right")} inside={inside} position={[L / 2, 0, 0]} rotation={[0, Math.PI / 2, 0]} {...pick("right")} />
        {kind === "slide" && !openTop && <DrawerTray L={L} W={W} H={H} color={inside} />}
        {kind === "slide" && !openTop && fitting && (
          <group scale={[0.96, 0.9, 0.94]} position={[-L * 0.01, -H * 0.04, 0]}>
            <Insert L={L} W={W} H={H} kind={fitting} color={inside} />
          </group>
        )}
      </group>
      <Face w={W} h={H} canvas={c.left} finish={fm.left} version={v("left")} inside={inside} position={[-L / 2, 0, 0]} rotation={[0, -Math.PI / 2, 0]} {...pick("left")} />
      <Face w={L} h={W} canvas={c.bottom} finish={fm.bottom} version={v("bottom")} inside={inside} position={[0, -H / 2, 0]} rotation={[Math.PI / 2, 0, 0]} {...pick("bottom")} />
      {openTop ? (
        boxStyle === "bag" && (
          <>
            <Handle L={L} H={H} z={W / 2 - 0.002} color={materialColor} ribbon={addons.includes("ribbon-handles")} />
            <Handle L={L} H={H} z={-W / 2 + 0.002} color={materialColor} ribbon={addons.includes("ribbon-handles")} />
          </>
        )
      ) : kind === "flaps" ? (
        <>
          {/* the two long flaps meet along the middle and share the top artwork */}
          <group ref={(g) => void (flapRefs.current[0] = g)} position={[0, H / 2, W / 2]}>
            <Face w={L} h={W / 2} uv={[0, 0, 1, 0.5]} canvas={c.top} finish={fm.top} version={v("top")} inside={inside} position={[0, 0.0005, -W / 4]} rotation={[-Math.PI / 2, 0, 0]} {...pick("top")} />
          </group>
          <group ref={(g) => void (flapRefs.current[1] = g)} position={[0, H / 2, -W / 2]}>
            <Face w={L} h={W / 2} uv={[0, 0.5, 1, 1]} canvas={c.top} finish={fm.top} version={v("top")} inside={inside} position={[0, 0.0005, W / 4]} rotation={[-Math.PI / 2, 0, 0]} {...pick("top")} />
          </group>
          {/* the short flaps sit underneath */}
          {[-1, 1].map((side, i) => {
            const depth = Math.min(W, L) / 2;
            return (
              <group key={side} ref={(g) => void (flapRefs.current[2 + i] = g)} position={[(side * L) / 2, H / 2 - 0.003, 0]}>
                <mesh position={[(-side * depth) / 2, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                  <planeGeometry args={[depth, W]} />
                  <meshStandardMaterial color={inside} roughness={0.9} side={THREE.DoubleSide} />
                </mesh>
              </group>
            );
          })}
          {!lidOpen && addons.includes("satin-ribbon") && (
            <group position={[0, H / 2, -W / 2]}>
              <Bow L={L} W={W} />
            </group>
          )}
          {!lidOpen && (
            <mesh position={[0, H / 2 + 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[L, Math.max(0.004, size * 0.002)]} />
              <meshBasicMaterial color="#100904" transparent opacity={0.3} />
            </mesh>
          )}
        </>
      ) : (
        /* Top / lid hinges along the back-top edge; a lift-off lid carries its rim with it */
        <group ref={lidRef} position={[0, H / 2, -W / 2]}>
          <Face w={L} h={W} canvas={c.top} finish={fm.top} version={v("top")} inside={inside} position={[0, 0.0005, W / 2]} rotation={[-Math.PI / 2, 0, 0]} {...pick("top")} />
          {addons.includes("satin-ribbon") && <Bow L={L} W={W} />}
          {kind === "lift" && (
            <group ref={skirtRef} visible={false} position={[0, -H * 0.15, W / 2]}>
              {[
                { p: [0, 0, W / 2], w: L, r: 0 },
                { p: [0, 0, -W / 2], w: L, r: 0 },
                { p: [L / 2, 0, 0], w: W, r: Math.PI / 2 },
                { p: [-L / 2, 0, 0], w: W, r: Math.PI / 2 },
              ].map((s, i) => (
                <mesh key={i} position={s.p as [number, number, number]} rotation={[0, s.r, 0]}>
                  <planeGeometry args={[s.w, H * 0.3]} />
                  <meshStandardMaterial color={materialColor} roughness={0.8} side={THREE.DoubleSide} />
                </mesh>
              ))}
            </group>
          )}
        </group>
      )}
      {kind !== "slide" && boxStyle !== "bag" && fitting && <Insert L={L} W={W} H={H} kind={fitting} color={inside} />}
      {!lidOpen && kind === "lift" && !openTop && (
        <lineSegments geometry={edges} position={[0, H * 0.2, 0]} scale={[L * 1.002, 0.0001, W * 1.002]}>
          <lineBasicMaterial color="#100904" transparent opacity={0.3} />
        </lineSegments>
      )}
      {!lidOpen && !openTop && (
        <lineSegments geometry={edges} scale={[L, H, W]}>
          <lineBasicMaterial color="#100904" transparent opacity={0.35} />
        </lineSegments>
      )}
    </group>
  );
}
