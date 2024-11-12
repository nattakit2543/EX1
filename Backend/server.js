const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const app = express();
const port = 3001;
const cors = require('cors');
const cors = require('cors');
app.use(cors({
    origin: 'http://localhost:3000', 
    methods: ['GET', 'POST', 'PUT', 'DELETE'], 
    allowedHeaders: ['Content-Type', 'Authorization'] 
}));


app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


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

const uploadDir = 'uploads';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
    // กำหนดที่เก็บไฟล์
    destination: (req, file, cb) => cb(null, uploadDir),
    
    // กำหนดชื่อไฟล์ที่เก็บ
    filename: (req, file, cb) => {
        const timestamp = Date.now();
        
        // แทนที่ช่องว่างและตัวอักษรที่ไม่สามารถใช้ได้ในชื่อไฟล์ด้วย _
        const sanitizedName = file.originalname
            .replace(/\s+/g, '_')   // แทนที่ช่องว่าง
            .replace(/[^a-zA-Z0-9._-]/g, '') // ลบสัญลักษณ์ที่ไม่ใช่ตัวอักษรหรือหมายเลข

        // ส่งชื่อไฟล์ใหม่ที่มี timestamp กำกับ
        cb(null, `${timestamp}-${sanitizedName}`);
    }
});

// การตั้งค่า Multer
const upload = multer({
    storage,  // กำหนดการตั้งค่าการเก็บไฟล์
    limits: { fileSize: 50 * 1024 * 1024 }, // ขนาดไฟล์สูงสุดที่อนุญาต 50MB
    fileFilter: (req, file, cb) => {
        const fileTypes = /jpeg|jpg|png|gif/;
        
        // ตรวจสอบประเภทของไฟล์จากทั้ง `mimetype` และ `extname`
        const extname = fileTypes.test(file.mimetype);
        const basename = fileTypes.test(path.extname(file.originalname).toLowerCase());
        
        // ถ้าไฟล์ตรงตามประเภทที่อนุญาตให้ส่งผ่าน, ถ้าไม่ให้แสดง error
        if (extname && basename) {
            return cb(null, true);
        } else {
            cb('Error: Only image files (jpeg, jpg, png, gif) are allowed!');
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

    // ถ้าไม่ได้อัปโหลดไฟล์ใหม่ ให้ดึง URL รูปภาพจากฐานข้อมูล
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
