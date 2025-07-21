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


