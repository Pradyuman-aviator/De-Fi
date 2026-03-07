import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const { userInput } = await req.json();

        if (!userInput) {
            return NextResponse.json({ error: "Missing userInput" }, { status: 400 });
        }

        const HF_TOKEN = process.env.HF_TOKEN;
        if (!HF_TOKEN) {
            console.warn("Missing HF_TOKEN environment variable. Using mock response for demo.");
            // Fallback for hackathon demo if token isn't provided during review
            return NextResponse.json({
                strategyType: "MOMENTUM",
                riskLevel: "HIGH",
                threshold: 600,
                positionSize: 500,
                lookbackWindow: 10,
                label: "Mock Trend Chaser"
            });
        }

        const systemPrompt = `You are a trading strategy parameter extractor for a DeFi arena.
The user describes a trading strategy in plain English.
Extract structured parameters from it.
Available strategy types: MOMENTUM, MEAN_REVERT, SPREAD, RISK_PARITY.
Map aggressive/risky language to HIGH risk and large thresholds.
Map cautious/safe language to LOW risk and small thresholds.
Always return valid JSON matching the schema. Never explain, never add text.
JSON structure to enforce exactly (do not output json tag):
{
  "strategyType": "MOMENTUM" | "MEAN_REVERT" | "SPREAD" | "RISK_PARITY",
  "riskLevel": "LOW" | "MEDIUM" | "HIGH",
  "threshold": 100,
  "positionSize": 500,
  "lookbackWindow": 15,
  "label": "short human-readable name for the agent"
}`;

        // HuggingFace OpenAI-compatible completions endpoint
        // NOTE: Qwen3-32B is not universally on HF Inference yet, using 2.5-72B-Instruct which is robust
        const modelId = "Qwen/Qwen2.5-72B-Instruct";
        const url = `https://api-inference.huggingface.co/models/${modelId}/v1/chat/completions`;

        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${HF_TOKEN}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: modelId,
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userInput }
                ],
                temperature: 0.1,
                max_tokens: 300,
                response_format: { type: "json_object" }
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HF API Error: ${response.status} ${errorText}`);
        }

        const data = await response.json();
        let aiText = data.choices[0].message.content;

        // Clean any possible markdown wrappers 
        aiText = aiText.replace(/```json/g, '').replace(/```/g, '').trim();

        const parsedJson = JSON.parse(aiText);
        return NextResponse.json(parsedJson);

    } catch (error: any) {
        console.error("Error parsing strategy:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
