// Remindo - Reminders App
// Handles reminders, notifications, and repeat logic

// Reminder storage key
const STORAGE_KEY = 'remindo_reminders';

// Helper: Get reminders from localStorage
function getReminders() {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
}

// Helper: Save reminders to localStorage
function saveReminders(reminders) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reminders));
}

// Helper: Request notification permission
function requestNotificationPermission() {
    if (Notification.permission === 'default') {
        Notification.requestPermission();
    }
}

// Helper: Show notification
function showNotification(reminder) {
    if (Notification.permission === 'granted') {
        new Notification('Remindo Reminder', {
            body: reminder.text,
            tag: reminder.id
        });
    }
}

// Helper: Generate unique ID
function generateId() {
    return '_' + Math.random().toString(36).substr(2, 9);
}

// Helper: Get next occurrence for a reminder
function getNextOccurrence(reminder) {
    const now = new Date();
    let next = new Date();
    const [hour, minute] = reminder.time.split(':').map(Number);
    next.setHours(hour, minute, 0, 0);
    if (reminder.repeat === 'none') {
        if (next < now) return null;
        return next;
    }
    if (reminder.repeat === 'daily') {
        if (next < now) next.setDate(next.getDate() + 1);
        return next;
    }
    if (reminder.repeat === 'weekly') {
        // By weekday
        if (reminder.weekdays && reminder.weekdays.length > 0) {
            let days = reminder.weekdays.map(Number);
            let today = now.getDay();
            let minDiff = 8, nextDay = null;
            for (let d of days) {
                let diff = (d - today + 7) % 7;
                if (diff === 0 && next < now) diff = 7;
                if (diff < minDiff) {
                    minDiff = diff;
                    nextDay = d;
                }
            }
            next.setDate(now.getDate() + minDiff);
            return next;
        } else {
            // Default: next week
            if (next < now) next.setDate(next.getDate() + 7);
            return next;
        }
    }
    if (reminder.repeat === 'monthly') {
        // By date
        if (reminder.dates && reminder.dates.length > 0) {
            let days = reminder.dates.map(Number);
            let today = now.getDate();
            let minDiff = 32, nextDate = null;
            for (let d of days) {
                let diff = d - today;
                if (diff === 0 && next < now) diff = 31;
                if (diff < 0) diff += 31;
                if (diff < minDiff) {
                    minDiff = diff;
                    nextDate = d;
                }
            }
            next.setDate(today + minDiff);
            return next;
        } else {
            // Default: next month
            if (next < now) next.setMonth(next.getMonth() + 1);
            return next;
        }
    }
    return null;
}

// Render reminders list
function renderReminders() {
    const reminders = getReminders();
    const list = document.getElementById('reminders-list');
    list.innerHTML = '';
    reminders.forEach(reminder => {
        const li = document.createElement('li');
        li.className = 'reminder-item';
        const span = document.createElement('span');
        span.className = 'reminder-text' + (reminder.done ? ' done' : '');
        span.textContent = `${reminder.text} @ ${reminder.time}`;
        li.appendChild(span);
        if (!reminder.done) {
            const btn = document.createElement('button');
            btn.className = 'mark-done-btn';
            btn.textContent = 'Mark Done';
            btn.onclick = () => markReminderDone(reminder.id);
            li.appendChild(btn);
        }
        list.appendChild(li);
    });
}

// Mark reminder as done
function markReminderDone(id) {
    let reminders = getReminders();
    reminders = reminders.map(r => r.id === id ? { ...r, done: true } : r);
    saveReminders(reminders);
    renderReminders();
}

// Add reminder
function addReminder(e) {
    e.preventDefault();
    const text = document.getElementById('reminder-text').value.trim();
    const time = document.getElementById('reminder-time').value;
    const repeat = document.getElementById('repeat-type').value;
    let weekdays = [];
    let dates = [];
    if (repeat === 'weekly') {
        weekdays = Array.from(document.querySelectorAll('input[name="weekday"]:checked')).map(i => i.value);
    }
    if (repeat === 'monthly') {
        dates = Array.from(document.querySelectorAll('input[name="date"]:checked')).map(i => i.value);
    }
    const reminder = {
        id: generateId(),
        text,
        time,
        repeat,
        weekdays,
        dates,
        done: false
    };
    const reminders = getReminders();
    reminders.push(reminder);
    saveReminders(reminders);
    renderReminders();
    document.getElementById('reminder-form').reset();
}

// Handle repeat options UI
function handleRepeatOptions() {
    const repeat = document.getElementById('repeat-type').value;
    const optionsDiv = document.getElementById('repeat-options');
    optionsDiv.innerHTML = '';
    if (repeat === 'weekly') {
        // Weekday checkboxes
        const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
        days.forEach((d, i) => {
            const label = document.createElement('label');
            label.style.marginRight = '8px';
            label.innerHTML = `<input type="checkbox" name="weekday" value="${i}"> ${d}`;
            optionsDiv.appendChild(label);
        });
    } else if (repeat === 'monthly') {
        // Date checkboxes (1-31)
        for (let i = 1; i <= 31; i++) {
            const label = document.createElement('label');
            label.style.marginRight = '4px';
            label.innerHTML = `<input type="checkbox" name="date" value="${i}"> ${i}`;
            optionsDiv.appendChild(label);
            if (i % 7 === 0) optionsDiv.appendChild(document.createElement('br'));
        }
    }
}

document.getElementById('reminder-form').addEventListener('submit', addReminder);
document.getElementById('repeat-type').addEventListener('change', handleRepeatOptions);

// Notification scheduler: checks every minute for due reminders
function scheduleNotifications() {
    setInterval(() => {
        const reminders = getReminders();
        const now = new Date();
        reminders.forEach(reminder => {
            if (reminder.done) return;
            const next = getNextOccurrence(reminder);
            if (!next) return;
            // If within 5 minutes window
            const diff = Math.abs(now - next);
            if (diff < 5 * 60 * 1000) {
                showNotification(reminder);
            }
        });
    }, 60 * 1000); // Check every minute
}

// On load
window.onload = function() {
    requestNotificationPermission();
    renderReminders();
    handleRepeatOptions();
    scheduleNotifications();
}; 