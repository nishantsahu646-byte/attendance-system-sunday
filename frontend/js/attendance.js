const API_URL = window.location.origin === 'null' || window.location.protocol === 'file:' 
    ? 'http://localhost:5000/api' 
    : '/api';
const token = localStorage.getItem('studentToken');

if (!token) {
    window.location.href = 'student-login.html';
}

const msgBox = document.getElementById('msgBox');
function showMessage(msg, isError = true) {
    if (!msgBox) return;
    msgBox.textContent = msg;
    msgBox.className = isError ? 'msg error' : 'msg success';
}

document.getElementById('logoutBtn')?.addEventListener('click', (e) => {
    e.preventDefault();
    localStorage.removeItem('studentToken');
    window.location.href = '../index.html';
});

async function loadProfile() {
    try {
        const res = await fetch(`${API_URL}/students/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (res.ok) {
            document.getElementById('studentName').textContent = data.name;
            if (data.qrCode) {
                const img = document.getElementById('qrCodeImg');
                img.src = data.qrCode;
                img.style.display = 'block';
                document.getElementById('qrPlaceholder').style.display = 'none';
            }
        } else {
            showMessage(data.message || 'Failed to load profile');
        }
    } catch (error) {
        console.error('Error loading profile', error);
    }
}

async function loadMyAttendance() {
    try {
        const res = await fetch(`${API_URL}/attendance/student`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const records = await res.json();
        
        const tbody = document.querySelector('#myAttendanceTable tbody');
        if (tbody && res.ok) {
            tbody.innerHTML = '';
            records.forEach(record => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${record.date}</td>
                    <td>${record.time}</td>
                    <td><span style="color: #10b981; font-weight: bold;">${record.status}</span></td>
                `;
                tbody.appendChild(tr);
            });
        }
    } catch (error) {
        console.error('Error loading attendance', error);
    }
}

const markBtn = document.getElementById('markAttendanceBtn');
const locationStatus = document.getElementById('locationStatus');
const scannerModal = document.getElementById('scannerModal');
const closeModalBtn = document.getElementById('closeModalBtn');
const scannerMessage = document.getElementById('scannerMessage');

let html5QrcodeScanner = null;

if (markBtn) {
    markBtn.addEventListener('click', () => {
        if (!navigator.geolocation) {
            showMessage('Geolocation is not supported by your browser');
            return;
        }

        // Open modal
        scannerModal.style.display = 'flex';
        scannerMessage.textContent = "Initializing camera...";
        scannerMessage.style.color = "#cbd5e1";

        // Start camera
        startScanner();
    });
}

if (closeModalBtn) {
    closeModalBtn.addEventListener('click', () => {
        stopScanner();
        scannerModal.style.display = 'none';
    });
}

// Close modal if user clicks outside the modal content
window.addEventListener('click', (e) => {
    if (e.target === scannerModal) {
        stopScanner();
        scannerModal.style.display = 'none';
    }
});

function startScanner() {
    html5QrcodeScanner = new Html5Qrcode("reader");

    const config = { fps: 10, qrbox: { width: 250, height: 250 } };

    // Choose back camera (environment) if available, otherwise any camera
    html5QrcodeScanner.start(
        { facingMode: "environment" },
        config,
        onScanSuccess,
        onScanFailure
    ).then(() => {
        scannerMessage.textContent = "Camera active. Please point to the dynamic classroom QR code.";
    }).catch(err => {
        console.error("Camera start failed", err);
        scannerMessage.textContent = "Failed to open camera. Make sure you have given camera permissions.";
        scannerMessage.style.color = "#ef4444";
    });
}

function stopScanner() {
    if (html5QrcodeScanner) {
        html5QrcodeScanner.stop().then(() => {
            html5QrcodeScanner = null;
        }).catch(err => {
            console.error("Error stopping scanner", err);
        });
    }
}

function onScanSuccess(decodedText, decodedResult) {
    // We found the token! Let's stop scanning and request location to submit
    stopScanner();
    scannerModal.style.display = 'none';

    showMessage("QR Code scanned! Verifying your location...", false);

    locationStatus.textContent = "Getting your precise GPS location...";

    navigator.geolocation.getCurrentPosition(
        async (position) => {
            const { latitude, longitude } = position.coords;
            locationStatus.textContent = "Location retrieved. Submitting attendance...";

            try {
                const res = await fetch(`${API_URL}/attendance/mark`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ latitude, longitude, sessionToken: decodedText })
                });

                const data = await res.json();

                if (res.ok) {
                    showMessage('Attendance marked successfully!', false);
                    loadMyAttendance();
                } else {
                    showMessage(data.message || 'Failed to mark attendance');
                }
            } catch (error) {
                showMessage('Server error. Please try again later.');
            } finally {
                locationStatus.textContent = "";
            }
        },
        (error) => {
            locationStatus.textContent = "";
            switch(error.code) {
                case error.PERMISSION_DENIED:
                    showMessage("Location denied. Please allow location permissions to mark attendance.");
                    break;
                case error.POSITION_UNAVAILABLE:
                    showMessage("Location unavailable. Try moving to an open area.");
                    break;
                case error.TIMEOUT:
                    showMessage("Location request timed out. Please try again.");
                    break;
                default:
                    showMessage("An unknown error occurred while getting location.");
                    break;
            }
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
}

function onScanFailure(error) {
    // This callback runs repeatedly while scanning. We can ignore it or log in debug.
}

loadProfile();
loadMyAttendance();
