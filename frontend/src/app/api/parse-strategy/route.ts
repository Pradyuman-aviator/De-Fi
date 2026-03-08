import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const { userInput } = await req.json();

        if (!userInput) {
            return NextResponse.json({ error: "Missing userInput" }, { status: 400 });
        }

        const GROQ_API_KEY = process.env.GROQ_API_KEY;
        if (!GROQ_API_KEY) {
            console.warn("Using mock response due to missing GROQ_API_KEY");
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
CRITICAL INSTRUCTION: If the user's input is a greeting (e.g., "hello", "hi"), a question unrelated to building a strategy, or complete nonsense, DO NOT hallucinate parameters. Instead, return ONLY this JSON:
{
  "error": "I am an AI Strategy Builder. Please describe a trading strategy you would like to deploy (e.g., 'Buy when the price drops 5%')."
}
If the input IS a valid strategy concept, map it to these parameters:
Available strategy types: MOMENTUM, MEAN_REVERT, SPREAD, RISK_PARITY.
Map aggressive/risky language to HIGH risk and large thresholds.
Map cautious/safe language to LOW risk and small thresholds.
Always return valid JSON. Never explain.
Valid Strategy JSON structure to enforce exactly:
{
  "strategyType": "MOMENTUM" | "MEAN_REVERT" | "SPREAD" | "RISK_PARITY",
  "riskLevel": "LOW" | "MEDIUM" | "HIGH",
  "threshold": 100,
  "positionSize": 500,
  "lookbackWindow": 15,
  "label": "short human-readable name for the agent"
}`;

        const url = `https://api.groq.com/openai/v1/chat/completions`;

        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${GROQ_API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "llama-3.1-8b-instant",
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
            throw new Error(`Groq API Error: ${response.status} ${errorText}`);
        }

        const data = await response.json();
        let aiText = data.choices[0].message.content;
        aiText = aiText.replace(/```json/g, '').replace(/```/g, '').trim();

        const parsedJson = JSON.parse(aiText);

        if (parsedJson.error) {
            return NextResponse.json({ error: parsedJson.error }, { status: 400 });
        }

        return NextResponse.json(parsedJson);

    } catch (error: any) {
        console.error("Error parsing strategy:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
