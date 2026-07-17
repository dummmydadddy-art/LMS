import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import api from './services/api';
import Login from './pages/Login';
import VerifyCertificate from './pages/VerifyCertificate';
import Layout from './components/Layout';
import AdminDashboard from './pages/admin/AdminDashboard';
import TeacherDashboard from './pages/teacher/TeacherDashboard';
import StudentDashboard from './pages/student/StudentDashboard';
import { Loader2 } from 'lucide-react';

interface UserProfile {
  id: string;
  email: string;
  role: string;
  full_name?: string;
}

function App() {
  const [session, setSession] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (showLoading: boolean = true) => {
    if (showLoading) setLoading(true);
    try {
      const res = await api.get('/api/auth/profile');
      if (res.data?.success && res.data.profile) {
        setUserProfile(res.data.profile);
      }
    } catch (err) {
      console.error('Error fetching user database profile:', err);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    // 1. Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        fetchProfile(true);
      } else {
        setLoading(false);
      }
    });

    // 2. Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      if (session) {
        // Only show loading screen during initial signed_in event, not on background token refresh
        const shouldShowLoading = event === 'SIGNED_IN';
        fetchProfile(shouldShowLoading);
      } else {
        setUserProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-950 flex flex-col items-center justify-center space-y-4">
        <Loader2 className="h-8 w-8 text-primary-500 animate-spin" />
        <p className="text-xs text-slate-400 font-medium">Synchronizing LMS session...</p>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route 
          path="/login" 
          element={session && userProfile ? <Navigate to={getRedirectPath(userProfile.role)} replace /> : <Login onLoginSuccess={fetchProfile} />} 
        />
        <Route path="/verify-certificate/:id" element={<VerifyCertificate />} />

        {/* Protected Dashboard Routes based on role */}
        <Route
          path="/admin/*"
          element={
            session && userProfile && userProfile.role === 'SUPER_ADMIN' ? (
              <Layout user={userProfile} onLogout={() => setSession(null)} onProfileUpdate={() => fetchProfile(false)}>
                <Routes>
                  <Route path="/" element={<AdminDashboard />} />
                  <Route path="/:tab" element={<AdminDashboard />} />
                  <Route path="*" element={<Navigate to="/admin" replace />} />
                </Routes>
              </Layout>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        <Route
          path="/teacher/*"
          element={
            session && userProfile && userProfile.role === 'TEACHER' ? (
              <Layout user={userProfile} onLogout={() => setSession(null)} onProfileUpdate={() => fetchProfile(false)}>
                <Routes>
                  <Route path="/" element={<TeacherDashboard />} />
                  <Route path="/:tab" element={<TeacherDashboard />} />
                  <Route path="*" element={<Navigate to="/teacher" replace />} />
                </Routes>
              </Layout>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        <Route
          path="/student/*"
          element={
            session && userProfile && userProfile.role === 'STUDENT' ? (
              <Layout user={userProfile} onLogout={() => setSession(null)} onProfileUpdate={() => fetchProfile(false)}>
                <Routes>
                  <Route path="/" element={<StudentDashboard />} />
                  <Route path="/:tab" element={<StudentDashboard />} />
                  <Route path="*" element={<Navigate to="/student" replace />} />
                </Routes>
              </Layout>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        {/* Root Redirect handler */}
        <Route 
          path="/" 
          element={
            session && userProfile 
              ? <Navigate to={getRedirectPath(userProfile.role)} replace /> 
              : <Navigate to="/login" replace />
          } 
        />
        
        {/* Wildcard Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

function getRedirectPath(role: string): string {
  switch (role) {
    case 'SUPER_ADMIN': return '/admin';
    case 'TEACHER': return '/teacher';
    case 'STUDENT': return '/student';
    default: return '/login';
  }
}

export default App;
