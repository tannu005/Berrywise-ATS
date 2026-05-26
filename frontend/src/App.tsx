import React, { useState, useEffect, useRef } from 'react';
import { Briefcase, Users, LayoutDashboard, PlusCircle, LogOut, Key, FileText, CheckCircle, Sun, Moon, Shield, Menu, X } from 'lucide-react';
import { Toaster, toast } from 'react-hot-toast';
import gsap from 'gsap';
import Dashboard from './components/Dashboard';
import JobForm from './components/JobForm';
import Upload from './components/Upload';
import Results from './components/Results';
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
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');
  const [role, setRole] = useState(localStorage.getItem('role') || 'Recruiter');
  const pageRef = useRef(null);

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
  
  // App context states
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>('');
  const [currentJob, setCurrentJob] = useState<Job | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [evaluations, setEvaluations] = useState<EvaluationData | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  
  // Login form state
  const [isRegistering, setIsRegistering] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // Auto-fetch jobs if token exists
  useEffect(() => {
    if (token) {
      fetchJobs();
    }
  }, [token]);

  // Auto-fetch details if active job changes
  useEffect(() => {
    if (token && selectedJobId) {
      fetchJobDetails(selectedJobId);
    }
  }, [token, selectedJobId]);

  // Socket.io integration for real-time updates
  useEffect(() => {
    if (!token) return;
    const socket = io(SOCKET_URL);
    
    socket.on('connect', () => {
      console.log('Connected to real-time server');
    });

    socket.on('EVALUATION_COMPLETE', (data) => {
      if (data.jobId === selectedJobId) {
        toast.success(`New evaluation completed for ${data.candidateName}!`);
        refreshActiveJob();
      }
    });

    return () => socket.disconnect();
  }, [token, selectedJobId]);

  // Page Transition Animation
  useEffect(() => {
    if (pageRef.current) {
      gsap.fromTo(pageRef.current, 
        { opacity: 0, y: 10, filter: 'blur(4px)' }, 
        { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.4, ease: 'power2.out' }
      );
    }
  }, [activeTab]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);

    const endpoint = isRegistering ? '/auth/register' : '/auth/login';
    const body = isRegistering ? { name, email, password } : { email, password };

    try {
      const res = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Login failed.');
      }

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
      const res = await fetch(`${API_URL}/jobs`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setJobs(data);
        if (data.length > 0 && !selectedJobId) {
          setSelectedJobId(data[0].id);
        }
      }
    } catch (err) {
      console.error('Error fetching jobs:', err);
    }
  };

  const fetchJobDetails = async (jobId) => {
    try {
      // 1. Fetch Job Info
      const jobRes = await fetch(`${API_URL}/jobs/${jobId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (jobRes.ok) {
        const jobData = await jobRes.json();
        setCurrentJob(jobData);
      }

      // 2. Fetch Candidates
      const candRes = await fetch(`${API_URL}/candidates/job/${jobId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (candRes.ok) {
        const candData = await candRes.json();
        setCandidates(candData);
      }

      // 3. Fetch Evaluation results
      const evalRes = await fetch(`${API_URL}/results/${jobId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (evalRes.ok) {
        const evalData = await evalRes.json();
        setEvaluations(evalData);
      } else {
        setEvaluations(null); // No evaluations run yet
      }

      // 4. Fetch Audit logs
      const auditRes = await fetch(`${API_URL}/audit/${jobId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (auditRes.ok) {
        const auditData = await auditRes.json();
        setAuditLogs(auditData);
      }
    } catch (err) {
      console.error('Error fetching job details:', err);
    }
  };

  // Re-fetch all active job stats
  const refreshActiveJob = async () => {
    if (selectedJobId) {
      await fetchJobDetails(selectedJobId);
    }
    await fetchJobs();
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-[#111111] flex items-center justify-center p-4 selection-teal font-sans">
        <Toaster position="top-right" />
        <div className="max-w-md w-full bg-[#1a1a1a] p-8 rounded-2xl shadow-glow border border-gray-850">
          <div className="flex flex-col items-center mb-8">
            <div className="h-16 w-16 bg-gradient-to-br from-teal-500 to-teal-700 rounded-full flex items-center justify-center shadow-lg border border-teal-400/30 mb-4 animate-float">
              <Shield className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white font-sans">Berrywise</h1>
            <p className="text-sm text-gray-400 mt-1">Recruitment Pipeline Optimizer</p>
          </div>

          <form onSubmit={handleAuth} className="space-y-5">
            {isRegistering && (
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#222222] border border-gray-700/60 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all font-sans text-sm"
                  placeholder="Jane Doe"
                  required
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#222222] border border-gray-700/60 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all font-sans text-sm"
                placeholder="recruiter@berrywise.com"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#222222] border border-gray-700/60 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all font-sans text-sm"
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loginLoading}
              className="w-full bg-gradient-to-r from-teal-500 to-rose-600 hover:from-teal-600 hover:to-rose-700 text-white font-semibold py-3 px-4 rounded-xl transition-all shadow-glow hover:shadow-lg disabled:opacity-50 text-sm font-sans flex items-center justify-center gap-2"
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

          <div className="mt-6 text-center text-xs text-gray-500 border-t border-gray-800/60 pt-4">
            <button 
              onClick={() => setIsRegistering(!isRegistering)}
              type="button"
              className="text-teal-400 hover:text-teal-300 font-medium transition-all"
            >
              {isRegistering ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`app-container ${theme} font-sans`}>
      <Toaster 
        position="top-right" 
        toastOptions={{
          style: {
            background: '#222222',
            color: '#fff',
            border: '1px solid rgba(79, 70, 229, 0.2)'
          },
          success: {
            iconTheme: {
              primary: '#34d399',
              secondary: '#222222',
            },
          },
        }}
      />
      
      {/* HEADER */}
      <header className="header">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsMenuOpen(!isMenuOpen)} 
            className="text-gray-400 hover:text-white transition-colors p-2 z-50 relative"
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
          <h1 className="header__heading">
            <a href="#" onClick={(e) => { e.preventDefault(); setActiveTab('dashboard'); }}>DI Pipeline</a>
          </h1>
        </div>
        
        <div className="header__search flex gap-3">
           <select
              value={selectedJobId}
              onChange={(e) => setSelectedJobId(e.target.value)}
              className="w-full bg-[#222222] border border-gray-800 rounded-xl px-4 py-2 text-white font-sans text-sm focus:outline-none focus:border-teal-500"
            >
              {jobs.length === 0 ? (
                <option value="">No Active Jobs</option>
              ) : (
                jobs.map(job => (
                  <option key={job.id} value={job.id}>{job.title}</option>
                ))
              )}
            </select>
            
            {/* RBAC Fake Dropdown */}
            <select
              value={role}
              onChange={(e) => { setRole(e.target.value); localStorage.setItem('role', e.target.value); toast.success(`Role changed to ${e.target.value}`); }}
              className="bg-[#222222] border border-gray-800 rounded-xl px-4 py-2 text-white font-sans text-sm focus:outline-none focus:border-teal-500 max-w-[150px]"
            >
              <option value="Recruiter">Recruiter</option>
              <option value="Hiring Manager">Hiring Manager</option>
              <option value="Admin">Admin</option>
            </select>
        </div>
        
        <div className="header__options">
          <button onClick={toggleTheme} className="text-gray-400 hover:text-teal-400 p-2 rounded transition-colors">
            {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
          <div className="flex items-center gap-1 bg-green-500/10 text-green-400 text-xs px-2 py-1 rounded font-mono border border-green-500/20">
            <CheckCircle className="h-3 w-3" /> Online
          </div>
          <button onClick={handleLogout} className="text-gray-400 hover:text-red-400 flex items-center gap-2 text-sm font-semibold transition-colors">
            <LogOut className="h-4 w-4" /> Log out
          </button>
        </div>
      </header>

      {/* BODY */}
      <div className="body">

        {/* SIDEBAR */}
        <div className={`sidebar-container ${isMenuOpen ? 'menu-open' : ''}`}>
          <section className="menu-foldout">
            <nav>
              <ul>
                <li 
                  className={activeTab === 'dashboard' ? 'active' : ''}
                  onClick={() => { setActiveTab('dashboard'); setIsMenuOpen(false); }}
                >
                  <span><LayoutDashboard className="h-5 w-5 mr-3" /> Dashboard</span>
                </li>
                <li 
                  className={activeTab === 'job-create' ? 'active' : ''}
                  onClick={() => { setActiveTab('job-create'); setIsMenuOpen(false); }}
                >
                  <span><PlusCircle className="h-5 w-5 mr-3" /> Post Job</span>
                </li>
                <li 
                  className={`${activeTab === 'upload' ? 'active' : ''} ${!selectedJobId ? 'disabled' : ''}`}
                  onClick={() => { if (selectedJobId) { setActiveTab('upload'); setIsMenuOpen(false); } }}
                >
                  <span><FileText className="h-5 w-5 mr-3" /> Upload</span>
                </li>
                <li 
                  className={`${activeTab === 'results' ? 'active' : ''} ${!selectedJobId ? 'disabled' : ''}`}
                  onClick={() => { if (selectedJobId) { setActiveTab('results'); setIsMenuOpen(false); } }}
                >
                  <span><Users className="h-5 w-5 mr-3" /> Ratings</span>
                </li>
              </ul>
            </nav>
          </section>
        </div>

        {/* Main Content */}
        <div className="main-area" ref={pageRef}>
        {activeTab === 'dashboard' && (
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
          />
        )}
        
        {activeTab === 'job-create' && (
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
        )}

        {activeTab === 'upload' && (
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
        )}

        {activeTab === 'results' && (
          <Results
            token={token}
            apiUrl={API_URL}
            jobId={selectedJobId}
            job={currentJob}
            candidates={candidates}
            evaluations={evaluations}
            refreshData={refreshActiveJob}
            setTab={setActiveTab}
          />
        )}
        </div>
      </div>
    </div>
  );
}

export default App;
