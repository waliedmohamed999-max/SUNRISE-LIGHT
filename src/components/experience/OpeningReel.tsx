"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Reflector } from "three/examples/jsm/objects/Reflector.js";
import { BoxModel, modelHeight } from "@/components/three/BoxModel";
import { brandedCanvases, brandLogo } from "@/components/three/showcase";
import { getEngine } from "@/packaging/engine";
import { liftWhite } from "./lift";
import { clamp, lerp, ramp, timeline } from "./scroll";
import { dimsAt, MM } from "./story";
import { DEPARTMENTS, opening, OPENING, openingDone, skipOpening, turntableAngle } from "./opening";

/* A black showroom: the range on a stepped turntable with a mirror floor and gold light, all white with the logo. */

const RANGE = DEPARTMENTS.flatMap((dep) => dep.products);
const PRODUCT_SIZE = 1.5;
const RING = 6.6;
const CENTRE = new THREE.Vector3(0, 2.0, 0);
const RADIUS = 1.5;
const GOLD = "#E2BC6B";
const GOLD_LIGHT = "#FFE3A3";

function texture(c: HTMLCanvasElement) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

function radialGlow() {
  const c = document.createElement("canvas");
  c.width = c.height = 512;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(256, 256, 0, 256, 256, 256);
  g.addColorStop(0, "rgba(255,227,163,1)");
  g.addColorStop(0.35, "rgba(226,188,107,0.42)");
  g.addColorStop(1, "rgba(226,188,107,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 512, 512);
  return texture(c);
}

const ease = (t: number) => 1 - Math.pow(1 - clamp(t), 3);

export function OpeningReel() {
  const root = useRef<THREE.Group>(null);
  const ball = useRef<THREE.Group>(null);
  const sphere = useRef<THREE.Mesh>(null);
  const logo = useRef<THREE.Mesh>(null);
  const logoMat = useRef<THREE.MeshBasicMaterial>(null);
  const halo = useRef<THREE.Mesh>(null);
  const haloMat = useRef<THREE.MeshBasicMaterial>(null);
  const rim = useRef<THREE.Mesh>(null);
  const rimMat = useRef<THREE.MeshBasicMaterial>(null);
  const aura = useRef<THREE.Mesh>(null);
  const auraMat = useRef<THREE.MeshBasicMaterial>(null);
  const shock = useRef<THREE.Mesh>(null);
  const shockMat = useRef<THREE.MeshBasicMaterial>(null);
  const sparks = useRef<THREE.Points>(null);
  const sparksMat = useRef<THREE.PointsMaterial>(null);
  const dust = useRef<THREE.Points>(null);
  const dustMat = useRef<THREE.PointsMaterial>(null);
  const poolMat = useRef<THREE.MeshBasicMaterial>(null);
  const ringMesh = useRef<THREE.Mesh>(null);
  const ringMat = useRef<THREE.MeshBasicMaterial>(null);
  const backLight = useRef<THREE.SpotLight>(null);
  const frontLight = useRef<THREE.SpotLight>(null);
  const items = useRef<(THREE.Group | null)[]>([]);
  const bases = useRef<(THREE.Mesh | null)[]>([]);
  const lifted = useRef(false);

  const canvases = useMemo(() => RANGE.map((p) => brandedCanvases(p.dims, p.engine, getEngine(p.engine).boxStyle)), []);
  const heights = useMemo(() => RANGE.map((p) => modelHeight(p.dims, getEngine(p.engine).boxStyle, PRODUCT_SIZE)), []);
  // each product keeps its azimuth all the way into the ball, so the vortex never crosses itself
  const latitude = useMemo(() => RANGE.map((_, i) => ((i * 7) % RANGE.length) / (RANGE.length - 1) * 1.7 - 0.85), []);

  const { logoTex, glowTex } = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 1355;
    c.height = 511;
    brandLogo(c.getContext("2d")!, c.width / 2, c.height / 2, c.width, "light");
    return { logoTex: texture(c), glowTex: radialGlow() };
  }, []);
  useEffect(
    () => () => {
      logoTex.dispose();
      glowTex.dispose();
    },
    [logoTex, glowTex],
  );

  const { sparkGeo, dustGeo } = useMemo(() => {
    let seed = 5;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) % 10000) / 10000;
    const burst = new Float32Array(200 * 3);
    for (let i = 0; i < 200; i++) {
      new THREE.Vector3(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).normalize().multiplyScalar(1 + rnd() * 1.4).toArray(burst, i * 3);
    }
    const motes = new Float32Array(320 * 3);
    for (let i = 0; i < 320; i++) {
      motes[i * 3] = (rnd() - 0.5) * 26;
      motes[i * 3 + 1] = rnd() * 9 - 0.2;
      motes[i * 3 + 2] = (rnd() - 0.5) * 22;
    }
    const geo = (a: Float32Array) => new THREE.BufferGeometry().setAttribute("position", new THREE.BufferAttribute(a, 3));
    return { sparkGeo: geo(burst), dustGeo: geo(motes) };
  }, []);
  useEffect(
    () => () => {
      sparkGeo.dispose();
      dustGeo.dispose();
    },
    [sparkGeo, dustGeo],
  );

  // black glass: unlit, so the floor shows nothing but the reflection and melts into the background
  const mirror = useMemo(() => {
    const r = new Reflector(new THREE.PlaneGeometry(70, 70), {
      textureWidth: 1024,
      textureHeight: 1024,
      clipBias: 0.003,
      multisample: 4,
      shader: {
        name: "BlackGlass",
        uniforms: { color: { value: null }, tDiffuse: { value: null }, textureMatrix: { value: null }, strength: { value: 0 } },
        vertexShader: `uniform mat4 textureMatrix; varying vec4 vRefl; varying vec2 vPlane;
          void main() { vRefl = textureMatrix * vec4(position, 1.0); vPlane = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: `uniform sampler2D tDiffuse; uniform float strength; varying vec4 vRefl; varying vec2 vPlane;
          void main() {
            float fade = 1.0 - smoothstep(5.0, 13.0, length(vPlane));
            gl_FragColor = vec4(texture2DProj(tDiffuse, vRefl).rgb * strength * fade, 1.0);
            #include <tonemapping_fragment>
            #include <colorspace_fragment>
          }`,
      },
    });
    const m = r.material as THREE.ShaderMaterial;
    m.transparent = true;
    m.blending = THREE.AdditiveBlending;
    m.depthWrite = false;
    return r;
  }, []);
  useEffect(() => () => mirror.dispose(), [mirror]);

  const toCam = useMemo(() => new THREE.Vector3(), []);
  const ground = (-dimsAt(0).height * MM) / 2;

  useFrame((state, delta) => {
    if (!root.current) return;
    if (!openingDone() && timeline.y > 60) skipOpening();
    if (openingDone()) {
      root.current.visible = false;
      if (backLight.current) backLight.current.intensity = 0;
      if (frontLight.current) frontLight.current.intensity = 0;
      return;
    }
    root.current.visible = true;
    if (!lifted.current) {
      lifted.current = true;
      items.current.forEach((g) => g && liftWhite(g, 0.26));
      // light effects stay out of the floor's reflection (its camera only sees layer 0)
      state.camera.layers.enable(1);
      for (const o of [aura.current, halo.current, rim.current, dust.current, sparks.current]) o?.layers.set(1);
    }
    // capped, so a slow first frame (texture upload) doesn't eat the start of the film
    opening.t += Math.min(delta, 1 / 20);
    const t = opening.t;

    /* the turntable, then the vortex */
    const gather = ramp(t, OPENING.gather[0], OPENING.gather[1]);
    const merge = ramp(t, OPENING.merge[0], OPENING.merge[1]);
    const turn = turntableAngle(t) - gather * gather * 5.5;
    // the turntable narrows to fit portrait screens
    const fit = clamp((state.size.width / state.size.height) / 1.15, 0.42, 1);
    RANGE.forEach((_, i) => {
      const g = items.current[i];
      if (!g) return;
      const order = i / RANGE.length;
      const enter = ease((t - 0.35 - order * 0.75) / 0.8);
      const pull = ramp(gather, order * 0.22, 0.78 + order * 0.22);
      const a = (i / RANGE.length) * Math.PI * 2 + turn;
      const lat = latitude[i];
      const r = lerp(RING * fit, RADIUS * Math.sqrt(1 - lat * lat) * lerp(1, 0.72, merge), pull);
      const y = lerp(ground + heights[i] / 2 - (1 - enter) * 1.2, CENTRE.y + RADIUS * lat * lerp(1, 0.72, merge), pull) + Math.sin(pull * Math.PI) * 0.5;
      g.position.set(Math.sin(a) * r, y, Math.cos(a) * r);
      // facing outwards, logo to the room, leaning into the ball's surface as it closes
      g.rotation.set(-Math.asin(lat) * pull, a + 0.2 * (1 - pull), 0, "YXZ");
      g.scale.setScalar(Math.max(0.0001, enter * lerp(lerp(fit, 1, 0.25), 0.68, pull) * (1 - merge)));
      const base = bases.current[i];
      if (base) {
        base.position.set(Math.sin(a) * RING * fit, ground + 0.02, Math.cos(a) * RING * fit);
        base.scale.setScalar(Math.max(0.0001, lerp(fit, 1, 0.25) * ease((t - 0.1 - order * 0.75) / 0.6) * (1 - ramp(gather, 0, 0.55))));
      }
    });

    /* the ball, its logo and the drop */
    const drop = clamp((t - OPENING.drop[0]) / (OPENING.drop[1] - OPENING.drop[0]));
    const fall = drop * drop; // accelerates like a real fall
    const land = ramp(t, OPENING.land[0], OPENING.land[1] - 0.1);
    const appear = ramp(t, OPENING.merge[0] + 0.05, OPENING.merge[1]);
    const R = lerp(1, 0.34, fall);
    if (ball.current) {
      ball.current.position.set(0, lerp(CENTRE.y, 0.15, fall), 0);
      const side = R * (1 + land * 0.25) * (1 - land * 0.75);
      ball.current.scale.set(side, Math.max(0.001, R * (1 - land)), side);
      ball.current.visible = appear > 0.001 && land < 0.999;
      toCam.copy(state.camera.position).sub(ball.current.position).normalize();
    }
    if (sphere.current) sphere.current.scale.setScalar(RADIUS * (0.72 + 0.28 * appear));

    const reveal = ramp(t, OPENING.logo[0] - 0.05, OPENING.logo[0] + 0.55);
    const logoOut = ramp(t, OPENING.drop[0] + 0.3, OPENING.drop[1] - 0.05);
    if (logo.current && logoMat.current) {
      logo.current.position.copy(toCam).multiplyScalar(RADIUS + 0.02);
      logo.current.quaternion.copy(state.camera.quaternion);
      logo.current.scale.setScalar(lerp(0.72, 1, ease(reveal)));
      logoMat.current.opacity = reveal * (1 - logoOut);
    }
    if (rim.current && rimMat.current) {
      rim.current.position.copy(CENTRE);
      rim.current.quaternion.copy(state.camera.quaternion);
      rim.current.scale.setScalar(RADIUS * lerp(0.95, 1.07, ease(reveal)));
      rimMat.current.opacity = reveal * (1 - ramp(t, OPENING.drop[0] - 0.1, OPENING.drop[0] + 0.15));
    }
    if (aura.current && auraMat.current && ball.current) {
      aura.current.position.copy(ball.current.position).addScaledVector(toCam, -RADIUS);
      aura.current.quaternion.copy(state.camera.quaternion);
      auraMat.current.opacity = appear * 0.6 * (1 - ramp(t, OPENING.drop[1] - 0.2, OPENING.land[1]));
    }
    if (halo.current && haloMat.current) {
      const p = clamp((t - OPENING.logo[0] + 0.05) / 1.2);
      halo.current.position.copy(CENTRE);
      halo.current.quaternion.copy(state.camera.quaternion);
      halo.current.scale.setScalar(RADIUS * lerp(1, 3.2, ease(p)));
      haloMat.current.opacity = p > 0 && p < 1 ? (1 - p) * 0.9 : 0;
    }
    if (sparks.current && sparksMat.current) {
      const p = clamp((t - OPENING.merge[1] + 0.08) / 1.3);
      sparks.current.visible = p > 0 && p < 1;
      sparks.current.scale.setScalar(lerp(1, 3.6, ease(p)));
      sparksMat.current.opacity = 1 - p * p;
    }

    /* the room: gold dust, ring of light, pool on the floor, spots */
    const room = ramp(t, 0, 0.9) * (1 - ramp(t, OPENING.drop[1] - 0.3, OPENING.end));
    if (dust.current && dustMat.current) {
      dust.current.rotation.y = t * 0.03;
      dustMat.current.opacity = 0.8 * room;
    }
    if (poolMat.current) poolMat.current.opacity = 0.13 * room;
    if (ringMesh.current && ringMat.current) {
      ringMesh.current.scale.setScalar(fit * lerp(0.82, 1, ease(t / 1.1)));
      ringMat.current.opacity = room * (1 - ramp(gather, 0.2, 0.8));
    }
    (mirror.material as THREE.ShaderMaterial).uniforms.strength.value = 0.2 * room;
    mirror.visible = room > 0.01;
    if (backLight.current) backLight.current.intensity = 900 * room;
    if (frontLight.current) frontLight.current.intensity = 420 * room;

    /* impact ring at the landing point */
    if (shock.current && shockMat.current) {
      const p = clamp((t - OPENING.drop[1]) / 0.75);
      shock.current.scale.setScalar(lerp(0.6, 3.6, ease(p)));
      shockMat.current.opacity = p > 0 && p < 1 ? (1 - p) * 0.9 : 0;
    }
  });

  return (
    <>
      {/* gold from behind edges every product; a soft key from the front keeps the logos readable */}
      <spotLight ref={backLight} color={GOLD_LIGHT} position={[0, 11, -12]} angle={0.95} penumbra={0.9} intensity={0} decay={1.6} />
      <spotLight ref={frontLight} color="#fff4e2" position={[0, 10, 16]} angle={0.8} penumbra={1} intensity={0} decay={1.6} />
      <group ref={root}>
        <primitive object={mirror} rotation={[-Math.PI / 2, 0, 0]} position={[0, ground - 0.001, 0]} />
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, ground + 0.006, 0]} renderOrder={1}>
          <planeGeometry args={[20, 20]} />
          <meshBasicMaterial ref={poolMat} map={glowTex} transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
        </mesh>
        <mesh ref={ringMesh} rotation={[-Math.PI / 2, 0, 0]} position={[0, ground + 0.012, 0]} renderOrder={1}>
          <ringGeometry args={[RING + 1.02, RING + 1.06, 200]} />
          <meshBasicMaterial ref={ringMat} color={GOLD} transparent opacity={0} depthWrite={false} toneMapped={false} />
        </mesh>
        {RANGE.map((p, i) => {
          const style = getEngine(p.engine).boxStyle;
          return (
            <group key={i} ref={(g) => void (items.current[i] = g)} scale={0.0001}>
              {/* pivot on the product's middle, so it can settle onto the ball about its own centre */}
              <group position={[0, -heights[i] / 2, 0]}>
                <BoxModel dims={p.dims} boxStyle={style} canvases={canvases[i]} textureVersion={1} materialColor="#FBF9F5" size={PRODUCT_SIZE} />
              </group>
            </group>
          );
        })}
        {RANGE.map((_, i) => (
          <mesh key={i} ref={(m) => void (bases.current[i] = m)} scale={0.0001}>
            <cylinderGeometry args={[0.72, 0.76, 0.05, 48]} />
            <meshStandardMaterial color={GOLD} metalness={1} roughness={0.22} />
          </mesh>
        ))}
        <points ref={dust} geometry={dustGeo}>
          <pointsMaterial ref={dustMat} color={GOLD_LIGHT} size={0.04} transparent opacity={0} depthWrite={false} toneMapped={false} />
        </points>
        <mesh ref={aura} renderOrder={0}>
          <planeGeometry args={[10, 10]} />
          <meshBasicMaterial ref={auraMat} map={glowTex} transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
        </mesh>
        <group ref={ball} visible={false}>
          <mesh ref={sphere}>
            <sphereGeometry args={[1, 64, 48]} />
            <meshStandardMaterial color="#fffdf9" roughness={0.28} emissive="#ffffff" emissiveIntensity={0.3} />
          </mesh>
          <mesh ref={logo} renderOrder={3}>
            <planeGeometry args={[2.14, (2.14 * 511) / 1355]} />
            <meshBasicMaterial ref={logoMat} map={logoTex} transparent opacity={0} depthWrite={false} toneMapped={false} />
          </mesh>
        </group>
        <mesh ref={rim} renderOrder={2}>
          <ringGeometry args={[0.99, 1, 160]} />
          <meshBasicMaterial ref={rimMat} color={GOLD} transparent opacity={0} depthWrite={false} toneMapped={false} side={THREE.DoubleSide} />
        </mesh>
        <mesh ref={halo} renderOrder={2}>
          <ringGeometry args={[0.982, 1, 128]} />
          <meshBasicMaterial ref={haloMat} color={GOLD_LIGHT} transparent opacity={0} depthWrite={false} toneMapped={false} side={THREE.DoubleSide} />
        </mesh>
        <points ref={sparks} position={CENTRE} geometry={sparkGeo} visible={false}>
          <pointsMaterial ref={sparksMat} color={GOLD_LIGHT} size={0.05} transparent depthWrite={false} toneMapped={false} />
        </points>
        <mesh ref={shock} rotation={[-Math.PI / 2, 0, 0]} position={[0, ground + 0.03, 0]} renderOrder={2}>
          <ringGeometry args={[0.985, 1, 128]} />
          <meshBasicMaterial ref={shockMat} color={GOLD_LIGHT} transparent opacity={0} depthWrite={false} toneMapped={false} />
        </mesh>
      </group>
    </>
  );
}
