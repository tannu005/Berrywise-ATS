import React, { useState, useEffect } from 'react';
import { CheckCircle, AlertTriangle, ShieldAlert, HelpCircle, FileText, Send, User, Download, BrainCircuit } from 'lucide-react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';
import { toast } from 'react-hot-toast';
import { jsPDF } from 'jspdf';
import { Candidate } from '../types';

interface CandidateDetailsProps {
  cand: Candidate;
  token?: string;
  apiUrl?: string;
}

function CandidateDetails({ cand, token, apiUrl }: CandidateDetailsProps) {
  const [notes, setNotes] = useState([]);
  const [newNote, setNewNote] = useState('');
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [showInterviewModal, setShowInterviewModal] = useState(false);

  useEffect(() => {
    fetchNotes();
  }, [cand.candidateId]);

  const fetchNotes = async () => {
    setLoadingNotes(true);
    try {
      const res = await fetch(`${apiUrl}/notes/${cand.candidateId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
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
      
      const addedNote = await res.json();
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
    doc.text(`Candidate Profile: ${cand.name}`, 14, 20);
    
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

    doc.save(`${cand.name}_Profile.pdf`);
    toast.success('Generated PDF Export');
  };

  const handleExportInterviewKit = () => {
    const doc = new jsPDF();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text(`Interview Kit: ${cand.name}`, 14, 20);
    
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

    doc.save(`${cand.name}_Interview_Kit.pdf`);
    toast.success('Interview Kit Exported as PDF');
  };

  const handleCSVExport = () => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + "Name,Status,Overall Score,Technical Skills,Experience,Culture,Risk Check,Top Strength,Top Gap,Recommendation\n"
      + `"${cand.name}","${cand.status}","${cand.scores?.overallScore || 0}","${cand.scores?.skillMatch || 0}","${cand.scores?.experienceAlignment || 0}","${cand.scores?.cultureFit || 0}","${cand.scores?.riskAssessment || 0}","${(cand.strengths?.[0] || 'N/A').replace(/"/g, '""')}","${(cand.gaps?.[0] || 'N/A').replace(/"/g, '""')}","${cand.recommendation}"`;
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${cand.name.replace(/\s+/g, '_')}_Insights.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Generated CSV Export');
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
        </div>
      </div>

      {/* Visual Charts & Scores */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Radar Chart */}
        <div className="glass-panel p-4 rounded-xl flex items-center justify-center h-64 border border-gray-800/40">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
              <PolarGrid stroke="rgba(255,255,255,0.1)" />
              <PolarAngleAxis dataKey="subject" tick={{ fill: '#9CA3AF', fontSize: 12 }} />
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
          <button 
            onClick={() => setShowInterviewModal(true)}
            className="text-xs bg-teal-500/10 hover:bg-teal-500/20 text-teal-400 border border-teal-500/20 px-3 py-1.5 rounded-lg transition-all"
          >
            Open Kit
          </button>
        </div>
      </div>

      {showInterviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0a0a0a]/80 backdrop-blur-sm print:hidden">
          <div className="bg-[#1a1a1a] border border-gray-800 rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl">
            <div className="flex justify-between items-center p-5 border-b border-gray-800">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <HelpCircle className="h-5 w-5 text-teal-400" /> Interview Kit for {cand.name}
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

    </div>
  );
}

export default CandidateDetails;
