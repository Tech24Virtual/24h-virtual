// Text generation for the WL Growth Hub functions.
//
// These functions were written against the Lovable AI gateway (OpenAI-style
// chat completions), but no LOVABLE_API_KEY is configured — every call failed
// with "LOVABLE_API_KEY not configured". They now go to Anthropic with the same
// ANTHROPIC_API_KEY support-assistant uses. The result is returned in the
// OpenAI response shape (choices[0].message.content) so each caller's existing
// parsing and error handling keep working unchanged.

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

const MODEL = "claude-sonnet-4-6";

export async function chatCompletion(
  messages: ChatMessage[],
  opts: { maxTokens?: number } = {},
): Promise<Response> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured");

  const system = messages.filter((m) => m.role === "system").map((m) => m.content).join("\n\n");
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: opts.maxTokens ?? 8192,
      ...(system ? { system } : {}),
      messages: messages.filter((m) => m.role !== "system"),
    }),
  });

  if (!res.ok) {
    console.error("Anthropic API error:", res.status, await res.clone().text());
    return res;
  }

  const data = await res.json();
  const content = (data.content ?? [])
    .filter((b: { type: string }) => b.type === "text")
    .map((b: { text: string }) => b.text)
    .join("");
  if (data.stop_reason === "max_tokens") console.warn("AI output hit max_tokens; response may be truncated");

  return new Response(JSON.stringify({ choices: [{ message: { content } }] }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
