# 🌸 Berrywise ATS — AI-Powered Recruitment Pipeline Optimizer

**Berrywise ATS** is an elegant, full-stack recruitment optimizer and applicant tracking system (ATS) designed to streamline candidate evaluations. Leveraging advanced text processing and dynamic scorecards, it automates resume parsing, screens out non-resume files, calculates matching index ratios, enables dynamic SMTP configurations, and generates custom PDF/HTML insights directly for hiring managers and recruiters.

---

## 🌐 Live Deployed Application

You can access the live deployed system here:
* **Live Web Application (Vercel)**: [https://recruitment-pipeline-nagl.vercel.app/](https://recruitment-pipeline-nagl.vercel.app/)
* **Live API Server (Render)**: [https://recruitment-pipeline-backend.onrender.com](https://recruitment-pipeline-backend.onrender.com)
* **Live GraphQL Playroom**: [https://recruitment-pipeline-backend.onrender.com/graphql](https://recruitment-pipeline-backend.onrender.com/graphql)

---

## 🚀 Key Feature Highlights

### 1. 🧠 Intelligent AI Resume Evaluation
* **Multi-Factor Scorecarding**: Evaluates candidates across four core pillars: **Technical Skills**, **Experience Alignment**, **Culture Fit**, and **Risk Assessment**.
* **Competency Radar Graphs**: Visualizes candidate fits using beautiful, interactive responsive SVG radar charts powered by Recharts.
* **Fit Recommendations**: Auto-generates qualitative fit summaries, outlining candidate strengths, development gaps, potential red flags, and custom suggested interview questions.

### 2. 🛡️ Strict Resume & CV Document Validation
* **Heuristic Pillar Checks**: Prevents invalid documents (such as academic calendars, semester schedules, cooking recipes, or standard invoices) from clogging the pipeline. 
* **Contact Verification**: Requires the presence of a valid email address inside parsed document text to ensure professional reachability.
* **Warning Notifications**: Automatically blocks non-resume/CV files and throws responsive, real-time warning toast alerts.

### 3. 📬 Recruiter SMTP Settings Dashboard
* **Dynamic Mail Server Config**: Recruiters can connect their real SMTP mail server details (Gmail, Outlook, custom hosts) directly from their Profile page.
* **Persisted Local Security**: Stored in a local SQLite table mapped per user session, keeping sensitive credentials secure and local.
* **Live Status Verification**: Checks and shifts integration status badges in real-time between a blue **SIMULATED** chip and a flashing green **CONNECTED** chip to indicate a real active mail server.

### 4. 💌 Custom Recipient Evaluation Reports
* **Custom Email Recipients**: Send formatted candidate evaluations to any email address (e.g. team managers, department heads) from a slick modal dialog.
* **Visual Mode Helper**: Identifies whether emails will go through a **Real SMTP Server** or the automatic **Berrywise Ethereal sandbox** test inbox.
* **Clickable Developer Previews**: Generates clickable Ethereal preview links on localhost for quick, seamless visual inspections in your web browser.
* **Export Utilities**: Quick single-click buttons to download evaluations as formatted **PDFs** or standard **CSVs**.

### 5. 📥 Advanced Candidate Ingestion
* **Single Candidate Upload**: Form-based ingestion with real-time email syntax verification.
* **Interactive Batch Processing**: Sleek multi-file drag-and-drop zone that extracts names, automatically guesses email addresses, and provides **editable input fields** to review and correct emails before batch ingestion.
* **Web Sourcing**: Dynamic URL scraping mockup that parses live professional profiles into evaluate-ready formats.

### 6. 🎨 Premium Glassmorphic Design System
* **Dynamic Light/Dark Themes**: Balanced contrasts, HSL color tokens, and custom glowing elements tailored for recruiter experiences.
* **Liquid Sidebar Navigation**: Employs an animated flowing menu utilizing elastic curtains and SVG morphing transitions.
* **Personalized Collaboration**: In-app comments section for team evaluations and live, synchronized real-time candidate updates powered by Socket.IO.

---

## 🛠️ Full-Stack Technical Architecture

### Tech Stack Breakdown
| Layer | Technologies Used | Description |
| :--- | :--- | :--- |
| **Frontend UI** | React, TypeScript, TailwindCSS, Recharts, Lucide Icons | Glassmorphic interface with vibrant dark mode accents and dynamic light mode themes. |
| **State & Animations** | Framer Motion, HTML5 Drag & Drop API, Cursor Trails | Fluid, responsive page transitions and smooth micro-interactions. |
| **Backend API** | Node.js, Express, Multer, PDF-Parse, Mammoth | Rest APIs, file uploads, raw text extraction from PDF/DOCX/TXT files. |
| **Real-Time events** | Socket.IO, WebSockets | Instant notification triggers upon evaluation completion. |
| **Database** | SQLite, sqlite3 Node Driver | Local relational persistence with foreign keys and database-level cascades. |
| **Email Delivery** | Nodemailer, SMTP, Ethereal Mail Sandbox | Dual-mode delivery engine for real SMTP delivery and test inboxes. |

---

## ⚙️ Local Development Setup

To run **Berrywise ATS** locally on your machine, follow these steps:

### Prerequisites
* Ensure you have **Node.js** (v18+) installed.

### 1. Configure Environment Variables
Create a `.env` file inside the `backend` directory using `backend/.env.example` as a template:
```env
PORT=5000
NODE_ENV=development
JWT_SECRET=your-super-secure-jwt-key
DATABASE_URL=./data/recruitment.db
LOG_LEVEL=info
```

### 2. Install Dependencies
Run the unified installer script in the root directory to install packages for both frontend and backend:
```bash
npm run install:all
```

### 3. Start the Servers
Boot up both the backend API and the Vite frontend dev server concurrently:
* **Start Backend**: `npm run start:backend` (runs on [http://localhost:5000](http://localhost:5000))
* **Start Frontend**: `npm run start:frontend` (runs on [http://localhost:3000](http://localhost:3000))

Now, open your browser to [http://localhost:3000](http://localhost:3000) and register a fresh recruiter account!

---

## 🔒 Security & Best Practices
* **Authentication**: Signed JSON Web Tokens (JWT) manage session states, with local database checks on each middleware call to reject stale cookies immediately.
* **Data Sanitization**: Strictly enforces case-insensitive email normalization and deep-cleans file upload temp paths to prevent workspace cluttering.
