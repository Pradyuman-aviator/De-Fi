require('dotenv').config({ path: '.env.local' });

async function testHuggingFace() {
    const token = process.env.HF_TOKEN;
    if (!token) {
        console.error("No HF_TOKEN found");
        return;
    }

    const modelsToTest = [
        "Qwen/Qwen2.5-72B-Instruct",
        "meta-llama/Llama-3.2-3B-Instruct",
        "meta-llama/Llama-3.1-8B-Instruct",
        "mistralai/Mistral-7B-Instruct-v0.3",
        "HuggingFaceH4/zephyr-7b-beta"
    ];

    // We try the standard router again just in case the URL was right and the MODEL was wrong
    const url = "https://api-inference.huggingface.co/v1/chat/completions";

    for (const modelId of modelsToTest) {
        console.log(`\nTesting Model: ${modelId}`);
        try {
            const res = await fetch(url, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    model: modelId,
                    messages: [{ role: "user", content: "Hello" }],
                    max_tokens: 10
                })
            });
            console.log(`Status: ${res.status} ${res.statusText}`);
            if (!res.ok) {
                const text = await res.text();
                // skip logging full text if it's html
                console.log(text.substring(0, 100));
            } else {
                console.log("SUCCESS!");
            }
        } catch (e) {
            console.error(e.message);
        }
    }
}

testHuggingFace();
