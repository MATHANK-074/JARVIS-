import OpenAI from "openai";

let groq;

const getGroqClient = () => {
    if (!groq) {
        if (!process.env.GROQ_API_KEY) {
            throw new Error("GROQ_API_KEY_MISSING");
        }
        groq = new OpenAI({
            apiKey: process.env.GROQ_API_KEY,
            baseURL: "https://api.groq.com/openai/v1",
        });
    }
    return groq;
};

/**
 * Extract task details from email content using Groq (Llama 3)
 */
export const extractTaskFromEmail = async (emailContent) => {
    try {
        const client = getGroqClient();
        const response = await client.chat.completions.create({
            model: "llama-3.3-70b-versatile",
            messages: [
                {
                    role: "system",
                    content: `You are an AI Smart Assistant. Analyze the following email and extract actionable tasks.
                    If the email contains a task, request, appointment, or deadline, return a JSON object.
                    
                    JSON Format:
                    {
                        "isActionable": true,
                        "title": "Short title",
                        "description": "Short summary",
                        "priority": "urgent" | "medium" | "low",
                        "dueDate": "YYYY-MM-DD" | null
                    }
                    If no task is found, return {"isActionable": false}.
                    Only return JSON.`,
                },
                {
                    role: "user",
                    content: `Subject: ${emailContent.subject}\nFrom: ${emailContent.from}\nContent: ${emailContent.snippet}`,
                },
            ],
            response_format: { type: "json_object" },
        });

        return JSON.parse(response.choices[0].message.content);
    } catch (error) {
        if (error.message === "GROQ_API_KEY_MISSING") {
            console.error("❌ Groq API Key is missing in .env");
            throw error;
        }
        console.error("Groq Service Error:", error);
        return { isActionable: false };
    }
};
