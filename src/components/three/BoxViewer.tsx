"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { ContactShadows, Environment, Lightformer, OrbitControls } from "@react-three/drei";
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
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    camera.position.set(...PRESETS[preset]);
    controls.current?.update();
    invalidate();
  }, [preset, nonce, camera, controls, invalidate]);
  useEffect(() => {
    controls.current?.target.set(0, targetY, 0);
    controls.current?.update();
    invalidate();
  }, [targetY, controls, invalidate]);
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
  /** "light" = bright studio backdrop (design studio); default dark room (site) */
  theme?: "dark" | "light";
}

export default function BoxViewer({ preset = "iso", presetNonce = 0, autoRotate, interactive = true, onCanvas, fallback, className, theme = "dark", ...model }: BoxViewerProps) {
  const light = theme === "light";
  // rebuild the baked ground shadow only once the size stops changing
  const dimsKey = `${model.dims.length}x${model.dims.width}x${model.dims.height}`;
  const [shadowKey, setShadowKey] = useState(dimsKey);
  useEffect(() => {
    const t = setTimeout(() => setShadowKey(dimsKey), 250);
    return () => clearTimeout(t);
  }, [dimsKey]);
  const controls = useRef<OrbitControlsImpl | null>(null);
  const [supported, setSupported] = useState<boolean | null>(null);
  const targetY = ((model.size ?? 2.6) * model.dims.height) / Math.max(model.dims.length, model.dims.width, model.dims.height) / 2;
  useEffect(() => setSupported(hasWebGL()), []);

  if (supported === false) return <>{fallback}</>;
  if (supported === null) return <div className={className} />;

  return (
    <div className={className}>
      {/* render on demand (orbit, edits, lid animation) instead of 60 fps; auto-rotating previews keep a continuous loop */}
      <Canvas frameloop={autoRotate ? "always" : "demand"} dpr={[1, 1.5]} camera={{ position: PRESETS[preset], fov: 35 }} gl={{ preserveDrawingBuffer: true, antialias: true }}>
        <Suspense fallback={null}>
          <color attach="background" args={[light ? "#f1f2f7" : "#100904"]} />
          <hemisphereLight args={light ? ["#ffffff", "#d9dcea", 1.1] : ["#ffe9d2", "#2a1a10", 0.55]} />
          <DarkroomLights />
          {/* procedural studio reflections (no downloads) so foil and spot UV read correctly */}
          <Environment resolution={128}>
              {/* broad softbox behind the camera: metallic foil needs something bright to mirror */}
              <Lightformer intensity={2.4} color="#fff0dc" position={[0, 1, 7]} scale={[10, 4, 1]} />
            <Lightformer intensity={2.2} color="#ffe2c4" position={[0, 4, 3]} scale={[6, 2, 1]} />
            <Lightformer intensity={1.4} color="#ff9a52" position={[5, 2, -3]} scale={[3, 3, 1]} />
            <Lightformer intensity={0.6} color="#ffffff" position={[-5, 1, 2]} scale={[2, 4, 1]} />
          </Environment>
          {/* tall bags need headroom for their handles */}
          <BoxModel {...model} size={model.size ?? (model.boxStyle === "bag" ? 2.0 : undefined)} />
          {/* baked once per size (frames={1}); re-mounted when dimensions change */}
          <ContactShadows key={shadowKey} frames={1} resolution={256} position={[0, 0, 0]} opacity={light ? 0.35 : 0.7} scale={9} blur={2.6} far={4} color={light ? "#1d2235" : "#000000"} />
          <OrbitControls ref={controls} makeDefault enabled={interactive} enablePan={false} minDistance={2.5} maxDistance={12} target={[0, targetY, 0]} autoRotate={autoRotate} autoRotateSpeed={0.8} maxPolarAngle={Math.PI * 0.95} />
          <CameraRig preset={preset} nonce={presetNonce} controls={controls} targetY={targetY} />
          <Capture onCanvas={onCanvas} />
        </Suspense>
      </Canvas>
    </div>
  );
}
