import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { supabase } from '../../supabaseClient';
import {
  BookOpen,
  Calendar,
  FileText,
  GraduationCap,
  Award,
  CreditCard,
  Download,
  AlertCircle,
  Clock,
  Play,
  FileDown,
  ExternalLink,
  Loader2,
  Video,
  Send,
  MessageSquare,
  Hand,
  Mic,
  Square
} from 'lucide-react';

const StudentDashboard: React.FC = () => {
  const { tab } = useParams();
  const navigate = useNavigate();
  const activeTab = tab || 'courses';

  // Student specific data arrays
  const [courses, setCourses] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [timetable, setTimetable] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [exams, setExams] = useState<any[]>([]);
  const [grades, setGrades] = useState<any>({ exams: [], assignments: [] });
  const [feeLedger, setFeeLedger] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [certificates, setCertificates] = useState<any[]>([]);
  const [payAmount, setPayAmount] = useState<string>('');
  const [digitalPaymentsEnabled, setDigitalPaymentsEnabled] = useState<boolean>(true);
  
  // Live Sessions States
  const [liveSessions, setLiveSessions] = useState<any[]>([]);
  const [activeLiveSession, setActiveLiveSession] = useState<any | null>(null);
  const [liveChatMessages, setLiveChatMessages] = useState<any[]>([]);
  const [chatInputText, setChatInputText] = useState('');
  const [hasRaisedHand, setHasRaisedHand] = useState(false);
  const [studentId, setStudentId] = useState<string>('');

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setStudentId(user.id);
      }
    });
  }, []);

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

  const handleRaiseHand = async () => {
    if (!activeLiveSession) return;
    try {
      const res = await api.post(`/api/live-sessions/${activeLiveSession.id}/raise-hand`);
      if (res.data?.success) {
        setHasRaisedHand(true);
      }
    } catch (err) {
      console.error('Error raising hand:', err);
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

  // Voice Recording States & Handlers for Student
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

  // Chat & Raise Hand polling when a student joins a live session
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
          const checkRaise = handsRes.data.raised_hands.some((hand: any) => hand.student_id === studentId);
          setHasRaisedHand(checkRaise);
        }

        const allSessionsRes = await api.get('/api/live-sessions');
        if (allSessionsRes.data?.success) {
          const current = allSessionsRes.data.live_sessions.find((s: any) => s.id === activeLiveSession.id);
          if (current) {
            if (current.status === 'COMPLETED') {
              alert('This live session has been ended by the teacher.');
              setActiveLiveSession(null);
            } else {
              setActiveLiveSession(current);
            }
          }
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    };

    pollSessionData();
    const intervalId = setInterval(pollSessionData, 3000);
    return () => clearInterval(intervalId);
  }, [activeLiveSession, studentId]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [previewCert, setPreviewCert] = useState<any>(null);
  const [selectedMaterialType, setSelectedMaterialType] = useState('all');

  // Selection configurations
  const [activeCourse, setActiveCourse] = useState<any>(null);
  const [activeExam, setActiveExam] = useState<any>(null);
  const [activeVideo, setActiveVideo] = useState<any>(null);
  
  // MCQ attempt states
  const [mcqAnswers, setMcqAnswers] = useState<Record<string, string>>({});
  const [examTimeRemaining, setExamTimeRemaining] = useState(0);
  const [examTimerInterval, setExamTimerInterval] = useState<any>(null);

  // File submit states
  const [submittingTaskId, setSubmittingTaskId] = useState('');
  const [submitFileName, setSubmitFileName] = useState('');
  const [submitFileUrl, setSubmitFileUrl] = useState('');
  
  // Coding exam submit states — text answer per question
  const [codingAnswers, setCodingAnswers] = useState<Record<string, string>>({});
  const [submittedCodingQuestions, setSubmittedCodingQuestions] = useState<string[]>([]);

  // UI indicators
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [uploadingFile, setUploadingFile] = useState(false);

  const uploadToSupabase = async (file: File, type: 'submission' | 'exam') => {
    setUploadingFile(true);
    setMsg('Uploading file to Supabase storage...');
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
      const filePath = `student_uploads/${fileName}`;

      const { error } = await supabase.storage
        .from('lms-files')
        .upload(filePath, file);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('lms-files')
        .getPublicUrl(filePath);

      setSubmitFileUrl(publicUrl);
      setSubmitFileName(file.name);
      setMsg('File uploaded successfully!');
    } catch (err: any) {
      console.error(err);
      setMsg('Upload failed. Please ensure a public bucket named "lms-files" exists in Supabase.');
    } finally {
      setUploadingFile(false);
    }
  };

  // Redirect assignments to exams, and check valid tabs
  useEffect(() => {
    const validTabs = ['courses', 'timetable', 'exams', 'results', 'fees', 'certificates', 'live-sessions'];
    if (tab) {
      if (tab === 'assignments') {
        navigate('/student/exams', { replace: true });
      } else if (!validTabs.includes(tab)) {
        navigate('/student/courses', { replace: true });
      }
    }
  }, [tab, navigate]);

  useEffect(() => {
    fetchStudentProfileData();
  }, [tab]);

  const fetchStudentProfileData = async () => {
    try {
      // Always fetch courses first if not already loaded, as it is used globally/as default
      if (courses.length === 0) {
        const courseRes = await api.get('/api/courses');
        if (courseRes.data?.success) {
          setCourses(courseRes.data.courses || []);
          if (courseRes.data.courses?.length > 0) {
            setActiveCourse(courseRes.data.courses[0]);
          }
        }
      }

      // Fetch tab-specific data on demand to optimize performance
      if (activeTab === 'courses') {
        const [matRes, attRes] = await Promise.all([
          api.get('/api/materials'),
          api.get('/api/attendance')
        ]);
        if (matRes.data?.success) setMaterials(matRes.data.materials || []);
        if (attRes.data?.success) setAttendance(attRes.data.attendance || []);
      } 
      else if (activeTab === 'timetable') {
        const ttRes = await api.get('/api/timetable');
        if (ttRes.data?.success) setTimetable(ttRes.data.timetable || []);
      } 
      else if (activeTab === 'tasks') {
        const asgRes = await api.get('/api/assignments');
        if (asgRes.data?.success) setAssignments(asgRes.data.assignments || []);
      } 
      else if (activeTab === 'exams') {
        const examRes = await api.get('/api/exams');
        if (examRes.data?.success) setExams(examRes.data.exams || []);
      } 
      else if (activeTab === 'results') {
        const resRes = await api.get('/api/results');
        if (resRes.data?.success) setGrades(resRes.data);
      } 
      else if (activeTab === 'fees') {
        try {
          const [feeRes, settingsRes] = await Promise.all([
            api.get('/api/fees'),
            api.get('/api/settings').catch(() => null)
          ]);
          if (feeRes?.data?.success) {
            setFeeLedger(feeRes.data.ledger);
            setTransactions(feeRes.data.transactions || []);
            if (feeRes.data.ledger) {
              setPayAmount(feeRes.data.ledger.pending_amount.toString());
            }
          }
          if (settingsRes?.data?.success && settingsRes.data.settings) {
            setDigitalPaymentsEnabled(!!settingsRes.data.settings.digital_payment_enabled);
          }
        } catch {}
      } 
      else if (activeTab === 'certificates') {
        const certRes = await api.get('/api/certificates');
        if (certRes.data?.success) setCertificates(certRes.data.certificates || []);
      }
      else if (activeTab === 'live-sessions') {
        const liveRes = await api.get('/api/live-sessions');
        if (liveRes.data?.success) setLiveSessions(liveRes.data.live_sessions || []);
      }
    } catch {}
  };

  // SUBMIT ASSIGNMENT
  const handleAssignmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!submitFileUrl || !submitFileName) return;
    setLoading(true);
    try {
      const res = await api.post('/api/assignments/submit', {
        assignment_id: submittingTaskId,
        file_name: submitFileName,
        file_url: submitFileUrl
      });
      if (res.data?.success) {
        setMsg('Assignment submitted successfully!');
        setSubmittingTaskId('');
        setSubmitFileName('');
        setSubmitFileUrl('');
        fetchStudentProfileData();
      }
    } catch {
      setMsg('Error submitting assignment');
    } finally {
      setLoading(false);
    }
  };

  // ATTEMPT EXAM (MCQ/Coding)
  const startExamAttempt = async (exam: any) => {
    try {
      const res = await api.get(`/api/exams/${exam.id}/details`);
      if (res.data?.success) {
        const fullExam = res.data.exam;
        setActiveExam(fullExam);
        setMcqAnswers({});
        setCodingAnswers({});
        setSubmittedCodingQuestions([]); // Reset submitted list
        setExamTimeRemaining(fullExam.time_limit_minutes * 60);
        
        // Start countdown timer
        if (examTimerInterval) clearInterval(examTimerInterval);
        const timer = setInterval(() => {
          setExamTimeRemaining(prev => {
            if (prev <= 1) {
              clearInterval(timer);
              // Auto-submit triggers when time matches zero
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
        setExamTimerInterval(timer);
      } else {
        setMsg('Error loading exam: ' + res.data?.error);
      }
    } catch (err: any) {
      setMsg(err.response?.data?.error || 'Failed to start exam');
    }
  };

  const handleMCQSubmit = async () => {
    if (examTimerInterval) clearInterval(examTimerInterval);
    setLoading(true);
    try {
      const res = await api.post('/api/exams/submit', {
        exam_id: activeExam.id,
        answers: mcqAnswers
      });
      if (res.data?.success) {
        setMsg(`MCQ Exam submitted! Your Score: ${res.data.score}/${res.data.max_score}`);
        setActiveExam(null);
        fetchStudentProfileData();
      } else {
        setMsg('Error: ' + res.data?.error);
      }
    } catch {
      setMsg('Error submitting exam answers');
    } finally {
      setLoading(false);
    }
  };

  const handleCodingExamSubmit = async (questionId: string) => {
    const answerText = codingAnswers[questionId] || '';
    if (!answerText.trim()) {
      setMsg('Please write your answer before submitting.');
      return;
    }
    setLoading(true);
    try {
      const res = await api.post('/api/exams/submit', {
        exam_id: activeExam.id,
        coding_question_id: questionId,
        answer_text: answerText
      });
      if (res.data?.success) {
        setMsg('Answer submitted successfully!');
        if (!submittedCodingQuestions.includes(questionId)) {
          setSubmittedCodingQuestions([...submittedCodingQuestions, questionId]);
        }
      } else {
        setMsg('Error: ' + res.data?.error);
      }
    } catch {
      setMsg('Answer submission failed');
    } finally {
      setLoading(false);
    }
  };

  const handleCodingExamFinalize = async () => {
    if (!confirm('Are you sure you want to finalize and submit this coding exam? You will not be able to change your answers or re-attempt it.')) return;
    if (examTimerInterval) clearInterval(examTimerInterval);
    setLoading(true);
    try {
      const res = await api.post('/api/exams/submit', {
        exam_id: activeExam.id,
        finalize: true
      });
      if (res.data?.success) {
        setMsg('Coding Exam submitted successfully!');
        setActiveExam(null);
        setSubmittedCodingQuestions([]);
        fetchStudentProfileData();
      } else {
        setMsg('Error: ' + res.data?.error);
      }
    } catch {
      setMsg('Coding exam final submission failed');
    } finally {
      setLoading(false);
    }
  };

  const handleCodingExamFinalizeAuto = async () => {
    if (examTimerInterval) clearInterval(examTimerInterval);
    setLoading(true);
    try {
      const res = await api.post('/api/exams/submit', {
        exam_id: activeExam.id,
        finalize: true
      });
      if (res.data?.success) {
        setMsg('Exam time is up! Coding Exam submitted automatically.');
        setActiveExam(null);
        setSubmittedCodingQuestions([]);
        fetchStudentProfileData();
      }
    } catch {
      setMsg('Coding exam auto-submission failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeExam && examTimeRemaining === 0) {
      if (activeExam.exam_type === 'MCQ') {
        handleMCQSubmit();
      } else {
        handleCodingExamFinalizeAuto();
      }
    }
  }, [examTimeRemaining, activeExam]);

  // PAY FEES ONLINE USING RAZORPAY GATEWAY
  const handlePayFees = async () => {
    if (!digitalPaymentsEnabled) {
      alert('Online payments are currently disabled by the administration.');
      return;
    }
    if (!feeLedger || feeLedger.pending_amount <= 0) return;
    
    const parsedAmount = parseFloat(payAmount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      alert('Please enter a valid amount greater than 0.');
      return;
    }
    if (parsedAmount > feeLedger.pending_amount) {
      alert(`The amount to pay cannot exceed your pending dues of ₹${feeLedger.pending_amount}.`);
      return;
    }

    setLoading(true);
    setMsg('Initiating checkout order...');
    try {
      const res = await api.post('/api/fees/pay', {
        student_id: feeLedger.student_id,
        amount: parsedAmount,
        payment_method: 'ONLINE'
      });
      
      if (res.data?.success && res.data.razorpay) {
        const rp = res.data.razorpay;
        const options = {
          key: rp.key_id,
          amount: rp.amount,
          currency: rp.currency,
          name: "LMS",
          description: "Course Fees Payment",
          order_id: rp.order_id,
          handler: async function (response: any) {
            setLoading(true);
            setMsg('Verifying payment signature...');
            try {
              const verifyRes = await api.post('/api/fees/verify-payment', {
                transaction_id: rp.transaction_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature
              });
              
              if (verifyRes.data?.success) {
                setMsg('Payment successful! Transaction Logged.');
                fetchStudentProfileData();
              } else {
                setMsg('Verification failed: ' + (verifyRes.data?.error || 'Unknown error'));
              }
            } catch {
              setMsg('Error verifying payment transaction');
            } finally {
              setLoading(false);
            }
          },
          prefill: {
            name: rp.student_name,
            email: rp.student_email,
            contact: rp.student_mobile
          },
          theme: {
            color: "#6366f1"
          },
          modal: {
            ondismiss: function () {
              setMsg('Payment cancelled by user.');
              setLoading(false);
            }
          }
        };
        
        const rzp = new (window as any).Razorpay(options);
        rzp.open();
      } else {
        setMsg('Failed to initiate order: ' + (res.data?.error || 'Unknown error'));
        setLoading(false);
      }
    } catch {
      setMsg('Online payment initialization failed.');
      setLoading(false);
    }
  };

  const getAttendanceSummary = () => {
    if (attendance.length === 0) return { percent: 100, present: 0, total: 0 };
    const presentCount = attendance.filter(a => a.status === 'PRESENT').length;
    return {
      percent: Math.round((presentCount / attendance.length) * 100),
      present: presentCount,
      total: attendance.length
    };
  };

  const attSummary = getAttendanceSummary();
  
  const getVideoEmbedUrl = (url: string) => {
    // YouTube parser
    const ytRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const ytMatch = url.match(ytRegex);
    if (ytMatch && ytMatch[1]) {
      return `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1&rel=0`;
    }

    // Google Drive parser
    if (url.includes('drive.google.com')) {
      const driveRegex = /\/file\/d\/([a-zA-Z0-9_-]+)/;
      const driveMatch = url.match(driveRegex);
      if (driveMatch && driveMatch[1]) {
        return `https://drive.google.com/file/d/${driveMatch[1]}/preview`;
      }
    }

    return null;
  };

  return (
    <div className="space-y-6">
      {/* Navigation tabs */}
      <div className="flex border-b border-slate-800 overflow-x-auto pb-1 gap-1">
        {['courses', 'timetable', 'exams', 'results', 'fees', 'certificates', 'live-sessions'].map((tabName) => (
          <button
            key={tabName}
            onClick={() => {
              if (activeExam) {
                if (!confirm('Leave exam? Progress may not be saved.')) return;
                clearInterval(examTimerInterval);
                setActiveExam(null);
              }
              navigate('/student/' + tabName);
              setMsg('');
              setSubmittingTaskId('');
            }}
            className={`px-4 py-2 text-sm font-semibold capitalize whitespace-nowrap rounded-t-lg transition-colors ${
              activeTab === tabName
                ? 'border-b-2 border-primary-500 text-primary-400 bg-slate-900/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {tabName === 'live-sessions' ? 'Live Sessions' : tabName}
          </button>
        ))}
      </div>

      {msg && (
        <div className="bg-primary-950/40 border border-primary-500/20 text-primary-400 px-4 py-3 rounded-xl text-sm max-w-lg text-center mx-auto">
          {msg}
        </div>
      )}

      {/* --- 1. COURSES & MATERIALS TAB --- */}
      {activeTab === 'courses' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-4">
            <h3 className="text-sm font-bold text-slate-300">My Enrolled Courses</h3>
            {courses.map(course => (
              <div
                key={course.id}
                onClick={() => setActiveCourse(course)}
                className={`glass-card p-4 cursor-pointer transition-all ${
                  activeCourse?.id === course.id ? 'border-primary-500 bg-primary-950/10' : 'hover:border-slate-700'
                }`}
              >
                <h4 className="font-bold text-slate-200 text-sm">{course.course_name}</h4>
                <p className="text-[10px] text-slate-400 mt-1">Instructor: {course.teachers?.full_name}</p>
              </div>
            ))}

            <div className="glass-card p-4 space-y-2 mt-4">
              <h4 className="text-xs font-bold text-slate-200">Attendance Summary</h4>
              <div className="flex justify-between items-center pt-2">
                <span className="text-2xl font-bold text-primary-400">{attSummary.percent}%</span>
                <span className="text-xs text-slate-400">({attSummary.present} / {attSummary.total} Sessions Present)</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/60 pb-3">
              <h3 className="text-sm font-bold text-slate-300">Materials Vault - {activeCourse?.course_name}</h3>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { id: 'all', label: 'All Resources' },
                  { id: 'video', label: 'Videos' },
                  { id: 'notes', label: 'Notes' },
                  { id: 'assignment', label: 'Assignments' },
                  { id: 'practice', label: 'Practice' }
                ].map(type => (
                  <button
                    key={type.id}
                    onClick={() => setSelectedMaterialType(type.id)}
                    className={`px-3 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all border ${
                      selectedMaterialType === type.id
                        ? 'bg-primary-600 text-white border-primary-500 shadow-md shadow-primary-600/15'
                        : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border-slate-800'
                    }`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </div>

            {materials.filter(m => m.course_id === activeCourse?.id && (selectedMaterialType === 'all' || m.file_type === selectedMaterialType)).length === 0 ? (
              <div className="glass-card p-12 text-center text-slate-500 text-xs">
                No materials of type "{selectedMaterialType === 'all' ? 'any' : selectedMaterialType}" uploaded yet for this course.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {materials
                  .filter(m => m.course_id === activeCourse?.id && (selectedMaterialType === 'all' || m.file_type === selectedMaterialType))
                  .map(mat => (
                    <div key={mat.id} className="glass-card p-4 space-y-3 relative hover:border-slate-700 transition-all">
                      <span className="text-[9px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-bold uppercase">{mat.file_type}</span>
                      <h4 className="font-bold text-slate-200 text-xs truncate mt-1">{mat.title}</h4>
                      <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">{mat.description}</p>
                      <div className="border-t border-slate-800/80 pt-2 flex justify-end">
                        {mat.file_type === 'video' ? (
                          <button
                            onClick={() => setActiveVideo(mat)}
                            className="text-xs text-primary-400 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            Watch Video <Play className="h-4 w-4" />
                          </button>
                        ) : (
                          <a href={mat.file_url} target="_blank" rel="noreferrer" className="text-xs text-primary-400 font-bold hover:underline flex items-center gap-1">
                            Download <FileDown className="h-4 w-4" />
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- 2. TIMETABLE TAB --- */}
      {activeTab === 'timetable' && (
        <div className="glass-card p-6">
          <h3 className="text-base font-bold text-slate-200 mb-4">My Weekly Class Timetable</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {timetable.map(slot => (
              <div key={slot.id} className="bg-slate-800/10 border border-slate-800/40 rounded-xl p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-primary-400 bg-primary-600/10 border border-primary-500/20 px-2 py-0.5 rounded-full">{slot.day_of_week}</span>
                  <span className="text-xs text-slate-400 font-mono">{slot.start_time.substring(0,5)} - {slot.end_time.substring(0,5)}</span>
                </div>
                <h4 className="font-bold text-slate-200 text-sm mt-1">{slot.topic}</h4>
                <div className="space-y-0.5 text-xs text-slate-400 border-t border-slate-800/85 pt-2">
                  <p>Course: <strong className="text-slate-300">{slot.courses?.course_name}</strong></p>
                  <p>Instructor: <strong className="text-slate-300">{slot.teachers?.full_name || 'N/A'}</strong></p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}


      {/* --- 4. EXAMS TAB --- */}
      {activeTab === 'exams' && (
        <div className="space-y-6">
          {!activeExam ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {exams.map(exam => (
                <div key={exam.id} className="glass-card p-5 space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-bold uppercase">{exam.exam_type}</span>
                    <span className="text-xs text-slate-400 flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {exam.time_limit_minutes} Min</span>
                  </div>
                  <h4 className="font-bold text-slate-200 text-sm">{exam.title}</h4>
                  <p className="text-xs text-slate-400 font-medium">Due by: {new Date(exam.due_date).toLocaleString()}</p>
                  
                  {exam.attempted ? (
                    <button
                      className="btn-secondary w-full py-2 text-xs flex justify-center items-center gap-1.5 cursor-not-allowed opacity-60 text-slate-500 border-slate-800"
                      disabled
                    >
                      Already Attempted
                    </button>
                  ) : (
                    <button
                      onClick={() => startExamAttempt(exam)}
                      className="btn-primary w-full py-2 text-xs flex justify-center items-center gap-1.5"
                    >
                      <Play className="h-3.5 w-3.5 text-white" /> Start Exam
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="glass-card p-6 max-w-xl mx-auto space-y-6 relative border-primary-500/30">
              <div className="flex justify-between items-center pb-4 border-b border-slate-800">
                <div>
                  <h3 className="font-bold text-base text-slate-100">{activeExam.title}</h3>
                  <span className="text-xs text-slate-400 uppercase font-mono">{activeExam.exam_type} Exam</span>
                </div>
                <div className="h-10 w-28 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 font-mono font-bold text-sm">
                  {Math.floor(examTimeRemaining / 60)}:{(examTimeRemaining % 60).toString().padStart(2, '0')}
                </div>
              </div>

              {activeExam.exam_type === 'MCQ' ? (
                <div className="space-y-5">
                  {activeExam.questions?.map((q: any, qIndex: number) => (
                    <div key={q.id} className="space-y-3 bg-slate-900/10 border border-slate-800/40 p-4 rounded-xl">
                      <p className="text-xs font-bold text-slate-200">Q{qIndex+1}: {q.question_text}</p>
                      <div className="space-y-2">
                        {q.options?.map((opt: any) => (
                          <label key={opt.id} className="flex items-center gap-3 p-3 rounded-lg border border-slate-800 hover:border-slate-700 bg-dark-900/30 cursor-pointer text-xs">
                            <input
                              type="radio"
                              name={`question-${q.id}`}
                              checked={mcqAnswers[q.id] === opt.id}
                              onChange={() => setMcqAnswers({ ...mcqAnswers, [q.id]: opt.id })}
                              className="text-primary-500 bg-dark-950 focus:ring-0"
                            />
                            <span className="text-slate-300">{opt.option_text}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                  <button onClick={handleMCQSubmit} className="btn-primary w-full py-2.5 text-xs" disabled={loading}>
                    Finish MCQ & Submit
                  </button>
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 text-xs text-blue-300">
                    <span className="font-bold">📝 Coding Test:</span> Write your answer for each question in the text box below and click "Submit Answer". Once all questions are answered, click "Finish Coding Exam".
                  </div>
                  {activeExam.questions?.map((q: any, qIndex: number) => (
                    <div key={q.id} className="space-y-3 bg-slate-900/10 border border-slate-800/40 p-4 rounded-xl">
                      <div className="flex justify-between items-center pb-2 border-b border-slate-800/40">
                        <p className="text-xs font-bold text-slate-200">Q{qIndex+1}: {q.question_text}</p>
                        {submittedCodingQuestions.includes(q.id) && (
                          <span className="text-[10px] bg-green-500/15 text-green-400 border border-green-500/20 px-2 py-0.5 rounded-full font-semibold">✓ Submitted</span>
                        )}
                      </div>
                      {q.description && (
                        <div className="bg-dark-950 p-4 rounded-xl border border-slate-800 text-xs text-slate-300 whitespace-pre-wrap leading-relaxed font-mono">
                          {q.description}
                        </div>
                      )}
                      <div className="space-y-2 pt-2">
                        <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Your Answer</label>
                        <textarea
                          value={codingAnswers[q.id] || ''}
                          onChange={e => setCodingAnswers({ ...codingAnswers, [q.id]: e.target.value })}
                          placeholder="Write your answer here... (code, explanation, or both)"
                          rows={6}
                          className="w-full glass-input text-xs font-mono resize-y leading-relaxed"
                          disabled={submittedCodingQuestions.includes(q.id)}
                        />
                      </div>
                      {!submittedCodingQuestions.includes(q.id) ? (
                        <button
                          type="button"
                          onClick={() => handleCodingExamSubmit(q.id)}
                          className="btn-primary w-full py-2 text-xs"
                          disabled={loading || !codingAnswers[q.id]?.trim()}
                        >
                          Submit Answer
                        </button>
                      ) : (
                        <div className="text-center text-xs text-green-400 font-semibold py-1">
                          ✓ Answer submitted — you can still edit and re-submit before finalizing.
                        </div>
                      )}
                    </div>
                  ))}
                  <button onClick={handleCodingExamFinalize} className="btn-primary w-full py-2.5 text-xs mt-6" disabled={loading}>
                    Finish Coding Exam & Submit
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* --- 5. RESULTS TAB --- */}
      {activeTab === 'results' && (
        <div className="glass-card p-6 space-y-4">
          <h3 className="text-base font-bold text-slate-200">Grades & Results Card</h3>
          <div className="space-y-4 pt-2">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Exam Results</h4>
            {grades.exams?.length === 0 ? (
              <p className="text-slate-500 text-xs">No exam grades recorded yet.</p>
            ) : (
              grades.exams?.map((e: any) => (
                <div key={e.id} className="flex justify-between items-center bg-slate-800/20 border border-slate-800/40 p-4 rounded-xl">
                  <div>
                    <h5 className="font-bold text-slate-200 text-xs">{e.exams?.title}</h5>
                    <p className="text-[10px] text-slate-400 mt-1">Feedback: {e.feedback || 'None provided.'}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold text-primary-400">{e.score} / {e.max_score}</span>
                    <p className="text-[9px] text-slate-500 mt-0.5">Scored On: {new Date(e.evaluated_at).toLocaleDateString()}</p>
                  </div>
                </div>
              ))
            )}

            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider pt-4">Assignment Scores</h4>
            {grades.assignments?.length === 0 ? (
              <p className="text-slate-500 text-xs">No assignment grades evaluated yet.</p>
            ) : (
              grades.assignments?.map((a: any) => (
                <div key={a.id} className="flex justify-between items-center bg-slate-800/20 border border-slate-800/40 p-4 rounded-xl">
                  <div>
                    <h5 className="font-bold text-slate-200 text-xs">{a.assignments?.title}</h5>
                    <p className="text-[10px] text-slate-400 mt-1">Feedback: {a.feedback || 'Good attempt.'}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold text-green-400">{a.score} / 100</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* --- 6. FEES TAB --- */}
      {activeTab === 'fees' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="glass-card p-5">
              <p className="text-xs text-slate-400 uppercase font-semibold">Total Fee Cap</p>
              <h3 className="text-xl font-bold text-slate-100 mt-1">₹{feeLedger?.total_amount || 0}</h3>
            </div>
            <div className="glass-card p-5">
              <p className="text-xs text-slate-400 uppercase font-semibold">Amount Settled</p>
              <h3 className="text-xl font-bold text-green-400 mt-1">₹{feeLedger?.paid_amount || 0}</h3>
            </div>
            <div className="glass-card p-5 relative space-y-3">
              <div>
                <p className="text-xs text-slate-400 uppercase font-semibold">Pending Dues</p>
                <h3 className="text-xl font-bold text-amber-400 mt-1">₹{feeLedger?.pending_amount || 0}</h3>
              </div>
              {feeLedger?.pending_amount > 0 && (
                <div className="space-y-2 border-t border-slate-800/60 pt-3">
                  {digitalPaymentsEnabled ? (
                    <>
                      <div className="space-y-1">
                        <label className="text-[10px] font-semibold text-slate-400">Enter Amount to Pay (₹)</label>
                        <input
                          type="number"
                          placeholder="Amount"
                          value={payAmount}
                          onChange={e => setPayAmount(e.target.value)}
                          className="w-full glass-input py-1 px-2.5 text-xs h-8"
                          required
                        />
                      </div>
                      <button
                        onClick={handlePayFees}
                        className="btn-primary w-full py-1.5 text-[11px]"
                        disabled={loading}
                      >
                        Pay Fees Online
                      </button>
                    </>
                  ) : (
                    <p className="text-[10px] text-amber-300 font-medium bg-amber-500/10 p-2.5 rounded border border-amber-500/20">
                      Online payments are currently disabled. Please contact the administration.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="glass-card p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-200">Transaction History</h3>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-900/50">
                    <th className="table-header">Transaction ID</th>
                    <th className="table-header">Amount</th>
                    <th className="table-header">Channel</th>
                    <th className="table-header">Status</th>
                    <th className="table-header">Issued On</th>
                    <th className="table-header">Invoice</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map(txn => (
                    <tr key={txn.id} className="hover:bg-slate-900/20 transition-colors">
                      <td className="table-cell font-mono text-xs text-slate-400">{txn.transaction_id}</td>
                      <td className="table-cell font-semibold text-slate-200">₹{txn.amount}</td>
                      <td className="table-cell font-mono text-xs">{txn.payment_method}</td>
                      <td className="table-cell">
                        <span className={txn.payment_status === 'SUCCESS' ? 'badge-paid' : 'badge-pending'}>
                          {txn.payment_status}
                        </span>
                      </td>
                      <td className="table-cell text-xs text-slate-400">{new Date(txn.created_at).toLocaleDateString()}</td>
                      <td className="table-cell">
                        <button
                          onClick={() => alert(`Downloading mock Invoice PDF JSON data:\n${JSON.stringify(txn, null, 2)}`)}
                          className="text-xs text-primary-400 hover:underline flex items-center gap-1"
                        >
                          Invoice <Download className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* --- 7. CERTIFICATES TAB --- */}
      {activeTab === 'certificates' && (
        <div className="glass-card p-6 space-y-4">
          <h3 className="text-base font-bold text-slate-200">My Issued Certificates</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            {certificates.length === 0 ? (
              <div className="col-span-2 text-center text-slate-500 text-xs py-8">Complete your courses to earn certifications!</div>
            ) : (
              certificates.map(cert => (
                <div key={cert.id} className="bg-slate-900/30 p-5 rounded-xl border border-slate-800 flex flex-col md:flex-row gap-5 items-center">
                  <div className="bg-white p-2.5 rounded-lg">
                    <img src={cert.qr_code_url} alt="Verification QR" className="h-24 w-24" />
                  </div>
                  <div className="flex-1 text-center md:text-left space-y-2.5">
                    <span className="text-[10px] text-primary-400 font-bold bg-primary-600/10 border border-primary-500/20 px-2 py-0.5 rounded-full font-mono">{cert.certificate_id}</span>
                    <h4 className="font-bold text-slate-200 text-sm mt-1">{cert.courses?.course_name}</h4>
                    <p className="text-xs text-slate-400">Earned On: {cert.completion_date}</p>
                    
                    <div className="flex flex-wrap gap-2.5 pt-1 justify-center md:justify-start">
                      <button
                        onClick={() => setPreviewCert(cert)}
                        className="btn-primary py-1.5 px-3 text-xs flex items-center gap-1.5"
                      >
                        <Award className="h-4 w-4" /> View Certificate
                      </button>
                      <a
                        href={cert.verification_url}
                        target="_blank"
                        rel="noreferrer"
                        className="btn-secondary py-1.5 px-3 text-xs inline-flex items-center gap-1.5"
                      >
                        Registry Verification <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Certificate Preview Modal */}
      {previewCert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-overlay">
          <div className="relative w-full max-w-3xl bg-amber-50/95 text-amber-950 p-8 md:p-12 border-[16px] border-double border-amber-850 rounded-lg shadow-2xl space-y-6 text-center font-serif">
            <button 
              onClick={() => setPreviewCert(null)}
              className="absolute top-4 right-4 p-1.5 text-amber-900 hover:text-amber-700 bg-amber-200/50 rounded-full font-sans transition-colors cursor-pointer"
            >
              <span className="text-xs font-bold px-1.5">✕ Close</span>
            </button>

            <div className="space-y-1">
              <h2 className="text-2xl md:text-3xl font-extrabold tracking-widest text-amber-900">LMS</h2>
              <p className="text-[10px] md:text-xs tracking-wider uppercase font-sans text-amber-800 font-bold">Coding & Technology Training Institute</p>
            </div>

            <div className="space-y-1">
              <p className="text-[10px] font-sans tracking-widest text-amber-700 uppercase font-semibold">Certificate of Completion</p>
              <div className="h-0.5 bg-amber-800/60 w-20 mx-auto my-2"></div>
            </div>

            <p className="text-xs italic text-amber-900">This is proudly presented to</p>
            <h3 className="text-2xl md:text-3xl font-black text-amber-950 underline decoration-amber-800/30 decoration-wavy underline-offset-8 my-2 font-serif">
              {previewCert.students?.full_name}
            </h3>
            
            <p className="text-xs md:text-sm max-w-lg mx-auto leading-relaxed text-amber-900">
              for successfully completing the advanced training program in <strong className="font-extrabold text-amber-950">{previewCert.courses?.course_name}</strong> and satisfying all assessment metrics, project assignments, and laboratory examinations.
            </p>

            <div className="grid grid-cols-3 gap-4 pt-6 items-end">
              {/* Date and ID */}
              <div className="text-left space-y-1 font-sans text-[10px]">
                <p className="text-amber-850">Date of Issue: <strong className="text-amber-950 font-bold">{previewCert.completion_date}</strong></p>
                <p className="text-amber-850">Credential ID: <strong className="text-amber-950 font-mono font-bold">{previewCert.certificate_id}</strong></p>
              </div>

              {/* Verification QR */}
              <div className="flex flex-col items-center space-y-1 font-sans">
                <div className="bg-white p-1 border border-amber-900/10 shadow-md rounded-lg">
                  <img src={previewCert.qr_code_url} alt="Verification QR" className="h-16 w-16" />
                </div>
                <span className="text-[8px] text-amber-850 tracking-wider uppercase font-bold">Scan QR to Verify</span>
              </div>

              {/* Signature */}
              <div className="text-right space-y-1 font-sans text-[10px]">
                <p className="font-serif italic text-amber-900 text-xs font-bold">Anirudh Hatwar</p>
                <div className="h-px bg-amber-900/30 w-24 ml-auto my-0.5"></div>
                <span className="text-amber-850 font-bold uppercase text-[9px]">Institute Director</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- VIDEO PLAYER MODAL --- */}
      {activeVideo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-overlay">
          <div className="glass-card max-w-3xl w-full p-6 space-y-4 relative border-slate-800 shadow-2xl">
            <button
              onClick={() => setActiveVideo(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div className="flex items-center gap-2">
              <span className="text-[9px] bg-primary-600/20 text-primary-400 border border-primary-500/20 px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                Video Lesson
              </span>
              <h3 className="font-bold text-slate-100 text-base">{activeVideo.title}</h3>
            </div>
            {activeVideo.description && (
              <p className="text-xs text-slate-400 leading-relaxed">{activeVideo.description}</p>
            )}
            
            <div className="aspect-video w-full rounded-lg overflow-hidden bg-black border border-slate-800">
              {getVideoEmbedUrl(activeVideo.file_url) ? (
                <iframe
                  src={getVideoEmbedUrl(activeVideo.file_url)!}
                  className="w-full h-full"
                  allow="autoplay; fullscreen"
                  allowFullScreen
                  title={activeVideo.title}
                />
              ) : (
                <video
                  id="lms-custom-video-player"
                  src={activeVideo.file_url}
                  controls
                  className="w-full h-full bg-black"
                  autoPlay
                />
              )}
            </div>
            
            {/* Custom controls overlay for direct video streams */}
            {!getVideoEmbedUrl(activeVideo.file_url) && (
              <div className="flex flex-wrap justify-between items-center gap-3 bg-slate-900/60 p-3 rounded-lg border border-slate-800">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const video = document.getElementById('lms-custom-video-player') as HTMLVideoElement;
                      if (video) video.currentTime = Math.max(0, video.currentTime - 10);
                    }}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-[10px] font-bold rounded-lg text-slate-200 transition-colors"
                  >
                    -10s
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const video = document.getElementById('lms-custom-video-player') as HTMLVideoElement;
                      if (video) video.currentTime = Math.min(video.duration || 0, video.currentTime + 10);
                    }}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-[10px] font-bold rounded-lg text-slate-200 transition-colors"
                  >
                    +10s
                  </button>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-slate-400 font-semibold">Playback Speed:</span>
                  {[0.5, 1, 1.25, 1.5, 2].map((speed) => (
                    <button
                      key={speed}
                      type="button"
                      onClick={() => {
                        const video = document.getElementById('lms-custom-video-player') as HTMLVideoElement;
                        if (video) video.playbackRate = speed;
                      }}
                      className="px-2 py-1 bg-slate-800 hover:bg-primary-600 focus:bg-primary-600 active:bg-primary-600 text-[10px] font-bold rounded text-slate-200 transition-colors"
                    >
                      {speed}x
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const video = document.getElementById('lms-custom-video-player') as HTMLVideoElement;
                    if (video) {
                      if (video.requestFullscreen) {
                        video.requestFullscreen();
                      }
                    }
                  }}
                  className="px-3 py-1.5 bg-primary-600 hover:bg-primary-500 text-[10px] font-bold rounded-lg text-white transition-colors"
                >
                  Fullscreen
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- LIVE SESSIONS TAB --- */}
      {activeTab === 'live-sessions' && (
        <div className="space-y-6">
          {activeLiveSession ? (
            /* STUDENT LIVE CLASS ROOM / JOINED VIEW */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-8 space-y-6">
                {/* Back button and status */}
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => setActiveLiveSession(null)}
                    className="btn-secondary py-1.5 px-4 text-xs flex items-center gap-1.5"
                  >
                    &larr; Leave Session
                  </button>
                  <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full font-bold border ${
                    activeLiveSession.status === 'ACTIVE'
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                      : 'bg-slate-800/50 border-slate-700/50 text-slate-400'
                  }`}>
                    {activeLiveSession.status === 'ACTIVE' && <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping"></span>}
                    {activeLiveSession.status === 'ACTIVE' ? 'LIVE NOW' : activeLiveSession.status}
                  </span>
                </div>

                {/* Video player container */}
                <div className="glass-card overflow-hidden bg-slate-900/60 border border-slate-800/80">
                  <div className="p-4 bg-slate-950/40 border-b border-slate-800 flex justify-between items-center">
                    <div>
                      <h3 className="font-bold text-slate-200">{activeLiveSession.courses?.course_name}</h3>
                      <p className="text-xs text-slate-400">Instructed by {activeLiveSession.teachers?.full_name || 'Teacher'}</p>
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
                        <h4 className="font-bold text-slate-200 text-sm">Standard Live Session</h4>
                        <p className="text-xs text-slate-400">Click the button below to join the live session on Zoom, Teams, or Google Meet.</p>
                      </div>
                      {activeLiveSession.meeting_link && (
                        <a
                          href={activeLiveSession.meeting_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-primary inline-flex items-center gap-1.5 py-2 px-6 text-xs"
                        >
                          Launch Meeting link &rarr;
                        </a>
                      )}
                    </div>
                  )}

                  <div className="p-6 space-y-4">
                    {activeLiveSession.message && (
                      <div className="p-4 rounded-xl bg-slate-950/20 border border-slate-800/40 space-y-1">
                        <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wide">Note from Teacher</h5>
                        <p className="text-sm text-slate-300">{activeLiveSession.message}</p>
                      </div>
                    )}

                    {/* Action Bar (Raise Hand) */}
                    {activeLiveSession.raise_hand_enabled && (
                      <div className="border-t border-slate-800/50 pt-4 flex justify-between items-center">
                        <p className="text-xs text-slate-400">Having a doubt? Use the raise hand feature to let the teacher know.</p>
                        <button
                          onClick={handleRaiseHand}
                          disabled={hasRaisedHand}
                          className={`btn-primary py-2 px-6 text-xs flex items-center gap-2 font-bold ${
                            hasRaisedHand
                              ? 'bg-rose-500/20 border border-rose-500/30 text-rose-400 hover:bg-rose-500/20 cursor-default'
                              : 'bg-rose-600 hover:bg-rose-500'
                          }`}
                        >
                          <Hand className={`h-4 w-4 ${hasRaisedHand ? '' : 'animate-bounce'}`} />
                          {hasRaisedHand ? 'Hand Raised' : 'Raise Hand'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Chat Sidebar */}
              <div className="lg:col-span-4 flex flex-col h-[70vh] glass-card bg-slate-900/60 border border-slate-800/80 overflow-hidden">
                <div className="p-3.5 bg-slate-950/40 border-b border-slate-800 flex items-center gap-1.5">
                  <MessageSquare className="h-4 w-4 text-primary-400" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">Live Doubt Chat</h4>
                </div>

                <div className="flex-1 flex flex-col min-h-0 bg-slate-950/10">
                  {!activeLiveSession.chat_enabled ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500 space-y-2">
                      <MessageSquare className="h-8 w-8 opacity-40 text-slate-400" />
                      <p className="text-xs">Live chat has been disabled by the teacher.</p>
                    </div>
                  ) : (
                    <>
                      <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {liveChatMessages.length === 0 ? (
                          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500 space-y-1">
                            <p className="text-xs">No questions or messages yet. Ask a doubt!</p>
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
                              placeholder="Type your question/doubt..."
                              value={chatInputText}
                              onChange={e => setChatInputText(e.target.value)}
                              className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-slate-200 text-xs focus:outline-none focus:border-primary-500/50"
                            />

                            {activeLiveSession.voice_enabled !== false && (
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
                              disabled={!chatInputText.trim()}
                              className="btn-primary py-2 px-3 rounded-xl flex items-center justify-center"
                            >
                              <Send className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </form>
                    </>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* LIVE SESSIONS LIST VIEW */
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-bold text-slate-200">Live Classes & Lectures</h3>
                <p className="text-xs text-slate-400 mt-0.5">Join scheduled live sessions and interact directly with your teachers.</p>
              </div>

              <div className="glass-card overflow-hidden">
                {liveSessions.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 text-xs">No live sessions scheduled for your batches currently. Check back later!</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b border-slate-800 bg-slate-900/10">
                          <th className="table-header text-left pl-6">Course & Batch</th>
                          <th className="table-header text-left">Teacher</th>
                          <th className="table-header text-left">Description</th>
                          <th className="table-header text-left">Session Type</th>
                          <th className="table-header text-left">Scheduled Time</th>
                          <th className="table-header text-left">Status</th>
                          <th className="table-header text-right pr-6">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {liveSessions.map((session) => (
                          <tr key={session.id} className="border-b border-slate-800/40 hover:bg-slate-900/10 transition-colors">
                            <td className="table-cell pl-6">
                              <p className="font-bold text-slate-200 text-xs">{session.courses?.course_name}</p>
                              <p className="text-[10px] text-slate-400">{session.batches?.batch_name}</p>
                            </td>
                            <td className="table-cell text-xs text-slate-300">
                              {session.teachers?.full_name || 'Instructor'}
                            </td>
                            <td className="table-cell text-xs text-slate-400 truncate max-w-[200px]">
                              {session.message || 'No description'}
                            </td>
                            <td className="table-cell text-xs text-slate-300">
                              {session.session_type === 'LIVE' ? 'Standard Live Class' : 'Recorded Lecture'}
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
                            <td className="table-cell text-right pr-6">
                              {session.status === 'ACTIVE' ? (
                                <button
                                  onClick={() => setActiveLiveSession(session)}
                                  className="btn-primary py-1 px-4 text-[10px]"
                                >
                                  Join Session
                                </button>
                              ) : session.status === 'SCHEDULED' ? (
                                <button
                                  disabled
                                  className="btn-secondary py-1 px-4 text-[10px] opacity-40 cursor-default"
                                >
                                  Upcoming
                                </button>
                              ) : (
                                <span className="text-[10px] text-slate-500 italic mr-2">Finished</span>
                              )}
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

export default StudentDashboard;
