const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { protect } = require('../middleware/authMiddleware');
const User = require('../models/User');
const fs = require('fs');

// Ensure upload dir exists
const uploadDir = path.join(__dirname, '../public/uploads');
if (!fs.existsSync(uploadDir)){
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination(req, file, cb) {
        cb(null, uploadDir);
    },
    filename(req, file, cb) {
        const prefix = file.fieldname === 'avatar' ? 'avatar' : 'post';
        cb(null, `${prefix}-${req.user.id}-${Date.now()}${path.extname(file.originalname)}`);
    }
});

function checkFileType(file, cb) {
    const filetypes = /jpg|jpeg|png|webp/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);

    if (extname && mimetype) {
        return cb(null, true);
    } else {
        cb('Images only!');
    }
}

const upload = multer({
    storage,
    fileFilter: function (req, file, cb) {
        checkFileType(file, cb);
    }
});

router.post('/avatar', protect, upload.single('avatar'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }
        const avatarUrl = `/uploads/${req.file.filename}`;
        
        const user = await User.findById(req.user.id);
        user.avatar = avatarUrl;
        await user.save();

        res.json({ message: 'Avatar updated', avatar: avatarUrl });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.post('/image', protect, upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }
        const imageUrl = `/uploads/${req.file.filename}`;
        res.json({ message: 'Image uploaded successfully', imageUrl });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
