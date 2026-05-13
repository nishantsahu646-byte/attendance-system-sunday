const API_URL = 'http://localhost:5000/api';
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

if (markBtn) {
    markBtn.addEventListener('click', () => {
        if (!navigator.geolocation) {
            showMessage('Geolocation is not supported by your browser');
            return;
        }

        markBtn.disabled = true;
        locationStatus.textContent = "Getting your live location...";

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                locationStatus.textContent = "Location found. Marking attendance...";

                try {
                    const res = await fetch(`${API_URL}/attendance/mark`, {
                        method: 'POST',
                        headers: { 
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({ latitude, longitude })
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
                    markBtn.disabled = false;
                    locationStatus.textContent = "";
                }
            },
            (error) => {
                markBtn.disabled = false;
                locationStatus.textContent = "";
                switch(error.code) {
                    case error.PERMISSION_DENIED:
                        showMessage("User denied the request for Geolocation.");
                        break;
                    case error.POSITION_UNAVAILABLE:
                        showMessage("Location information is unavailable.");
                        break;
                    case error.TIMEOUT:
                        showMessage("The request to get user location timed out.");
                        break;
                    case error.UNKNOWN_ERROR:
                        showMessage("An unknown error occurred.");
                        break;
                }
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    });
}

loadProfile();
loadMyAttendance();
