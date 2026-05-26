const { dbQuery } = require('../utils/database');
const { runJetroEvaluation } = require('./jetroService');
const { parseResumeFile } = require('./fileService');
const logger = require('../utils/logger');

const evaluateCandidate = async (candidateId, jobId, evaluationConfig = {}) => {
  try {
    // 1. Fetch Candidate and Job details from database
    const candidate = await dbQuery.get('SELECT * FROM candidates WHERE id = ?', [candidateId]);
    if (!candidate) throw new Error(`Candidate with ID ${candidateId} not found.`);

    const job = await dbQuery.get('SELECT * FROM jobs WHERE id = ?', [jobId]);
    if (!job) throw new Error(`Job with ID ${jobId} not found.`);

    const jobReqs = JSON.parse(job.requirements || '{}');
    const jobValues = JSON.parse(job.company_values || '[]');
    jobReqs.companyValues = jobValues;

    // 2. Parse file to text if not already parsed
    let resumeText = candidate.resume_text;
    if (!resumeText && candidate.file_path) {
      resumeText = await parseResumeFile(candidate.file_path, '');
      // Update candidate with parsed text
      await dbQuery.run('UPDATE candidates SET resume_text = ? WHERE id = ?', [resumeText, candidateId]);
    }

    if (!resumeText) {
      throw new Error('No resume text available for evaluation.');
    }

    // 3. Trigger Jetro agents (or local simulated flow)
    const rawResult = await runJetroEvaluation(resumeText, jobReqs, {
      name: candidate.name,
      email: candidate.email
    });

    // 4. Calculate weighted score
    const weights = evaluationConfig.weights || {
      skillMatch: 0.4,
      experienceAlignment: 0.25,
      cultureFit: 0.2,
      redFlags: 0.15
    };

    const skillScore = rawResult.matcher.skillMatchScore || 0;
    const expScore = rawResult.matcher.experienceScore || 0;
    const cultureScore = rawResult.culture.overallCultureFit || 0;
    const riskScore = rawResult.flags.riskScore || 100; // riskScore is 0-100 (100 means low risk, 0 means high risk)

    const overallScore = Math.round(
      (skillScore * weights.skillMatch) +
      (expScore * weights.experienceAlignment) +
      (cultureScore * weights.cultureFit) +
      (riskScore * weights.redFlags)
    );

    // Determine status & recommendation
    let status = 'Potential Match';
    let recommendation = 'Hold for future roles';
    if (overallScore >= 85) {
      status = 'Strong Match';
      recommendation = 'Move to technical interview immediately';
    } else if (overallScore >= 75) {
      status = 'Good Match';
      recommendation = 'Consider for technical interview';
    } else if (overallScore >= 60) {
      status = 'Potential Match';
      recommendation = 'Conduct short HR screening call';
    } else {
      status = 'Poor Match';
      recommendation = 'Do not advance';
    }

    // Strengths & Gaps
    const strengths = [];
    const gaps = [];
    
    // Skill strengths
    if (rawResult.matcher.skillsMatched && rawResult.matcher.skillsMatched.length > 0) {
      strengths.push(`Strong skills in: ${rawResult.matcher.skillsMatched.slice(0, 3).join(', ')}`);
    }
    if (expScore >= 80) {
      strengths.push('Solid experience level matching job requirements');
    }
    if (cultureScore >= 80) {
      strengths.push('High cultural alignment and values fit');
    }

    // Skill gaps
    if (rawResult.matcher.skillsMissing && rawResult.matcher.skillsMissing.length > 0) {
      gaps.push(`Missing core requirements: ${rawResult.matcher.skillsMissing.slice(0, 3).join(', ')}`);
    } else if (rawResult.matcher.skillsMatched && rawResult.matcher.skillsMatched.length < 3) {
      gaps.push('Limited set of matching skills mentioned in resume');
    }
    if (expScore < 70) {
      gaps.push('Fewer years of experience than desired for this role');
    }

    // 5. Generate tailored Interview Questions
    const suggestedQuestions = [];
    
    // Add technical questions based on missing skills
    if (rawResult.matcher.skillsMissing && rawResult.matcher.skillsMissing.length > 0) {
      rawResult.matcher.skillsMissing.slice(0, 2).forEach(skill => {
        suggestedQuestions.push(`We noticed ${skill} is a key requirement but not explicitly highlighted in your profile. What is your experience with it, and have you used similar frameworks?`);
      });
    } else {
      suggestedQuestions.push('How do you approach learning and integrating new technologies when starting a complex project?');
    }

    // Add behavioral questions based on red flags
    if (rawResult.flags.flags && rawResult.flags.flags.length > 0) {
      rawResult.flags.flags.forEach(flag => {
        if (flag.type === 'employment_gap') {
          suggestedQuestions.push('Could you walk us through the career break in your timeline, and describe any projects or skills you focused on during that time?');
        } else if (flag.type === 'frequent_job_changes') {
          suggestedQuestions.push('Your timeline shows several short-term engagements. What are your long-term career aspirations, and what are you looking for in your next role to stay engaged long-term?');
        }
      });
    }

    // Add generic team/values question
    suggestedQuestions.push('Tell us about a time when you had to resolve a technical disagreement with a team member. How did you handle it and what was the outcome?');

    // 6. Save results to database (insert or update)
    const evaluationId = `eval_${candidateId.substring(5)}`;
    
    const scoresPayload = JSON.stringify({
      skillMatch: skillScore,
      experienceAlignment: expScore,
      cultureFit: cultureScore,
      riskAssessment: riskScore
    });

    // Check if evaluation already exists
    const existingEval = await dbQuery.get('SELECT * FROM evaluations WHERE id = ?', [evaluationId]);
    if (existingEval) {
      await dbQuery.run(
        `UPDATE evaluations 
         SET overall_score = ?, scores = ?, rank = 0, status = ?, recommendation = ?, strengths = ?, gaps = ?, red_flags = ?, suggested_questions = ?, completed_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [
          overallScore,
          scoresPayload,
          status,
          recommendation,
          JSON.stringify(strengths),
          JSON.stringify(gaps),
          JSON.stringify(rawResult.flags.flags || []),
          JSON.stringify(suggestedQuestions),
          evaluationId
        ]
      );
    } else {
      await dbQuery.run(
        `INSERT INTO evaluations 
         (id, job_id, candidate_id, overall_score, scores, rank, status, recommendation, strengths, gaps, red_flags, suggested_questions)
         VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?)`,
        [
          evaluationId,
          jobId,
          candidateId,
          overallScore,
          scoresPayload,
          status,
          recommendation,
          JSON.stringify(strengths),
          JSON.stringify(gaps),
          JSON.stringify(rawResult.flags.flags || []),
          JSON.stringify(suggestedQuestions)
        ]
      );
    }

    // Update candidate status
    await dbQuery.run('UPDATE candidates SET status = ? WHERE id = ?', ['evaluated', candidateId]);

    // Recalculate ranks for all candidates evaluated for this job
    await recalculateJobRankings(jobId);

    // Create Audit Log entry
    await dbQuery.run(
      'INSERT INTO audit_logs (id, job_id, action, details) VALUES (?, ?, ?, ?)',
      [
        `audit_${Date.now()}_${Math.floor(Math.random()*1000)}`,
        jobId,
        'CANDIDATE_EVALUATION',
        JSON.stringify({
          candidateName: candidate.name,
          candidateId,
          overallScore,
          status
        })
      ]
    );

    logger.info(`Evaluation completed for Candidate: ${candidate.name} (Score: ${overallScore})`);
    return {
      evaluationId,
      overallScore,
      status,
      recommendation
    };
  } catch (error) {
    logger.error(`Evaluation failed for Candidate ID ${candidateId}: ${error.message}`);
    throw error;
  }
};

const recalculateJobRankings = async (jobId) => {
  try {
    // Get all evaluations sorted by overall_score descending
    const evals = await dbQuery.all(
      'SELECT id, overall_score FROM evaluations WHERE job_id = ? ORDER BY overall_score DESC',
      [jobId]
    );

    // Update each evaluation with its index rank (1-based)
    for (let i = 0; i < evals.length; i++) {
      await dbQuery.run(
        'UPDATE evaluations SET rank = ? WHERE id = ?',
        [i + 1, evals[i].id]
      );
    }
    logger.debug(`Recalculated rankings for Job: ${jobId}. Total candidates ranked: ${evals.length}`);
  } catch (err) {
    logger.error(`Error recalculating rankings for job ${jobId}: ${err.message}`);
  }
};

module.exports = {
  evaluateCandidate,
  recalculateJobRankings
};
