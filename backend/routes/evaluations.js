const express = require('express');
const router = express.Router();
const { dbQuery } = require('../utils/database');
const { evaluateCandidate } = require('../services/evaluationService');
const { authenticateToken } = require('../middleware/auth');
const logger = require('../utils/logger');

// Trigger candidate evaluation(s)
router.post('/evaluate', authenticateToken, async (req, res, next) => {
  try {
    const { jobId, candidateIds, evaluationConfig } = req.body;

    if (!jobId || !candidateIds || !Array.isArray(candidateIds) || candidateIds.length === 0) {
      return res.status(400).json({ error: 'jobId and non-empty candidateIds array are required.' });
    }

    const job = await dbQuery.get('SELECT * FROM jobs WHERE id = ? AND user_id = ?', [jobId, req.user.id]);
    if (!job) {
      return res.status(403).json({ error: 'Job not found or access denied.' });
    }

    logger.info(`Starting evaluation batch for job ${jobId} and ${candidateIds.length} candidate(s).`);

    const results = [];
    const errors = [];

    const io = req.app.get('io');

    // Evaluate candidates
    for (const candidateId of candidateIds) {
      try {
        const result = await evaluateCandidate(candidateId, jobId, evaluationConfig || {});
        results.push({ candidateId, status: 'success', result });
        
        const cand = await dbQuery.get('SELECT name FROM candidates WHERE id = ?', [candidateId]);
        if (io) {
          io.emit('EVALUATION_COMPLETE', {
            jobId,
            candidateId,
            candidateName: cand ? cand.name : 'Unknown Candidate'
          });
        }
      } catch (err) {
        logger.error(`Failed evaluating candidate ${candidateId} in batch: ${err.message}`);
        errors.push({ candidateId, error: err.message });
      }
    }

    res.json({
      jobId,
      processedCount: results.length,
      failedCount: errors.length,
      results,
      errors
    });
  } catch (error) {
    next(error);
  }
});

// Retrieve evaluation results and rankings for a job
router.get('/results/:jobId', authenticateToken, async (req, res, next) => {
  try {
    const { jobId } = req.params;

    // Check if job exists and belongs to user
    const job = await dbQuery.get('SELECT * FROM jobs WHERE id = ? AND user_id = ?', [jobId, req.user.id]);
    if (!job) {
      return res.status(404).json({ error: 'Job posting not found or access denied.' });
    }

    // Retrieve all candidates that have evaluations, ordered by rank ascending
    const candidatesWithEvals = await dbQuery.all(
      `SELECT c.id as candidateId, c.name, c.email, c.uploaded_at,
              e.id as evaluationId, e.overall_score, e.scores, e.rank, e.status, 
              e.recommendation, e.strengths, e.gaps, e.red_flags, e.suggested_questions, e.completed_at
       FROM candidates c
       JOIN evaluations e ON c.id = e.candidate_id
       WHERE c.job_id = ?
       ORDER BY e.rank ASC`,
      [jobId]
    );

    // Format fields
    const formattedCandidates = candidatesWithEvals.map(cand => ({
      candidateId: cand.candidateId,
      name: cand.name,
      email: cand.email,
      uploadedAt: cand.uploaded_at,
      evaluationId: cand.evaluationId,
      rank: cand.rank,
      overallScore: cand.overall_score,
      status: cand.status,
      recommendation: cand.recommendation,
      completedAt: cand.completed_at,
      scores: JSON.parse(cand.scores || '{}'),
      strengths: JSON.parse(cand.strengths || '[]'),
      gaps: JSON.parse(cand.gaps || '[]'),
      redFlags: JSON.parse(cand.red_flags || '[]'),
      suggestedQuestions: JSON.parse(cand.suggested_questions || '[]')
    }));

    // Calculate overall summaries
    const totalCandidates = formattedCandidates.length;
    const topCandidates = formattedCandidates.filter(c => c.overall_score >= 85).length;
    const strongMatches = formattedCandidates.filter(c => c.status === 'Strong Match').length;
    const potentialMatches = formattedCandidates.filter(c => c.status === 'Potential Match').length;
    const poorMatches = formattedCandidates.filter(c => c.status === 'Poor Match').length;

    res.json({
      jobId,
      jobTitle: job.title,
      completedAt: new Date().toISOString(),
      candidates: formattedCandidates,
      summary: {
        totalCandidates,
        topCandidates,
        strongMatches,
        potentialMatches,
        poorMatches
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
