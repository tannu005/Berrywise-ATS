import React from 'react';
import { ArrowLeft, CheckCircle, AlertTriangle, ShieldAlert } from 'lucide-react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';

function CandidateCompare({ candidates, onBack }) {
  if (!candidates || candidates.length === 0) return null;

  // Prepare radar data for multiple candidates
  // E.g. [{ subject: 'Skills', 'Candidate 1': 80, 'Candidate 2': 90 }, ...]
  const radarData = [
    { subject: 'Skills', fullMark: 100 },
    { subject: 'Experience', fullMark: 100 },
    { subject: 'Culture', fullMark: 100 },
    { subject: 'Risk Check', fullMark: 100 },
  ];

  candidates.forEach((cand, idx) => {
    radarData[0][`cand_${idx}`] = cand.scores?.skillMatch || 0;
    radarData[1][`cand_${idx}`] = cand.scores?.experienceAlignment || 0;
    radarData[2][`cand_${idx}`] = cand.scores?.cultureFit || 0;
    radarData[3][`cand_${idx}`] = cand.scores?.riskAssessment || 0;
  });

  const colors = ['#0d9488', '#f43f5e', '#6ee7b7', '#c084fc'];

  const getFlagColor = (severity) => {
    if (severity === 'high') return 'bg-rose-500/10 border-rose-500/20 text-rose-400';
    if (severity === 'medium') return 'bg-amber-500/10 border-amber-500/20 text-amber-400';
    return 'bg-blue-500/10 border-blue-500/20 text-blue-400';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-teal-400 hover:text-teal-300 font-semibold text-sm transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Results
        </button>
        <h2 className="text-xl font-bold text-white">Side-by-Side Comparison</h2>
      </div>

      <div className="glass-panel p-6 rounded-2xl grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Overlay Radar Chart */}
        <div className="lg:col-span-1 h-80 flex flex-col items-center border-r border-gray-800/60 pr-4">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">Metrics Overlay</h3>
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
              <PolarGrid stroke="rgba(255,255,255,0.1)" />
              <PolarAngleAxis dataKey="subject" tick={{ fill: '#9CA3AF', fontSize: 12 }} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
              {candidates.map((cand, idx) => (
                <Radar 
                  key={cand.candidateId}
                  name={cand.name} 
                  dataKey={`cand_${idx}`} 
                  stroke={colors[idx % colors.length]} 
                  fill={colors[idx % colors.length]} 
                  fillOpacity={0.3} 
                />
              ))}
            </RadarChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-2 mt-4 justify-center">
            {candidates.map((cand, idx) => (
              <div key={cand.candidateId} className="flex items-center gap-1.5 text-xs text-gray-300">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: colors[idx % colors.length] }}></span>
                {cand.name.split(' ')[0]}
              </div>
            ))}
          </div>
        </div>

        {/* Detailed Columns */}
        <div className="lg:col-span-2 grid gap-4" style={{ gridTemplateColumns: `repeat(${candidates.length}, minmax(0, 1fr))` }}>
          {candidates.map((cand, idx) => (
            <div key={cand.candidateId} className="space-y-6">
              
              {/* Header */}
              <div className="text-center p-4 bg-[#222222] rounded-xl border border-gray-800/60">
                <h3 className="font-bold text-lg text-white" style={{ color: colors[idx % colors.length] }}>{cand.name}</h3>
                <p className="text-xs text-gray-400">{cand.email}</p>
                <div className="mt-2 text-2xl font-extrabold text-white">
                  {cand.scores?.overallScore || cand.overallScore || 0}%
                </div>
              </div>

              {/* Strengths */}
              <div>
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Strengths</h4>
                <ul className="space-y-2">
                  {(cand.strengths || []).slice(0, 3).map((s, i) => (
                    <li key={i} className="text-xs text-gray-300 flex items-start gap-2 bg-[#222222]/50 p-2 rounded border border-gray-800/30">
                      <CheckCircle className="h-3 w-3 text-emerald-400 shrink-0 mt-0.5" />
                      {s}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Gaps */}
              <div>
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Gaps</h4>
                <ul className="space-y-2">
                  {(cand.gaps || []).slice(0, 3).map((g, i) => (
                    <li key={i} className="text-xs text-gray-300 flex items-start gap-2 bg-[#222222]/50 p-2 rounded border border-gray-800/30">
                      <AlertTriangle className="h-3 w-3 text-rose-400 shrink-0 mt-0.5" />
                      {g}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Risks */}
              {cand.redFlags && cand.redFlags.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 text-rose-400 flex items-center gap-1">
                    <ShieldAlert className="h-3 w-3" /> Risks
                  </h4>
                  <div className="space-y-2">
                    {cand.redFlags.map((flag, i) => (
                      <div key={i} className={`p-2 rounded border text-xs ${getFlagColor(flag.severity)}`}>
                        <span className="font-bold uppercase text-[9px] block">{flag.type.replace(/_/g, ' ')}</span>
                        {flag.details}
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          ))}
        </div>

      </div>
    </div>
  );
}

export default CandidateCompare;
