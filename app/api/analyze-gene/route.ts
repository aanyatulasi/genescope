import OpenAI from "openai";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const MODEL = "anthropic/claude-sonnet-4.6";

const SYSTEM_PROMPT = `You are GeneScope, an educational biotech assistant. Given a human gene symbol, return a structured, accurate, age-appropriate explanation suitable for high school and undergraduate students.

Guidelines:
- Be scientifically accurate and cite well-established biology only.
- Use plain, friendly language; define jargon the first time it appears.
- Never provide medical advice, diagnosis, or treatment recommendations.
- If the gene is unknown or ambiguous, respond with the closest well-known human gene match and note the assumption in simpleSummary.
- Keep each text field concise (2-5 sentences) except associatedDiseases and researchQuestions which are arrays.
- The educationalDisclaimer must remind readers this is for learning only and not medical guidance.

Respond with a single JSON object — no markdown, no commentary — matching exactly this shape:
{
  "geneName": string,                    // Official gene symbol, uppercase
  "simpleSummary": string,               // One-paragraph overview a curious student can grasp
  "normalFunction": string,              // What the gene normally does in healthy cells
  "proteinFunction": string,             // Protein encoded and its molecular role
  "associatedDiseases": string[],        // Conditions linked to mutations or dysregulation
  "inheritancePattern": string,          // e.g. "Autosomal dominant" or "Not typically inherited"
  "importanceInBiotech": string,         // Why this gene matters for medicine, research, or industry
  "studentExplanation": string,          // Friendly analogy or metaphor a student would enjoy
  "researchQuestions": string[],         // Exactly 3 thought-provoking research questions
  "educationalDisclaimer": string        // Reminder that the content is educational only
}`;

export async function POST(request: Request) {
  if (!process.env.OPENROUTER_API_KEY) {
    return NextResponse.json(
      { error: "Server is missing OPENROUTER_API_KEY." },
      { status: 500 },
    );
  }

  let body: { gene?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const gene = typeof body.gene === "string" ? body.gene.trim() : "";
  if (!gene) {
    return NextResponse.json(
      { error: "Please provide a gene name." },
      { status: 400 },
    );
  }
  if (gene.length > 32) {
    return NextResponse.json(
      { error: "Gene name is too long." },
      { status: 400 },
    );
  }

  const client = new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: process.env.OPENROUTER_API_KEY,
    defaultHeaders: {
      "HTTP-Referer": "https://github.com/aanyatulasi/genescope",
      "X-Title": "GeneScope",
    },
  });

  try {
    const completion = await client.chat.completions.create({
      model: MODEL,
      max_tokens: 4096,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `Explain the gene "${gene}" in the GeneScope structured JSON format. Reply with ONLY the JSON object — no markdown fences, no commentary, no preamble.`,
        },
      ],
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      return NextResponse.json(
        { error: "No response returned from the model." },
        { status: 502 },
      );
    }

    const parsed = parseLooseJson(content);
    if (!parsed) {
      return NextResponse.json(
        {
          error: "Model returned non-JSON output.",
          raw: content.slice(0, 400),
        },
        { status: 502 },
      );
    }

    return NextResponse.json({ data: parsed });
  } catch (error) {
    if (error instanceof OpenAI.APIError) {
      return NextResponse.json(
        { error: `OpenRouter API error: ${error.message}` },
        { status: error.status ?? 500 },
      );
    }
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function parseLooseJson(text: string): unknown {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    // Fall back to extracting the first balanced {...} block.
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start === -1 || end === -1 || end <= start) return null;
    try {
      return JSON.parse(cleaned.slice(start, end + 1));
    } catch {
      return null;
    }
  }
}
