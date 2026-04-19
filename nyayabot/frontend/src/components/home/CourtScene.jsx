/**
 * components/home/CourtScene.jsx
 *
 * Three.js courthouse colonnade rendered via @react-three/fiber.
 *
 * SCENE DESIGN:
 * - Two rows of tall stone pillars (Greek colonnade) receding into the distance
 * - Camera drifts slowly forward through the hall in a seamless loop
 * - Dramatic gold SpotLight from the upper-left (key light) casts long shadows
 * - Faint rim SpotLight from upper-right for pillar edge definition
 * - FogExp2 fades far pillars into the background
 * - Floor plane with a glossy stone-like material
 * - Dark ceiling plane closes the hall above
 *
 * DARK/LIGHT ADAPTATION:
 * - `bgColor` prop changes the canvas clear colour + fog colour
 * - Dark mode: near-black (#0C0C0C) | Light mode: off-white (#F0EDE8)
 *
 * PERFORMANCE:
 * - dpr capped at [1, 1.5] — limits pixel ratio on high-DPI screens
 * - shadows enabled only on the SpotLight + floor/pillars (not all objects)
 * - geometry is simple CylinderGeometry + PlaneGeometry — no external assets
 */

import React, { useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import useThemeStore from '../../store/themeStore';

// ── 1. Detailed Ornate Pillar ───────────────────────────────────────────────
function OrnatePillar({ position, isDark }) {
  // Metallic gold material for the top and bottom sections
  const goldMaterial = {
    color: isDark ? "#D4AF37" : "#C5A028", 
    metalness: 0.9,
    roughness: 0.15,
  };

  // White marble material for the fluted center
  const marbleMaterial = {
    color: isDark ? "#888888" : "#FFFFFF",
    metalness: 0.05,
    roughness: 0.4,
  };

  return (
    <group position={position}>
      {/* CAPITAL (Top Section) */}
      <group position={[0, 6.5, 0]}>
        {/* Top square slab (Abacus) */}
        <mesh position={[0, 0.7, 0]} castShadow>
          <boxGeometry args={[1.5, 0.3, 1.5]} />
          <meshStandardMaterial {...goldMaterial} />
        </mesh>
        {/* Flared decorative element */}
        <mesh position={[0, 0.2, 0]} castShadow>
          <cylinderGeometry args={[0.8, 0.5, 0.8, 16]} />
          <meshStandardMaterial {...goldMaterial} />
        </mesh>
      </group>

      {/* FLUTED SHAFT (Center Section) */}
      <mesh position={[0, 0, 0]} castShadow receiveShadow>
        {/* flatShading: true creates the sharp vertical "grooves" from your image */}
        <cylinderGeometry args={[0.45, 0.52, 13, 24]} />
        <meshStandardMaterial {...marbleMaterial} flatShading={true} />
      </mesh>

      {/* BASE (Bottom Section) */}
      <group position={[0, -6.5, 0]}>
        {/* Decorative ring (Torus-like) */}
        <mesh position={[0, 0.3, 0]} castShadow>
          <cylinderGeometry args={[0.8, 0.8, 0.5, 20]} />
          <meshStandardMaterial {...goldMaterial} />
        </mesh>
        {/* Bottom square plinth */}
        <mesh position={[0, -0.3, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.7, 0.6, 1.7]} />
          <meshStandardMaterial {...goldMaterial} />
        </mesh>
      </group>
    </group>
  );
}

// ── 2. Camera Animation ─────────────────────────────────────────────────────
function CameraRig() {
  useFrame(({ clock, camera }) => {
    const t = clock.getElapsedTime();
    // The loop cycle: distance between pillars is 3.6. 
    // Moving 10.8 units (3 pillars) over 8 seconds.
    const cycle = (t % 8) / 8;
    camera.position.z = 14 - cycle * 10.8; 
    camera.position.y = 1.6;
    camera.lookAt(0, 1.2, -10);
  });
  return null;
}

// ── 3. Internal Scene Setup ─────────────────────────────────────────────────
function SceneContent({ isDark }) {
  const colors = useMemo(() => ({
    bg: isDark ? '#0C0C0C' : '#F2F1ED', // Very light grey-white for black text contrast
    floor: isDark ? '#080808' : '#DEDAD2',
    ceiling: isDark ? '#050505' : '#CCC8C0'
  }), [isDark]);

  return (
    <>
      {/* Background and Atmosphere */}
      <color attach="background" args={[colors.bg]} />
      <fogExp2 attach="fog" color={colors.bg} density={0.032} />
      
      <ambientLight intensity={isDark ? 0.2 : 0.7} />

      {/* Key spotlight to bring out the golden shine */}
      <spotLight
        position={[-10, 15, 10]}
        intensity={isDark ? 350 : 120}
        color="#FFE082"
        angle={0.4}
        penumbra={0.5}
        castShadow
        shadow-mapSize={[1024, 1024]}
      />

      {/* The Colonnade (7 pairs of pillars) */}
      {[0, 3.6, 7.2, 10.8, 14.4, 18.0, 21.6].map((z) => (
        <group key={z}>
          <OrnatePillar position={[-4, 0, z]} isDark={isDark} />
          <OrnatePillar position={[4, 0, z]} isDark={isDark} />
        </group>
      ))}

      {/* Floor - slightly reflective */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -7.3, 10]} receiveShadow>
        <planeGeometry args={[50, 100]} />
        <meshStandardMaterial 
          color={colors.floor} 
          roughness={0.15} 
          metalness={isDark ? 0.5 : 0.1} 
        />
      </mesh>

      {/* Ceiling - matte */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 7.5, 10]}>
        <planeGeometry args={[50, 100]} />
        <meshStandardMaterial color={colors.ceiling} roughness={0.9} />
      </mesh>

      <CameraRig />
    </>
  );
}

// ── 4. Main Exported Component ──────────────────────────────────────────────
export default function CourtScene() {
  const theme = useThemeStore((s) => s.theme);
  const isDark = true;

  return (
    <div style={{ 
      position: 'absolute', 
      inset: 0, 
      width: '100%', 
      height: '100%', 
      overflow: 'hidden' 
    }}>
      <Canvas
        shadows
        camera={{ fov: 48, position: [0, 1.6, 14] }}
        gl={{ 
          antialias: true, 
          toneMapping: THREE.ACESFilmicToneMapping,
          outputColorSpace: THREE.SRGBColorSpace 
        }}
        dpr={[1, 2]} // High quality for retina screens
      >
        <SceneContent isDark={isDark} />
      </Canvas>
    </div>
  );
}