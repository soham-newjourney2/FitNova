const express = require('express');
const router = express.Router();
const { getSystemStats, getAllUsers, deleteUser } = require('../controllers/adminController');
const { protect, admin } = require('../middleware/authMiddleware');

router.get('/system-stats', protect, admin, getSystemStats);
router.get('/users', protect, admin, getAllUsers);
router.delete('/users/:id', protect, admin, deleteUser);

module.exports = router;
