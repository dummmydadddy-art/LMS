import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import {
  BookOpen,
  Calendar,
  Users,
  GraduationCap,
  CreditCard,
  Award,
  Plus,
  Trash2,
  Edit3,
  DollarSign,
  Briefcase,
  Layers,
  Search,
  CheckCircle,
  XCircle,
  FileSpreadsheet,
  Bell,
  Megaphone
} from 'lucide-react';

const AdminDashboard: React.FC = () => {
  const { tab } = useParams();
  const navigate = useNavigate();
  const activeTab = tab || 'summary';
  const [summaryData, setSummaryData] = useState<any>({
    total_students: 0,
    total_courses: 0,
    total_exams: 0,
    revenue: { collected: 0, pending: 0 }
  });

  // State arrays
  const [courses, setCourses] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [feeRecords, setFeeRecords] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [certificates, setCertificates] = useState<any[]>([]);
  const [timetable, setTimetable] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);

  // Search filters
  const [searchTerm, setSearchTerm] = useState('');

  // Form states
  const [courseForm, setCourseForm] = useState({ id: '', course_name: '', course_code: '', course_description: '', duration: '', fees: '', teacher_id: '', certificate_enabled: true, status: 'ACTIVE' });
  const [batchForm, setBatchForm] = useState({ id: '', batch_name: '', course_id: '', teacher_id: '', start_date: '', end_date: '', batch_timing: '', status: 'ACTIVE' });
  const [teacherForm, setTeacherForm] = useState({ id: '', email: '', password: '', full_name: '', mobile_number: '', course_ids: [] as string[], batch_ids: [] as string[] });
  const [studentForm, setStudentForm] = useState({ id: '', email: '', password: '', full_name: '', mobile_number: '', address: '', fee_amount: '', course_id: '', batch_id: '' });
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

  const [feePaymentForm, setFeePaymentForm] = useState({ student_id: '', amount: '', payment_method: 'CASH' });
  const [feeOverrideForm, setFeeOverrideForm] = useState({ student_id: '', fee_amount: '' });
  const [feeRequestForm, setFeeRequestForm] = useState({ amount: '', due_date: '', target_type: 'INDIVIDUAL', target_id: '' });
  const [notificationForm, setNotificationForm] = useState({ title: '', message: '', target_type: 'ALL', target_id: '', notification_type: 'ANNOUNCEMENT' });
  const [certificateForm, setCertificateForm] = useState({ student_id: '', course_id: '', completion_date: '' });
  const [digitalPaymentsEnabled, setDigitalPaymentsEnabled] = useState<boolean>(true);

  // UI status
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [showForm, setShowForm] = useState(false);

  // Timetable view filtering states
  const [filterCourseId, setFilterCourseId] = useState('');
  const [filterBatchId, setFilterBatchId] = useState('');

  // Fee details modal state
  const [feeModalType, setFeeModalType] = useState<'collected' | 'pending' | null>(null);

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

  // CSV Export & Download Helpers
  const triggerCSVDownload = (filename: string, headers: string[], rows: any[][]) => {
    const csvContent = [
      headers.join(','),
      ...rows.map(row => 
        row.map(val => {
          const str = String(val ?? '').replace(/"/g, '""');
          return str.includes(',') || str.includes('\n') || str.includes('"') ? `"${str}"` : str;
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadStudentEnrolmentsReport = () => {
    const headers = ['Student ID', 'Full Name', 'Email', 'Mobile Number', 'Course', 'Batch', 'Admission Date', 'Status'];
    const rows = students.map(s => [
      s.id,
      s.full_name,
      s.email,
      s.mobile_number || 'N/A',
      s.course_name || 'N/A',
      s.batch_name || 'N/A',
      s.admission_date || 'N/A',
      s.status || 'ACTIVE'
    ]);
    triggerCSVDownload('student_enrolments.csv', headers, rows);
    setMsg('Student enrolments report downloaded successfully!');
  };

  const downloadCollectionFeesLedger = () => {
    const headers = ['Student ID', 'Full Name', 'Email', 'Course', 'Batch', 'Total Fees (INR)', 'Paid Amount (INR)', 'Outstanding Amount (INR)', 'Dues Status'];
    const rows = students.map(s => {
      const status = Number(s.fee_pending || 0) <= 0.01 ? 'PAID' : (Number(s.fee_paid || 0) > 0 ? 'PARTIAL' : 'PENDING');
      return [
        s.id,
        s.full_name,
        s.email,
        s.course_name || 'N/A',
        s.batch_name || 'N/A',
        s.fee_amount || 0,
        s.fee_paid || 0,
        s.fee_pending || 0,
        status
      ];
    });
    triggerCSVDownload('collection_and_fees_ledger.csv', headers, rows);
    setMsg('Collection and fees ledger report downloaded successfully!');
  };

  const downloadAttendanceSummaries = async () => {
    setLoading(true);
    setMsg('Generating attendance report...');
    try {
      const results = await Promise.all(
        batches.map(b => api.get(`/api/attendance?batch_id=${b.id}`).catch(() => null))
      );
      
      const attendanceData: any[] = [];
      results.forEach(res => {
        if (res?.data?.success && res.data.attendance) {
          attendanceData.push(...res.data.attendance);
        }
      });

      const headers = ['Student ID', 'Student Name', 'Email', 'Course', 'Batch', 'Total Classes', 'Present', 'Absent', 'Attendance Rate (%)'];
      const rows = students.map(s => {
        const studentAtt = attendanceData.filter(a => a.student_id === s.id);
        const total = studentAtt.length;
        const presents = studentAtt.filter(a => a.status === 'PRESENT').length;
        const absents = total - presents;
        const rate = total > 0 ? Math.round((presents / total) * 100) : 100;
        return [
          s.id,
          s.full_name,
          s.email,
          s.course_name || 'N/A',
          s.batch_name || 'N/A',
          total,
          presents,
          absents,
          `${rate}%`
        ];
      });

      triggerCSVDownload('attendance_summaries.csv', headers, rows);
      setMsg('Attendance summaries report downloaded successfully!');
    } catch (err) {
      console.error(err);
      setMsg('Failed to generate attendance report');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
    fetchCourses();
    fetchBatches();
    fetchTeachers();
    fetchStudents();
    fetchFees();
    fetchCertificates();
    fetchTimetable();
    fetchNotifications();
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await api.get('/api/settings');
      if (res.data?.success && res.data.settings) {
        setDigitalPaymentsEnabled(!!res.data.settings.digital_payment_enabled);
      }
    } catch {}
  };

  const handleToggleDigitalPayments = async () => {
    setLoading(true);
    const newValue = !digitalPaymentsEnabled;
    try {
      const res = await api.post('/api/settings', {
        digital_payment_enabled: newValue
      });
      if (res.data?.success) {
        setDigitalPaymentsEnabled(newValue);
        setMsg(`Digital payments globally ${newValue ? 'enabled' : 'disabled'}.`);
      } else {
        setMsg('Failed to update payment settings.');
      }
    } catch (err) {
      console.error(err);
      setMsg('Error saving payment settings.');
    } finally {
      setLoading(false);
    }
  };

  const fetchSummary = async () => {
    try {
      const res = await api.get('/api/reports?type=summary');
      if (res.data?.success) setSummaryData(res.data.summary);
    } catch {}
  };

  const fetchCourses = async () => {
    try {
      const res = await api.get('/api/courses');
      if (res.data?.success) setCourses(res.data.courses || []);
    } catch {}
  };

  const fetchBatches = async () => {
    try {
      const res = await api.get('/api/batches');
      if (res.data?.success) setBatches(res.data.batches || []);
    } catch {}
  };

  const fetchTeachers = async () => {
    try {
      const res = await api.get('/api/users/teachers');
      if (res.data?.success) setTeachers(res.data.teachers || []);
    } catch {}
  };

  const fetchStudents = async () => {
    try {
      const res = await api.get('/api/users/students');
      if (res.data?.success) setStudents(res.data.students || []);
    } catch {}
  };

  const getGroupedStudents = () => {
    const grouped: Record<string, {
      courseName: string;
      batches: Record<string, {
        batchName: string;
        students: any[];
      }>;
    }> = {};

    students
      .filter(s => s.status !== 'INACTIVE')
      .filter(s => s.full_name.toLowerCase().includes(searchTerm.toLowerCase()) || s.id.toLowerCase().includes(searchTerm.toLowerCase()))
      .forEach(s => {
        const courseId = s.course_id || 'unassigned-course';
        const courseName = s.course_name || 'Unassigned Course';
        const batchId = s.batch_id || 'unassigned-batch';
        const batchName = s.batch_name || 'Unassigned Batch';

        if (!grouped[courseId]) {
          grouped[courseId] = {
            courseName,
            batches: {}
          };
        }

        if (!grouped[courseId].batches[batchId]) {
          grouped[courseId].batches[batchId] = {
            batchName,
            students: []
          };
        }

        grouped[courseId].batches[batchId].students.push(s);
      });

    return grouped;
  };

  const fetchFees = async () => {
    try {
      const res = await api.get('/api/fees');
      if (res.data?.success) {
        setFeeRecords(res.data.ledgers || []);
        setTransactions(res.data.transactions || []);
      }
    } catch {}
  };

  const fetchCertificates = async () => {
    try {
      const res = await api.get('/api/certificates');
      if (res.data?.success) setCertificates(res.data.certificates || []);
    } catch {}
  };

  const fetchTimetable = async () => {
    try {
      const res = await api.get('/api/timetable');
      if (res.data?.success) setTimetable(res.data.timetable || []);
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

  // COURSE SUBMIT
  const handleCourseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      let res;
      if (courseForm.id) {
        res = await api.put(`/api/courses/${courseForm.id}`, courseForm);
      } else {
        res = await api.post('/api/courses', courseForm);
      }
      if (res.data?.success) {
        setMsg(courseForm.id ? 'Course updated!' : 'Course created!');
        fetchCourses();
        setShowForm(false);
        setCourseForm({ id: '', course_name: '', course_code: '', course_description: '', duration: '', fees: '', teacher_id: '', certificate_enabled: true, status: 'ACTIVE' });
      } else {
        setMsg('Error: ' + res.data?.error);
      }
    } catch {
      setMsg('Failed to submit course');
    } finally {
      setLoading(false);
    }
  };

  const handleCourseDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this course?')) return;
    try {
      const res = await api.delete(`/api/courses/${id}`);
      if (res.data?.success) {
        setMsg('Course deleted!');
        fetchCourses();
      }
    } catch {}
  };

  // BATCH SUBMIT
  const handleBatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      let res;
      if (batchForm.id) {
        res = await api.put(`/api/batches/${batchForm.id}`, batchForm);
      } else {
        res = await api.post('/api/batches', batchForm);
      }
      if (res.data?.success) {
        setMsg(batchForm.id ? 'Batch updated!' : 'Batch created!');
        fetchBatches();
        setShowForm(false);
        setBatchForm({ id: '', batch_name: '', course_id: '', teacher_id: '', start_date: '', end_date: '', batch_timing: '', status: 'ACTIVE' });
      } else {
        setMsg('Error: ' + res.data?.error);
      }
    } catch {
      setMsg('Failed to submit batch');
    } finally {
      setLoading(false);
    }
  };

  const handleBatchDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this batch?')) return;
    try {
      const res = await api.delete(`/api/batches/${id}`);
      if (res.data?.success) {
        setMsg('Batch deleted!');
        fetchBatches();
      }
    } catch {}
  };

  // TEACHER SUBMIT
  const handleTeacherSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      let res;
      if (teacherForm.id) {
        res = await api.put(`/api/users/teachers/${teacherForm.id}`, teacherForm);
      } else {
        res = await api.post('/api/users/teachers', teacherForm);
      }
      if (res.data?.success) {
        setMsg(teacherForm.id ? 'Teacher updated successfully!' : 'Teacher added successfully!');
        fetchTeachers();
        setShowForm(false);
        setTeacherForm({ id: '', email: '', password: '', full_name: '', mobile_number: '', course_ids: [], batch_ids: [] });
      } else {
        setMsg('Error: ' + res.data?.error);
      }
    } catch {
      setMsg('Failed to add teacher');
    } finally {
      setLoading(false);
    }
  };

  // STUDENT SUBMIT
  const handleStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      let res;
      if (studentForm.id) {
        res = await api.put(`/api/users/students/${studentForm.id}`, studentForm);
      } else {
        res = await api.post('/api/users/students', studentForm);
      }
      if (res.data?.success) {
        setMsg(studentForm.id ? 'Student updated successfully!' : 'Student enrolled successfully!');
        fetchStudents();
        fetchSummary();
        setShowForm(false);
        setStudentForm({ id: '', email: '', password: '', full_name: '', mobile_number: '', address: '', fee_amount: '', course_id: '', batch_id: '' });
      } else {
        setMsg('Error: ' + res.data?.error);
      }
    } catch {
      setMsg('Failed to enroll student');
    } finally {
      setLoading(false);
    }
  };

  // FEES SUBMIT
  const handleFeePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post('/api/fees/pay', feePaymentForm);
      if (res.data?.success) {
        setMsg('Payment logged successfully!');
        fetchFees();
        fetchStudents();
        fetchSummary();
        setFeePaymentForm({ student_id: '', amount: '', payment_method: 'CASH' });
      } else {
        setMsg('Error logging payment');
      }
    } catch {
      setMsg('Failed to log payment');
    } finally {
      setLoading(false);
    }
  };

  const handleFeeOverrideSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post('/api/fees/override', feeOverrideForm);
      if (res.data?.success) {
        setMsg('Student fee override updated!');
        fetchFees();
        fetchStudents();
        fetchSummary();
        setFeeOverrideForm({ student_id: '', fee_amount: '' });
      } else {
        setMsg('Error updating override');
      }
    } catch {
      setMsg('Failed to override fee');
    } finally {
      setLoading(false);
    }
  };

  const handleFeeRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post('/api/fees/request', feeRequestForm);
      if (res.data?.success) {
        setMsg(res.data.message || 'Fee request sent successfully!');
        fetchFees();
        fetchStudents();
        fetchSummary();
        setFeeRequestForm({ amount: '', due_date: '', target_type: 'INDIVIDUAL', target_id: '' });
      } else {
        setMsg('Error sending fee request: ' + (res.data?.error || 'Unknown error'));
      }
    } catch (err: any) {
      setMsg('Failed to send fee request');
    } finally {
      setLoading(false);
    }
  };

  // TIMETABLE SUBMIT
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

  // CERTIFICATE GENERATION & BROADCAST
  const handleCertificateFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post('/api/certificates', certificateForm);
      if (res.data?.success) {
        setMsg('Certificate issued successfully!');
        fetchCertificates();
        setShowForm(false);
        setCertificateForm({ student_id: '', course_id: '', completion_date: '' });
      } else {
        setMsg('Error: ' + res.data?.error);
      }
    } catch {
      setMsg('Failed to issue certificate');
    } finally {
      setLoading(false);
    }
  };

  const handleUnissueCertificate = async (id: string) => {
    if (!confirm('Are you sure you want to unissue this certificate? This action is permanent.')) return;
    setLoading(true);
    try {
      const res = await api.delete(`/api/certificates/${id}`);
      if (res.data?.success) {
        setMsg('Certificate unissued successfully!');
        fetchCertificates();
      } else {
        setMsg('Error: ' + res.data?.error);
      }
    } catch {
      setMsg('Failed to unissue certificate');
    } finally {
      setLoading(false);
    }
  };

  // USER DELETE
  const handleDeleteUser = async (userId: string, name: string) => {
    if (!confirm(`Are you sure you want to permanently delete ${name}? This action cannot be undone.`)) return;
    setLoading(true);
    try {
      const res = await api.delete(`/api/users/${userId}`);
      if (res.data?.success) {
        setMsg(`${name} has been deleted successfully.`);
        fetchStudents();
        fetchTeachers();
        fetchSummary();
      } else {
        setMsg('Failed to delete user: ' + res.data?.error);
      }
    } catch (err: any) {
      console.error(err);
      setMsg('Error deleting user.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Navigation tabs */}
      <div className="flex border-b border-slate-800 overflow-x-auto pb-1 gap-1">
        {['summary', 'courses', 'batches', 'teachers', 'students', 'fees', 'timetable', 'certificates', 'notifications', 'reports'].map((tabName) => (
          <button
            key={tabName}
            onClick={() => {
              navigate('/admin/' + tabName);
              setMsg('');
              setShowForm(false);
            }}
            className={`px-4 py-2 text-sm font-semibold capitalize whitespace-nowrap rounded-t-lg transition-colors ${
              activeTab === tabName
                ? 'border-b-2 border-primary-500 text-primary-400 bg-slate-900/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {tabName.replace('_', ' ')}
          </button>
        ))}
      </div>

      {msg && (
        <div className="bg-primary-950/40 border border-primary-500/20 text-primary-400 px-4 py-3 rounded-xl text-sm max-w-lg text-center mx-auto">
          {msg}
        </div>
      )}

      {/* --- 1. SUMMARY TAB --- */}
      {activeTab === 'summary' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="glass-card p-6 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400 uppercase font-semibold">Total Students</p>
                <h3 className="text-2xl font-bold text-slate-100 mt-1">{summaryData.total_students}</h3>
              </div>
              <div className="h-12 w-12 rounded-xl bg-primary-600/10 flex items-center justify-center text-primary-400 border border-primary-600/20">
                <Users className="h-6 w-6" />
              </div>
            </div>

            <div onClick={() => setFeeModalType('collected')} className="glass-card p-6 flex items-center justify-between cursor-pointer hover:border-green-500/50 hover:bg-green-500/5 transition-all">
              <div>
                <p className="text-xs text-slate-400 uppercase font-semibold">Revenue Collected</p>
                <h3 className="text-2xl font-bold text-green-400 mt-1">₹{summaryData.revenue?.collected || 0}</h3>
              </div>
              <div className="h-12 w-12 rounded-xl bg-green-500/10 flex items-center justify-center text-green-400 border border-green-500/20">
                <DollarSign className="h-6 w-6" />
              </div>
            </div>

            <div onClick={() => setFeeModalType('pending')} className="glass-card p-6 flex items-center justify-between cursor-pointer hover:border-amber-500/50 hover:bg-amber-500/5 transition-all">
              <div>
                <p className="text-xs text-slate-400 uppercase font-semibold">Fees Outstanding</p>
                <h3 className="text-2xl font-bold text-amber-400 mt-1">₹{summaryData.revenue?.pending || 0}</h3>
              </div>
              <div className="h-12 w-12 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400 border border-amber-500/20">
                <CreditCard className="h-6 w-6" />
              </div>
            </div>

            <div className="glass-card p-6 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400 uppercase font-semibold">Total Courses</p>
                <h3 className="text-2xl font-bold text-purple-400 mt-1">{summaryData.total_courses}</h3>
              </div>
              <div className="h-12 w-12 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400 border border-purple-500/20">
                <BookOpen className="h-6 w-6" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Quick Actions */}
            <div className="glass-card p-6">
              <h3 className="text-base font-bold text-slate-200 mb-4">Quick Operations</h3>
              <div className="grid grid-cols-2 gap-4">
                <button onClick={() => { navigate('/admin/courses'); setShowForm(true); }} className="btn-secondary py-3 flex flex-col items-center justify-center gap-2">
                  <BookOpen className="h-5 w-5 text-primary-400" />
                  <span>Create Course</span>
                </button>
                <button onClick={() => { navigate('/admin/batches'); setShowForm(true); }} className="btn-secondary py-3 flex flex-col items-center justify-center gap-2">
                  <Layers className="h-5 w-5 text-purple-400" />
                  <span>Create Batch</span>
                </button>
                <button onClick={() => { navigate('/admin/students'); setShowForm(true); }} className="btn-secondary py-3 flex flex-col items-center justify-center gap-2">
                  <Users className="h-5 w-5 text-green-400" />
                  <span>Enroll Student</span>
                </button>
                <button onClick={() => { navigate('/admin/teachers'); setShowForm(true); }} className="btn-secondary py-3 flex flex-col items-center justify-center gap-2">
                  <GraduationCap className="h-5 w-5 text-amber-400" />
                  <span>Add Teacher</span>
                </button>
              </div>
            </div>

            {/* Timetable peek */}
            <div className="glass-card p-6">
              <h3 className="text-base font-bold text-slate-200 mb-4">Timetable Schedule</h3>
              <div className="space-y-3 max-h-56 overflow-y-auto">
                {timetable.length === 0 ? (
                  <p className="text-slate-500 text-xs text-center py-8">No timetable scheduled.</p>
                ) : (
                  timetable.map((item) => (
                    <div key={item.id} className="flex justify-between items-center bg-slate-800/20 p-3 rounded-xl border border-slate-800/40">
                      <div>
                        <p className="text-xs font-semibold text-slate-200">{item.topic}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{item.batches?.batch_name} | {item.courses?.course_name}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-bold text-primary-400">{item.day_of_week}</span>
                        <p className="text-[10px] text-slate-500">{item.start_time.substring(0,5)} - {item.end_time.substring(0,5)}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- 2. COURSES TAB --- */}
      {activeTab === 'courses' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-base font-bold text-slate-200">Manage Course Listings</h3>
            {!showForm && (
              <button onClick={() => { setShowForm(true); setCourseForm({ id: '', course_name: '', course_code: '', course_description: '', duration: '', fees: '', teacher_id: '', certificate_enabled: true, status: 'ACTIVE' }); }} className="btn-primary flex items-center gap-2 py-2 text-xs">
                <Plus className="h-4 w-4" /> Add Course
              </button>
            )}
          </div>

          {showForm && (
            <form onSubmit={handleCourseSubmit} className="glass-card p-6 max-w-xl mx-auto space-y-4">
              <h4 className="font-bold text-sm text-slate-200">{courseForm.id ? 'Edit Course' : 'Create Course'}</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400 uppercase">Course Name</label>
                  <input type="text" placeholder="e.g. Full Stack Web Development" value={courseForm.course_name} onChange={e => setCourseForm({...courseForm, course_name: e.target.value})} className="w-full glass-input" required />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400 uppercase">Course Code</label>
                  <input type="text" placeholder="e.g. FSWD-01" value={courseForm.course_code} onChange={e => setCourseForm({...courseForm, course_code: e.target.value})} className="w-full glass-input" required />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400 uppercase">Duration</label>
                  <input type="text" placeholder="e.g. 6 Months" value={courseForm.duration} onChange={e => setCourseForm({...courseForm, duration: e.target.value})} className="w-full glass-input" required />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400 uppercase">Fees (INR)</label>
                  <input type="number" placeholder="e.g. 45000" value={courseForm.fees} onChange={e => setCourseForm({...courseForm, fees: e.target.value})} className="w-full glass-input" required />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400 uppercase">Assigned Teacher</label>
                  <select value={courseForm.teacher_id} onChange={e => setCourseForm({...courseForm, teacher_id: e.target.value})} className="w-full glass-input bg-dark-900">
                    <option value="">Select Teacher</option>
                    {teachers.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5 flex items-center mt-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={courseForm.certificate_enabled} onChange={e => setCourseForm({...courseForm, certificate_enabled: e.target.checked})} className="rounded bg-dark-950 border-slate-800" />
                    <span className="text-xs font-semibold text-slate-400 uppercase">Enable Certificate</span>
                  </label>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase">Description</label>
                <textarea rows={3} placeholder="Course summary..." value={courseForm.course_description} onChange={e => setCourseForm({...courseForm, course_description: e.target.value})} className="w-full glass-input" />
              </div>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary py-2 text-xs">Cancel</button>
                <button type="submit" className="btn-primary py-2 text-xs" disabled={loading}>Save Course</button>
              </div>
            </form>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map(course => (
              <div key={course.id} className="glass-card p-5 space-y-4 relative">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] bg-primary-600/20 text-primary-400 border border-primary-600/30 px-2 py-0.5 rounded font-mono font-bold uppercase">{course.course_code}</span>
                    <h4 className="font-bold text-slate-100 text-base mt-2">{course.course_name}</h4>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => { setCourseForm(course); setShowForm(true); }} className="text-slate-400 hover:text-slate-900"><Edit3 className="h-4 w-4" /></button>
                    <button onClick={() => handleCourseDelete(course.id)} className="text-red-400 hover:text-red-300"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>
                <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed">{course.course_description || 'No description provided.'}</p>
                <div className="flex justify-between text-xs pt-3 border-t border-slate-800/80 text-slate-400">
                  <span>Duration: <strong className="text-slate-200">{course.duration}</strong></span>
                  <span>Fees: <strong className="text-slate-200">₹{course.fees}</strong></span>
                </div>
                <p className="text-xs text-slate-500">Teacher: <strong className="text-slate-300">{course.teachers?.full_name || 'Not assigned'}</strong></p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --- 3. BATCHES TAB --- */}
      {activeTab === 'batches' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-base font-bold text-slate-200">Batch Scheduling</h3>
            {!showForm && (
              <button onClick={() => { setShowForm(true); setBatchForm({ id: '', batch_name: '', course_id: '', teacher_id: '', start_date: '', end_date: '', batch_timing: '', status: 'ACTIVE' }); }} className="btn-primary flex items-center gap-2 py-2 text-xs">
                <Plus className="h-4 w-4" /> Add Batch
              </button>
            )}
          </div>

          {showForm && (
            <form onSubmit={handleBatchSubmit} className="glass-card p-6 max-w-xl mx-auto space-y-4">
              <h4 className="font-bold text-sm text-slate-200">{batchForm.id ? 'Edit Batch' : 'Create Batch'}</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400 uppercase">Batch Name</label>
                  <input type="text" placeholder="e.g. Batch A (Morning)" value={batchForm.batch_name} onChange={e => setBatchForm({...batchForm, batch_name: e.target.value})} className="w-full glass-input" required />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400 uppercase">Associated Course</label>
                  <select value={batchForm.course_id} onChange={e => setBatchForm({...batchForm, course_id: e.target.value})} className="w-full glass-input bg-dark-900" required>
                    <option value="">Select Course</option>
                    {courses.map(c => <option key={c.id} value={c.id}>{c.course_name}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400 uppercase">Assigned Instructor</label>
                  <select value={batchForm.teacher_id} onChange={e => setBatchForm({...batchForm, teacher_id: e.target.value})} className="w-full glass-input bg-dark-900">
                    <option value="">Select Teacher</option>
                    {teachers.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400 uppercase">Daily Timings</label>
                  <input type="text" placeholder="e.g. 9:00 AM - 11:30 AM" value={batchForm.batch_timing} onChange={e => setBatchForm({...batchForm, batch_timing: e.target.value})} className="w-full glass-input" required />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400 uppercase">Start Date</label>
                  <input type="date" value={batchForm.start_date} onChange={e => setBatchForm({...batchForm, start_date: e.target.value})} className="w-full glass-input" required />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400 uppercase">End Date</label>
                  <input type="date" value={batchForm.end_date} onChange={e => setBatchForm({...batchForm, end_date: e.target.value})} className="w-full glass-input" required />
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary py-2 text-xs">Cancel</button>
                <button type="submit" className="btn-primary py-2 text-xs" disabled={loading}>Save Batch</button>
              </div>
            </form>
          )}

          <div className="glass-card overflow-hidden">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-900/50">
                  <th className="table-header">Batch Name</th>
                  <th className="table-header">Course</th>
                  <th className="table-header">Instructor</th>
                  <th className="table-header">Timings</th>
                  <th className="table-header">Schedule</th>
                  <th className="table-header">Actions</th>
                </tr>
              </thead>
              <tbody>
                {batches.map(batch => (
                  <tr key={batch.id} className="hover:bg-slate-900/20 transition-colors">
                    <td className="table-cell font-bold text-slate-200">{batch.batch_name}</td>
                    <td className="table-cell">{batch.courses?.course_name}</td>
                    <td className="table-cell">{batch.teachers?.full_name || 'Unassigned'}</td>
                    <td className="table-cell">{batch.batch_timing}</td>
                    <td className="table-cell text-xs text-slate-400">{batch.start_date} to {batch.end_date}</td>
                    <td className="table-cell">
                      <div className="flex gap-3">
                        <button onClick={() => { setBatchForm(batch); setShowForm(true); }} className="text-slate-400 hover:text-slate-900"><Edit3 className="h-4.5 w-4.5" /></button>
                        <button onClick={() => handleBatchDelete(batch.id)} className="text-red-400 hover:text-red-300"><Trash2 className="h-4.5 w-4.5" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- 4. TEACHERS TAB --- */}
      {activeTab === 'teachers' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-base font-bold text-slate-200">Instructor Profiles</h3>
            {!showForm && (
              <button onClick={() => { setShowForm(true); setTeacherForm({ id: '', email: '', password: '', full_name: '', mobile_number: '', course_ids: [], batch_ids: [] }); }} className="btn-primary flex items-center gap-2 py-2 text-xs">
                <Plus className="h-4 w-4" /> Add Teacher
              </button>
            )}
          </div>

          {showForm && (
            <form onSubmit={handleTeacherSubmit} className="glass-card p-6 max-w-md mx-auto space-y-4">
              <h4 className="font-bold text-sm text-slate-200">{teacherForm.id ? 'Modify Instructor Profile' : 'Onboard New Instructor'}</h4>
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400">Full Name</label>
                  <input type="text" placeholder="John Doe" value={teacherForm.full_name} onChange={e => setTeacherForm({...teacherForm, full_name: e.target.value})} className="w-full glass-input" required />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400">Email Address</label>
                  <input type="email" placeholder="john@lms.com" value={teacherForm.email} onChange={e => setTeacherForm({...teacherForm, email: e.target.value})} className="w-full glass-input" required />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400">Password {teacherForm.id && '(Optional)'}</label>
                  <input type="password" placeholder={teacherForm.id ? "Leave blank to keep same" : "Password123"} value={teacherForm.password} onChange={e => setTeacherForm({...teacherForm, password: e.target.value})} className="w-full glass-input" required={!teacherForm.id} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400">Mobile Number</label>
                  <input type="text" placeholder="9876543210" value={teacherForm.mobile_number} onChange={e => setTeacherForm({...teacherForm, mobile_number: e.target.value})} className="w-full glass-input" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400">Assign Courses (Ctrl + click to select multiple)</label>
                  <select
                    multiple
                    value={teacherForm.course_ids}
                    onChange={e => {
                      const selected = Array.from(e.target.selectedOptions, option => option.value);
                      setTeacherForm({...teacherForm, course_ids: selected});
                    }}
                    className="w-full glass-input bg-dark-900 h-24"
                  >
                    {courses.map(c => <option key={c.id} value={c.id}>{c.course_name}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400">Assign Batches (Ctrl + click to select multiple)</label>
                  <select
                    multiple
                    value={teacherForm.batch_ids}
                    onChange={e => {
                      const selected = Array.from(e.target.selectedOptions, option => option.value);
                      setTeacherForm({...teacherForm, batch_ids: selected});
                    }}
                    className="w-full glass-input bg-dark-900 h-24"
                  >
                    {batches.map(b => <option key={b.id} value={b.id}>{b.batch_name}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-4">
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary py-2 text-xs">Cancel</button>
                <button type="submit" className="btn-primary py-2 text-xs" disabled={loading}>{teacherForm.id ? 'Update Instructor' : 'Add Instructor'}</button>
              </div>
            </form>
          )}

          <div className="glass-card overflow-hidden">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-900/50">
                  <th className="table-header">Name</th>
                  <th className="table-header">Email</th>
                  <th className="table-header">Contact</th>
                  <th className="table-header">Actions</th>
                </tr>
              </thead>
              <tbody>
                {teachers.map(t => (
                  <tr key={t.id} className="hover:bg-slate-900/20 transition-colors">
                    <td className="table-cell font-bold text-slate-200">{t.full_name}</td>
                    <td className="table-cell">{t.email}</td>
                    <td className="table-cell">{t.mobile_number || 'N/A'}</td>
                    <td className="table-cell">
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            const assignedCourses = courses.filter(c => c.teacher_id === t.id).map(c => c.id);
                            const assignedBatches = batches.filter(b => b.teacher_id === t.id).map(b => b.id);
                            setTeacherForm({
                              id: t.id,
                              email: t.email,
                              password: '',
                              full_name: t.full_name,
                              mobile_number: t.mobile_number || '',
                              course_ids: assignedCourses,
                              batch_ids: assignedBatches
                            });
                            setShowForm(true);
                          }}
                          className="text-xs text-primary-400 hover:text-primary-300 font-semibold border border-primary-500/20 hover:bg-primary-500/10 px-2.5 py-1 rounded-lg transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteUser(t.id, t.full_name)}
                          className="text-xs text-red-400 hover:text-red-300 font-semibold border border-red-500/20 hover:bg-red-500/10 px-2.5 py-1 rounded-lg transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- 5. STUDENTS TAB --- */}
      {activeTab === 'students' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div className="relative max-w-xs w-full">
              <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-slate-500" />
              <input
                type="text"
                placeholder="Search students..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-xs bg-dark-900/80 border border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
            {!showForm && (
              <button onClick={() => { setShowForm(true); setStudentForm({ id: '', email: '', password: '', full_name: '', mobile_number: '', address: '', fee_amount: '', course_id: '', batch_id: '' }); }} className="btn-primary flex items-center gap-2 py-2 text-xs">
                <Plus className="h-4 w-4" /> Enroll Student
              </button>
            )}
          </div>

          {showForm && (
            <form onSubmit={handleStudentSubmit} className="glass-card p-6 max-w-xl mx-auto space-y-4">
              <h4 className="font-bold text-sm text-slate-200">{studentForm.id ? 'Modify Student Profile' : 'Enroll Student Lifecycle'}</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400">Full Name</label>
                  <input type="text" placeholder="Jane Doe" value={studentForm.full_name} onChange={e => setStudentForm({...studentForm, full_name: e.target.value})} className="w-full glass-input" required />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400">Email Address</label>
                  <input type="email" placeholder="jane@student.com" value={studentForm.email} onChange={e => setStudentForm({...studentForm, email: e.target.value})} className="w-full glass-input" required />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400">Access Password {studentForm.id && '(Optional)'}</label>
                  <input type="password" placeholder={studentForm.id ? "Leave blank to keep same" : "Password123"} value={studentForm.password} onChange={e => setStudentForm({...studentForm, password: e.target.value})} className="w-full glass-input" required={!studentForm.id} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400">Mobile Number</label>
                  <input type="text" placeholder="9876543210" value={studentForm.mobile_number} onChange={e => setStudentForm({...studentForm, mobile_number: e.target.value})} className="w-full glass-input" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400">Associated Course</label>
                  <select value={studentForm.course_id} onChange={e => setStudentForm({...studentForm, course_id: e.target.value})} className="w-full glass-input bg-dark-900" required>
                    <option value="">Select Course</option>
                    {courses.map(c => <option key={c.id} value={c.id}>{c.course_name}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400">Associated Batch</label>
                  <select value={studentForm.batch_id} onChange={e => setStudentForm({...studentForm, batch_id: e.target.value})} className="w-full glass-input bg-dark-900" required>
                    <option value="">Select Batch</option>
                    {batches.map(b => <option key={b.id} value={b.id}>{b.batch_name}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400">Custom Course Fee override (INR)</label>
                  <input type="number" placeholder="Leave empty for course default" value={studentForm.fee_amount} onChange={e => setStudentForm({...studentForm, fee_amount: e.target.value})} className="w-full glass-input" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400">Address Details</label>
                  <input type="text" placeholder="Street, State" value={studentForm.address} onChange={e => setStudentForm({...studentForm, address: e.target.value})} className="w-full glass-input" />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-4">
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary py-2 text-xs">Cancel</button>
                <button type="submit" className="btn-primary py-2 text-xs" disabled={loading}>{studentForm.id ? 'Update Student' : 'Onboard Student'}</button>
              </div>
            </form>
          )}

          {(() => {
            const grouped = getGroupedStudents();
            const courseEntries = Object.entries(grouped);

            if (courseEntries.length === 0) {
              return (
                <div className="glass-card p-12 text-center text-slate-500 text-xs">
                  No students found matching the query.
                </div>
              );
            }

            return (
              <div className="space-y-8">
                {courseEntries.map(([courseId, courseData]) => (
                  <div key={courseId} className="space-y-4">
                    <h4 className="text-sm font-bold text-primary-400 border-l-2 border-primary-500 pl-3">
                      {courseData.courseName}
                    </h4>
                    
                    {Object.entries(courseData.batches).map(([batchId, batchData]) => (
                      <div key={batchId} className="glass-card overflow-hidden">
                        <div className="bg-slate-900/40 px-6 py-3 border-b border-slate-800/80 flex justify-between items-center">
                          <h5 className="text-xs font-bold text-slate-200">
                            Batch: {batchData.batchName}
                          </h5>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {batchData.students.length} Student{batchData.students.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full border-collapse">
                            <thead>
                              <tr className="bg-slate-900/20">
                                <th className="table-header text-left pl-6">Student ID (UUID)</th>
                                <th className="table-header text-left">Name</th>
                                <th className="table-header text-left">Email</th>
                                <th className="table-header text-left">Admitted</th>
                                <th className="table-header text-left">Dues Status</th>
                                <th className="table-header text-left pr-6">Action</th>
                              </tr>
                            </thead>
                            <tbody>
                              {batchData.students.map(s => (
                                <tr key={s.id} className="hover:bg-slate-900/20 transition-colors border-b border-slate-800/60 last:border-b-0">
                                  <td className="table-cell pl-6 py-3 font-mono text-xs text-slate-400 select-all">
                                    <code className="font-mono text-[11px] bg-slate-950/40 px-1.5 py-0.5 rounded border border-slate-800/60 select-all">{s.id}</code>
                                  </td>
                                  <td className="table-cell font-bold text-slate-200 py-3">{s.full_name}</td>
                                  <td className="table-cell py-3">{s.email}</td>
                                  <td className="table-cell text-xs py-3">{s.admission_date}</td>
                                  <td className="table-cell text-xs py-3">
                                    <div className="space-y-1">
                                      <p>Paid: <strong className="text-green-400">₹{s.fee_paid}</strong></p>
                                      <p>Pending: <strong className="text-amber-400">₹{s.fee_pending}</strong></p>
                                    </div>
                                  </td>
                                  <td className="table-cell pr-6 py-3">
                                    <div className="flex gap-2">
                                      <button
                                        onClick={() => {
                                          setStudentForm({
                                            id: s.id,
                                            email: s.email,
                                            password: '',
                                            full_name: s.full_name,
                                            mobile_number: s.mobile_number || '',
                                            address: s.address || '',
                                            fee_amount: s.fee_amount || '',
                                            course_id: s.course_id || '',
                                            batch_id: s.batch_id || ''
                                          });
                                          setShowForm(true);
                                        }}
                                        className="text-xs text-primary-400 hover:text-primary-300 font-semibold border border-primary-500/20 hover:bg-primary-500/10 px-2.5 py-1 rounded-lg transition-colors"
                                      >
                                        Edit
                                      </button>
                                      <button
                                        onClick={() => handleDeleteUser(s.id, s.full_name)}
                                        className="text-xs text-red-400 hover:text-red-300 font-semibold border border-red-500/20 hover:bg-red-500/10 px-2.5 py-1 rounded-lg transition-colors"
                                      >
                                        Delete
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      )}

      {/* --- 6. FEES TAB --- */}
      {activeTab === 'fees' && (
        <div className="space-y-6">
          {/* Digital Payment Toggle Section */}
          <div className="glass-card p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4 animate-fadeIn">
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-200 flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-indigo-400" /> Digital Payment Gateway
              </h3>
              <p className="text-xs text-slate-400">
                Enable or disable online student checkout via Razorpay. When turned off, students must pay offline/cash.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-xs font-semibold ${digitalPaymentsEnabled ? 'text-indigo-400' : 'text-slate-400'}`}>
                {digitalPaymentsEnabled ? 'ONLINE PAYMENTS ENABLED' : 'ONLINE PAYMENTS DISABLED'}
              </span>
              <button
                type="button"
                onClick={handleToggleDigitalPayments}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 focus:outline-none cursor-pointer ${
                  digitalPaymentsEnabled ? 'bg-indigo-600' : 'bg-slate-700'
                }`}
                disabled={loading}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300 ${
                    digitalPaymentsEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Record payment */}
            <div className="glass-card p-6 space-y-4">
              <h3 className="text-base font-bold text-slate-200 flex items-center gap-2"><DollarSign className="h-5 w-5 text-green-400" /> Record Offline Payment</h3>
              <form onSubmit={handleFeePaymentSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400">Select Student</label>
                  <select value={feePaymentForm.student_id} onChange={e => setFeePaymentForm({...feePaymentForm, student_id: e.target.value})} className="w-full glass-input bg-dark-900" required>
                    <option value="">Choose Enrolled Student</option>
                    {students.map(s => <option key={s.id} value={s.id}>{s.full_name} (Pending: ₹{s.fee_pending})</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400">Payment Amount (INR)</label>
                  <input type="number" placeholder="Enter Cash Collection Amount" value={feePaymentForm.amount} onChange={e => setFeePaymentForm({...feePaymentForm, amount: e.target.value})} className="w-full glass-input" required />
                </div>
                <button type="submit" className="btn-primary w-full py-2.5 text-xs" disabled={loading}>Log Cash Payment</button>
              </form>
            </div>

            {/* Override Student Fees */}
            <div className="glass-card p-6 space-y-4">
              <h3 className="text-base font-bold text-slate-200 flex items-center gap-2"><Edit3 className="h-5 w-5 text-amber-400" /> Override Course Dues</h3>
              <form onSubmit={handleFeeOverrideSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400">Select Student</label>
                  <select value={feeOverrideForm.student_id} onChange={e => setFeeOverrideForm({...feeOverrideForm, student_id: e.target.value})} className="w-full glass-input bg-dark-900" required>
                    <option value="">Select Student Profile</option>
                    {students.map(s => <option key={s.id} value={s.id}>{s.full_name} (Total Dues: ₹{s.fee_amount})</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400">New Overall Course Fee (INR)</label>
                  <input type="number" placeholder="Enter New Course Cost" value={feeOverrideForm.fee_amount} onChange={e => setFeeOverrideForm({...feeOverrideForm, fee_amount: e.target.value})} className="w-full glass-input" required />
                </div>
                <button type="submit" className="btn-secondary w-full py-2.5 text-xs text-amber-400 border-amber-500/20 hover:bg-amber-500/5" disabled={loading}>Update Fee Cap</button>
              </form>
            </div>
          </div>

          {/* Send Fee Request */}
          <div className="glass-card p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-200 flex items-center gap-2"><Bell className="h-5 w-5 text-indigo-400" /> Send Fee Request</h3>
            <form onSubmit={handleFeeRequestSubmit} className="space-y-4 max-w-xl">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400">Fee Amount (INR)</label>
                  <input
                    type="number"
                    placeholder="e.g. 5000"
                    value={feeRequestForm.amount}
                    onChange={e => setFeeRequestForm({...feeRequestForm, amount: e.target.value})}
                    className="w-full glass-input"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400">Due Date</label>
                  <input
                    type="date"
                    value={feeRequestForm.due_date}
                    onChange={e => setFeeRequestForm({...feeRequestForm, due_date: e.target.value})}
                    className="w-full glass-input"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400">Target Audience</label>
                  <select
                    value={feeRequestForm.target_type}
                    onChange={e => setFeeRequestForm({...feeRequestForm, target_type: e.target.value, target_id: ''})}
                    className="w-full glass-input bg-dark-900"
                    required
                  >
                    <option value="INDIVIDUAL">Individual Student</option>
                    <option value="COURSE">Entire Course</option>
                    <option value="REMAINING">Students with Remaining Fees</option>
                  </select>
                </div>

                {feeRequestForm.target_type === 'INDIVIDUAL' && (
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-400">Select Student</label>
                    <select
                      value={feeRequestForm.target_id}
                      onChange={e => setFeeRequestForm({...feeRequestForm, target_id: e.target.value})}
                      className="w-full glass-input bg-dark-900"
                      required
                    >
                      <option value="">Choose Student</option>
                      {students.map(s => (
                        <option key={s.id} value={s.id}>{s.full_name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {feeRequestForm.target_type === 'COURSE' && (
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-400">Select Course</label>
                    <select
                      value={feeRequestForm.target_id}
                      onChange={e => setFeeRequestForm({...feeRequestForm, target_id: e.target.value})}
                      className="w-full glass-input bg-dark-900"
                      required
                    >
                      <option value="">Choose Course</option>
                      {courses.map(c => (
                        <option key={c.id} value={c.id}>{c.course_name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <button type="submit" className="btn-primary py-2.5 px-6 text-xs" disabled={loading}>
                Send Fee Request
              </button>
            </form>
          </div>

          {/* Transactions table */}
          <div className="glass-card p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-200">Transaction History</h3>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-900/50">
                    <th className="table-header">Transaction ID</th>
                    <th className="table-header">Student</th>
                    <th className="table-header">Amount</th>
                    <th className="table-header">Method</th>
                    <th className="table-header">Receipt Status</th>
                    <th className="table-header">Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map(txn => (
                    <tr key={txn.id} className="hover:bg-slate-900/20 transition-colors">
                      <td className="table-cell font-mono text-xs text-slate-400">{txn.transaction_id}</td>
                      <td className="table-cell font-bold text-slate-300">{txn.students?.full_name || 'Student'}</td>
                      <td className="table-cell text-green-400 font-semibold">₹{txn.amount}</td>
                      <td className="table-cell font-mono text-xs">{txn.payment_method}</td>
                      <td className="table-cell">
                        <span className={txn.payment_status === 'SUCCESS' ? 'badge-paid' : 'badge-pending'}>
                          {txn.payment_status}
                        </span>
                      </td>
                      <td className="table-cell text-xs text-slate-400">{new Date(txn.created_at).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* --- 7. TIMETABLE TAB --- */}
      {activeTab === 'timetable' && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/60 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-200">Timetable slots</h3>
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
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleTimetableDelete(slot.id)}
                          className="text-red-400 hover:text-red-300"
                          title="Delete Slot"
                        >
                          <Trash2 className="h-4 w-4" />
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

      {/* --- 8. CERTIFICATES TAB --- */}
      {activeTab === 'certificates' && (
        <div className="space-y-6">
          <div className="glass-card p-6 space-y-4">
            {!showForm ? (
              <div className="flex justify-between items-center">
                <h3 className="text-base font-bold text-slate-200">Completion Certificate Registry</h3>
                <button
                  onClick={() => {
                    setShowForm(true);
                    setCertificateForm({ student_id: '', course_id: '', completion_date: new Date().toISOString().substring(0, 10) });
                  }}
                  className="btn-primary flex items-center gap-2 py-2 text-xs"
                >
                  <Plus className="h-4 w-4" /> Issue Certificate
                </button>
              </div>
            ) : (
              <form onSubmit={handleCertificateFormSubmit} className="glass-card p-6 max-w-xl mx-auto space-y-4">
                <h4 className="font-bold text-sm text-slate-200">Issue Completion Certificate</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1 col-span-2">
                    <label className="text-xs font-semibold text-slate-400">Select Student</label>
                    <select
                      value={certificateForm.student_id}
                      onChange={e => setCertificateForm({...certificateForm, student_id: e.target.value})}
                      className="w-full glass-input bg-dark-900"
                      required
                    >
                      <option value="">Choose Enrolled Student</option>
                      {students.filter(s => s.status !== 'INACTIVE').map(s => <option key={s.id} value={s.id}>{s.full_name} ({s.email})</option>)}
                    </select>
                  </div>
                  <div className="space-y-1 col-span-2">
                    <label className="text-xs font-semibold text-slate-400">Select Course</label>
                    <select
                      value={certificateForm.course_id}
                      onChange={e => setCertificateForm({...certificateForm, course_id: e.target.value})}
                      className="w-full glass-input bg-dark-900"
                      required
                    >
                      <option value="">Choose Course</option>
                      {courses.map(c => <option key={c.id} value={c.id}>{c.course_name} ({c.course_code})</option>)}
                    </select>
                  </div>
                  <div className="space-y-1 col-span-2">
                    <label className="text-xs font-semibold text-slate-400">Date of Course Completion</label>
                    <input
                      type="date"
                      value={certificateForm.completion_date}
                      onChange={e => setCertificateForm({...certificateForm, completion_date: e.target.value})}
                      className="w-full glass-input"
                      required
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-3 mt-4">
                  <button type="button" onClick={() => setShowForm(false)} className="btn-secondary py-2 text-xs">Cancel</button>
                  <button type="submit" className="btn-primary py-2 text-xs" disabled={loading}>Generate Certificate</button>
                </div>
              </form>
            )}
          </div>

          <div className="glass-card p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-200">Issued Certificates Registry</h3>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-900/50">
                    <th className="table-header">Certificate ID</th>
                    <th className="table-header">Student</th>
                    <th className="table-header">Course</th>
                    <th className="table-header">Issued On</th>
                    <th className="table-header">Verification Link</th>
                    <th className="table-header text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {certificates.map(c => (
                    <tr key={c.id} className="hover:bg-slate-900/20 transition-colors">
                      <td className="table-cell font-mono text-xs text-primary-400">{c.certificate_id}</td>
                      <td className="table-cell font-bold text-slate-300">{c.students?.full_name || '[Archived Student]'}</td>
                      <td className="table-cell">{c.courses?.course_name}</td>
                      <td className="table-cell text-xs">{c.completion_date}</td>
                      <td className="table-cell">
                        <a href={c.verification_url} target="_blank" rel="noreferrer" className="text-xs text-primary-400 underline hover:text-primary-300">
                          Verify Page Link
                        </a>
                      </td>
                      <td className="table-cell text-right">
                        <button
                          onClick={() => handleUnissueCertificate(c.id)}
                          className="text-xs text-red-400 hover:text-red-300 font-semibold hover:underline"
                        >
                          Unissue
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

      {/* --- 9. NOTIFICATIONS TAB --- */}
      {activeTab === 'notifications' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-base font-bold text-slate-200">System Broadcasts & Notifications</h3>
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
                      <span>By: <span className="text-primary-400">{n.users?.email || 'System'}</span></span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- 10. REPORTS TAB --- */}
      {activeTab === 'reports' && (
        <div className="space-y-6">
          <div className="glass-card p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-200 flex items-center gap-2"><FileSpreadsheet className="h-5 w-5 text-primary-400" /> Administrative Reporting Suite</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
              <div className="bg-dark-950/40 p-4 border border-slate-800 rounded-xl space-y-2">
                <h4 className="font-bold text-sm text-slate-200">Student Enrolments Report</h4>
                <p className="text-xs text-slate-400">Comprehensive sheet containing student lifecycle, batch logs, statuses, and contact details.</p>
                <button onClick={downloadStudentEnrolmentsReport} className="btn-secondary py-1 text-xs mt-2 w-full">Export CSV</button>
              </div>

              <div className="bg-dark-950/40 p-4 border border-slate-800 rounded-xl space-y-2">
                <h4 className="font-bold text-sm text-slate-200">Collection & Fees Ledger</h4>
                <p className="text-xs text-slate-400">Total collection ledger, cash reports, online pending reconciliations, outstanding balance breakdowns.</p>
                <button onClick={downloadCollectionFeesLedger} className="btn-secondary py-1 text-xs mt-2 w-full">Export CSV</button>
              </div>

              <div className="bg-dark-950/40 p-4 border border-slate-800 rounded-xl space-y-2">
                <h4 className="font-bold text-sm text-slate-200">Attendance Summaries</h4>
                <p className="text-xs text-slate-400">Weekly percentages across batches, total presence indicators, and teacher records tracking.</p>
                <button onClick={downloadAttendanceSummaries} className="btn-secondary py-1 text-xs mt-2 w-full" disabled={loading}>Export CSV</button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Revenue & Outstanding Fees detail modal */}
      {feeModalType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-overlay">
          <div className="glass-card w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col relative bg-dark-900 border-slate-800 shadow-2xl">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/40">
              <div>
                <h3 className="text-lg font-bold text-slate-100">
                  {feeModalType === 'collected' ? 'Revenue Collected Details' : 'Outstanding Fees Details'}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {feeModalType === 'collected' 
                    ? 'Individual student payment breakdown' 
                    : 'Individual student pending dues breakdown'}
                </p>
              </div>
              <button
                onClick={() => setFeeModalType(null)}
                className="text-slate-400 hover:text-slate-900 border border-slate-800 hover:bg-slate-800 p-2 rounded-xl transition-colors"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-slate-900/50">
                      <th className="table-header text-left pl-4">Student ID</th>
                      <th className="table-header text-left">Student Name</th>
                      <th className="table-header text-left">Course & Batch</th>
                      <th className="table-header text-right pr-4">
                        {feeModalType === 'collected' ? 'Amount Paid' : 'Amount Pending'}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const list = students.filter(s => {
                        if (feeModalType === 'collected') {
                          return Number(s.fee_paid || 0) > 0;
                        } else {
                          return Number(s.fee_pending || 0) > 0;
                        }
                      });

                      if (list.length === 0) {
                        return (
                          <tr>
                            <td colSpan={4} className="table-cell text-center py-8 text-slate-500 text-xs">
                              No records found.
                            </td>
                          </tr>
                        );
                      }

                      return list.map(s => (
                        <tr key={s.id} className="hover:bg-slate-900/20 transition-colors border-b border-slate-800/60 last:border-0">
                          <td className="table-cell pl-4 py-3 font-mono text-xs text-slate-400">
                            {s.id.substring(0, 8)}...
                          </td>
                          <td className="table-cell py-3">
                            <p className="font-bold text-slate-200 text-xs">{s.full_name}</p>
                            <p className="text-[10px] text-slate-400">{s.email}</p>
                          </td>
                          <td className="table-cell text-xs py-3">
                            <p className="font-semibold text-slate-300">{s.course_name || 'N/A'}</p>
                            <p className="text-[10px] text-slate-500">({s.batch_name || 'N/A'})</p>
                          </td>
                          <td className="table-cell text-right pr-4 py-3 font-semibold text-xs">
                            {feeModalType === 'collected' ? (
                              <span className="text-green-400 font-bold">₹{s.fee_paid}</span>
                            ) : (
                              <span className="text-amber-400 font-bold">₹{s.fee_pending}</span>
                            )}
                          </td>
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
