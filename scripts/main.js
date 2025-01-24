// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // Get form and elements
    const form = {
        element: document.getElementById('excuse-form'),
        userName: document.getElementById('user-name'),
        targetPerson: document.getElementById('target-person'),
        activity: document.getElementById('activity'),
        location: document.getElementById('location'),
        toneSelect: document.getElementById('tone-select'),
        generateBtn: document.getElementById('generate-btn')
    };

    const ui = {
        excuseText: document.getElementById('excuse-text'),
        loadingSpinner: document.getElementById('loading-spinner'),
        copyBtn: document.getElementById('copy-btn'),
        shareBtn: document.getElementById('share-btn'),
        saveBtn: document.getElementById('save-btn'),
        shareModal: document.getElementById('share-modal'),
        closeModal: document.getElementById('close-modal'),
        shareWhatsApp: document.getElementById('share-whatsapp'),
        shareTwitter: document.getElementById('share-twitter'),
        shareEmail: document.getElementById('share-email'),
        savedExcuses: document.getElementById('saved-excuses'),
        savedExcusesList: document.getElementById('saved-excuses-list'),
        themeSwitch: document.getElementById('theme-switch'),
        notification: document.getElementById('notification')
    };

    // State Management
    let currentExcuse = '';
    const savedExcuses = JSON.parse(localStorage.getItem('savedExcuses')) || [];

    // Theme Management
    const theme = {
        init() {
            const savedTheme = localStorage.getItem('theme');
            if (savedTheme) {
                document.documentElement.setAttribute('data-theme', savedTheme);
                ui.themeSwitch.checked = savedTheme === 'dark';
            }
            this.addListeners();
        },

        addListeners() {
            ui.themeSwitch.addEventListener('change', () => {
                const newTheme = ui.themeSwitch.checked ? 'dark' : 'light';
                document.documentElement.setAttribute('data-theme', newTheme);
                localStorage.setItem('theme', newTheme);
            });
        }
    };

    // Notification System
    const notification = {
        show(message, type = 'success') {
            ui.notification.textContent = message;
            ui.notification.className = `notification show ${type}`;
            setTimeout(() => {
                ui.notification.className = 'notification';
            }, 3000);
        }
    };

    // Generate excuse using AI
    async function generateAIExcuse() {
        try {
            ui.excuseText.textContent = '';
            ui.loadingSpinner.classList.remove('hidden');

            const response = await fetch('/generate-ai-excuse', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userName: form.userName.value,
                    targetPerson: form.targetPerson.value,
                    activity: form.activity.value,
                    location: form.location.value,
                    tone: form.toneSelect.value
                })
            });

            const data = await response.json();
        
            if (!response.ok) {
                throw new Error(data.message || 'Failed to generate excuse');
            }

            // Store the raw excuse text for sharing
            currentExcuse = data.excuse.formatted;
            
            // Display the formatted excuse
            displayFormattedExcuse(data);

            return data.excuse.formatted;
        } catch (error) {
            console.error('Error generating AI excuse:', error);
            notification.show(error.message, 'error');
            return null;
        } finally {
            ui.loadingSpinner.classList.add('hidden');
        }
    }

    function displayFormattedExcuse(data) {
        const { excuse, metadata, formatting } = data;
        const excuseContainer = document.querySelector('.excuse-container');
        const excuseHeader = document.querySelector('.excuse-header h3');
        
        // Apply tone-specific styling
        excuseContainer.style.fontFamily = formatting.font;
        excuseContainer.style.borderLeft = `4px solid ${formatting.color}`;
        excuseHeader.innerHTML = `Your ${metadata.tone.charAt(0).toUpperCase() + metadata.tone.slice(1)} Excuse ${formatting.icon}`;

        // Create the formatted excuse HTML
        const excuseHTML = `
            <div class="excuse-content">
                ${excuse.components.greeting ? `
                    <div class="excuse-greeting" style="color: ${formatting.color}; font-weight: 600;">
                        ${excuse.components.greeting}
                    </div>
                ` : ''}
                
                <div class="excuse-main">
                    ${excuse.components.mainExcuse}
                </div>
                
                ${excuse.components.closing ? `
                    <div class="excuse-closing" style="color: ${formatting.color}; font-style: italic;">
                        ${excuse.components.closing}
                    </div>
                ` : ''}
            </div>
            
            <div class="excuse-metadata">
                <div class="metadata-item">
                    <i class="fas fa-clock" style="color: ${formatting.color}"></i>
                    Generated: ${new Date(metadata.generated).toLocaleTimeString()}
                </div>
                <div class="metadata-item">
                    <i class="fas fa-text-width" style="color: ${formatting.color}"></i>
                    Words: ${excuse.stats.wordCount}
                </div>
            </div>
        `;

        ui.excuseText.innerHTML = excuseHTML;

        // Add animation
        excuseContainer.style.opacity = '0';
        excuseContainer.style.transform = 'translateY(20px)';
        
        requestAnimationFrame(() => {
            excuseContainer.style.transition = 'all 0.5s ease';
            excuseContainer.style.opacity = '1';
            excuseContainer.style.transform = 'translateY(0)';
        });
    }

    // Sharing Functions
    const sharing = {
        showModal() {
            ui.shareModal.classList.remove('hidden');
        },

        hideModal() {
            ui.shareModal.classList.add('hidden');
        },

        whatsApp() {
            const text = encodeURIComponent(currentExcuse);
            window.open(`https://wa.me/?text=${text}`, '_blank');
        },

        twitter() {
            const text = encodeURIComponent(currentExcuse);
            window.open(`https://twitter.com/intent/tweet?text=${text}`, '_blank');
        },

        email() {
            const subject = encodeURIComponent('My Creative Excuse');
            const body = encodeURIComponent(currentExcuse);
            window.location.href = `mailto:?subject=${subject}&body=${body}`;
        }
    };

    // Saved Excuses Management
    const savedExcusesManager = {
        save() {
            if (!currentExcuse) {
                notification.show('Generate an excuse first!', 'error');
                return;
            }
            
            const excuse = {
                id: Date.now(),
                text: currentExcuse,
                date: new Date().toISOString(),
                tone: form.toneSelect.value
            };

            // Check for duplicates
            const isDuplicate = savedExcuses.some(e => e.text === currentExcuse);
            if (isDuplicate) {
                notification.show('This excuse is already saved!', 'info');
                return;
            }

            savedExcuses.unshift(excuse);
            localStorage.setItem('savedExcuses', JSON.stringify(savedExcuses));
            this.updateUI();
            notification.show('Excuse saved to favorites!', 'success');
        },

        delete(id) {
            const index = savedExcuses.findIndex(excuse => excuse.id === id);
            if (index !== -1) {
                // Add removing animation
                const excuseElement = document.querySelector(`[data-id="${id}"]`);
                if (excuseElement) {
                    excuseElement.classList.add('removing');
                    setTimeout(() => {
                        savedExcuses.splice(index, 1);
                        localStorage.setItem('savedExcuses', JSON.stringify(savedExcuses));
                        this.updateUI();
                        notification.show('Excuse removed from favorites', 'success');
                    }, 300);
                }
            }
        },

        updateUI() {
            if (savedExcuses.length === 0) {
                ui.savedExcuses.classList.add('hidden');
                ui.savedExcusesList.innerHTML = '<p class="no-excuses">No saved excuses yet. Generate and save some excuses! 📝</p>';
                return;
            }

            ui.savedExcuses.classList.remove('hidden');
            ui.savedExcusesList.innerHTML = savedExcuses
                .map(excuse => {
                    const date = new Date(excuse.date);
                    const formattedDate = date.toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                    });
                    const formattedTime = date.toLocaleTimeString(undefined, {
                        hour: '2-digit',
                        minute: '2-digit'
                    });

                    return `
                        <div class="saved-excuse-item" data-id="${excuse.id}">
                            <div class="saved-excuse-content">
                                <p>${excuse.text}</p>
                                <div class="excuse-metadata">
                                    <span class="tone-badge ${excuse.tone.toLowerCase()}">
                                        ${getToneIcon(excuse.tone)} ${excuse.tone}
                                    </span>
                                    <span>
                                        <i class="far fa-calendar"></i>
                                        ${formattedDate}
                                    </span>
                                    <span>
                                        <i class="far fa-clock"></i>
                                        ${formattedTime}
                                    </span>
                                </div>
                            </div>
                            <div class="saved-excuse-actions">
                                <button class="copy-btn" title="Copy to clipboard" onclick="copyExcuse('${excuse.id}')">
                                    <i class="fas fa-copy"></i>
                                </button>
                                <button class="share-btn" title="Share excuse" onclick="shareExcuse('${excuse.id}')">
                                    <i class="fas fa-share-alt"></i>
                                </button>
                                <button class="delete-btn" title="Delete excuse" onclick="savedExcusesManager.delete(${excuse.id})">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </div>
                    `;
                })
                .join('');
        }
    };

    // Helper function to get tone icon
    function getToneIcon(tone) {
        const icons = {
            'funny': '😄',
            'professional': '👔',
            'bizarre': '🌟',
            'dramatic': '🎭'
        };
        return icons[tone.toLowerCase()] || '📝';
    }

    // Copy excuse function
    function copyExcuse(id) {
        const excuse = savedExcuses.find(e => e.id === parseInt(id));
        if (excuse) {
            navigator.clipboard.writeText(excuse.text)
                .then(() => notification.show('Copied to clipboard!', 'success'))
                .catch(() => notification.show('Failed to copy', 'error'));
        }
    }

    // Share excuse function
    function shareExcuse(id) {
        const excuse = savedExcuses.find(e => e.id === parseInt(id));
        if (excuse) {
            currentExcuse = excuse.text;
            sharing.showModal();
        }
    }

    // Clipboard Functions
    const clipboard = {
        async copy() {
            try {
                await navigator.clipboard.writeText(currentExcuse);
                notification.show('Excuse copied to clipboard!');
            } catch (err) {
                notification.show('Failed to copy to clipboard', 'error');
            }
        }
    };

    // Event Listeners
    function addEventListeners() {
        form.element.addEventListener('submit', async (e) => {
            e.preventDefault();
            currentExcuse = await generateAIExcuse();
            if (currentExcuse) {
                savedExcusesManager.updateUI();
            }
        });

        ui.copyBtn.addEventListener('click', clipboard.copy);
        ui.shareBtn.addEventListener('click', sharing.showModal);
        ui.closeModal.addEventListener('click', sharing.hideModal);
        ui.shareWhatsApp.addEventListener('click', sharing.whatsApp);
        ui.shareTwitter.addEventListener('click', sharing.twitter);
        ui.shareEmail.addEventListener('click', sharing.email);
        ui.saveBtn.addEventListener('click', () => savedExcusesManager.save());

        // Close modal when clicking outside
        ui.shareModal.addEventListener('click', (e) => {
            if (e.target === ui.shareModal) sharing.hideModal();
        });
    }

    // Initialize
    function init() {
        theme.init();
        savedExcusesManager.updateUI();
        addEventListeners();
    }

    // Start the app
    init();
});
