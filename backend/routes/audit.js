const express = require('express');
const router = express.Router();
const { dbQuery } = require('../utils/database');
const { authenticateToken } = require('../middleware/auth');

router.get('/:jobId', authenticateToken, async (req, res, next) => {
  try {
    const job = await dbQuery.get('SELECT * FROM jobs WHERE id = ? AND user_id = ?', [req.params.jobId, req.user.id]);
    if (!job) {
      return res.status(403).json({ error: 'Job not found or access denied.' });
    }

    const logs = await dbQuery.all(
      'SELECT * FROM audit_logs WHERE job_id = ? ORDER BY timestamp DESC',
      [req.params.jobId]
    );

    const formattedLogs = logs.map(log => ({
      ...log,
      details: JSON.parse(log.details || '{}')
    }));

    res.json(formattedLogs);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
