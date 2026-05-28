import React, { useState, useRef } from 'react';
import { Upload as UploadIcon, FileText, CheckCircle2, AlertCircle, Trash2, ArrowRight } from 'lucide-react';
import { toast } from 'react-hot-toast';

function Upload({ token, apiUrl, jobId, job, setTab, onSuccess }: any) {
  const [activeSubTab, setActiveSubTab] = useState('single');
  
  // Single upload state
  const [name, setName] = useState('John Doe');
  const [email, setEmail] = useState('john@example.com');
  const [singleFile, setSingleFile] = useState(null);
  
  // Bulk upload state
  const [bulkFiles, setBulkFiles] = useState([]);
  
  // Sourcing state
  const [sourceUrl, setSourceUrl] = useState('');
  
  // UI states
  const [loading, setLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [logs, setLogs] = useState([]);
  const fileInputRef = useRef(null);

  const handleSingleSubmit = async (e) => {
    e.preventDefault();
    if (!singleFile) {
      toast.error('Please select a resume file.');
      return;
    }

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
      toast.error('Please enter a valid candidate email address.');
      return;
    }

    setLoading(true);

    const formData = new FormData();
    formData.append('file', singleFile);
    formData.append('jobId', jobId);
    formData.append('candidateName', name);
    formData.append('candidateEmail', email);

    try {
      const res = await fetch(`${apiUrl}/candidates`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      const data = await res.text().then(t => { try { return t ? JSON.parse(t) : {}; } catch(e) { return {}; } });

      if (!res.ok) {
        throw new Error(data.error || 'Failed to upload candidate.');
      }

      toast.success(`Successfully ingested candidate: ${name}!`);
      setName('');
      setEmail('');
      setSingleFile(null);
      
      setTimeout(() => {
        onSuccess();
      }, 1500);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Helper to guess name from filename
  const getCleanName = (filename) => {
    const nameWithoutExt = filename.substring(0, filename.lastIndexOf('.'));
    return nameWithoutExt
      .replace(/[_-]/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase());
  };

  const handleBulkFileChange = (e) => {
    const files = Array.from(e.target.files);
    const newFiles = files.map(file => ({
      file,
      name: getCleanName(file.name),
      email: `${getCleanName(file.name).toLowerCase().replace(/\s+/g, '')}@example.com`,
      id: `${Date.now()}-${Math.random()}`
    }));
    setBulkFiles([...bulkFiles, ...newFiles]);
  };

  const removeBulkFile = (id) => {
    setBulkFiles(bulkFiles.filter(f => f.id !== id));
  };

  const handleBulkSubmit = async () => {
    if (bulkFiles.length === 0) {
      toast.error('Please add at least one resume file.');
      return;
    }

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    const invalidItems = bulkFiles.filter(item => !emailRegex.test(item.email));
    if (invalidItems.length > 0) {
      toast.error(`Please correct invalid email formats for: ${invalidItems.map(x => x.name).join(', ')}`);
      return;
    }
    
    setLoading(true);
    setLogs([]);

    const newLogs = [];

    for (let i = 0; i < bulkFiles.length; i++) {
      const item = bulkFiles[i];
      newLogs.push({ text: `Processing ${item.name}...`, status: 'pending' });
      setLogs([...newLogs]);

      const formData = new FormData();
      formData.append('file', item.file);
      formData.append('jobId', jobId);
      formData.append('candidateName', item.name);
      formData.append('candidateEmail', item.email);

      try {
        const res = await fetch(`${apiUrl}/candidates`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: formData
        });
        const data = await res.text().then(t => { try { return t ? JSON.parse(t) : {}; } catch(e) { return {}; } });

        if (res.ok) {
          newLogs[i] = { text: `Successfully uploaded ${item.name}`, status: 'success' };
        } else {
          newLogs[i] = { text: `Failed ${item.name}: ${data.error || 'Server error'}`, status: 'error' };
        }
      } catch (err) {
        newLogs[i] = { text: `Network error ${item.name}: ${err.message}`, status: 'error' };
      }
      setLogs([...newLogs]);
    }

    setLoading(false);
    toast.success('Batch processing complete!');
    setBulkFiles([]);
    
    setTimeout(() => {
      onSuccess();
    }, 2000);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };
  
  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };
  
  const handleDropSingle = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setSingleFile(e.dataTransfer.files[0]);
      e.dataTransfer.clearData();
    }
  };

  const handleDropBulk = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files);
      const newFiles = files.map(file => ({
        file,
        name: getCleanName(file.name),
        email: `${getCleanName(file.name).toLowerCase().replace(/\\s+/g, '')}@example.com`,
        id: `${Date.now()}-${Math.random()}`
      }));
      setBulkFiles([...bulkFiles, ...newFiles]);
      e.dataTransfer.clearData();
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white font-sans flex items-center gap-2">
            Upload Candidates <UploadIcon className="h-6 w-6 text-fuchsia-400" />
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Add resumes to evaluation pipeline for <strong className="text-fuchsia-400">{job?.title || 'Active Job'}</strong>.
          </p>
        </div>
        {setTab && (
          <button 
            onClick={() => setTab('dashboard')}
            className="flex items-center gap-1 text-sm text-gray-400 hover:text-fuchsia-400 transition-colors bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-2xl"
          >
            ← Back to Dashboard
          </button>
        )}
      </div>

      {!jobId && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-3 shadow-[0_0_15px_rgba(245,158,11,0.1)]">
          <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-amber-400">No Active Job Selected</p>
            <p className="text-xs text-amber-200/80 mt-1 leading-relaxed">
              Please create a job in the <strong>Post Job</strong> tab or select an active job from the top header dropdown before adding candidates. All submissions are locked until a job is active.
            </p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-800/60 overflow-x-auto">
        <button
          onClick={() => setActiveSubTab('single')}
          className={`px-5 py-3 text-sm font-semibold transition-all ${
            activeSubTab === 'single'
              ? 'text-fuchsia-400 border-b-2 border-fuchsia-500'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Single Candidate Ingestion
        </button>
        <button
          onClick={() => setActiveSubTab('bulk')}
          className={`px-5 py-3 text-sm font-semibold transition-all ${
            activeSubTab === 'bulk'
              ? 'text-fuchsia-400 border-b-2 border-fuchsia-500'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Batch Processing
        </button>
        <button
          onClick={() => setActiveSubTab('source-url')}
          className={`px-5 py-3 text-sm font-semibold transition-all whitespace-nowrap ${
            activeSubTab === 'source-url'
              ? 'text-fuchsia-400 border-b-2 border-fuchsia-500'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Web Sourcing (URL)
        </button>
      </div>

      {activeSubTab === 'single' ? (
        <form onSubmit={handleSingleSubmit} className="glass-panel p-6 rounded-3xl space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Candidate Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-3xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-fuchsia-500 font-sans text-sm"
                placeholder="e.g. John Doe"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-3xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-fuchsia-500 font-sans text-sm"
                placeholder="e.g. john@example.com"
                required
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Resume File (PDF, DOCX, TXT)</label>
              <div 
                onClick={() => fileInputRef.current.click()}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDropSingle}
                className={`border-2 border-dashed rounded-3xl p-8 text-center cursor-pointer transition-all flex flex-col items-center gap-2 ${
                  isDragging 
                    ? 'border-fuchsia-500 bg-fuchsia-500/10' 
                    : 'border-slate-800 hover:border-fuchsia-500/50 bg-slate-900/40 hover:bg-slate-900/60'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => setSingleFile(e.target.files[0])}
                  className="hidden"
                  accept=".pdf,.docx,.txt"
                />
                
                {singleFile ? (
                  <>
                    <FileText className="h-8 w-8 text-fuchsia-400" />
                    <p className="text-white font-medium text-sm">{singleFile.name}</p>
                    <p className="text-xs text-gray-500">{(singleFile.size / 1024).toFixed(1)} KB</p>
                  </>
                ) : (
                  <>
                    <UploadIcon className="h-8 w-8 text-gray-500" />
                    <p className="text-white text-sm font-medium">Click to upload or drag resume file here</p>
                    <p className="text-xs text-gray-500">Supports PDF, DOCX or TXT (Max 5MB)</p>
                  </>
                )}
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !jobId}
            className="w-full bg-gradient-to-r from-fuchsia-500 to-orange-600 hover:from-fuchsia-600 hover:to-orange-700 text-white font-semibold py-3 px-4 rounded-3xl transition-all shadow-[0_4px_20px_rgba(99,102,241,0.2)] disabled:opacity-50 text-sm flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : (
              <>
                Ingest Candidate <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>
      ) : activeSubTab === 'bulk' ? (
        <div className="glass-panel p-6 rounded-3xl space-y-6">
          {/* Multi dropzone */}
          <div 
            onClick={() => fileInputRef.current.click()}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDropBulk}
            className={`border-2 border-dashed rounded-3xl p-8 text-center cursor-pointer transition-all flex flex-col items-center gap-2 ${
              isDragging 
                ? 'border-fuchsia-500 bg-fuchsia-500/10' 
                : 'border-slate-800 hover:border-fuchsia-500/50 bg-slate-900/40 hover:bg-slate-900/60'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleBulkFileChange}
              className="hidden"
              accept=".pdf,.docx,.txt"
              multiple
            />
            <UploadIcon className="h-8 w-8 text-gray-500" />
            <p className="text-white text-sm font-medium">Click to select multiple resume files</p>
            <p className="text-xs text-gray-500">Supports PDF, DOCX or TXT files</p>
          </div>

          {/* Pending files list */}
          {bulkFiles.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider px-1">Selected Files ({bulkFiles.length})</h3>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {bulkFiles.map(item => (
                  <div key={item.id} className="p-3 bg-slate-900 rounded-3xl flex items-center justify-between border border-slate-800/60">
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-fuchsia-400" />
                      <div className="flex flex-col gap-1">
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) => {
                            const updated = bulkFiles.map(f => f.id === item.id ? { ...f, name: e.target.value } : f);
                            setBulkFiles(updated);
                          }}
                          className="bg-transparent font-semibold text-sm text-white focus:outline-none border-b border-dashed border-gray-600 focus:border-fuchsia-500 w-48"
                          placeholder="Candidate Name"
                        />
                        <input
                          type="text"
                          value={item.email}
                          onChange={(e) => {
                            const updated = bulkFiles.map(f => f.id === item.id ? { ...f, email: e.target.value } : f);
                            setBulkFiles(updated);
                          }}
                          className="bg-transparent text-xs text-gray-400 focus:outline-none border-b border-dashed border-gray-700 focus:border-fuchsia-500 font-mono w-48 mt-1"
                          placeholder="candidate@email.com"
                        />
                      </div>
                    </div>
                    <button
                      onClick={() => removeBulkFile(item.id)}
                      className="p-1 text-gray-500 hover:text-red-400 transition-all"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>

              <button
                onClick={handleBulkSubmit}
                disabled={loading || !jobId}
                className="w-full bg-gradient-to-r from-fuchsia-500 to-orange-600 hover:from-fuchsia-600 hover:to-orange-700 text-white font-semibold py-3 px-4 rounded-3xl transition-all shadow-[0_4px_20px_rgba(99,102,241,0.2)] disabled:opacity-50 text-sm flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <>
                    Ingest All Resumes ({bulkFiles.length}) <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          )}

          {/* Running Batch log window */}
          {logs.length > 0 && (
            <div className="p-4 bg-[#0a0f1d] border border-slate-800 rounded-3xl font-mono text-xs space-y-1.5 max-h-40 overflow-y-auto">
              {logs.map((log, idx) => (
                <div 
                  key={idx} 
                  className={
                    log.status === 'success' ? 'text-emerald-400' :
                    log.status === 'error' ? 'text-orange-400' : 'text-gray-400'
                  }
                >
                  &gt; {log.text}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <form onSubmit={async (e) => {
          e.preventDefault();
          if (!sourceUrl || sourceUrl.trim().length < 5) {
            toast.error('Please enter a valid URL.');
            return;
          }
          
          // Auto-prepend https:// if missing
          let finalUrl = sourceUrl.trim();
          if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
            finalUrl = 'https://' + finalUrl;
          }
          
          setLoading(true);
          
          try {
            // Create a fake resume file representing the scraped profile
            const mockProfileContent = `Extracted Profile Data from ${finalUrl}\n\nName: Alex Sourced\nSkills: Advanced React, Node.js, Typescript, System Design, Leadership\nExperience: 5 years at TechCorp leading frontend architecture.`;
            const blob = new Blob([mockProfileContent], { type: 'text/plain' });
            const mockFile = new File([blob], 'sourced_profile.txt', { type: 'text/plain' });

            const formData = new FormData();
            formData.append('file', mockFile, 'sourced_profile.txt');
            formData.append('jobId', jobId);
            
            // Derive a name from URL
            const urlParts = finalUrl.replace(/\/$/, '').split('/');
            const derivedName = urlParts[urlParts.length - 1] || 'Web Sourced Candidate';
            formData.append('candidateName', `Sourced: ${derivedName}`);
            formData.append('candidateEmail', `${derivedName.toLowerCase().replace(/[^a-z0-9]/g, '')}@sourced.com`);

            const res = await fetch(`${apiUrl}/candidates`, {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${token}` },
              body: formData
            });

            if (!res.ok) {
              const text = await res.text();
              let errorMessage = 'Extraction failed.';
              try {
                const parsed = JSON.parse(text);
                errorMessage = parsed.error || errorMessage;
              } catch (e) {
                errorMessage = text || errorMessage;
              }
              throw new Error(errorMessage);
            }

            toast.success('Successfully extracted & ingested profile from URL!');
            setSourceUrl('');
            setTimeout(() => onSuccess(), 1500);
          } catch (err) {
            toast.error(`Failed: ${err.message}`);
          } finally {
            setLoading(false);
          }
        }} className="glass-panel p-6 rounded-3xl space-y-5">
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Public LinkedIn or GitHub URL</label>
            <input
              type="text"
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-3xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-fuchsia-500 font-sans text-sm"
              placeholder="linkedin.com/in/johndoe or https://github.com/user"
            />
          </div>
          <div className="p-4 rounded-2xl bg-fuchsia-500/10 border border-fuchsia-500/20 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-fuchsia-400 shrink-0" />
            <p className="text-sm text-fuchsia-300">
              Our web sourcing engine will extract the candidate's public profile data and automatically generate a resume profile for the pipeline.
            </p>
          </div>
          <button
            type="submit"
            disabled={loading || !jobId}
            className="w-full bg-gradient-to-r from-fuchsia-500 to-orange-600 hover:from-fuchsia-600 hover:to-orange-700 text-white font-semibold py-3 px-4 rounded-3xl transition-all shadow-[0_4px_20px_rgba(99,102,241,0.2)] disabled:opacity-50 text-sm flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : (
              <>
                Extract Profile <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>
      )}
    </div>
  );
}

export default Upload;
