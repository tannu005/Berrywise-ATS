import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShaderLines } from './ShaderLines';
import { WavePrism } from './WavePrism';
import { Sparkles, Cpu, Database, Layout } from 'lucide-react';
import gsap from 'gsap';

const LOADING_STAGES = [
  { text: 'Syncing Data Models', icon: <Database className="w-4 h-4" /> },
  { text: 'Loading GraphQL Nodes', icon: <Cpu className="w-4 h-4" /> },
  { text: 'Initializing Classifiers', icon: <Sparkles className="w-4 h-4" /> },
  { text: 'Rendering Interface', icon: <Layout className="w-4 h-4" /> }
];

interface TransitionOverlayProps {
  isVisible: boolean;
  onMidpoint: () => void;
  onComplete: () => void;
}

export const TransitionOverlay: React.FC<TransitionOverlayProps> = ({ isVisible, onMidpoint, onComplete }) => {
  const [activeStage, setActiveStage] = useState(0);
  const [isLightTheme, setIsLightTheme] = useState(false);
  const progressRef = useRef({ value: 0 });

  useEffect(() => {
    // Initial check
    setIsLightTheme(document.body.classList.contains('light-theme'));

    // Reactively observe class changes on document.body for instant theme updates
    const observer = new MutationObserver(() => {
      setIsLightTheme(document.body.classList.contains('light-theme'));
    });

    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (isVisible) {
      setActiveStage(0);
      progressRef.current.value = 0;

      const stageInterval = setInterval(() => {
        setActiveStage((prev) => (prev + 1) % LOADING_STAGES.length);
      }, 350);

      const tl = gsap.timeline({
        onComplete: () => {
          onComplete();
        }
      });

      tl.to(progressRef.current, {
        value: 1,
        duration: 2.5,
        ease: "power3.inOut",
      });

      const midpointTimeout = setTimeout(() => {
        onMidpoint();
      }, 1250); 

      return () => {
        clearInterval(stageInterval);
        clearTimeout(midpointTimeout);
        tl.kill();
      };
    }
  }, [isVisible, onMidpoint, onComplete]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: [0.76, 0, 0.24, 1] }}
          className={`fixed inset-0 z-[9998] flex flex-col items-center justify-center overflow-hidden transition-colors duration-500 ${
            isLightTheme ? 'bg-[#FAF9F6]' : 'bg-[#0A0A0B]'
          }`}
        >
          {/* Alabaster Warm Radial Gradient in Light Mode, Charcoal Radial in Dark Mode */}
          <div className={`absolute inset-0 z-0 opacity-80 transition-all duration-500 ${
            isLightTheme 
              ? 'bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-white via-[#FAF9F6] to-[#E9ECEF]' 
              : 'bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#1A1A1D] via-[#0A0A0B] to-black'
          }`} />

          {/* Background GLSL Shader Lines (Subtly matched) */}
          <div className={`absolute inset-0 z-[1] pointer-events-none opacity-10 transition-all duration-500 ${
            isLightTheme ? 'invert grayscale opacity-5' : 'grayscale opacity-10'
          }`}>
            <ShaderLines />
          </div>

          {/* Liquid Refractive Wave Prism */}
          <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-5 pointer-events-none z-[2] transition-all duration-500 ${
            isLightTheme ? 'invert grayscale opacity-5' : 'grayscale opacity-5'
          }`}>
            <WavePrism />
          </div>

          <div className="relative z-10 flex flex-col items-center max-w-lg px-6 text-center select-none pointer-events-none">
            
            {/* Minimalist Rotating Loader */}
            <div className="relative w-40 h-40 flex items-center justify-center mb-10" style={{ perspective: 800 }}>
              <motion.div
                animate={{ rotateY: 360 }}
                transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
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
                        transform: `rotateY(${angle}deg) translateZ(70px)`,
                        transformStyle: 'preserve-3d',
                      }}
                      className={`w-10 h-10 rounded-full flex items-center justify-center border transition-all duration-500 ${
                        isLightTheme 
                          ? (idx === activeStage ? 'bg-white border-fuchsia-500 scale-125 shadow-[0_0_20px_rgba(217,70,239,0.3)]' : 'bg-white/80 border-slate-200/60 opacity-30')
                          : (idx === activeStage ? 'bg-[#121214] border-[#D4AF37] scale-125 shadow-[0_0_20px_rgba(212,175,55,0.35)]' : 'bg-[#121214] border-white/10 opacity-30')
                      }`}
                    >
                      {React.cloneElement(stage.icon, {
                        className: `w-4 h-4 transition-colors duration-500 ${
                          idx === activeStage
                            ? (isLightTheme ? 'text-fuchsia-500' : 'text-[#D4AF37]')
                            : (isLightTheme ? 'text-slate-400' : 'text-white/60')
                        }`
                      })}
                    </div>
                  );
                })}
              </motion.div>
            </div>

            {/* Premium Typography Transitions */}
            <div className="h-6 overflow-hidden relative w-full flex justify-center mb-3">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeStage}
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -20, opacity: 0 }}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                  className={`absolute text-[11px] font-semibold tracking-[0.3em] uppercase font-sans transition-colors duration-500 ${
                    isLightTheme ? 'text-fuchsia-600' : 'text-[#D4AF37]'
                  }`}
                >
                  {LOADING_STAGES[activeStage].text}
                </motion.div>
              </AnimatePresence>
            </div>

            <div className={`text-[9px] uppercase tracking-[0.4em] font-mono mt-4 border-t pt-4 w-32 transition-all duration-500 ${
              isLightTheme ? 'text-slate-400 border-slate-200' : 'text-white/30 border-white/5'
            }`}>
              System Active
            </div>

          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
