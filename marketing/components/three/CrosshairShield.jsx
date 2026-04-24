'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

function Ring({ radius, thickness = 0.02, color = '#C9A24A', opacity = 1 }) {
  return (
    <mesh>
      <ringGeometry args={[radius - thickness, radius, 128]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={opacity}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

function CornerPip({ x, y, size = 0.08, color = '#8B1A1A' }) {
  return (
    <mesh position={[x, y, 0]}>
      <planeGeometry args={[size, size]} />
      <meshBasicMaterial color={color} />
    </mesh>
  );
}

function Crosshair({ color = '#C9A24A' }) {
  return (
    <group>
      <mesh>
        <planeGeometry args={[2.4, 0.01]} />
        <meshBasicMaterial color={color} transparent opacity={0.35} />
      </mesh>
      <mesh>
        <planeGeometry args={[0.01, 2.4]} />
        <meshBasicMaterial color={color} transparent opacity={0.35} />
      </mesh>
    </group>
  );
}

export default function CrosshairShield({ mouse }) {
  const group = useRef(null);

  useFrame((state, delta) => {
    if (!group.current) return;
    const mx = mouse?.current?.x ?? 0;
    const my = mouse?.current?.y ?? 0;
    group.current.rotation.y += (mx * 0.08 - group.current.rotation.y) * 0.05;
    group.current.rotation.x += (-my * 0.08 - group.current.rotation.x) * 0.05;
    group.current.rotation.z += delta * 0.015;
  });

  return (
    <group ref={group}>
      <Crosshair />
      <Ring radius={1.0} thickness={0.012} color="#C9A24A" opacity={0.9} />
      <Ring radius={0.72} thickness={0.008} color="#8B1A1A" opacity={0.85} />
      <Ring radius={0.42} thickness={0.006} color="#C9A24A" opacity={0.6} />

      <CornerPip x={-0.95} y={0.95} />
      <CornerPip x={0.95} y={0.95} />
      <CornerPip x={-0.95} y={-0.95} />
      <CornerPip x={0.95} y={-0.95} />

      {/* center "6" — six minutes */}
      <mesh position={[0, 0, 0.01]}>
        <circleGeometry args={[0.09, 64]} />
        <meshBasicMaterial color="#C9A24A" />
      </mesh>
      <mesh position={[0, 0, 0.02]}>
        <circleGeometry args={[0.06, 64]} />
        <meshBasicMaterial color="#0A0707" />
      </mesh>
    </group>
  );
}
