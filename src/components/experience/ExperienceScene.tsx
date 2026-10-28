"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html, Line } from "@react-three/drei";
import * as THREE from "three";
import { BoxModel } from "@/components/three/BoxModel";
import { brandMarkReady, SHOWCASE_DIMS, showcaseCanvases } from "@/components/three/showcase";
import { precisionMatCanvas, woodCanvas } from "./surfaces";
import { hasWebGL } from "@/design/hooks";
import { FoldingCarton } from "./FoldingCarton";
import { CorrugatedSample, DimensionAnnotations } from "./Corrugated";
import { FinishLab } from "./FinishLab";
import { Environment, Lightformer } from "@react-three/drei";
import { clamp, timeline } from "./scroll";
import { backgroundAt, cameraAt, dimsAt, familyAt, groundAt, matAt, MM, sceneAt } from "./story";

function Rig() {
  const { camera, scene, size } = useThree();
  const look = useMemo(() => new THREE.Vector3(), []);
  const bg = useMemo(() => new THREE.Color(), []);
  useFrame(() => {
    const s = timeline.screens;
    const pose = cameraAt(s);
    look.set(...pose.target);
    // poses are framed for wide screens; pull back on narrow/portrait viewports
    const k = clamp(1.4 / (size.width / size.height), 1, 2.7);
    camera.position.set(look.x + (pose.pos[0] - look.x) * k, look.y + (pose.pos[1] - look.y) * k, look.z + (pose.pos[2] - look.z) * k);
    camera.lookAt(look);
    const [r, g, b] = backgroundAt(s);
    bg.setRGB(r / 255, g / 255, b / 255, THREE.SRGBColorSpace);
    scene.background = bg;
  });
  return null;
}

/** Cutting mat and orange measurement brackets for the opening shot. */
function MeasuredMat() {
  const tex = (c: HTMLCanvasElement) => {
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  };
  const mat = useMemo(() => tex(precisionMatCanvas(900, 600)), []);
  const wood = useMemo(() => tex(woodCanvas()), []);
  const woodMat = useRef<THREE.MeshStandardMaterial>(null);
  const group = useRef<THREE.Group>(null);
  const plane = useRef<THREE.MeshStandardMaterial>(null);
  const [labels, setLabels] = useState({ l: 300, w: 200, visible: true });

  useFrame(() => {
    const s = timeline.screens;
    const m = matAt(s);
    if (plane.current) plane.current.opacity = m;
    if (woodMat.current) woodMat.current.opacity = m;
    if (group.current) group.current.visible = m > 0.01;
    const d = dimsAt(s);
    const visible = m > 0.35;
    if (d.length !== labels.l || d.width !== labels.w || visible !== labels.visible) setLabels({ l: d.length, w: d.width, visible });
  });

  const H = (dimsAt(0).height * MM) / 2;
  const L = labels.l * MM;
  const W = labels.w * MM;
  const y = -H + 0.01;
  const pad = 0.25;
  const orange = "#EA5B32";
  return (
    <group ref={group}>
      {/* wood table */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -H - 0.004, 0]} receiveShadow>
        <planeGeometry args={[24, 12]} />
        <meshStandardMaterial ref={woodMat} map={wood} roughness={0.7} transparent />
      </mesh>
      {/* 900 × 600 mm cutting mat, slightly rotated, offset like a real desk */}
      <mesh rotation={[-Math.PI / 2, 0, 0.05]} position={[0.9, -H, -0.35]} receiveShadow>
        <planeGeometry args={[900 * MM, 600 * MM]} />
        <meshStandardMaterial ref={plane} map={mat} roughness={0.92} transparent />
      </mesh>
      {labels.visible && (
        <>
          {/* length bracket (front edge) */}
          <Line points={[[-L / 2, y, W / 2 + pad], [L / 2, y, W / 2 + pad]]} color={orange} lineWidth={1.5} />
          <Line points={[[-L / 2, y, W / 2 + pad - 0.08], [-L / 2, y, W / 2 + pad + 0.08]]} color={orange} lineWidth={1.5} />
          <Line points={[[L / 2, y, W / 2 + pad - 0.08], [L / 2, y, W / 2 + pad + 0.08]]} color={orange} lineWidth={1.5} />
          {/* width bracket (right edge) */}
          <Line points={[[L / 2 + pad, y, -W / 2], [L / 2 + pad, y, W / 2]]} color={orange} lineWidth={1.5} />
          <Line points={[[L / 2 + pad - 0.08, y, -W / 2], [L / 2 + pad + 0.08, y, -W / 2]]} color={orange} lineWidth={1.5} />
          <Line points={[[L / 2 + pad - 0.08, y, W / 2], [L / 2 + pad + 0.08, y, W / 2]]} color={orange} lineWidth={1.5} />
          <Html position={[0, y, W / 2 + pad + 0.28]} center zIndexRange={[5, 0]}>
            <span className="num rounded-full bg-[#EA5B32] px-2 py-0.5 text-[11px] font-medium whitespace-nowrap text-cream">{labels.l} mm</span>
          </Html>
          <Html position={[L / 2 + pad + 0.5, y, 0]} center zIndexRange={[5, 0]}>
            <span className="num rounded-full bg-[#EA5B32] px-2 py-0.5 text-[11px] font-medium whitespace-nowrap text-cream">{labels.w} mm</span>
          </Html>
        </>
      )}
    </group>
  );
}

/** The rest of the range joins the hero carton: mailer, product carton, pizza box, bag and tray. */
const FAMILY = [
  { kind: "mailer", x: -3.7, z: 0.9, size: 2.0 },
  { kind: "rte", x: 3.5, z: 0.7, size: 1.7 },
  { kind: "pizza", x: -2.3, z: -2.2, size: 2.1 },
  { kind: "bag", x: 2.4, z: -2.3, size: 2.0 },
  { kind: "tray", x: 0.2, z: -3.6, size: 1.8 },
] as const;

function Family() {
  const sets = useMemo(() => FAMILY.map((m) => showcaseCanvases(m.kind)), []);
  const refs = useRef<(THREE.Group | null)[]>([]);
  useFrame((state) => {
    const p = familyAt(timeline.screens);
    FAMILY.forEach((m, i) => {
      const r = refs.current[i];
      if (!r) return;
      r.visible = p > 0.01;
      // staggered entrance, rising from below the floor
      const local = Math.min(1, Math.max(0, p * 1.4 - i * 0.08));
      r.position.set(m.x * (0.6 + 0.4 * local), groundAt(timeline.screens) - (1 - local) * 3, m.z);
      r.rotation.y = state.clock.elapsedTime * 0.1 * (i % 2 ? 1 : -1) + i * 0.9;
      r.scale.setScalar(Math.max(0.001, local));
    });
  });
  return (
    <>
      {FAMILY.map((m, i) => {
        const spec = SHOWCASE_DIMS[m.kind];
        return (
          <group key={m.kind} ref={(g) => void (refs.current[i] = g)}>
            <BoxModel dims={spec.dims} boxStyle={spec.style} canvases={sets[i]} textureVersion={1} materialColor={spec.material} size={m.size} />
          </group>
        );
      })}
    </>
  );
}

function Ground() {
  const shadow = useRef<THREE.ShadowMaterial>(null);
  const plane = useRef<THREE.Mesh>(null);
  useFrame(() => {
    if (plane.current) plane.current.position.y = groundAt(timeline.screens) - 0.002;
    if (shadow.current) shadow.current.opacity = 0.5 * (1 - matAt(timeline.screens)) * sceneAt(timeline.screens);
  });
  return (
    <mesh ref={plane} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[60, 60]} />
      <shadowMaterial ref={shadow} transparent opacity={0} />
    </mesh>
  );
}

function Lights() {
  return (
    <>
      <ambientLight intensity={0.22} color="#ffe2c4" />
      <directionalLight position={[4, 9, 5]} intensity={1.7} color="#ffe6c8" castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-9} shadow-camera-right={9} shadow-camera-top={9} shadow-camera-bottom={-9} shadow-bias={-0.0004} shadow-normalBias={0.03} />
      <directionalLight position={[6, 4, -6]} intensity={2.4} color="#ff9a52" />
      <pointLight position={[-6, 3, 4]} intensity={8} distance={18} color="#7a4a26" />
    </>
  );
}

function SceneFade({ host }: { host: React.RefObject<HTMLDivElement | null> }) {
  useFrame(() => {
    if (host.current) host.current.style.opacity = String(clamp(sceneAt(timeline.screens)));
  });
  return null;
}

export default function ExperienceScene() {
  const host = useRef<HTMLDivElement>(null);
  const [ok, setOk] = useState<boolean | null>(null);
  // wait for the brand mark so the printed artwork is painted with the real logo
  useEffect(() => {
    brandMarkReady().then(() => setOk(hasWebGL()));
  }, []);
  if (ok === false) return null;
  return (
    <div ref={host} aria-hidden className="pointer-events-none fixed inset-0 z-0">
      {ok && (
        <Canvas shadows dpr={[1, 1.6]} camera={{ position: [0, 7.2, 0.01], fov: 32, near: 0.1, far: 80 }} gl={{ antialias: true }}>
          <Suspense fallback={null}>
            <Rig />
            <Lights />
            <MeasuredMat />
            <FoldingCarton>
              <DimensionAnnotations />
            </FoldingCarton>
            <CorrugatedSample />
            <FinishLab />
            <Environment resolution={128}>
              {/* broad softbox behind the camera: metallic foil needs something bright to mirror */}
              <Lightformer intensity={2.4} color="#fff0dc" position={[0, 1, 7]} scale={[10, 4, 1]} />
              <Lightformer intensity={1.6} color="#ffe2c4" position={[0, 4, 3]} scale={[6, 2, 1]} />
              <Lightformer intensity={1.0} color="#ff9a52" position={[5, 2, -3]} scale={[3, 3, 1]} />
            </Environment>
            <Family />
            <Ground />
            <SceneFade host={host} />
          </Suspense>
        </Canvas>
      )}
    </div>
  );
}
