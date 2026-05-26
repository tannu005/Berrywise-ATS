const express = require('express');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const { createServer } = require('http');
const { Server } = require('socket.io');
const { ApolloServer, gql } = require('apollo-server-express');
const NodeCache = require('node-cache');

// Load environment variables
dotenv.config();

// Global Cache (In-Memory Redis Mock)
const appCache = new NodeCache({ stdTTL: 100, checkperiod: 120 });
global.appCache = appCache;

const logger = require('./utils/logger');
const { initializeDatabase, dbQuery } = require('./utils/database');
const { generateToken } = require('./middleware/auth');
const errorHandler = require('./middleware/errorHandler');

// Initialize express app
const app = express();
const PORT = process.env.PORT || 5000;

// Create HTTP Server
const httpServer = createServer(app);

// Initialize Socket.io
const io = new Server(httpServer, {
  cors: {
    origin: '*',
  }
});

app.set('io', io); // Pass IO instance to routes

io.on('connection', (socket) => {
  logger.info(`Socket client connected: ${socket.id}`);
  socket.on('disconnect', () => {
    logger.info(`Socket client disconnected: ${socket.id}`);
  });
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files statically (in case recruiters want to download resumes)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
const jobsRouter = require('./routes/jobs');
const candidatesRouter = require('./routes/candidates');
const evaluationsRouter = require('./routes/evaluations');
const auditRouter = require('./routes/audit');
const notesRouter = require('./routes/notes');

app.use('/api/jobs', jobsRouter);
app.use('/api/candidates', candidatesRouter);
app.use('/api', evaluationsRouter);
app.use('/api/audit', auditRouter);
app.use('/api/notes', notesRouter);

// Auth register endpoint
app.post('/api/auth/register', async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }

    const existingUser = await dbQuery.get('SELECT * FROM users WHERE email = ?', [email]);
    if (existingUser) {
      return res.status(409).json({ error: 'Email already in use.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = `user_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    await dbQuery.run(
      'INSERT INTO users (id, name, email, password, role) VALUES (?, ?, ?, ?, ?)',
      [userId, name, email, hashedPassword, 'recruiter']
    );

    const token = generateToken({ id: userId, email, role: 'recruiter' });
    logger.info(`New user registered: ${email}`);
    
    res.status(201).json({
      token,
      user: {
        id: userId,
        name,
        email,
        role: 'recruiter'
      }
    });
  } catch (error) {
    next(error);
  }
});

// Auth login endpoint
app.post('/api/auth/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const user = await dbQuery.get('SELECT * FROM users WHERE email = ?', [email]);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = generateToken({ id: user.id, email: user.email, role: user.role });
    logger.info(`User logged in: ${email}`);
    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    next(error);
  }
});

// App Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// GraphQL Setup
const typeDefs = gql`
  type Query {
    hello: String
    jobs: [Job]
  }
  type Job {
    id: String
    title: String
    description: String
    teamSize: Int
    reportingTo: String
  }
  
  type ScoreDetails {
    overallScore: Int
    skillMatch: Int
    cultureFit: Int
  }
  
  type Candidate {
    id: String
    jobId: String
    name: String
    email: String
    status: String
    resumeText: String
    scores: ScoreDetails
    strengths: [String]
    gaps: [String]
  }

  type Query {
    hello: String
    jobs: [Job]
    candidates(jobId: String!): [Candidate]
  }
`;

const resolvers = {
  Query: {
    hello: () => 'GraphQL is running!',
    jobs: async () => {
      const cachedJobs = global.appCache.get('all_jobs');
      if (cachedJobs) return cachedJobs;
      const jobs = await dbQuery.all('SELECT * FROM jobs');
      global.appCache.set('all_jobs', jobs);
      return jobs;
    },
    candidates: async (_, { jobId }) => {
      const cached = global.appCache.get(`candidates_${jobId}`);
      if (cached) return cached;
      const candidates = await dbQuery.all('SELECT * FROM candidates WHERE job_id = ? ORDER BY overall_score DESC', [jobId]);
      
      const formatted = candidates.map(c => ({
        id: c.id,
        jobId: c.job_id,
        name: c.name,
        email: c.email,
        status: c.status,
        resumeText: c.resume_text,
        scores: {
          overallScore: c.overall_score,
          skillMatch: c.skill_match_score,
          cultureFit: c.culture_fit_score
        },
        strengths: c.strengths ? JSON.parse(c.strengths) : [],
        gaps: c.gaps ? JSON.parse(c.gaps) : []
      }));
      
      global.appCache.set(`candidates_${jobId}`, formatted);
      return formatted;
    }
  }
};

const apolloServer = new ApolloServer({ typeDefs, resolvers });

// Frontend Error Logger
app.post('/api/log-error', (req, res) => {
  console.log('\n\n=== BROWSER ERROR ===\n', req.body, '\n=====================\n');
  res.sendStatus(200);
});

// Global Error Handler
app.use(errorHandler);

// Connect DB, Apollo, and Start Server
const startServer = async () => {
  try {
    await initializeDatabase();
    
    // Start Apollo Server
    await apolloServer.start();
    apolloServer.applyMiddleware({ app });

    httpServer.listen(PORT, () => {
      logger.info(`Recruitment backend running on http://localhost:${PORT}`);
      logger.info(`GraphQL ready at http://localhost:${PORT}${apolloServer.graphqlPath}`);
      logger.info(`Socket.IO server running`);
    });
  } catch (error) {
    logger.error(`Failed to start server: ${error.message}`);
    process.exit(1);
  }
};

startServer();
