
export type UserRole = 'advocate' | 'client';
export type AgentType = 'research' | 'analysis' | 'procedure' | 'compliance' | 'scribe' | 'safety' | 'scheduler';
export type ViewMode = 'chat' | 'history' | 'profile' | 'settings' | 'help' | 'cases' | 'documents';

export interface User {
  id: string;
  email: string;
  password?: string;
  fullName: string;
  role: UserRole;
  createdAt: Date;
}

export interface AuthSession {
  user: User;
  token: string;
  loginTime: Date;
}

export interface SafetyMetrics {
  riskScore: number; // 0-100
  confidence: number; // 0-100
  repealCheck: 'passed' | 'failed' | 'n/a';
  jurisdictionStatus: 'verified' | 'unverified';
  penaltyPrediction?: string;
  evidenceGaps?: string[];
  reason: string;
  decision: 'CONFIDENT' | 'CAUTION' | 'REFUSAL' | 'ESCALATE';
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  attachments?: FileAttachment[];
  agentUsed?: AgentType;
  safety?: SafetyMetrics;
}

export interface FileAttachment {
  name: string;
  type: string;
  data: string; // base64
}

export interface Notification {
  id: string;
  userId?: string; // Isolated to specific user
  text: string;
  type: 'urgent' | 'info' | 'warning';
  timestamp: Date;
  isRead: boolean;
}

export interface DailyCase {
  id: string;
  userId?: string; // Isolated to specific user
  title: string;
  caseType: string;
  cnr: string;
  court: string;
  hall: string;
  time: string;
  stage: string;
  risk: 'low' | 'medium' | 'high';
  nextStep: string;
  session: 'Morning' | 'Afternoon' | 'Evening';
  petitioner: string;
  respondent: string;
  description: string;
  lastOrderDate: string;
  nextHearingDate: string;
  requiredDocuments: string[];
}

export interface CaseSession {
  id: string;
  userId?: string; // Isolated to specific user
  caseId?: string; 
  title: string;
  messages: Message[];
  createdAt: Date;
  role: UserRole;
  isPinned?: boolean;
}
