const API_URL = window.location.origin === 'null' || window.location.protocol === 'file:' 
    ? 'http://localhost:5001/api' 
    : '/api';

const adminForm = document.getElementById('adminLoginForm');
const studentForm = document.getElementById('studentLoginForm');
const msgBox = document.getElementById('msgBox');

function showMessage(msg, isError = true) {
    if (!msgBox) return;
    msgBox.textContent = msg;
    msgBox.className = isError ? 'msg error' : 'msg success';
}

if (adminForm) {
    adminForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        try {
            const res = await fetch(`${API_URL}/auth/admin/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const text = await res.text();
            let data;
            try {
                data = JSON.parse(text);
            } catch (err) {
                data = { message: text };
            }

            if (res.ok) {
                localStorage.setItem('adminToken', data.token);
                window.location.href = 'admin-dashboard.html';
            } else {
                showMessage(data.message || 'Login failed');
            }
        } catch (error) {
            showMessage('Server error. Please try again later.');
        }
    });
}

if (studentForm) {
    studentForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const rollNumber = document.getElementById('rollNumber').value;
        const password = document.getElementById('password').value;

        try {
            const res = await fetch(`${API_URL}/auth/student/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ rollNumber, password })
            });
            const text = await res.text();
            let data;
            try {
                data = JSON.parse(text);
            } catch (err) {
                data = { message: text };
            }

            if (res.ok) {
                localStorage.setItem('studentToken', data.token);
                window.location.href = 'student-dashboard.html';
            } else {
                showMessage(data.message || 'Login failed');
            }
        } catch (error) {
            showMessage('Server error. Please try again later.');
        }
    });
}
