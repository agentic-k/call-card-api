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

export interface MeetingTemplate {
    id?: string;
    name: string;
    description: string;
    useCases: UseCase[];
    painPoints: PainPoint[];
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
