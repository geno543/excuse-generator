const express = require('express');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const app = express();

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Middleware to parse JSON bodies
app.use(express.json());

// Serve static files from the root directory
app.use(express.static(__dirname));

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({
        error: {
            message: err.message || 'An unexpected error occurred',
            code: err.code || 'INTERNAL_ERROR',
            details: process.env.NODE_ENV === 'development' ? err.stack : undefined
        }
    });
});

// Serve index.html for the root route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// AI excuse generation endpoint
app.post('/generate-ai-excuse', async (req, res) => {
    try {
        const { userName, targetPerson, activity, location, tone } = req.body;
        
        // Validate required fields
        if (!userName || !targetPerson || !activity) {
            throw new Error('Missing required fields: userName, targetPerson, and activity are required');
        }

        // Create prompts based on tone
        const systemPrompt = getSystemPrompt(tone);
        const userPrompt = getUserPrompt(tone, targetPerson, activity);

        // Initialize Gemini model
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });

        try {
            // Generate content using Gemini
            const result = await model.generateContent(systemPrompt + "\n" + userPrompt);
            const response = await result.response;
            const text = response.text();

            // Process the excuse text
            const excuseText = processExcuseText(text, tone);
            
            // Format the response with additional metadata
            const formattedResponse = {
                success: true,
                excuse: {
                    raw: text,
                    formatted: excuseText,
                    components: {
                        greeting: extractGreeting(excuseText),
                        mainExcuse: extractMainExcuse(excuseText),
                        closing: extractClosing(excuseText)
                    },
                    stats: {
                        length: excuseText.length,
                        wordCount: excuseText.split(/\s+/).length
                    }
                },
                metadata: {
                    tone: tone,
                    model: "gemini-pro",
                    generated: new Date().toISOString(),
                    context: {
                        userName,
                        targetPerson,
                        activity,
                        location: location || 'unspecified'
                    }
                },
                formatting: {
                    font: getToneFont(tone),
                    color: getToneColor(tone),
                    icon: getToneIcon(tone)
                }
            };

            res.json(formattedResponse);
        } catch (geminiError) {
            console.error('Gemini API Error:', geminiError);
            throw new Error('Failed to generate excuse: ' + (geminiError.message || 'Unknown error'));
        }
    } catch (error) {
        next(error);
    }
});

function getSystemPrompt(tone) {
    const prompts = {
        funny: "You are a creative comedy writer who specializes in generating hilarious and unexpected excuses.",
        professional: "You are a professional business communicator who crafts polite and plausible excuses.",
        bizarre: "You are a surrealist writer who creates wonderfully weird and imaginative excuses.",
        dramatic: "You are a dramatic storyteller who crafts emotionally compelling excuses."
    };
    return prompts[tone] || prompts.professional;
}

function getUserPrompt(tone, targetPerson, activity) {
    // Special case for the squirrel excuse
    if (tone === 'bizarre' && activity.toLowerCase().includes('homework')) {
        return `Dear ${targetPerson}, I couldn't attend ${activity} because I was busy rescuing a colony of squirrels from a marauding army of chipmunks. The chipmunks had infiltrated the squirrels' treehouse and were threatening to overthrow their acorn economy. I, being a skilled negotiator (and an excellent squirrel mimic), stepped in to mediate the conflict. After hours of tense talks, I brokered a peace treaty that called for the chipmunks to surrender their walnut stash and the squirrels to grant them safe passage out of their territory. In recognition of my heroic efforts, the squirrel king bestowed upon me the prestigious "Nutcracker of Diplomacy" award, which unfortunately came with a time-consuming ceremony that prevented me from completing my homework.`;
    }

    const prompts = {
        funny: `Write a funny excuse for missing ${activity}. Make it creative and humorous. Start with: Dear ${targetPerson}, I couldn't attend ${activity} because`,
        professional: `Write a formal excuse for missing ${activity}. Make it professional and believable. Start with: Dear ${targetPerson}, I regret to inform you that attending ${activity} was impossible because`,
        bizarre: `Write a bizarre excuse for missing ${activity}. Make it weird and creative. Start with: Dear ${targetPerson}, you might find this hard to believe, but I couldn't attend ${activity} because`,
        dramatic: `Write a dramatic excuse for missing ${activity}. Make it emotional but not over-the-top. Start with: Dear ${targetPerson}, with great sorrow I must confess that ${activity} was impossible because`
    };
    return prompts[tone] || prompts.professional;
}

// Helper functions for excuse processing
function processExcuseText(text, tone) {
    let processed = text.trim();
    
    // Ensure proper sentence structure
    if (!processed.endsWith('.') && !processed.endsWith('!') && !processed.endsWith('?')) {
        processed += '.';
    }

    // Add tone-specific formatting
    switch (tone) {
        case 'dramatic':
            processed = processed.replace(/\b(alas|oh|unfortunately)\b/gi, match => match.toUpperCase());
            break;
        case 'professional':
            // Ensure proper business language
            processed = processed.replace(/\b(cant|dont|wouldnt)\b/gi, match => match.replace(/n/, "'n"));
            break;
        case 'bizarre':
            // Add emphasis to unusual elements
            processed = processed.replace(/\b(portal|dimension|quantum|vortex|parallel universe)\b/gi, 
                match => `*${match}*`);
            break;
    }

    return processed;
}

function extractGreeting(text) {
    const greetingMatch = text.match(/^(Dear|Hello|Hi|Greetings|Hey)\s+[^,\n.]+(,|\.|!|\n)/i);
    return greetingMatch ? greetingMatch[0] : '';
}

function extractMainExcuse(text) {
    const greeting = extractGreeting(text);
    const closing = extractClosing(text);
    let main = text;
    
    if (greeting) main = main.replace(greeting, '');
    if (closing) main = main.replace(closing, '');
    
    return main.trim();
}

function extractClosing(text) {
    const closingMatch = text.match(/(Sincerely|Best|Regards|Yours truly|Apologetically)[^,\n]*(,|\.|!|\n)[^,\n]*$/i);
    return closingMatch ? closingMatch[0] : '';
}

function getToneFont(tone) {
    const fonts = {
        funny: "'Comic Sans MS', cursive",
        professional: "'Arial', sans-serif",
        bizarre: "'Courier New', monospace",
        dramatic: "'Georgia', serif"
    };
    return fonts[tone] || fonts.professional;
}

function getToneColor(tone) {
    const colors = {
        funny: '#FF6B6B',
        professional: '#4A90E2',
        bizarre: '#9B59B6',
        dramatic: '#E67E22'
    };
    return colors[tone] || colors.professional;
}

function getToneIcon(tone) {
    const icons = {
        funny: '😄',
        professional: '👔',
        bizarre: '🌟',
        dramatic: '🎭'
    };
    return icons[tone] || icons.professional;
}

const PORT = 3001;
app.listen(PORT, () => {
    if (!process.env.GEMINI_API_KEY) {
        console.warn('\x1b[33mWARNING: GEMINI_API_KEY environment variable is not set. The API will not work without it.\x1b[0m');
    }
    console.log(`Server is running on http://localhost:${PORT}`);
});
