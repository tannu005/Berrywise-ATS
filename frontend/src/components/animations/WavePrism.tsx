import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { MeshDistortMaterial, OrbitControls } from '@react-three/drei';
import { motion } from 'framer-motion';

function FloatingPrism() {
  const meshRef = useRef<any>();

  useFrame((state) => {
    if (meshRef.current) {
      // Gentle spin
      meshRef.current.rotation.x = state.clock.getElapsedTime() * 0.4;
      meshRef.current.rotation.y = state.clock.getElapsedTime() * 0.6;
      meshRef.current.rotation.z = state.clock.getElapsedTime() * 0.2;
    }
  });

  return (
    <mesh ref={meshRef}>
      {/* 3D Octahedron Prism geometry */}
      <octahedronGeometry args={[1.5, 0]} />
      <MeshDistortMaterial
        color="#818cf8"
        roughness={0.1}
        metalness={0.9}
        distort={0.4} // Wave distortion rate
        speed={2} // Oscillation speed
        clearcoat={1}
        clearcoatRoughness={0.1}
      />
    </mesh>
  );
}

export const WavePrism: React.FC = () => {
  return (
    <motion.div 
      animate={{ y: [0, -12, 0] }}
      transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      className="w-[300px] h-[300px] relative z-10"
    >
      {/* Glassmorphic prism container */}
      <div className="absolute inset-0 bg-indigo-500/5 rounded-full filter blur-xl"></div>
      <Canvas camera={{ position: [0, 0, 4] }}>
        <ambientLight intensity={0.4} />
        <pointLight position={[10, 10, 10]} intensity={1.5} color="#06b6d4" />
        <pointLight position={[-10, -10, -10]} intensity={1.5} color="#ec4899" />
        <directionalLight position={[0, 5, 0]} intensity={0.8} color="#ffffff" />
        
        <FloatingPrism />
        <OrbitControls enableZoom={false} autoRotate={false} />
      </Canvas>
    </motion.div>
  );
};
