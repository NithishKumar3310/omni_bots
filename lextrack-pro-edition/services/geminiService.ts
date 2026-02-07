
import { GoogleGenAI, Type } from "@google/genai";
import { Message, FileAttachment, UserRole, AgentType } from "../types";

const SYSTEM_PROMPT = (role: UserRole) => `
You are the LexTrack Multi-Agent Legal Orchestrator for Indian Law (BNS/BNSS/BSA). 
Your intelligence is partitioned into 7 specialized "Edge" Agents.

AGENT PROTOCOLS:
1. RESEARCH: Cross-reference repealed IPC/CrPC with BNS/BNSS. Verify citation validity.
2. ANALYSIS: Risk-score every clause. Flag one-sided terms.
3. PROCEDURE: Verify Jurisdiction vs location. Calculate deadlines.
4. COMPLIANCE: Predict financial penalties for non-compliance.
5. SCRIBE: Check for factual contradictions and missing evidence.
6. SELF-DOUBT: If confidence < 60%, suggest advocate escalation.
7. SCHEDULER: Identify hearing gaps and trigger critical reviews.

RESPONSE ARCHITECTURE (JSON MANDATORY):
{
  "agent_type": "one of the 7 types",
  "answer": "Markdown formatted legal response...",
  "safety_metrics": {
    "riskScore": 0-100,
    "confidence": 0-100,
    "repealCheck": "passed|failed|n/a",
    "jurisdictionStatus": "verified|unverified",
    "penaltyPrediction": "string or null",
    "evidenceGaps": ["list of missing info"],
    "decision": "CONFIDENT|CAUTION|REFUSAL|ESCALATE"
  }
}
`;

export class LegalAIService {
  // Removed constructor and persistent ai instance to follow new initialization rules

  // FIX: Initialize GoogleGenAI immediately before making the API call as per SDK guidelines
  async analyzeQuery(query: string, history: Message[], role: UserRole, attachments: FileAttachment[] = []): Promise<any> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const contents: any[] = [];
    history.slice(-8).forEach(msg => {
      contents.push({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.role === 'assistant' ? JSON.stringify({ answer: msg.content }) : msg.content }]
      });
    });
    const currentParts: any[] = [{ text: query }];
    attachments.forEach(file => {
      currentParts.push({ inlineData: { mimeType: file.type, data: file.data.split(',')[1] } });
    });
    contents.push({ role: 'user', parts: currentParts });

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents,
        config: {
          systemInstruction: SYSTEM_PROMPT(role),
          responseMimeType: "application/json",
          temperature: 0.1,
        },
      });
      // Directly access .text property as per guidelines
      return JSON.parse(response.text || "{}");
    } catch (error) {
      return { agent_type: 'safety', answer: "System failure.", safety_metrics: { decision: 'ESCALATE', confidence: 0, riskScore: 100 } };
    }
  }

  // FIX: Initialize GoogleGenAI immediately before making the API call as per SDK guidelines
  async suggestRequiredDocuments(caseType: string, description: string): Promise<string[]> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Act as an expert Indian Legal Scribe. Based on the case type "${caseType}" and description "${description}", identify all mandatory legal documents required for filing and evidence under BNSS/BSA rules. Return a JSON object with a 'documents' array of strings.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: { documents: { type: Type.ARRAY, items: { type: Type.STRING } } },
            required: ["documents"]
          }
        }
      });
      // Directly access .text property as per guidelines
      return JSON.parse(response.text || '{"documents":[]}').documents;
    } catch {
      return ["Vakalatnama", "Aadhar Card", "Relevant Court Fee Stamps", "Detailed Affidavit"];
    }
  }

  // FIX: Initialize GoogleGenAI immediately before making the API call as per SDK guidelines
  async researchCase(caseTitle: string, description: string): Promise<{ points: string[], sources: { uri: string, title: string }[] }> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Perform a deep search on Indian legal databases for the case: "${caseTitle}". Context: "${description}". Focus on finding:
        1. Relevant BNS/BNSS/BSA sections.
        2. Recent (last 2 years) High Court or Supreme Court precedents.
        3. Strategic key points for the upcoming hearing.
        Provide a detailed analysis with bullet points.`,
        config: { tools: [{ googleSearch: {} }] },
      });
      // Extract grounding metadata as per guidelines
      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      const sources = chunks.filter((c: any) => c.web).map((c: any) => ({ uri: c.web.uri, title: c.web.title }));
      // Directly access .text property as per guidelines
      const points = (response.text || "").split('\n')
        .filter(l => l.trim().startsWith('*') || l.trim().startsWith('-') || /^\d+\./.test(l.trim()))
        .map(l => l.replace(/^[*-\d.\s]+/, '').trim());
      
      return { points: points.length > 0 ? points : [response.text || "No insights found."], sources };
    } catch {
      return { points: ["Live research database unavailable. Please verify your internet connection."], sources: [] };
    }
  }
}
