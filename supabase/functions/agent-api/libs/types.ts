// Types for meeting templates
export interface Question {
    id?: string;
    text: string;
    checked?: boolean;
}

export interface UseCase {
    id?: string;
    title: string;
    description: string;
    questions: Question[];
}

export interface PainPoint {
    id?: string;
    title: string;
    description: string;
    questions: Question[];
}

export interface MeetingSection {
    id: string;
    title: string;
    durationMinutes: number;
    questions: Question[];
}

export interface MeetingTemplate {
    id?: string;
    name: string;
    description: string;
    useCases?: UseCase[];
    painPoints?: PainPoint[];
    totalDurationMinutes?: number;
    sections?: MeetingSection[];
    createdAt?: string;
    updatedAt?: string;
}

export interface AITemplateRequest {
    clientCompanyUrl?: string;
    prospectLinkedinUrl?: string;
    prospectCompanyUrl?: string;
    callCardContext?: string;
}

export interface APIResponse {
    name: string;
    description: string;
    useCases: Array<{
        title: string;
        description: string;
        questions: Array<{
            text: string;
        }>;
    }>;
    painPoints: Array<{
        title: string;
        description: string;
        questions: Array<{
            text: string;
        }>;
    }>;
}

// Input payload sent to the lead-scoring agent
export interface LeadScoringRequest {
  framework: string;
  questions: string[];
  transcript: {
    turns: Array<{
      speaker: string;
      text: string;
    }>;
  };
}

// Output payload returned by the lead-scoring agent
export interface LeadScoringResponse {
  framework: string;
  questions: Array<{
    question: string;
    status:
      | "answered_by_buyer"
      | "answered_via_confirmation"
      | "partial_or_unclear"
      | "unanswered";
    asked: boolean;
    confidence: number; // 0.0–1.0, two-decimal precision on the wire
    evidence: string;
    turn_ids: number[];
  }>;
  nextBestQuestions: string[];
  summary: string;
}
