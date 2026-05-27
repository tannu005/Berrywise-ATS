import React, { useRef } from 'react';
import { Canvas, useFrame, extend } from '@react-three/fiber';
import { shaderMaterial } from '@react-three/drei';
import { motion } from 'framer-motion';
import * as THREE from 'three';

const WavyLineMaterial = shaderMaterial(
  { time: 0 },
  // Vertex Shader
  `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  // Fragment Shader
  `
    uniform float time;
    varying vec2 vUv;
    void main() {
      vec2 uv = vUv;
      // Glowing fluid sine lines on the GPU
      float line1 = sin(uv.x * 6.0 + time * 1.5) * 0.15 + 0.5;
      float line2 = cos(uv.x * 8.0 - time * 1.2) * 0.1 + 0.4;
      float line3 = sin(uv.x * 4.0 + time * 0.8) * 0.2 + 0.6;
      
      float dist1 = abs(uv.y - line1);
      float dist2 = abs(uv.y - line2);
      float dist3 = abs(uv.y - line3);
      
      float intensity1 = 0.003 / (dist1 + 0.006);
      float intensity2 = 0.002 / (dist2 + 0.004);
      float intensity3 = 0.004 / (dist3 + 0.008);
      
      vec3 color1 = vec3(0.06, 0.8, 0.86) * intensity1;
      vec3 color2 = vec3(0.85, 0.08, 0.9) * intensity2;
      vec3 color3 = vec3(0.08, 0.4, 0.95) * intensity3;
      
      vec3 finalColor = color1 + color2 + color3;
      float alpha = clamp(intensity1 + intensity2 + intensity3, 0.0, 1.0) * 0.35;
      
      gl_FragColor = vec4(finalColor, alpha);
    }
  `
);

extend({ WavyLineMaterial });

function ShaderBackground() {
  const materialRef = useRef<any>();
  
  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.time = state.clock.getElapsedTime();
    }
  });

  return (
    <mesh>
      <planeGeometry args={[2, 2]} />
      {/* @ts-ignore */}
      <wavyLineMaterial ref={materialRef} transparent depthWrite={false} />
    </mesh>
  );
}

export const ShaderLines: React.FC = () => {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1.5 }}
      className="absolute inset-0 z-0 pointer-events-none"
    >
      <Canvas camera={{ position: [0, 0, 1] }}>
        <ShaderBackground />
      </Canvas>
    </motion.div>
  );
};
