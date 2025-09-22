export interface CallScoringRequest {
  framework: string;
  content: any;
  transcript: string;
}

export interface FrameworkQuestion {
  id: string;
  text: string;
  covered: boolean;
}

export interface FrameworkSection {
  title: string;
  questions: FrameworkQuestion[];
}

export interface CallScoringResponse {
  sections: FrameworkSection[];
}
