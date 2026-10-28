"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { BoxModel } from "./BoxModel";
import { cupCanvas, SHOWCASE_DIMS, showcaseCanvases, type ShowcaseKind } from "./showcase";
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

function Product({ kind, lidOpen }: { kind: ShowcaseKind; lidOpen: boolean }) {
  const canvases = useMemo(() => (kind === "cup" ? null : showcaseCanvases(kind)), [kind]);
  if (kind === "cup") return <Cup />;
  const spec = SHOWCASE_DIMS[kind];
  return <BoxModel dims={spec.dims} boxStyle={spec.style} canvases={canvases} textureVersion={1} materialColor={spec.material} lidOpen={lidOpen} size={2.5} />;
}

export default function ProductStage({ kind, className }: { kind: ShowcaseKind; className?: string }) {
  const host = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);
  const [gl, setGl] = useState<boolean | null>(null);
  const [lidOpen, setLidOpen] = useState(false);

  useEffect(() => setGl(hasWebGL()), []);
  useEffect(() => {
    const el = host.current;
    if (!el) return;
    // Only keep a WebGL context alive while the stage is near the viewport
    const io = new IntersectionObserver(([e]) => setNear(e.isIntersecting), { rootMargin: "300px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const dims = kind === "cup" ? null : SHOWCASE_DIMS[kind].dims;
  // the mailer opens its lid, so it needs headroom above the box
  const targetY = dims ? (2.5 * dims.height) / Math.max(dims.length, dims.width, dims.height) / 2 + (kind === "mailer" ? 0.55 : 0) : 1.0;

  return (
    <div ref={host} className={className}>
      {gl === false ? null : near ? (
        <Canvas shadows dpr={[1, 1.75]} camera={{ position: TOP, fov: 30 }} gl={{ antialias: true, alpha: true }}>
          <Suspense fallback={null}>
            <DarkroomLights />
            <Product kind={kind} lidOpen={lidOpen} />
            <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, -0.001, 0]}>
              <planeGeometry args={[30, 30]} />
              <shadowMaterial opacity={0.55} />
            </mesh>
            <ScrollRig
              host={host}
              targetY={targetY}
              onProgress={(p) => {
                const open = kind === "mailer" && p > 0.92;
                if (open !== lidOpen) setLidOpen(open);
              }}
            />
          </Suspense>
        </Canvas>
      ) : null}
    </div>
  );
}
