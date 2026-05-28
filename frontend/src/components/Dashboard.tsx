import React, { useEffect, useRef, useState } from 'react';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Tooltip, ResponsiveContainer } from 'recharts';
import { Users, FileCheck, ShieldAlert, Award, FileUp, Sparkles, RefreshCw, Briefcase, FileText, Settings, BrainCircuit, CheckCircle, AlertTriangle, Download, Calendar, ArrowDown, TrendingUp, CalendarCheck, ArrowRightLeft } from 'lucide-react';
import Papa from 'papaparse';
import { Job, Candidate, EvaluationData, AuditLog } from '../types';
import { toast } from 'react-hot-toast';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

interface DashboardProps {
  jobId: string;
  job: Job | null;
  candidates: Candidate[];
  evaluations: EvaluationData | null;
  auditLogs: AuditLog[];
  refreshData: () => Promise<void>;
  setTab: (tab: string) => void;
  token?: string;
  apiUrl?: string;
  isBlindMode?: boolean;
}

function Dashboard({ jobId, job, candidates, evaluations, auditLogs, refreshData, setTab, isBlindMode }: DashboardProps) {
  const [isSyncing, setIsSyncing] = useState(false);
  const containerRef = useRef(null);
  const [isLightMode, setIsLightMode] = useState(false);

  useEffect(() => {
    const checkTheme = () => {
      setIsLightMode(document.body.classList.contains("light-theme"));
    };
    checkTheme();
    
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.body, { attributes: true, attributeFilter: ["class"] });
    
    return () => observer.disconnect();
  }, []);

  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [shortlistSubject, setShortlistSubject] = useState(localStorage.getItem('shortlistSubject') || 'Great news! You have been shortlisted for {{job_title}}');
  const [shortlistBody, setShortlistBody] = useState(localStorage.getItem('shortlistBody') || 'Hi {{candidate_name}},\n\nThank you for applying. We reviewed your profile and are excited to move you forward!\n\nBest,\nRecruiter');
  const [rejectSubject, setRejectSubject] = useState(localStorage.getItem('rejectSubject') || 'Update on {{job_title}} application');
  const [rejectBody, setRejectBody] = useState(localStorage.getItem('rejectBody') || 'Hi {{candidate_name}},\n\nThank you for applying. While we were impressed by your background, we have decided to move forward with other profiles.\n\nBest,\nRecruiter');

  const handleSaveTemplates = () => {
    localStorage.setItem('shortlistSubject', shortlistSubject);
    localStorage.setItem('shortlistBody', shortlistBody);
    localStorage.setItem('rejectSubject', rejectSubject);
    localStorage.setItem('rejectBody', rejectBody);
    toast.success('Email templates saved successfully!');
    setShowTemplateModal(false);
  };

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      if (refreshData) {
        await refreshData();
      }
    } finally {
      setTimeout(() => setIsSyncing(false), 500);
    }
  };
  
  // Calculate display metrics
  const totalCount = candidates.length;
  const evaluatedCount = evaluations?.candidates?.length || 0;
  const pendingCount = totalCount - evaluatedCount;
  
  const strongMatches = evaluations?.summary?.strongMatches || 0;
  const potentialMatches = evaluations?.summary?.potentialMatches || 0;
  const poorMatches = evaluations?.summary?.poorMatches || 0;

  // AI ROI Metrics (estimated 15 minutes per manual resume screen)
  const minutesSaved = evaluatedCount * 15;
  const hoursSaved = (minutesSaved / 60).toFixed(1);

  // Prepare chart data: Radar Chart for Candidates
  const chartData = (evaluations?.candidates || []).slice(0,3).map((cand, idx) => ({
    name: isBlindMode ? `C${idx+1}` : (cand.name ? cand.name.split(' ')[0] : 'Unknown'),
    Overall: cand.scores?.overallScore || cand.overallScore || 0,
    Skill: cand.scores?.skillMatch || 0,
    Culture: cand.scores?.cultureFit || 0
  }));

  const handleDownloadCSV = () => {
    if (!evaluations?.candidates || evaluations.candidates.length === 0) return;
    
    const csvData = evaluations.candidates.map(cand => ({
      Name: cand.name,
      Status: cand.status,
      Overall_Score: cand.scores?.overallScore || 0,
      Skill_Match: cand.scores?.skillMatch || 0,
      Culture_Fit: cand.scores?.cultureFit || 0,
      Strengths: cand.strengths?.join('; ') || '',
      Gaps: cand.gaps?.join('; ') || ''
    }));

    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `candidates_ranking_${jobId}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusHue = (status: string) => {
    if (status === 'Strong Match') return '150'; // Green
    if (status === 'Good Match') return '250'; // Purple/Indigo
    if (status === 'Potential Match') return '35'; // Orange
    return '0'; // Red
  };

  const getLogIcon = (action: string) => {
    if (action === 'CREATE_JOB') return <Settings size={18} />;
    if (action === 'CANDIDATE_UPLOAD') return <FileUp size={18} />;
    if (action === 'CANDIDATE_EVALUATION') return <BrainCircuit size={18} />;
    if (action === 'STATUS_CHANGE') return <ArrowRightLeft size={18} />;
    if (action === 'INTERVIEW_SCHEDULED') return <CalendarCheck size={18} />;
    return <FileText size={18} />;
  };

  const getLogColor = (action: string) => {
    if (action === 'CREATE_JOB') return 'text-orange-400 bg-orange-500/10 border-orange-500/30';
    if (action === 'CANDIDATE_UPLOAD') return 'text-orange-400 bg-orange-500/10 border-orange-500/30';
    if (action === 'CANDIDATE_EVALUATION') return 'text-pink-400 bg-pink-500/10 border-pink-500/30';
    if (action === 'STATUS_CHANGE') return 'text-blue-400 bg-blue-500/10 border-blue-500/30';
    if (action === 'INTERVIEW_SCHEDULED') return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
    return 'text-gray-400 bg-gray-500/10 border-gray-500/30';
  };

  const CircularProgress = ({ score, hue }: { score: number, hue: string }) => {
    const radius = 24;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (score / 100) * circumference;
    
    return (
      <div className="relative flex items-center justify-center" style={{ width: 60, height: 60 }}>
        <svg className="transform -rotate-90 w-full h-full">
          <circle cx="30" cy="30" r={radius} stroke="currentColor" strokeWidth="4" fill="transparent" className="text-gray-800" />
          <circle 
            cx="30" cy="30" r={radius} 
            stroke={`hsl(${hue}, 80%, 60%)`} 
            strokeWidth="4" fill="transparent" 
            strokeDasharray={circumference} 
            strokeDashoffset={strokeDashoffset} 
            className="transition-all duration-1000 ease-out" 
            style={{ strokeLinecap: 'round' }}
          />
        </svg>
        <span className="absolute text-sm font-bold text-white">{score}%</span>
      </div>
    );
  };

  useEffect(() => {
    if (!containerRef.current) return;
    
    const ctx = gsap.context(() => {
      // Animate left column elements
      gsap.from('.main__heading, .main__desc, .main__sub', {
        y: 20,
        opacity: 0,
        duration: 0.6,
        stagger: 0.1,
        ease: 'power3.out'
      });

      // Animate audit logs
      gsap.from('.main__list-item', {
        x: -20,
        opacity: 0,
        duration: 0.5,
        stagger: 0.08,
        ease: 'power2.out',
        delay: 0.3
      });

      // Animate right column cards
      gsap.from('.main__card', {
        y: 40,
        opacity: 0,
        duration: 0.8,
        stagger: 0.15,
        ease: 'back.out(1.2)',
        delay: 0.2
      });

      // Animate crossing banner and bottom places
      gsap.from('.main__crossing-container, .main__discover-place', {
        y: 30,
        opacity: 0,
        duration: 0.7,
        stagger: 0.1,
        ease: 'power3.out',
        delay: 0.5
      });

      // Parallax & Scroll Reveal
      const cards = gsap.utils.toArray('.main__card');
      cards.forEach((card: any, i) => {
        gsap.from(card, {
          scrollTrigger: {
            trigger: card,
            start: "top bottom-=50",
            toggleActions: "play none none reverse"
          },
          y: 50,
          opacity: 0,
          duration: 0.6,
          ease: "back.out(1.2)"
        });
      });

      const auditItems = gsap.utils.toArray('.main__list-item');
      auditItems.forEach((item: any, i) => {
        gsap.from(item, {
          scrollTrigger: {
            trigger: item,
            start: "top bottom-=20",
            toggleActions: "play none none reverse"
          },
          x: -30,
          opacity: 0,
          duration: 0.5,
          ease: "power2.out"
        });
      });

    }, containerRef);
    
    return () => ctx.revert(); // Cleanup on unmount
  }, [jobId, evaluations]);

  if (!jobId) {
    return (
      <div className="main-area" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div className="w-full max-w-4xl mx-auto space-y-8">
          
          <div className="glass-panel rounded-3xl p-10 text-center space-y-5">
            <div className="inline-flex p-4 rounded-full bg-fuchsia-500/10 text-fuchsia-400 border border-fuchsia-500/20">
              <Users className="h-8 w-8" />
            </div>
            <h3 className="text-2xl font-bold text-white font-['Poppins']">Welcome to AI Recruiter Pipeline</h3>
            <p className="text-gray-400 text-sm max-w-xl mx-auto">
              Automate your recruitment process. The system scores candidates against job requirements to find the perfect fit faster than ever.
            </p>
            <button
              onClick={() => setTab('job-create')}
              className="bg-fuchsia-500 hover:bg-fuchsia-600 text-white font-semibold py-2.5 px-8 rounded-3xl transition-all shadow-[0_4px_20px_rgba(99,102,241,0.2)] mt-2"
            >
              Start by Creating a Job
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              { step: '1', title: 'Post Job', desc: 'Define requirements and skills.', icon: <Briefcase className="text-fuchsia-400 w-5 h-5"/> },
              { step: '2', title: 'Upload', desc: 'Ingest candidate resumes securely.', icon: <FileUp className="text-fuchsia-400 w-5 h-5"/> },
              { step: '3', title: 'AI Rank', desc: 'Score and evaluate instantly.', icon: <BrainCircuit className="text-fuchsia-400 w-5 h-5"/> },
              { step: '4', title: 'Review', desc: 'Get insights and interview kits.', icon: <CheckCircle className="text-fuchsia-400 w-5 h-5"/> }
            ].map(s => (
              <div key={s.step} className="glass-panel p-5 rounded-3xl border border-slate-800/50 text-center relative overflow-hidden">
                <div className={`absolute -top-3 -right-3 text-5xl font-black transition-colors duration-300 ${
                  isLightMode ? "text-fuchsia-600/30" : "text-fuchsia-500/20"
                }`}>{s.step}</div>
                <div className="bg-fuchsia-500/10 w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-3 border border-fuchsia-500/20">
                  {s.icon}
                </div>
                <h4 className="text-white font-bold mb-1 font-['Poppins']">{s.title}</h4>
                <p className="text-gray-400 text-xs">{s.desc}</p>
              </div>
            ))}
          </div>
          
        </div>
      </div>
    );
  }

  return (
    <div className="main-grid" ref={containerRef}>
      
      {/* COL-1: Information & Lists */}
      <div className="main__col-1">
        
        {/* HEADING */}
        <div>
          <h2 className="main__heading">
            <span style={{ background: 'linear-gradient(to bottom, hsl(247, 88%, 70%), hsl(282, 82%, 51%))', boxShadow: '0 2px 12px hsla(247, 88%, 70%, .3)' }}>
              <Briefcase stroke="#fff" size={24} />
            </span> 
            {job?.title || 'Loading Job...'}
          </h2>
          <p className="main__desc">{job?.description || 'Review candidate pipeline and insights.'}</p>
          <p className="main__sub" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            <span style={{ fontWeight: 'bold' }}>Requirements: </span> 
            <span>{job?.requirements?.skills?.join(', ') || 'N/A'}</span>
          </p>
        </div>

        {/* CROSSING (Metrics) */}
        <div className="main__crossing-container mt-6">
          <div className="main__crossing-image bg-fuchsia-500/20 text-fuchsia-400 flex items-center justify-center border border-fuchsia-500/30" style={{ width: 70, height: 70, borderRadius: 16 }}>
            <Sparkles size={32} />
          </div>
          <div className="main__crossing-current">
            <p className="main__crossing-upper">ROI Metrics</p>
            <h3 className="main__crossing-heading text-white">{hoursSaved} Hrs Saved by AI</h3>
            <p className="text-[11px] text-gray-500 mt-1 flex items-center gap-1">
              <Calendar className="w-3 h-3" /> Avg. Time to Fill: {job?.createdAt ? Math.floor((Date.now() - new Date(job.createdAt).getTime()) / 86400000) : 'N/A'} days
            </p>
          </div>
        </div>

        {/* DISCOVER (Pipeline Funnel) */}
        <div className="main__discover mt-6">
          <div className="main__discover-heading-container mb-4 flex items-center justify-between">
            <h3 className="main__discover-heading ss-heading text-sm flex items-center gap-2"><TrendingUp className="w-4 h-4 text-fuchsia-400" /> Pipeline Funnel</h3>
          </div>

          <div className="space-y-2">
            {/* Total */}
            <div className="relative">
              <div className="bg-fuchsia-500/15 border border-fuchsia-500/20 rounded-xl px-4 py-2.5 flex items-center justify-between" style={{ width: '100%' }}>
                <span className="text-xs font-semibold text-fuchsia-300">Total Candidates</span>
                <span className="text-sm font-extrabold text-white">{totalCount}</span>
              </div>
            </div>
            {/* Evaluated */}
            <div className="flex items-center gap-2">
              <ArrowDown className="w-3 h-3 text-gray-600 shrink-0" />
              <div className="bg-teal-500/15 border border-teal-500/20 rounded-xl px-4 py-2.5 flex items-center justify-between" style={{ width: totalCount > 0 ? `${Math.max((evaluatedCount / totalCount) * 100, 30)}%` : '30%' }}>
                <span className="text-xs font-semibold text-teal-300">Evaluated</span>
                <span className="text-sm font-extrabold text-white">{evaluatedCount}</span>
              </div>
            </div>
            {/* Strong */}
            <div className="flex items-center gap-2">
              <ArrowDown className="w-3 h-3 text-gray-600 shrink-0" />
              <div className="bg-emerald-500/15 border border-emerald-500/20 rounded-xl px-4 py-2.5 flex items-center justify-between" style={{ width: evaluatedCount > 0 ? `${Math.max((strongMatches / evaluatedCount) * 100, 25)}%` : '25%' }}>
                <span className="text-xs font-semibold text-emerald-300">Strong</span>
                <span className="text-sm font-extrabold text-white">{strongMatches}</span>
              </div>
            </div>
            {/* Pending */}
            <div className="flex items-center gap-2">
              <ArrowDown className="w-3 h-3 text-gray-600 shrink-0" />
              <div className="bg-amber-500/15 border border-amber-500/20 rounded-xl px-4 py-2.5 flex items-center justify-between" style={{ width: '40%' }}>
                <span className="text-xs font-semibold text-amber-300">Pending</span>
                <span className="text-sm font-extrabold text-white">{pendingCount}</span>
              </div>
            </div>
          </div>

          {/* Conversion Rates */}
          <div className="mt-3 flex items-center gap-4 text-[10px] text-gray-500 font-medium px-1">
            <span>Eval Rate: {totalCount > 0 ? Math.round((evaluatedCount / totalCount) * 100) : 0}%</span>
            <span>•</span>
            <span>Match Rate: {evaluatedCount > 0 ? Math.round((strongMatches / evaluatedCount) * 100) : 0}%</span>
          </div>
        </div>

        {/* AUTOMATIONS PANEL */}
        <div className="mt-6 glass-panel rounded-3xl p-5 border border-slate-800/50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-white ml-1 flex items-center gap-2">
              <Settings className="w-4 h-4 text-fuchsia-400" /> Auto-Comms Rules
            </h3>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setShowTemplateModal(true)}
                className="text-[10px] bg-fuchsia-500/10 hover:bg-fuchsia-500/20 text-fuchsia-400 border border-fuchsia-500/20 px-2.5 py-1 rounded-lg transition-all font-bold cursor-pointer"
              >
                Templates
              </button>
              <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-bold">ACTIVE</span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between bg-[#1a1a1a]/50 p-2.5 rounded-xl border border-gray-800/50">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <span className="text-xs text-gray-300 font-medium">Score &gt; 85%</span>
              </div>
              <span className="text-[10px] text-gray-500">Auto-schedule interview</span>
            </div>
            <div className="flex items-center justify-between bg-[#1a1a1a]/50 p-2.5 rounded-xl border border-gray-800/50">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                <span className="text-xs text-gray-300 font-medium">Score &lt; 40%</span>
              </div>
              <span className="text-[10px] text-gray-500">Auto-reject email</span>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between px-1">
            <span className="text-[11px] text-gray-500 font-medium">{strongMatches + poorMatches} emails pending approval</span>
            <button onClick={() => {
              if (poorMatches === 0) {
                toast.success('No candidates less than 40%');
              } else {
                toast.success(`Auto-rejecting ${poorMatches} candidates with < 40% score`);
              }
            }} className="text-[10px] text-fuchsia-400 hover:text-fuchsia-300 font-bold transition-colors">Review Queue &rarr;</button>
          </div>
        </div>

        {/* RADAR CHART (Candidate Comparison View) */}
        {evaluatedCount > 0 && (
          <div className="mt-6 glass-panel rounded-3xl p-4 border border-slate-800/50">
            <h3 className="text-sm font-bold text-white mb-2 ml-2">Top 3 Comparison</h3>
            <div style={{ width: '100%', height: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={chartData}>
                  <PolarGrid stroke={document.body.classList.contains('light-theme') ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.1)'} />
                  <PolarAngleAxis dataKey="name" tick={{ fill: document.body.classList.contains('light-theme') ? '#1e293b' : '#9ca3af', fontSize: 10 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                  <Radar name="Overall" dataKey="Overall" stroke="#0d9488" fill="#0d9488" fillOpacity={0.4} />
                  <Radar name="Skill" dataKey="Skill" stroke="#6ee7b7" fill="#6ee7b7" fillOpacity={0.2} />
                  <Tooltip contentStyle={{ backgroundColor: document.body.classList.contains('light-theme') ? '#ffffff' : '#222222', border: `1px solid ${document.body.classList.contains('light-theme') ? '#e2e8f0' : '#333333'}`, borderRadius: '8px', color: document.body.classList.contains('light-theme') ? '#1e293b' : '#fff', fontSize: '12px' }} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {/* COL-2: Cards & Visuals */}
      <div className="main__col-2">

        {/* CARDS (Top Candidates) */}
        <div className="main__cards-container">
          <div className="main__cards-container-heading-wrap flex items-center justify-between">
            <h2 className="main__cards-container-heading ss-heading">Top Ranked Candidates</h2>
            <div className="flex gap-2">
              <button onClick={handleDownloadCSV} className="ss-show bg-transparent border border-slate-700 hover:border-fuchsia-500 rounded px-2 py-1 cursor-pointer flex items-center gap-1 text-xs text-gray-300">
                <Download size={12} /> CSV
              </button>
              <button onClick={() => setTab('results')} className="ss-show bg-transparent border-none cursor-pointer text-fuchsia-400">view all</button>
            </div>
          </div>

          <ul className="main__cards">
            {evaluatedCount === 0 ? (
              <div className="glass-panel rounded-3xl p-10 text-center space-y-5 col-span-full h-80 flex flex-col items-center justify-center border-dashed border-2 border-slate-700/50">
                <div className="w-16 h-16 rounded-full bg-fuchsia-500/10 text-fuchsia-400 flex items-center justify-center mb-2 shadow-[0_4px_20px_rgba(99,102,241,0.2)]">
                  <FileUp size={32} />
                </div>
                <h3 className="text-lg font-bold text-white">No Pipeline Data</h3>
                <p className="text-gray-400 text-sm max-w-xs mx-auto">Your candidate ranking board is empty. Upload resumes to see the AI generate insights.</p>
                <button onClick={() => setTab('upload')} className="bg-gradient-to-r from-fuchsia-500 to-emerald-600 hover:from-fuchsia-400 hover:to-emerald-500 text-white font-bold py-2.5 px-6 rounded-3xl text-sm transition-all shadow-[0_4px_20px_rgba(99,102,241,0.2)] mt-4">Begin Screening</button>
              </div>
            ) : (
              (evaluations?.candidates || []).slice(0, 3).map((cand, idx) => {
                const hue = getStatusHue(cand.status);
                const displayName = isBlindMode ? `Candidate #${cand.candidateId?.slice(0,4)?.toUpperCase() || 'XXX'}` : cand.name;
                return (
                  <li key={cand.candidateId} className="main__card" style={{ '--hue': hue } as React.CSSProperties}>
                    <div className="main__card-inner">
                      {/* Front of Card */}
                      <div className="main__card-front flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-[#1a1a1a] flex items-center justify-center border border-slate-800 text-lg font-bold" style={{ color: `hsl(${hue}, 80%, 60%)` }}>
                            #{idx + 1}
                          </div>
                          <div>
                            <h3 className="text-lg font-bold text-white">{displayName}</h3>
                            <div className="inline-block mt-1 px-2 py-0.5 rounded text-xs font-semibold" style={{ backgroundColor: `hsla(${hue}, 80%, 60%, 0.15)`, color: `hsl(${hue}, 80%, 70%)`, border: `1px solid hsla(${hue}, 80%, 60%, 0.3)` }}>
                              {cand.status}
                            </div>
                          </div>
                        </div>
                        <CircularProgress score={cand.scores?.overallScore || cand.overallScore || 0} hue={hue} />
                      </div>

                      {/* Back of Card */}
                      <div className="main__card-back">
                        <h4 className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-2">Top Strength</h4>
                        <p className="text-sm text-emerald-400 font-medium leading-snug mb-3">
                          <CheckCircle className="inline w-3 h-3 mr-1" />
                          {cand.strengths?.[0] || 'No major strengths identified.'}
                        </p>
                        <h4 className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-2">Top Gap</h4>
                        <p className="text-sm text-orange-400 font-medium leading-snug">
                          <AlertTriangle className="inline w-3 h-3 mr-1" />
                          {cand.gaps?.[0] || 'No major gaps identified.'}
                        </p>
                      </div>
                    </div>
                  </li>
                );
              })
            )}
          </ul>
        </div>

      </div>

      {/* COL-3: Audit Trail */}
      <div className="main__col-3">
        {/* LIST (Audit Logs) */}
        <div className="main__list-heading-wrap">
          <h2 className="main__list-heading ss-heading">Audit Trail</h2>
          <button onClick={handleSync} className="ss-show bg-transparent border-none cursor-pointer flex items-center gap-1">
            <RefreshCw size={12} className={isSyncing ? 'animate-spin' : ''} /> {isSyncing ? 'syncing...' : 'sync logs'}
          </button>
        </div>

        <div className="relative pl-2 mt-4">
          <div className="absolute left-[26px] top-4 bottom-4 w-px bg-gradient-to-b from-fuchsia-500/50 via-orange-500/20 to-transparent"></div>
          <ul className="space-y-6">
            {auditLogs.length === 0 ? (
              <li className="main__list-item justify-center text-gray-500 text-sm py-8">
                No recent activity logs.
              </li>
            ) : (
              auditLogs.slice(0, 6).map(log => (
                <li key={log.id} className="main__list-item flex items-start gap-4 relative glass-panel-hover">
                  <div className={`z-10 flex items-center justify-center w-10 h-10 rounded-full border shadow-[0_4px_20px_rgba(99,102,241,0.2)] shrink-0 ${getLogColor(log.action)}`}>
                    {getLogIcon(log.action)}
                  </div>
                  <div className="pt-1 flex-1">
                    <p className="text-white font-semibold text-[15px]">
                      {log.action === 'CREATE_JOB' && 'Job Posting Configured'}
                      {log.action === 'CANDIDATE_UPLOAD' && `Resume Ingested: ${log.details?.candidateName || 'Unknown'}`}
                      {log.action === 'CANDIDATE_EVALUATION' && `AI Evaluation Scored: ${log.details?.candidateName || 'Unknown'}`}
                      {log.action === 'STATUS_CHANGE' && `Status Changed: ${log.details?.candidateName || 'Unknown'}`}
                      {log.action === 'INTERVIEW_SCHEDULED' && `Interview Scheduled: ${log.details?.candidateName || 'Unknown'}`}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-gray-400 text-xs">{new Date(log.timestamp).toLocaleString()}</p>
                      <span className="text-[9px] bg-gray-800 text-gray-400 px-1.5 py-0.5 rounded font-medium">by Recruiter</span>
                    </div>
                  </div>
                </li>
              ))
            )}
          </ul>
        </div>
      </div>
      {showTemplateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0a0a0a]/80 backdrop-blur-sm">
          <div className="bg-[#1a1a1a] border border-gray-800 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="flex justify-between items-center p-5 border-b border-gray-800 bg-[#0F0914]/50">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Settings className="h-5 w-5 text-fuchsia-400" /> Manage Email Templates
              </h3>
              <button 
                onClick={() => setShowTemplateModal(false)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-6">
              <div className="p-4 rounded-xl bg-fuchsia-500/5 border border-fuchsia-500/10">
                <p className="text-xs text-fuchsia-300 leading-relaxed font-medium">
                  Use placeholders like <code className="bg-black/35 px-1 py-0.5 rounded text-white font-mono">{"{{candidate_name}}"}</code> and <code className="bg-black/35 px-1 py-0.5 rounded text-white font-mono">{"{{job_title}}"}</code> to insert dynamic details automatically.
                </p>
              </div>

              {/* Shortlist Template */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-teal-400 uppercase tracking-widest border-b border-gray-800 pb-2">Shortlist / Schedule Template</h4>
                <div>
                  <label className="text-xs font-semibold text-gray-400 block mb-1">Email Subject</label>
                  <input
                    type="text"
                    value={shortlistSubject}
                    onChange={(e) => setShortlistSubject(e.target.value)}
                    className="w-full bg-[#222222] border border-gray-800 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-teal-500 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-400 block mb-1">Email Body</label>
                  <textarea
                    rows={4}
                    value={shortlistBody}
                    onChange={(e) => setShortlistBody(e.target.value)}
                    className="w-full bg-[#222222] border border-gray-800 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-teal-500 text-sm font-sans"
                  />
                </div>
              </div>

              {/* Reject Template */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-rose-400 uppercase tracking-widest border-b border-gray-800 pb-2">Rejection Template</h4>
                <div>
                  <label className="text-xs font-semibold text-gray-400 block mb-1">Email Subject</label>
                  <input
                    type="text"
                    value={rejectSubject}
                    onChange={(e) => setRejectSubject(e.target.value)}
                    className="w-full bg-[#222222] border border-gray-800 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-rose-500 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-400 block mb-1">Email Body</label>
                  <textarea
                    rows={4}
                    value={rejectBody}
                    onChange={(e) => setRejectBody(e.target.value)}
                    className="w-full bg-[#222222] border border-gray-800 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-rose-500 text-sm font-sans"
                  />
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-gray-800 bg-[#222222] flex justify-end gap-2">
              <button 
                onClick={() => setShowTemplateModal(false)}
                className="text-gray-400 hover:text-white px-4 py-2 rounded-lg text-sm transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveTemplates}
                className="bg-fuchsia-500 hover:bg-fuchsia-600 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all"
              >
                Save Templates
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
