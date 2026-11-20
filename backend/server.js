
require("dotenv").config();

const express = require("express");
const Groq = require("groq-sdk");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "..")));

if (!process.env.GROQ_API_KEY) {
    console.error("GROQ_API_KEY is missing in .env");
    process.exit(1);
}

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY
});

const MODEL = "openai/gpt-oss-20b";

const SYSTEM_INSTRUCTION = `
You are StudyAI, a friendly and helpful AI study assistant.

Help students with:
- Daily and weekly study plans.
- Exam preparation and revision.
- Time management.
- Difficult subjects and concepts.
- Productivity and concentration.
- Revision schedules.

Give simple, practical and beginner-friendly answers.
Use headings, bullet points and examples where useful.
`;

app.get("/api/health", (req, res) => {
    return res.status(200).json({
        success: true,
        message: "StudyAI backend is running",
        provider: "Groq",
        model: MODEL
    });
});

app.post("/api/chat", async (req, res) => {
    try {
        const { message } = req.body || {};

        if (typeof message !== "string" || !message.trim()) {
            return res.status(400).json({
                success: false,
                error: "Please enter a valid message."
            });
        }

        console.log("User message:", message);
        console.log("Using Groq model:", MODEL);

        const completion = await groq.chat.completions.create({
            model: MODEL,
            messages: [
                {
                    role: "system",
                    content: SYSTEM_INSTRUCTION
                },
                {
                    role: "user",
                    content: message.trim()
                }
            ],
            temperature: 0.7,
            max_completion_tokens: 1500
        });

        const reply = completion.choices?.[0]?.message?.content;

        if (!reply || !reply.trim()) {
            throw new Error("Groq returned an empty response.");
        }

        console.log("Groq response generated successfully.");

        return res.status(200).json({
            success: true,
            reply: reply.trim()
        });

    } catch (error) {
        console.error("Groq API error:", error);

        let errorMessage = "Unable to generate AI response.";
        let status = 500;

        if (error.status === 401) {
            errorMessage = "Invalid Groq API key. Check your .env file.";
            status = 401;
        } else if (error.status === 429) {
            errorMessage = "Groq rate limit reached. Please try again later.";
            status = 429;
        } else if (error.status === 503 || error.status === 502) {
            errorMessage = "Groq service is temporarily unavailable.";
            status = 503;
        } else if (error.message) {
            errorMessage = error.message;
        }

        return res.status(status).json({
            success: false,
            error: errorMessage
        });
    }
});

app.listen(PORT, () => {
    console.log("------------------------------------");
    console.log(`StudyAI server: http://localhost:${PORT}`);
    console.log("AI Provider: Groq");
    console.log(`AI Model: ${MODEL}`);
    console.log("------------------------------------");
});
