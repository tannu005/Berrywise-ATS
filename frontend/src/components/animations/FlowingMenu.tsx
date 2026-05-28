import React, { useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { LayoutDashboard, PlusCircle, FileText, Users, X, Menu as MenuIcon, Star, Eye, EyeOff, User } from "lucide-react";
import { toast } from 'react-hot-toast';

interface FlowingMenuProps {
  activeTab: string;
  onNavigate: (tab: string) => void;
  selectedJobId: string;
  setSelectedJobId?: (id: string) => void;
  role?: string;
  setRole?: (role: string) => void;
  isBlindMode?: boolean;
  setIsBlindMode?: (val: boolean) => void;
  jobs?: any[];
}

const navItems = [
  { id: 'dashboard', name: "Dashboard", icon: <LayoutDashboard /> },
  { id: 'job-create', name: "Post Job", icon: <PlusCircle /> },
  { id: 'upload', name: "Upload", icon: <FileText />, requiresJob: true },
  { id: 'results', name: "Ratings", icon: <Users />, requiresJob: true },
  { id: 'talent-pool', name: "Talent Pool", icon: <Star /> },
  { id: 'profile', name: "Profile", icon: <User /> },
];

export const FlowingMenu: React.FC<FlowingMenuProps> = ({ 
  activeTab, 
  onNavigate, 
  selectedJobId,
  setSelectedJobId,
  role,
  setRole,
  isBlindMode,
  setIsBlindMode,
  jobs
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLightMode, setIsLightMode] = useState(false);

  React.useEffect(() => {
    const checkTheme = () => {
      setIsLightMode(document.body.classList.contains("light-theme"));
    };
    checkTheme();
    
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.body, { attributes: true, attributeFilter: ["class"] });
    
    return () => observer.disconnect();
  }, []);

  // Elegant Curtain Sweep
  const menuVariants = {
    closed: {
      x: "100%",
      transition: {
        type: "tween",
        ease: [0.76, 0, 0.24, 1],
        duration: 0.8
      }
    },
    open: {
      x: "0%",
      transition: {
        type: "tween",
        ease: [0.76, 0, 0.24, 1],
        duration: 0.8
      }
    }
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`relative z-[110] w-12 h-12 flex items-center justify-center border transition-all duration-500 rounded-full group shadow-[0_4px_20px_rgba(217,70,239,0.2)] ${
          isLightMode 
            ? "text-slate-800 bg-[#f8fafc] border-gray-200 hover:border-fuchsia-500" 
            : "text-white bg-[#0F0914] border border-white/10 hover:border-fuchsia-500"
        }`}
      >
        <span className="group-hover:scale-90 transition-transform duration-500 text-fuchsia-400">
          {isOpen ? <X size={20} strokeWidth={1.5} /> : <MenuIcon size={20} strokeWidth={1.5} />}
        </span>
      </button>

      {createPortal(
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial="closed"
              animate="open"
              exit="closed"
              variants={menuVariants}
              className="fixed inset-y-0 right-0 w-full md:w-[400px] z-[100] flex items-center justify-center pointer-events-auto font-sans"
            >
              {/* Cyber-Sunset Background Panel */}
              <div className={`absolute inset-0 border-l transition-colors duration-500 ${
                isLightMode ? "bg-[#f8fafc] border-gray-200" : "bg-[#0F0914] border-white/5"
              }`} />
              
              {/* Elegant SVG Path Morph (Curtain Edge) */}
              <svg className="absolute left-0 top-0 h-full w-[100px] -translate-x-full pointer-events-none" preserveAspectRatio="none">
                <motion.path
                  initial={{ d: "M 100 0 Q 100 500 100 1000 L 100 1000 L 100 0 Z" }}
                  animate={{ d: "M 100 0 Q 0 500 100 1000 L 100 1000 L 100 0 Z" }}
                  exit={{ d: "M 100 0 Q 100 500 100 1000 L 100 1000 L 100 0 Z" }}
                  transition={{ type: "tween", ease: [0.76, 0, 0.24, 1], duration: 0.8 }}
                  fill={isLightMode ? "#f8fafc" : "#0F0914"}
                />
              </svg>
 
              {/* Elegant Glowing Background Orbs */}
              <div className="absolute inset-0 z-[5] pointer-events-none overflow-hidden">
                <motion.div 
                  animate={{ scale: [1, 1.2, 1], opacity: isLightMode ? [0.1, 0.18, 0.1] : [0.3, 0.5, 0.3] }}
                  transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                  className={`absolute top-[10%] -right-[20%] w-64 h-64 bg-fuchsia-600/30 rounded-full blur-[60px] ${isLightMode ? "" : "mix-blend-screen"}`}
                />
                <motion.div 
                  animate={{ scale: [1, 1.3, 1], opacity: isLightMode ? [0.08, 0.15, 0.08] : [0.2, 0.4, 0.2] }}
                  transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 2 }}
                  className={`absolute bottom-[20%] -left-[30%] w-80 h-80 bg-orange-600/20 rounded-full blur-[80px] ${isLightMode ? "" : "mix-blend-screen"}`}
                />
                <motion.div 
                  animate={{ scale: [1, 1.5, 1], opacity: isLightMode ? [0.08, 0.15, 0.08] : [0.2, 0.5, 0.2] }}
                  transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 4 }}
                  className={`absolute top-[40%] left-[20%] w-48 h-48 bg-blue-600/20 rounded-full blur-[50px] ${isLightMode ? "" : "mix-blend-screen"}`}
                />
              </div>
 
              <nav className="relative z-10 flex flex-col space-y-12 w-full px-20">
                <div className={`text-[10px] font-mono tracking-[0.3em] mb-4 border-b pb-6 uppercase transition-colors duration-500 ${
                  isLightMode ? "text-slate-400 border-gray-200" : "text-slate-500 border-white/10"
                }`}>
                  Directory
                </div>
                <div className="flex flex-col space-y-2">
                  {navItems.map((item, i) => {
                    const isDisabled = item.requiresJob && !selectedJobId;
                    const isActive = activeTab === item.id;
                    
                    return (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -15 }}
                        transition={{ delay: 0.1 + i * 0.05, duration: 0.5, ease: "easeOut" }}
                      >
                        <button 
                          onClick={() => {
                            if (!isDisabled) {
                              onNavigate(item.id);
                              setIsOpen(false);
                            }
                          }}
                          className={`group flex items-center w-full transition-all duration-300 py-4 px-6 rounded-2xl relative overflow-hidden ${
                            isDisabled ? 'opacity-40 cursor-not-allowed' : (isLightMode ? 'hover:bg-slate-100' : 'hover:bg-white/[0.03]')
                          }`}
                        >
                          {/* Active State Background Highlight */}
                          {isActive && (
                            <motion.div 
                              layoutId="activeNavBackground"
                              className="absolute inset-0 bg-gradient-to-r from-fuchsia-500/10 to-transparent border-l-2 border-fuchsia-500"
                              initial={false}
                              transition={{ type: "spring", stiffness: 300, damping: 30 }}
                            />
                          )}
 
                          <div className="relative flex items-center z-10 w-full">
                            <span className={`transition-colors duration-300 mr-5 ${isActive ? 'text-fuchsia-500' : (isLightMode ? 'text-slate-400 group-hover:text-fuchsia-500' : 'text-slate-500 group-hover:text-fuchsia-300')}`}>
                              {React.cloneElement(item.icon as React.ReactElement, { className: 'h-5 w-5' })}
                            </span>
 
                            <span className={`text-[15px] font-medium tracking-wide transition-colors duration-300 ${
                              isActive 
                                ? (isLightMode ? 'text-slate-800 font-semibold' : 'text-white') 
                                : (isLightMode ? 'text-slate-500 group-hover:text-slate-800' : 'text-slate-400 group-hover:text-white')
                            }`}>
                              {item.name}
                            </span>
                            
                            {/* Subtle arrow indicator on hover/active */}
                            {!isDisabled && (
                              <span className={`ml-auto opacity-0 -translate-x-2 transition-all duration-300 font-serif ${
                                isActive ? 'opacity-100 translate-x-0 text-fuchsia-500' : `group-hover:opacity-100 group-hover:translate-x-0 ${isLightMode ? 'text-slate-400' : 'text-slate-500'}`
                              }`}>
                                &rarr;
                              </span>
                            )}
                          </div>
                        </button>
                      </motion.div>
                    );
                  })}
                </div>
                {/* Mobile controls */}
                {setSelectedJobId && setRole && setIsBlindMode && jobs && (
                  <div className={`md:hidden flex flex-col space-y-4 pt-4 border-t mt-6 z-10 ${
                    isLightMode ? 'border-gray-200' : 'border-white/10'
                  }`}>
                    <div className={`text-[10px] font-mono tracking-[0.3em] uppercase ${isLightMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      Preferences
                    </div>
                    
                    {/* Job Selector */}
                    <div className="flex flex-col space-y-1">
                      <label className={`text-xs font-semibold ${isLightMode ? 'text-slate-500' : 'text-slate-400'}`}>Active Job</label>
                      <select
                        value={selectedJobId}
                        onChange={(e) => setSelectedJobId(e.target.value)}
                        className={`w-full border rounded-xl px-3 py-1.5 focus:outline-none focus:border-fuchsia-500 text-xs cursor-pointer ${
                          isLightMode 
                            ? 'bg-slate-100 border-gray-200 text-slate-700' 
                            : 'bg-[#1a1a1a] border-gray-800 text-white'
                        }`}
                      >
                        {jobs.length === 0 ? (
                          <option value="" className={isLightMode ? 'bg-[#ffffff] text-slate-800' : 'bg-[#1a1a1a] text-white'}>No Active Jobs</option>
                        ) : (
                          jobs.map(job => (
                            <option key={job.id} value={job.id} className={isLightMode ? 'bg-[#ffffff] text-slate-800' : 'bg-[#1a1a1a] text-white'}>{job.title}</option>
                          ))
                        )}
                      </select>
                    </div>
 
                    {/* Role Selector */}
                    <div className="flex flex-col space-y-1">
                      <label className={`text-xs font-semibold ${isLightMode ? 'text-slate-500' : 'text-slate-400'}`}>Recruiter Role</label>
                      <select
                        value={role}
                        onChange={(e) => {
                          setRole(e.target.value);
                          localStorage.setItem('role', e.target.value);
                          toast.success(`Role changed to ${e.target.value}`);
                        }}
                        className={`w-full border rounded-xl px-3 py-1.5 focus:outline-none focus:border-fuchsia-500 text-xs cursor-pointer ${
                          isLightMode 
                            ? 'bg-slate-100 border-gray-200 text-slate-700' 
                            : 'bg-[#1a1a1a] border-gray-800 text-white'
                        }`}
                      >
                        <option value="Recruiter" className={isLightMode ? 'bg-[#ffffff] text-slate-800' : 'bg-[#1a1a1a] text-white'}>Recruiter</option>
                        <option value="Hiring Manager" className={isLightMode ? 'bg-[#ffffff] text-slate-800' : 'bg-[#1a1a1a] text-white'}>Hiring Manager</option>
                        <option value="Admin" className={isLightMode ? 'bg-[#ffffff] text-slate-800' : 'bg-[#1a1a1a] text-white'}>Admin</option>
                      </select>
                    </div>
 
                    {/* Blind Mode Toggle */}
                    <button
                      onClick={() => setIsBlindMode(!isBlindMode)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl border text-xs font-semibold transition-all ${
                        isBlindMode 
                          ? 'bg-fuchsia-500/20 text-fuchsia-500 border-fuchsia-500/30' 
                          : (isLightMode 
                              ? 'bg-transparent text-slate-500 border-gray-200 hover:text-slate-800 hover:bg-slate-100' 
                              : 'bg-transparent text-slate-400 border-white/10 hover:text-white hover:bg-white/5')
                      }`}
                    >
                      <span className="flex items-center gap-1.5">
                        {isBlindMode ? <EyeOff size={14} /> : <Eye size={14} />}
                        Blind Screening
                      </span>
                      <span className="text-[10px] opacity-60">{isBlindMode ? 'ON' : 'OFF'}</span>
                    </button>
                  </div>
                )}
              </nav>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
};
