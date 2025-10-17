/**
 * Buddy Vision - Google Cloud Vision API Integration
 * Extracts: objects, faces (count only), text (OCR), scene labels
 */

class VisionAnalyzer {
    constructor() {
        this.apiEndpoint = 'https://vision.googleapis.com/v1/images:annotate';
    }

    /**
     * Analyze image using Google Cloud Vision API
     * @param {string} base64Image - Base64 encoded image data
     * @param {string} apiKey - Google Cloud Vision API key
     * @returns {Object} Vision analysis data
     */
    async analyzeImage(base64Image, apiKey) {
        try {
            // Remove data URL prefix if present
            const imageContent = base64Image.replace(/^data:image\/\w+;base64,/, '');

            // Prepare request body
            const requestBody = {
                requests: [
                    {
                        image: {
                            content: imageContent
                        },
                        features: [
                            {
                                type: 'OBJECT_LOCALIZATION',
                                maxResults: 20
                            },
                            {
                                type: 'FACE_DETECTION',
                                maxResults: 50
                            },
                            {
                                type: 'TEXT_DETECTION',
                                maxResults: 10
                            },
                            {
                                type: 'LABEL_DETECTION',
                                maxResults: 15
                            },
                            {
                                type: 'IMAGE_PROPERTIES'
                            }
                        ]
                    }
                ]
            };

            console.log('Sending request to Google Vision API...');

            // Make API request
            const response = await fetch(`${this.apiEndpoint}?key=${apiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`Vision API error: ${errorData.error?.message || response.statusText}`);
            }

            const data = await response.json();
            const result = data.responses[0];

            // Check for errors in response
            if (result.error) {
                throw new Error(`Vision API error: ${result.error.message}`);
            }

            // Process and structure the data
            const processedData = this.processVisionData(result);

            console.log('Vision API analysis complete:', processedData);
            return processedData;

        } catch (error) {
            console.error('Vision analysis error:', error);
            throw new Error(`Failed to analyze image: ${error.message}`);
        }
    }

    /**
     * Process raw Vision API data into structured format
     * @param {Object} rawData - Raw response from Vision API
     * @returns {Object} Processed vision data
     */
    processVisionData(rawData) {
        // Extract objects
        const objects = this.extractObjects(rawData.localizedObjectAnnotations || []);

        // Extract face count and emotions
        const faces = this.extractFaces(rawData.faceAnnotations || []);

        // Extract text (OCR)
        const text = this.extractText(rawData.textAnnotations || []);

        // Extract scene labels
        const labels = this.extractLabels(rawData.labelAnnotations || []);

        // Extract dominant colors
        const colors = this.extractColors(rawData.imagePropertiesAnnotation?.dominantColors?.colors || []);

        return {
            objects,
            faces,
            text,
            labels,
            colors,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Extract objects from localized object annotations
     * @param {Array} annotations - Object annotations from Vision API
     * @returns {Array} Processed objects
     */
    extractObjects(annotations) {
        return annotations.map(obj => ({
            name: obj.name,
            confidence: Math.round(obj.score * 100),
            // Simplified location (center point)
            position: this.calculateCenter(obj.boundingPoly)
        })).sort((a, b) => b.confidence - a.confidence);
    }

    /**
     * Extract face information (count and basic emotions)
     * @param {Array} annotations - Face annotations from Vision API
     * @returns {Object} Face analysis
     */
    extractFaces(annotations) {
        const count = annotations.length;

        const emotions = annotations.map(face => {
            // Determine dominant emotion
            const emotionScores = {
                joy: face.joyLikelihood,
                sorrow: face.sorrowLikelihood,
                anger: face.angerLikelihood,
                surprise: face.surpriseLikelihood
            };

            const dominantEmotion = this.getDominantEmotion(emotionScores);

            return {
                emotion: dominantEmotion,
                headwear: face.headwearLikelihood !== 'VERY_UNLIKELY',
                position: this.calculateCenter(face.boundingPoly)
            };
        });

        return {
            count,
            emotions,
            hasMultiplePeople: count > 1
        };
    }

    /**
     * Extract visible text from scene
     * @param {Array} annotations - Text annotations from Vision API
     * @returns {Object} Text data
     */
    extractText(annotations) {
        if (annotations.length === 0) {
            return {
                hasText: false,
                fullText: '',
                words: []
            };
        }

        // First annotation contains full text
        const fullText = annotations[0]?.description || '';

        // Individual words (skip first which is full text)
        const words = annotations.slice(1).map(word => word.description);

        return {
            hasText: true,
            fullText: fullText.trim(),
            words,
            wordCount: words.length
        };
    }

    /**
     * Extract scene labels
     * @param {Array} annotations - Label annotations from Vision API
     * @returns {Array} Scene labels
     */
    extractLabels(annotations) {
        return annotations
            .filter(label => label.score > 0.7) // Only high confidence labels
            .map(label => ({
                name: label.description,
                confidence: Math.round(label.score * 100)
            }))
            .sort((a, b) => b.confidence - a.confidence)
            .slice(0, 10); // Top 10 labels
    }

    /**
     * Extract dominant colors
     * @param {Array} colors - Color annotations from Vision API
     * @returns {Array} Dominant colors
     */
    extractColors(colors) {
        return colors
            .slice(0, 3) // Top 3 colors
            .map(color => ({
                rgb: color.color,
                percentage: Math.round((color.pixelFraction || 0) * 100),
                score: Math.round((color.score || 0) * 100)
            }));
    }

    /**
     * Calculate center point of bounding polygon
     * @param {Object} poly - Bounding polygon
     * @returns {string} Position description
     */
    calculateCenter(poly) {
        if (!poly || !poly.vertices || poly.vertices.length === 0) {
            return 'center';
        }

        const vertices = poly.vertices || poly.normalizedVertices;
        const avgX = vertices.reduce((sum, v) => sum + (v.x || 0), 0) / vertices.length;
        const avgY = vertices.reduce((sum, v) => sum + (v.y || 0), 0) / vertices.length;

        // Determine position (left/center/right, top/center/bottom)
        const horizontal = avgX < 0.33 ? 'left' : avgX > 0.67 ? 'right' : 'center';
        const vertical = avgY < 0.33 ? 'top' : avgY > 0.67 ? 'bottom' : 'middle';

        if (horizontal === 'center' && vertical === 'middle') {
            return 'center';
        }

        return `${vertical} ${horizontal}`;
    }

    /**
     * Determine dominant emotion from likelihood scores
     * @param {Object} scores - Emotion likelihood scores
     * @returns {string} Dominant emotion
     */
    getDominantEmotion(scores) {
        const likelihoods = {
            'VERY_LIKELY': 5,
            'LIKELY': 4,
            'POSSIBLE': 3,
            'UNLIKELY': 2,
            'VERY_UNLIKELY': 1
        };

        let maxScore = 0;
        let dominantEmotion = 'neutral';

        for (const [emotion, likelihood] of Object.entries(scores)) {
            const score = likelihoods[likelihood] || 0;
            if (score > maxScore) {
                maxScore = score;
                dominantEmotion = emotion;
            }
        }

        return maxScore >= 4 ? dominantEmotion : 'neutral';
    }

    /**
     * Generate a quick summary for debugging
     * @param {Object} visionData - Processed vision data
     * @returns {string} Summary text
     */
    generateSummary(visionData) {
        const parts = [];

        if (visionData.faces.count > 0) {
            parts.push(`${visionData.faces.count} person${visionData.faces.count > 1 ? 's' : ''}`);
        }

        if (visionData.objects.length > 0) {
            const topObjects = visionData.objects.slice(0, 3).map(o => o.name);
            parts.push(`Objects: ${topObjects.join(', ')}`);
        }

        if (visionData.text.hasText) {
            parts.push(`Text: "${visionData.text.fullText.substring(0, 50)}..."`);
        }

        if (visionData.labels.length > 0) {
            parts.push(`Scene: ${visionData.labels[0].name}`);
        }

        return parts.join(' | ');
    }
}

// Initialize and expose globally
window.buddyVision = new VisionAnalyzer();
console.log('Vision Analyzer initialized');
