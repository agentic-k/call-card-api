// Define sales framework types
export interface FrameworkQuestion {
  title: string;
  question: string;
}

export interface SalesFramework {
  framework_name: string;
  framework_description: string;
  framework_content: FrameworkQuestion[];
}

// Define available sales frameworks
export const MEDDIC: SalesFramework = {
  framework_name: "MEDDIC",
  framework_description: "A comprehensive sales qualification methodology",
  framework_content: [
    {
      title: "Metrics",
      question: "What measurable goals or KPIs are most important to you right now (e.g., revenue growth, cost reduction, productivity)?"
    },
    {
      title: "Economic Buyer",
      question: "Who is ultimately responsible for making the financial decision on this project or purchase?"
    },
    {
      title: "Decision Criteria",
      question: "What factors will you use to evaluate potential solutions and vendors?"
    },
    {
      title: "Decision Process",
      question: "Can you walk me through the steps you usually take when making a purchase like this?"
    },
    {
      title: "Identify Pain",
      question: "What challenges are you currently facing that are costing you time, money, or resources?"
    },
    {
      title: "Champion",
      question: "Who within your team is most motivated to solve this problem and would advocate for this solution internally?"
    }
  ]
};

export const BANT: SalesFramework = {
  framework_name: "BANT",
  framework_description: "Budget, Authority, Need, Timeline qualification",
  framework_content: [
    {
      title: "Budget",
      question: "What's your budget for this project?"
    },
    {
      title: "Authority",
      question: "Who makes the final decision?"
    },
    {
      title: "Need",
      question: "What problem are you trying to solve?"
    },
    {
      title: "Timeline",
      question: "When do you need this implemented?"
    }
  ]
};

// Export a map of all frameworks for easy access
export const FRAMEWORKS = {
  MEDDIC,
  BANT
};

// Export the default framework
export const DEFAULT_FRAMEWORK = MEDDIC;
