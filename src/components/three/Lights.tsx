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

/** Neutral daylight for the design studio, so the colours on screen are the colours of the design. */
export function StudioLights() {
  return (
    <>
      <directionalLight position={[4, 7, 5]} intensity={1.9} color="#ffffff" />
      <directionalLight position={[-5, 3, 3]} intensity={1.2} color="#ffffff" />
      <directionalLight position={[0, 3, -6]} intensity={0.9} color="#ffffff" />
    </>
  );
}
