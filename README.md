# LMS

An enterprise-grade, multi-portal Learning Management System (LMS) designed to facilitate a complete digital classroom ecosystem. The platform connects Administrators, Teachers, and Students into a cohesive, interactive environment.

A comprehensive widescreen presentation detailing all pages and features can be found in the root directory.

---

## 🚀 Key Portals & Features

### 1. 🔑 Super Admin Portal
* **Central Executive Dashboard**: Real-time stats showing total student enrollment, active course list, scheduled exams, and financial metrics (collections vs. outstanding balances).
* **Course & Batch Management**: Full CRUD operations to configure courses, syllabus descriptions, fee structures, default teacher mappings, and active/inactive status toggles.
* **User Accounts Controller**: Add and manage profiles for Teachers and Students, automatically syncing credentials with Supabase Auth.
* **Financial Ledger & Invoices**: Log manual cash transactions, adjust student fee structures, and broadcast payment due alerts.
* **Weekly Timetable Builder**: Graphical calendar scheduling tool with a bulk timetable creator helper.
* **Course Certificates**: Issue digital course completion certificates with unique tracking IDs and public QR code verification.
* **Broadcast Alerts**: Broadcast announcements globally or filter by course, batch, or individual user.
* **CSV Reporting**: One-click Excel/CSV report exports (Student Enrollments, Collections Ledger, and Batch Attendance logs).

### 2. 👩‍🏫 Teacher Portal
* **Class Attendance Roster**: Track and mark daily batch attendance (Present/Absent status) with direct log records.
* **Study Materials Manager**: Share course documents, video links, PDFs, and notes batched under specific classes.
* **Online Exam Creator**: Design online MCQ quizzes (with timer controls, option mapping, and auto-submit) or coding compiler exams.
* **Grades & Evaluation**: Grade student submissions, enter custom review marks, and return textual feedback.
* **Interactive Live Webinars**: Launch video stream classrooms with full sidebar controls to toggle student chat, raise-hand doubt queues, and voice messages.

### 3. 👨‍🎓 Student Workspace
* **Academic Classroom**: Access active courses, watch lecture recordings, and download study notes or assignments.
* **Timetable Sync**: Personal weekly timetable mapping out subjects, timing, and instructors.
* **Interactive Webinars**: Attend live classes, send chat messages, raise hands for doubt clearing, and record voice notes.
* **Online Test Center**: Take scheduled quizzes with live count-down timers and submit solutions in an online coding compiler workspace.
* **Academic Record**: View scores, grades, and teacher feedback for all evaluated assignments and examinations.
* **Fees Ledger & Razorpay Checkout**: Check total balances, view transaction history, and pay school fees online securely using Razorpay integration.
* **Verified Certificates**: View and print earned completion certificates, featuring public validation URLs for employers.

---

## 🛠️ Technology Stack
* **Frontend**: React 18, Vite, Tailwind CSS, Lucide Icons, React Router DOM.
* **Backend**: PHP 8.x REST API gateway with custom JWT authorization and CORS handlers.
* **Database**: Supabase PostgreSQL featuring 28 relational tables and PL/pgSQL sync triggers.
* **Integrations**: Razorpay Checkout SDK for online transactions.

---

## 🏃‍♂️ Getting Started

### Prerequisites
* PHP 8.x
* Node.js & npm
* Supabase Account (configured inside frontend & backend config files)

### Starting the Backend
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Start the PHP built-in server:
   ```bash
   php -S localhost:8000
   ```

### Starting the Frontend
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```
   Open `http://localhost:5173` in your browser.
