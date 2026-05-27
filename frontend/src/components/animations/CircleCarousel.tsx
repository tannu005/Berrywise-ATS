import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const CAROUSEL_ITEMS = [
  { id: 1, title: 'AI Evaluator', desc: 'Predictive scoring & skill fit matrices', color: 'from-cyan-500 to-blue-600' },
  { id: 2, title: 'GraphQL Engine', desc: 'Instant schema & ultra-fast querying', color: 'from-pink-500 to-rose-600' },
  { id: 3, title: 'SQLite Core', desc: 'Zero-config local relational storage', color: 'from-emerald-500 to-teal-600' },
  { id: 4, title: 'Framer Motion', desc: 'Breathtaking 60fps GPU micro-interactions', color: 'from-violet-500 to-indigo-600' },
  { id: 5, title: 'Three.js Canvas', desc: 'Refractive shaders and custom 3D prisms', color: 'from-amber-500 to-orange-600' },
  { id: 6, title: 'GSAP Pipeline', desc: 'ScrollTrigger physics & split text animations', color: 'from-fuchsia-500 to-purple-600' }
];

export const CircleCarousel: React.FC = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  
  const rotateLeft = () => {
    setActiveIndex((prev) => (prev - 1 + CAROUSEL_ITEMS.length) % CAROUSEL_ITEMS.length);
  };
  
  const rotateRight = () => {
    setActiveIndex((prev) => (prev + 1) % CAROUSEL_ITEMS.length);
  };

  const radius = 280; // Distance of items from center

  return (
    <div className="relative w-[340px] h-[340px] flex items-center justify-center" style={{ perspective: 1200 }}>
      {/* 3D Wrapper */}
      <motion.div 
        animate={{ rotateY: -activeIndex * (360 / CAROUSEL_ITEMS.length) }}
        transition={{ type: "spring", stiffness: 120, damping: 18 }}
        style={{ transformStyle: "preserve-3d" }}
        className="relative w-full h-full flex items-center justify-center"
      >
        {CAROUSEL_ITEMS.map((item, index) => {
          const angle = index * (360 / CAROUSEL_ITEMS.length);
          const isActive = index === activeIndex;

          return (
            <motion.div
              key={item.id}
              style={{
                position: 'absolute',
                transformStyle: 'preserve-3d',
                transform: `rotateY(${angle}deg) translateZ(${radius}px)`,
              }}
              animate={{
                scale: isActive ? 1.05 : 0.85,
                opacity: isActive ? 1 : 0.4,
              }}
              transition={{ duration: 0.4 }}
              className={`w-[220px] h-[160px] p-6 rounded-2xl bg-gradient-to-br ${item.color} border border-white/20 shadow-2xl flex flex-col justify-between text-white cursor-pointer select-none`}
              onClick={() => setActiveIndex(index)}
            >
              <div>
                <h3 className="font-extrabold text-lg tracking-tight mb-2">{item.title}</h3>
                <p className="text-xs text-white/80 leading-relaxed font-sans">{item.desc}</p>
              </div>
              <div className="text-[10px] font-mono tracking-wider opacity-60">FRAME 0{item.id}</div>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Control Buttons */}
      <div className="absolute -bottom-16 flex gap-8 z-20">
        <button 
          onClick={rotateLeft}
          className="p-3 rounded-full bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 hover:border-cyan-500/50 text-white transition-all shadow-glow active:scale-95"
        >
          <ChevronLeft className="w-6 h-6 text-cyan-400" />
        </button>
        <button 
          onClick={rotateRight}
          className="p-3 rounded-full bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 hover:border-cyan-500/50 text-white transition-all shadow-glow active:scale-95"
        >
          <ChevronRight className="w-6 h-6 text-cyan-400" />
        </button>
      </div>
    </div>
  );
};
