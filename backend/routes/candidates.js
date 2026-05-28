const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { dbQuery } = require('../utils/database');
const { parseResumeFile } = require('../services/fileService');
const { authenticateToken } = require('../middleware/auth');
const logger = require('../utils/logger');

// Heuristic to check if extracted text represents a valid resume or CV
const isResumeOrCV = (text) => {
  if (!text) return false;
  const textLower = text.toLowerCase();

  // Validate character lengths (real resumes are typically between 200 and 50,000 chars)
  // Rejects giant text books, manuals, or extremely brief single-word files
  if (text.trim().length < 200 || text.trim().length > 60000) return false;

  const categories = {
    education: ['education', 'academic', 'university', 'college', 'degree', 'school', 'gpa', 'bachelor', 'master', 'phd', 'graduate', 'undergraduate', 'diploma'],
    experience: ['experience', 'work history', 'employment', 'worked as', 'positions', 'career', 'internship', 'responsibilities', 'work experience', 'professional experience'],
    skills: ['skills', 'technologies', 'expertise', 'languages', 'tools', 'frameworks', 'proficient', 'technical skills'],
    resumeCV: ['resume', 'cv', 'curriculum vitae', 'summary', 'objective', 'profile', 'contact information', 'projects']
  };

  const educationMatched = categories.education.some(keyword => textLower.includes(keyword));
  const experienceMatched = categories.experience.some(keyword => textLower.includes(keyword));
  const skillsMatched = categories.skills.some(keyword => textLower.includes(keyword));
  const generalMatched = categories.resumeCV.some(keyword => textLower.includes(keyword));

  // Strict double-factor filters:
  // A real resume/CV must match at least two core pillars (Education + Experience, Experience + Skills, or Education + Skills + general placeholders)
  // This effectively blocks calendars (matches education only), textbook slices, invoices, etc.
  if (educationMatched && experienceMatched) return true;
  if (experienceMatched && skillsMatched) return true;
  if (educationMatched && skillsMatched && generalMatched) return true;

  return false;
};

// Setup upload directory
const uploadDir = process.env.PERSISTENT_DIR ? path.join(process.env.PERSISTENT_DIR, 'uploads') : (process.env.NODE_ENV === 'production' ? '/tmp' : path.join(__dirname, '../uploads'));
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// Upload a candidate resume
router.post('/', authenticateToken, upload.single('file'), async (req, res, next) => {
  try {
    const { jobId, candidateName, candidateEmail } = req.body;
    
    if (!jobId || !candidateName || !candidateEmail) {
      return res.status(400).json({ error: 'jobId, candidateName, and candidateEmail are required.' });
    }

    const job = await dbQuery.get('SELECT * FROM jobs WHERE id = ? AND user_id = ?', [jobId, req.user.id]);
    if (!job) {
      return res.status(404).json({ error: 'Job posting not found or you do not have permission.' });
    }

    let filePath = null;
    let resumeText = '';

    if (req.file) {
      filePath = req.file.path;
      try {
        resumeText = await parseResumeFile(filePath, req.file.mimetype);
        
        // Enforce that only valid resumes and CVs are accepted
        if (!isResumeOrCV(resumeText)) {
          if (filePath && fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
          return res.status(400).json({ error: 'Only resume and CV are allowed to upload, and these documents will not be uploaded.' });
        }
      } catch (parseError) {
        if (filePath && fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
        logger.error(`Error reading uploaded file: ${parseError.message}`);
        return res.status(422).json({ error: `File text extraction failed: ${parseError.message}` });
      }
    } else {
      return res.status(400).json({ error: 'Resume file is required.' });
    }

    const candidateId = `cand_${Date.now()}_${Math.floor(Math.random()*1000)}`;

    await dbQuery.run(
      `INSERT INTO candidates (id, job_id, name, email, file_path, resume_text, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [candidateId, jobId, candidateName, candidateEmail, filePath, resumeText, 'pending_evaluation']
    );

    // Create Audit Log
    await dbQuery.run(
      'INSERT INTO audit_logs (id, job_id, action, details) VALUES (?, ?, ?, ?)',
      [
        `audit_${Date.now()}_${Math.floor(Math.random()*1000)}`,
        jobId,
        'CANDIDATE_UPLOAD',
        JSON.stringify({ candidateName, candidateEmail, candidateId })
      ]
    );

    logger.info(`Candidate ${candidateName} uploaded successfully for Job ${jobId}`);
    res.status(201).json({
      candidateId,
      jobId,
      name: candidateName,
      email: candidateEmail,
      uploadedAt: new Date().toISOString(),
      status: 'pending_evaluation'
    });
  } catch (error) {
    next(error);
  }
});

// List candidates for a specific job
router.get('/job/:jobId', authenticateToken, async (req, res, next) => {
  try {
    const job = await dbQuery.get('SELECT * FROM jobs WHERE id = ? AND user_id = ?', [req.params.jobId, req.user.id]);
    if (!job) {
      return res.status(404).json({ error: 'Job not found or access denied.' });
    }

    const candidates = await dbQuery.all(
      'SELECT id, name, email, uploaded_at, status FROM candidates WHERE job_id = ? ORDER BY uploaded_at DESC',
      [req.params.jobId]
    );
    res.json(candidates);
  } catch (error) {
    next(error);
  }
});

// Get detailed candidate page
router.get('/:id', authenticateToken, async (req, res, next) => {
  try {
    const candidate = await dbQuery.get(`
      SELECT c.* FROM candidates c
      JOIN jobs j ON c.job_id = j.id
      WHERE c.id = ? AND j.user_id = ?
    `, [req.params.id, req.user.id]);
    
    if (!candidate) {
      return res.status(404).json({ error: 'Candidate not found or access denied.' });
    }

    // Retrieve corresponding evaluation if it exists
    const evaluation = await dbQuery.get('SELECT * FROM evaluations WHERE candidate_id = ?', [req.params.id]);
    const responseData = {
      ...candidate,
      evaluation: evaluation ? {
        ...evaluation,
        scores: JSON.parse(evaluation.scores || '{}'),
        strengths: JSON.parse(evaluation.strengths || '[]'),
        gaps: JSON.parse(evaluation.gaps || '[]'),
        redFlags: JSON.parse(evaluation.red_flags || '[]'),
        suggestedQuestions: JSON.parse(evaluation.suggested_questions || '[]')
      } : null
    };

    res.json(responseData);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
