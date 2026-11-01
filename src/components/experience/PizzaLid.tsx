"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { brandLogo, sunMark } from "@/components/three/showcase";
import { timeline } from "./scroll";
import { BASE_DIMS, lidAt, LID_SWAP, MM } from "./story";

const L = BASE_DIMS.length * MM;
const W = BASE_DIMS.width * MM;
const H = BASE_DIMS.height * MM;
const THICK = 0.016;
const OPEN_ANGLE = 1.8;

function printedBoard(paint: (ctx: CanvasRenderingContext2D, size: number) => void) {
  const c = document.createElement("canvas");
  c.width = c.height = 1024;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#FBF9F5";
  ctx.fillRect(0, 0, 1024, 1024);
  paint(ctx, 1024);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/**
 * The opening pose of the hero carton: a pizza box. The carton's own top flaps stay hidden until LID_SWAP;
 * until then this one-piece lid, hinged on the back edge, opens and closes with the scroll.
 */
export function PizzaLid() {
  const root = useRef<THREE.Group>(null);
  const hinge = useRef<THREE.Group>(null);

  const { geo, materials, floor, dispose } = useMemo(() => {
    const lift = { emissive: "#ffffff", emissiveIntensity: 0.6, roughness: 0.62 };
    const art = (map: THREE.Texture) => new THREE.MeshStandardMaterial({ map, emissiveMap: map, ...lift });
    const top = printedBoard((ctx, s) => brandLogo(ctx, s / 2, s / 2, s * 0.68, "light"));
    const inside = printedBoard((ctx, s) => sunMark(ctx, s / 2, s * 0.56, s * 0.13, "#EA5B32"));
    const plain = new THREE.MeshStandardMaterial({ color: "#FBF9F5", ...lift });
    const topMat = art(top);
    const insideMat = art(inside);
    const g = new THREE.BoxGeometry(L, THICK, W);
    return {
      geo: g,
      // BoxGeometry order: +x −x +y −y +z −z
      materials: [plain, plain, topMat, insideMat, plain, plain],
      floor: insideMat,
      dispose: () => [g, top, inside, plain, topMat, insideMat].forEach((x) => x.dispose()),
    };
  }, []);
  useEffect(() => dispose, [dispose]);

  useFrame(() => {
    const s = timeline.screens;
    if (root.current) root.current.visible = s < LID_SWAP;
    if (hinge.current) hinge.current.rotation.x = -OPEN_ANGLE * lidAt(s);
  });

  return (
    <group ref={root}>
      {/* printed floor inside the box */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -H / 2 + 0.02, 0]} material={floor}>
        <planeGeometry args={[L - 0.01, W - 0.01]} />
      </mesh>
      <group ref={hinge} position={[0, H / 2 + THICK / 2, -W / 2]}>
        <mesh position={[0, 0, W / 2]} geometry={geo} material={materials} castShadow />
      </group>
    </group>
  );
}
