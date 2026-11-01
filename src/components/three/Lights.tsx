"use client";

/** Darkroom lighting: low warm ambient, soft key, warm rim from the upper right behind the object. */
export function DarkroomLights() {
  return (
    <>
      <ambientLight intensity={0.12} color="#ffe2c4" />
      <directionalLight position={[3, 7, 5]} intensity={1.15} color="#ffe3c2" castShadow shadow-mapSize={[1024, 1024]} shadow-bias={-0.0004} shadow-normalBias={0.03} />
      <directionalLight position={[5, 5, -4]} intensity={2.6} color="#ff9a52" />
      <pointLight position={[-4, 2, 3]} intensity={6} distance={12} color="#5a3a22" />
    </>
  );
}

/**
 * Neutral light from every side for the design studio, shown without tone mapping: no face of the
 * product falls into shadow, so a colour reads the same all the way round and matches what was picked.
 */
export function StudioLights() {
  return (
    <>
      <ambientLight intensity={0.6} color="#ffffff" />
      <directionalLight position={[3, 6, 6]} intensity={0.55} color="#ffffff" />
      <directionalLight position={[-3, 6, -6]} intensity={0.55} color="#ffffff" />
      <directionalLight position={[6, 2, -2]} intensity={0.5} color="#ffffff" />
      <directionalLight position={[-6, 2, 2]} intensity={0.5} color="#ffffff" />
    </>
  );
}
