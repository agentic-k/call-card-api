import type { MeetingTemplate } from './types.ts'

export const mockCallPackData: MeetingTemplate = {
    "id": "6dfc20b3-5b7c-428c-96e0-5ded8b9449d7",
    "name": "Call Card Template",
    "description": "A structured call card template for sales calls.",
    "totalDurationMinutes": 27,
    "sections": [
        {
            "id": "ea99ae39-94c3-4925-b624-5d05e7a44c04",
            "title": "Introduction and Rapport Building",
            "durationMinutes": 3,
            "questions": [
                {
                    "id": "c674a53b-da1d-4b9f-a23e-3e761c3abe75",
                    "text": "Thank you for taking the time to speak with me today. How are things going in your industry right now?",
                    "checked": false
                },
                {
                    "id": "2b5af220-c9ec-491e-95fd-15fe0da5a785",
                    "text": "I've reviewed your company's recent initiatives, and I'm excited to discuss how our solutions can support your goals.",
                    "checked": false
                }
            ]
        },
        {
            "id": "f91a231a-b4b1-4452-b2d3-bd10c30f716e",
            "title": "Needs Assessment and Qualification",
            "durationMinutes": 5,
            "questions": [
                {
                    "id": "a02a1931-7eb4-4e28-acc2-f3e7e4ecafd6",
                    "text": "Can you share some of the challenges you're currently facing with your existing software solutions?",
                    "checked": false
                },
                {
                    "id": "166af2ca-f8a8-46b6-8969-c8d50edc4dda",
                    "text": "Who else would be involved in the decision-making process for this project?",
                    "checked": false
                },
                {
                    "id": "756282d9-4d1e-41f3-86d9-e1425439bfca",
                    "text": "What is your timeline for implementing a new solution?",
                    "checked": false
                },
                {
                    "id": "61aaa3c8-d523-4a32-a804-82aff6e77349",
                    "text": "Do you have a budget range in mind for this project?",
                    "checked": false
                }
            ]
        },
        {
            "id": "18f2bf5b-1a7b-46cd-8e3f-4e9129730c89",
            "title": "Solution Presentation",
            "durationMinutes": 8,
            "questions": [
                {
                    "id": "898a2fdd-dbad-4189-9ea7-d778ede0550a",
                    "text": "Our software typically helps companies like yours achieve a X% improvement in [specific metric] within [timeframe].",
                    "checked": false
                },
                {
                    "id": "99792fb8-1818-448f-86ab-e07cf97e2d50",
                    "text": "Here's how we differentiate from other solutions in the market...",
                    "checked": false
                },
                {
                    "id": "48d5edc1-8c59-4417-bc01-dfb05a4bb941",
                    "text": "Let me share a quick success story: [Brief case study relevant to the client's industry].",
                    "checked": false
                }
            ]
        },
        {
            "id": "e3b7274d-79b1-4d39-947c-207026ad3d93",
            "title": "Objection Handling and ROI Discussion",
            "durationMinutes": 5,
            "questions": [
                {
                    "id": "0b9e6d2b-7d5a-4b07-99e0-d9265f1a3487",
                    "text": "What concerns do you have about implementing a new software solution?",
                    "checked": false
                },
                {
                    "id": "7f3798b4-5816-4d53-b12b-fde90953343e",
                    "text": "Many of our clients initially had concerns about [common objection], but found that [solution].",
                    "checked": false
                },
                {
                    "id": "c7671500-5053-4d9e-be61-7fa9a7fc2990",
                    "text": "Considering the potential improvements, how do you see this impacting your bottom line?",
                    "checked": false
                }
            ]
        },
        {
            "id": "031e3187-492f-4cf6-9350-bce96e469e73",
            "title": "Closing and Next Steps",
            "durationMinutes": 4,
            "questions": [
                {
                    "id": "cb4035fc-bb7d-4fa3-8066-d5c4e96ba060",
                    "text": "Based on what we've discussed, do you see enough value to move forward with a trial or demo?",
                    "checked": false
                },
                {
                    "id": "50ec2382-bcd0-495e-bd0b-43131b2afe6f",
                    "text": "What would be the best next step for us to take together?",
                    "checked": false
                },
                {
                    "id": "780ed243-778d-4468-a740-d1bb22649970",
                    "text": "Can we schedule a follow-up meeting to discuss this with your team?",
                    "checked": false
                }
            ]
        },
        {
            "id": "67a97c8a-ddb4-492c-abb7-e0a5639e64c7",
            "title": "Wrap-Up and Follow-Up",
            "durationMinutes": 2,
            "questions": [
                {
                    "id": "6e72cc2f-b77d-4c90-a44f-b005ca6875c5",
                    "text": "I'll follow up with an email summarizing our conversation and the agreed next steps.",
                    "checked": false
                },
                {
                    "id": "17dfcfb4-f9aa-4bbb-8c8a-82c03ee5b880",
                    "text": "Thank you again for your time and consideration. I look forward to our next conversation.",
                    "checked": false
                }
            ]
        }
    ],
    "createdAt": "2025-05-25T11:36:15.336Z",
    "updatedAt": "2025-05-25T11:36:15.336Z"
}

/**
 * Helper function to check if mock data should be used
 * @returns boolean indicating whether to use mock data
 */
export function shouldUseMockData(): boolean {
    return Deno.env.get('USE_MOCK_DATA') === 'true'
}

/**
 * Returns mock call pack data
 * @returns MeetingTemplate mock data
 */
export function getMockCallPackData(): MeetingTemplate {
    return mockCallPackData
} 