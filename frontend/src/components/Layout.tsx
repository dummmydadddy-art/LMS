import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import api from '../services/api';
import {
  BookOpen,
  Calendar,
  FileText,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Bell,
  User,
  Users,
  CreditCard,
  Award,
  BookMarked,
  Clock,
  Menu,
  X,
  Megaphone,
  CheckCircle,
  HelpCircle,
  AlertCircle,
  Video
} from 'lucide-react';

interface LayoutProps {
  user: {
    id: string;
    email: string;
    role: string;
    full_name?: string;
  } | null;
  onLogout: () => void;
  onProfileUpdate?: () => void;
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ user, onLogout, onProfileUpdate, children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [readNotifications, setReadNotifications] = useState<string[]>([]);

  // Profile modal and password change states
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Account settings editing states
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileMsg, setProfileMsg] = useState('');
  const [profileError, setProfileError] = useState('');

  useEffect(() => {
    if (user) {
      setEmail(user.email || '');
      setFullName(user.full_name || '');
    }
  }, [user]);

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMsg('');
    setProfileError('');
    setProfileLoading(true);

    try {
      const res = await api.put('/api/auth/profile', {
        email,
        full_name: fullName,
      });

      if (res.data?.success) {
        setProfileMsg('Profile updated successfully!');
        if (onProfileUpdate) onProfileUpdate();
      } else {
        setProfileError(res.data?.error || 'Failed to update profile.');
      }
    } catch (err: any) {
      setProfileError(err.response?.data?.error || 'An error occurred while updating profile.');
    } finally {
      setProfileLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg('');
    setPasswordError('');

    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match.');
      return;
    }

    setPasswordLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        setPasswordError(error.message);
      } else {
        setPasswordMsg('Password changed successfully!');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (err: any) {
      setPasswordError('Failed to change password.');
    } finally {
      setPasswordLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchNotifications();
    }
  }, [user]);

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/api/notifications');
      if (res.data?.success) {
        const sorted = (res.data.notifications || []).sort((a: any, b: any) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        setNotifications(sorted);
        
        if (user) {
          const key = `read_notifications_${user.id}`;
          const readIds = JSON.parse(localStorage.getItem(key) || '[]');
          setReadNotifications(readIds);
          const unread = sorted.filter((n: any) => !readIds.includes(n.id));
          setUnreadCount(unread.length);
        }
      }
    } catch (err) {
      console.error('Failed to load notifications', err);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    onLogout();
    navigate('/login');
  };

  const handleMarkAsRead = (id: string) => {
    if (!user) return;
    const key = `read_notifications_${user.id}`;
    const readIds = JSON.parse(localStorage.getItem(key) || '[]');
    if (!readIds.includes(id)) {
      const newReadIds = [...readIds, id];
      localStorage.setItem(key, JSON.stringify(newReadIds));
      setReadNotifications(newReadIds);
      const unread = notifications.filter((n: any) => !newReadIds.includes(n.id));
      setUnreadCount(unread.length);
    }
  };

  const handleMarkAllAsRead = () => {
    if (!user || notifications.length === 0) return;
    const key = `read_notifications_${user.id}`;
    const allIds = notifications.map((n: any) => n.id);
    localStorage.setItem(key, JSON.stringify(allIds));
    setReadNotifications(allIds);
    setUnreadCount(0);
  };

  const getNavigation = () => {
    if (!user) return [];

    switch (user.role) {
      case 'SUPER_ADMIN':
        return [
          { name: 'Dashboard', path: '/admin', icon: LayoutDashboard },
          { name: 'Courses', path: '/admin/courses', icon: BookOpen },
          { name: 'Batches', path: '/admin/batches', icon: BookMarked },
          { name: 'Teachers', path: '/admin/teachers', icon: GraduationCap },
          { name: 'Students', path: '/admin/students', icon: Users },
          { name: 'Fees Management', path: '/admin/fees', icon: CreditCard },
          { name: 'Certificates', path: '/admin/certificates', icon: Award },
          { name: 'Timetable', path: '/admin/timetable', icon: Calendar },
          { name: 'Notifications', path: '/admin/notifications', icon: Bell },
          { name: 'Reports', path: '/admin/reports', icon: FileText },
        ];
      case 'TEACHER':
        return [
          { name: 'Dashboard', path: '/teacher', icon: LayoutDashboard },
          { name: 'Attendance', path: '/teacher/attendance', icon: Clock },
          { name: 'Study Materials', path: '/teacher/materials', icon: BookMarked },
          { name: 'Exams', path: '/teacher/exams', icon: GraduationCap },
          { name: 'Timetable', path: '/teacher/timetable', icon: Calendar },
          { name: 'Live Sessions', path: '/teacher/live-sessions', icon: Video },
          { name: 'Notifications', path: '/teacher/notifications', icon: Bell },
          { name: 'Student Progress', path: '/teacher/progress', icon: Users },
        ];
      case 'STUDENT':
        return [
          { name: 'My Dashboard', path: '/student', icon: LayoutDashboard },
          { name: 'Courses & Materials', path: '/student/courses', icon: BookOpen },
          { name: 'My Timetable', path: '/student/timetable', icon: Calendar },
          { name: 'Live Sessions', path: '/student/live-sessions', icon: Video },
          { name: 'Exams & Quizzes', path: '/student/exams', icon: GraduationCap },
          { name: 'Grades & Results', path: '/student/results', icon: Award },
          { name: 'Fee Ledger', path: '/student/fees', icon: CreditCard },
          { name: 'Certificates', path: '/student/certificates', icon: Award },
        ];
      default:
        return [];
    }
  };

  const navigation = getNavigation();

  const getNotifIcon = (type: string) => {
    switch (type) {
      case 'ANNOUNCEMENT': return <Megaphone className="h-5 w-5 text-amber-400" />;
      case 'EXAM': return <GraduationCap className="h-5 w-5 text-red-400" />;
      case 'LECTURE': return <BookOpen className="h-5 w-5 text-primary-400" />;
      case 'ASSIGNMENT': return <FileText className="h-5 w-5 text-green-400" />;
      default: return <Bell className="h-5 w-5 text-slate-400" />;
    }
  };

  return (
    <div className="min-h-screen flex bg-dark-950">
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex flex-col w-64 glass-card border-y-0 border-l-0 rounded-none h-screen sticky top-0 bg-dark-900/40 backdrop-blur-xl">
        <div className="h-16 flex items-center gap-3 px-6 border-b border-slate-800/80">
          <div className="h-8 w-8 rounded-lg overflow-hidden flex items-center justify-center bg-slate-900 border border-slate-800 shadow-lg shadow-primary-500/10">
            <img src="/logo.png" alt="Cosmos LMS" className="h-6 w-6 object-contain" />
          </div>
          <span className="font-bold text-lg text-slate-100">Cosmos LMS</span>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          {navigation.map((item) => {
            const Icon = item.icon;
            const active = item.path === '/admin' || item.path === '/teacher' || item.path === '/student'
              ? location.pathname === item.path
              : location.pathname === item.path || location.pathname.startsWith(item.path + '/');
            return (
              <button
                key={item.name}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                  active
                    ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/15'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/40'
                }`}
              >
                <Icon className={`h-5 w-5 ${active ? 'text-white' : 'text-slate-400 group-hover:text-slate-100'}`} />
                {item.name}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800/80 bg-dark-950/20">
          <div className="flex items-center gap-3 px-2 py-2 mb-3">
            <div className="h-9 w-9 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700">
              <User className="h-4.5 w-4.5 text-slate-300" />
            </div>
            <div className="truncate">
              <p className="text-xs font-semibold text-slate-200 truncate">{user?.full_name || 'LMS User'}</p>
              <p className="text-[10px] text-slate-400 truncate">{user?.role?.replace('_', ' ')}</p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
          >
            <LogOut className="h-4.5 w-4.5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Sidebar - Mobile toggle */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-dark-950/80 backdrop-blur-sm" onClick={() => setSidebarOpen(false)}></div>
          <aside className="w-64 glass-card border-y-0 border-l-0 rounded-none h-full relative flex flex-col bg-dark-900">
            <div className="h-16 flex items-center justify-between px-6 border-b border-slate-800/80">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg overflow-hidden flex items-center justify-center bg-slate-900 border border-slate-800 shadow-lg shadow-primary-500/10">
                  <img src="/logo.png" alt="Cosmos LMS" className="h-6 w-6 object-contain" />
                </div>
                <span className="font-bold text-lg text-slate-100">Cosmos LMS</span>
              </div>
              <button onClick={() => setSidebarOpen(false)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
              {navigation.map((item) => {
                const Icon = item.icon;
                const active = item.path === '/admin' || item.path === '/teacher' || item.path === '/student'
                  ? location.pathname === item.path
                  : location.pathname === item.path || location.pathname.startsWith(item.path + '/');
                return (
                  <button
                    key={item.name}
                    onClick={() => {
                      navigate(item.path);
                      setSidebarOpen(false);
                    }}
                    className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                      active
                        ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/15'
                        : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/40'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    {item.name}
                  </button>
                );
              })}
            </nav>

            <div className="p-4 border-t border-slate-800/80 bg-dark-950/20">
              <div className="flex items-center gap-3 px-2 py-2 mb-3">
                <div className="h-9 w-9 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700">
                  <User className="h-4.5 w-4.5 text-slate-300" />
                </div>
                <div className="truncate">
                  <p className="text-xs font-semibold text-slate-200 truncate">{user?.full_name || 'LMS User'}</p>
                  <p className="text-[10px] text-slate-400 truncate">{user?.role?.replace('_', ' ')}</p>
                </div>
              </div>
              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
              >
                <LogOut className="h-4.5 w-4.5" />
                Sign Out
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-16 flex items-center justify-between px-6 border-b border-slate-800/80 sticky top-0 bg-dark-950/80 backdrop-blur-md z-40">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-slate-400 hover:text-white"
            >
              <Menu className="h-6 w-6" />
            </button>
            <h1 className="text-lg font-bold text-slate-100 capitalize">
              {location.pathname.split('/').pop()?.replace('-', ' ') || 'Dashboard'}
            </h1>
          </div>

          <div className="flex items-center gap-4">
            {/* Notification trigger */}
            <div className="relative">
              <button
                onClick={() => {
                  setNotificationsOpen(!notificationsOpen);
                }}
                className="h-10 w-10 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/50 flex items-center justify-center text-slate-300 hover:text-white transition-colors relative"
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 h-4 w-4 rounded-full bg-red-500 text-[10px] font-bold text-white flex items-center justify-center animate-pulse-subtle">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Drawer */}
              {notificationsOpen && (
                <div className="absolute right-0 mt-3 w-80 glass-card p-4 z-50 max-h-96 overflow-y-auto bg-dark-900/95 shadow-xl border-slate-800">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <h3 className="font-semibold text-sm text-slate-200">Notifications</h3>
                    <div className="flex items-center gap-2">
                      {unreadCount > 0 && (
                        <>
                          <button
                            onClick={handleMarkAllAsRead}
                            className="text-primary-400 hover:text-primary-300 text-[10px] font-semibold transition-colors"
                          >
                            Mark all read
                          </button>
                          <span className="text-slate-700 text-xs select-none">|</span>
                        </>
                      )}
                      <button
                        onClick={() => setNotificationsOpen(false)}
                        className="text-slate-400 hover:text-white text-xs transition-colors"
                      >
                        Close
                      </button>
                    </div>
                  </div>

                  <div className="mt-3 space-y-2">
                    {notifications.length === 0 ? (
                      <p className="text-slate-500 text-xs text-center py-4">No notifications yet.</p>
                    ) : (
                      notifications.map((n) => {
                        const isUnread = !readNotifications.includes(n.id);
                        return (
                          <div
                            key={n.id}
                            onClick={() => handleMarkAsRead(n.id)}
                            className={`flex gap-3 p-2.5 rounded-xl cursor-pointer transition-all duration-200 ${
                              isUnread 
                                ? 'bg-primary-950/10 border border-primary-500/10 hover:bg-primary-950/20' 
                                : 'hover:bg-slate-800/20'
                            }`}
                          >
                            <div className="mt-0.5 flex-shrink-0">{getNotifIcon(n.notification_type)}</div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-xs font-semibold text-slate-200 truncate">{n.title}</p>
                                {isUnread && (
                                  <span className="h-1.5 w-1.5 rounded-full bg-primary-500 flex-shrink-0" title="Unread"></span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-400 line-clamp-2 mt-0.5 leading-relaxed">{n.message}</p>
                              <span className="text-[9px] text-slate-500 mt-1.5 block">
                                {new Date(n.created_at).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() => setProfileModalOpen(true)}
              className="h-10 w-10 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/50 flex items-center justify-center text-slate-300 hover:text-white transition-colors"
              title="View Profile"
            >
              <User className="h-5 w-5" />
            </button>
          </div>
        </header>

        {/* Dynamic page container */}
        <main className="flex-1 p-6 overflow-y-auto">
          {children}
        </main>
      </div>

      {/* User profile & password update modal */}
      {profileModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark-950/80 backdrop-blur-sm">
          <div className="glass-card w-full max-w-md overflow-hidden flex flex-col relative bg-dark-900 border-slate-800 shadow-2xl">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/40">
              <div>
                <h3 className="text-lg font-bold text-slate-100">User Profile</h3>
                <p className="text-xs text-slate-400 mt-0.5">Your account information</p>
              </div>
              <button
                onClick={() => {
                  setProfileModalOpen(false);
                  setPasswordMsg('');
                  setPasswordError('');
                  setNewPassword('');
                  setConfirmPassword('');
                  setProfileMsg('');
                  setProfileError('');
                }}
                className="text-slate-400 hover:text-white border border-slate-800 hover:bg-slate-800 p-2 rounded-xl transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Profile Details */}
              <form onSubmit={handleProfileUpdate} className="space-y-4 bg-slate-900/30 p-4 border border-slate-800 rounded-xl">
                <h4 className="font-bold text-xs text-slate-300 uppercase tracking-wider">Account Settings</h4>
                
                {profileMsg && (
                  <div className="bg-green-500/10 border border-green-500/20 text-green-400 text-xs rounded-xl p-3 text-center">
                    {profileMsg}
                  </div>
                )}
                {profileError && (
                  <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl p-3 text-center">
                    {profileError}
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400">Full Name</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    className="w-full glass-input text-sm text-slate-200"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full glass-input text-sm text-slate-200"
                    required
                  />
                </div>

                <div className="flex justify-between items-center border-t border-slate-800/60 pt-3 mt-2">
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase font-semibold text-slate-500">System Role</span>
                    <span className="font-bold text-primary-400 text-xs uppercase mt-0.5">
                      {user?.role?.replace('_', ' ')}
                    </span>
                  </div>
                  <button
                    type="submit"
                    disabled={profileLoading}
                    className="text-xs py-2 px-4 rounded-xl bg-primary-600 hover:bg-primary-500 text-white font-bold transition-all disabled:opacity-50"
                  >
                    {profileLoading ? 'Saving...' : 'Save Settings'}
                  </button>
                </div>
              </form>

              {/* Password update form */}
              <form onSubmit={handlePasswordChange} className="space-y-4">
                <h4 className="font-bold text-sm text-slate-200 border-b border-slate-800 pb-2">Change Password</h4>
                
                {passwordMsg && (
                  <div className="bg-green-500/10 border border-green-500/20 text-green-400 text-xs rounded-xl p-3 text-center">
                    {passwordMsg}
                  </div>
                )}
                {passwordError && (
                  <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl p-3 text-center">
                    {passwordError}
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400 uppercase">New Password</label>
                  <input
                    type="password"
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    className="w-full glass-input"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400 uppercase">Confirm Password</label>
                  <input
                    type="password"
                    placeholder="Re-enter new password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    className="w-full glass-input"
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="btn-primary w-full py-2.5 text-xs font-bold mt-2"
                  disabled={passwordLoading}
                >
                  {passwordLoading ? 'Updating...' : 'Update Password'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Layout;
