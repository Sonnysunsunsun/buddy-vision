/**
 * Buddy Vision - Main Application Logic
 * Handles camera capture, settings, and application flow
 */

class BuddyVision {
    constructor() {
        // DOM Elements
        this.cameraPreview = document.getElementById('camera-preview');
        this.captureCanvas = document.getElementById('capture-canvas');
        this.captureBtn = document.getElementById('capture-btn');
        this.repeatBtn = document.getElementById('repeat-btn');
        this.readTextBtn = document.getElementById('read-text-btn');
        this.descriptionOutput = document.getElementById('description-output');
        this.statusMessages = document.getElementById('status-messages');
        this.loadingOverlay = document.getElementById('loading-overlay');
        this.loadingText = document.getElementById('loading-text');
        this.partnerBadge = document.getElementById('partner-badge');
        // API modal removed - keys are pre-configured

        // Application state
        this.stream = null;
        this.lastDescription = '';
        this.lastImageData = null;
        this.lastVisionData = null; // Store vision data for text-only reading
        this.loadingTimeout = null; // Safety timeout for loading overlay
        this.settings = {
            voiceSpeed: 1.0,
            detailLevel: 'standard',
            partner: null
        };

        // API Keys - Will be loaded from environment or user input
        this.apiKeys = {
            openai: '',
            vision: ''
        };

        this.init();
    }

    async init() {
        console.log('Initializing Buddy Vision...');

        // CRITICAL: Ensure loading overlay is hidden on startup
        this.hideLoading();

        // Backend now handles API keys - no need for user input
        console.log('🔑 Using backend API for AI services');

        // Check for partner referral
        const urlParams = new URLSearchParams(window.location.search);
        this.detectPartner(urlParams);

        // Initialize camera
        await this.initCamera();

        // Setup event listeners
        this.setupEventListeners();

        // Load saved settings
        this.loadSettings();

        // CRITICAL: Welcome message for blind users
        this.speakWelcomeMessage();

        // Enable tap-anywhere-to-capture
        this.enableTapAnywhere();

        console.log('Buddy Vision initialized successfully!');
    }

    async speakWelcomeMessage() {
        // Wait for voice to be ready
        await new Promise(resolve => setTimeout(resolve, 1500));

        if (window.buddyVoice) {
            const currentLanguage = window.buddyVoice.currentLanguage || 'en-US';
            const translations = window.buddyTranslations?.getTranslations(currentLanguage);

            const welcomeMessage = translations?.welcome ||
                'Welcome to Buddy Vision - Your universal AI assistant for LA 2028. ' +
                'Tap anywhere on screen to get instant descriptions of signs, scenes, and surroundings. ' +
                'Works in any language. Your phone will vibrate when capturing.';

            await window.buddyVoice.announce(welcomeMessage);
        }
    }

    enableTapAnywhere() {
        // Make entire camera preview tappable
        this.cameraPreview.addEventListener('click', async () => {
            if (!this.captureBtn.disabled) {
                this.vibratePhone('capture');
                await this.handleCapture();
            }
        });

        // Also make the main content area tappable
        document.querySelector('main').addEventListener('click', async (e) => {
            // Don't trigger if clicking buttons or controls
            if (e.target.tagName === 'BUTTON' ||
                e.target.tagName === 'SELECT' ||
                e.target.tagName === 'INPUT' ||
                e.target.closest('button') ||
                e.target.closest('select')) {
                return;
            }

            if (!this.captureBtn.disabled) {
                this.vibratePhone('capture');
                await this.handleCapture();
            }
        });
    }

    vibratePhone(type) {
        if ('vibrate' in navigator) {
            if (type === 'capture') {
                navigator.vibrate(100); // Quick buzz
            } else if (type === 'success') {
                navigator.vibrate([50, 50, 50]); // Three short buzzes
            } else if (type === 'error') {
                navigator.vibrate(300); // Long buzz
            }
        }
    }

    detectPartner(urlParams) {
        if (!urlParams) {
            urlParams = new URLSearchParams(window.location.search);
        }
        const referrer = urlParams.get('ref');

        if (referrer) {
            this.settings.partner = referrer;
            this.showPartnerBranding(referrer);
            localStorage.setItem('buddy_vision_partner', referrer);
        } else {
            const savedPartner = localStorage.getItem('buddy_vision_partner');
            if (savedPartner) {
                this.settings.partner = savedPartner;
                this.showPartnerBranding(savedPartner);
            }
        }
    }

    showPartnerBranding(partner) {
        const partnerNames = {
            'special-olympics': 'Special Olympics',
            'best-buddies': 'Best Buddies International',
            'axis-dance': 'AXIS Dance Company'
        };

        const name = partnerNames[partner] || 'Partner Organization';
        this.partnerBadge.textContent = `Provided by ${name}`;
        this.partnerBadge.style.display = 'block';
    }


    async initCamera() {
        try {
            const currentLanguage = window.buddyVoice?.currentLanguage || 'en-US';
            const translations = window.buddyTranslations?.getTranslations(currentLanguage);

            this.showStatus(translations?.initializingCamera || 'Initializing camera...', 'info');

            // Request camera access with optimal settings
            this.stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: 'environment', // Prefer rear camera on mobile
                    width: { ideal: 1920 },
                    height: { ideal: 1080 }
                },
                audio: false
            });

            // Set video stream
            this.cameraPreview.srcObject = this.stream;

            // Wait for video to be ready
            await new Promise((resolve) => {
                this.cameraPreview.onloadedmetadata = () => {
                    resolve();
                };
            });

            // Setup canvas size
            this.captureCanvas.width = this.cameraPreview.videoWidth;
            this.captureCanvas.height = this.cameraPreview.videoHeight;

            this.showStatus(translations?.cameraReady || 'Camera ready! Tap "Capture Scene" to begin.', 'success');
            this.captureBtn.disabled = false;

            // Announce to screen readers AND speak it
            this.announceToScreenReader(translations?.cameraReady || 'Camera is ready. You can now capture scenes.');

            // Voice announcement for all users
            if (window.buddyVoice) {
                window.buddyVoice.speak(translations?.cameraReadyShort || 'Camera ready. Tap anywhere to describe what you see.');
            }

        } catch (error) {
            const currentLanguage = window.buddyVoice?.currentLanguage || 'en-US';
            const translations = window.buddyTranslations?.getTranslations(currentLanguage);

            console.error('Camera initialization error:', error);
            this.showStatus(translations?.cameraError || 'Camera access denied or unavailable. Please check permissions.', 'error');
            this.announceToScreenReader(translations?.cameraError || 'Camera could not be initialized. Please check your camera permissions.');
        }
    }

    async captureImage() {
        if (!this.stream) {
            const currentLanguage = window.buddyVoice?.currentLanguage || 'en-US';
            const translations = window.buddyTranslations?.getTranslations(currentLanguage);
            this.showStatus(translations?.cameraError || 'Camera not initialized', 'error');
            return null;
        }

        try {
            const currentLanguage = window.buddyVoice?.currentLanguage || 'en-US';
            const translations = window.buddyTranslations?.getTranslations(currentLanguage);

            this.showLoading(translations?.capturing || 'Capturing scene...');

            // Draw current video frame to canvas
            const ctx = this.captureCanvas.getContext('2d');
            ctx.drawImage(
                this.cameraPreview,
                0,
                0,
                this.captureCanvas.width,
                this.captureCanvas.height
            );

            // Convert canvas to base64
            const base64Image = this.captureCanvas.toDataURL('image/jpeg', 0.8);

            // Store for replay
            this.lastImageData = base64Image;

            // Audio feedback
            this.playAudioFeedback('capture');

            console.log('Image captured successfully');
            return base64Image;

        } catch (error) {
            const currentLanguage = window.buddyVoice?.currentLanguage || 'en-US';
            const translations = window.buddyTranslations?.getTranslations(currentLanguage);

            console.error('Image capture error:', error);
            this.showStatus(translations?.captureError || 'Failed to capture image', 'error');
            this.hideLoading();
            return null;
        }
    }

    playAudioFeedback(type) {
        // Simple audio feedback using Web Audio API
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            if (type === 'capture') {
                oscillator.frequency.value = 800;
                gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
                oscillator.start(audioContext.currentTime);
                oscillator.stop(audioContext.currentTime + 0.1);
            }
        } catch (error) {
            // Audio feedback is optional, don't break on error
            console.log('Audio feedback not available');
        }
    }

    setupEventListeners() {
        // Capture button
        this.captureBtn.addEventListener('click', async () => {
            await this.handleCapture();
        });

        // Repeat button - simply replay last description
        this.repeatBtn.addEventListener('click', () => {
            if (this.lastDescription && window.buddyVoice) {
                window.buddyVoice.speak(this.lastDescription);
                this.vibratePhone('capture');
            }
        });

        // Read Text button - focus on OCR text only
        this.readTextBtn.addEventListener('click', async () => {
            const currentLanguage = window.buddyVoice?.currentLanguage || 'en-US';
            const translations = window.buddyTranslations?.getTranslations(currentLanguage);

            if (this.lastVisionData && this.lastVisionData.text.hasText) {
                const textDescription = `${translations?.readTextButton || 'Visible text'}: ${this.lastVisionData.text.fullText}`;
                if (window.buddyVoice) {
                    window.buddyVoice.speak(textDescription);
                    this.vibratePhone('capture');
                }
            } else {
                if (window.buddyVoice) {
                    window.buddyVoice.speak(translations?.noTextDetected || 'No readable text detected in the last capture.');
                    this.vibratePhone('error');
                }
            }
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'c' && e.ctrlKey) {
                this.handleCapture();
            } else if (e.key === 'r' && e.ctrlKey && this.lastDescription) {
                e.preventDefault();
                if (window.buddyVoice) {
                    window.buddyVoice.speak(this.lastDescription);
                }
            }
        });
    }

    async handleCapture() {
        console.log('🎬 Starting capture...');

        // Capture image
        const imageData = await this.captureImage();
        if (!imageData) {
            console.error('❌ Failed to capture image');
            alert('Failed to capture image from camera');
            this.hideLoading();
            return;
        }

        console.log('✅ Image captured, starting analysis...');
        const currentLanguage = window.buddyVoice?.currentLanguage || 'en-US';
        const translations = window.buddyTranslations?.getTranslations(currentLanguage);

        this.showLoading(translations?.analyzing || 'Analyzing scene...');

        // Voice feedback for blind users
        if (window.buddyVoice) {
            window.buddyVoice.speak(translations?.analyzing2 || 'Analyzing...');
        }

        // Add 30 second timeout
        const timeout = setTimeout(() => {
            console.error('⏱️ TIMEOUT: API calls took too long');
            alert('Request timed out. Please check your internet connection and API keys.');
            this.hideLoading();
            this.showStatus('Request timed out', 'error');
        }, 30000);

        try {
            // Call backend API that handles both Google Vision and OpenAI
            console.log('📸 Calling backend API...');
            console.log('Image data length:', imageData.length);

            const response = await fetch('/api/analyze', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    imageData: imageData,
                    settings: this.settings
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Backend API request failed');
            }

            const result = await response.json();
            console.log('✅ Backend response:', result);

            // Store vision data for text-only reading
            this.lastVisionData = result.visionData;
            const description = result.description;

            console.log('✅ Description:', description);
            console.log('Description length:', description.length);
            console.log('Is description unique?', !this.lastDescription || description !== this.lastDescription);

            // Step 3: Display and speak
            this.displayDescription(description);
            this.lastDescription = description;

            // Step 4: Speak automatically
            console.log('🔊 Step 3: Speaking description...');
            if (window.buddyVoice) {
                window.buddyVoice.speak(description);
            }

            // Enable repeat and read-text buttons
            this.repeatBtn.disabled = false;
            if (this.lastVisionData && this.lastVisionData.text.hasText) {
                this.readTextBtn.disabled = false;
            }

            clearTimeout(timeout); // Clear timeout on success
            this.hideLoading();
            this.vibratePhone('success'); // Success vibration
            const translations = window.buddyTranslations?.getTranslations(currentLanguage);
            this.showStatus(translations?.descriptionReady || 'Description ready', 'success');
            console.log('🎉 All done!');

        } catch (error) {
            clearTimeout(timeout); // Clear timeout on error
            console.error('❌ PROCESSING ERROR:', error);
            console.error('Error details:', {
                message: error.message,
                stack: error.stack,
                apiKeys: {
                    openai: this.apiKeys.openai ? 'Present' : 'MISSING',
                    vision: this.apiKeys.vision ? 'Present' : 'MISSING'
                }
            });

            // Show alert and vibrate on error
            this.vibratePhone('error');
            alert(`Error: ${error.message}\n\nCheck browser console (Cmd+Option+I) for details.`);

            // Speak the error for blind users
            if (window.buddyVoice) {
                window.buddyVoice.speak(`Error: ${error.message}. Please try again.`);
            }

            this.showStatus(`Error: ${error.message}`, 'error');
            this.displayDescription(`Error: ${error.message}. Check browser console (F12) for details.`);
            this.hideLoading();
        }
    }

    displayDescription(text) {
        this.descriptionOutput.innerHTML = `<p>${text}</p>`;
        this.descriptionOutput.focus();
    }

    loadSettings() {
        const saved = localStorage.getItem('buddy_vision_settings');
        if (saved) {
            const settings = JSON.parse(saved);
            this.settings = { ...this.settings, ...settings };

            // Apply voice speed if available
            if (window.buddyVoice && this.settings.voiceSpeed) {
                window.buddyVoice.setRate(this.settings.voiceSpeed);
            }
        }
    }

    saveSettings() {
        localStorage.setItem('buddy_vision_settings', JSON.stringify(this.settings));
    }

    showStatus(message, type = 'info') {
        this.statusMessages.textContent = message;
        this.statusMessages.className = `status-container ${type}`;
    }

    showLoading(message = 'Processing...') {
        this.loadingText.textContent = message;
        this.loadingOverlay.removeAttribute('hidden');

        // Safety timeout: Auto-hide after 35 seconds to prevent stuck loading
        if (this.loadingTimeout) {
            clearTimeout(this.loadingTimeout);
        }
        this.loadingTimeout = setTimeout(() => {
            console.warn('⚠️ Loading timeout - auto-hiding overlay');
            this.hideLoading();
            this.showStatus('Request timed out. Please try again.', 'error');
        }, 35000);
    }

    hideLoading() {
        if (this.loadingTimeout) {
            clearTimeout(this.loadingTimeout);
            this.loadingTimeout = null;
        }
        this.loadingOverlay.setAttribute('hidden', '');
    }

    announceToScreenReader(message) {
        // Create a temporary live region announcement
        const announcement = document.createElement('div');
        announcement.setAttribute('role', 'status');
        announcement.setAttribute('aria-live', 'polite');
        announcement.className = 'sr-only';
        announcement.textContent = message;
        document.body.appendChild(announcement);

        setTimeout(() => {
            document.body.removeChild(announcement);
        }, 1000);
    }
}

/**
 * Update all UI text elements based on selected language
 * @param {string} languageCode - Language code (e.g., 'es-ES')
 */
function updateUILanguage(languageCode) {
    console.log('=== updateUILanguage called with:', languageCode, '===');
    console.log('buddyTranslations available:', !!window.buddyTranslations);

    const translations = window.buddyTranslations?.getTranslations(languageCode);
    if (!translations) {
        console.error('Translations not found for:', languageCode);
        console.log('Available translations:', window.buddyTranslations ? Object.keys(window.buddyTranslations.translations) : 'none');
        return;
    }

    console.log('Translations loaded for:', languageCode);
    console.log('Sample translation:', translations.captureButton);

    // Update header tagline
    const tagline = document.querySelector('.tagline');
    if (tagline) {
        tagline.textContent = translations.tagline;
    }

    // Update language selector label
    const languageLabel = document.querySelector('.language-label .label-text');
    if (languageLabel) {
        languageLabel.textContent = translations.languageLabel;
    }

    // Update main capture button
    const captureBtn = document.getElementById('capture-btn');
    console.log('Capture button found:', !!captureBtn);
    if (captureBtn) {
        const btnText = captureBtn.querySelector('.btn-text');
        console.log('Capture button text element found:', !!btnText);
        if (btnText) {
            console.log('OLD capture text:', btnText.textContent);
            btnText.textContent = translations.captureButton;
            console.log('NEW capture text:', btnText.textContent);
        } else {
            console.error('ERROR: .btn-text not found inside capture button!');
        }
        captureBtn.setAttribute('aria-label', translations.captureButton);
    } else {
        console.error('ERROR: Capture button (#capture-btn) not found!');
    }

    // Update repeat button
    const repeatBtn = document.getElementById('repeat-btn');
    console.log('Repeat button found:', !!repeatBtn);
    if (repeatBtn) {
        const btnText = repeatBtn.querySelector('.btn-text');
        console.log('Repeat button text element found:', !!btnText);
        if (btnText) {
            console.log('OLD repeat text:', btnText.textContent);
            btnText.textContent = translations.repeatButton;
            console.log('NEW repeat text:', btnText.textContent);
        } else {
            console.error('ERROR: .btn-text not found inside repeat button!');
        }
        repeatBtn.setAttribute('aria-label', translations.repeatButton);
    } else {
        console.error('ERROR: Repeat button (#repeat-btn) not found!');
    }

    // Update read text button
    const readTextBtn = document.getElementById('read-text-btn');
    console.log('Read text button found:', !!readTextBtn);
    if (readTextBtn) {
        const btnText = readTextBtn.querySelector('.btn-text');
        console.log('Read text button text element found:', !!btnText);
        if (btnText) {
            console.log('OLD read text:', btnText.textContent);
            btnText.textContent = translations.readTextButton;
            console.log('NEW read text:', btnText.textContent);
        } else {
            console.error('ERROR: .btn-text not found inside read text button!');
        }
        readTextBtn.setAttribute('aria-label', translations.readTextButton);
    } else {
        console.error('ERROR: Read text button (#read-text-btn) not found!');
    }

    // Update placeholder text
    const placeholderText = document.querySelector('.placeholder-text');
    if (placeholderText) {
        placeholderText.textContent = translations.placeholder;
    }

    // Update footer
    const footerText = document.querySelector('footer p');
    if (footerText) {
        // Preserve the links structure
        const linksHtml = footerText.innerHTML.match(/<a[^>]*>.*?<\/a>/gi)?.join(' | ') || '';
        footerText.innerHTML = `${translations.footerText}${linksHtml ? ' | ' + linksHtml : ''}`;
    }

    console.log('UI language updated successfully');
}

// Expose globally so voice.js can call it
window.updateUILanguage = updateUILanguage;
console.log('updateUILanguage function registered on window object');

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        console.log('DOM Content Loaded');
        window.buddyApp = new BuddyVision();
    });
} else {
    console.log('DOM already loaded, initializing immediately');
    window.buddyApp = new BuddyVision();
}
