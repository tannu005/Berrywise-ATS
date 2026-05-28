import React, { useState, useEffect } from 'react';
import { LayoutDashboard, PlusCircle, LogOut, Key, FileText, CheckCircle, Sun, Moon, Shield, Users, Eye, EyeOff } from 'lucide-react';
import { Toaster, toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import Dashboard from './components/Dashboard';
import JobForm from './components/JobForm';
import Upload from './components/Upload';
import Results from './components/Results';
import TalentPool from './components/TalentPool';
import { Profile } from './components/Profile';
import { CursorTrail } from './components/animations/CursorTrail';
import { TransitionOverlay } from './components/animations/TransitionOverlay';
import { FlowingMenu } from './components/animations/FlowingMenu';
import { AIGuide } from './components/animations/AIGuide';
import { io } from 'socket.io-client';
import { Job, Candidate, EvaluationData, AuditLog } from './types';

const API_URL = import.meta.env.VITE_API_URL || '/api';
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || (typeof window !== 'undefined' && window.location.hostname === 'localhost' ? 'http://localhost:5000' : '');
const GRAPHQL_URL = import.meta.env.VITE_GRAPHQL_URL || '/graphql';

function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  
  let initialUser = null;
  try {
    const storedUser = localStorage.getItem('user');
    if (storedUser && storedUser !== 'undefined') {
      initialUser = JSON.parse(storedUser);
    }
  } catch (err) {
    console.error('Failed to parse user from local storage:', err);
  }
  const [user, setUser] = useState(initialUser);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [nextTab, setNextTab] = useState('');

  const navigateToTab = (tab: string) => {
    // If they click the same tab, do nothing
    if (tab === activeTab) return;
    setNextTab(tab);
    setIsTransitioning(true);
  };

  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');
  const [role, setRole] = useState(localStorage.getItem('role') || 'Recruiter');
  const [isBlindMode, setIsBlindMode] = useState(localStorage.getItem('blindMode') === 'true');

  useEffect(() => {
    localStorage.setItem('blindMode', String(isBlindMode));
  }, [isBlindMode]);

  useEffect(() => {
    if (theme === 'light') {
      document.body.classList.add('light-theme');
    } else {
      document.body.classList.remove('light-theme');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };
  
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>('');
  const [currentJob, setCurrentJob] = useState<Job | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [evaluations, setEvaluations] = useState<EvaluationData | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  
  const [isRegistering, setIsRegistering] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  useEffect(() => {
    if (token) fetchJobs();
  }, [token]);

  useEffect(() => {
    if (token && selectedJobId) fetchJobDetails(selectedJobId);
  }, [token, selectedJobId]);

  useEffect(() => {
    if (!token) return;
    const socket = io(SOCKET_URL);
    socket.on('connect', () => console.log('Connected to real-time server'));
    socket.on('EVALUATION_COMPLETE', (data) => {
      if (data.jobId === selectedJobId) {
        toast.success(`New evaluation completed for ${data.candidateName}!`);
        refreshActiveJob();
      }
    });
    return () => socket.disconnect();
  }, [token, selectedJobId]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
      toast.error('Please enter a valid email address.');
      return;
    }

    setLoginLoading(true);

    const endpoint = isRegistering ? '/auth/register' : '/auth/login';
    const body = isRegistering ? { name, email, password } : { email, password };

    try {
      const res = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.text().then(t => { try { return t ? JSON.parse(t) : {}; } catch(e) { return {}; } });
      if (!res.ok) throw new Error(data.error || 'Login failed.');

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      setToken(data.token);
      setUser(data.user);
      toast.success(isRegistering ? 'Account created successfully!' : 'Welcome back!');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken('');
    setUser(null);
    setJobs([]);
    setSelectedJobId('');
    setCurrentJob(null);
    setCandidates([]);
    setEvaluations(null);
    setAuditLogs([]);
    setActiveTab('dashboard');
    toast.success('Logged out successfully');
  };

  const fetchJobs = async () => {
    try {
      const res = await fetch(`${API_URL}/jobs`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (res.status === 401 || res.status === 403) {
        handleLogout();
        return;
      }
      if (res.ok) {
        const data = await res.text().then(t => { try { return t ? JSON.parse(t) : {}; } catch(e) { return {}; } });
        setJobs(data);
        if (data.length > 0 && !selectedJobId) setSelectedJobId(data[0].id);
      }
    } catch (err) {
      console.error('Error fetching jobs:', err);
    }
  };

  const fetchJobDetails = async (jobId) => {
    try {
      const jobRes = await fetch(`${API_URL}/jobs/${jobId}`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (jobRes.status === 401 || jobRes.status === 403) {
        handleLogout();
        return;
      }
      if (jobRes.ok) setCurrentJob(await jobRes.text().then(t => { try { return t ? JSON.parse(t) : {}; } catch(e) { return {}; } }));

      const candRes = await fetch(`${API_URL}/candidates/job/${jobId}`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (candRes.ok) setCandidates(await candRes.text().then(t => { try { return t ? JSON.parse(t) : {}; } catch(e) { return {}; } }));

      const evalRes = await fetch(`${API_URL}/results/${jobId}`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (evalRes.ok) setEvaluations(await evalRes.text().then(t => { try { return t ? JSON.parse(t) : {}; } catch(e) { return {}; } }));
      else setEvaluations(null);

      const auditRes = await fetch(`${API_URL}/audit/${jobId}`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (auditRes.ok) setAuditLogs(await auditRes.text().then(t => { try { return t ? JSON.parse(t) : {}; } catch(e) { return {}; } }));
    } catch (err) {
      console.error('Error fetching job details:', err);
    }
  };

  const refreshActiveJob = async () => {
    if (selectedJobId) await fetchJobDetails(selectedJobId);
    await fetchJobs();
  };

  // TRUE PAGE TRANSITIONS
  const pageVariants = {
    initial: { opacity: 0, y: 15, filter: 'blur(4px)' },
    animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
    exit: { opacity: 0, y: -15, filter: 'blur(4px)' }
  };

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <Dashboard
            token={token}
            apiUrl={API_URL}
            jobId={selectedJobId}
            job={currentJob}
            candidates={candidates}
            evaluations={evaluations}
            auditLogs={auditLogs}
            refreshData={refreshActiveJob}
            setTab={setActiveTab}
            isBlindMode={isBlindMode}
          />
        );
      case 'job-create':
        return (
          <JobForm
            token={token}
            apiUrl={API_URL}
            setTab={setActiveTab}
            onSuccess={(newJobId: string) => {
              fetchJobs();
              setSelectedJobId(newJobId);
              setActiveTab('dashboard');
            }}
          />
        );
      case 'upload':
        return (
          <Upload
            token={token}
            apiUrl={API_URL}
            jobId={selectedJobId}
            job={currentJob}
            setTab={setActiveTab}
            onSuccess={() => {
              refreshActiveJob();
              setActiveTab('results');
            }}
          />
        );
      case 'results':
        return (
          <Results
            token={token}
            apiUrl={API_URL}
            jobId={selectedJobId}
            job={currentJob}
            candidates={candidates}
            evaluations={evaluations}
            refreshData={refreshActiveJob}
            setTab={setActiveTab}
            isBlindMode={isBlindMode}
          />
        );
      case 'talent-pool':
        return (
          <TalentPool 
            setTab={setActiveTab}
            isBlindMode={isBlindMode}
            evaluations={evaluations}
            jobs={jobs}
          />
        );
      case 'profile':
        return (
          <Profile
            user={user}
            jobs={jobs}
            candidates={candidates}
            setTab={setActiveTab}
            token={token}
            apiUrl={API_URL}
          />
        );
      default:
        return null;
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-[#0F0914] flex items-center justify-center p-4 font-sans selection:bg-[#6366F1]/30">
        <Toaster position="top-right" />
        <CursorTrail />
        <div className="max-w-md w-full bg-[#1A1025] p-10 rounded-3xl border border-white/5 shadow-2xl relative overflow-hidden">
          {/* Subtle Electric Indigo lighting top edge */}
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#6366F1]/60 to-transparent" />
          
          <div className="flex flex-col items-center mb-10 mt-4">
            <div className="h-16 w-16 bg-[#0F0914] rounded-3xl flex items-center justify-center border border-[#6366F1]/30 mb-6 shadow-[0_0_20px_rgba(99,102,241,0.15)] relative group">
              <Shield className="h-7 w-7 text-[#6366F1] group-hover:scale-110 transition-transform" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Berrywise</h1>
            <p className="text-xs text-slate-400 mt-1 font-medium">Recruitment Pipeline Optimizer</p>
          </div>

          <form onSubmit={handleAuth} className="space-y-6">
            {isRegistering && (
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#0F0914] border border-white/10 px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-[#6366F1] focus:ring-1 focus:ring-[#6366F1] transition-all font-sans text-sm rounded-3xl"
                  placeholder="Jane Doe"
                  required
                />
              </div>
            )}

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#0F0914] border border-white/10 px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-[#6366F1] focus:ring-1 focus:ring-[#6366F1] transition-all font-sans text-sm rounded-3xl"
                placeholder="recruiter@berrywise.com"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#0F0914] border border-white/10 px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-[#6366F1] focus:ring-1 focus:ring-[#6366F1] transition-all font-sans text-sm rounded-3xl"
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loginLoading}
              className="w-full bg-[#6366F1] hover:bg-[#4F46E5] text-white font-semibold py-3 px-4 transition-all duration-300 disabled:opacity-50 text-sm rounded-3xl shadow-[0_4px_14px_0_rgba(99,102,241,0.39)] hover:shadow-[0_6px_20px_rgba(99,102,241,0.23)] hover:-translate-y-0.5 flex items-center justify-center gap-2 mt-4"
            >
              {loginLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  <Key className="h-4 w-4" /> {isRegistering ? 'Create Account' : 'Sign In'}
                </>
              )}
            </button>
          </form>

          <div className="mt-8 text-center text-xs text-slate-500 border-t border-white/5 pt-6">
            <button 
              onClick={() => setIsRegistering(!isRegistering)}
              type="button"
              className="text-[#6366F1] hover:text-[#818CF8] font-medium transition-colors"
            >
              {isRegistering ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`app-container ${theme} font-sans bg-[#0F0914] text-slate-100 selection:bg-[#6366F1]/30 min-h-screen`}>
      <Toaster 
        position="top-right" 
        toastOptions={{
          style: {
            background: '#1A1025',
            color: '#fff',
            border: '1px solid rgba(99,102,241,0.2)',
            borderRadius: '12px'
          },
          success: {
            iconTheme: { primary: '#6366F1', secondary: '#1A1025' },
          },
        }}
      />
      
      {/* Playful Floating Orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <motion.div 
          animate={{ x: [0, 50, 0], y: [0, -50, 0] }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-40 -left-20 w-96 h-96 bg-fuchsia-600/10 rounded-full blur-[100px] mix-blend-screen"
        />
        <motion.div 
          animate={{ x: [0, -70, 0], y: [0, 60, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-10 right-10 w-[500px] h-[500px] bg-orange-600/10 rounded-full blur-[120px] mix-blend-screen"
        />
      </div>


      {/* HEADER - FLOATING ISLAND DOCK */}
      <header className="header fixed top-6 left-1/2 -translate-x-1/2 bg-[#1A1025]/60 backdrop-blur-2xl border border-white/10 px-4 py-3 flex items-center justify-between z-40 rounded-full shadow-[0_8px_32px_rgba(0,0,0,0.4)] w-[95%] max-w-6xl transition-all duration-500 hover:bg-[#1A1025]/80 hover:border-fuchsia-500/30 hover:shadow-[0_8px_32px_rgba(217,70,239,0.15)]">
        <div className="flex items-center gap-3 pl-3">
          <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-2 group cursor-pointer" onClick={(e) => { e.preventDefault(); setActiveTab('dashboard'); }}>
            <Shield className="h-5 w-5 text-fuchsia-500 group-hover:scale-110 group-hover:rotate-12 transition-transform duration-300 drop-shadow-[0_0_8px_rgba(217,70,239,0.5)]" />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-fuchsia-400 to-orange-400 tracking-wide font-sans">Berrywise</span>
          </h1>
        </div>
        
        <div className="hidden md:flex items-center gap-3 bg-[#0F0914]/80 p-1 rounded-full border border-white/5 shadow-inner absolute left-1/2 -translate-x-1/2">
           <select
              value={selectedJobId}
              onChange={(e) => setSelectedJobId(e.target.value)}
              className="bg-transparent px-4 py-1.5 text-slate-300 font-medium text-sm focus:outline-none cursor-pointer hover:text-white transition-all rounded-full hover:bg-white/5 appearance-none text-center min-w-[120px]"
            >
              {jobs.length === 0 ? (
                <option value="">No Active Jobs</option>
              ) : (
                jobs.map(job => (
                  <option key={job.id} value={job.id}>{job.title}</option>
                ))
              )}
            </select>
            <div className="w-px h-5 bg-white/10" />
            <select
              value={role}
              onChange={(e) => { setRole(e.target.value); localStorage.setItem('role', e.target.value); toast.success(`Role changed to ${e.target.value}`); }}
              className="bg-transparent px-4 py-1.5 text-fuchsia-400 font-bold text-sm focus:outline-none cursor-pointer hover:text-fuchsia-300 transition-all rounded-full hover:bg-fuchsia-500/10 appearance-none text-center"
            >
              <option value="Recruiter">Recruiter</option>
              <option value="Hiring Manager">Hiring Manager</option>
              <option value="Admin">Admin</option>
            </select>
            <div className="w-px h-5 bg-white/10" />
            <button 
              onClick={() => setIsBlindMode(!isBlindMode)}
              className={`px-3 py-1.5 rounded-full text-[11px] uppercase tracking-wider font-bold transition-all flex items-center gap-1.5 ${isBlindMode ? 'bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/30' : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'}`}
              title="Toggle Blind Screening Mode"
            >
              {isBlindMode ? <EyeOff size={14} /> : <Eye size={14} />}
              <span className="hidden lg:inline">Blind Mode</span>
            </button>
        </div>
        
        <div className="flex items-center gap-3 pr-1">
          <button onClick={toggleTheme} className="text-slate-400 hover:text-fuchsia-400 transition-colors p-2 rounded-full hover:bg-fuchsia-500/10 group" title="Toggle Theme">
            {theme === 'dark' ? <Sun className="h-4 w-4 group-hover:rotate-90 transition-transform duration-300" /> : <Moon className="h-4 w-4 group-hover:-rotate-12 transition-transform duration-300" />}
          </button>
          <div className="hidden sm:flex items-center gap-2 text-blue-400 text-[10px] font-bold px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 uppercase tracking-widest shadow-[0_0_10px_rgba(59,130,246,0.1)]">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" /> Online
          </div>
          <button onClick={handleLogout} className="text-slate-400 hover:text-rose-400 flex items-center justify-center transition-colors p-2 rounded-full hover:bg-rose-500/10" title="Sign Out">
            <LogOut className="h-4 w-4" />
          </button>
          
          <div className="pl-3 ml-1 border-l border-white/10 flex items-center">
            {/* FLOWING MENU MOVED TO HEADER */}
            <FlowingMenu 
              activeTab={activeTab} 
              onNavigate={navigateToTab} 
              selectedJobId={selectedJobId} 
              setSelectedJobId={setSelectedJobId}
              role={role}
              setRole={setRole}
              isBlindMode={isBlindMode}
              setIsBlindMode={setIsBlindMode}
              jobs={jobs}
            />
          </div>
        </div>
      </header>

      {/* BODY */}
      <div className="relative p-8 pt-32 max-w-7xl mx-auto">

        {/* Main Content with True Page Transitions */}
        <div className="main-area relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              {renderActiveTab()}
            </motion.div>
          </AnimatePresence>
        </div>

        <CursorTrail />
        <TransitionOverlay 
          isVisible={isTransitioning} 
          onMidpoint={() => setActiveTab(nextTab)} 
          onComplete={() => setIsTransitioning(false)} 
        />
      </div>

      <AIGuide apiUrl={API_URL} />
    </div>
  );
}

export default App;
