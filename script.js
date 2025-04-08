document.addEventListener('DOMContentLoaded', function() {
    // Adjust paths for resources based on page location
    const isInPagesDir = window.location.pathname.includes('/pages/');
    const pathPrefix = isInPagesDir ? '../' : '';
    
    const form = document.getElementById('datadog-form');
    
    // Add automatic sorting for episode cards on the index page
    sortEpisodesByDate();
    
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
    
    // Handle the feedback form
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

    // Initialize additional features
    initializeSuggestionForm();
    generateResourceThumbnails();
    initializeTagFilters();
    initializeMobileMenu();
    // Date sorting functionality removed
    // initializeDateSorting();
    // initialSortByDate();
    
    // Generate thumbnail images for resources
    function generateResourceThumbnails() {
        const resourceCards = document.querySelectorAll('.resource-card');
        
        resourceCards.forEach(card => {
            const imageContainer = card.querySelector('.resource-card-image');
            if (!imageContainer) return;
            
            const img = imageContainer.querySelector('img');
            if (!img) return;
            
            if (!img.complete || img.naturalHeight === 0 || img.src.includes('resource-placeholder.jpg')) {
                // Get details to generate a unique but consistent thumbnail
                const title = card.querySelector('h2').textContent;
                const sourceElement = card.querySelector('.resource-source');
                const source = sourceElement ? sourceElement.textContent : 'source';
                
                // Create a canvas element
                const canvas = document.createElement('canvas');
                canvas.width = 400;
                canvas.height = 200;
                const ctx = canvas.getContext('2d');
                
                // Generate a color based on the title and source
                const hash = stringToHash(title + source);
                const hue = hash % 360;
                const saturation = 70;
                const lightness = 65;
                
                // Fill with gradient background
                const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
                gradient.addColorStop(0, `hsl(${hue}, ${saturation}%, ${lightness}%)`);
                gradient.addColorStop(1, `hsl(${(hue + 40) % 360}, ${saturation}%, ${lightness}%)`);
                ctx.fillStyle = gradient;
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                
                // Add a pattern overlay for texture
                ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
                for (let i = 0; i < canvas.width; i += 20) {
                    for (let j = 0; j < canvas.height; j += 20) {
                        if ((i + j) % 40 === 0) {
                            ctx.fillRect(i, j, 10, 10);
                        }
                    }
                }
                
                // Add initials or first letters in a circle
                const initials = getInitials(title);
                ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
                ctx.font = 'bold 72px Inter, sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                
                // Draw a semi-transparent white circle
                ctx.beginPath();
                ctx.arc(canvas.width / 2, canvas.height / 2, 70, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
                ctx.fill();
                
                // Draw the text
                ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
                ctx.fillText(initials, canvas.width / 2, canvas.height / 2);
                
                // Replace the image source with canvas data
                img.src = canvas.toDataURL('image/png');
                
                // Set image properties
                img.alt = title;
                img.style.objectFit = 'cover';
                img.style.width = '100%';
                img.style.height = '100%';
            }
        });
    }
    
    // Helper function to get initials from title
    function getInitials(title) {
        // Split by spaces and get first letters of first two words
        const words = title.split(' ').filter(word => word.length > 0);
        
        if (words.length === 1) {
            // If only one word, take first two letters
            return words[0].substring(0, 2).toUpperCase();
        } else {
            // Take first letter of first two words
            return (words[0][0] + words[1][0]).toUpperCase();
        }
    }
    
    // Helper function to convert string to a hash number
    function stringToHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return Math.abs(hash);
    }

    // Initialize resource suggestion form
    function initializeSuggestionForm() {
        const suggestButton = document.getElementById('suggest-resource-btn');
        const resourceForm = document.getElementById('resource-form');
        const suggestionForm = document.getElementById('resource-suggestion-form');

        if (!suggestButton || !resourceForm || !suggestionForm) return;

        // Toggle form visibility
        suggestButton.addEventListener('click', function() {
            resourceForm.classList.toggle('hidden');
            if (!resourceForm.classList.contains('hidden')) {
                const firstInput = resourceForm.querySelector('input');
                if (firstInput) firstInput.focus();
            }
        });

        // Handle form submission
        suggestionForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Get form data
            const title = document.getElementById('resource-title').value;
            const url = document.getElementById('resource-url').value;
            const source = document.getElementById('resource-source').value;
            const category = document.getElementById('resource-category').value;
            const description = document.getElementById('resource-description').value;
            const name = document.getElementById('your-name').value;
            const email = document.getElementById('your-email').value;
            
            // Create payload
            const payload = {
                message: 'Resource Suggestion',
                ddsource: 'website',
                ddtags: `category:${category}`,
                hostname: window.location.hostname,
                service: 'ai-tools-website',
                status: 'info',
                resource: {
                    title: title,
                    url: url,
                    source: source,
                    category: category,
                    description: description
                },
                user: {
                    name: name || 'Anonymous',
                    email: email || 'Not provided'
                },
                timestamp: new Date().toISOString()
            };
            
            // For now, just show an alert
            console.log('Resource suggestion payload:', payload);
            alert('Thank you for your resource suggestion! Our team will review it shortly.');
            
            // Clear form and hide it
            suggestionForm.reset();
            resourceForm.classList.add('hidden');
        });
    }

    // Initialize Prism.js if it's available
    if (typeof Prism !== 'undefined') {
        Prism.highlightAll();
    }
    
    // Initialize any tag filters on the page
    function initializeTagFilters() {
        const tagFilters = document.querySelectorAll('.tag-filter');
        const categoryFilter = document.getElementById('episode-category-filter');
        const tagButtonsContainer = document.querySelector('.tag-buttons');
        
        if (tagFilters.length === 0) return;
        
        // Add visual feedback for touch devices
        if (tagButtonsContainer) {
            // Prevent horizontal scrolling from triggering filter changes unintentionally
            tagButtonsContainer.addEventListener('scroll', function(e) {
                // Set a flag to indicate the container is scrolling
                tagButtonsContainer.setAttribute('data-scrolling', 'true');
                
                // Clear the flag after scrolling stops
                clearTimeout(tagButtonsContainer.scrollTimeout);
                tagButtonsContainer.scrollTimeout = setTimeout(function() {
                    tagButtonsContainer.setAttribute('data-scrolling', 'false');
                }, 150);
            });
        }
        
        // Handle category filtering
        if (categoryFilter) {
            categoryFilter.addEventListener('change', function() {
                const selectedCategory = this.value;
                const cards = document.querySelectorAll('.recording-card, .resource-card');
                
                cards.forEach(card => {
                    const cardCategory = card.getAttribute('data-category');
                    
                    if (selectedCategory === 'all' || cardCategory === selectedCategory) {
                        // Only show if it also passes the tag filters
                        const activeFilters = Array.from(document.querySelectorAll('.tag-filter.active'))
                            .map(el => el.getAttribute('data-tag'));
                        
                        if (shouldShowCardByTags(card, activeFilters)) {
                            card.style.display = 'block';
                        }
                    } else {
                        card.style.display = 'none';
                    }
                });
            });
        }
        
        // Handle tag filtering
        tagFilters.forEach(filter => {
            filter.addEventListener('click', function(e) {
                // Don't activate the filter if the container is still scrolling (prevents accidental activations)
                if (tagButtonsContainer && tagButtonsContainer.getAttribute('data-scrolling') === 'true') {
                    return;
                }
                
                const tag = this.getAttribute('data-tag');
                
                // Add tactile feedback for mobile
                this.style.transform = 'scale(0.95)';
                setTimeout(() => {
                    this.style.transform = '';
                }, 150);
                
                // Make this the only active tag of its group
                const otherTagsInGroup = Array.from(
                    this.closest('.tag-buttons').querySelectorAll('.tag-filter')
                ).filter(t => t !== this);
                
                otherTagsInGroup.forEach(t => t.classList.remove('active'));
                this.classList.add('active');
                
                // Get all currently active filters
                const activeFilters = Array.from(document.querySelectorAll('.tag-filter.active'))
                    .map(el => el.getAttribute('data-tag'));
                
                // Filter the cards
                filterCardsByTags(activeFilters);
            });
        });
    }

    function filterCardsByTags(activeTags) {
        // Works for both recording-card and resource-card
        const cards = document.querySelectorAll('.recording-card, .resource-card');
        const categoryFilter = document.getElementById('episode-category-filter');
        const selectedCategory = categoryFilter ? categoryFilter.value : 'all';
        
        cards.forEach(card => {
            const cardCategory = card.getAttribute('data-category');
            const categoryMatch = selectedCategory === 'all' || cardCategory === selectedCategory;
            const tagMatch = shouldShowCardByTags(card, activeTags);
            
            card.style.display = (categoryMatch && tagMatch) ? 'block' : 'none';
        });
    }

    function shouldShowCardByTags(card, activeTags) {
        if (activeTags.length === 0 || activeTags.includes('all')) {
            return true;
        }
        
        const cardTags = card.getAttribute('data-tags') ? 
            card.getAttribute('data-tags').split(',') : [];
        
        // Check if the card has at least one of the active tags
        return activeTags.some(tag => cardTags.includes(tag));
    }

    // Improved mobile menu initialization with better link handling
    function initializeMobileMenu() {
        console.log('Initializing mobile menu');
        
        // Remove existing hamburger menu if present
        const existingMenu = document.querySelector('.hamburger-menu');
        if (existingMenu) {
            existingMenu.remove();
        }
        
        const siteHeader = document.querySelector('.site-header');
        const headerContainer = document.querySelector('.site-header .container');
        const nav = document.querySelector('.site-header nav');
        
        if (!siteHeader || !headerContainer || !nav) {
            console.error('Required elements not found');
            return;
        }
        
        // Create hamburger menu button
        const hamburgerMenu = document.createElement('div');
        hamburgerMenu.className = 'hamburger-menu';
        hamburgerMenu.setAttribute('role', 'button');
        hamburgerMenu.setAttribute('tabindex', '0');
        hamburgerMenu.setAttribute('aria-label', 'Toggle navigation menu');
        hamburgerMenu.innerHTML = '⚛';
        
        // Only apply display:block when screen is mobile size
        if (window.innerWidth <= 768) {
            hamburgerMenu.style.display = 'flex';
        } else {
            hamburgerMenu.style.display = 'none';
        }
        
        // Add minimal inline styles (most styles come from CSS)
        hamburgerMenu.style.position = 'absolute';
        hamburgerMenu.style.right = '15px';
        
        // Add to DOM
        headerContainer.appendChild(hamburgerMenu);
        
        // Create overlay
        const menuOverlay = document.createElement('div');
        menuOverlay.className = 'menu-overlay';
        document.body.appendChild(menuOverlay);
        
        // Function to toggle menu state
        function toggleMenu() {
            console.log('Toggling menu');
            nav.classList.toggle('open');
            hamburgerMenu.classList.toggle('active');
            menuOverlay.classList.toggle('active');
            
            if (nav.classList.contains('open')) {
                document.body.style.overflow = 'hidden';
            } else {
                document.body.style.overflow = '';
            }
        }
        
        // Toggle menu on hamburger click
        hamburgerMenu.addEventListener('click', function(e) {
            e.stopPropagation();
            toggleMenu();
        });
        
        // Toggle on keypress for accessibility
        hamburgerMenu.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggleMenu();
            }
        });
        
        // Close menu when clicking overlay
        menuOverlay.addEventListener('click', function() {
            toggleMenu();
        });
        
        // Handle navigation links
        const navLinks = nav.querySelectorAll('a');
        navLinks.forEach(link => {
            // Remove existing event listeners
            const newLink = link.cloneNode(true);
            link.parentNode.replaceChild(newLink, link);
            
            // Add click listener with delayed navigation
            newLink.addEventListener('click', function(e) {
                e.preventDefault();
                const href = this.getAttribute('href');
                console.log('Link clicked: ' + href);
                
                // Close menu first
                toggleMenu();
                
                // Navigate after a short delay to allow menu to close
                setTimeout(function() {
                    window.location.href = href;
                }, 300);
            });
        });
        
        // Handle window resize - show/hide hamburger based on screen width
        window.addEventListener('resize', function() {
            // Update hamburger visibility based on screen size
            if (window.innerWidth <= 768) {
                hamburgerMenu.style.display = 'flex';
            } else {
                hamburgerMenu.style.display = 'none';
                
                // If menu is open and screen size increases, close the menu
                if (nav.classList.contains('open')) {
                    toggleMenu();
                }
            }
        });
        
        console.log('Mobile menu initialized successfully');
    }

    // Date sorting functions (commented out as UI elements were removed)
    /*
    function initializeDateSorting() {
        const dateToggle = document.getElementById('date-sort-toggle');
        if (!dateToggle) return;
        
        // Set initial arrow direction based on data-sort attribute
        updateSortArrow(dateToggle);
        
        dateToggle.addEventListener('click', function() {
            // Toggle sort direction
            const currentSort = this.getAttribute('data-sort');
            const newSort = currentSort === 'newest' ? 'oldest' : 'newest';
            
            // Update button state
            this.setAttribute('data-sort', newSort);
            
            // Update arrow direction
            updateSortArrow(this);
            
            // Sort the cards (works for both recording and resource cards)
            const cardsContainer = document.querySelector('.recording-grid') || document.querySelector('.resource-grid');
            if (!cardsContainer) return;
            
            const cards = Array.from(cardsContainer.children);
            
            cards.sort((a, b) => {
                const dateA = getCardDate(a);
                const dateB = getCardDate(b);
                
                // Compare dates (newest first or oldest first)
                return newSort === 'newest' 
                    ? new Date(dateB) - new Date(dateA) 
                    : new Date(dateA) - new Date(dateB);
            });
            
            // Remove existing cards
            cards.forEach(card => card.remove());
            
            // Append sorted cards
            cards.forEach(card => cardsContainer.appendChild(card));
        });
    }

    // Update sort arrow direction based on sort state
    function updateSortArrow(toggleButton) {
        const arrow = toggleButton.querySelector('.sort-arrow');
        if (!arrow) return;
        
        if (toggleButton.getAttribute('data-sort') === 'newest') {
            arrow.innerHTML = '↓';
            arrow.title = 'Newest first';
        } else {
            arrow.innerHTML = '↑';
            arrow.title = 'Oldest first';
        }
    }

    // Sort content by date (newest first) when the page loads
    function initialSortByDate() {
        const cardsContainer = document.querySelector('.recording-grid') || document.querySelector('.resource-grid');
        if (!cardsContainer) return;
        
        const cards = Array.from(cardsContainer.children);
        
        // Sort cards by date (newest first)
        cards.sort((a, b) => {
            const dateA = getCardDate(a);
            const dateB = getCardDate(b);
            
            return new Date(dateB) - new Date(dateA); // Newest first
        });
        
        // Remove existing cards
        cards.forEach(card => card.remove());
        
        // Append sorted cards
        cards.forEach(card => cardsContainer.appendChild(card));
        
        // Update the sort button to show current sort state
        const dateToggle = document.getElementById('date-sort-toggle');
        if (dateToggle) {
            dateToggle.setAttribute('data-sort', 'newest');
        }
    }
    */

    function getCardDate(card) {
        // Extract date from either recording-card or resource-card
        const dateElement = card.querySelector('.recording-date') || card.querySelector('.resource-date');
        if (!dateElement) return new Date(0); // Return epoch if no date found
        
        const dateText = dateElement.textContent.trim();
        
        // Parse the date in format "Month DD, YYYY"
        try {
            // Use Date.parse for standard format
            const parsedDate = new Date(dateText);
            
            // Check if valid date was parsed
            if (!isNaN(parsedDate.getTime())) {
                return parsedDate;
            }
            
            // Fallback to manual parsing for "Month DD, YYYY" format
            const parts = dateText.match(/(\w+)\s+(\d+),\s+(\d+)/);
            if (parts) {
                const month = getMonthNumber(parts[1]);
                const day = parseInt(parts[2], 10);
                const year = parseInt(parts[3], 10);
                return new Date(year, month, day);
            }
            
            // If we can't parse the date, return epoch
            return new Date(0);
        } catch (e) {
            console.warn('Error parsing date:', dateText, e);
            return new Date(0);
        }
    }

    // Helper function to convert month name to number (0-11)
    function getMonthNumber(monthName) {
        const months = {
            'January': 0, 'February': 1, 'March': 2, 'April': 3, 
            'May': 4, 'June': 5, 'July': 6, 'August': 7,
            'September': 8, 'October': 9, 'November': 10, 'December': 11
        };
        
        return months[monthName] || 0;
    }

    // Function to sort episode cards by date (newest first)
    function sortEpisodesByDate() {
        // Only run on index page
        if (!window.location.pathname.includes('index.html')) return;
        
        const cardsContainer = document.querySelector('.recording-grid');
        if (!cardsContainer) return;
        
        console.log('Sorting episodes by date (newest first)');
        
        const cards = Array.from(cardsContainer.children);
        
        // Sort cards by date (newest first)
        cards.sort((a, b) => {
            const dateA = getCardDate(a);
            const dateB = getCardDate(b);
            
            return new Date(dateB) - new Date(dateA); // Newest first
        });
        
        // Remove existing cards
        cards.forEach(card => card.remove());
        
        // Append sorted cards
        cards.forEach(card => cardsContainer.appendChild(card));
        
        console.log('Episodes sorted successfully');
    }
});