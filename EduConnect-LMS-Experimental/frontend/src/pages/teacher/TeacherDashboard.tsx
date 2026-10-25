import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { supabase } from '../../supabaseClient';
import {
  Users,
  Calendar,
  FileText,
  BookMarked,
  Plus,
  Clock,
  Sparkles,
  CheckCircle,
  XCircle,
  HelpCircle,
  ChevronRight,
  Loader2,
  Bell,
  Megaphone,
  Edit3,
  Trash2,
  Search,
  Award,
  Video,
  Send,
  MessageSquare,
  Hand,
  Mic,
  Square
} from 'lucide-react';

const TeacherDashboard: React.FC = () => {
  const { tab } = useParams();
  const navigate = useNavigate();
  const activeTab = tab || 'attendance';
  
  // Base resource collections
  const [batches, setBatches] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [timetable, setTimetable] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [exams, setExams] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);

  // Selection configurations for UI forms
  const [selectedAttendanceCourse, setSelectedAttendanceCourse] = useState('');
  const [selectedBatch, setSelectedBatch] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().substring(0, 10));
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]); // Array of {student_id, status: 'PRESENT' | 'ABSENT'}
  
  // Timetable State
  const [timetableForm, setTimetableForm] = useState({ id: '', day_of_week: 'Monday', start_time: '', end_time: '', topic: '', course_id: '', batch_id: '', teacher_id: '' });
  const [weeklyForm, setWeeklyForm] = useState({
    course_id: '',
    batch_id: '',
    days: {
      Monday: { active: false, topic: '', start_time: '', end_time: '', teacher_id: '' },
      Tuesday: { active: false, topic: '', start_time: '', end_time: '', teacher_id: '' },
      Wednesday: { active: false, topic: '', start_time: '', end_time: '', teacher_id: '' },
      Thursday: { active: false, topic: '', start_time: '', end_time: '', teacher_id: '' },
      Friday: { active: false, topic: '', start_time: '', end_time: '', teacher_id: '' },
      Saturday: { active: false, topic: '', start_time: '', end_time: '', teacher_id: '' },
      Sunday: { active: false, topic: '', start_time: '', end_time: '', teacher_id: '' },
    }
  });

  const resetWeeklyForm = () => {
    setWeeklyForm({
      course_id: '',
      batch_id: '',
      days: {
        Monday: { active: false, topic: '', start_time: '', end_time: '', teacher_id: '' },
        Tuesday: { active: false, topic: '', start_time: '', end_time: '', teacher_id: '' },
        Wednesday: { active: false, topic: '', start_time: '', end_time: '', teacher_id: '' },
        Thursday: { active: false, topic: '', start_time: '', end_time: '', teacher_id: '' },
        Friday: { active: false, topic: '', start_time: '', end_time: '', teacher_id: '' },
        Saturday: { active: false, topic: '', start_time: '', end_time: '', teacher_id: '' },
        Sunday: { active: false, topic: '', start_time: '', end_time: '', teacher_id: '' },
      }
    });
  };

  // Progress States
  const [selectedProgressBatch, setSelectedProgressBatch] = useState('');
  const [progressStudents, setProgressStudents] = useState<any[]>([]);
  const [progressAttendance, setProgressAttendance] = useState<any[]>([]);
  const [progressExams, setProgressExams] = useState<any[]>([]);
  const [progressAssignments, setProgressAssignments] = useState<any[]>([]);
  const [progressSearchTerm, setProgressSearchTerm] = useState('');
  const [selectedStudentDetails, setSelectedStudentDetails] = useState<any | null>(null);
  
  // Form schemas
  const [materialForm, setMaterialForm] = useState({ title: '', description: '', file_name: '', file_url: '', file_type: 'notes', course_id: '', batch_id: '' });
  const [assignmentForm, setAssignmentForm] = useState({ title: '', description: '', file_name: '', file_url: '', due_date: '', course_id: '', batch_id: '' });
  const [examForm, setExamForm] = useState({
    title: '',
    exam_type: 'MCQ',
    course_id: '',
    batch_id: '',
    time_limit_minutes: 30,
    due_date: '',
    questions: [] as any[]
  });
  
  // MCQ question builder state
  const [mcqQuestionInput, setMcqQuestionInput] = useState({ question_text: '', marks: 5, options: [{ option_text: '', is_correct: false }, { option_text: '', is_correct: false }] });
  // Coding question builder state
  const [codingQuestionInput, setCodingQuestionInput] = useState({ question_text: '', description: '', max_marks: 10 });
  const [notificationForm, setNotificationForm] = useState({ title: '', message: '', target_type: 'ALL', target_id: '', notification_type: 'ANNOUNCEMENT' });

  // Evaluation States
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [evaluatingSub, setEvaluatingSub] = useState<any>(null);
  const [evaluationScore, setEvaluationScore] = useState('');
  const [evaluationFeedback, setEvaluationFeedback] = useState('');

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);

  // Timetable view filtering states
  const [filterCourseId, setFilterCourseId] = useState('');
  const [filterBatchId, setFilterBatchId] = useState('');

  // Live Sessions States
  const [liveSessions, setLiveSessions] = useState<any[]>([]);
  const [activeLiveSession, setActiveLiveSession] = useState<any | null>(null);
  const [liveChatMessages, setLiveChatMessages] = useState<any[]>([]);
  const [raisedHands, setRaisedHands] = useState<any[]>([]);
  const [activeRightPanel, setActiveRightPanel] = useState<'chat' | 'hands'>('chat');
  const [chatInputText, setChatInputText] = useState('');
  const [liveSessionForm, setLiveSessionForm] = useState({
    course_id: '',
    batch_id: '',
    session_type: 'LIVE',
    message: '',
    meeting_link: '',
    video_link: '',
    chat_enabled: true,
    raise_hand_enabled: true,
    voice_enabled: true,
    scheduled_at: ''
  });

  const fetchLiveSessions = async () => {
    try {
      const res = await api.get('/api/live-sessions');
      if (res.data?.success) {
        setLiveSessions(res.data.live_sessions || []);
      }
    } catch (err) {
      console.error('Error fetching live sessions:', err);
    }
  };

  const getGoogleDriveEmbedUrl = (url: string) => {
    if (!url) return '';
    try {
      const regExp = /\/file\/d\/([a-zA-Z0-9_-]+)\//;
      const match = url.match(regExp);
      if (match && match[1]) {
        return `https://drive.google.com/file/d/${match[1]}/preview`;
      }
      const urlObj = new URL(url);
      const id = urlObj.searchParams.get('id');
      if (id) {
        return `https://drive.google.com/file/d/${id}/preview`;
      }
    } catch {}
    return url;
  };

  // Redirect out of invalid tabs (including assignments)
  useEffect(() => {
    const validTabs = ['attendance', 'materials', 'exams', 'timetable', 'notifications', 'progress', 'live-sessions'];
    if (tab && !validTabs.includes(tab)) {
      navigate('/teacher/attendance', { replace: true });
    }
  }, [tab, navigate]);

  // Auto-select course and batch when loaded
  useEffect(() => {
    if (courses.length > 0 && !filterCourseId) {
      setFilterCourseId(courses[0].id);
    }
  }, [courses, filterCourseId]);

  useEffect(() => {
    if (batches.length > 0 && filterCourseId) {
      const courseBatches = batches.filter(b => b.course_id === filterCourseId);
      if (courseBatches.length > 0) {
        const currentBatchMatches = courseBatches.some(b => b.id === filterBatchId);
        if (!currentBatchMatches) {
          setFilterBatchId(courseBatches[0].id);
        }
      } else {
        setFilterBatchId('');
      }
    } else {
      setFilterBatchId('');
    }
  }, [batches, filterCourseId, filterBatchId]);

  const uploadToSupabase = async (file: File, formType: 'material' | 'assignment') => {
    setUploadingFile(true);
    setMsg('Uploading file to Supabase storage...');
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
      const filePath = `uploads/${fileName}`;

      const { error } = await supabase.storage
        .from('lms-files')
        .upload(filePath, file);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('lms-files')
        .getPublicUrl(filePath);

      if (formType === 'material') {
        setMaterialForm(prev => ({
          ...prev,
          file_url: publicUrl,
          file_name: file.name
        }));
      } else if (formType === 'assignment') {
        setAssignmentForm(prev => ({
          ...prev,
          file_url: publicUrl,
          file_name: file.name
        }));
      }
      setMsg('File uploaded successfully!');
    } catch (err: any) {
      console.error(err);
      setMsg('Upload failed. Please ensure a public bucket named "lms-files" exists in Supabase.');
    } finally {
      setUploadingFile(false);
    }
  };

  useEffect(() => {
    fetchBatches();
    fetchCourses();
    fetchStudents();
    fetchTimetable();
    fetchTeachers();
    fetchMaterials();
    fetchAssignments();
    fetchExams();
    fetchNotifications();
    fetchLiveSessions();
  }, []);

  // Chat & Raise Hand polling when a live session is active
  useEffect(() => {
    if (!activeLiveSession) return;

    const pollSessionData = async () => {
      try {
        const chatRes = await api.get(`/api/live-sessions/${activeLiveSession.id}/chats`);
        if (chatRes.data?.success) {
          setLiveChatMessages(chatRes.data.chats || []);
        }

        const handsRes = await api.get(`/api/live-sessions/${activeLiveSession.id}/raised-hands`);
        if (handsRes.data?.success) {
          setRaisedHands(handsRes.data.raised_hands || []);
        }
        
        // Refresh active session properties to reflect chat toggling / status updates from DB
        const allSessionsRes = await api.get('/api/live-sessions');
        if (allSessionsRes.data?.success) {
          const current = allSessionsRes.data.live_sessions.find((s: any) => s.id === activeLiveSession.id);
          if (current) {
            setActiveLiveSession(current);
          }
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    };

    pollSessionData();
    const intervalId = setInterval(pollSessionData, 3000);
    return () => clearInterval(intervalId);
  }, [activeLiveSession]);

  const handleLiveSessionCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMsg('');
    try {
      const res = await api.post('/api/live-sessions', liveSessionForm);
      if (res.data?.success) {
        setMsg('Live session created successfully!');
        fetchLiveSessions();
        setShowForm(false);
        setLiveSessionForm({
          course_id: '',
          batch_id: '',
          session_type: 'LIVE',
          message: '',
          meeting_link: '',
          video_link: '',
          chat_enabled: true,
          raise_hand_enabled: true,
          voice_enabled: true,
          scheduled_at: ''
        });
      } else {
        setMsg(res.data.error || 'Failed to create live session');
      }
    } catch (err: any) {
      setMsg(err.response?.data?.error || 'An error occurred while creating the live session');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSessionStatus = async (sessionId: string, status: string) => {
    try {
      const res = await api.put(`/api/live-sessions/${sessionId}`, { status });
      if (res.data?.success) {
        fetchLiveSessions();
        if (activeLiveSession && activeLiveSession.id === sessionId) {
          setActiveLiveSession((prev: any) => prev ? { ...prev, status } : null);
        }
      }
    } catch (err) {
      console.error('Error updating status:', err);
    }
  };

  const handleToggleSessionChat = async (sessionId: string, currentVal: boolean) => {
    try {
      const res = await api.put(`/api/live-sessions/${sessionId}`, { chat_enabled: !currentVal });
      if (res.data?.success) {
        fetchLiveSessions();
        if (activeLiveSession && activeLiveSession.id === sessionId) {
          setActiveLiveSession((prev: any) => prev ? { ...prev, chat_enabled: !currentVal } : null);
        }
      }
    } catch (err) {
      console.error('Error toggling chat:', err);
    }
  };

  const handleToggleSessionRaiseHand = async (sessionId: string, currentVal: boolean) => {
    try {
      const res = await api.put(`/api/live-sessions/${sessionId}`, { raise_hand_enabled: !currentVal });
      if (res.data?.success) {
        fetchLiveSessions();
        if (activeLiveSession && activeLiveSession.id === sessionId) {
          setActiveLiveSession((prev: any) => prev ? { ...prev, raise_hand_enabled: !currentVal } : null);
        }
      }
    } catch (err) {
      console.error('Error toggling raise hand:', err);
    }
  };

  const handleLiveSessionDelete = async (sessionId: string) => {
    if (!window.confirm('Are you sure you want to delete this live session?')) return;
    try {
      const res = await api.delete(`/api/live-sessions/${sessionId}`);
      if (res.data?.success) {
        fetchLiveSessions();
        if (activeLiveSession && activeLiveSession.id === sessionId) {
          setActiveLiveSession(null);
        }
      }
    } catch (err) {
      console.error('Error deleting session:', err);
    }
  };

  const handleSendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeLiveSession || !chatInputText.trim()) return;
    try {
      const res = await api.post(`/api/live-sessions/${activeLiveSession.id}/chats`, { message: chatInputText });
      if (res.data?.success) {
        setLiveChatMessages(prev => [...prev, res.data.chat]);
        setChatInputText('');
      }
    } catch (err) {
      console.error('Error sending chat:', err);
    }
  };

  const handleAcknowledgeHand = async (studentId: string) => {
    if (!activeLiveSession) return;
    try {
      const res = await api.post(`/api/live-sessions/${activeLiveSession.id}/resolve-hand`, { student_id: studentId });
      if (res.data?.success) {
        setRaisedHands(prev => prev.filter(hand => hand.student_id !== studentId));
      }
    } catch (err) {
      console.error('Error resolving raised hand:', err);
    }
  };

  // Voice Recording States & Handlers
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [recordingIntervalId, setRecordingIntervalId] = useState<any>(null);

  const startAudioRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
        stream.getTracks().forEach(track => track.stop());
        
        const uploadUrl = await uploadAudioToSupabase(audioBlob);
        if (uploadUrl) {
          await sendVoiceChatMessage(uploadUrl);
        }
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecordingAudio(true);
      setRecordingDuration(0);

      const intId = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
      setRecordingIntervalId(intId);
    } catch (err) {
      alert('Could not access microphone. Please check permissions.');
      console.error(err);
    }
  };

  const stopAudioRecording = () => {
    if (mediaRecorder && isRecordingAudio) {
      mediaRecorder.stop();
      setIsRecordingAudio(false);
      if (recordingIntervalId) {
        clearInterval(recordingIntervalId);
      }
    }
  };

  const cancelAudioRecording = () => {
    if (mediaRecorder) {
      mediaRecorder.ondataavailable = null;
      mediaRecorder.stop();
      mediaRecorder.stream.getTracks().forEach(track => track.stop());
      setIsRecordingAudio(false);
      if (recordingIntervalId) {
        clearInterval(recordingIntervalId);
      }
    }
  };

  const uploadAudioToSupabase = async (audioBlob: Blob): Promise<string | null> => {
    setLoading(true);
    setMsg('Uploading audio message...');
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'voice.webm');

      const res = await api.post('/api/upload-audio', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (res.data?.success && res.data?.publicUrl) {
        setMsg('');
        return res.data.publicUrl;
      } else {
        throw new Error(res.data?.error || 'Upload failed');
      }
    } catch (err: any) {
      console.error(err);
      setMsg(`Audio upload failed: ${err.response?.data?.error || err.message || 'Unknown error'}`);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const sendVoiceChatMessage = async (audioUrl: string) => {
    if (!activeLiveSession) return;
    try {
      const res = await api.post(`/api/live-sessions/${activeLiveSession.id}/chats`, {
        message_type: 'VOICE',
        voice_url: audioUrl
      });
      if (res.data?.success) {
        setLiveChatMessages(prev => [...prev, res.data.chat]);
      }
    } catch (err) {
      console.error('Error sending voice chat:', err);
    }
  };

  const handleToggleSessionVoice = async (sessionId: string, currentVal: boolean) => {
    try {
      const res = await api.put(`/api/live-sessions/${sessionId}`, { voice_enabled: !currentVal });
      if (res.data?.success) {
        fetchLiveSessions();
        if (activeLiveSession && activeLiveSession.id === sessionId) {
          setActiveLiveSession((prev: any) => prev ? { ...prev, voice_enabled: !currentVal } : null);
        }
      }
    } catch (err) {
      console.error('Error toggling voice option:', err);
    }
  };

  const fetchTeachers = async () => {
    try {
      const res = await api.get('/api/users/teachers');
      if (res.data?.success) setTeachers(res.data.teachers || []);
    } catch {}
  };

  const fetchBatches = async () => {
    try {
      const res = await api.get('/api/batches');
      if (res.data?.success) setBatches(res.data.batches || []);
    } catch {}
  };

  const fetchCourses = async () => {
    try {
      const res = await api.get('/api/courses');
      if (res.data?.success) setCourses(res.data.courses || []);
    } catch {}
  };

  const fetchStudents = async () => {
    try {
      const res = await api.get('/api/users/students');
      if (res.data?.success) setStudents(res.data.students || []);
    } catch {}
  };

  const fetchTimetable = async () => {
    try {
      const res = await api.get('/api/timetable');
      if (res.data?.success) setTimetable(res.data.timetable || []);
    } catch {}
  };

  const fetchMaterials = async () => {
    try {
      const res = await api.get('/api/materials');
      if (res.data?.success) setMaterials(res.data.materials || []);
    } catch {}
  };

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/api/notifications');
      if (res.data?.success) setNotifications(res.data.notifications || []);
    } catch {}
  };

  const handleNotificationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        title: notificationForm.title,
        message: notificationForm.message,
        target_type: notificationForm.target_type,
        notification_type: notificationForm.notification_type,
        target_id: notificationForm.target_type === 'ALL' ? null : notificationForm.target_id
      };
      
      const res = await api.post('/api/notifications', payload);
      if (res.data?.success) {
        setMsg('Notification broadcasted successfully!');
        fetchNotifications();
        setShowForm(false);
        setNotificationForm({
          title: '',
          message: '',
          target_type: 'ALL',
          target_id: '',
          notification_type: 'ANNOUNCEMENT'
        });
      } else {
        setMsg('Error: ' + res.data?.error);
      }
    } catch {
      setMsg('Failed to broadcast notification');
    } finally {
      setLoading(false);
    }
  };

  const getTargetName = (type: string, id: string) => {
    if (type === 'ALL') return 'All Students';
    if (type === 'COURSE') {
      const c = courses.find(item => item.id === id);
      return c ? `Course: ${c.course_name}` : 'Course';
    }
    if (type === 'BATCH') {
      const b = batches.find(item => item.id === id);
      return b ? `Batch: ${b.batch_name}` : 'Batch';
    }
    if (type === 'INDIVIDUAL_STUDENT') {
      const s = students.find(item => item.id === id);
      return s ? `Student: ${s.full_name}` : 'Student';
    }
    return 'N/A';
  };

  const fetchAssignments = async () => {
    try {
      const res = await api.get('/api/assignments');
      if (res.data?.success) setAssignments(res.data.assignments || []);
    } catch {}
  };

  const fetchExams = async () => {
    try {
      const res = await api.get('/api/exams');
      if (res.data?.success) setExams(res.data.exams || []);
    } catch {}
  };

  // Fetch student submissions for scoring
  const fetchSubmissions = async (type: 'assignment' | 'exam', id: string) => {
    try {
      const path = type === 'assignment' ? `/api/assignments/submissions?assignment_id=${id}` : `/api/exams/submissions?exam_id=${id}`;
      const res = await api.get(path);
      if (res.data?.success) setSubmissions(res.data.submissions || []);
    } catch {}
  };

  // ATTENDANCE MANAGEMENT
  const loadAttendanceStudents = async () => {
    if (!selectedBatch) return;
    setLoading(true);
    setMsg('Loading student list for batch...');
    try {
      const res = await api.get(`/api/users/students?batch_id=${selectedBatch}`);
      if (res.data?.success) {
        const batchStudents = res.data.students || [];
        const initialRecords = batchStudents.map((s: any) => ({
          student_id: s.id,
          full_name: s.full_name,
          status: 'PRESENT'
        }));
        setAttendanceRecords(initialRecords);
        if (batchStudents.length === 0) {
          setMsg('No students enrolled in this batch.');
        } else {
          setMsg('');
        }
      }
    } catch {
      setMsg('Error loading student list for batch');
    } finally {
      setLoading(false);
    }
  };

  const handleAttendanceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBatch || attendanceRecords.length === 0) return;
    setLoading(true);
    try {
      const res = await api.post('/api/attendance', {
        batch_id: selectedBatch,
        date: selectedDate,
        records: attendanceRecords
      });
      if (res.data?.success) {
        setMsg('Attendance saved successfully!');
      }
    } catch {
      setMsg('Error saving attendance');
    } finally {
      setLoading(false);
    }
  };

  // TIMETABLE CRUD HANDLERS
  const handleTimetableSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      let res;
      if (timetableForm.id) {
        // Edit single slot
        res = await api.put(`/api/timetable/${timetableForm.id}`, timetableForm);
      } else {
        // Bulk create weekly slots
        const slotsToCreate = Object.entries(weeklyForm.days)
          .filter(([_, data]) => data.active && data.topic && data.start_time && data.end_time)
          .map(([day, data]) => ({
            day_of_week: day,
            topic: data.topic,
            start_time: data.start_time,
            end_time: data.end_time,
            teacher_id: data.teacher_id || null
          }));

        if (slotsToCreate.length === 0) {
          setMsg('Please enable and fill at least one timetable slot.');
          setLoading(false);
          return;
        }

        res = await api.post('/api/timetable', {
          course_id: weeklyForm.course_id,
          batch_id: weeklyForm.batch_id,
          slots: slotsToCreate
        });
      }

      if (res.data?.success) {
        setMsg(timetableForm.id ? 'Timetable slot updated!' : 'Timetable weekly schedule created!');
        fetchTimetable();
        setShowForm(false);
        setTimetableForm({ id: '', day_of_week: 'Monday', start_time: '', end_time: '', topic: '', course_id: '', batch_id: '', teacher_id: '' });
        resetWeeklyForm();
      } else {
        setMsg('Error: ' + res.data?.error);
      }
    } catch {
      setMsg('Error saving timetable slot');
    } finally {
      setLoading(false);
    }
  };

  const handleTimetableDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this timetable slot?')) return;
    try {
      const res = await api.delete(`/api/timetable/${id}`);
      if (res.data?.success) {
        setMsg('Timetable slot deleted!');
        fetchTimetable();
      } else {
        setMsg('Error deleting timetable slot: ' + res.data?.error);
      }
    } catch {
      setMsg('Failed to delete timetable slot');
    }
  };

  // STUDENT PROGRESS DATA FETCH
  const loadStudentProgressData = async (batchId: string) => {
    if (!batchId) return;
    setLoading(true);
    setMsg('Loading student progress details for batch...');
    try {
      // 1. Fetch Students
      const studentRes = await api.get(`/api/users/students?batch_id=${batchId}`);
      // 2. Fetch Attendance records
      const attendanceRes = await api.get(`/api/attendance?batch_id=${batchId}`);
      // 3. Fetch Exam Results
      const examRes = await api.get('/api/results');
      // 4. Fetch Assignment Submissions
      const assignmentRes = await api.get('/api/assignments/submissions');

      if (studentRes.data?.success) {
        setProgressStudents(studentRes.data.students || []);
      }
      if (attendanceRes.data?.success) {
        setProgressAttendance(attendanceRes.data.attendance || []);
      }
      if (examRes.data?.success) {
        setProgressExams(examRes.data.results || []);
      }
      if (assignmentRes.data?.success) {
        setProgressAssignments(assignmentRes.data.submissions || []);
      }
      setMsg('');
    } catch (err) {
      console.error(err);
      setMsg('Error loading student progress details.');
    } finally {
      setLoading(false);
    }
  };

  // STUDY MATERIALS SUBMIT
  const handleMaterialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post('/api/materials', materialForm);
      if (res.data?.success) {
        setMsg('Material uploaded successfully!');
        fetchMaterials();
        setShowForm(false);
        setMaterialForm({ title: '', description: '', file_name: '', file_url: '', file_type: 'notes', course_id: '', batch_id: '' });
      }
    } catch {
      setMsg('Error uploading material');
    } finally {
      setLoading(false);
    }
  };

  const handleMaterialDelete = async (materialId: string) => {
    if (!confirm('Are you sure you want to delete this study material?')) return;
    setLoading(true);
    try {
      const res = await api.delete(`/api/materials/${materialId}`);
      if (res.data?.success) {
        setMsg('Study material deleted successfully!');
        fetchMaterials();
      } else {
        setMsg('Failed to delete: ' + res.data?.error);
      }
    } catch {
      setMsg('Error deleting study material');
    } finally {
      setLoading(false);
    }
  };

  const getGroupedMaterials = () => {
    const grouped: Record<string, {
      courseName: string;
      batches: Record<string, {
        batchName: string;
        materials: Record<string, any[]>;
      }>;
    }> = {};

    materials.forEach(mat => {
      const courseId = mat.course_id || 'unknown-course';
      const courseName = mat.courses?.course_name || 'General Course';
      const batchId = mat.batch_id || 'unknown-batch';
      const batchName = mat.batches?.batch_name || 'General Batch';
      const fileType = mat.file_type || 'notes';

      if (!grouped[courseId]) {
        grouped[courseId] = {
          courseName,
          batches: {}
        };
      }

      if (!grouped[courseId].batches[batchId]) {
        grouped[courseId].batches[batchId] = {
          batchName,
          materials: {
            notes: [],
            video: [],
            assignment: [],
            practice: []
          }
        };
      }

      const list = grouped[courseId].batches[batchId].materials[fileType] || [];
      list.push(mat);
      grouped[courseId].batches[batchId].materials[fileType] = list;
    });

    return grouped;
  };

  // ASSIGNMENT CREATE
  const handleAssignmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post('/api/assignments', assignmentForm);
      if (res.data?.success) {
        setMsg('Assignment created!');
        fetchAssignments();
        setShowForm(false);
        setAssignmentForm({ title: '', description: '', file_name: '', file_url: '', due_date: '', course_id: '', batch_id: '' });
      }
    } catch {
      setMsg('Error creating assignment');
    } finally {
      setLoading(false);
    }
  };

  // ASSIGNMENT SCORE
  const handleAssignmentScore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!evaluatingSub) return;
    setLoading(true);
    try {
      const res = await api.post('/api/assignments/evaluate', {
        submission_id: evaluatingSub.id,
        score: evaluationScore,
        feedback: evaluationFeedback
      });
      if (res.data?.success) {
        setMsg('Assignment evaluated!');
        fetchSubmissions('assignment', evaluatingSub.assignment_id);
        setEvaluatingSub(null);
        setEvaluationScore('');
        setEvaluationFeedback('');
      }
    } catch {
      setMsg('Evaluation failed');
    } finally {
      setLoading(false);
    }
  };

  // EXAM CREATE
  const addMCQQuestionToExam = () => {
    if (!mcqQuestionInput.question_text) return;

    if (mcqQuestionInput.options.length < 2) {
      setMsg('An MCQ question must have at least 2 options.');
      return;
    }

    const hasEmptyOption = mcqQuestionInput.options.some(opt => !opt.option_text.trim());
    if (hasEmptyOption) {
      setMsg('Please fill in all option text fields.');
      return;
    }

    const correctCount = mcqQuestionInput.options.filter(opt => opt.is_correct).length;
    if (correctCount !== 1) {
      setMsg('Please select exactly one correct option for this question.');
      return;
    }

    setExamForm({
      ...examForm,
      questions: [...examForm.questions, mcqQuestionInput]
    });
    setMcqQuestionInput({ question_text: '', marks: 5, options: [{ option_text: '', is_correct: false }, { option_text: '', is_correct: false }] });
    setMsg('');
  };

  const addCodingQuestionToExam = () => {
    if (!codingQuestionInput.question_text) return;
    setExamForm({
      ...examForm,
      questions: [...examForm.questions, codingQuestionInput]
    });
    setCodingQuestionInput({ question_text: '', description: '', max_marks: 10 });
  };

  const handleExamSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (examForm.questions.length === 0) {
      setMsg('Please add at least one question.');
      return;
    }
    setLoading(true);
    try {
      const res = await api.post('/api/exams', examForm);
      if (res.data?.success) {
        setMsg('Exam created successfully!');
        fetchExams();
        setShowForm(false);
        setExamForm({ title: '', exam_type: 'MCQ', course_id: '', batch_id: '', time_limit_minutes: 30, due_date: '', questions: [] });
      }
    } catch {
      setMsg('Failed to create exam');
    } finally {
      setLoading(false);
    }
  };

  // CODING EXAM SCORE
  const handleCodingExamScore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!evaluatingSub) return;
    setLoading(true);
    try {
      const res = await api.post('/api/exams/evaluate', {
        submission_id: evaluatingSub.id,
        score: evaluationScore,
        feedback: evaluationFeedback
      });
      if (res.data?.success) {
        setMsg('Coding submission graded!');
        fetchSubmissions('exam', evaluatingSub.exam_id);
        setEvaluatingSub(null);
        setEvaluationScore('');
        setEvaluationFeedback('');
      }
    } catch {
      setMsg('Evaluation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Navigation tabs */}
      <div className="flex border-b border-slate-800 overflow-x-auto pb-1 gap-1">
        {['attendance', 'materials', 'exams', 'timetable', 'live-sessions', 'notifications', 'progress'].map((tabName) => (
          <button
            key={tabName}
            onClick={() => {
              navigate('/teacher/' + tabName);
              setMsg('');
              setShowForm(false);
              setSubmissions([]);
              setEvaluatingSub(null);
            }}
            className={`px-4 py-2 text-sm font-semibold capitalize whitespace-nowrap rounded-t-lg transition-colors ${
              activeTab === tabName
                ? 'border-b-2 border-primary-500 text-primary-400 bg-slate-900/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {tabName === 'progress' ? 'Student Progress' : tabName === 'live-sessions' ? 'Live Sessions' : tabName.replace('_', ' ')}
          </button>
        ))}
      </div>

      {msg && (
        <div className="bg-primary-950/40 border border-primary-500/20 text-primary-400 px-4 py-3 rounded-xl text-sm max-w-lg text-center mx-auto">
          {msg}
        </div>
      )}

      {/* --- 1. ATTENDANCE TAB --- */}
      {activeTab === 'attendance' && (
        <div className="space-y-6">
          <div className="glass-card p-6 flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1 space-y-1">
              <label className="text-xs font-semibold text-slate-400 uppercase">Select Course</label>
              <select
                value={selectedAttendanceCourse}
                onChange={e => {
                  setSelectedAttendanceCourse(e.target.value);
                  setSelectedBatch('');
                  setAttendanceRecords([]);
                }}
                className="w-full glass-input bg-dark-900"
              >
                <option value="">Choose Course</option>
                {courses.map(c => <option key={c.id} value={c.id}>{c.course_name}</option>)}
              </select>
            </div>
            <div className="flex-1 space-y-1">
              <label className="text-xs font-semibold text-slate-400 uppercase">Select Batch</label>
              <select
                value={selectedBatch}
                onChange={e => {
                  setSelectedBatch(e.target.value);
                  setAttendanceRecords([]);
                }}
                className="w-full glass-input bg-dark-900"
                disabled={!selectedAttendanceCourse}
              >
                <option value="">Choose Batch</option>
                {batches
                  .filter(b => b.course_id === selectedAttendanceCourse)
                  .map(b => <option key={b.id} value={b.id}>{b.batch_name}</option>)}
              </select>
            </div>
            <div className="flex-1 space-y-1">
              <label className="text-xs font-semibold text-slate-400 uppercase">Pick Date</label>
              <input
                type="date"
                value={selectedDate}
                onChange={e => {
                  setSelectedDate(e.target.value);
                  setAttendanceRecords([]);
                }}
                className="w-full glass-input"
              />
            </div>
            <button
              onClick={loadAttendanceStudents}
              className="btn-secondary py-2.5 text-xs px-6"
              disabled={!selectedBatch}
            >
              Load Student List
            </button>
          </div>

          {attendanceRecords.length > 0 && (
            <form onSubmit={handleAttendanceSubmit} className="glass-card p-6 space-y-4">
              <h3 className="text-sm font-bold text-slate-200">Attendance Log Sheet</h3>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-slate-900/50">
                      <th className="table-header">Student ID</th>
                      <th className="table-header">Name</th>
                      <th className="table-header">Present</th>
                      <th className="table-header">Absent</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendanceRecords.map((record, index) => (
                      <tr key={record.student_id} className="hover:bg-slate-900/20 transition-colors">
                        <td className="table-cell font-mono text-xs text-slate-500">{record.student_id.substring(0,8)}...</td>
                        <td className="table-cell font-semibold text-slate-200">{record.full_name}</td>
                        <td className="table-cell">
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="radio"
                              name={`attendance-${record.student_id}`}
                              checked={record.status === 'PRESENT'}
                              onChange={() => {
                                const copy = [...attendanceRecords];
                                copy[index].status = 'PRESENT';
                                setAttendanceRecords(copy);
                              }}
                              className="text-primary-500 bg-dark-950 focus:ring-0"
                            />
                            <span className="text-xs text-slate-400">Present</span>
                          </label>
                        </td>
                        <td className="table-cell">
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="radio"
                              name={`attendance-${record.student_id}`}
                              checked={record.status === 'ABSENT'}
                              onChange={() => {
                                const copy = [...attendanceRecords];
                                copy[index].status = 'ABSENT';
                                setAttendanceRecords(copy);
                              }}
                              className="text-red-500 bg-dark-950 focus:ring-0"
                            />
                            <span className="text-xs text-slate-400">Absent</span>
                          </label>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-end pt-3">
                <button type="submit" className="btn-primary py-2.5 px-8 text-xs" disabled={loading}>
                  Save Attendance Ledger
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* --- 2. MATERIALS TAB --- */}
      {activeTab === 'materials' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-base font-bold text-slate-200">Study Materials Vault</h3>
            {!showForm && (
              <button onClick={() => { setShowForm(true); setMaterialForm({ title: '', description: '', file_name: '', file_url: '', file_type: 'notes', course_id: '', batch_id: '' }); }} className="btn-primary flex items-center gap-2 py-2 text-xs">
                <Plus className="h-4 w-4" /> Add Material
              </button>
            )}
          </div>

          {showForm && (
            <form onSubmit={handleMaterialSubmit} className="glass-card p-6 max-w-xl mx-auto space-y-4">
              <h4 className="font-bold text-sm text-slate-200">Upload Learning Resource</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400">Title</label>
                  <input type="text" placeholder="e.g. Introduction to CSS Grid" value={materialForm.title} onChange={e => setMaterialForm({...materialForm, title: e.target.value})} className="w-full glass-input" required />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400">Direct File Upload (Optional)</label>
                  <input
                    type="file"
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) uploadToSupabase(file, 'material');
                    }}
                    className="w-full text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-primary-600/20 file:text-primary-400 hover:file:bg-primary-600/30 file:cursor-pointer"
                    disabled={uploadingFile}
                  />
                </div>
                <div className="space-y-1 col-span-2">
                  <label className="text-xs font-semibold text-slate-400">Resource Link (File URL)</label>
                  <input type="text" placeholder="e.g. https://supabase.storage.url/pdf" value={materialForm.file_url} onChange={e => setMaterialForm({...materialForm, file_url: e.target.value})} className="w-full glass-input" required />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400">File Name</label>
                  <input type="text" placeholder="e.g. css-grid-guide.pdf" value={materialForm.file_name} onChange={e => setMaterialForm({...materialForm, file_name: e.target.value})} className="w-full glass-input" required />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400">Resource Type</label>
                  <select value={materialForm.file_type} onChange={e => setMaterialForm({...materialForm, file_type: e.target.value})} className="w-full glass-input bg-dark-900">
                    <option value="notes">Notes (PDF)</option>
                    <option value="video">Lecture Video (URL)</option>
                    <option value="assignment">Assignment File</option>
                    <option value="practice">Practice Questions</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400">Select Course</label>
                  <select value={materialForm.course_id} onChange={e => setMaterialForm({...materialForm, course_id: e.target.value})} className="w-full glass-input bg-dark-900" required>
                    <option value="">Course</option>
                    {courses.map(c => <option key={c.id} value={c.id}>{c.course_name}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400">Select Batch</label>
                  <select value={materialForm.batch_id} onChange={e => setMaterialForm({...materialForm, batch_id: e.target.value})} className="w-full glass-input bg-dark-900" required>
                    <option value="">Batch</option>
                    {batches.map(b => <option key={b.id} value={b.id}>{b.batch_name}</option>)}
                  </select>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400">Brief Description</label>
                <textarea rows={2} placeholder="Syllabus coverage..." value={materialForm.description} onChange={e => setMaterialForm({...materialForm, description: e.target.value})} className="w-full glass-input" />
              </div>
              <div className="flex justify-end gap-3 mt-4">
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary py-2 text-xs">Cancel</button>
                <button type="submit" className="btn-primary py-2 text-xs" disabled={loading}>Upload Material</button>
              </div>
            </form>
          )}

          <div className="space-y-6">
            {Object.keys(getGroupedMaterials()).length === 0 ? (
              <div className="glass-card p-8 text-center text-slate-500 text-xs">No study materials uploaded yet.</div>
            ) : (
              Object.entries(getGroupedMaterials()).map(([courseId, courseData]) => (
                <div key={courseId} className="space-y-4 border border-slate-800/40 bg-slate-900/10 p-5 rounded-2xl">
                  <h3 className="text-sm font-bold text-slate-100 bg-slate-800/40 px-3.5 py-1.5 rounded-xl border border-slate-800/50 inline-block">{courseData.courseName}</h3>
                  
                  <div className="space-y-6">
                    {Object.entries(courseData.batches).map(([batchId, batchData]) => (
                      <div key={batchId} className="space-y-4 pl-4 border-l border-primary-500/20">
                        <h4 className="text-xs font-bold text-primary-400 bg-primary-950/15 border border-primary-950/20 px-2.5 py-1 rounded-lg inline-block">{batchData.batchName}</h4>
                        
                        {/* Notes Row */}
                        <div className="space-y-2">
                          <h5 className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider pl-1">Notes & PDFs</h5>
                          {batchData.materials.notes.length === 0 ? (
                            <p className="text-slate-600 text-xs italic pl-1">No notes uploaded.</p>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              {batchData.materials.notes.map(mat => (
                                <div key={mat.id} className="glass-card p-4 space-y-3 relative hover:border-slate-700 transition-colors">
                                  <div className="flex justify-between items-start">
                                    <span className="text-[9px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded uppercase font-extrabold tracking-wider">{mat.file_type}</span>
                                    <button
                                      onClick={() => handleMaterialDelete(mat.id)}
                                      className="text-red-400 hover:text-red-300 p-1 hover:bg-red-500/10 rounded-lg transition-colors"
                                      title="Delete Material"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                  <h4 className="font-bold text-slate-200 text-sm mt-1 truncate" title={mat.title}>{mat.title}</h4>
                                  <p className="text-xs text-slate-400 line-clamp-2">{mat.description || 'No description provided.'}</p>
                                  <div className="border-t border-slate-800/80 pt-2 flex justify-between items-center text-[10px] text-slate-500">
                                    <span className="font-semibold">{mat.batches?.batch_name}</span>
                                    <a href={mat.file_url} target="_blank" rel="noreferrer" className="text-xs text-primary-400 hover:text-primary-300 font-semibold flex items-center gap-0.5">
                                      Open Resource <ChevronRight className="h-3.5 w-3.5" />
                                    </a>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Video Lectures Row */}
                        <div className="space-y-2 pt-2">
                          <h5 className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider pl-1">Video Lectures</h5>
                          {batchData.materials.video.length === 0 ? (
                            <p className="text-slate-600 text-xs italic pl-1">No video lectures uploaded.</p>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              {batchData.materials.video.map(mat => (
                                <div key={mat.id} className="glass-card p-4 space-y-3 relative hover:border-slate-700 transition-colors">
                                  <div className="flex justify-between items-start">
                                    <span className="text-[9px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded uppercase font-extrabold tracking-wider">{mat.file_type}</span>
                                    <button
                                      onClick={() => handleMaterialDelete(mat.id)}
                                      className="text-red-400 hover:text-red-300 p-1 hover:bg-red-500/10 rounded-lg transition-colors"
                                      title="Delete Material"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                  <h4 className="font-bold text-slate-200 text-sm mt-1 truncate" title={mat.title}>{mat.title}</h4>
                                  <p className="text-xs text-slate-400 line-clamp-2">{mat.description || 'No description provided.'}</p>
                                  <div className="border-t border-slate-800/80 pt-2 flex justify-between items-center text-[10px] text-slate-500">
                                    <span className="font-semibold">{mat.batches?.batch_name}</span>
                                    <a href={mat.file_url} target="_blank" rel="noreferrer" className="text-xs text-primary-400 hover:text-primary-300 font-semibold flex items-center gap-0.5">
                                      Open Resource <ChevronRight className="h-3.5 w-3.5" />
                                    </a>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Other files Row (assignments, practice etc) if present */}
                        {((batchData.materials.assignment?.length || 0) > 0 || (batchData.materials.practice?.length || 0) > 0) && (
                          <div className="space-y-2 pt-2">
                            <h5 className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider pl-1">Other Resources</h5>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              {[...(batchData.materials.assignment || []), ...(batchData.materials.practice || [])].map(mat => (
                                <div key={mat.id} className="glass-card p-4 space-y-3 relative hover:border-slate-700 transition-colors">
                                  <div className="flex justify-between items-start">
                                    <span className="text-[9px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded uppercase font-extrabold tracking-wider">{mat.file_type}</span>
                                    <button
                                      onClick={() => handleMaterialDelete(mat.id)}
                                      className="text-red-400 hover:text-red-300 p-1 hover:bg-red-500/10 rounded-lg transition-colors"
                                      title="Delete Material"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                  <h4 className="font-bold text-slate-200 text-sm mt-1 truncate" title={mat.title}>{mat.title}</h4>
                                  <p className="text-xs text-slate-400 line-clamp-2">{mat.description || 'No description provided.'}</p>
                                  <div className="border-t border-slate-800/80 pt-2 flex justify-between items-center text-[10px] text-slate-500">
                                    <span className="font-semibold">{mat.batches?.batch_name}</span>
                                    <a href={mat.file_url} target="_blank" rel="noreferrer" className="text-xs text-primary-400 hover:text-primary-300 font-semibold flex items-center gap-0.5">
                                      Open Resource <ChevronRight className="h-3.5 w-3.5" />
                                    </a>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}


      {/* --- 4. EXAMS TAB --- */}
      {activeTab === 'exams' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-base font-bold text-slate-200">Exams & Online Assessments</h3>
            {!showForm && (
              <button
                onClick={() => {
                  setShowForm(true);
                  setExamForm({ title: '', exam_type: 'MCQ', course_id: '', batch_id: '', time_limit_minutes: 30, due_date: '', questions: [] });
                }}
                className="btn-primary flex items-center gap-2 py-2 text-xs"
              >
                <Plus className="h-4 w-4" /> Create Exam
              </button>
            )}
          </div>

          {showForm && (
            <div className="glass-card p-6 max-w-xl mx-auto space-y-6">
              <h4 className="font-bold text-sm text-slate-200">Create Exam Setup</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400">Exam Title</label>
                  <input type="text" placeholder="e.g. React Core Concepts Test" value={examForm.title} onChange={e => setExamForm({...examForm, title: e.target.value})} className="w-full glass-input" required />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400">Exam Format</label>
                  <select value={examForm.exam_type} onChange={e => setExamForm({...examForm, exam_type: e.target.value, questions: []})} className="w-full glass-input bg-dark-900">
                    <option value="MCQ">MCQ (Auto-Graded)</option>
                    <option value="CODING">Coding (Manual Review)</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400">Time Limit (Minutes)</label>
                  <input type="number" value={examForm.time_limit_minutes} onChange={e => setExamForm({...examForm, time_limit_minutes: parseInt(e.target.value) || 30})} className="w-full glass-input" required />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400">Due Date</label>
                  <input type="datetime-local" value={examForm.due_date} onChange={e => setExamForm({...examForm, due_date: e.target.value})} className="w-full glass-input" required />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400">Course</label>
                  <select value={examForm.course_id} onChange={e => setExamForm({...examForm, course_id: e.target.value})} className="w-full glass-input bg-dark-900" required>
                    <option value="">Course</option>
                    {courses.map(c => <option key={c.id} value={c.id}>{c.course_name}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400">Batch</label>
                  <select value={examForm.batch_id} onChange={e => setExamForm({...examForm, batch_id: e.target.value})} className="w-full glass-input bg-dark-900" required>
                    <option value="">Batch</option>
                    {batches.map(b => <option key={b.id} value={b.id}>{b.batch_name}</option>)}
                  </select>
                </div>
              </div>

              {/* Add Questions dynamically */}
              <div className="border-t border-slate-800 pt-4 space-y-4">
                <h5 className="text-xs font-bold text-slate-300">Questions Added ({examForm.questions.length})</h5>
                
                {examForm.questions.map((q, qIndex) => (
                  <div key={qIndex} className="bg-slate-900/40 p-4 rounded-xl border border-slate-800 text-xs space-y-3">
                    <div className="flex justify-between items-start">
                      <p className="font-bold text-slate-200">Q{qIndex+1}: {q.question_text}</p>
                      <span className="text-[10px] text-primary-400 font-bold bg-primary-600/10 px-2 py-0.5 rounded-full">Marks: {q.marks || q.max_marks}</span>
                    </div>
                    {q.options && q.options.length > 0 && (
                      <div className="grid grid-cols-2 gap-2 pl-2 pt-1 border-t border-slate-800/60 mt-1">
                        {q.options.map((opt: any, optIdx: number) => (
                          <div key={optIdx} className={`flex items-center gap-2 p-2 rounded-lg border ${opt.is_correct ? 'border-green-500/30 bg-green-500/5 text-green-400' : 'border-slate-800/80 text-slate-400'}`}>
                            <span className="font-bold uppercase text-[9px]">{String.fromCharCode(65 + optIdx)})</span>
                            <span className="truncate">{opt.option_text}</span>
                            {opt.is_correct && <span className="ml-auto text-[9px] font-bold uppercase bg-green-500/15 px-1.5 py-0.5 rounded text-green-400">Correct</span>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}

                {examForm.exam_type === 'MCQ' ? (
                  <div className="bg-slate-900/30 p-4 border border-slate-800 rounded-xl space-y-3.5">
                    <p className="text-xs font-bold text-slate-200">Add MCQ Question</p>
                    <input type="text" placeholder="Question Text" value={mcqQuestionInput.question_text} onChange={e => setMcqQuestionInput({...mcqQuestionInput, question_text: e.target.value})} className="w-full glass-input text-xs" />
                    <div className="grid grid-cols-2 gap-3">
                      {mcqQuestionInput.options.map((opt, optIndex) => (
                        <div key={optIndex} className="flex gap-2.5 items-center bg-slate-900/10 p-2 rounded-lg border border-slate-800/40">
                          <input
                            type="text"
                            placeholder={`Option ${optIndex+1}`}
                            value={opt.option_text}
                            onChange={e => {
                              const copyOpts = [...mcqQuestionInput.options];
                              copyOpts[optIndex].option_text = e.target.value;
                              setMcqQuestionInput({...mcqQuestionInput, options: copyOpts});
                            }}
                            className="w-full bg-slate-950/40 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-primary-500/50"
                            required
                          />
                          <label className="flex items-center gap-1.5 cursor-pointer select-none">
                            <input
                              type="radio"
                              name="correct-option-radio"
                              checked={opt.is_correct}
                              onChange={() => {
                                const copyOpts = mcqQuestionInput.options.map((o, idx) => ({ ...o, is_correct: idx === optIndex }));
                                setMcqQuestionInput({...mcqQuestionInput, options: copyOpts});
                              }}
                              className="text-primary-500 bg-dark-950 focus:ring-0 cursor-pointer h-4 w-4"
                            />
                            <span className="text-[10px] text-slate-400 font-semibold whitespace-nowrap">Correct</span>
                          </label>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between items-center">
                      <button
                        type="button"
                        onClick={() => setMcqQuestionInput({...mcqQuestionInput, options: [...mcqQuestionInput.options, { option_text: '', is_correct: false }]})}
                        className="text-[10px] text-primary-400 hover:underline"
                      >
                        + Add Option
                      </button>
                      <button type="button" onClick={addMCQQuestionToExam} className="btn-secondary py-1 text-[10px] px-3">Add Question</button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-900/30 p-4 border border-slate-800 rounded-xl space-y-3.5">
                    <p className="text-xs font-bold text-slate-200">Add Coding Challenge</p>
                    <input type="text" placeholder="Challenge Name" value={codingQuestionInput.question_text} onChange={e => setCodingQuestionInput({...codingQuestionInput, question_text: e.target.value})} className="w-full glass-input text-xs" />
                    <textarea placeholder="Write instructions, sample inputs, expectations..." value={codingQuestionInput.description} onChange={e => setCodingQuestionInput({...codingQuestionInput, description: e.target.value})} className="w-full glass-input text-xs" rows={2} />
                    <div className="flex justify-end">
                      <button type="button" onClick={addCodingQuestionToExam} className="btn-secondary py-1 text-[10px] px-3">Add Challenge</button>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-800 pt-4">
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary py-2 text-xs">Cancel</button>
                <button onClick={handleExamSubmit} className="btn-primary py-2 text-xs">Publish Exam</button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 space-y-4">
              <h4 className="text-sm font-bold text-slate-300">Exams List</h4>
              {exams.map(ex => (
                <div
                  key={ex.id}
                  onClick={() => ex.exam_type === 'CODING' && fetchSubmissions('exam', ex.id)}
                  className={`glass-card p-4 cursor-pointer space-y-2 ${ex.exam_type === 'CODING' ? 'hover:border-primary-500/50' : 'opacity-85'}`}
                >
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded font-bold">{ex.exam_type}</span>
                    <span className="text-[10px] text-slate-400">{ex.time_limit_minutes} Min</span>
                  </div>
                  <h5 className="font-bold text-slate-200 text-xs truncate">{ex.title}</h5>
                  <p className="text-[9px] text-slate-500">{ex.batches?.batch_name}</p>
                </div>
              ))}
            </div>

            <div className="lg:col-span-2 space-y-4">
              <h4 className="text-sm font-bold text-slate-300">Coding Submissions for Review</h4>
              {submissions.length === 0 ? (
                <div className="glass-card p-8 text-center text-slate-500 text-xs">Select a coding exam to review student submissions. MCQ exams are auto-graded.</div>
              ) : (
                <div className="space-y-4">
                  {submissions.map(sub => (
                    <div key={sub.id} className="glass-card p-4 flex flex-col gap-4">
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-slate-200 text-xs">{sub.students?.full_name}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">Question: {sub.coding_questions?.question_text}</p>
                        </div>
                        <div className="shrink-0">
                          {sub.status === 'EVALUATED' ? (
                            <div className="text-right">
                              <span className="badge-paid">Evaluated</span>
                              <p className="text-xs font-bold text-slate-200 mt-1">Score: {sub.score}</p>
                            </div>
                          ) : (
                          <button
                            onClick={() => { setEvaluatingSub(sub); setEvaluationScore(''); setEvaluationFeedback(''); }}
                            className="btn-primary py-1.5 px-3 text-xs"
                          >
                            Grade Paper
                          </button>
                        )}
                      </div>
                    </div>
                    {/* Student Answer Body - show inline text or file link */}
                      {sub.solution_file_name === 'Text Answer' ? (
                        <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-700/60">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Student's Written Answer:</p>
                          <pre className="text-xs text-slate-200 whitespace-pre-wrap font-mono leading-relaxed max-h-64 overflow-y-auto">{sub.solution_file_url}</pre>
                        </div>
                      ) : sub.solution_file_url ? (
                        <div>
                          <p className="text-[10px] text-slate-400 mb-1">Submitted File:</p>
                          <a href={sub.solution_file_url} target="_blank" rel="noreferrer" className="text-[10px] text-primary-400 underline font-mono">{sub.solution_file_name}</a>
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}

              {evaluatingSub && (
                <form onSubmit={handleCodingExamScore} className="glass-card p-5 border-primary-500/30 space-y-3.5">
                  <h4 className="font-bold text-xs text-slate-200">Grade Paper - {evaluatingSub.students?.full_name}</h4>
                  {evaluatingSub.solution_file_name === 'Text Answer' && (
                    <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-700/60 max-h-48 overflow-y-auto">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Answer to grade:</p>
                      <pre className="text-xs text-slate-200 whitespace-pre-wrap font-mono leading-relaxed">{evaluatingSub.solution_file_url}</pre>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-slate-400">Score</label>
                      <input type="number" placeholder="Enter Score" value={evaluationScore} onChange={e => setEvaluationScore(e.target.value)} className="w-full glass-input" required />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-slate-400">Feedback</label>
                      <input type="text" placeholder="Excellent logic..." value={evaluationFeedback} onChange={e => setEvaluationFeedback(e.target.value)} className="w-full glass-input" />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2.5 pt-1">
                    <button type="button" onClick={() => setEvaluatingSub(null)} className="btn-secondary py-1 text-xs">Cancel</button>
                    <button type="submit" className="btn-primary py-1 text-xs" disabled={loading}>Submit Grade</button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- 5. TIMETABLE TAB --- */}
      {activeTab === 'timetable' && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/60 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-200">Instructor Schedule Slots</h3>
              <p className="text-xs text-slate-400 mt-1">Select a course and batch to view their scheduled weekly classes.</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-400">Course:</span>
                <select
                  value={filterCourseId}
                  onChange={e => {
                    const cId = e.target.value;
                    setFilterCourseId(cId);
                    const courseBatches = batches.filter(b => b.course_id === cId);
                    if (courseBatches.length > 0) {
                      setFilterBatchId(courseBatches[0].id);
                    } else {
                      setFilterBatchId('');
                    }
                  }}
                  className="glass-input bg-dark-900 py-1 px-3 text-xs w-48"
                >
                  <option value="">Choose Course</option>
                  {courses.map(c => (
                    <option key={c.id} value={c.id}>{c.course_name}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-400">Batch:</span>
                <select
                  value={filterBatchId}
                  onChange={e => setFilterBatchId(e.target.value)}
                  className="glass-input bg-dark-900 py-1 px-3 text-xs w-48"
                  disabled={!filterCourseId}
                >
                  <option value="">Choose Batch</option>
                  {batches
                    .filter(b => b.course_id === filterCourseId)
                    .map(b => (
                      <option key={b.id} value={b.id}>{b.batch_name}</option>
                    ))}
                </select>
              </div>

              {!showForm && (
                <button
                  onClick={() => {
                    setShowForm(true);
                    setTimetableForm({
                      id: '',
                      day_of_week: 'Monday',
                      start_time: '',
                      end_time: '',
                      topic: '',
                      course_id: filterCourseId,
                      batch_id: filterBatchId,
                      teacher_id: ''
                    });
                  }}
                  className="btn-primary flex items-center gap-2 py-2 px-4 text-xs h-9"
                >
                  <Plus className="h-4 w-4" /> Add Slot
                </button>
              )}
            </div>
          </div>

          {showForm && (
            <form onSubmit={handleTimetableSubmit} className="glass-card p-6 max-w-4xl mx-auto space-y-6 bg-slate-900/40 backdrop-blur-xl">
              <h4 className="font-bold text-sm text-slate-200">{timetableForm.id ? 'Edit Timetable Slot' : 'Schedule Weekly Timetable'}</h4>
              
              {timetableForm.id ? (
                /* Edit single slot */
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-400">Day of Week</label>
                    <select value={timetableForm.day_of_week} onChange={e => setTimetableForm({...timetableForm, day_of_week: e.target.value})} className="w-full glass-input bg-dark-900">
                      {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-400">Topic Title</label>
                    <input type="text" placeholder="e.g. Intro to Git" value={timetableForm.topic} onChange={e => setTimetableForm({...timetableForm, topic: e.target.value})} className="w-full glass-input" required />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-400">Start Time</label>
                    <input type="time" value={timetableForm.start_time} onChange={e => setTimetableForm({...timetableForm, start_time: e.target.value})} className="w-full glass-input" required />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-400">End Time</label>
                    <input type="time" value={timetableForm.end_time} onChange={e => setTimetableForm({...timetableForm, end_time: e.target.value})} className="w-full glass-input" required />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-400">Course</label>
                    <select value={timetableForm.course_id} onChange={e => setTimetableForm({...timetableForm, course_id: e.target.value})} className="w-full glass-input bg-dark-900" required>
                      <option value="">Select Course</option>
                      {courses.map(c => <option key={c.id} value={c.id}>{c.course_name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-400">Batch</label>
                    <select value={timetableForm.batch_id} onChange={e => setTimetableForm({...timetableForm, batch_id: e.target.value})} className="w-full glass-input bg-dark-900" required>
                      <option value="">Select Batch</option>
                      {batches.map(b => <option key={b.id} value={b.id}>{b.batch_name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1 col-span-2">
                    <label className="text-xs font-semibold text-slate-400">Instructor</label>
                    <select value={timetableForm.teacher_id} onChange={e => setTimetableForm({...timetableForm, teacher_id: e.target.value})} className="w-full glass-input bg-dark-900">
                      <option value="">Select Teacher (Instructor)</option>
                      {teachers.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
                    </select>
                  </div>
                </div>
              ) : (
                /* Bulk schedule slots Monday to Sunday */
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-400">Course</label>
                      <select value={weeklyForm.course_id} onChange={e => setWeeklyForm({...weeklyForm, course_id: e.target.value})} className="w-full glass-input bg-dark-900" required>
                        <option value="">Select Course</option>
                        {courses.map(c => <option key={c.id} value={c.id}>{c.course_name}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-400">Batch</label>
                      <select value={weeklyForm.batch_id} onChange={e => setWeeklyForm({...weeklyForm, batch_id: e.target.value})} className="w-full glass-input bg-dark-900" required>
                        <option value="">Select Batch</option>
                        {batches.map(b => <option key={b.id} value={b.id}>{b.batch_name}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="border-t border-slate-800 pt-4 space-y-4">
                    <h5 className="text-sm font-bold text-slate-200">Daily Slots Definitions</h5>
                    
                    {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => {
                      const dayData = weeklyForm.days[day as keyof typeof weeklyForm.days];
                      return (
                        <div key={day} className="p-4 rounded-xl border border-slate-800/60 bg-slate-900/20 flex flex-col lg:flex-row items-start lg:items-center gap-4">
                          <label className="flex items-center gap-2.5 cursor-pointer min-w-[120px] select-none">
                            <input
                              type="checkbox"
                              checked={dayData.active}
                              onChange={e => {
                                const copy = { ...weeklyForm };
                                copy.days[day as keyof typeof weeklyForm.days].active = e.target.checked;
                                setWeeklyForm(copy);
                              }}
                              className="text-primary-500 bg-dark-950 focus:ring-0 rounded h-4 w-4 cursor-pointer"
                            />
                            <span className="text-sm font-semibold text-slate-200">{day}</span>
                          </label>

                          {dayData.active && (
                            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 w-full">
                              <div className="space-y-1">
                                <input
                                  type="text"
                                  placeholder="Topic Title (e.g. OOP Concept)"
                                  value={dayData.topic}
                                  onChange={e => {
                                    const copy = { ...weeklyForm };
                                    copy.days[day as keyof typeof weeklyForm.days].topic = e.target.value;
                                    setWeeklyForm(copy);
                                  }}
                                  className="w-full bg-slate-950/40 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-primary-500/50"
                                  required
                                />
                              </div>
                              <div className="space-y-1">
                                <input
                                  type="time"
                                  value={dayData.start_time}
                                  onChange={e => {
                                    const copy = { ...weeklyForm };
                                    copy.days[day as keyof typeof weeklyForm.days].start_time = e.target.value;
                                    setWeeklyForm(copy);
                                  }}
                                  className="w-full bg-slate-950/40 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-primary-500/50"
                                  required
                                />
                              </div>
                              <div className="space-y-1">
                                <input
                                  type="time"
                                  value={dayData.end_time}
                                  onChange={e => {
                                    const copy = { ...weeklyForm };
                                    copy.days[day as keyof typeof weeklyForm.days].end_time = e.target.value;
                                    setWeeklyForm(copy);
                                  }}
                                  className="w-full bg-slate-950/40 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-primary-500/50"
                                  required
                                />
                              </div>
                              <div className="space-y-1">
                                <select
                                  value={dayData.teacher_id}
                                  onChange={e => {
                                    const copy = { ...weeklyForm };
                                    copy.days[day as keyof typeof weeklyForm.days].teacher_id = e.target.value;
                                    setWeeklyForm(copy);
                                  }}
                                  className="w-full bg-slate-950/40 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-primary-500/50 bg-dark-900"
                                >
                                  <option value="">Select Instructor</option>
                                  {teachers.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
                                </select>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setTimetableForm({ id: '', day_of_week: 'Monday', start_time: '', end_time: '', topic: '', course_id: '', batch_id: '', teacher_id: '' });
                    resetWeeklyForm();
                  }}
                  className="btn-secondary py-2 text-xs"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary py-2 text-xs" disabled={loading}>{timetableForm.id ? 'Save Changes' : 'Schedule Weekly Class'}</button>
              </div>
            </form>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {(() => {
              const DAYS_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
              const filtered = timetable
                .filter(slot => slot.course_id === filterCourseId && slot.batch_id === filterBatchId)
                .sort((a, b) => {
                  const dayDiff = DAYS_ORDER.indexOf(a.day_of_week) - DAYS_ORDER.indexOf(b.day_of_week);
                  if (dayDiff !== 0) return dayDiff;
                  return a.start_time.localeCompare(b.start_time);
                });

              if (filtered.length === 0) {
                return (
                  <div className="col-span-full glass-card p-12 text-center text-slate-500 text-xs">
                    No timetable slots scheduled for this course and batch.
                  </div>
                );
              }

              return filtered.map(slot => (
                <div key={slot.id} className="glass-card p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-primary-400 bg-primary-600/10 border border-primary-500/20 px-2 py-0.5 rounded-full">{slot.day_of_week}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-slate-400">{slot.start_time.substring(0,5)} - {slot.end_time.substring(0,5)}</span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setTimetableForm({
                              id: slot.id,
                              day_of_week: slot.day_of_week,
                              start_time: slot.start_time.substring(0,5),
                              end_time: slot.end_time.substring(0,5),
                              topic: slot.topic,
                              course_id: slot.course_id,
                              batch_id: slot.batch_id,
                              teacher_id: slot.teacher_id || ''
                            });
                            setShowForm(true);
                          }}
                          className="text-slate-400 hover:text-slate-900"
                          title="Edit Slot"
                        >
                          <Edit3 className="h-4.5 w-4.5" />
                        </button>
                        <button
                          onClick={() => handleTimetableDelete(slot.id)}
                          className="text-red-400 hover:text-red-300"
                          title="Delete Slot"
                        >
                          <Trash2 className="h-4.5 w-4.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                  <h4 className="font-bold text-slate-200 text-sm mt-1">{slot.topic}</h4>
                  <div className="space-y-0.5 text-xs text-slate-400 border-t border-slate-800/80 pt-2">
                    <p>Course: <strong className="text-slate-300">{slot.courses?.course_name}</strong></p>
                    <p>Batch: <strong className="text-slate-300">{slot.batches?.batch_name}</strong></p>
                    <p>Instructor: <strong className="text-slate-300">{slot.teachers?.full_name || 'N/A'}</strong></p>
                  </div>
                </div>
              ));
            })()}
          </div>
        </div>
      )}

      {/* --- 6. NOTIFICATIONS TAB --- */}
      {activeTab === 'notifications' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-base font-bold text-slate-200">Class Announcements & Broadcasts</h3>
            {!showForm && (
              <button
                onClick={() => {
                  setShowForm(true);
                  setNotificationForm({ title: '', message: '', target_type: 'ALL', target_id: '', notification_type: 'ANNOUNCEMENT' });
                }}
                className="btn-primary flex items-center gap-2 py-2 text-xs"
              >
                <Plus className="h-4 w-4" /> Send Announcement
              </button>
            )}
          </div>

          {showForm && (
            <form onSubmit={handleNotificationSubmit} className="glass-card p-6 max-w-xl mx-auto space-y-4">
              <h4 className="font-bold text-sm text-slate-200">Create Broadcast Notification</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400">Title</label>
                  <input
                    type="text"
                    placeholder="e.g. Schedule Update / Exam Alert"
                    value={notificationForm.title}
                    onChange={e => setNotificationForm({...notificationForm, title: e.target.value})}
                    className="w-full glass-input"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400">Notification Type</label>
                  <select
                    value={notificationForm.notification_type}
                    onChange={e => setNotificationForm({...notificationForm, notification_type: e.target.value})}
                    className="w-full glass-input bg-dark-900"
                  >
                    <option value="ANNOUNCEMENT">Announcement</option>
                    <option value="EXAM">Exam Alert</option>
                    <option value="LECTURE">Lecture Update</option>
                    <option value="ASSIGNMENT">Assignment Task</option>
                    <option value="GENERAL">General Notice</option>
                  </select>
                </div>
                <div className="space-y-1 col-span-2">
                  <label className="text-xs font-semibold text-slate-400">Target Audience (Scope)</label>
                  <select
                    value={notificationForm.target_type}
                    onChange={e => setNotificationForm({...notificationForm, target_type: e.target.value, target_id: ''})}
                    className="w-full glass-input bg-dark-900"
                  >
                    <option value="ALL">All Students</option>
                    <option value="COURSE">Specific Course Students</option>
                    <option value="BATCH">Specific Batch Students</option>
                    <option value="INDIVIDUAL_STUDENT">Individual Student</option>
                  </select>
                </div>

                {notificationForm.target_type === 'COURSE' && (
                  <div className="space-y-1 col-span-2">
                    <label className="text-xs font-semibold text-slate-400">Select Target Course</label>
                    <select
                      value={notificationForm.target_id}
                      onChange={e => setNotificationForm({...notificationForm, target_id: e.target.value})}
                      className="w-full glass-input bg-dark-900"
                      required
                    >
                      <option value="">Choose Course</option>
                      {courses.map(c => <option key={c.id} value={c.id}>{c.course_name}</option>)}
                    </select>
                  </div>
                )}

                {notificationForm.target_type === 'BATCH' && (
                  <div className="space-y-1 col-span-2">
                    <label className="text-xs font-semibold text-slate-400">Select Target Batch</label>
                    <select
                      value={notificationForm.target_id}
                      onChange={e => setNotificationForm({...notificationForm, target_id: e.target.value})}
                      className="w-full glass-input bg-dark-900"
                      required
                    >
                      <option value="">Choose Batch</option>
                      {batches.map(b => <option key={b.id} value={b.id}>{b.batch_name} ({b.courses?.course_name || ''})</option>)}
                    </select>
                  </div>
                )}

                {notificationForm.target_type === 'INDIVIDUAL_STUDENT' && (
                  <div className="space-y-1 col-span-2">
                    <label className="text-xs font-semibold text-slate-400">Select Student</label>
                    <select
                      value={notificationForm.target_id}
                      onChange={e => setNotificationForm({...notificationForm, target_id: e.target.value})}
                      className="w-full glass-input bg-dark-900"
                      required
                    >
                      <option value="">Choose Student</option>
                      {students.map(s => <option key={s.id} value={s.id}>{s.full_name} ({s.email})</option>)}
                    </select>
                  </div>
                )}
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400">Message Content</label>
                <textarea
                  rows={3}
                  placeholder="Type message text here..."
                  value={notificationForm.message}
                  onChange={e => setNotificationForm({...notificationForm, message: e.target.value})}
                  className="w-full glass-input"
                  required
                />
              </div>
              <div className="flex justify-end gap-3 mt-4">
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary py-2 text-xs">Cancel</button>
                <button type="submit" className="btn-primary py-2 text-xs" disabled={loading}>Send Notice</button>
              </div>
            </form>
          )}

          <div className="space-y-4">
            <h4 className="text-sm font-bold text-slate-300">Broadcast History</h4>
            {notifications.length === 0 ? (
              <div className="glass-card p-8 text-center text-slate-500 text-xs">No announcements broadcasted yet.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {notifications.map(n => (
                  <div key={n.id} className="glass-card p-5 space-y-3 relative overflow-hidden">
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono font-bold uppercase tracking-wider">
                        {n.notification_type}
                      </span>
                      <span className="text-[10px] text-slate-500 font-semibold">
                        {new Date(n.created_at).toLocaleDateString()} {new Date(n.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </span>
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-200 text-sm">{n.title}</h4>
                      <p className="text-xs text-slate-400 mt-1.5 whitespace-pre-wrap">{n.message}</p>
                    </div>
                    <div className="border-t border-slate-800/80 pt-2.5 flex justify-between items-center text-[10px] text-slate-500 font-semibold">
                      <span>Recipient: <strong className="text-slate-400">{getTargetName(n.target_type, n.target_id)}</strong></span>
                      <span>By: <span className="text-primary-400">{n.users?.email || 'Instructor'}</span></span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- 7. STUDENT PROGRESS TAB --- */}
      {activeTab === 'progress' && (
        <div className="space-y-6">
          <div className="glass-card p-6 flex flex-col md:flex-row gap-4 items-end bg-slate-900/40 backdrop-blur-xl">
            <div className="flex-1 space-y-1">
              <label className="text-xs font-semibold text-slate-400 uppercase">Select Batch</label>
              <select
                value={selectedProgressBatch}
                onChange={e => {
                  setSelectedProgressBatch(e.target.value);
                  loadStudentProgressData(e.target.value);
                }}
                className="w-full glass-input bg-dark-950/80"
              >
                <option value="">Choose Batch</option>
                {batches.map(b => <option key={b.id} value={b.id}>{b.batch_name}</option>)}
              </select>
            </div>
            {selectedProgressBatch && (
              <div className="flex-1 space-y-1">
                <label className="text-xs font-semibold text-slate-400 uppercase">Search Student</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search by name..."
                    value={progressSearchTerm}
                    onChange={e => setProgressSearchTerm(e.target.value)}
                    className="w-full glass-input pl-9 bg-dark-950/80"
                  />
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                </div>
              </div>
            )}
          </div>

          {!selectedProgressBatch ? (
            <div className="glass-card p-8 text-center text-slate-500 text-xs bg-slate-900/20">
              Select a batch from the dropdown above to view student progress reports.
            </div>
          ) : progressStudents.length === 0 ? (
            <div className="glass-card p-8 text-center text-slate-500 text-xs bg-slate-900/20">
              No students enrolled in this batch.
            </div>
          ) : (
            <div className="glass-card overflow-hidden bg-slate-900/30">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-slate-900/50">
                      <th className="table-header text-left pl-6">Student ID</th>
                      <th className="table-header text-left">Name</th>
                      <th className="table-header text-left">Email</th>
                      <th className="table-header text-left">Attendance Rate</th>
                      <th className="table-header text-left">Exams Average</th>
                      <th className="table-header text-left">Assignments Completed</th>
                      <th className="table-header text-right pr-6">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {progressStudents
                      .filter(s => s.full_name.toLowerCase().includes(progressSearchTerm.toLowerCase()))
                      .map(s => {
                        // Attendance calculations
                        const studentAttendance = progressAttendance.filter(a => a.student_id === s.id);
                        const totalClasses = studentAttendance.length;
                        const presents = studentAttendance.filter(a => a.status === 'PRESENT').length;
                        const attendanceRate = totalClasses > 0 ? Math.round((presents / totalClasses) * 100) : 100;

                        // Exam average calculations
                        const studentExams = progressExams.filter(er => er.student_id === s.id);
                        let totalExamScore = 0;
                        let totalExamMax = 0;
                        studentExams.forEach(e => {
                          totalExamScore += Number(e.score || 0);
                          totalExamMax += Number(e.max_score || 0);
                        });
                        const examAverage = totalExamMax > 0 ? Math.round((totalExamScore / totalExamMax) * 100) : null;

                        // Assignment submissions calculations
                        const studentAssignments = progressAssignments.filter(asub => asub.student_id === s.id);
                        const assignmentsSubmitted = studentAssignments.length;
                        const assignmentsEvaluated = studentAssignments.filter(asub => asub.status === 'EVALUATED').length;
                        let totalAsgScore = 0;
                        let totalAsgCount = 0;
                        studentAssignments.forEach(a => {
                          if (a.score !== null && a.score !== undefined) {
                            totalAsgScore += Number(a.score);
                            totalAsgCount++;
                          }
                        });
                        const asgAverage = totalAsgCount > 0 ? Math.round(totalAsgScore / totalAsgCount) : null;

                        return (
                          <tr key={s.id} className="hover:bg-slate-900/20 transition-colors border-b border-slate-800/60 last:border-0">
                            <td className="table-cell font-mono text-xs text-slate-500 pl-6">{s.id.substring(0, 8)}...</td>
                            <td className="table-cell font-bold text-slate-200">{s.full_name}</td>
                            <td className="table-cell text-xs text-slate-400">{s.email}</td>
                            <td className="table-cell">
                              <div className="flex items-center gap-2 max-w-[150px]">
                                <div className="flex-1 bg-slate-800 h-1.5 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full ${
                                      attendanceRate >= 75
                                        ? 'bg-green-500'
                                        : attendanceRate >= 50
                                        ? 'bg-amber-500'
                                        : 'bg-red-500'
                                    }`}
                                    style={{ width: `${attendanceRate}%` }}
                                  />
                                </div>
                                <span className={`text-xs font-bold ${
                                  attendanceRate >= 75 ? 'text-green-400' : attendanceRate >= 50 ? 'text-amber-400' : 'text-red-400'
                                }`}>
                                  {attendanceRate}%
                                </span>
                              </div>
                            </td>
                            <td className="table-cell text-xs font-semibold">
                              {examAverage !== null ? (
                                <span className="text-primary-400 font-bold">{examAverage}%</span>
                              ) : (
                                <span className="text-slate-500">No attempts</span>
                              )}
                            </td>
                            <td className="table-cell text-xs text-slate-300">
                              <div className="space-y-0.5">
                                <p>{assignmentsSubmitted} Submitted</p>
                                <p className="text-[10px] text-slate-400">({assignmentsEvaluated} Graded)</p>
                              </div>
                            </td>
                            <td className="table-cell text-right pr-6">
                              <button
                                onClick={() => {
                                  // Compile summary data inside details object for modal use
                                  setSelectedStudentDetails({
                                    student: s,
                                    attendance: studentAttendance,
                                    attendanceRate,
                                    exams: studentExams,
                                    examAverage,
                                    assignments: studentAssignments,
                                    asgAverage
                                  });
                                }}
                                className="text-xs text-primary-400 hover:text-primary-300 font-semibold border border-primary-500/25 hover:bg-primary-500/10 px-3 py-1.5 rounded-xl transition-colors inline-flex items-center gap-1"
                              >
                                View Report Card <ChevronRight className="h-3 w-3" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Student details popup modal */}
          {selectedStudentDetails && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-overlay">
              <div className="glass-card w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col relative bg-dark-900 border-slate-800 shadow-2xl">
                <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/40">
                  <div>
                    <h3 className="text-lg font-bold text-slate-100">{selectedStudentDetails.student.full_name}</h3>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">Student ID: {selectedStudentDetails.student.id}</p>
                  </div>
                  <button
                    onClick={() => setSelectedStudentDetails(null)}
                    className="text-slate-400 hover:text-slate-900 border border-slate-800 hover:bg-slate-800 p-2 rounded-xl transition-colors"
                  >
                    <XCircle className="h-5 w-5" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Left Column: Attendance ledger */}
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h4 className="text-sm font-bold text-slate-200 flex items-center gap-1.5"><Clock className="h-4.5 w-4.5 text-primary-400" /> Attendance History</h4>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        selectedStudentDetails.attendanceRate >= 75 ? 'bg-green-500/15 text-green-400 border border-green-500/25' : 'bg-amber-500/15 text-amber-400 border border-amber-500/25'
                      }`}>
                        Rate: {selectedStudentDetails.attendanceRate}%
                      </span>
                    </div>

                    <div className="bg-slate-950/30 border border-slate-800/60 rounded-2xl max-h-[40vh] overflow-y-auto p-3 space-y-2">
                      {selectedStudentDetails.attendance.length === 0 ? (
                        <p className="text-slate-500 text-xs text-center py-8">No attendance records found.</p>
                      ) : (
                        selectedStudentDetails.attendance.map((log: any) => (
                          <div key={log.id} className="flex justify-between items-center p-2.5 rounded-xl bg-slate-900/25 border border-slate-800/40">
                            <span className="text-xs font-medium text-slate-300">{new Date(log.date).toLocaleDateString()}</span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              log.status === 'PRESENT' ? 'bg-green-500/15 text-green-400 border border-green-500/20' : 'bg-red-500/15 text-red-400 border border-red-500/20'
                            }`}>
                              {log.status}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Right Column: Grades and scores */}
                  <div className="space-y-6">
                    {/* Exams section */}
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <h4 className="text-sm font-bold text-slate-200 flex items-center gap-1.5"><Award className="h-4.5 w-4.5 text-amber-400" /> Exam Results</h4>
                        {selectedStudentDetails.examAverage !== null && (
                          <span className="text-xs font-bold text-amber-400">Avg: {selectedStudentDetails.examAverage}%</span>
                        )}
                      </div>

                      <div className="bg-slate-950/30 border border-slate-800/60 rounded-2xl p-3 space-y-2 max-h-[22vh] overflow-y-auto">
                        {selectedStudentDetails.exams.length === 0 ? (
                          <p className="text-slate-500 text-xs text-center py-4">No exam submissions found.</p>
                        ) : (
                          selectedStudentDetails.exams.map((res: any) => (
                            <div key={res.id} className="p-2.5 rounded-xl bg-slate-900/25 border border-slate-800/40 space-y-1">
                              <div className="flex justify-between items-center">
                                <span className="text-xs font-bold text-slate-300 truncate max-w-[180px]">{res.exams?.title || 'Exam'}</span>
                                <span className="text-xs text-primary-400 font-bold">{res.score} / {res.max_score}</span>
                              </div>
                              {res.feedback && <p className="text-[10px] text-slate-400 italic">Feedback: {res.feedback}</p>}
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Assignments section */}
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <h4 className="text-sm font-bold text-slate-200 flex items-center gap-1.5"><FileText className="h-4.5 w-4.5 text-green-400" /> Assignments Submissions</h4>
                      </div>

                      <div className="bg-slate-950/30 border border-slate-800/60 rounded-2xl p-3 space-y-2 max-h-[22vh] overflow-y-auto">
                        {selectedStudentDetails.assignments.length === 0 ? (
                          <p className="text-slate-500 text-xs text-center py-4">No assignments submitted.</p>
                        ) : (
                          selectedStudentDetails.assignments.map((res: any) => (
                            <div key={res.id} className="p-2.5 rounded-xl bg-slate-900/25 border border-slate-800/40 space-y-1">
                              <div className="flex justify-between items-center">
                                <span className="text-xs font-bold text-slate-300 truncate max-w-[180px]">{res.assignments?.title || 'Assignment'}</span>
                                <span className="text-xs font-bold">
                                  {res.status === 'EVALUATED' ? (
                                    <span className="text-green-400">{res.score} Marks</span>
                                  ) : (
                                    <span className="text-amber-400 text-[10px] bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded-full font-bold">Pending Review</span>
                                  )}
                                </span>
                              </div>
                              {res.feedback && <p className="text-[10px] text-slate-400 italic">Feedback: {res.feedback}</p>}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-4 border-t border-slate-800 bg-slate-950/20 flex justify-end">
                  <button
                    onClick={() => setSelectedStudentDetails(null)}
                    className="btn-secondary py-2 px-6 text-xs"
                  >
                    Close Report
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* --- LIVE SESSIONS TAB --- */}
      {activeTab === 'live-sessions' && (
        <div className="space-y-6">
          {activeLiveSession ? (
            /* CONTROL ROOM / JOIN SCREEN VIEW */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-8 space-y-6">
                {/* Back button and title */}
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => setActiveLiveSession(null)}
                    className="btn-secondary py-1.5 px-4 text-xs flex items-center gap-1.5"
                  >
                    &larr; Back to Sessions
                  </button>
                  <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full font-bold border ${
                    activeLiveSession.status === 'ACTIVE'
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                      : activeLiveSession.status === 'COMPLETED'
                      ? 'bg-slate-800/50 border-slate-700/50 text-slate-400'
                      : 'bg-sky-500/10 border-sky-500/20 text-sky-400'
                  }`}>
                    {activeLiveSession.status === 'ACTIVE' && <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping"></span>}
                    {activeLiveSession.status}
                  </span>
                </div>

                {/* Player container */}
                <div className="glass-card overflow-hidden bg-slate-900/60 border border-slate-800/80">
                  <div className="p-4 bg-slate-950/40 border-b border-slate-800 flex justify-between items-center">
                    <div>
                      <h3 className="font-bold text-slate-200">{activeLiveSession.courses?.course_name}</h3>
                      <p className="text-xs text-slate-400">{activeLiveSession.batches?.batch_name} &bull; {activeLiveSession.session_type === 'LIVE' ? 'Standard Live Class' : 'Recorded Lecture as Live'}</p>
                    </div>
                  </div>

                  {activeLiveSession.session_type === 'RECORDED_AS_LIVE' ? (
                    <div className="relative aspect-video w-full bg-black flex items-center justify-center">
                      {activeLiveSession.video_link ? (
                        <iframe
                          src={getGoogleDriveEmbedUrl(activeLiveSession.video_link)}
                          width="100%"
                          height="100%"
                          className="w-full h-full min-h-[400px]"
                          allow="autoplay"
                          title="Recorded Class Video"
                        ></iframe>
                      ) : (
                        <p className="text-slate-400 text-sm">No video link provided for this recorded lecture.</p>
                      )}
                    </div>
                  ) : (
                    <div className="p-12 text-center space-y-4">
                      <div className="mx-auto w-16 h-16 rounded-full bg-primary-500/10 border border-primary-500/20 flex items-center justify-center">
                        <Video className="h-8 w-8 text-primary-400" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="font-bold text-slate-200 text-sm">Standard Live Session Room</h4>
                        <p className="text-xs text-slate-400">This class uses an external service (e.g. Zoom, Teams, Google Meet).</p>
                      </div>
                      {activeLiveSession.meeting_link && (
                        <a
                          href={activeLiveSession.meeting_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-primary inline-flex items-center gap-1.5 py-2 px-6 text-xs"
                        >
                          Join Zoom/Meet Meeting &rarr;
                        </a>
                      )}
                    </div>
                  )}

                  <div className="p-6 space-y-4">
                    {activeLiveSession.message && (
                      <div className="p-4 rounded-xl bg-slate-950/20 border border-slate-800/40 space-y-1">
                        <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wide">Teacher's Note</h5>
                        <p className="text-sm text-slate-300">{activeLiveSession.message}</p>
                      </div>
                    )}

                    {/* Session Controls */}
                    <div className="border-t border-slate-800/50 pt-4 flex flex-wrap gap-4 items-center justify-between">
                      <div className="flex gap-4">
                        {/* Chat toggle option */}
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={activeLiveSession.chat_enabled}
                            onChange={() => handleToggleSessionChat(activeLiveSession.id, activeLiveSession.chat_enabled)}
                            className="w-4 h-4 rounded text-primary-500 border-slate-800 focus:ring-0 focus:ring-offset-0 bg-slate-900"
                          />
                          <span className="text-xs text-slate-300 font-semibold">Enable Live Chat</span>
                        </label>

                        {/* Raise Hand toggle option */}
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={activeLiveSession.raise_hand_enabled}
                            onChange={() => handleToggleSessionRaiseHand(activeLiveSession.id, activeLiveSession.raise_hand_enabled)}
                            className="w-4 h-4 rounded text-primary-500 border-slate-800 focus:ring-0 focus:ring-offset-0 bg-slate-900"
                          />
                          <span className="text-xs text-slate-300 font-semibold">Enable Raise Hand</span>
                        </label>

                        {/* Voice Message toggle option */}
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={activeLiveSession.voice_enabled !== false}
                            onChange={() => handleToggleSessionVoice(activeLiveSession.id, activeLiveSession.voice_enabled !== false)}
                            className="w-4 h-4 rounded text-primary-500 border-slate-800 focus:ring-0 focus:ring-offset-0 bg-slate-900"
                          />
                          <span className="text-xs text-slate-300 font-semibold">Enable Voice Messages</span>
                        </label>
                      </div>

                      <div className="flex gap-2">
                        {activeLiveSession.status === 'SCHEDULED' && (
                          <button
                            onClick={() => handleUpdateSessionStatus(activeLiveSession.id, 'ACTIVE')}
                            className="btn-primary py-2 px-6 text-xs bg-emerald-600 hover:bg-emerald-500"
                          >
                            Start Session
                          </button>
                        )}
                        {activeLiveSession.status === 'ACTIVE' && (
                          <button
                            onClick={() => handleUpdateSessionStatus(activeLiveSession.id, 'COMPLETED')}
                            className="btn-primary py-2 px-6 text-xs bg-rose-600 hover:bg-rose-500"
                          >
                            End Session
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Control Room Right Panel (Chat and Hand Raises) */}
              <div className="lg:col-span-4 flex flex-col h-[70vh] glass-card bg-slate-900/60 border border-slate-800/80 overflow-hidden">
                <div className="flex border-b border-slate-800 bg-slate-950/40">
                  <button
                    onClick={() => setActiveRightPanel('chat')}
                    className={`flex-1 py-3 text-xs font-bold uppercase tracking-wide flex items-center justify-center gap-1.5 border-b-2 transition-all ${
                      activeRightPanel === 'chat'
                        ? 'border-primary-500 text-primary-400 bg-slate-900/20'
                        : 'border-transparent text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <MessageSquare className="h-4 w-4" /> Live Chat
                  </button>
                  <button
                    onClick={() => setActiveRightPanel('hands')}
                    className={`flex-1 py-3 text-xs font-bold uppercase tracking-wide flex items-center justify-center gap-1.5 border-b-2 transition-all relative ${
                      activeRightPanel === 'hands'
                        ? 'border-primary-500 text-primary-400 bg-slate-900/20'
                        : 'border-transparent text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Hand className="h-4 w-4" /> Raised Hands
                    {raisedHands.length > 0 && (
                      <span className="absolute top-2 right-4 flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                      </span>
                    )}
                  </button>
                </div>

                <div className="flex-1 flex flex-col min-h-0 bg-slate-950/10">
                  {activeRightPanel === 'chat' ? (
                    /* LIVE CHAT INTERFACE */
                    <>
                      <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {liveChatMessages.length === 0 ? (
                          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500 space-y-2">
                            <MessageSquare className="h-8 w-8 opacity-40 text-slate-400" />
                            <p className="text-xs">No messages yet. Send a message to start the chat.</p>
                          </div>
                        ) : (
                          liveChatMessages.map((chat) => (
                            <div key={chat.id} className="space-y-1">
                              <div className="flex items-center gap-1.5">
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                                  chat.sender_role === 'TEACHER'
                                    ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                                    : 'bg-primary-500/10 border border-primary-500/20 text-primary-400'
                                }`}>
                                  {chat.sender_role}
                                </span>
                                <span className="text-xs font-bold text-slate-300">{chat.sender_name}</span>
                                <span className="text-[10px] text-slate-500">
                                  {new Date(chat.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                              {chat.message_type === 'VOICE' ? (
                                <div className="mt-1 pl-1">
                                  <audio src={chat.voice_url} controls className="max-w-[200px] h-8 rounded-lg outline-none bg-slate-900 border border-slate-800" />
                                </div>
                              ) : (
                                <p className="text-sm text-slate-300 pl-1">{chat.message}</p>
                              )}
                            </div>
                          ))
                        )}
                      </div>

                      {/* Chat text box */}
                      <form onSubmit={handleSendChatMessage} className="p-3 border-t border-slate-800/80 bg-slate-950/40 flex flex-col gap-2">
                        {isRecordingAudio ? (
                          <div className="flex items-center justify-between bg-slate-900 border border-red-500/30 rounded-xl px-4 py-2 text-xs">
                            <div className="flex items-center gap-2">
                              <span className="h-2.5 w-2.5 rounded-full bg-red-500 animate-ping"></span>
                              <span className="h-2.5 w-2.5 rounded-full bg-red-500 absolute"></span>
                              <span className="text-red-400 font-semibold pl-2">Recording Audio: {recordingDuration}s</span>
                            </div>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={cancelAudioRecording}
                                className="text-slate-400 hover:text-slate-200 font-bold px-2 py-1"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={stopAudioRecording}
                                className="bg-red-600 hover:bg-red-500 text-white rounded-lg p-1.5 flex items-center justify-center"
                              >
                                <Square className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <input
                              type="text"
                              placeholder={activeLiveSession.chat_enabled ? "Post a doubt or reply..." : "Chat is disabled"}
                              value={chatInputText}
                              onChange={e => setChatInputText(e.target.value)}
                              disabled={!activeLiveSession.chat_enabled}
                              className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-slate-200 text-xs focus:outline-none focus:border-primary-500/50 disabled:opacity-50"
                            />
                            
                            {activeLiveSession.chat_enabled && activeLiveSession.voice_enabled !== false && (
                              <button
                                type="button"
                                onClick={startAudioRecording}
                                className="btn-secondary py-2 px-3 rounded-xl flex items-center justify-center border border-slate-800 hover:border-primary-500/50"
                                title="Record Voice Message"
                              >
                                <Mic className="h-3.5 w-3.5 text-slate-400 hover:text-slate-200" />
                              </button>
                            )}

                            <button
                              type="submit"
                              disabled={!activeLiveSession.chat_enabled || !chatInputText.trim()}
                              className="btn-primary py-2 px-3 rounded-xl flex items-center justify-center"
                            >
                              <Send className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                        <button
                          type="submit"
                          disabled={!activeLiveSession.chat_enabled || !chatInputText.trim()}
                          className="btn-primary py-2 px-3 rounded-xl flex items-center justify-center"
                        >
                          <Send className="h-3.5 w-3.5" />
                        </button>
                      </form>
                    </>
                  ) : (
                    /* RAISED HANDS PANEL */
                    <div className="flex-1 overflow-y-auto p-4 space-y-2">
                      {raisedHands.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500 space-y-2">
                          <Hand className="h-8 w-8 opacity-40 text-slate-400" />
                          <p className="text-xs">No hand raises currently.</p>
                        </div>
                      ) : (
                        raisedHands.map((hand) => (
                          <div key={hand.id} className="p-3 rounded-xl bg-rose-500/5 border border-rose-500/10 flex items-center justify-between">
                            <div>
                              <p className="text-xs font-bold text-slate-200">{hand.students?.full_name}</p>
                              <p className="text-[10px] text-slate-400">Raised at {new Date(hand.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                            </div>
                            <button
                              onClick={() => handleAcknowledgeHand(hand.student_id)}
                              className="btn-primary py-1 px-3 text-[10px] bg-emerald-600 hover:bg-emerald-500"
                            >
                              Resolve
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* LIVE SESSIONS LIST & CREATE FORM VIEW */
            <div className="space-y-6">
              {/* Header and Toggle Form Button */}
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-bold text-slate-200">Live Sessions</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Create live streams or schedule pre-recorded lectures as live sessions.</p>
                </div>
                <button
                  onClick={() => setShowForm(!showForm)}
                  className="btn-primary flex items-center gap-1.5 py-2 px-4 text-xs font-bold"
                >
                  <Plus className="h-4 w-4" /> {showForm ? 'Cancel Creation' : 'Create Live Session'}
                </button>
              </div>

              {/* CREATION FORM CARD */}
              {showForm && (
                <form onSubmit={handleLiveSessionCreate} className="glass-card p-6 max-w-4xl mx-auto space-y-6 bg-slate-900/40 backdrop-blur-xl">
                  <h4 className="font-bold text-sm text-slate-200">Configure Live Session</h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Course */}
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-400 uppercase">Course</label>
                      <select
                        value={liveSessionForm.course_id}
                        onChange={e => setLiveSessionForm({ ...liveSessionForm, course_id: e.target.value, batch_id: '' })}
                        className="w-full glass-input bg-dark-900"
                        required
                      >
                        <option value="">-- Choose Course --</option>
                        {courses.map(course => (
                          <option key={course.id} value={course.id}>{course.course_name}</option>
                        ))}
                      </select>
                    </div>

                    {/* Batch */}
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-400 uppercase">Batch</label>
                      <select
                        value={liveSessionForm.batch_id}
                        disabled={!liveSessionForm.course_id}
                        onChange={e => setLiveSessionForm({ ...liveSessionForm, batch_id: e.target.value })}
                        className="w-full glass-input bg-dark-900"
                        required
                      >
                        <option value="">-- Choose Batch --</option>
                        {batches
                          .filter(b => b.course_id === liveSessionForm.course_id)
                          .map(batch => (
                            <option key={batch.id} value={batch.id}>{batch.batch_name} ({batch.batch_timing})</option>
                          ))
                        }
                      </select>
                    </div>

                    {/* Session Type */}
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-400 uppercase">Session Type</label>
                      <select
                        value={liveSessionForm.session_type}
                        onChange={e => setLiveSessionForm({ ...liveSessionForm, session_type: e.target.value, meeting_link: '', video_link: '' })}
                        className="w-full glass-input bg-dark-900"
                        required
                      >
                        <option value="LIVE">Standard Live Class (Zoom/Meet)</option>
                        <option value="RECORDED_AS_LIVE">Recorded Lecture as Live</option>
                      </select>
                    </div>

                    {/* Scheduled At */}
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-400 uppercase">Scheduled Time</label>
                      <input
                        type="datetime-local"
                        value={liveSessionForm.scheduled_at}
                        onChange={e => setLiveSessionForm({ ...liveSessionForm, scheduled_at: e.target.value })}
                        className="w-full glass-input"
                        required
                      />
                    </div>

                    {/* Link depending on session type */}
                    {liveSessionForm.session_type === 'LIVE' ? (
                      <div className="space-y-1 md:col-span-2">
                        <label className="text-xs font-semibold text-slate-400 uppercase">Live Session Link</label>
                        <input
                          type="url"
                          placeholder="e.g. https://zoom.us/j/..."
                          value={liveSessionForm.meeting_link}
                          onChange={e => setLiveSessionForm({ ...liveSessionForm, meeting_link: e.target.value })}
                          className="w-full glass-input"
                          required
                        />
                      </div>
                    ) : (
                      <div className="space-y-1 md:col-span-2">
                        <label className="text-xs font-semibold text-slate-400 uppercase">Google Drive Video Link</label>
                        <input
                          type="url"
                          placeholder="e.g. https://drive.google.com/file/d/.../view?usp=sharing"
                          value={liveSessionForm.video_link}
                          onChange={e => setLiveSessionForm({ ...liveSessionForm, video_link: e.target.value })}
                          className="w-full glass-input"
                          required
                        />
                      </div>
                    )}

                    {/* Note message */}
                    <div className="space-y-1 md:col-span-2">
                      <label className="text-xs font-semibold text-slate-400 uppercase">Short Message / Topic Description</label>
                      <textarea
                        placeholder="e.g. Today we will review dynamic routing and database indexes."
                        value={liveSessionForm.message}
                        onChange={e => setLiveSessionForm({ ...liveSessionForm, message: e.target.value })}
                        className="w-full glass-input min-h-[80px]"
                        maxLength={500}
                      ></textarea>
                    </div>

                    {/* Checkboxes */}
                    <div className="md:col-span-2 flex gap-6">
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={liveSessionForm.chat_enabled}
                          onChange={e => setLiveSessionForm({ ...liveSessionForm, chat_enabled: e.target.checked })}
                          className="w-4 h-4 rounded text-primary-500 border-slate-800 focus:ring-0 focus:ring-offset-0 bg-slate-900"
                        />
                        <span className="text-xs text-slate-300 font-semibold">Enable Live Chat</span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={liveSessionForm.raise_hand_enabled}
                          onChange={e => setLiveSessionForm({ ...liveSessionForm, raise_hand_enabled: e.target.checked })}
                          className="w-4 h-4 rounded text-primary-500 border-slate-800 focus:ring-0 focus:ring-offset-0 bg-slate-900"
                        />
                        <span className="text-xs text-slate-300 font-semibold">Enable Raise Hand Option</span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={liveSessionForm.voice_enabled}
                          onChange={e => setLiveSessionForm({ ...liveSessionForm, voice_enabled: e.target.checked })}
                          className="w-4 h-4 rounded text-primary-500 border-slate-800 focus:ring-0 focus:ring-offset-0 bg-slate-900"
                        />
                        <span className="text-xs text-slate-300 font-semibold">Enable Voice Messages</span>
                      </label>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-primary py-2 px-6 text-xs w-full sm:w-auto"
                  >
                    {loading ? 'Creating session...' : 'Schedule Live Session'}
                  </button>
                </form>
              )}

              {/* LIST OF SESSIONS */}
              <div className="glass-card overflow-hidden">
                {liveSessions.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 text-xs">No live sessions created yet. Click the button above to schedule one.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b border-slate-800 bg-slate-900/10">
                          <th className="table-header text-left pl-6">Course & Batch</th>
                          <th className="table-header text-left">Session Type</th>
                          <th className="table-header text-left">Message</th>
                          <th className="table-header text-left">Scheduled For</th>
                          <th className="table-header text-left">Status</th>
                          <th className="table-header text-right pr-6">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {liveSessions.map((session) => (
                          <tr key={session.id} className="border-b border-slate-800/40 hover:bg-slate-900/10 transition-colors">
                            <td className="table-cell pl-6">
                              <p className="font-bold text-slate-200 text-xs">{session.courses?.course_name}</p>
                              <p className="text-[10px] text-slate-400">{session.batches?.batch_name}</p>
                            </td>
                            <td className="table-cell">
                              <span className="text-xs font-semibold text-slate-300">
                                {session.session_type === 'LIVE' ? 'Standard Live Link' : 'Google Drive Video'}
                              </span>
                            </td>
                            <td className="table-cell">
                              <p className="text-xs text-slate-400 truncate max-w-[200px]">{session.message || 'No description'}</p>
                            </td>
                            <td className="table-cell text-xs text-slate-300">
                              {new Date(session.scheduled_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                            </td>
                            <td className="table-cell">
                              <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                                session.status === 'ACTIVE'
                                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 animate-pulse'
                                  : session.status === 'COMPLETED'
                                  ? 'bg-slate-800/50 border-slate-700/50 text-slate-400'
                                  : 'bg-sky-500/10 border-sky-500/20 text-sky-400'
                              }`}>
                                {session.status}
                              </span>
                            </td>
                            <td className="table-cell text-right pr-6 space-x-2">
                              {session.status !== 'COMPLETED' && (
                                <button
                                  onClick={() => {
                                    setActiveLiveSession(session);
                                    if (session.status === 'SCHEDULED') {
                                      handleUpdateSessionStatus(session.id, 'ACTIVE');
                                    }
                                  }}
                                  className="btn-primary py-1 px-3 text-[10px]"
                                >
                                  {session.status === 'ACTIVE' ? 'Control Room' : 'Start'}
                                </button>
                              )}
                              {session.status === 'COMPLETED' && (
                                <span className="text-[10px] text-slate-500 italic mr-2">Finished</span>
                              )}
                              <button
                                onClick={() => handleLiveSessionDelete(session.id)}
                                className="btn-secondary py-1 px-2.5 text-[10px] border border-rose-500/20 text-rose-400 hover:bg-rose-500/10"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TeacherDashboard;
