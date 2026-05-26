const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 5000;
const BASE_URL = `http://localhost:${PORT}/api`;

const logSuccess = (message) => console.log(`\x1b[32m✔ SUCCESS: ${message}\x1b[0m`);
const logFail = (message) => console.error(`\x1b[31m✘ FAILED: ${message}\x1b[0m`);

const runTests = async () => {
  console.log('Starting Recruitment Pipeline Optimizer Integration Tests...');
  
  let token = '';
  let jobId = '';
  let candidateId = '';

  // 1. Authenticate / Login
  try {
    const res = await fetch(`${BASE_URL.replace('/api', '')}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'demo@berrywise.com', password: 'demo123' })
    });
    
    if (!res.ok) throw new Error(`Auth login failed: ${res.statusText}`);
    
    const data = await res.json();
    token = data.token;
    logSuccess('Authentication successful. JWT retrieved.');
  } catch (err) {
    logFail(`Auth failed: ${err.message}`);
    return;
  }

  // 2. Create Job Listing
  try {
    const res = await fetch(`${BASE_URL}/jobs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        title: 'Senior Full Stack Developer (Berrywise Test)',
        description: 'Testing evaluation flows.',
        requirements: {
          skills: ['Node.js', 'React', 'PostgreSQL', 'Docker'],
          yearsExperience: 5,
          education: "Bachelor's in CS"
        },
        companyValues: ['Innovation', 'Collaboration', 'Excellence']
      })
    });

    if (!res.ok) throw new Error(`Job creation failed: ${res.statusText}`);
    
    const data = await res.json();
    jobId = data.jobId;
    logSuccess(`Job created successfully. ID: ${jobId}`);
  } catch (err) {
    logFail(`Job creation: ${err.message}`);
    return;
  }

  // 3. Verify Job exists in listing
  try {
    const res = await fetch(`${BASE_URL}/jobs`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!res.ok) throw new Error(`Fetch jobs failed: ${res.statusText}`);
    
    const jobs = await res.json();
    const found = jobs.some(j => j.id === jobId);
    if (!found) throw new Error('Created job not found in listing.');
    logSuccess('Job listing verified. New job returned.');
  } catch (err) {
    logFail(`Job verification: ${err.message}`);
    return;
  }

  // 4. Ingest/Create Candidate
  // To avoid multipart complexity in node-fetch for files, we write a sample text resume file
  const testResumePath = path.join(__dirname, 'test-resume.txt');
  fs.writeFileSync(testResumePath, `
    JOHN DOE
    Email: john.doe@test.com
    Skills: Node.js, React, PostgreSQL, Docker, JavaScript
    Experience: 10 years experience as Software Developer
    Education: Bachelor of Science in Computer Science
    Timeline: Employment gap from Jan 2021 to July 2021 due to career break.
  `);

  try {
    // We will simulate file upload by calling the upload endpoint with mock candidate meta
    // In node we can construct FormData using the built-in global FormData in newer Node versions, 
    // or read the file and append it.
    const formData = new FormData();
    const fileBlob = new Blob([fs.readFileSync(testResumePath)], { type: 'text/plain' });
    formData.append('file', fileBlob, 'test-resume.txt');
    formData.append('jobId', jobId);
    formData.append('candidateName', 'John Doe');
    formData.append('candidateEmail', 'john.doe@test.com');

    const res = await fetch(`${BASE_URL}/candidates`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Candidate upload failed: ${res.statusText}. Response: ${errorText}`);
    }

    const data = await res.json();
    candidateId = data.candidateId;
    logSuccess(`Candidate uploaded successfully. ID: ${candidateId}`);
  } catch (err) {
    logFail(`Candidate upload: ${err.message}`);
    return;
  } finally {
    // clean up test file
    if (fs.existsSync(testResumePath)) {
      fs.unlinkSync(testResumePath);
    }
  }

  // 5. Trigger Candidate Evaluation
  try {
    const res = await fetch(`${BASE_URL}/evaluate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        jobId,
        candidateIds: [candidateId]
      })
    });

    if (!res.ok) throw new Error(`Evaluation failed: ${res.statusText}`);
    
    const data = await res.json();
    if (data.failedCount > 0) throw new Error(`Evaluation had failed items: ${JSON.stringify(data.errors)}`);
    logSuccess('Candidate evaluation triggered and completed.');
  } catch (err) {
    logFail(`Evaluation trigger: ${err.message}`);
    return;
  }

  // 6. Get Ranking Results
  try {
    const res = await fetch(`${BASE_URL}/results/${jobId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!res.ok) throw new Error(`Fetch results failed: ${res.statusText}`);

    const data = await res.json();
    if (data.candidates.length === 0) throw new Error('Rankings list is empty.');
    
    const cand = data.candidates[0];
    logSuccess(`Results ranked. Candidate: ${cand.name}, Rank: ${cand.rank}, Score: ${cand.overallScore}%`);
    console.log(`- Status: ${cand.status}`);
    console.log(`- Recommendation: ${cand.recommendation}`);
    console.log(`- Flags detected: ${JSON.stringify(cand.redFlags)}`);
    console.log(`- Tailored Prep Qs count: ${cand.suggestedQuestions.length}`);
  } catch (err) {
    logFail(`Fetch results: ${err.message}`);
    return;
  }

  // 7. Get Audit Logs
  try {
    const res = await fetch(`${BASE_URL}/audit/${jobId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!res.ok) throw new Error(`Fetch audit failed: ${res.statusText}`);

    const audit = await res.json();
    if (audit.length === 0) throw new Error('Audit trail log list is empty.');
    logSuccess(`Audit logs verified. Total log events: ${audit.length}`);
  } catch (err) {
    logFail(`Fetch audit: ${err.message}`);
    return;
  }

  console.log('\n\x1b[32m✔ ALL INTEGRATION TESTS COMPLETED SUCCESSFULLY!\x1b[0m');
};

runTests();
