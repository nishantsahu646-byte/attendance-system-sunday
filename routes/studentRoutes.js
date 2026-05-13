const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const QRCode = require('qrcode');
const multer = require('multer');
const path = require('path');
const Student = require('../models/Student');
const { protect, adminOnly } = require('../middleware/authMiddleware');

// Configure Multer for photo upload
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// @route   POST /api/students/add
// @desc    Add a new student
// @access  Admin
router.post('/add', protect, adminOnly, upload.single('photo'), async (req, res) => {
    try {
        const { name, rollNumber, email, password, course } = req.body;

        let student = await Student.findOne({ rollNumber });
        if (student) {
            return res.status(400).json({ message: 'Student with this roll number already exists' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Generate QR Code data url
        const qrData = JSON.stringify({ rollNumber, name });
        const qrCode = await QRCode.toDataURL(qrData);

        const photoPath = req.file ? `/uploads/${req.file.filename}` : null;

        student = new Student({
            name,
            rollNumber,
            email,
            password: hashedPassword,
            course,
            photo: photoPath,
            qrCode
        });

        await student.save();
        res.status(201).json({ message: 'Student added successfully', student });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET /api/students
// @desc    Get all students
// @access  Admin
router.get('/', protect, adminOnly, async (req, res) => {
    try {
        const students = await Student.find().select('-password');
        res.json(students);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET /api/students/me
// @desc    Get current student profile
// @access  Student
router.get('/me', protect, async (req, res) => {
    try {
        if(req.user.role !== 'student') return res.status(403).json({ message: 'Not authorized' });
        const student = await Student.findById(req.user.id).select('-password');
        if(!student) return res.status(404).json({ message: 'Student not found' });
        res.json(student);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   DELETE /api/students/:id
// @desc    Delete a student
// @access  Admin
router.delete('/:id', protect, adminOnly, async (req, res) => {
    try {
        const studentToDelete = await Student.findById(req.params.id);
        if (!studentToDelete) {
            return res.status(404).json({ message: 'Student not found' });
        }
        await Student.findByIdAndDelete(req.params.id);
        res.json({ message: 'Student removed' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
