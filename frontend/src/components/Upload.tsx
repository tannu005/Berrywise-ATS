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
      const data = await res.json();

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
        const data = await res.json();

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
            Upload Candidates <UploadIcon className="h-6 w-6 text-teal-400" />
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Add resumes to evaluation pipeline for <strong className="text-teal-400">{job?.title || 'Active Job'}</strong>.
          </p>
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

      {/* Tabs */}
      <div className="flex border-b border-gray-800/60">
        <button
          onClick={() => setActiveSubTab('single')}
          className={`px-5 py-3 text-sm font-semibold transition-all ${
            activeSubTab === 'single'
              ? 'text-teal-400 border-b-2 border-teal-500'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Single Candidate Ingestion
        </button>
        <button
          onClick={() => setActiveSubTab('bulk')}
          className={`px-5 py-3 text-sm font-semibold transition-all ${
            activeSubTab === 'bulk'
              ? 'text-teal-400 border-b-2 border-teal-500'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Batch Processing
        </button>
      </div>

      {activeSubTab === 'single' ? (
        <form onSubmit={handleSingleSubmit} className="glass-panel p-6 rounded-2xl space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Candidate Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-[#222222] border border-gray-800 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-teal-500 font-sans text-sm"
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
                className="w-full bg-[#222222] border border-gray-800 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-teal-500 font-sans text-sm"
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
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all flex flex-col items-center gap-2 ${
                  isDragging 
                    ? 'border-teal-500 bg-teal-500/10' 
                    : 'border-gray-800 hover:border-teal-500/50 bg-[#222222]/40 hover:bg-[#222222]/60'
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
                    <FileText className="h-8 w-8 text-teal-400" />
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
            disabled={loading}
            className="w-full bg-gradient-to-r from-teal-500 to-rose-600 hover:from-teal-600 hover:to-rose-700 text-white font-semibold py-3 px-4 rounded-xl transition-all shadow-glow disabled:opacity-50 text-sm flex items-center justify-center gap-2"
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
      ) : (
        <div className="glass-panel p-6 rounded-2xl space-y-6">
          {/* Multi dropzone */}
          <div 
            onClick={() => fileInputRef.current.click()}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDropBulk}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all flex flex-col items-center gap-2 ${
              isDragging 
                ? 'border-teal-500 bg-teal-500/10' 
                : 'border-gray-800 hover:border-teal-500/50 bg-[#222222]/40 hover:bg-[#222222]/60'
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
                  <div key={item.id} className="p-3 bg-[#222222] rounded-xl flex items-center justify-between border border-gray-800/60">
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-teal-400" />
                      <div>
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) => {
                            const updated = bulkFiles.map(f => f.id === item.id ? { ...f, name: e.target.value } : f);
                            setBulkFiles(updated);
                          }}
                          className="bg-transparent font-semibold text-sm text-white focus:outline-none border-b border-dashed border-gray-600 focus:border-teal-500"
                        />
                        <p className="text-xs text-gray-500 mt-1 font-mono">{item.email}</p>
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
                disabled={loading}
                className="w-full bg-gradient-to-r from-teal-500 to-rose-600 hover:from-teal-600 hover:to-rose-700 text-white font-semibold py-3 px-4 rounded-xl transition-all shadow-glow disabled:opacity-50 text-sm flex items-center justify-center gap-2"
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
            <div className="p-4 bg-[#0a0f1d] border border-gray-800 rounded-xl font-mono text-xs space-y-1.5 max-h-40 overflow-y-auto">
              {logs.map((log, idx) => (
                <div 
                  key={idx} 
                  className={
                    log.status === 'success' ? 'text-emerald-400' :
                    log.status === 'error' ? 'text-rose-400' : 'text-gray-400'
                  }
                >
                  &gt; {log.text}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default Upload;
