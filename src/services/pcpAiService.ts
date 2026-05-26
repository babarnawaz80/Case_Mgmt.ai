const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

export interface ExtractedPcpData {
  goodLife: string;
  importantTo: string[];
  importantFor: string[];
  goals: Array<{
    title: string;
    description: string;
    status: string;
    targetDate: string;
    responsible: string;
  }>;
  focusValues: Record<string, string>;
  emergencyPlan: string;
  servicesNotes: string;
  rightsNotes: string;
  teamNotes: string;
  bspNotes: string;
  chartItems: string[];
}

export async function extractPcpDataFromPdfs(
  filesData: { name: string; base64: string }[],
  planType: string
): Promise<ExtractedPcpData> {
  const promptText = `
You are a highly analytical Case Management AI. Your job is to read the attached PDF documents (e.g., prior PCPs, SIS assessments, HRST, notes) and generate a comprehensive draft for a Person-Centered Plan (PCP).
The plan type is: ${planType}.

Please extract and synthesize the following information into a strict JSON format matching this schema:
{
  "goodLife": "A detailed paragraph describing the person's vision for a good life, written in their own words or perspective based on the documents.",
  "importantTo": ["Array of 3-5 short strings detailing what is important TO the person (preferences, relationships)"],
  "importantFor": ["Array of 3-5 short strings detailing what is important FOR the person (health, safety, requirements)"],
  "goals": [
    {
      "title": "Short goal title",
      "description": "Detailed description and expected outcomes",
      "status": "New goal",
      "targetDate": "YYYY-MM-DD",
      "responsible": "Who is responsible (e.g. Case Manager, Provider)"
    }
  ],
  "focusValues": {
    "employment": "Employment goals/status",
    "community": "Community integration goals",
    "health": "Health and wellness goals",
    "housing": "Housing goals",
    "relationships": "Relationships and social goals",
    "education": "Education/training goals"
  },
  "emergencyPlan": "Emergency backup plan details",
  "servicesNotes": "Extracted services and natural supports",
  "rightsNotes": "Any notes on rights/responsibilities",
  "teamNotes": "Extracted team members (Names, Roles)",
  "bspNotes": "Any behavior support or legal restrictions",
  "chartItems": ["Array of 5-8 short summary bullet points (e.g., 'Found 3 goals', 'HRST score extracted') to show what was found in the documents"]
}

Return ONLY a valid JSON object. Do not include markdown formatting or backticks like \`\`\`json.
`;

  const parts: any[] = [
    { text: promptText }
  ];

  for (const file of filesData) {
    if (file.base64) {
      parts.push({
        inlineData: {
          mimeType: "application/pdf",
          data: file.base64
        }
      });
    }
  }

  const body = {
    contents: [
      {
        role: "user",
        parts: parts
      }
    ],
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 8192,
      responseMimeType: "application/json"
    }
  };

  const res = await fetch(GEMINI_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini API error: ${errText}`);
  }

  const data = await res.json();
  const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawText) throw new Error("Empty response from Gemini");

  return JSON.parse(rawText.trim());
}
