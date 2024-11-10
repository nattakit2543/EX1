const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const app = express();
const port = 3001;
const cors = require('cors');

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

// การเชื่อมต่อกับฐานข้อมูล MySQL
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'member_db'
});

db.connect(err => {
    if (err) throw err;
    console.log('Connected to database');
});

// ตรวจสอบว่าโฟลเดอร์ uploads มีอยู่หรือไม่ ถ้าไม่มีให้สร้าง
const uploadDir = 'uploads';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir), // ใช้ path ถูกต้อง
    filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});

const upload = multer({
    storage,
    limits: { fileSize: 50 * 1024 * 1024 }, // ขนาดไฟล์ที่รองรับสูงสุด 50MB
    fileFilter: (req, file, cb) => {
        const fileTypes = /jpeg|jpg|png|gif/;
        const extname = fileTypes.test(file.mimetype);
        const basename = fileTypes.test(path.extname(file.originalname).toLowerCase());
        if (extname && basename) {
            return cb(null, true);
        } else {
            cb('Error: Only image files are allowed!');
        }
    }
});

// เพิ่มสมาชิก
app.post('/members', upload.single('profileImage'), (req, res) => {
    const { title, firstName, lastName, birthdate } = req.body;
    const profileImageUrl = req.file ? req.file.path : null;
    const query = `INSERT INTO members (title, first_name, last_name, birthdate, profile_image_url)
                   VALUES (?, ?, ?, ?, ?)`;

    db.query(query, [title, firstName, lastName, birthdate, profileImageUrl], (err, result) => {
        if (err) {
            console.error("Error adding member:", err);
            return res.status(500).send({ error: 'Failed to add member', details: err });
        }
        res.send({ message: 'Member added', memberId: result.insertId });
    });
});

// ดึงสมาชิกทั้งหมด
app.get('/members', (req, res) => {
    const query = `SELECT *, YEAR(CURDATE()) - YEAR(birthdate) AS age FROM members`;
    db.query(query, (err, results) => {
        if (err) {
            console.error('Error loading members:', err);
            return res.status(500).send('Failed to load members');
        }
        res.send(results);
    });
});

// แก้ไขสมาชิก
app.put('/members/:id', upload.single('profileImage'), (req, res) => {
    const { id } = req.params;
    const { title, firstName, lastName, birthdate } = req.body;
    const profileImageUrl = req.file ? req.file.path : null;

    // ถ้าทุกข์ไม่ได้อัปโหลดไฟล์ใหม่ ให้ดึง URL รูปภาพจากฐานข้อมูล
    const selectQuery = `SELECT profile_image_url FROM members WHERE id = ?`;
    db.query(selectQuery, [id], (err, result) => {
        if (err) {
            console.error("Error fetching member:", err);
            return res.status(500).send('Failed to fetch member for update');
        }

        // ใช้ profile_image_url เดิมถ้าไม่มีไฟล์ใหม่
        const finalProfileImageUrl = profileImageUrl || result[0].profile_image_url;

        const query = `UPDATE members SET title = ?, first_name = ?, last_name = ?, birthdate = ?, 
                    profile_image_url = ?, last_updated = NOW() WHERE id = ?`;

        db.query(query, [title, firstName, lastName, birthdate, finalProfileImageUrl, id], (err) => {
            if (err) {
                console.error("Error updating member:", err);
                return res.status(500).send({ error: 'Failed to update member' });
            }
            res.send({ message: 'Member updated' });
        });
    });
});

// ลบสมาชิก
app.delete('/members/:id', (req, res) => {
    const { id } = req.params;
    const query = `DELETE FROM members WHERE id = ?`;
    db.query(query, [id], (err) => {
        if (err) {
            console.error("Error deleting member:", err);
            return res.status(500).send({ error: 'Failed to delete member' });
        }
        res.send({ message: 'Member deleted' });
    });
});

app.listen(port, () => console.log(`Server running on port ${port}`));
