const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const Student = require('../models/Student');

// @route   POST /api/auth/admin/login
// @desc    Admin Login
// @access  Public
router.post('/admin/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        let admin = await Admin.findOne({ username });
        if (!admin) {
            // Setup default admin if not exists for easy testing
            if (username === 'admin' && password === 'admin') {
                const salt = await bcrypt.genSalt(10);
                const hashedPassword = await bcrypt.hash('admin', salt);
                admin = new Admin({ username: 'admin', password: hashedPassword });
                await admin.save();
            } else {
                return res.status(400).json({ message: 'Invalid credentials' });
            }
        }

        const isMatch = await bcrypt.compare(password, admin.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const payload = { id: admin._id, role: 'admin' };
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1d' });

        res.json({ token, admin: { id: admin._id, username: admin.username } });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST /api/auth/student/login
// @desc    Student Login
// @access  Public
router.post('/student/login', async (req, res) => {
    try {
        const { rollNumber, password } = req.body;

        const student = await Student.findOne({ rollNumber });
        if (!student) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const isMatch = await bcrypt.compare(password, student.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const payload = { id: student._id, role: 'student', rollNumber: student.rollNumber };
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1d' });

        res.json({ token, student: { id: student._id, name: student.name, rollNumber: student.rollNumber } });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
