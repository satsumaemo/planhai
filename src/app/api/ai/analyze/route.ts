import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  VALID_CATEGORY_KEYS,
  VALID_SUB_CATEGORY_KEYS,
} from "@/lib/constants/categories";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      fileUrl,
      fileName,
      locale = "ko",
      category,
      subCategory,
    } = body as {
      fileUrl?: string;
      fileName?: string;
      locale?: string;
      category?: string;
      subCategory?: string;
    };

    if (!fileUrl) {
      return NextResponse.json(
        { error: "fileUrl is required" },
        { status: 400 }
      );
    }

    const langInstruction =
      locale === "ko"
        ? "Generate title, description, tags, and thumbnail_suggestion in Korean."
        : "Generate title, description, tags, and thumbnail_suggestion in English.";

    const categoryList = VALID_CATEGORY_KEYS.join(", ");
    const subCategoryHint = category
      ? `Available sub_category keys for "${category}": ${(VALID_SUB_CATEGORY_KEYS[category] ?? []).join(", ")}`
      : "Pick the best matching category first, then pick its sub_category.";

    const prompt = `You are a content analyzer for a creative platform called NextHub.
Analyze the following content and return ONLY a valid JSON object (no markdown, no code fences).

Content URL: ${fileUrl}
${fileName ? `File name: ${fileName}` : ""}
${category ? `User selected category: ${category}` : ""}
${subCategory ? `User selected sub_category: ${subCategory}` : ""}

Available category keys: ${categoryList}
${subCategoryHint}

${langInstruction}

Return exactly this JSON structure:
{
  "title": "short descriptive title",
  "description": "2-3 sentence description of the content",
  "category": "one of the valid category keys",
  "sub_category": "one of the valid sub_category keys for the chosen category",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
  "thumbnail_suggestion": "brief description of an ideal thumbnail image"
}`;

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    let result;
    try {
      result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
      });
    } finally {
      clearTimeout(timeout);
    }

    const text = result.response.text();

    // Extract JSON from response (handle possible markdown fences)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json(
        { error: "Failed to parse AI response" },
        { status: 500 }
      );
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Validate category key
    if (!VALID_CATEGORY_KEYS.includes(parsed.category)) {
      parsed.category = category ?? "other";
    }

    // Validate sub_category key
    const validSubs = VALID_SUB_CATEGORY_KEYS[parsed.category] ?? [];
    if (!validSubs.includes(parsed.sub_category)) {
      parsed.sub_category = subCategory ?? "other";
    }

    // Ensure tags is an array of max 5
    if (!Array.isArray(parsed.tags)) {
      parsed.tags = [];
    }
    parsed.tags = parsed.tags.slice(0, 5);

    return NextResponse.json(parsed);
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "AbortError") {
      return NextResponse.json({ error: "Analysis timed out" }, { status: 408 });
    }
    console.error("AI analyze error:", error);
    return NextResponse.json(
      { error: "Analysis failed" },
      { status: 500 }
    );
  }
}
