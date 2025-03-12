document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('datadog-form');
    
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
            
            // Send to Datadog Logs API
            sendToDatadog(payload);
        });
    }
    
    function sendToDatadog(payload) {
        // The actual API key and Application key will be injected by the GitHub Action
        // This is just a placeholder that will be replaced during build
        const DD_API_KEY = '__DD_API_KEY__';
        const DD_APP_KEY = '__DD_APP_KEY__';
        
        // Don't actually send if we're using placeholder keys (development mode)
        if (DD_API_KEY.startsWith('__') || DD_APP_KEY.startsWith('__')) {
            console.log('Development mode - would have sent to Datadog:', payload);
            alert('Feedback submitted (development mode)!');
            clearForm();
            return;
        }
        
        fetch('https://http-intake.logs.datadoghq.com/api/v2/logs', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'DD-API-KEY': DD_API_KEY,
                'DD-APPLICATION-KEY': DD_APP_KEY
            },
            body: JSON.stringify([payload])
        })
        .then(response => {
            if (response.ok) {
                alert('Thank you for your feedback!');
                clearForm();
            } else {
                throw new Error('Failed to submit feedback');
            }
        })
        .catch(error => {
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