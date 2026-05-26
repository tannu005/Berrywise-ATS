export interface Job {
  id: string;
  title: string;
  description: string;
  requirements: {
    skills: string[];
    experience: string;
  };
}

export interface ScoreDetails {
  overallScore: number;
  skillMatch: number;
  cultureFit: number;
}

export interface Candidate {
  candidateId: string;
  name: string;
  status: string;
  scores: ScoreDetails;
  overallScore?: number;
  strengths?: string[];
  gaps?: string[];
  resumeText?: string;
}

export interface EvaluationData {
  summary: {
    strongMatches: number;
    potentialMatches: number;
    poorMatches: number;
  };
  candidates: Candidate[];
}

export interface AuditLog {
  id: string;
  jobId: string;
  action: string;
  timestamp: string;
  details?: any;
}
