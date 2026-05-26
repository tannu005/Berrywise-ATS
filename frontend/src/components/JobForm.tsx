import React, { useState } from 'react';
import { Briefcase, Sliders, Save, Sparkles } from 'lucide-react';
import { toast } from 'react-hot-toast';

function JobForm({ token, apiUrl, setTab, onSuccess }: any) {
  const [title, setTitle] = useState('Senior Full Stack Developer');
  const [description, setDescription] = useState("We're looking for a Senior Full Stack Developer to build our next generation platform using Node.js and React.");
  
  // Requirements
  const [skills, setSkills] = useState('Node.js, React, PostgreSQL');
  const [yearsExperience, setYearsExperience] = useState(5);
  const [education, setEducation] = useState("Bachelor's in CS or equivalent");
  const [niceToHave, setNiceToHave] = useState('Docker, AWS');
  const [values, setValues] = useState('Innovation, Collaboration, Excellence');

  // Weights (sliders out of 100)
  const [skillWeight, setSkillWeight] = useState(40);
  const [expWeight, setExpWeight] = useState(25);
  const [cultureWeight, setCultureWeight] = useState(20);
  const [flagWeight, setFlagWeight] = useState(15);

  const [loading, setLoading] = useState(false);

  const totalWeights = Number(skillWeight) + Number(expWeight) + Number(cultureWeight) + Number(flagWeight);

  const biasedWordsList = ['ninja', 'rockstar', 'aggressive', 'competitive', 'hustle', 'dominant', 'guys', 'killer', 'crush it'];
  const detectedBias = biasedWordsList.filter(w => description.toLowerCase().includes(w) || title.toLowerCase().includes(w));

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (totalWeights !== 100) {
      toast.error(`Evaluation weights must add up to exactly 100%. Currently: ${totalWeights}%`);
      return;
    }

    setLoading(true);

    try {
      // Split and clean lists
      const cleanSkills = skills.split(',').map(s => s.trim()).filter(Boolean);
      const cleanNiceToHave = niceToHave.split(',').map(s => s.trim()).filter(Boolean);
      const cleanValues = values.split(',').map(v => v.trim()).filter(Boolean);

      const jobPayload = {
        title,
        description,
        requirements: {
          skills: cleanSkills,
          yearsExperience: Number(yearsExperience),
          education,
          nice_to_have: cleanNiceToHave,
          weights: {
            skillMatch: skillWeight / 100,
            experienceAlignment: expWeight / 100,
            cultureFit: cultureWeight / 100,
            redFlags: flagWeight / 100
          }
        },
        companyValues: cleanValues,
        teamSize: 8,
        reportingTo: 'Engineering Manager'
      };

      const res = await fetch(`${apiUrl}/jobs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(jobPayload)
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create job.');
      }

      toast.success('Job posting saved successfully!');
      onSuccess(data.jobId);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white font-sans flex items-center gap-2">
            Post Job Template <Briefcase className="h-6 w-6 text-teal-400" />
          </h1>
          <p className="text-gray-400 text-sm mt-1">Configure candidate matching requirements and scoring weights.</p>
        </div>
        {setTab && (
          <button 
            onClick={() => setTab('dashboard')}
            className="flex items-center gap-1 text-sm text-gray-400 hover:text-teal-400 transition-colors bg-[#222] border border-gray-800 px-3 py-1.5 rounded-lg"
          >
            ← Back to Dashboard
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Basic Details */}
        <div className="glass-panel p-6 rounded-2xl space-y-5">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            1. Role Details
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Job Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-[#222222] border border-gray-800 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 font-sans text-sm"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Job Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="w-full bg-[#222222] border border-gray-800 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 font-sans text-sm"
                required
              />
              {detectedBias.length > 0 ? (
                <div className="mt-3 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl">
                  <div className="flex items-center gap-2 text-rose-400 font-semibold mb-2 text-xs uppercase tracking-wider">
                    <Sparkles className="h-4 w-4" /> Potential Bias Detected
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {detectedBias.map(w => (
                      <span key={w} className="px-2 py-1 bg-rose-500/20 text-rose-300 rounded text-xs">
                        {w}
                      </span>
                    ))}
                  </div>
                  <p className="text-gray-400 text-xs mt-2">Consider using more inclusive alternatives to attract a diverse candidate pool.</p>
                </div>
              ) : (
                <div className="mt-3 flex items-center gap-2 text-emerald-400 text-xs font-semibold">
                  <Sparkles className="h-4 w-4" /> Inclusive language check passing.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Requirements */}
        <div className="glass-panel p-6 rounded-2xl space-y-5">
          <h3 className="text-lg font-bold text-white">
            2. Match Requirements
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Required Skills (comma-separated)</label>
              <input
                type="text"
                value={skills}
                onChange={(e) => setSkills(e.target.value)}
                className="w-full bg-[#222222] border border-gray-800 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-teal-500 font-sans text-sm"
                placeholder="e.g. Node.js, React, PostgreSQL"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Years of Experience</label>
              <input
                type="number"
                value={yearsExperience}
                onChange={(e) => setYearsExperience(e.target.value)}
                min="0"
                className="w-full bg-[#222222] border border-gray-800 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-teal-500 font-sans text-sm"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Required Education</label>
              <input
                type="text"
                value={education}
                onChange={(e) => setEducation(e.target.value)}
                className="w-full bg-[#222222] border border-gray-800 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-teal-500 font-sans text-sm"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Nice-To-Have Skills (comma-separated)</label>
              <input
                type="text"
                value={niceToHave}
                onChange={(e) => setNiceToHave(e.target.value)}
                className="w-full bg-[#222222] border border-gray-800 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-teal-500 font-sans text-sm"
                placeholder="e.g. Docker, Kubernetes"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Company Values (comma-separated)</label>
              <input
                type="text"
                value={values}
                onChange={(e) => setValues(e.target.value)}
                className="w-full bg-[#222222] border border-gray-800 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-teal-500 font-sans text-sm"
                placeholder="e.g. Integrity, Collaboration"
                required
              />
            </div>
          </div>
        </div>

        {/* Weights Sliders */}
        <div className="glass-panel p-6 rounded-2xl space-y-5">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              3. Evaluation Weights <Sliders className="h-4 w-4 text-teal-400" />
            </h3>
            <span className={`text-xs font-mono font-bold px-2.5 py-1 rounded-full border ${
              totalWeights === 100 
                ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' 
                : 'text-rose-400 bg-rose-500/10 border-rose-500/20'
            }`}>
              Total: {totalWeights}% / 100%
            </span>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs text-gray-400 font-semibold mb-2">
                <span>SKILLS ALIGNMENT</span>
                <span className="text-white font-bold">{skillWeight}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={skillWeight}
                onChange={(e) => setSkillWeight(Number(e.target.value))}
                className="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-teal-500"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs text-gray-400 font-semibold mb-2">
                <span>EXPERIENCE SENIORITY</span>
                <span className="text-white font-bold">{expWeight}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={expWeight}
                onChange={(e) => setExpWeight(Number(e.target.value))}
                className="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-teal-500"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs text-gray-400 font-semibold mb-2">
                <span>CULTURE FIT</span>
                <span className="text-white font-bold">{cultureWeight}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={cultureWeight}
                onChange={(e) => setCultureWeight(Number(e.target.value))}
                className="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-teal-500"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs text-gray-400 font-semibold mb-2">
                <span>RED FLAGS DETECTION (INVERTED RISK)</span>
                <span className="text-white font-bold">{flagWeight}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={flagWeight}
                onChange={(e) => setFlagWeight(Number(e.target.value))}
                className="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-teal-500"
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gradient-to-r from-teal-500 to-rose-600 hover:from-teal-600 hover:to-rose-700 text-white font-semibold py-3 px-4 rounded-xl transition-all shadow-glow hover:shadow-lg disabled:opacity-50 text-sm flex items-center justify-center gap-2"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
          ) : (
            <>
              <Save className="h-4 w-4" /> Save Job Posting
            </>
          )}
        </button>
      </form>
    </div>
  );
}

export default JobForm;
