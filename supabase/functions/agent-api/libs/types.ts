// Types for meeting templates
export interface ChecklistItem {
    id: string;
    text: string;
    checked: boolean;
}

export interface MeetingSection {
    id: string;
    title: string;
    durationMinutes: number;
    questions: ChecklistItem[];
}

export interface MeetingTemplate {
    id: string;
    name: string;
    description: string;
    totalDurationMinutes: number;
    sections: MeetingSection[];
    createdAt: string;
    updatedAt: string;
}

export interface AITemplateRequest {
    templateContext: string;
    linkedinProfileData?: any;
    linkedinCompanyData?: any;
}

export interface APIResponse {
    name: string;
    description: string;
    totalDurationMinutes: number;
    sections: Array<{
        title: string;
        durationMinutes: number;
        questions: Array<{
            text: string;
        }>;
    }>;
}
