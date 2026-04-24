'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// Hand-authored skeletons. Each pose is the same joint order; we lerp between
// them based on scroll progress to get a morphing silhouette.
// Order: head, neck, chest, pelvis, shoulderL, elbowL, handL, shoulderR,
// elbowR, handR, hipL, kneeL, footL, hipR, kneeR, footR
const POSES = {
  // 01 PUSH — plank, body horizontal, arms extended beneath
  push: [
    [-0.1, 0.25, 0],   // head
    [-0.25, 0.22, 0],  // neck
    [-0.55, 0.2, 0],   // chest
    [-0.95, 0.18, 0],  // pelvis
    [-0.55, 0.1, 0.15],  // shoulderL
    [-0.55, -0.2, 0.25], // elbowL
    [-0.55, -0.55, 0.3], // handL
    [-0.55, 0.1, -0.15],
    [-0.55, -0.2, -0.25],
    [-0.55, -0.55, -0.3],
    [-0.95, 0.1, 0.18],   // hipL
    [-1.35, 0.05, 0.18],  // kneeL
    [-1.7, -0.05, 0.18],  // footL
    [-0.95, 0.1, -0.18],
    [-1.35, 0.05, -0.18],
    [-1.7, -0.05, -0.18],
  ],
  // 02 SQUAT — upright, knees bent 90°
  squat: [
    [0, 0.75, 0],
    [0, 0.58, 0],
    [0, 0.35, 0],
    [0, 0, 0],
    [-0.18, 0.5, 0],
    [-0.35, 0.3, 0.15],
    [-0.3, 0.15, 0.35],
    [0.18, 0.5, 0],
    [0.35, 0.3, 0.15],
    [0.3, 0.15, 0.35],
    [-0.18, 0, 0],
    [-0.22, -0.4, 0.25],
    [-0.22, -0.8, 0],
    [0.18, 0, 0],
    [0.22, -0.4, 0.25],
    [0.22, -0.8, 0],
  ],
  // 03 HOLLOW — supine, legs + upper body lifted into a banana shape
  hollow: [
    [0.4, 0.25, 0],    // head
    [0.3, 0.22, 0],
    [0.05, 0.15, 0],
    [-0.2, 0.08, 0],
    [0.32, 0.28, 0.15],
    [0.55, 0.45, 0.1],
    [0.8, 0.6, 0],     // arms overhead
    [0.32, 0.28, -0.15],
    [0.55, 0.45, -0.1],
    [0.8, 0.6, 0],
    [-0.2, 0.06, 0.12],
    [-0.55, 0.2, 0.12],
    [-0.9, 0.4, 0.12],
    [-0.2, 0.06, -0.12],
    [-0.55, 0.2, -0.12],
    [-0.9, 0.4, -0.12],
  ],
  // 04 PULL — hanging, arms up, body extended down
  pull: [
    [0, 0.55, 0],
    [0, 0.4, 0],
    [0, 0.15, 0],
    [0, -0.2, 0],
    [-0.15, 0.45, 0],
    [-0.2, 0.75, 0],
    [-0.25, 1.1, 0],
    [0.15, 0.45, 0],
    [0.2, 0.75, 0],
    [0.25, 1.1, 0],
    [-0.15, -0.22, 0],
    [-0.15, -0.6, 0.05],
    [-0.15, -1.0, 0],
    [0.15, -0.22, 0],
    [0.15, -0.6, 0.05],
    [0.15, -1.0, 0],
  ],
};

const BONES = [
  [0, 1], [1, 2], [2, 3],       // spine
  [2, 4], [4, 5], [5, 6],       // left arm
  [2, 7], [7, 8], [8, 9],       // right arm
  [3, 10], [10, 11], [11, 12],  // left leg
  [3, 13], [13, 14], [14, 15],  // right leg
];

const POSE_ORDER = ['push', 'squat', 'hollow', 'pull'];
const POINTS_PER_BONE = 34;

function bonePoint(a, b, t) {
  return [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
  ];
}

function samplePose(joints) {
  const out = [];
  for (const [i, j] of BONES) {
    for (let k = 0; k < POINTS_PER_BONE; k++) {
      const t = k / (POINTS_PER_BONE - 1);
      out.push(...bonePoint(joints[i], joints[j], t));
    }
  }
  return new Float32Array(out);
}

function lerpPoses(a, b, t) {
  const out = new Float32Array(a.length);
  for (let i = 0; i < a.length; i++) out[i] = a[i] + (b[i] - a[i]) * t;
  return out;
}

function smoothstep(t) {
  return t * t * (3 - 2 * t);
}

export default function StationFigure({ progressRef }) {
  const group = useRef(null);
  const pointsRef = useRef(null);

  const sampled = useMemo(
    () => POSE_ORDER.map((name) => samplePose(POSES[name])),
    []
  );

  const count = sampled[0].length / 3;

  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute(
      'position',
      new THREE.BufferAttribute(new Float32Array(sampled[0]), 3)
    );
    return g;
  }, [sampled]);

  useFrame((state) => {
    const p = Math.min(0.9999, Math.max(0, progressRef?.current ?? 0));
    const segments = POSE_ORDER.length - 1; // 3 transitions between 4 poses
    const scaled = p * segments;
    const idx = Math.floor(scaled);
    const localT = smoothstep(scaled - idx);

    const a = sampled[idx];
    const b = sampled[Math.min(idx + 1, sampled.length - 1)];
    const lerped = lerpPoses(a, b, localT);

    const attr = pointsRef.current.geometry.attributes.position;
    attr.array.set(lerped);
    attr.needsUpdate = true;

    if (group.current) {
      // Slow orbit tied to scroll progress so direction of view evolves
      const t = state.clock.elapsedTime;
      group.current.rotation.y = Math.sin(t * 0.08) * 0.15 + p * 0.6;
      group.current.rotation.x = Math.sin(t * 0.05) * 0.04;
    }
  });

  return (
    <group ref={group}>
      <points ref={pointsRef} geometry={geometry}>
        <pointsMaterial
          color="#F2ECE2"
          size={0.028}
          sizeAttenuation
          transparent
          opacity={0.95}
          depthWrite={false}
        />
      </points>
      {/* A secondary, larger, oxblood pass for rim glow */}
      <points geometry={geometry}>
        <pointsMaterial
          color="#8B1A1A"
          size={0.055}
          sizeAttenuation
          transparent
          opacity={0.35}
          depthWrite={false}
        />
      </points>
    </group>
  );
}
