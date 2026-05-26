import React, { useEffect, useRef, useState } from 'react';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Tooltip, ResponsiveContainer } from 'recharts';
import { Users, FileCheck, ShieldAlert, Award, FileUp, Sparkles, RefreshCw, Briefcase, FileText, Settings, BrainCircuit, CheckCircle, AlertTriangle, Download } from 'lucide-react';
import Papa from 'papaparse';
import { Job, Candidate, EvaluationData, AuditLog } from '../types';
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
}

function Dashboard({ jobId, job, candidates, evaluations, auditLogs, refreshData, setTab }: DashboardProps) {
  const [isSyncing, setIsSyncing] = useState(false);
  const containerRef = useRef(null);

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
  const chartData = (evaluations?.candidates || []).slice(0,3).map(cand => ({
    name: cand.name ? cand.name.split(' ')[0] : 'Unknown',
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

  const getLogIcon = (action) => {
    if (action === 'CREATE_JOB') return <Settings size={18} />;
    if (action === 'CANDIDATE_UPLOAD') return <FileUp size={18} />;
    if (action === 'CANDIDATE_EVALUATION') return <BrainCircuit size={18} />;
    return <FileText size={18} />;
  };

  const getLogColor = (action) => {
    if (action === 'CREATE_JOB') return 'text-blue-400 bg-blue-500/10 border-blue-500/30';
    if (action === 'CANDIDATE_UPLOAD') return 'text-rose-400 bg-rose-500/10 border-rose-500/30';
    if (action === 'CANDIDATE_EVALUATION') return 'text-pink-400 bg-pink-500/10 border-pink-500/30';
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
      cards.forEach((card, i) => {
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
      auditItems.forEach((item, i) => {
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
          
          <div className="glass-panel rounded-2xl p-10 text-center space-y-5">
            <div className="inline-flex p-4 rounded-full bg-teal-500/10 text-teal-400 border border-teal-500/20">
              <Users className="h-8 w-8" />
            </div>
            <h3 className="text-2xl font-bold text-white font-['Poppins']">Welcome to AI Recruiter Pipeline</h3>
            <p className="text-gray-400 text-sm max-w-xl mx-auto">
              Automate your recruitment process. The system scores candidates against job requirements to find the perfect fit faster than ever.
            </p>
            <button
              onClick={() => setTab('job-create')}
              className="bg-teal-500 hover:bg-teal-600 text-white font-semibold py-2.5 px-8 rounded-xl transition-all shadow-glow mt-2"
            >
              Start by Creating a Job
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              { step: '1', title: 'Post Job', desc: 'Define requirements and skills.', icon: <Briefcase className="text-teal-400 w-5 h-5"/> },
              { step: '2', title: 'Upload', desc: 'Ingest candidate resumes securely.', icon: <FileUp className="text-teal-400 w-5 h-5"/> },
              { step: '3', title: 'AI Rank', desc: 'Score and evaluate instantly.', icon: <BrainCircuit className="text-teal-400 w-5 h-5"/> },
              { step: '4', title: 'Review', desc: 'Get insights and interview kits.', icon: <CheckCircle className="text-teal-400 w-5 h-5"/> }
            ].map(s => (
              <div key={s.step} className="glass-panel p-5 rounded-xl border border-gray-800/50 text-center relative overflow-hidden">
                <div className="absolute -top-3 -right-3 text-5xl font-black text-gray-800/20">{s.step}</div>
                <div className="bg-teal-500/10 w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-3 border border-teal-500/20">
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
          <div className="main__crossing-image bg-teal-500/20 text-teal-400 flex items-center justify-center border border-teal-500/30" style={{ width: 70, height: 70, borderRadius: 16 }}>
            <Sparkles size={32} />
          </div>
          <div className="main__crossing-current">
            <p className="main__crossing-upper">ROI Metrics</p>
            <h3 className="main__crossing-heading text-white">{hoursSaved} Hrs Saved by AI</h3>
          </div>
        </div>

        {/* DISCOVER (Extra Stats) - Adjusting to vertical for col 1 */}
        <div className="main__discover mt-6">
          <div className="main__discover-heading-container mb-4">
            <h3 className="main__discover-heading ss-heading text-sm">Pipeline Statistics</h3>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="glass-panel p-4 rounded-xl text-center border-gray-800">
              <Users className="h-6 w-6 text-teal-400 mx-auto mb-2" />
              <h4 className="font-bold text-white text-lg">{totalCount}</h4>
              <p className="text-xs text-gray-400">Total Pool</p>
            </div>
            <div className="glass-panel p-4 rounded-xl text-center border-gray-800">
              <ShieldAlert className="h-6 w-6 text-amber-400 mx-auto mb-2" />
              <h4 className="font-bold text-white text-lg">{pendingCount}</h4>
              <p className="text-xs text-gray-400">Pending</p>
            </div>
            <div className="glass-panel p-4 rounded-xl text-center border-gray-800 col-span-2">
              <Award className="h-6 w-6 text-emerald-400 mx-auto mb-2" />
              <h4 className="font-bold text-white text-lg">{strongMatches}</h4>
              <p className="text-xs text-gray-400">Strong Matches</p>
            </div>
          </div>
        </div>

        {/* RADAR CHART (Candidate Comparison View) */}
        {evaluatedCount > 0 && (
          <div className="mt-6 glass-panel rounded-xl p-4 border border-gray-800/50">
            <h3 className="text-sm font-bold text-white mb-2 ml-2">Top 3 Comparison</h3>
            <div style={{ width: '100%', height: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={chartData}>
                  <PolarGrid stroke="rgba(255,255,255,0.1)" />
                  <PolarAngleAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 10 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                  <Radar name="Overall" dataKey="Overall" stroke="#0d9488" fill="#0d9488" fillOpacity={0.4} />
                  <Radar name="Skill" dataKey="Skill" stroke="#6ee7b7" fill="#6ee7b7" fillOpacity={0.2} />
                  <Tooltip contentStyle={{ backgroundColor: '#222', border: '1px solid #333', borderRadius: '8px', color: '#fff', fontSize: '12px' }} />
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
              <button onClick={handleDownloadCSV} className="ss-show bg-transparent border border-gray-700 hover:border-teal-500 rounded px-2 py-1 cursor-pointer flex items-center gap-1 text-xs text-gray-300">
                <Download size={12} /> CSV
              </button>
              <button onClick={() => setTab('results')} className="ss-show bg-transparent border-none cursor-pointer text-teal-400">view all</button>
            </div>
          </div>

          <ul className="main__cards">
            {evaluatedCount === 0 ? (
              <div className="glass-panel rounded-3xl p-10 text-center space-y-5 col-span-full h-80 flex flex-col items-center justify-center border-dashed border-2 border-gray-700/50">
                <div className="w-16 h-16 rounded-full bg-teal-500/10 text-teal-400 flex items-center justify-center mb-2 shadow-glow">
                  <FileUp size={32} />
                </div>
                <h3 className="text-lg font-bold text-white">No Pipeline Data</h3>
                <p className="text-gray-400 text-sm max-w-xs mx-auto">Your candidate ranking board is empty. Upload resumes to see the AI generate insights.</p>
                <button onClick={() => setTab('upload')} className="bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-white font-bold py-2.5 px-6 rounded-xl text-sm transition-all shadow-glow mt-4">Begin Screening</button>
              </div>
            ) : (
              (evaluations?.candidates || []).slice(0, 3).map((cand, idx) => {
                const hue = getStatusHue(cand.status);
                return (
                  <li key={cand.candidateId} className="main__card" style={{ '--hue': hue }}>
                    <div className="main__card-inner">
                      {/* Front of Card */}
                      <div className="main__card-front flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-[#1a1a1a] flex items-center justify-center border border-gray-800 text-lg font-bold" style={{ color: `hsl(${hue}, 80%, 60%)` }}>
                            #{idx + 1}
                          </div>
                          <div>
                            <h3 className="text-lg font-bold text-white">{cand.name}</h3>
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
                        <p className="text-sm text-rose-400 font-medium leading-snug">
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
          <div className="absolute left-[26px] top-4 bottom-4 w-px bg-gradient-to-b from-teal-500/50 via-rose-500/20 to-transparent"></div>
          <ul className="space-y-6">
            {auditLogs.length === 0 ? (
              <li className="main__list-item justify-center text-gray-500 text-sm py-8">
                No recent activity logs.
              </li>
            ) : (
              auditLogs.slice(0, 6).map(log => (
                <li key={log.id} className="main__list-item flex items-start gap-4 relative glass-panel-hover">
                  <div className={`z-10 flex items-center justify-center w-10 h-10 rounded-full border shadow-glow shrink-0 ${getLogColor(log.action)}`}>
                    {getLogIcon(log.action)}
                  </div>
                  <div className="pt-1">
                    <p className="text-white font-semibold text-[15px]">
                      {log.action === 'CREATE_JOB' && 'Job Posting Configured'}
                      {log.action === 'CANDIDATE_UPLOAD' && `Resume Ingested: ${log.details?.candidateName || 'Unknown'}`}
                      {log.action === 'CANDIDATE_EVALUATION' && `AI Evaluation Scored: ${log.details?.candidateName || 'Unknown'}`}
                    </p>
                    <p className="text-gray-400 text-xs mt-0.5">{new Date(log.timestamp).toLocaleString()}</p>
                  </div>
                </li>
              ))
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
