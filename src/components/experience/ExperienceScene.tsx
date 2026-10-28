"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html, Line } from "@react-three/drei";
import * as THREE from "three";
import { BoxModel } from "@/components/three/BoxModel";
import { Cup } from "@/components/three/ProductStage";
import { SHOWCASE_DIMS, showcaseCanvases } from "@/components/three/showcase";
import { precisionMatCanvas, woodCanvas } from "./surfaces";
import { hasWebGL } from "@/design/hooks";
import { FoldingCarton } from "./FoldingCarton";
import { CorrugatedSample, DimensionAnnotations } from "./Corrugated";
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
  const orange = "#E0601A";
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
            <span className="num rounded-full bg-[#E0601A] px-2 py-0.5 text-[11px] font-medium whitespace-nowrap text-cream">{labels.l} mm</span>
          </Html>
          <Html position={[L / 2 + pad + 0.5, y, 0]} center zIndexRange={[5, 0]}>
            <span className="num rounded-full bg-[#E0601A] px-2 py-0.5 text-[11px] font-medium whitespace-nowrap text-cream">{labels.w} mm</span>
          </Html>
        </>
      )}
    </group>
  );
}

/** Mailer, product carton and cup join the hero carton. */
function Family() {
  const mailer = useMemo(() => showcaseCanvases("mailer"), []);
  const rte = useMemo(() => showcaseCanvases("rte"), []);
  const refs = [useRef<THREE.Group>(null), useRef<THREE.Group>(null), useRef<THREE.Group>(null)];
  const homes: [number, number][] = [
    [-3.4, 0.6],
    [3.3, 0.4],
    [2.1, -2.2],
  ];
  useFrame((state) => {
    const p = familyAt(timeline.screens);
    refs.forEach((r, i) => {
      if (!r.current) return;
      const [x, z] = homes[i];
      r.current.visible = p > 0.01;
      r.current.position.set(x * (0.6 + 0.4 * p), groundAt(timeline.screens) - (1 - p) * 3, z);
      r.current.rotation.y = state.clock.elapsedTime * 0.12 * (i % 2 ? 1 : -1) + i;
      r.current.scale.setScalar(Math.max(0.001, p));
    });
  });
  return (
    <>
      <group ref={refs[0]}>
        <BoxModel dims={SHOWCASE_DIMS.mailer.dims} boxStyle="mailer" canvases={mailer} textureVersion={1} materialColor={SHOWCASE_DIMS.mailer.material} size={2.0} />
      </group>
      <group ref={refs[1]}>
        <BoxModel dims={SHOWCASE_DIMS.rte.dims} boxStyle="tuck" canvases={rte} textureVersion={1} materialColor={SHOWCASE_DIMS.rte.material} size={1.7} />
      </group>
      <group ref={refs[2]} scale={0.8}>
        <Cup />
      </group>
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
  useEffect(() => setOk(hasWebGL()), []);
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
            <Family />
            <Ground />
            <SceneFade host={host} />
          </Suspense>
        </Canvas>
      )}
    </div>
  );
}
