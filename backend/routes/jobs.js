const express = require('express');
const router = express.Router();
const { dbQuery } = require('../utils/database');
const { authenticateToken } = require('../middleware/auth');
const logger = require('../utils/logger');

// Create job posting
router.post('/', authenticateToken, async (req, res, next) => {
  try {
    const { title, description, requirements, companyValues, teamSize, reportingTo } = req.body;
    
    if (!title) {
      return res.status(400).json({ error: 'Job title is required.' });
    }

    const jobId = `job_${Date.now()}`;
    const reqString = JSON.stringify(requirements || {});
    const valuesString = JSON.stringify(companyValues || []);

    await dbQuery.run(
      `INSERT INTO jobs (id, user_id, title, description, requirements, company_values, team_size, reporting_to)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [jobId, req.user.id, title, description || '', reqString, valuesString, teamSize || 1, reportingTo || '']
    );

    // Create audit log
    await dbQuery.run(
      'INSERT INTO audit_logs (id, job_id, action, details) VALUES (?, ?, ?, ?)',
      [`audit_${Date.now()}_${Math.floor(Math.random()*1000)}`, jobId, 'CREATE_JOB', JSON.stringify({ title })]
    );

    logger.info(`Job posting created: ${title} (${jobId})`);
    res.status(201).json({
      jobId,
      title,
      createdAt: new Date().toISOString(),
      status: 'active'
    });
  } catch (error) {
    next(error);
  }
});

// List all jobs for the authenticated user
router.get('/', authenticateToken, async (req, res, next) => {
  try {
    const jobs = await dbQuery.all('SELECT * FROM jobs WHERE user_id = ? ORDER BY created_at DESC', [req.user.id]);
    const formattedJobs = jobs.map(job => ({
      ...job,
      requirements: JSON.parse(job.requirements || '{}'),
      company_values: JSON.parse(job.company_values || '[]')
    }));
    res.json(formattedJobs);
  } catch (error) {
    next(error);
  }
});

// Get job details (only if it belongs to the authenticated user)
router.get('/:id', authenticateToken, async (req, res, next) => {
  try {
    const job = await dbQuery.get('SELECT * FROM jobs WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    if (!job) {
      return res.status(404).json({ error: 'Job not found.' });
    }
    const formattedJob = {
      ...job,
      requirements: JSON.parse(job.requirements || '{}'),
      company_values: JSON.parse(job.company_values || '[]')
    };
    res.json(formattedJob);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
