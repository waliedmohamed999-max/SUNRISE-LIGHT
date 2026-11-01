"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html, Line } from "@react-three/drei";
import * as THREE from "three";
import { BoxModel } from "@/components/three/BoxModel";
import { brandedCanvases, brandMarkReady } from "@/components/three/showcase";
import type { BoxStyle, Dimensions } from "@/packaging/types";
import { liftWhite } from "./lift";
import { hasWebGL } from "@/design/hooks";
import { FoldingCarton } from "./FoldingCarton";
import { CorrugatedSample, DimensionAnnotations } from "./Corrugated";
import { FinishLab } from "./FinishLab";
import { OpeningReel } from "./OpeningReel";
import { PizzaLid } from "./PizzaLid";
import { openingCamera, openingOverlay, openingPullback, resetOpening, skipOpening } from "./opening";
import { Environment, Lightformer } from "@react-three/drei";
import { clamp, lerp, timeline } from "./scroll";
import { backgroundAt, BASE_DIMS, cameraAt, dimsAt, familyAt, groundAt, linesAt, matAt, MM, sceneAt } from "./story";

function Rig() {
  const { camera, scene, size } = useThree();
  const look = useMemo(() => new THREE.Vector3(), []);
  const bg = useMemo(() => new THREE.Color(), []);
  useFrame(() => {
    const s = timeline.screens;
    const aspect = size.width / size.height;
    const pose = openingCamera(cameraAt(s), aspect);
    look.set(...pose.target);
    // poses are framed for wide screens, so narrow viewports pull back: only as far as a single product needs,
    // and all the way only for the shots that must show their full width (the flat blank, the family line-up)
    const fitAll = clamp(1.4 / aspect, 1, 2.7);
    const k = openingPullback(lerp(1 + (fitAll - 1) * 0.42, fitAll, Math.max(linesAt(s), familyAt(s))));
    camera.position.set(look.x + (pose.pos[0] - look.x) * k, look.y + (pose.pos[1] - look.y) * k, look.z + (pose.pos[2] - look.z) * k);
    camera.lookAt(look);
    const [r, g, b] = backgroundAt(s);
    bg.setRGB(r / 255, g / 255, b / 255, THREE.SRGBColorSpace);
    scene.background = bg;
  });
  return null;
}

/** Gold measurement brackets for the opening shot. */
function MeasuredMat() {
  const group = useRef<THREE.Group>(null);
  const [labels, setLabels] = useState({ l: BASE_DIMS.length, w: BASE_DIMS.width, visible: true });

  useFrame(() => {
    const s = timeline.screens;
    const m = matAt(s);
    if (group.current) group.current.visible = m > 0.01;
    const d = dimsAt(s);
    const visible = m > 0.35 && openingOverlay() > 0;
    if (d.length !== labels.l || d.width !== labels.w || visible !== labels.visible) setLabels({ l: d.length, w: d.width, visible });
  });

  const H = (dimsAt(0).height * MM) / 2;
  const L = labels.l * MM;
  const W = labels.w * MM;
  const y = -H + 0.01;
  const pad = 0.25;
  const gold = "#E2BC6B";
  const pill = "num hidden rounded-full sm:inline bg-[#E2BC6B] px-2 py-0.5 text-[11px] font-medium whitespace-nowrap text-[#100904]";
  return (
    <group ref={group}>
      {labels.visible && (
        <>
          {/* length bracket (front edge) */}
          <Line points={[[-L / 2, y, W / 2 + pad], [L / 2, y, W / 2 + pad]]} color={gold} lineWidth={1.5} />
          <Line points={[[-L / 2, y, W / 2 + pad - 0.08], [-L / 2, y, W / 2 + pad + 0.08]]} color={gold} lineWidth={1.5} />
          <Line points={[[L / 2, y, W / 2 + pad - 0.08], [L / 2, y, W / 2 + pad + 0.08]]} color={gold} lineWidth={1.5} />
          {/* width bracket (right edge) */}
          <Line points={[[L / 2 + pad, y, -W / 2], [L / 2 + pad, y, W / 2]]} color={gold} lineWidth={1.5} />
          <Line points={[[L / 2 + pad - 0.08, y, -W / 2], [L / 2 + pad + 0.08, y, -W / 2]]} color={gold} lineWidth={1.5} />
          <Line points={[[L / 2 + pad - 0.08, y, W / 2], [L / 2 + pad + 0.08, y, W / 2]]} color={gold} lineWidth={1.5} />
          <Html position={[0, y, W / 2 + pad + 0.28]} center zIndexRange={[5, 0]}>
            <span className={pill}>{labels.l} mm</span>
          </Html>
          <Html position={[L / 2 + pad + 0.5, y, 0]} center zIndexRange={[5, 0]}>
            <span className={pill}>{labels.w} mm</span>
          </Html>
        </>
      )}
    </group>
  );
}

/** The rest of the range joins the hero carton: cartons, pizza boxes, bags, cups and stickers, all in the house style. */
const FAMILY: { engine: string; style: BoxStyle; dims: Dimensions; x: number; z: number; size: number; turn: number }[] = [
  { engine: "rsc", style: "closed", dims: { length: 400, width: 300, height: 300 }, x: -6.1, z: -2.0, size: 2.5, turn: 0.5 },
  { engine: "pizza", style: "mailer", dims: { length: 330, width: 330, height: 45 }, x: -3.5, z: -3.0, size: 2.4, turn: 0.3 },
  { engine: "mailer", style: "mailer", dims: { length: 300, width: 220, height: 90 }, x: -4.7, z: 0.7, size: 2.0, turn: 0.35 },
  { engine: "sheet", style: "flat", dims: { length: 148, width: 1, height: 210 }, x: -6.4, z: 2.4, size: 1.5, turn: 0.3 },
  { engine: "sheet", style: "disc", dims: { length: 100, width: 1, height: 100 }, x: -3.3, z: 2.9, size: 1.1, turn: 0.2 },
  { engine: "tray", style: "open", dims: { length: 300, width: 200, height: 80 }, x: -0.7, z: 2.7, size: 1.6, turn: 0.15 },
  { engine: "bag", style: "bag", dims: { length: 260, width: 120, height: 330 }, x: 3.3, z: -2.6, size: 2.0, turn: -0.3 },
  { engine: "rte", style: "tuck", dims: { length: 80, width: 60, height: 170 }, x: 6.1, z: -1.9, size: 1.9, turn: -0.45 },
  { engine: "telescope", style: "closed", dims: { length: 240, width: 240, height: 110 }, x: 4.6, z: 0.8, size: 2.0, turn: -0.4 },
  { engine: "cup", style: "cup", dims: { length: 90, width: 60, height: 112 }, x: 6.0, z: 2.0, size: 1.15, turn: -0.2 },
  { engine: "cup", style: "cup", dims: { length: 80, width: 55, height: 90 }, x: 4.5, z: 2.8, size: 0.92, turn: -0.1 },
  { engine: "cup", style: "cup", dims: { length: 62, width: 45, height: 60 }, x: 3.1, z: 3.1, size: 0.68, turn: 0 },
];

function Family() {
  const sets = useMemo(() => FAMILY.map((m) => brandedCanvases(m.dims, m.engine, m.style)), []);
  const refs = useRef<(THREE.Group | null)[]>([]);
  const lifted = useRef(false);
  useFrame((state) => {
    const p = familyAt(timeline.screens);
    if (p > 0.01 && !lifted.current) {
      lifted.current = true;
      for (const r of refs.current) if (r) liftWhite(r, 0.5);
    }
    FAMILY.forEach((m, i) => {
      const r = refs.current[i];
      if (!r) return;
      r.visible = p > 0.01;
      // staggered entrance, rising from below the floor
      const local = Math.min(1, Math.max(0, p * 1.9 - i * 0.07));
      r.position.set(m.x * (0.6 + 0.4 * local), groundAt(timeline.screens) - (1 - local) * 3, m.z);
      // a gentle sway that always keeps the logo towards the camera
      r.rotation.y = m.turn + Math.sin(state.clock.elapsedTime * 0.35 + i) * 0.12;
      r.scale.setScalar(Math.max(0.001, local));
    });
  });
  return (
    <>
      {FAMILY.map((m, i) => (
        <group key={i} ref={(g) => void (refs.current[i] = g)}>
          <BoxModel dims={m.dims} boxStyle={m.style} canvases={sets[i]} textureVersion={1} materialColor="#FBF9F5" size={m.size} />
        </group>
      ))}
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
    // the opening film plays from the top of the page only, and never for reduced-motion visitors
    if (window.scrollY > 60 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) skipOpening();
    else resetOpening();
    brandMarkReady().then(() => {
      const gl = hasWebGL();
      if (!gl) skipOpening();
      setOk(gl);
    });
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
              <PizzaLid />
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
            <OpeningReel />
            <Family />
            <Ground />
            <SceneFade host={host} />
          </Suspense>
        </Canvas>
      )}
    </div>
  );
}
