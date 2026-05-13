const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    name: { type: String, required: true },
    rollNumber: { type: String, required: true },
    date: { type: String, required: true }, // Format YYYY-MM-DD
    time: { type: String, required: true }, // Format HH:MM:SS
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    locationUrl: { type: String, required: true },
    status: { type: String, default: 'Present' }
});

// Ensure a student can only be marked present once per day
attendanceSchema.index({ studentId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', attendanceSchema);
