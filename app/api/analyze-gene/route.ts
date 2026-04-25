import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const SYSTEM_PROMPT = `You are GeneScope, an educational biotech assistant. Given a human gene symbol, return a structured, accurate, age-appropriate explanation suitable for high school and undergraduate students.

Guidelines:
- Be scientifically accurate and cite well-established biology only.
- Use plain, friendly language; define jargon the first time it appears.
- Never provide medical advice, diagnosis, or treatment recommendations.
- If the gene is unknown or ambiguous, respond with the closest well-known human gene match and note the assumption in simpleSummary.
- Keep each text field concise (2-5 sentences) except associatedDiseases and researchQuestions which are arrays.
- The educationalDisclaimer must remind readers this is for learning only and not medical guidance.`;

const GENE_SCHEMA = {
  type: "object",
  properties: {
    geneName: { type: "string", description: "Official gene symbol, uppercase" },
    simpleSummary: {
      type: "string",
      description: "One-paragraph overview a curious student can grasp",
    },
    normalFunction: {
      type: "string",
      description: "What the gene normally does in healthy cells",
    },
    proteinFunction: {
      type: "string",
      description: "Protein encoded and its molecular role",
    },
    associatedDiseases: {
      type: "array",
      items: { type: "string" },
      description: "Conditions linked to mutations or dysregulation",
    },
    inheritancePattern: {
      type: "string",
      description:
        "Inheritance mode (autosomal dominant/recessive, X-linked, etc.) or 'Not typically inherited' when not applicable",
    },
    importanceInBiotech: {
      type: "string",
      description: "Why this gene matters for medicine, research, or industry",
    },
    studentExplanation: {
      type: "string",
      description: "Friendly analogy or metaphor a student would enjoy",
    },
    researchQuestions: {
      type: "array",
      items: { type: "string" },
      description: "Exactly 3 thought-provoking research questions",
    },
    educationalDisclaimer: {
      type: "string",
      description: "Reminder that the content is educational only",
    },
  },
  required: [
    "geneName",
    "simpleSummary",
    "normalFunction",
    "proteinFunction",
    "associatedDiseases",
    "inheritancePattern",
    "importanceInBiotech",
    "studentExplanation",
    "researchQuestions",
    "educationalDisclaimer",
  ],
  additionalProperties: false,
} as const;

export async function POST(request: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "Server is missing ANTHROPIC_API_KEY." },
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

  const client = new Anthropic();

  try {
    const response = await client.messages.create({
      model: "claude-opus-4-7",
      max_tokens: 4096,
      system: [
        {
          type: "text",
          text: SYSTEM_PROMPT,
          cache_control: { type: "ephemeral" },
        },
      ],
      output_config: {
        format: {
          type: "json_schema",
          schema: GENE_SCHEMA,
        },
      },
      messages: [
        {
          role: "user",
          content: `Explain the gene "${gene}" in the GeneScope structured format.`,
        },
      ],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json(
        { error: "No structured response returned." },
        { status: 502 },
      );
    }

    const parsed = JSON.parse(textBlock.text);
    return NextResponse.json({ data: parsed });
  } catch (error) {
    if (error instanceof Anthropic.APIError) {
      return NextResponse.json(
        { error: `Claude API error: ${error.message}` },
        { status: error.status ?? 500 },
      );
    }
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
