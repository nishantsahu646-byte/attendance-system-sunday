const API_URL = window.location.origin === 'null' || window.location.protocol === 'file:' 
    ? 'http://localhost:5000/api' 
    : '/api';
const token = localStorage.getItem('adminToken');

if (!token) {
    window.location.href = 'admin-login.html';
}

const msgBox = document.getElementById('msgBox');
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

async function loadDashboard() {
    if (!document.getElementById('totalStudents')) return;

    try {
        const [studentsRes, attendanceRes] = await Promise.all([
            fetch(`${API_URL}/students`, { headers: { 'Authorization': `Bearer ${token}` } }),
            fetch(`${API_URL}/attendance`, { headers: { 'Authorization': `Bearer ${token}` } })
        ]);

        const students = await studentsRes.json();
        const attendance = await attendanceRes.json();

        document.getElementById('totalStudents').textContent = students.length || 0;

        const today = new Date().toISOString().split('T')[0];
        const todayAttendance = attendance.filter(a => a.date === today);
        document.getElementById('attendanceToday').textContent = todayAttendance.length || 0;

        const tbody = document.querySelector('#studentsTable tbody');
        if (tbody) {
            tbody.innerHTML = '';
            students.forEach(student => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${student.name}</td>
                    <td>${student.rollNumber}</td>
                    <td>${student.course}</td>
                    <td>${student.email}</td>
                    <td>
                        <button class="btn btn-danger" onclick="deleteStudent('${student._id}')" style="padding: 0.25rem 0.5rem; width: auto; font-size: 0.8rem;">Delete</button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        }
    } catch (error) {
        console.error('Error loading dashboard', error);
    }
}

window.deleteStudent = async (id) => {
    if (confirm('Are you sure you want to delete this student?')) {
        try {
            const res = await fetch(`${API_URL}/students/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                loadDashboard();
            } else {
                alert('Failed to delete student');
            }
        } catch (error) {
            console.error('Error deleting student', error);
        }
    }
};

const addStudentForm = document.getElementById('addStudentForm');
if (addStudentForm) {
    addStudentForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData();
        formData.append('name', document.getElementById('name').value);
        formData.append('rollNumber', document.getElementById('rollNumber').value);
        formData.append('email', document.getElementById('email').value);
        formData.append('password', document.getElementById('password').value);
        formData.append('course', document.getElementById('course').value);
        const photoFile = document.getElementById('photo').files[0];
        if (photoFile) {
            formData.append('photo', photoFile);
        }

        try {
            const res = await fetch(`${API_URL}/students/add`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });
            const data = await res.json();
            if (res.ok) {
                showMessage('Student added successfully!', false);
                addStudentForm.reset();
            } else {
                showMessage(data.message || 'Failed to add student');
            }
        } catch (error) {
            showMessage('Server error. Please try again later.');
        }
    });
}

async function loadAttendance() {
    const tableBody = document.querySelector('#attendanceTable tbody');
    if (!tableBody) return;

    const filterDate = document.getElementById('filterDate')?.value;
    let url = `${API_URL}/attendance`;
    if (filterDate) {
        url += `?date=${filterDate}`;
    }

    try {
        const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
        const records = await res.json();

        tableBody.innerHTML = '';
        records.forEach(record => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${record.name}</td>
                <td>${record.rollNumber}</td>
                <td>${record.date}</td>
                <td>${record.time}</td>
                <td><a href="${record.locationUrl}" target="_blank" style="color: #60a5fa; text-decoration: underline;">View Map</a></td>
                <td><span style="color: #10b981; font-weight: bold;">${record.status}</span></td>
            `;
            tableBody.appendChild(tr);
        });
    } catch (error) {
        console.error('Error loading attendance', error);
    }
}

document.getElementById('filterDate')?.addEventListener('change', loadAttendance);

document.getElementById('exportCsvBtn')?.addEventListener('click', () => {
    const filterDate = document.getElementById('filterDate')?.value;
    let url = `${API_URL}/attendance/export`;
    if (filterDate) {
        url += `?date=${filterDate}`;
    }
    
    fetch(url, { headers: { 'Authorization': `Bearer ${token}` } })
        .then(res => res.blob())
        .then(blob => {
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = `attendance_${filterDate || 'all'}.csv`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
        })
        .catch(err => console.error('Export failed', err));
});

if (document.getElementById('totalStudents')) loadDashboard();
if (document.getElementById('attendanceTable')) loadAttendance();
