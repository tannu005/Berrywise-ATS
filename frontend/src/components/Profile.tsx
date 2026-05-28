import React, { useState, useEffect } from 'react';
import { User, Mail, Shield, Briefcase, Users, Database, Cloud, Save, Server, Eye, EyeOff } from 'lucide-react';
import { Job, Candidate } from '../types';
import { toast } from 'react-hot-toast';

interface ProfileProps {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  } | null;
  jobs: Job[];
  candidates: Candidate[];
  setTab: (tab: string) => void;
  token?: string;
  apiUrl?: string;
}

export const Profile: React.FC<ProfileProps> = ({ user, jobs, candidates, setTab, token, apiUrl }) => {
  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState('587');
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPass, setSmtpPass] = useState('');
  const [smtpSecure, setSmtpSecure] = useState(false);
  const [smtpFrom, setSmtpFrom] = useState(user?.email || '');
  
  const [isConfigured, setIsConfigured] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    fetchSmtpSettings();
  }, []);

  const fetchSmtpSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiUrl}/smtp`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.configured) {
          setSmtpHost(data.host || '');
          setSmtpPort(String(data.port || '587'));
          setSmtpUser(data.user || '');
          setSmtpSecure(data.secure === 1);
          setSmtpFrom(data.from_email || '');
          setSmtpPass('••••••••'); // Mask password placeholder
          setIsConfigured(true);
        } else {
          setIsConfigured(false);
        }
      }
    } catch (err) {
      console.error('Failed to load SMTP settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSmtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!smtpHost || !smtpPort || !smtpUser || !smtpPass || !smtpFrom) {
      toast.error('All SMTP fields are required.');
      return;
    }

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(smtpFrom)) {
      toast.error('Please enter a valid sender email address.');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`${apiUrl}/smtp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          host: smtpHost.trim(),
          port: parseInt(smtpPort),
          user: smtpUser.trim(),
          pass: smtpPass === '••••••••' ? '' : smtpPass, // Only update password if changed from placeholder
          secure: smtpSecure,
          from_email: smtpFrom.trim()
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save SMTP settings.');
      }

      toast.success('SMTP Configuration saved successfully!');
      setIsConfigured(true);
      if (smtpPass !== '••••••••') {
        setSmtpPass('••••••••');
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const getInitials = (name: string) => {
    if (!name) return 'R';
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const totalJobsCount = jobs.length;
  const totalCandidatesCount = candidates.length;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white font-sans flex items-center gap-2">
            Recruiter Profile <User className="h-6 w-6 text-fuchsia-400" />
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Manage your account details, active sessions, and SMTP email integrations.
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Hand: Profile & Stats */}
        <div className="md:col-span-1 space-y-6">
          {/* Profile Card */}
          <div className="glass-panel p-6 rounded-3xl flex flex-col items-center text-center space-y-4 border border-slate-800/60 relative overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-fuchsia-500 to-orange-500" />

            <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-fuchsia-500 to-orange-500 flex items-center justify-center text-2xl font-black text-white shadow-[0_4px_20px_rgba(217,70,239,0.35)] mt-4">
              {getInitials(user?.name || '')}
            </div>

            <div className="space-y-1">
              <h3 className="text-xl font-bold text-white">{user?.name || 'Recruiter Name'}</h3>
              <div className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold bg-fuchsia-500/10 text-fuchsia-400 border border-fuchsia-500/20 uppercase tracking-wider">
                {user?.role || 'Recruiter'}
              </div>
            </div>

            <div className="w-full border-t border-slate-800/60 pt-4 text-left space-y-3">
              <div className="flex items-center gap-2 text-gray-400 text-xs">
                <Mail className="w-4 h-4 text-slate-500 shrink-0" />
                <span className="truncate">{user?.email || 'email@example.com'}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-400 text-xs">
                <Shield className="w-4 h-4 text-slate-500 shrink-0" />
                <span className="font-mono truncate">ID: {user?.id || 'N/A'}</span>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="space-y-4">
            <div className="glass-panel p-5 rounded-3xl border border-slate-800/60 flex items-center gap-4 hover:border-fuchsia-500/30 transition-all duration-300">
              <div className="p-3 bg-fuchsia-500/10 text-fuchsia-400 rounded-2xl border border-fuchsia-500/20">
                <Briefcase className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-gray-400 font-medium">Jobs Posted</p>
                <h4 className="text-xl font-black text-white mt-0.5">{totalJobsCount}</h4>
              </div>
            </div>

            <div className="glass-panel p-5 rounded-3xl border border-slate-800/60 flex items-center gap-4 hover:border-teal-500/30 transition-all duration-300">
              <div className="p-3 bg-teal-500/10 text-teal-400 rounded-2xl border border-teal-500/20">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-gray-400 font-medium">Candidates Ingested</p>
                <h4 className="text-xl font-black text-white mt-0.5">{totalCandidatesCount}</h4>
              </div>
            </div>
          </div>
        </div>

        {/* Right Hand: SMTP Setup & Status */}
        <div className="md:col-span-2 space-y-6">
          {/* Integration Status Card */}
          <div className="glass-panel p-6 rounded-3xl border border-slate-800/60 space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Database className="w-5 h-5 text-fuchsia-400" /> Platform Integration Status
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div className="p-3 bg-[#11091a]/40 border border-gray-800/50 rounded-2xl flex items-center justify-between">
                <span className="text-xs text-gray-300 font-medium flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-slate-400" /> Local Database
                </span>
                <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 rounded-full font-bold">CONNECTED</span>
              </div>

              <div className="p-3 bg-[#11091a]/40 border border-gray-800/50 rounded-2xl flex items-center justify-between">
                <span className="text-xs text-gray-300 font-medium flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-400" /> SMTP Email Service
                </span>
                {isConfigured ? (
                  <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 rounded-full font-bold animate-pulse">CONNECTED</span>
                ) : (
                  <span className="text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2.5 py-0.5 rounded-full font-bold">SIMULATED</span>
                )}
              </div>
            </div>

            {isConfigured ? (
              <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl text-xs text-emerald-300/90 leading-relaxed mt-2">
                <strong>✔ Active SMTP Connected</strong>: Evaluation reports will now be delivered via your configured mail server to any custom email addresses you provide in real-time.
              </div>
            ) : (
              <div className="p-4 bg-fuchsia-500/5 border border-fuchsia-500/10 rounded-2xl text-xs text-fuchsia-300/90 leading-relaxed mt-2">
                * Note: The email service is currently in high-fidelity simulation mode. Configure your real SMTP details in the form below to connect your real mailbox.
              </div>
            )}
          </div>

          {/* SMTP Configuration Form */}
          <form onSubmit={handleSaveSmtp} className="glass-panel p-6 rounded-3xl border border-slate-800/60 space-y-5">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Server className="w-5 h-5 text-fuchsia-400" /> SMTP Configuration
            </h3>

            {loading ? (
              <div className="flex justify-center items-center py-10">
                <div className="w-6 h-6 border-2 border-fuchsia-500/30 border-t-fuchsia-500 rounded-full animate-spin"></div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">SMTP Host</label>
                    <input
                      type="text"
                      value={smtpHost}
                      onChange={(e) => setSmtpHost(e.target.value)}
                      placeholder="e.g. smtp.gmail.com"
                      className="w-full bg-slate-900 border border-slate-800 rounded-3xl px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-fuchsia-500 text-sm font-sans"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">SMTP Port</label>
                    <input
                      type="text"
                      value={smtpPort}
                      onChange={(e) => setSmtpPort(e.target.value)}
                      placeholder="e.g. 587"
                      className="w-full bg-slate-900 border border-slate-800 rounded-3xl px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-fuchsia-500 text-sm font-sans"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">SMTP User / Username</label>
                    <input
                      type="text"
                      value={smtpUser}
                      onChange={(e) => setSmtpUser(e.target.value)}
                      placeholder="e.g. yourname@domain.com"
                      className="w-full bg-slate-900 border border-slate-800 rounded-3xl px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-fuchsia-500 text-sm font-sans"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">SMTP Password</label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={smtpPass}
                        onChange={(e) => setSmtpPass(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-slate-900 border border-slate-800 rounded-3xl px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-fuchsia-500 text-sm font-sans pr-10"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-fuchsia-400 transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Sender From Email Address</label>
                    <input
                      type="email"
                      value={smtpFrom}
                      onChange={(e) => setSmtpFrom(e.target.value)}
                      placeholder="e.g. recruit@company.com"
                      className="w-full bg-slate-900 border border-slate-800 rounded-3xl px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-fuchsia-500 text-sm font-sans"
                      required
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-2">
                  <input
                    type="checkbox"
                    id="smtpSecure"
                    checked={smtpSecure}
                    onChange={(e) => setSmtpSecure(e.target.checked)}
                    className="w-4 h-4 accent-fuchsia-500 cursor-pointer rounded bg-slate-900 border-slate-800 text-fuchsia-500"
                  />
                  <label htmlFor="smtpSecure" className="text-xs text-gray-300 font-medium cursor-pointer select-none">
                    Use Secure Connection (SSL/TLS, Port 465)
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  className="w-full bg-gradient-to-r from-fuchsia-500 to-orange-600 hover:from-fuchsia-600 hover:to-orange-700 text-white font-semibold py-3 px-4 rounded-3xl transition-all shadow-[0_4px_20px_rgba(99,102,241,0.2)] disabled:opacity-50 text-sm flex items-center justify-center gap-2 mt-3"
                >
                  {saving ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <Save className="h-4 w-4" /> Save SMTP Settings
                    </>
                  )}
                </button>
              </>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};
