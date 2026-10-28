"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { ContactShadows, OrbitControls } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { BoxModel, type BoxModelProps } from "./BoxModel";
import { DarkroomLights } from "./Lights";
import { hasWebGL } from "@/design/hooks";

export type CameraPreset = "iso" | "front" | "back" | "side" | "top";

const PRESETS: Record<CameraPreset, [number, number, number]> = {
  iso: [3.4, 2.9, 4.4],
  front: [0, 1.4, 5.6],
  back: [0, 1.4, -5.6],
  side: [5.6, 1.4, 0],
  top: [0.001, 6.2, 0.6],
};

function CameraRig({ preset, nonce, controls, targetY }: { preset: CameraPreset; nonce: number; controls: React.RefObject<OrbitControlsImpl | null>; targetY: number }) {
  const { camera } = useThree();
  useEffect(() => {
    camera.position.set(...PRESETS[preset]);
    controls.current?.update();
  }, [preset, nonce, camera, controls]);
  useEffect(() => {
    controls.current?.target.set(0, targetY, 0);
    controls.current?.update();
  }, [targetY, controls]);
  return null;
}

function Capture({ onCanvas }: { onCanvas?: (c: HTMLCanvasElement) => void }) {
  const { gl } = useThree();
  useEffect(() => {
    onCanvas?.(gl.domElement);
  }, [gl, onCanvas]);
  return null;
}

export interface BoxViewerProps extends BoxModelProps {
  preset?: CameraPreset;
  presetNonce?: number;
  autoRotate?: boolean;
  interactive?: boolean;
  onCanvas?: (c: HTMLCanvasElement) => void;
  fallback?: React.ReactNode;
  className?: string;
}

export default function BoxViewer({ preset = "iso", presetNonce = 0, autoRotate, interactive = true, onCanvas, fallback, className, ...model }: BoxViewerProps) {
  const controls = useRef<OrbitControlsImpl | null>(null);
  const [supported, setSupported] = useState<boolean | null>(null);
  const targetY = ((model.size ?? 2.6) * model.dims.height) / Math.max(model.dims.length, model.dims.width, model.dims.height) / 2;
  useEffect(() => setSupported(hasWebGL()), []);

  if (supported === false) return <>{fallback}</>;
  if (supported === null) return <div className={className} />;

  return (
    <div className={className}>
      <Canvas shadows dpr={[1, 2]} camera={{ position: PRESETS[preset], fov: 35 }} gl={{ preserveDrawingBuffer: true, antialias: true }}>
        <Suspense fallback={null}>
          <color attach="background" args={["#100904"]} />
          <hemisphereLight args={["#ffe9d2", "#2a1a10", 0.55]} />
          <DarkroomLights />
          <BoxModel {...model} />
          <ContactShadows position={[0, 0, 0]} opacity={0.7} scale={9} blur={2.6} far={4} color="#000000" />
          <OrbitControls ref={controls} makeDefault enabled={interactive} enablePan={false} minDistance={2.5} maxDistance={12} target={[0, targetY, 0]} autoRotate={autoRotate} autoRotateSpeed={0.8} maxPolarAngle={Math.PI * 0.95} />
          <CameraRig preset={preset} nonce={presetNonce} controls={controls} targetY={targetY} />
          <Capture onCanvas={onCanvas} />
        </Suspense>
      </Canvas>
    </div>
  );
}
