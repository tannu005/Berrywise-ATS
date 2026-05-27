import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { ShaderLines } from './ShaderLines';
import { WavePrism } from './WavePrism';
import { Sparkles, Cpu, Database, Layout } from 'lucide-react';

const LOADING_STAGES = [
  { text: 'Syncing SQLite Core', icon: <Database className="w-5 h-5 text-cyan-400" /> },
  { text: 'Loading GraphQL Schemas', icon: <Cpu className="w-5 h-5 text-indigo-400" /> },
  { text: 'Running AI Classifiers', icon: <Sparkles className="w-5 h-5 text-rose-400" /> },
  { text: 'Rendering Dashboard Layout', icon: <Layout className="w-5 h-5 text-emerald-400" /> }
];

// 3D Dome Gallery of candidate nodes
function DomeGallery() {
  const groupRef = useRef<any>();
  const points = [];
  const count = 36;
  const radius = 2.4;

  for (let i = 0; i < count; i++) {
    const phi = Math.acos(-1 + (2 * i) / count);
    const theta = Math.sqrt(count * Math.PI) * phi;
    
    // Convert to spherical coords (dome positive Y)
    const x = radius * Math.sin(phi) * Math.cos(theta);
    const y = Math.abs(radius * Math.sin(phi) * Math.sin(theta));
    const z = radius * Math.cos(phi);
    points.push({ x, y, z });
  }

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = state.clock.getElapsedTime() * 0.12;
      groupRef.current.rotation.x = Math.sin(state.clock.getElapsedTime() * 0.2) * 0.15;
    }
  });

  return (
    <group ref={groupRef}>
      {points.map((p, idx) => (
        <mesh key={idx} position={[p.x, p.y, p.z]}>
          <sphereGeometry args={[0.07, 16, 16]} />
          <meshBasicMaterial color={idx % 2 === 0 ? '#06b6d4' : '#ec4899'} />
        </mesh>
      ))}
    </group>
  );
}

interface TransitionOverlayProps {
  isVisible: boolean;
  onMidpoint: () => void;
  onComplete: () => void;
}

export const TransitionOverlay: React.FC<TransitionOverlayProps> = ({ isVisible, onMidpoint, onComplete }) => {
  const [activeStage, setActiveStage] = useState(0);

  useEffect(() => {
    if (isVisible) {
      setActiveStage(0);
      const stageInterval = setInterval(() => {
        setActiveStage((prev) => (prev + 1) % LOADING_STAGES.length);
      }, 350);

      // Trigger midpoint page swap
      const midpointTimeout = setTimeout(() => {
        onMidpoint();
      }, 700);

      const completeTimeout = setTimeout(() => {
        onComplete();
      }, 1500);

      return () => {
        clearInterval(stageInterval);
        clearTimeout(midpointTimeout);
        clearTimeout(completeTimeout);
      };
    }
  }, [isVisible]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6 }}
          className="fixed inset-0 z-[9998] bg-[#0c0f1d] flex flex-col items-center justify-center overflow-hidden"
        >
          {/* 1. WebGL Pixelated Dissolve Overlay (CSS Grid + Staggered Delay) */}
          <div className="absolute inset-0 grid grid-cols-12 grid-rows-12 pointer-events-none z-10">
            {Array.from({ length: 144 }).map((_, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 1 }}
                animate={{ opacity: 0 }}
                exit={{ opacity: 1 }}
                transition={{
                  duration: 0.3,
                  delay: Math.random() * 0.45,
                  ease: 'easeInOut'
                }}
                className="bg-[#0c0f1d] border-[0.2px] border-slate-950/20"
              />
            ))}
          </div>

          {/* 2. Background GLSL Shader Lines */}
          <ShaderLines />

          {/* 3. Curved Loop Bezier Trajectories (SVG path loops) */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-20 z-0" xmlns="http://www.w3.org/2000/svg">
            <motion.path
              d="M -100,300 C 300,-100 600,800 1000,200 S 1300,900 2000,400"
              fill="none"
              stroke="url(#neonLoopGrad)"
              strokeWidth="3"
              strokeDasharray="80, 180"
              animate={{ strokeDashoffset: [-1000, 1000] }}
              transition={{ duration: 5, repeat: Infinity, ease: 'linear' }}
            />
            <defs>
              <linearGradient id="neonLoopGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#06b6d4" />
                <stop offset="100%" stopColor="#ec4899" />
              </linearGradient>
            </defs>
          </svg>

          {/* 4. Three.js 3D Dome Gallery */}
          <div className="absolute inset-0 z-0 pointer-events-none opacity-30">
            <Canvas camera={{ position: [0, 0, 4] }}>
              <ambientLight intensity={0.5} />
              <DomeGallery />
              <OrbitControls enableZoom={false} enablePan={false} autoRotate speed={0.5} />
            </Canvas>
          </div>

          {/* 5. Liquid Wave Prism (oscillating refraction) */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-25 pointer-events-none z-0">
            <WavePrism />
          </div>

          <div className="relative z-20 flex flex-col items-center max-w-lg px-6 text-center select-none">
            
            {/* 6. Circle Carousel Loader */}
            <div className="relative w-44 h-44 flex items-center justify-center mb-8" style={{ perspective: 800 }}>
              <motion.div
                animate={{ rotateY: 360 }}
                transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
                style={{ transformStyle: 'preserve-3d' }}
                className="relative w-full h-full flex items-center justify-center"
              >
                {LOADING_STAGES.map((stage, idx) => {
                  const angle = idx * (360 / LOADING_STAGES.length);
                  return (
                    <div
                      key={idx}
                      style={{
                        position: 'absolute',
                        transform: `rotateY(${angle}deg) translateZ(80px)`,
                        transformStyle: 'preserve-3d',
                      }}
                      className={`w-12 h-12 rounded-xl flex items-center justify-center bg-slate-900/90 border border-slate-700/60 shadow-xl ${
                        idx === activeStage ? 'border-cyan-500/80 shadow-cyan-500/20' : ''
                      }`}
                    >
                      {stage.icon}
                    </div>
                  );
                })}
              </motion.div>
            </div>

            {/* Split Text Mask stage reveal */}
            <div className="h-8 overflow-hidden relative w-full flex justify-center mb-2">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeStage}
                  initial={{ y: 24, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -24, opacity: 0 }}
                  transition={{ duration: 0.25, ease: 'easeOut' }}
                  className="absolute text-sm font-semibold tracking-widest text-cyan-400 font-mono uppercase"
                >
                  {LOADING_STAGES[activeStage].text}
                </motion.div>
              </AnimatePresence>
            </div>

            <div className="text-xs text-slate-500 uppercase tracking-widest font-mono">
              Berrywise Engine v1.1
            </div>

          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
