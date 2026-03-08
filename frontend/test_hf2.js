const https = require('https');
const fs = require('fs');

let token = '';
try {
    const envFile = fs.readFileSync('.env.local', 'utf8');
    const match = envFile.match(/HF_TOKEN=(.*)/);
    if (match && match[1]) {
        token = match[1].trim();
    }
} catch (e) {
    fs.writeFileSync('test_output.txt', "Could not read .env.local " + e.message);
    process.exit(1);
}

if (!token) {
    fs.writeFileSync('test_output.txt', "No token found");
    process.exit(1);
}

const models = [
    "Qwen/Qwen2.5-72B-Instruct",
    "mistralai/Mistral-7B-Instruct-v0.3",
    "meta-llama/Llama-3.2-3B-Instruct",
];

const urlPaths = [
    "/hf-inference/models/%MODEL%/v1/chat/completions",
    "/v1/chat/completions"
];

let logOutput = "Starting HF API tests...\n";

async function makeRequest(hostname, path, model) {
    return new Promise((resolve) => {
        const fullPath = path.replace('%MODEL%', model);
        const data = JSON.stringify({
            model: model,
            messages: [{ role: "user", content: "test" }],
            max_tokens: 10
        });

        const options = {
            hostname: hostname,
            path: fullPath,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                'Content-Length': Buffer.byteLength(data)
            }
        };

        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', d => body += d);
            res.on('end', () => resolve({ status: res.statusCode, body: body.substring(0, 300) }));
        });

        req.on('error', (e) => resolve({ status: "ERROR", body: e.message }));
        req.write(data);
        req.end();
    });
}

async function testAll() {
    const hostnames = ["router.huggingface.co", "api-inference.huggingface.co"];

    for (const host of hostnames) {
        for (const path of urlPaths) {
            for (const model of models) {
                logOutput += `\n[TEST] https://${host}${path.replace('%MODEL%', model)}\n`;
                const res = await makeRequest(host, path, model);
                logOutput += ` ---> STATUS: ${res.status}\n`;
                if (res.status === 200) {
                    logOutput += ` ---> SUCCESS FOUND!\n`;
                    logOutput += ` ---> BODY: ${res.body.replace(/\n/g, ' ')}\n`;
                    fs.writeFileSync('test_output.txt', logOutput);
                    return;
                } else {
                    logOutput += ` ---> ERROR: ${res.body.replace(/\n/g, ' ')}\n`;
                }
            }
        }
    }
    fs.writeFileSync('test_output.txt', logOutput);
}

testAll();
