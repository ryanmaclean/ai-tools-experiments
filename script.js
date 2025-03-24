document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('datadog-form');
    
    // Make transcript timestamps clickable
    const makeTimestampsClickable = function() {
        // Get YouTube video ID from meta property or chapter markers
        let videoId = '';
        const chapterMarkers = document.querySelector('.chapter-markers');
        if (chapterMarkers) {
            const firstChapterLink = chapterMarkers.querySelector('a');
            if (firstChapterLink) {
                const href = firstChapterLink.getAttribute('href');
                if (href.includes('youtu.be/')) {
                    videoId = href.split('youtu.be/')[1].split('?')[0];
                } else if (href.includes('youtube.com/watch?v=')) {
                    videoId = href.split('v=')[1].split('&')[0];
                }
            }
        }
        
        if (!videoId) {
            const videoContainer = document.querySelector('.video-container a');
            if (videoContainer) {
                const href = videoContainer.getAttribute('href');
                if (href.includes('youtu.be/')) {
                    videoId = href.split('youtu.be/')[1].split('?')[0];
                } else if (href.includes('youtube.com/watch?v=')) {
                    videoId = href.split('v=')[1].split('&')[0];
                }
            }
        }
        
        if (!videoId) return;
        
        // Find all transcript timestamps
        const timestampElements = document.querySelectorAll('.transcript-timestamp');
        
        timestampElements.forEach(function(element) {
            const timestamp = element.textContent;
            // Extract time in [HH:MM:SS] format
            const timeMatch = timestamp.match(/\[(\d{2}):(\d{2}):(\d{2})\]/);
            
            if (timeMatch) {
                // Convert to seconds for YouTube t parameter
                const hours = parseInt(timeMatch[1], 10);
                const minutes = parseInt(timeMatch[2], 10);
                const seconds = parseInt(timeMatch[3], 10);
                const totalSeconds = hours * 3600 + minutes * 60 + seconds;
                
                // Create a wrapper link element
                const link = document.createElement('a');
                link.href = `https://youtu.be/${videoId}?t=${totalSeconds}`;
                link.target = '_blank';
                link.classList.add('timestamp-link');
                link.title = 'Click to watch this part of the video';
                
                // Add styling to show it's clickable
                element.style.cursor = 'pointer';
                element.style.color = '#0066cc';
                element.style.textDecoration = 'underline';
                
                // Replace the timestamp element with the link element
                const parent = element.parentNode;
                parent.insertBefore(link, element);
                link.appendChild(element);
            }
        });
    };
    
    // Run the timestamp conversion function
    makeTimestampsClickable();
    
    if (form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Get form data
            const name = document.getElementById('name').value;
            const email = document.getElementById('email').value;
            const tool = document.getElementById('tool').value;
            const feedback = document.getElementById('feedback').value;
            
            // Create payload for Datadog
            const payload = {
                message: 'User Feedback Submission',
                ddsource: 'website',
                ddtags: `tool:${tool || 'not_specified'}`,
                hostname: window.location.hostname,
                service: 'ai-tools-website',
                status: 'info',
                user: {
                    name: name,
                    email: email
                },
                feedback: feedback,
                timestamp: new Date().toISOString()
            };
            
            // Send to Datadog Logs API via our proxy
            sendToDatadog(payload);
        });
    }
    
    function sendToDatadog(payload) {
        console.log('Preparing to send data to Datadog via proxy...');
        
        // Display sending state
        const submitButton = document.querySelector('#datadog-form button[type="submit"]');
        const originalButtonText = submitButton.textContent;
        submitButton.textContent = 'Sending...';
        submitButton.disabled = true;
        
        // Log what we're sending
        console.log('Payload being sent:', payload);

        // We'll use a proxy endpoint to avoid CORS issues
        // This requires deploying to Netlify with the serverless function
        let proxyUrl;
        
        // Determine if we're in development or production
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            // For local development testing (will be mocked)
            console.log('Development mode - simulating successful send');
            
            // Simulate a successful response after a delay
            setTimeout(() => {
                console.log('Development mode - simulated successful response');
                
                // Reset button
                submitButton.textContent = originalButtonText;
                submitButton.disabled = false;
                
                // Show success message and clear form
                alert('Feedback submitted (development mode)!');
                clearForm();
            }, 1000);
            
            return;
        } else {
            // For production - use the deployed Netlify function
            proxyUrl = '/api/datadog';
        }
        
        fetch(proxyUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify([payload])
        })
        .then(response => {
            console.log('Proxy response status:', response.status);
            
            // Try to get response text even if not OK
            return response.text().then(text => {
                console.log('Proxy response text:', text);
                
                // Try to parse as JSON if possible
                let jsonResponse = null;
                try {
                    jsonResponse = JSON.parse(text);
                } catch (e) {
                    // Not JSON, that's fine
                }
                
                return { 
                    ok: response.ok, 
                    status: response.status, 
                    text: text,
                    json: jsonResponse
                };
            });
        })
        .then(result => {
            // Reset button state
            submitButton.textContent = originalButtonText;
            submitButton.disabled = false;
            
            if (result.ok) {
                console.log('Successfully sent to Datadog via proxy!');
                alert('Thank you for your feedback!');
                clearForm();
            } else {
                throw new Error(`Failed to submit feedback: ${result.status} - ${result.text}`);
            }
        })
        .catch(error => {
            // Reset button state
            submitButton.textContent = originalButtonText;
            submitButton.disabled = false;
            
            console.error('Error submitting feedback:', error);
            alert('There was a problem submitting your feedback. Please try again later.');
        });
    }
    
    function clearForm() {
        document.getElementById('name').value = '';
        document.getElementById('email').value = '';
        document.getElementById('tool').selectedIndex = 0;
        document.getElementById('feedback').value = '';
    }
});