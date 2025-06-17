class NotificationManager {
    static show(type, title, message, iconUrl = null) {
        const notificationOptions = {
            type: 'basic',
            iconUrl: iconUrl || chrome.runtime.getURL('icons/icon48.png'),
            title: title,
            message: message
        };

        chrome.notifications.create(notificationOptions);
    }

    static showSuccess(message, title = 'qBittorrent Integration') {
        this.show('success', title, message);
    }

    static showError(message, title = 'qBittorrent Integration') {
        this.show('error', title, message);
    }

    static showInfo(message, title = 'qBittorrent Integration') {
        this.show('info', title, message);
    }
}

// Export for browser environment
if (typeof window !== 'undefined') {
    window.NotificationManager = NotificationManager;
}