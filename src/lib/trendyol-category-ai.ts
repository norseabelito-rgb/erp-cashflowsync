import { getAnthropicClient } from "@/lib/ai";

interface CategorySuggestion {
  categoryId: number;
  categoryName: string;
  categoryPath: string;
  confidence: number;  // 0-100
  reasoning: string;
}

export async function suggestTrendyolCategory(
  productTitle: string,
  productDescription: string | null,
  availableCategories: Array<{ id: number; name: string; fullPath: string }>
): Promise<CategorySuggestion | null> {
  const client = await getAnthropicClient();

  // Limit categories to prevent context overflow - send top 500 most relevant
  const categoriesForPrompt = availableCategories.slice(0, 500);

  const systemPrompt = `Esti un expert in clasificarea produselor pentru marketplace-uri.
Analizezi titlul si descrierea unui produs si gasesti categoria Trendyol cea mai potrivita.

IMPORTANT:
- Raspunde DOAR in format JSON valid
- categoryId trebuie sa fie din lista de categorii disponibile
- confidence intre 0-100 (100 = sigur, sub 50 = incert)
- reasoning explicand DE CE aceasta categorie`;

  const userPrompt = `Gaseste categoria Trendyol potrivita pentru:

Titlu: ${productTitle}
Descriere: ${productDescription || "(fara descriere)"}

Categorii disponibile (id | cale):
${categoriesForPrompt.map(c => `${c.id} | ${c.fullPath}`).join("\n")}

Raspunde in JSON:
{
  "categoryId": <number>,
  "categoryName": "<name>",
  "categoryPath": "<full path>",
  "confidence": <0-100>,
  "reasoning": "<explicatie>"
}`;

  try {
    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",  // Use fast model for suggestions
      max_tokens: 500,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });

    const content = response.content[0];
    if (content.type !== "text") return null;

    // Extract JSON from response (handle markdown code blocks)
    let jsonStr = content.text;
    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
    }

    const parsed = JSON.parse(jsonStr.trim());
    return {
      categoryId: parsed.categoryId,
      categoryName: parsed.categoryName,
      categoryPath: parsed.categoryPath,
      confidence: parsed.confidence,
      reasoning: parsed.reasoning,
    };
  } catch (error: any) {
    console.error("[Trendyol AI] Category suggestion failed:", error.message);
    return null;
  }
}
