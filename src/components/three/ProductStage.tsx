"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { BoxModel } from "./BoxModel";
import { brandMarkReady, cupCanvas, SHOWCASE_DIMS, showcaseCanvases, stickerSheetCanvas, stickerStripCanvas, type ShowcaseKind } from "./showcase";

/** Stage kinds: the packaging showcase plus the sticker roll & sheet. */
export type StageKind = ShowcaseKind | "stickers";
import { hasWebGL } from "@/design/hooks";
import { DarkroomLights } from "./Lights";

const TOP: [number, number, number] = [0.001, 8.6, 0.4];
const THREE_QUARTER: [number, number, number] = [4.5, 3.3, 5.7];
const ease = (t: number) => 1 - Math.pow(1 - t, 3);

/** Scroll-driven camera: top-down while the section enters, 3/4 once it is in place. */
function ScrollRig({ host, targetY, onProgress }: { host: React.RefObject<HTMLDivElement | null>; targetY: number; onProgress?: (p: number) => void }) {
  const { camera } = useThree();
  const p = useRef(0);
  const from = useMemo(() => new THREE.Vector3(...TOP), []);
  const to = useMemo(() => new THREE.Vector3(...THREE_QUARTER), []);
  useFrame((_, dt) => {
    const el = host.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const vh = window.innerHeight;
    const target = Math.min(1, Math.max(0, (vh - rect.top) / (vh * 0.85)));
    p.current += (target - p.current) * Math.min(1, dt * 4);
    camera.position.lerpVectors(from, to, ease(p.current));
    camera.lookAt(0, targetY, 0);
    onProgress?.(p.current);
  });
  return null;
}

export function Cup() {
  const tex = useMemo(() => {
    const t = new THREE.CanvasTexture(cupCanvas());
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  }, []);
  const profile = useMemo(() => [new THREE.Vector2(0.62, 0), new THREE.Vector2(0.86, 2.0)], []);
  return (
    <group>
      <mesh castShadow>
        <latheGeometry args={[profile, 72]} />
        <meshStandardMaterial map={tex} roughness={0.75} side={THREE.FrontSide} />
      </mesh>
      <mesh>
        <latheGeometry args={[profile, 72]} />
        <meshStandardMaterial color="#E9DCC9" roughness={0.85} side={THREE.BackSide} />
      </mesh>
      <mesh position={[0, 2.0, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.865, 0.03, 12, 72]} />
        <meshStandardMaterial color="#F4EADB" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.62, 48]} />
        <meshStandardMaterial color="#E6DACA" />
      </mesh>
    </group>
  );
}

const canvasTexture = (canvas: HTMLCanvasElement) => {
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
};

/** A roll of printed logo labels, an unrolled strip and a sheet of round stickers on the table. */
export function StickerRoll() {
  const wrap = useMemo(() => canvasTexture(stickerStripCanvas(12)), []);
  const strip = useMemo(() => canvasTexture(stickerStripCanvas(3)), []);
  const sheet = useMemo(() => canvasTexture(stickerSheetCanvas()), []);
  useEffect(() => () => [wrap, strip, sheet].forEach((t) => t.dispose()), [wrap, strip, sheet]);
  const R = 0.95, r = 0.38, H = 0.85;
  return (
    <group position={[0.35, 0, -0.2]}>
      {/* roll: printed outer wrap, cream paper edges, brown cardboard core */}
      <mesh position={[0, H / 2, 0]} castShadow>
        <cylinderGeometry args={[R, R, H, 96, 1, true]} />
        <meshStandardMaterial map={wrap} roughness={0.45} />
      </mesh>
      {[H, 0.001].map((y) => (
        <mesh key={y} position={[0, y, 0]} rotation={[y > 0.01 ? -Math.PI / 2 : Math.PI / 2, 0, 0]}>
          <ringGeometry args={[r, R, 96]} />
          <meshStandardMaterial color="#EFE4D2" roughness={0.9} />
        </mesh>
      ))}
      <mesh position={[0, H / 2, 0]}>
        <cylinderGeometry args={[r, r, H, 48, 1, true]} />
        <meshStandardMaterial color="#9C6E3D" roughness={0.95} side={THREE.BackSide} />
      </mesh>
      {/* unrolled strip running from the roll across the table */}
      <mesh position={[R + 0.75, 0.004, 0.1]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[1.6, H * 0.95]} />
        <meshStandardMaterial map={strip} roughness={0.5} />
      </mesh>
      {/* sticker sheet */}
      <mesh position={[-1.75, 0.006, 0.45]} rotation={[-Math.PI / 2, 0, 0.28]} receiveShadow>
        <planeGeometry args={[1.3, 1.78]} />
        <meshStandardMaterial map={sheet} roughness={0.55} />
      </mesh>
    </group>
  );
}

/** Self-presenting product: fixed 3/4 camera, slow turntable, gentle float. */
function Turntable({ targetY, still, children }: { targetY: number; still: boolean; children: React.ReactNode }) {
  const { camera } = useThree();
  const spin = useRef<THREE.Group>(null);
  useEffect(() => {
    // a little further back than the scroll rig: the open lid sweeps around while turning
    camera.position.set(THREE_QUARTER[0] * 1.2, THREE_QUARTER[1] * 1.2, THREE_QUARTER[2] * 1.2);
    camera.lookAt(0, targetY, 0);
  }, [camera, targetY]);
  useFrame((state, dt) => {
    if (!spin.current || still) return;
    spin.current.rotation.y += dt * 0.32;
    spin.current.position.y = Math.sin(state.clock.elapsedTime * 0.9) * 0.03;
  });
  return (
    <group ref={spin} rotation={[0, -0.5, 0]}>
      {children}
    </group>
  );
}

function Product({ kind, lidOpen }: { kind: StageKind; lidOpen: boolean }) {
  const canvases = useMemo(() => (kind === "cup" || kind === "stickers" ? null : showcaseCanvases(kind)), [kind]);
  if (kind === "cup") return <Cup />;
  if (kind === "stickers") return <StickerRoll />;
  const spec = SHOWCASE_DIMS[kind];
  return <BoxModel dims={spec.dims} boxStyle={spec.style} canvases={canvases} textureVersion={1} materialColor={spec.material} lidOpen={lidOpen} size={2.5} />;
}

/**
 * presenting = the product shows itself: it turns slowly and, if it has a hinged lid, opens and closes on a loop.
 * Otherwise the camera follows the page scroll (top-down → 3/4) and the mailer opens once it is in place.
 */
export default function ProductStage({ kind, className, presenting = false }: { kind: StageKind; className?: string; presenting?: boolean }) {
  const host = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);
  const [gl, setGl] = useState<boolean | null>(null);
  const [lidOpen, setLidOpen] = useState(false);
  const [still, setStill] = useState(false);
  const hinged = kind !== "cup" && kind !== "stickers" && (SHOWCASE_DIMS[kind].style === "mailer" || SHOWCASE_DIMS[kind].style === "tuck");

  useEffect(() => {
    if (!presenting) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setStill(reduce);
    if (!hinged) return;
    if (reduce) {
      setLidOpen(true);
      return;
    }
    // closed (logo on the lid) → open (inside) → closed …
    const first = setTimeout(() => setLidOpen(true), 1600);
    const loop = setInterval(() => setLidOpen((o) => !o), 3400);
    return () => {
      clearTimeout(first);
      clearInterval(loop);
    };
  }, [presenting, hinged]);

  useEffect(() => {
    brandMarkReady().then(() => setGl(hasWebGL()));
  }, []);
  useEffect(() => {
    const el = host.current;
    if (!el) return;
    // Only keep a WebGL context alive while the stage is near the viewport
    const io = new IntersectionObserver(([e]) => setNear(e.isIntersecting), { rootMargin: "300px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const dims = kind === "cup" || kind === "stickers" ? null : SHOWCASE_DIMS[kind].dims;
  // the mailer opens its lid, so it needs headroom above the box
  const targetY = dims ? (2.5 * dims.height) / Math.max(dims.length, dims.width, dims.height) / 2 + (kind === "mailer" ? 0.55 : 0) : kind === "stickers" ? 0.35 : 1.0;

  return (
    <div ref={host} className={className}>
      {gl === false ? null : near ? (
        <Canvas shadows dpr={[1, 1.75]} camera={{ position: TOP, fov: 30 }} gl={{ antialias: true, alpha: true }}>
          <Suspense fallback={null}>
            <DarkroomLights />
            {presenting ? (
              <Turntable targetY={targetY} still={still}>
                <Product kind={kind} lidOpen={lidOpen} />
              </Turntable>
            ) : (
              <Product kind={kind} lidOpen={lidOpen} />
            )}
            <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, -0.006, 0]}>
              <planeGeometry args={[30, 30]} />
              <shadowMaterial opacity={0.55} />
            </mesh>
            {!presenting && (
              <ScrollRig
                host={host}
                targetY={targetY}
                onProgress={(p) => {
                  const open = kind === "mailer" && p > 0.92;
                  if (open !== lidOpen) setLidOpen(open);
                }}
              />
            )}
          </Suspense>
        </Canvas>
      ) : null}
    </div>
  );
}
