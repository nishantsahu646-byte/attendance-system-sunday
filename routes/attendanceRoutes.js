const express = require('express');
const router = express.Router();
const Attendance = require('../models/Attendance');
const Student = require('../models/Student');
const { protect, adminOnly } = require('../middleware/authMiddleware');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const path = require('path');
const fs = require('fs');

// @route   POST /api/attendance/mark
// @desc    Mark attendance with location
// @access  Student
router.post('/mark', protect, async (req, res) => {
    try {
        if (req.user.role !== 'student') {
            return res.status(403).json({ message: 'Only students can mark attendance' });
        }

        const { latitude, longitude } = req.body;
        if (!latitude || !longitude) {
            return res.status(400).json({ message: 'Location is required' });
        }

        const student = await Student.findById(req.user.id);
        if (!student) {
            return res.status(404).json({ message: 'Student not found' });
        }

        // --- CAMPUS RADIUS VALIDATION LOGIC ---
        // Apna college ka Latitude aur Longitude yahan daalein:
        const campusLat = 23.311019; // Niche aapna college ka Latitude likhein
        const campusLng = 77.416364; // Niche aapna college ka Longitude likhein
        const ALLOWED_RADIUS = 200;  // Kitne meter ki range mein attendance allow karni hai (e.g. 200 meters)

        const R = 6371e3; // Earth radius in meters
        const phi1 = latitude * Math.PI/180;
        const phi2 = campusLat * Math.PI/180;
        const deltaPhi = (campusLat - latitude) * Math.PI/180;
        const deltaLambda = (campusLng - longitude) * Math.PI/180;

        const a = Math.sin(deltaPhi/2) * Math.sin(deltaPhi/2) +
                  Math.cos(phi1) * Math.cos(phi2) *
                  Math.sin(deltaLambda/2) * Math.sin(deltaLambda/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

        const distanceInMeters = R * c;

        if (distanceInMeters > ALLOWED_RADIUS) {
            return res.status(400).json({ 
                message: `You are outside the college campus! (Distance: ${Math.round(distanceInMeters)} meters)` 
            });
        }
        // ----------------------------------------

        const now = new Date();
        // Timezone adjustment can be complex, let's use local ISO string or just simple padding
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const date = `${year}-${month}-${day}`; 
        
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        const time = `${hours}:${minutes}:${seconds}`;

        // Check duplicate
        const existing = await Attendance.findOne({ studentId: student._id, date });
        if (existing) {
            return res.status(400).json({ message: 'Attendance already marked for today' });
        }

        const locationUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;

        const attendance = new Attendance({
            studentId: student._id,
            name: student.name,
            rollNumber: student.rollNumber,
            date,
            time,
            latitude,
            longitude,
            locationUrl
        });

        await attendance.save();
        res.status(201).json({ message: 'Attendance marked successfully', locationUrl });
    } catch (err) {
        console.error(err.message);
        if (err.code === 11000) {
            return res.status(400).json({ message: 'Attendance already marked for today' });
        }
        res.status(500).send('Server Error');
    }
});

// @route   GET /api/attendance
// @desc    Get all attendance records (with optional date filter)
// @access  Admin
router.get('/', protect, adminOnly, async (req, res) => {
    try {
        const { date } = req.query;
        let query = {};
        if (date) {
            query.date = date;
        }
        const attendance = await Attendance.find(query).sort({ date: -1, time: -1 });
        res.json(attendance);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET /api/attendance/student
// @desc    Get current student's attendance
// @access  Student
router.get('/student', protect, async (req, res) => {
    try {
        if (req.user.role !== 'student') return res.status(403).json({ message: 'Not authorized' });
        const attendance = await Attendance.find({ studentId: req.user.id }).sort({ date: -1 });
        res.json(attendance);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET /api/attendance/export
// @desc    Export attendance to CSV
// @access  Admin
router.get('/export', protect, adminOnly, async (req, res) => {
    try {
        const { date } = req.query;
        let query = {};
        if (date) {
            query.date = date;
        }
        
        const records = await Attendance.find(query).sort({ date: -1, time: -1 });
        
        const fileName = `attendance_${Date.now()}.csv`;
        const filePath = path.join(__dirname, '..', 'uploads', fileName);
        
        const csvWriter = createCsvWriter({
            path: filePath,
            header: [
                { id: 'name', title: 'Name' },
                { id: 'rollNumber', title: 'Roll Number' },
                { id: 'date', title: 'Date' },
                { id: 'time', title: 'Time' },
                { id: 'latitude', title: 'Latitude' },
                { id: 'longitude', title: 'Longitude' },
                { id: 'locationUrl', title: 'Location URL' },
                { id: 'status', title: 'Status' }
            ]
        });

        await csvWriter.writeRecords(records);
        
        res.download(filePath, fileName, (err) => {
            if (err) {
                console.error('Error downloading file', err);
            }
        });
        
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
