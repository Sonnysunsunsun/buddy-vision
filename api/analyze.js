/**
 * Vercel Serverless Function: Analyze Image
 * Handles both Google Vision API and OpenAI GPT-4 Vision
 */

const https = require('https');

// Helper function to make HTTPS requests
function httpsRequest(options, postData) {
    return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    resolve(data);
                }
            });
        });
        req.on('error', reject);
        if (postData) req.write(postData);
        req.end();
    });
}

// Google Vision API call
async function analyzeWithGoogleVision(imageBase64, apiKey) {
    const imageContent = imageBase64.replace(/^data:image\/\w+;base64,/, '');

    const requestBody = JSON.stringify({
        requests: [{
            image: { content: imageContent },
            features: [
                { type: 'LABEL_DETECTION', maxResults: 10 },
                { type: 'TEXT_DETECTION' },
                { type: 'OBJECT_LOCALIZATION', maxResults: 10 },
                { type: 'LANDMARK_DETECTION', maxResults: 5 },
                { type: 'LOGO_DETECTION', maxResults: 5 },
                { type: 'FACE_DETECTION', maxResults: 5 }
            ]
        }]
    });

    const options = {
        hostname: 'vision.googleapis.com',
        path: `/v1/images:annotate?key=${apiKey}`,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(requestBody)
        }
    };

    const response = await httpsRequest(options, requestBody);

    if (response.error) {
        throw new Error(`Google Vision API error: ${response.error.message}`);
    }

    const annotations = response.responses[0];

    // Process text detection
    const textAnnotations = annotations.textAnnotations || [];
    const fullText = textAnnotations.length > 0 ? textAnnotations[0].description : '';

    // Process labels
    const labels = (annotations.labelAnnotations || []).map(l => ({
        name: l.description,
        confidence: l.score
    }));

    // Process objects
    const objects = (annotations.localizedObjectAnnotations || []).map(o => ({
        name: o.name,
        confidence: o.score
    }));

    // Process landmarks
    const landmarks = (annotations.landmarkAnnotations || []).map(l => l.description);

    // Process logos
    const logos = (annotations.logoAnnotations || []).map(l => l.description);

    // Process faces
    const faces = (annotations.faceAnnotations || []).map(f => ({
        joy: f.joyLikelihood,
        sorrow: f.sorrowLikelihood,
        anger: f.angerLikelihood,
        surprise: f.surpriseLikelihood
    }));

    return {
        text: {
            hasText: textAnnotations.length > 0,
            fullText: fullText,
            confidence: textAnnotations.length > 0 ? textAnnotations[0].confidence : 0
        },
        labels,
        objects,
        landmarks,
        logos,
        faces
    };
}

// OpenAI GPT-4 Vision call
async function generateDescriptionWithGPT(visionData, settings, apiKey) {
    const detailLevel = settings.detailLevel || 'standard';

    let systemPrompt = 'You are an accessibility assistant for blind and visually impaired users. ';

    if (detailLevel === 'brief') {
        systemPrompt += 'Provide a SHORT 1-2 sentence description focusing on the most important elements.';
    } else if (detailLevel === 'detailed') {
        systemPrompt += 'Provide a DETAILED description including spatial relationships, colors, and context.';
    } else {
        systemPrompt += 'Provide a clear, natural description of what you see.';
    }

    // Build context from vision data
    let context = 'Vision Analysis:\n';

    if (visionData.text.hasText) {
        context += `\nText detected: "${visionData.text.fullText}"\n`;
    }

    if (visionData.labels.length > 0) {
        context += `\nLabels: ${visionData.labels.map(l => l.name).join(', ')}\n`;
    }

    if (visionData.objects.length > 0) {
        context += `\nObjects: ${visionData.objects.map(o => o.name).join(', ')}\n`;
    }

    if (visionData.landmarks.length > 0) {
        context += `\nLandmarks: ${visionData.landmarks.join(', ')}\n`;
    }

    if (visionData.logos.length > 0) {
        context += `\nLogos: ${visionData.logos.join(', ')}\n`;
    }

    const userPrompt = `${context}\n\nDescribe this scene naturally for a blind person. Be conversational and helpful.`;

    const requestBody = JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 300
    });

    const options = {
        hostname: 'api.openai.com',
        path: '/v1/chat/completions',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
            'Content-Length': Buffer.byteLength(requestBody)
        }
    };

    const response = await httpsRequest(options, requestBody);

    if (response.error) {
        throw new Error(`OpenAI API error: ${response.error.message}`);
    }

    return response.choices[0].message.content.trim();
}

// Main serverless function handler
module.exports = async (req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { imageData, settings } = req.body;

        if (!imageData) {
            return res.status(400).json({ error: 'Missing imageData' });
        }

        // Get API keys from environment variables
        const openaiKey = process.env.OPENAI_API_KEY;
        const visionKey = process.env.GOOGLE_VISION_API_KEY;

        if (!openaiKey || !visionKey) {
            return res.status(500).json({
                error: 'API keys not configured. Please set OPENAI_API_KEY and GOOGLE_VISION_API_KEY environment variables.'
            });
        }

        // Step 1: Analyze with Google Vision
        console.log('Analyzing with Google Vision...');
        const visionData = await analyzeWithGoogleVision(imageData, visionKey);

        // Step 2: Generate description with GPT
        console.log('Generating description with GPT...');
        const description = await generateDescriptionWithGPT(visionData, settings || {}, openaiKey);

        // Return combined result
        return res.status(200).json({
            success: true,
            visionData,
            description
        });

    } catch (error) {
        console.error('Error in analyze function:', error);
        return res.status(500).json({
            error: error.message || 'Internal server error'
        });
    }
};
