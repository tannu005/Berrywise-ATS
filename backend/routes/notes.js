const express = require('express');
const router = express.Router();
const { dbQuery } = require('../utils/database');
const { authenticateToken } = require('../middleware/auth');

// Get notes for a candidate
router.get('/:candidateId', authenticateToken, async (req, res, next) => {
  try {
    // Optional: verify the candidate belongs to a job owned by this user
    const candidate = await dbQuery.get(`
      SELECT c.id FROM candidates c
      JOIN jobs j ON c.job_id = j.id
      WHERE c.id = ? AND j.user_id = ?
    `, [req.params.candidateId, req.user.id]);

    if (!candidate) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const notes = await dbQuery.all(`
      SELECT n.*, u.name as author_name 
      FROM candidate_notes n
      JOIN users u ON n.user_id = u.id
      WHERE n.candidate_id = ?
      ORDER BY n.created_at DESC
    `, [req.params.candidateId]);
    
    res.json(notes);
  } catch (error) {
    next(error);
  }
});

// Add a new note
router.post('/', authenticateToken, async (req, res, next) => {
  try {
    const { candidateId, content } = req.body;
    if (!candidateId || !content) {
      return res.status(400).json({ error: 'Candidate ID and content are required.' });
    }

    // Verify candidate access
    const candidate = await dbQuery.get(`
      SELECT c.id FROM candidates c
      JOIN jobs j ON c.job_id = j.id
      WHERE c.id = ? AND j.user_id = ?
    `, [candidateId, req.user.id]);

    if (!candidate) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const noteId = `note_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    
    await dbQuery.run(
      'INSERT INTO candidate_notes (id, candidate_id, user_id, content) VALUES (?, ?, ?, ?)',
      [noteId, candidateId, req.user.id, content]
    );

    const newNote = await dbQuery.get(`
      SELECT n.*, u.name as author_name 
      FROM candidate_notes n
      JOIN users u ON n.user_id = u.id
      WHERE n.id = ?
    `, [noteId]);

    res.status(201).json(newNote);
  } catch (error) {
    next(error);
  }
});

// Delete a note
router.delete('/:id', authenticateToken, async (req, res, next) => {
  try {
    const note = await dbQuery.get('SELECT * FROM candidate_notes WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    if (!note) {
      return res.status(404).json({ error: 'Note not found or access denied.' });
    }

    await dbQuery.run('DELETE FROM candidate_notes WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
