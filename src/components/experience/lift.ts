import * as THREE from "three";

/** The scene's lights are warm; a little self-illumination keeps white board reading as white. */
export function liftWhite(root: THREE.Object3D, intensity: number) {
  root.traverse((o) => {
    const mat = (o as THREE.Mesh).material;
    for (const m of Array.isArray(mat) ? mat : mat ? [mat] : []) {
      if (m instanceof THREE.MeshStandardMaterial) {
        m.emissive.set("#ffffff");
        m.emissiveMap = m.map;
        m.emissiveIntensity = intensity;
        m.needsUpdate = true;
      }
    }
  });
}
