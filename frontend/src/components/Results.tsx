import React, { useState } from 'react';
import { ChevronDown, ChevronUp, AlertTriangle, CheckCircle, HelpCircle, ArrowRight, Play, ShieldAlert, Award, FileText, Sparkles, Scale } from 'lucide-react';
import { toast } from 'react-hot-toast';
import CandidateDetails from './CandidateDetails';
import CandidateCompare from './CandidateCompare';

function Results({ token, apiUrl, jobId, job, candidates, evaluations, setTab, refreshData }: any) {
  const [expandedId, setExpandedId] = useState(null);
  const [evalLoading, setEvalLoading] = useState({});
  const [compareIds, setCompareIds] = useState([]);
  const [isComparing, setIsComparing] = useState(false);

  const pendingCandidates = candidates.filter(c => c.status === 'pending_evaluation');
  const evaluatedCandidates = evaluations?.candidates || [];

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const handleToggleCompare = (id) => {
    if (compareIds.includes(id)) {
      setCompareIds(compareIds.filter(i => i !== id));
    } else {
      if (compareIds.length >= 3) {
        toast.error('You can compare up to 3 candidates at a time.');
        return;
      }
      setCompareIds([...compareIds, id]);
    }
  };

  const handleEvaluate = async (candidateId) => {
    setEvalLoading(prev => ({ ...prev, [candidateId]: true }));

    try {
      const res = await fetch(`${apiUrl}/evaluate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          jobId,
          candidateIds: [candidateId]
        })
      });

      if (!res.ok) {
        throw new Error('Evaluation request failed.');
      }

      refreshData();
      toast.success('Evaluation completed successfully!');
    } catch (err) {
      console.error(err);
      toast.error(err.message);
    } finally {
      setEvalLoading(prev => ({ ...prev, [candidateId]: false }));
    }
  };

  const handleEvaluateAll = async () => {
    if (pendingCandidates.length === 0) return;
    
    // Set all as loading
    const loadings = {};
    pendingCandidates.forEach(c => { loadings[c.id] = true; });
    setEvalLoading(prev => ({ ...prev, ...loadings }));

    try {
      const res = await fetch(`${apiUrl}/evaluate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          jobId,
          candidateIds: pendingCandidates.map(c => c.id)
        })
      });

      if (!res.ok) {
        throw new Error('Batch evaluation request failed.');
      }

      refreshData();
      toast.success('Batch evaluation completed!');
    } catch (err) {
      console.error(err);
      toast.error(err.message);
    } finally {
      const clears = {};
      pendingCandidates.forEach(c => { clears[c.id] = false; });
      setEvalLoading(prev => ({ ...prev, ...clears }));
    }
  };

  const getScoreColor = (score) => {
    if (score >= 85) return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
    if (score >= 75) return 'text-teal-400 bg-teal-500/10 border-teal-500/20';
    if (score >= 60) return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
    return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
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

  if (isComparing) {
    const candidatesToCompare = evaluatedCandidates.filter(c => compareIds.includes(c.candidateId));
    return <CandidateCompare candidates={candidatesToCompare} onBack={() => setIsComparing(false)} />;
  }

  return (
    <div className="space-y-8 relative">
      {/* Compare Banner */}
      {compareIds.length > 1 && (
        <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 bg-teal-600 shadow-glow text-white px-6 py-3 rounded-full flex items-center gap-4 z-50 animate-bounce">
          <span className="font-bold text-sm">{compareIds.length} Candidates Selected</span>
          <button 
            onClick={() => setIsComparing(true)}
            className="bg-white text-teal-600 hover:bg-gray-100 font-bold py-1.5 px-4 rounded-full text-sm transition-colors flex items-center gap-2"
          >
            <Scale className="h-4 w-4" /> Compare Now
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white font-sans flex items-center gap-2">
            Candidate Evaluations <Award className="h-6 w-6 text-teal-400" />
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Ratings for <strong className="text-teal-400">{job?.title || 'Active Job'}</strong> based on multi-agent analysis.
          </p>
        </div>
        <div className="flex items-center gap-4">
          {setTab && (
            <button 
              onClick={() => setTab('dashboard')}
              className="flex items-center gap-1 text-sm text-gray-400 hover:text-teal-400 transition-colors bg-[#222] border border-gray-800 px-3 py-1.5 rounded-lg"
            >
              ← Back to Dashboard
            </button>
          )}

        {pendingCandidates.length > 0 && (
          <button
            onClick={handleEvaluateAll}
            className="flex items-center gap-2 bg-gradient-to-r from-teal-500 to-rose-600 hover:from-teal-600 hover:to-rose-700 text-white font-semibold py-2.5 px-5 rounded-xl text-sm transition-all shadow-glow"
          >
            <Play className="h-4 w-4 fill-white" /> Evaluate Pending ({pendingCandidates.length})
          </button>
        )}
        </div>
      </div>

      {/* Grid of Results */}
      <div className="grid grid-cols-1 gap-6">
        
        {/* Pending Candidates Section */}
        {pendingCandidates.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider px-1">Pending Evaluations</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pendingCandidates.map(cand => (
                <div key={cand.id} className="glass-panel p-5 rounded-2xl flex flex-col justify-between items-start gap-4">
                  <div className="space-y-1">
                    <h4 className="font-bold text-white">{cand.name}</h4>
                    <p className="text-xs text-gray-500 font-mono">{cand.email}</p>
                    <p className="text-[10px] text-teal-400 mt-1">Uploaded {new Date(cand.uploaded_at).toLocaleDateString()}</p>
                  </div>
                  <button
                    onClick={() => handleEvaluate(cand.id)}
                    disabled={evalLoading[cand.id]}
                    className="w-full flex items-center justify-center gap-2 bg-[#222222] hover:bg-gray-800 border border-gray-800 text-teal-400 font-semibold py-2 px-4 rounded-xl text-xs transition-all disabled:opacity-50"
                  >
                    {evalLoading[cand.id] ? (
                      <div className="w-4 h-4 border-2 border-teal-400/30 border-t-teal-400 rounded-full animate-spin"></div>
                    ) : (
                      <>
                        <Sparkles className="h-3 w-3" /> Run Evaluation
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Evaluated Candidates Section */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider px-1">Ranked Results</h3>
          {evaluatedCandidates.length === 0 ? (
            <div className="glass-panel p-10 rounded-2xl text-center text-gray-500 text-sm">
              <FileText className="h-8 w-8 mx-auto text-gray-600 mb-3" />
              No candidates have been evaluated yet. Click "Run Evaluation" on pending candidates above.
            </div>
          ) : (
            <div className="space-y-4">
              {evaluatedCandidates.map((cand) => {
                const isExpanded = expandedId === cand.candidateId;
                const score = cand.scores?.overallScore || cand.overallScore || 0;
                
                return (
                  <div
                    key={cand.candidateId}
                    className={`glass-panel rounded-2xl overflow-hidden transition-all duration-300 border ${
                      isExpanded ? 'border-teal-500/40 shadow-glow' : 'border-gray-850 hover:border-gray-700/60'
                    }`}
                  >
                    {/* Collapsed Header */}
                    <div
                      onClick={() => toggleExpand(cand.candidateId)}
                      className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 cursor-pointer select-none bg-[#1a1a1a]/10"
                    >
                      <div className="flex items-center gap-4">
                        {/* Checkbox for Compare */}
                        <div 
                          className="mr-2 flex items-center justify-center cursor-pointer"
                          onClick={(e) => { e.stopPropagation(); handleToggleCompare(cand.candidateId); }}
                        >
                          <div className={`w-5 h-5 rounded border ${compareIds.includes(cand.candidateId) ? 'bg-teal-500 border-teal-500 text-white' : 'border-gray-600 bg-transparent'} flex items-center justify-center transition-colors`}>
                            {compareIds.includes(cand.candidateId) && <CheckCircle className="w-3 h-3" />}
                          </div>
                        </div>

                        {/* Rank Badge */}
                        <div className="w-8 h-8 rounded-full bg-teal-500/10 text-teal-400 border border-teal-500/20 flex items-center justify-center font-mono font-extrabold text-sm">
                          #{cand.rank}
                        </div>
                        
                        <div>
                          <h3 className="font-bold text-white text-base flex items-center gap-2">
                            {cand.name}
                          </h3>
                          <p className="text-xs text-gray-500 font-mono mt-0.5">{cand.email}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                        {/* Status badge */}
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${getScoreColor(score)}`}>
                          {cand.status}
                        </span>

                        {/* Overall score */}
                        <div className="text-right">
                          <span className="text-2xl font-extrabold text-white block">{score}%</span>
                          <span className="text-[10px] text-gray-500 uppercase tracking-widest block font-semibold">Match Score</span>
                        </div>

                        <div>
                          {isExpanded ? <ChevronUp className="h-5 w-5 text-gray-400" /> : <ChevronDown className="h-5 w-5 text-gray-400" />}
                        </div>
                      </div>
                    </div>

                    {/* Expanded Content Panel */}
                    {isExpanded && (
                      <CandidateDetails cand={cand} token={token} apiUrl={apiUrl} />
                    )}
                  </div>
                );
              })}
            </div>
          )}

        </div>

      </div>
    </div>
  );
}

export default Results;
