const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

const getTransporter = async (userId) => {
  const { dbQuery } = require('../utils/database');

  if (userId) {
    try {
      const settings = await dbQuery.get('SELECT * FROM smtp_settings WHERE user_id = ?', [userId]);
      if (settings) {
        logger.info(`Using database configured SMTP transporter for user ${userId}.`);
        return nodemailer.createTransport({
          host: settings.host,
          port: parseInt(settings.port),
          secure: settings.secure === 1,
          auth: {
            user: settings.user,
            pass: settings.pass,
          },
        });
      }
    } catch (dbErr) {
      logger.error(`Failed to load SMTP settings from DB for user ${userId}: ${dbErr.message}`);
    }
  }

  // Fallback to env SMTP settings
  const hasEnvConfig = process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS;
  if (hasEnvConfig) {
    logger.info('Using env configured SMTP transporter.');
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  // Fallback to Ethereal
  logger.info('Creating test Ethereal SMTP transporter on localhost...');
  const testAccount = await nodemailer.createTestAccount();
  const transporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
  });
  transporter.isTest = true;
  transporter.testAccount = testAccount;
  return transporter;
};

/**
 * Sends a gorgeous candidate report and evaluation HTML email to the recruiter.
 */
const sendCandidateReportEmail = async ({ recruiterEmail, candidate, evaluation, job, userId }) => {
  const mailTransporter = await getTransporter(userId);
  
  // Find customized sender address
  let fromEmail = 'noreply@berrywise-ats.com';
  let isTestMode = true;

  if (userId) {
    const { dbQuery } = require('../utils/database');
    try {
      const settings = await dbQuery.get('SELECT from_email FROM smtp_settings WHERE user_id = ?', [userId]);
      if (settings && settings.from_email) {
        fromEmail = settings.from_email;
        isTestMode = false; // Successfully using recruiter's custom SMTP configuration
      }
    } catch (e) {
      logger.error(`Error fetching sender email from DB: ${e.message}`);
    }
  }

  if (isTestMode) {
    if (process.env.SMTP_FROM) {
      fromEmail = process.env.SMTP_FROM;
      isTestMode = false;
    } else if (mailTransporter.testAccount) {
      fromEmail = mailTransporter.testAccount.user;
    }
  }

  const overallScore = evaluation.overall_score || 0;
  
  // Format matching badge details
  let matchBadgeColor = '#f59e0b';
  let matchBadgeBg = '#fef3c7';
  let matchText = 'Potential Match';

  if (overallScore >= 85) {
    matchBadgeColor = '#10b981';
    matchBadgeBg = '#d1fae5';
    matchText = 'Strong Match';
  } else if (overallScore >= 70) {
    matchBadgeColor = '#0d9488';
    matchBadgeBg = '#ccfbf1';
    matchText = 'Good Match';
  } else if (overallScore < 50) {
    matchBadgeColor = '#ef4444';
    matchBadgeBg = '#fee2e2';
    matchText = 'Poor Match';
  }

  // Parse JSON properties safely
  const scoresObj = typeof evaluation.scores === 'string' ? JSON.parse(evaluation.scores || '{}') : (evaluation.scores || {});
  const strengths = typeof evaluation.strengths === 'string' ? JSON.parse(evaluation.strengths || '[]') : (evaluation.strengths || []);
  const gaps = typeof evaluation.gaps === 'string' ? JSON.parse(evaluation.gaps || '[]') : (evaluation.gaps || []);
  const redFlags = typeof evaluation.red_flags === 'string' ? JSON.parse(evaluation.red_flags || '[]') : (evaluation.red_flags || []);
  const suggestedQuestions = typeof evaluation.suggested_questions === 'string' ? JSON.parse(evaluation.suggested_questions || '[]') : (evaluation.suggested_questions || []);

  const skillMatch = scoresObj.skillMatch || 0;
  const experienceAlignment = scoresObj.experienceAlignment || 0;
  const cultureFit = scoresObj.cultureFit || 0;
  const riskAssessment = scoresObj.riskAssessment || 0;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Candidate Evaluation Report - ${candidate.name}</title>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background-color: #f7f9fc;
            margin: 0;
            padding: 0;
            color: #333333;
          }
          .container {
            max-width: 650px;
            margin: 30px auto;
            background-color: #ffffff;
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 10px 30px rgba(0,0,0,0.05);
            border: 1px solid #eef2f6;
          }
          .header {
            background: linear-gradient(135deg, #1e1b4b 0%, #311042 100%);
            padding: 35px;
            text-align: center;
            color: #ffffff;
          }
          .logo-text {
            font-size: 24px;
            font-weight: bold;
            letter-spacing: 1px;
            margin: 0;
            color: #f472b6;
          }
          .subtitle {
            font-size: 13px;
            opacity: 0.8;
            margin: 5px 0 0 0;
            text-transform: uppercase;
            letter-spacing: 1.5px;
          }
          .content {
            padding: 35px;
          }
          .candidate-card {
            background-color: #f8fafc;
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 25px;
            border: 1px solid #e2e8f0;
          }
          .candidate-title {
            margin: 0 0 10px 0;
            font-size: 20px;
            color: #1e1b4b;
          }
          .meta-item {
            font-size: 13px;
            color: #64748b;
            margin: 4px 0;
          }
          .badge {
            display: inline-block;
            padding: 5px 12px;
            font-size: 11px;
            font-weight: bold;
            border-radius: 20px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .score-circle-container {
            text-align: center;
            margin: 30px 0;
          }
          .score-circle {
            display: inline-block;
            width: 110px;
            height: 110px;
            line-height: 110px;
            border-radius: 50%;
            background: linear-gradient(135deg, #ec4899 0%, #f97316 100%);
            color: white;
            font-size: 32px;
            font-weight: bold;
            box-shadow: 0 6px 15px rgba(236, 72, 153, 0.3);
          }
          .section-title {
            font-size: 16px;
            font-weight: bold;
            color: #1e1b4b;
            border-bottom: 2px solid #f1f5f9;
            padding-bottom: 8px;
            margin-top: 30px;
            margin-bottom: 15px;
          }
          .bar-container {
            margin-bottom: 12px;
          }
          .bar-label {
            font-size: 13px;
            font-weight: 600;
            color: #475569;
            margin-bottom: 4px;
            display: flex;
            justify-content: space-between;
          }
          .bar-bg {
            height: 8px;
            background-color: #f1f5f9;
            border-radius: 4px;
            overflow: hidden;
          }
          .bar-fill {
            height: 100%;
            border-radius: 4px;
            background-color: #0d9488;
          }
          .bullets {
            margin: 0;
            padding-left: 20px;
          }
          .bullets li {
            font-size: 13px;
            color: #334155;
            margin-bottom: 8px;
            line-height: 1.5;
          }
          .strength-item::marker {
            color: #10b981;
          }
          .gap-item::marker {
            color: #f59e0b;
          }
          .redflag-item::marker {
            color: #ef4444;
          }
          .recommendation-box {
            background-color: #e0f2fe;
            border-left: 4px solid #0284c7;
            padding: 15px;
            border-radius: 0 8px 8px 0;
            font-size: 13px;
            color: #0369a1;
            line-height: 1.6;
          }
          .footer {
            background-color: #f8fafc;
            padding: 20px 35px;
            text-align: center;
            border-top: 1px solid #f1f5f9;
            font-size: 11px;
            color: #94a3b8;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo-text">BERRYWISE</div>
            <div class="subtitle">Candidate Evaluation Report</div>
          </div>
          <div class="content">
            <div class="candidate-card">
              <h2 class="candidate-title">${candidate.name}</h2>
              <div class="meta-item"><strong>Job Position:</strong> ${job.title}</div>
              <div class="meta-item"><strong>Email:</strong> ${candidate.email}</div>
              <div class="meta-item"><strong>Ingestion Date:</strong> ${new Date(candidate.uploaded_at || Date.now()).toLocaleDateString()}</div>
              <div class="meta-item" style="margin-top: 10px;">
                <span class="badge" style="background-color: ${matchBadgeBg}; color: ${matchBadgeColor};">
                  ${matchText}
                </span>
              </div>
            </div>

            <div class="score-circle-container">
              <div class="score-circle">${overallScore}%</div>
              <p style="margin: 8px 0 0 0; font-size: 13px; color: #64748b; font-weight: 600;">Overall Match Score</p>
            </div>

            <div class="section-title">Evaluation Breakdown</div>
            
            <div class="bar-container">
              <div class="bar-label"><span>Technical Skills</span> <span>${skillMatch}%</span></div>
              <div class="bar-bg"><div class="bar-fill" style="width: ${skillMatch}%; background-color: #6366F1;"></div></div>
            </div>
            
            <div class="bar-container">
              <div class="bar-label"><span>Experience Alignment</span> <span>${experienceAlignment}%</span></div>
              <div class="bar-bg"><div class="bar-fill" style="width: ${experienceAlignment}%; background-color: #3b82f6;"></div></div>
            </div>
            
            <div class="bar-container">
              <div class="bar-label"><span>Culture Fit</span> <span>${cultureFit}%</span></div>
              <div class="bar-bg"><div class="bar-fill" style="width: ${cultureFit}%; background-color: #ec4899;"></div></div>
            </div>
            
            <div class="bar-container">
              <div class="bar-label"><span>Risk Check</span> <span>${riskAssessment}%</span></div>
              <div class="bar-bg"><div class="bar-fill" style="width: ${riskAssessment}%; background-color: #14b8a6;"></div></div>
            </div>

            <div class="section-title">AI Fit Recommendation</div>
            <div class="recommendation-box">
              ${evaluation.recommendation || 'No recommendation summary provided.'}
            </div>

            ${strengths.length > 0 ? `
              <div class="section-title">Key Strengths</div>
              <ul class="bullets">
                ${strengths.map(s => `<li class="strength-item"><strong>${s.title || s.name || s.heading || 'Strength'}:</strong> ${s.details || s.description || s}</li>`).join('')}
              </ul>
            ` : ''}

            ${gaps.length > 0 ? `
              <div class="section-title">Key Gaps & Development Areas</div>
              <ul class="bullets">
                ${gaps.map(g => `<li class="gap-item"><strong>${g.title || g.name || g.heading || 'Gap'}:</strong> ${g.details || g.description || g}</li>`).join('')}
              </ul>
            ` : ''}

            ${redFlags.length > 0 ? `
              <div class="section-title" style="color: #ef4444;">Red Flags / Concerns</div>
              <ul class="bullets">
                ${redFlags.map(rf => `<li class="redflag-item"><strong>${rf.title || rf.name || rf.heading || 'Concern'}:</strong> ${rf.details || rf.description || rf}</li>`).join('')}
              </ul>
            ` : ''}

            ${suggestedQuestions.length > 0 ? `
              <div class="section-title">Suggested Interview Questions</div>
              <ul class="bullets" style="padding-left: 20px; list-style-type: decimal;">
                ${suggestedQuestions.map(q => `<li style="margin-bottom: 10px; font-size: 13px; line-height: 1.5; color: #334155;">${q}</li>`).join('')}
              </ul>
            ` : ''}

          </div>
          <div class="footer">
            This report was auto-generated and dispatched securely by the Berrywise ATS Optimizer.<br>
            &copy; 2026 Berrywise Recruitment Systems. All rights reserved.
          </div>
        </div>
      </body>
    </html>
  `;

  const mailOptions = {
    from: `"Berrywise ATS" <${fromEmail}>`,
    to: recruiterEmail,
    subject: `[Evaluation Report] ${candidate.name} - ${overallScore}% Match for ${job.title}`,
    html: htmlContent,
  };

  const info = await mailTransporter.sendMail(mailOptions);
  
  let previewUrl = null;
  if (mailTransporter.isTest) {
    previewUrl = nodemailer.getTestMessageUrl(info);
    logger.info(`Test email sent successfully! Message ID: ${info.messageId}`);
    logger.info(`Ethereal Email Preview URL: ${previewUrl}`);
  } else {
    logger.info(`Real email dispatched successfully via SMTP! Message ID: ${info.messageId}`);
  }

  return {
    success: true,
    messageId: info.messageId,
    previewUrl,
    isTest: isTestMode,
    recipient: recruiterEmail
  };
};

const sendPasswordResetEmail = async ({ email, code }) => {
  const mailTransporter = await getTransporter(null); 
  const fromEmail = process.env.SMTP_FROM || (mailTransporter.testAccount ? mailTransporter.testAccount.user : 'noreply@berrywise-ats.com');

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Your Password - Berrywise ATS</title>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background-color: #f7f9fc;
            margin: 0;
            padding: 0;
            color: #333333;
          }
          .container {
            max-width: 550px;
            margin: 30px auto;
            background-color: #ffffff;
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 10px 30px rgba(0,0,0,0.05);
            border: 1px solid #eef2f6;
          }
          .header {
            background: linear-gradient(135deg, #1e1b4b 0%, #311042 100%);
            padding: 30px;
            text-align: center;
            color: #ffffff;
          }
          .logo-text {
            font-size: 22px;
            font-weight: bold;
            letter-spacing: 1px;
            margin: 0;
            color: #f472b6;
          }
          .content {
            padding: 30px;
            text-align: center;
          }
          .code-box {
            font-family: 'Courier New', Courier, monospace;
            font-size: 36px;
            font-weight: bold;
            letter-spacing: 6px;
            color: #ec4899;
            background-color: #f8fafc;
            padding: 15px 25px;
            border-radius: 12px;
            border: 1px dashed #e2e8f0;
            display: inline-block;
            margin: 25px 0;
          }
          .instruction {
            font-size: 14px;
            color: #475569;
            line-height: 1.6;
            margin: 10px 0;
          }
          .footer {
            background-color: #f8fafc;
            padding: 20px;
            text-align: center;
            border-top: 1px solid #f1f5f9;
            font-size: 11px;
            color: #94a3b8;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo-text">BERRYWISE</div>
            <p style="margin: 5px 0 0 0; font-size: 12px; opacity: 0.8; text-transform: uppercase; letter-spacing: 1px;">Security Verification</p>
          </div>
          <div class="content">
            <h2 style="color: #1e1b4b; margin-top: 0;">Password Reset Request</h2>
            <p class="instruction">We received a request to reset the password for your recruiter account. Use the secure 6-digit verification code below to authorize this change:</p>
            <div class="code-box">${code}</div>
            <p class="instruction" style="font-size: 12px; color: #ef4444;">* Note: This code is highly confidential and will expire in <strong>15 minutes</strong>. If you did not make this request, please ignore this email.</p>
          </div>
          <div class="footer">
            This verification code was securely generated by the Berrywise ATS Optimizer.<br>
            &copy; 2026 Berrywise Recruitment Systems. All rights reserved.
          </div>
        </div>
      </body>
    </html>
  `;

  const mailOptions = {
    from: `"Berrywise Security" <${fromEmail}>`,
    to: email,
    subject: `[Berrywise ATS] Password Reset Code: ${code}`,
    html: htmlContent,
  };

  const info = await mailTransporter.sendMail(mailOptions);
  
  let previewUrl = null;
  if (mailTransporter.isTest) {
    previewUrl = nodemailer.getTestMessageUrl(info);
    logger.info(`Verification code sent! Message ID: ${info.messageId}`);
    logger.info(`Ethereal Reset Preview URL: ${previewUrl}`);
  } else {
    logger.info(`Verification code sent via SMTP! Message ID: ${info.messageId}`);
  }

  return {
    success: true,
    messageId: info.messageId,
    previewUrl,
    isTest: !!mailTransporter.isTest,
    recipient: email
  };
};

module.exports = {
  sendCandidateReportEmail,
  sendPasswordResetEmail
};
