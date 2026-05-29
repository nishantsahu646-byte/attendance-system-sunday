const API_URL = 'http://localhost:5000/api';
const token = localStorage.getItem('adminToken');

if (!token) {
    window.location.href = 'admin-login.html';
}

const msgBox = document.getElementById('msgBox');
const sessionQrImg = document.getElementById('sessionQrImg');
const timerSecs = document.getElementById('timerSecs');
const refreshQrBtn = document.getElementById('refreshQrBtn');

function showMessage(msg, isError = true) {
    if (!msgBox) return;
    msgBox.textContent = msg;
    msgBox.className = isError ? 'msg error' : 'msg success';
}

document.getElementById('logoutBtn')?.addEventListener('click', (e) => {
    e.preventDefault();
    localStorage.removeItem('adminToken');
    window.location.href = '../index.html';
});

let countdownValue = 15;
let timerInterval = null;

async function refreshSessionToken() {
    try {
        const res = await fetch(`${API_URL}/attendance/session-token`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const data = await res.json();
        
        if (res.ok) {
            // Enforce secure HTTPS for QR generation and URL encode token
            const qrData = data.sessionToken;
            const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qrData)}`;
            
            sessionQrImg.src = qrUrl;
            
            // Reset timer
            resetTimer();
        } else {
            showMessage(data.message || 'Failed to fetch session token');
        }
    } catch (error) {
        console.error('Error fetching session token', error);
        showMessage('Server connection error. Retrying...');
    }
}

function startTimer() {
    timerInterval = setInterval(() => {
        countdownValue--;
        if (timerSecs) {
            timerSecs.textContent = countdownValue;
        }
        
        if (countdownValue <= 0) {
            refreshSessionToken();
        }
    }, 1000);
}

function resetTimer() {
    clearInterval(timerInterval);
    countdownValue = 15;
    if (timerSecs) {
        timerSecs.textContent = countdownValue;
    }
    startTimer();
}

refreshQrBtn?.addEventListener('click', () => {
    refreshSessionToken();
});

// Initial load
refreshSessionToken();
