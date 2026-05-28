import React, { useState, useEffect } from 'react';
import { CheckCircle, AlertTriangle, ShieldAlert, HelpCircle, FileText, Send, User, Download, BrainCircuit, Calendar } from 'lucide-react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';
import { toast } from 'react-hot-toast';
import { jsPDF } from 'jspdf';
import { Candidate } from '../types';

interface CandidateDetailsProps {
  cand: Candidate;
  token?: string;
  apiUrl?: string;
  isBlindMode?: boolean;
}

function CandidateDetails({ cand, token, apiUrl, isBlindMode }: CandidateDetailsProps) {
  const displayName = isBlindMode ? `Candidate #${cand.candidateId.slice(0, 4).toUpperCase()}` : cand.name;
  const [notes, setNotes] = useState([]);
  const [newNote, setNewNote] = useState('');
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [showInterviewModal, setShowInterviewModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [activeDetailsTab, setActiveDetailsTab] = useState<'insights' | 'resume'>('insights');
  const [fullCandidate, setFullCandidate] = useState<any>(null);
  const [loadingFull, setLoadingFull] = useState(false);

  const [showEmailModal, setShowEmailModal] = useState(false);
  const [customRecipient, setCustomRecipient] = useState('');
  const [emailSending, setEmailSending] = useState(false);
  const [isSmtpConfigured, setIsSmtpConfigured] = useState(false);
  const [isCheckingSmtp, setIsCheckingSmtp] = useState(false);

  useEffect(() => {
    fetchNotes();
    fetchFullCandidate();
  }, [cand.candidateId]);

  useEffect(() => {
    if (showEmailModal) {
      checkSmtpStatus();
    }
  }, [showEmailModal]);

  const checkSmtpStatus = async () => {
    setIsCheckingSmtp(true);
    try {
      const res = await fetch(`${apiUrl}/smtp`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setIsSmtpConfigured(!!data.configured);
      }
    } catch (err) {
      console.error('Error checking SMTP status:', err);
    } finally {
      setIsCheckingSmtp(false);
    }
  };

  const fetchFullCandidate = async () => {
    setLoadingFull(true);
    try {
      const res = await fetch(`${apiUrl}/candidates/${cand.candidateId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setFullCandidate(data);
      }
    } catch (err) {
      console.error('Error fetching full candidate details:', err);
    } finally {
      setLoadingFull(false);
    }
  };

  const fetchNotes = async () => {
    setLoadingNotes(true);
    try {
      const res = await fetch(`${apiUrl}/notes/${cand.candidateId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.text().then(t => { try { return t ? JSON.parse(t) : {}; } catch(e) { return {}; } });
        setNotes(data);
      }
    } catch (err) {
      console.error('Error fetching notes:', err);
    } finally {
      setLoadingNotes(false);
    }
  };

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!newNote.trim()) return;

    try {
      const res = await fetch(`${apiUrl}/notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          candidateId: cand.candidateId,
          content: newNote.trim()
        })
      });

      if (!res.ok) throw new Error('Failed to add note');
      
      const addedNote = await res.text().then(t => { try { return t ? JSON.parse(t) : {}; } catch(e) { return {}; } });
      setNotes([addedNote, ...notes]);
      setNewNote('');
      toast.success('Note added');
    } catch (err) {
      toast.error(err.message);
    }
  };

  const getProgressColor = (score) => {
    if (score >= 85) return 'bg-emerald-500';
    if (score >= 75) return 'bg-teal-500';
    if (score >= 60) return 'bg-amber-500';
    return 'bg-rose-500';
  };

  const getFlagColor = (severity) => {
    if (severity === 'high') return 'bg-rose-500/10 border-rose-500/20 text-rose-400';
    if (severity === 'medium') return 'bg-amber-500/10 border-amber-500/20 text-amber-400';
    return 'bg-blue-500/10 border-blue-500/20 text-blue-400';
  };

  const radarData = [
    { subject: 'Skills', A: cand.scores?.skillMatch || 0, fullMark: 100 },
    { subject: 'Experience', A: cand.scores?.experienceAlignment || 0, fullMark: 100 },
    { subject: 'Culture', A: cand.scores?.cultureFit || 0, fullMark: 100 },
    { subject: 'Risk Check', A: cand.scores?.riskAssessment || 0, fullMark: 100 },
  ];

  const handleExport = () => {
    const doc = new jsPDF();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text(`Candidate Profile: ${displayName}`, 14, 20);
    
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text(`Status: ${cand.status}`, 14, 30);
    doc.text(`Overall Score: ${cand.scores?.overallScore}%`, 14, 40);
    doc.text(`Skill Match: ${cand.scores?.skillMatch}%`, 14, 50);
    doc.text(`Culture Fit: ${cand.scores?.cultureFit}%`, 14, 60);
    
    doc.setFont("helvetica", "bold");
    doc.text("Top Strengths:", 14, 80);
    doc.setFont("helvetica", "normal");
    cand.strengths?.slice(0,3).forEach((str, i) => {
      doc.text(`- ${str}`, 14, 90 + (i * 10));
    });

    doc.setFont("helvetica", "bold");
    doc.text("Top Gaps:", 14, 130);
    doc.setFont("helvetica", "normal");
    cand.gaps?.slice(0,3).forEach((gap, i) => {
      doc.text(`- ${gap}`, 14, 140 + (i * 10));
    });

    doc.save(`${displayName.replace(/\s+/g, '_')}_Profile.pdf`);
    toast.success('Generated PDF Export');
  };

  const handleExportInterviewKit = () => {
    const doc = new jsPDF();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text(`Interview Kit: ${displayName}`, 14, 20);
    
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    
    let yPos = 40;
    (cand as any).suggestedQuestions?.forEach((q: string, i: number) => {
      const splitText = doc.splitTextToSize(`Q${i+1}: ${q}`, 180);
      doc.text(splitText, 14, yPos);
      yPos += (splitText.length * 7) + 10;
      if (yPos > 280) {
        doc.addPage();
        yPos = 20;
      }
    });

    doc.save(`${displayName.replace(/\s+/g, '_')}_Interview_Kit.pdf`);
    toast.success('Interview Kit Exported as PDF');
  };

  const handleCSVExport = () => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + "Name,Status,Overall Score,Technical Skills,Experience,Culture,Risk Check,Top Strength,Top Gap,Recommendation\n"
      + `"${displayName}","${cand.status}","${cand.scores?.overallScore || 0}","${cand.scores?.skillMatch || 0}","${cand.scores?.experienceAlignment || 0}","${cand.scores?.cultureFit || 0}","${cand.scores?.riskAssessment || 0}","${(cand.strengths?.[0] || 'N/A').replace(/"/g, '""')}","${(cand.gaps?.[0] || 'N/A').replace(/"/g, '""')}","${cand.recommendation}"`;
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${displayName.replace(/\s+/g, '_')}_Insights.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Generated CSV Export');
  };

  const handleEmailReport = () => {
    setCustomRecipient(cand.email || '');
    setShowEmailModal(true);
  };

  const handleEmailReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customRecipient.trim()) {
      toast.error('Recipient email address is required.');
      return;
    }

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(customRecipient.trim())) {
      toast.error('Please enter a valid recipient email address.');
      return;
    }

    setEmailSending(true);
    try {
      const res = await fetch(`${apiUrl}/candidates/${cand.candidateId}/email-report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          recipientEmail: customRecipient.trim()
        })
      });
      const data = await res.text().then(t => { try { return t ? JSON.parse(t) : {}; } catch(e) { return {}; } });
      if (!res.ok) {
        throw new Error(data.error || 'Failed to email report.');
      }
      
      setShowEmailModal(false);

      if (data.isTest && data.previewUrl) {
        toast((t) => (
          <div className="text-xs">
            <span className="font-bold text-white block mb-1">📬 Test Email Generated!</span>
            <span>Evaluation report emailed to <strong>{data.recipient}</strong>.</span>
            <a 
              href={data.previewUrl} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-pink-400 hover:text-pink-300 underline font-bold mt-2 block"
              onClick={() => toast.dismiss(t.id)}
            >
              Click here to view email inbox &gt;
            </a>
          </div>
        ), { duration: 15000 });
      } else {
        toast.success(`Evaluation report successfully emailed to: ${data.recipient}!`);
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setEmailSending(false);
    }
  };

  return (
    <div className="p-6 border-t border-gray-800/60 bg-[#1a1a1a]/20 space-y-8" id={`candidate-export-${cand.candidateId}`}>
      
      {/* Top Header & Export */}
      <div className="flex justify-between items-center print:hidden">
        <h4 className="text-white font-bold text-lg">Candidate Profile Insights</h4>
        <div className="flex gap-2">
          <button 
            onClick={handleExport}
            className="flex items-center gap-2 text-sm text-teal-400 bg-teal-500/10 hover:bg-teal-500/20 px-3 py-1.5 rounded-lg transition-all"
            title="Download PDF"
          >
            <Download className="h-4 w-4" /> PDF
          </button>
          <button 
            onClick={handleCSVExport}
            className="flex items-center gap-2 text-sm text-green-400 bg-green-500/10 hover:bg-green-500/20 px-3 py-1.5 rounded-lg transition-all"
            title="Export to CSV"
          >
            <Download className="h-4 w-4" /> CSV
          </button>
          <button 
            onClick={handleEmailReport}
            className="flex items-center gap-2 text-sm text-pink-400 bg-pink-500/10 hover:bg-pink-500/20 px-3 py-1.5 rounded-lg transition-all"
            title="Email Report to Recruiter"
          >
            <Send className="h-4 w-4" /> Email Report
          </button>
        </div>
      </div>

      {/* Detail Tabs */}
      <div className="flex border-b border-slate-800/60 print:hidden mb-6">
        <button
          onClick={() => setActiveDetailsTab('insights')}
          className={`px-4 py-2 text-sm font-semibold transition-all ${
            activeDetailsTab === 'insights'
              ? 'text-teal-400 border-b-2 border-teal-500'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          AI Insights
        </button>
        <button
          onClick={() => setActiveDetailsTab('resume')}
          className={`px-4 py-2 text-sm font-semibold transition-all ${
            activeDetailsTab === 'resume'
              ? 'text-teal-400 border-b-2 border-teal-500'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Original Resume Text
        </button>
      </div>

      {activeDetailsTab === 'insights' ? (
        <>
          {/* Visual Charts & Scores */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Radar Chart */}
        <div className="glass-panel p-4 rounded-xl flex items-center justify-center h-64 border border-gray-800/40">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
              <PolarGrid stroke={document.body.classList.contains('light-theme') ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.1)'} />
              <PolarAngleAxis dataKey="subject" tick={{ fill: document.body.classList.contains('light-theme') ? '#1e293b' : '#9CA3AF', fontSize: 12 }} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
              <Radar name="Candidate" dataKey="A" stroke="#0d9488" fill="#0d9488" fillOpacity={0.5} />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Score Bars */}
        <div className="lg:col-span-2 space-y-4">
          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Score Breakdown</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { label: 'Technical Skills', key: 'skillMatch' },
              { label: 'Experience Match', key: 'experienceAlignment' },
              { label: 'Culture Alignment', key: 'cultureFit' },
              { label: 'Inverted Risk', key: 'riskAssessment' }
            ].map(metric => {
              const val = cand.scores?.[metric.key] || 0;
              return (
                <div key={metric.key} className="bg-[#222222]/60 p-4 rounded-xl border border-gray-800/40 transform transition-all hover:scale-[1.02] cursor-default">
                  <span className="text-xs text-gray-400 font-semibold block">{metric.label}</span>
                  <div className="flex items-center gap-3 mt-2">
                    <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                      <div className={`h-full ${getProgressColor(val)} transition-all duration-1000 ease-out`} style={{ width: `${val}%` }}></div>
                    </div>
                    <span className="text-sm font-extrabold text-white">{val}%</span>
                  </div>
                </div>
              );
            })}
          </div>
          
          <div className="p-4 bg-teal-500/5 border border-teal-500/15 rounded-xl flex items-start gap-3 mt-4">
            <BrainCircuit className="h-5 w-5 text-teal-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">AI Explainability: Why ranked here</h4>
              <p className="text-white text-sm font-medium mt-1 leading-relaxed">{cand.recommendation}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Strengths & Gaps */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass-panel p-5 rounded-xl border border-gray-800/40">
          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Top 3 Strengths
          </h4>
          <ul className="space-y-2">
            {cand.strengths && cand.strengths.length > 0 ? (
              cand.strengths.slice(0, 3).map((str, idx) => (
                <li key={idx} className="text-sm text-gray-300 flex items-start gap-2">
                  <span className="text-emerald-400 font-bold mt-0.5">•</span>
                  {str}
                </li>
              ))
            ) : (
              <li className="text-sm text-gray-500 italic">No major strengths highlighted by AI.</li>
            )}
          </ul>
        </div>

        <div className="glass-panel p-5 rounded-xl border border-gray-800/40">
          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-rose-500"></span> Top 3 Gaps
          </h4>
          <ul className="space-y-2">
            {cand.gaps && cand.gaps.length > 0 ? (
              cand.gaps.slice(0, 3).map((gap, idx) => (
                <li key={idx} className="text-sm text-gray-300 flex items-start gap-2">
                  <span className="text-rose-400 font-bold mt-0.5">•</span>
                  {gap}
                </li>
              ))
            ) : (
              <li className="text-sm text-gray-500 italic">No major gaps identified by AI.</li>
            )}
          </ul>
        </div>
      </div>

      {/* Red Flags warnings */}
      {cand.redFlags && cand.redFlags.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5 text-rose-400">
            <ShieldAlert className="h-4 w-4" /> Risk Assessment
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {cand.redFlags.map((flag, idx) => (
              <div key={idx} className={`p-4 rounded-xl border flex items-start gap-3 text-sm ${getFlagColor(flag.severity)}`}>
                <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold uppercase text-[10px] tracking-wider block mb-1">{flag.type.replace(/_/g, ' ')}</span>
                  <span className="font-medium block leading-snug">{flag.details}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tailored Interview Prep Questions */}
      <div className="space-y-4 pt-4 border-t border-gray-800/40">
        <div className="flex justify-between items-center">
          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
            <HelpCircle className="h-4 w-4 text-teal-400" /> Auto-Generated Interview Kit
          </h4>
          <div className="flex items-center gap-2">
            <div className="flex gap-2">
              <button 
                onClick={() => setShowInterviewModal(true)}
                className="text-xs bg-teal-500/10 hover:bg-teal-500/20 text-teal-400 border border-teal-500/20 px-3 py-1.5 rounded-lg transition-all"
              >
                Open Kit
              </button>
              <button 
                onClick={() => setShowScheduleModal(true)}
                className="text-xs bg-fuchsia-500/10 hover:bg-fuchsia-500/20 text-fuchsia-400 border border-fuchsia-500/20 px-3 py-1.5 rounded-lg transition-all flex items-center gap-1"
              >
                <Calendar className="h-3.5 w-3.5" /> Schedule Interview
              </button>
            </div>
          </div>
        </div>
      </div>

      {showInterviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0a0a0a]/80 backdrop-blur-sm print:hidden">
          <div className="bg-[#1a1a1a] border border-gray-800 rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl">
            <div className="flex justify-between items-center p-5 border-b border-gray-800">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <HelpCircle className="h-5 w-5 text-teal-400" /> Interview Kit for {displayName}
              </h3>
              <button 
                onClick={() => setShowInterviewModal(false)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <div className="p-6 overflow-y-auto space-y-4">
              {cand.suggestedQuestions.map((q, idx) => (
                <div key={idx} className="p-4 bg-[#222222] border border-gray-800 rounded-xl flex gap-3 text-sm text-gray-200">
                  <span className="font-mono text-teal-400 font-bold bg-teal-500/10 px-2 py-1 rounded h-min">Q{idx + 1}</span>
                  <p className="font-medium leading-relaxed">{q}</p>
                </div>
              ))}
            </div>
            <div className="p-4 border-t border-gray-800 bg-[#222222] rounded-b-2xl flex justify-end">
              <button 
                onClick={handleExportInterviewKit}
                className="bg-teal-500 hover:bg-teal-600 text-white px-4 py-2 rounded-lg text-sm transition-all flex items-center gap-2"
              >
                <Download className="w-4 h-4" /> Export as PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {showScheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0a0a0a]/80 backdrop-blur-sm print:hidden">
          <div className="bg-[#1a1a1a] border border-gray-800 rounded-2xl w-full max-w-md flex flex-col shadow-2xl">
            <div className="flex justify-between items-center p-5 border-b border-gray-800">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Calendar className="h-5 w-5 text-fuchsia-400" /> Schedule Interview
              </h3>
              <button 
                onClick={() => { setShowScheduleModal(false); setScheduleDate(''); setScheduleTime(''); }}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-2">Date</label>
                <input
                  type="date"
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  className="w-full bg-[#222222] border border-gray-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-fuchsia-500 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-2">Time</label>
                <input
                  type="time"
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                  className="w-full bg-[#222222] border border-gray-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-fuchsia-500 text-sm"
                />
              </div>
            </div>
            <div className="p-4 border-t border-gray-800 bg-[#222222] rounded-b-2xl flex justify-end">
              <button 
                onClick={() => {
                  if (!scheduleDate || !scheduleTime) {
                    toast.error('Please select both date and time');
                    return;
                  }
                  toast.success(`Interview scheduled for ${scheduleDate} at ${scheduleTime}`);
                  setShowScheduleModal(false);
                  setScheduleDate('');
                  setScheduleTime('');
                }}
                className="bg-fuchsia-500 hover:bg-fuchsia-600 text-white px-4 py-2 rounded-lg text-sm transition-all flex items-center gap-2"
              >
                <Calendar className="w-4 h-4" /> Confirm Schedule
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Interview Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0a0a0a]/80 backdrop-blur-sm print:hidden">
          <div className="bg-[#1a1a1a] border border-gray-800 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center p-5 border-b border-gray-800">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Calendar className="h-5 w-5 text-fuchsia-400" /> Schedule Interview
              </h3>
              <button onClick={() => setShowScheduleModal(false)} className="text-gray-400 hover:text-white">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-400">Schedule an interview for <strong className="text-white">{displayName}</strong></p>
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Date</label>
                <input
                  type="date"
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  className="w-full bg-[#222222] border border-gray-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-fuchsia-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Time</label>
                <input
                  type="time"
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                  className="w-full bg-[#222222] border border-gray-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-fuchsia-500 text-sm"
                />
              </div>
            </div>
            <div className="p-4 border-t border-gray-800 bg-[#222222] rounded-b-2xl flex justify-end gap-2">
              <button onClick={() => setShowScheduleModal(false)} className="text-gray-400 hover:text-white px-4 py-2 rounded-lg text-sm transition-all">Cancel</button>
              <button 
                onClick={() => {
                  if (!scheduleDate || !scheduleTime) { toast.error('Please select both date and time.'); return; }
                  toast.success(`Interview scheduled for ${scheduleDate} at ${scheduleTime}`);
                  setShowScheduleModal(false);
                  setScheduleDate('');
                  setScheduleTime('');
                }}
                className="bg-fuchsia-500 hover:bg-fuchsia-600 text-white px-4 py-2 rounded-lg text-sm transition-all flex items-center gap-2"
              >
                <Calendar className="w-4 h-4" /> Confirm Schedule
              </button>
            </div>
          </div>
        </div>
      )}
        </>
      ) : (
        <div className="space-y-4">
          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Raw Parsed CV Text</h4>
          <div className="glass-panel p-6 rounded-xl border border-gray-800/40 font-mono text-xs text-gray-300 whitespace-pre-wrap overflow-y-auto max-h-[500px] leading-relaxed bg-[#0a0a0a]/50">
            {loadingFull ? (
              <span className="text-gray-500 italic">Extracting raw resume text...</span>
            ) : fullCandidate?.resume_text || "No resume text extracted."}
          </div>
        </div>
      )}

      {/* Recruiter Collaboration Notes */}
      <div className="space-y-4 pt-6 border-t border-gray-800/40 print:hidden">
        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
          <User className="h-4 w-4 text-teal-400" /> Recruiter Notes & Collaboration
        </h4>
        
        <form onSubmit={handleAddNote} className="flex gap-2">
          <input
            type="text"
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="Add a comment about this candidate..."
            className="flex-1 bg-[#222222] border border-gray-800 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-teal-500 text-sm"
          />
          <button
            type="submit"
            disabled={!newNote.trim()}
            className="bg-teal-500 hover:bg-teal-600 disabled:bg-gray-800 text-white p-2.5 rounded-xl transition-all flex items-center justify-center"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>

        <div className="space-y-3 max-h-60 overflow-y-auto">
          {loadingNotes ? (
            <p className="text-xs text-gray-500 italic">Loading notes...</p>
          ) : notes.length === 0 ? (
            <p className="text-xs text-gray-500 italic">No notes yet. Be the first to comment!</p>
          ) : (
            notes.map(note => (
              <div key={note.id} className="p-3 bg-[#1a1a1a] rounded-xl border border-gray-800/60">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-bold text-teal-300">{note.author_name}</span>
                  <span className="text-[10px] text-gray-500">{new Date(note.created_at).toLocaleString()}</span>
                </div>
                <p className="text-sm text-gray-300">{note.content}</p>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Custom Recipient Email Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0a0a0a]/80 backdrop-blur-sm print:hidden">
          <form onSubmit={handleEmailReportSubmit} className="bg-[#1a1a1a] border border-gray-800 rounded-2xl w-full max-w-md shadow-2xl flex flex-col">
            <div className="flex justify-between items-center p-5 border-b border-gray-800">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Send className="h-5 w-5 text-pink-500" /> Email Evaluation Report
              </h3>
              <button 
                type="button"
                onClick={() => setShowEmailModal(false)} 
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-400 leading-relaxed">
                Send a complete, formatted AI evaluation report for <strong className="text-white">{displayName}</strong> to any designated recipient email address below.
              </p>
              
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Recipient Email Address</label>
                <input
                  type="email"
                  value={customRecipient}
                  onChange={(e) => setCustomRecipient(e.target.value)}
                  className="w-full bg-[#222222] border border-gray-800 rounded-xl px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-pink-500 text-sm font-sans"
                  placeholder="e.g. manager@company.com"
                  required
                />
              </div>

              {/* Status helper badge inside modal */}
              {isCheckingSmtp ? (
                <div className="text-[10px] text-gray-500 italic">Checking SMTP service status...</div>
              ) : isSmtpConfigured ? (
                <div className="p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-xl flex items-center justify-between text-xs text-emerald-400/90 leading-relaxed">
                  <span>🚀 Using your <strong>Real SMTP Server</strong></span>
                  <span className="text-[9px] bg-emerald-500/10 px-2 py-0.5 rounded-full font-bold">REAL SMTP</span>
                </div>
              ) : (
                <div className="p-3 bg-fuchsia-500/5 border border-fuchsia-500/10 rounded-xl flex items-center justify-between text-xs text-fuchsia-300/90 leading-relaxed">
                  <span>📬 Using <strong>Berrywise Ethereal sandbox</strong></span>
                  <span className="text-[9px] bg-fuchsia-500/10 px-2 py-0.5 rounded-full font-bold">SIMULATED</span>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-800 bg-[#222222] rounded-b-2xl flex justify-end gap-2">
              <button 
                type="button"
                onClick={() => setShowEmailModal(false)} 
                className="text-gray-400 hover:text-white px-4 py-2 rounded-lg text-sm transition-all"
              >
                Cancel
              </button>
              <button 
                type="submit"
                disabled={emailSending}
                className="bg-pink-500 hover:bg-pink-600 text-white px-4 py-2 rounded-lg text-sm transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {emailSending ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <>
                    <Send className="w-4 h-4" /> Send Email
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}

export default CandidateDetails;
