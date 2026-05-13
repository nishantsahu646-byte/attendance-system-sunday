const express = require('express');
const router = express.Router();
const Admin = require('../models/Admin');
const { protect, adminOnly } = require('../middleware/authMiddleware');

// @route   GET /api/admin/me
// @desc    Get admin profile
// @access  Admin
router.get('/me', protect, adminOnly, async (req, res) => {
    try {
        const admin = await Admin.findById(req.user.id).select('-password');
        if (!admin) {
            return res.status(404).json({ message: 'Admin not found' });
        }
        res.json(admin);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
