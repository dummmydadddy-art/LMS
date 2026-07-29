import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Award, CheckCircle, ShieldAlert, Loader2, Sparkles } from 'lucide-react';

const VerifyCertificate: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [certificate, setCertificate] = useState<any>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (id) {
      verifyCertificate();
    }
  }, [id]);

  const verifyCertificate = async () => {
    try {
      const res = await api.get(`/api/certificates/verify?certificate_id=${id}`);
      if (res.data?.success) {
        setCertificate(res.data.certificate);
      } else {
        setError(res.data?.error || 'Invalid certificate ID');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to authenticate certificate credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-dark-950 text-slate-100">
      {/* Decorative blurred backgrounds */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl -z-10 animate-pulse-subtle"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary-700/10 rounded-full blur-3xl -z-10 animate-pulse-subtle" style={{ animationDelay: '1.5s' }}></div>

      <div className="w-full max-w-lg glass-card p-8 text-center relative border-primary-500/20">
        <div className="flex flex-col items-center mb-6">
          <div className="h-16 w-16 rounded-2xl overflow-hidden flex items-center justify-center bg-slate-900 border border-slate-800 shadow-lg shadow-primary-500/10 mb-4">
            <img src="/logo.png" alt="LMS" className="h-12 w-12 object-contain" />
          </div>
          <h2 className="text-xl font-bold bg-gradient-to-r from-slate-100 to-slate-400 bg-clip-text text-transparent">LMS Registry</h2>
          <p className="text-slate-400 text-xs mt-0.5">Public Certificate Verification Portal</p>
        </div>

        {loading ? (
          <div className="flex flex-col items-center py-12 space-y-3">
            <Loader2 className="h-8 w-8 text-primary-500 animate-spin" />
            <p className="text-xs text-slate-400">Verifying registry records...</p>
          </div>
        ) : error ? (
          <div className="py-8 space-y-4">
            <div className="h-16 w-16 bg-red-500/10 border border-red-500/20 text-red-400 rounded-full flex items-center justify-center mx-auto">
              <ShieldAlert className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-200">Verification Failed</h3>
            <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">{error}</p>
            <div className="pt-4">
              <button onClick={() => navigate('/login')} className="btn-secondary py-2 text-xs">
                Go to Portal
              </button>
            </div>
          </div>
        ) : (
          <div className="py-6 space-y-6">
            <div className="h-16 w-16 bg-green-500/10 border border-green-500/20 text-green-400 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="h-8 w-8" />
            </div>
            
            <div className="space-y-1">
              <span className="text-[10px] bg-green-500/10 text-green-400 border border-green-500/20 px-3 py-1 rounded-full text-xs font-semibold">
                ✓ Verified Authentic Record
              </span>
              <h3 className="text-xl font-bold text-slate-200 mt-4">{certificate.students?.full_name}</h3>
              <p className="text-xs text-slate-400">Recipient Student Name</p>
            </div>

            <div className="bg-slate-900/30 border border-slate-800 rounded-xl p-4 text-left space-y-3 max-w-sm mx-auto text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Course Name:</span>
                <strong className="text-slate-200">{certificate.courses?.course_name}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Completion Date:</span>
                <strong className="text-slate-200">{certificate.completion_date}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Certificate ID:</span>
                <strong className="text-primary-400 font-mono">{certificate.certificate_id}</strong>
              </div>
            </div>

            <div className="pt-4 text-[10px] text-slate-500">
              Verified on LMS Certificate Registry on {new Date(certificate.created_at).toLocaleString()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VerifyCertificate;
