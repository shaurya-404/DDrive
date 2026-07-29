const multer = require('multer');
const storage = multer.diskStorage({destination: './files',filename: (req, file, cb) => {cb(null,file.originalname.replace(/\s+/g, '_'));}});
const upload = multer({storage: storage });
var morgan = require('morgan');
const mysql = require('mysql2/promise');
const fs = require('node:fs');
const filespath = './files';

let pool;
async function databaser(){
    pool = await mysql.createConnection({host: 'localhost',user: 'root',password: '1q2w3e4r'});
    await pool.query('CREATE DATABASE IF NOT EXISTS gdrive');
    await pool.end()
    pool = await mysql.createPool({host: 'localhost',user: 'root',password: '1q2w3e4r',database: 'gdrive'});
    await pool.query(`CREATE TABLE IF NOT EXISTS users (id INT AUTO_INCREMENT PRIMARY KEY,email VARCHAR(255) UNIQUE NOT NULL,password VARCHAR(255) NOT NULL)`);
    await pool.query(`CREATE TABLE IF NOT EXISTS files (file_id INT AUTO_INCREMENT PRIMARY KEY,filename VARCHAR(255),user_id INT,parent varchar(255),type INT,filesize INT,upload DATE)`);
    console.log("Table created");
}
databaser();

const jwt = require('jsonwebtoken');
const JWT_SECRET = "test";

const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');

const app = express();
app.use(cors());
app.use(morgan('tiny'));
app.use(express.json());
app.use('/files', express.static('files'));

app.post('/signup', async (req, res) => {
    try {
        const {e,p} = req.body;
        const hash = await bcrypt.hash(p, 10);
        await pool.query('INSERT INTO users (email, password) VALUES (?, ?)', [e, hash]);
        
        console.log("user created!");
        res.status(201).json({message: "User has been created successfully!"});
    }
    catch (error){
        if (error.code === 'ER_DUP_ENTRY') {
            res.status(400).json({message: "Email already in use!"});
        } else {
            res.status(500).json({message: "Server error."});
        }
    }
});

app.post('/login', async (req, res) => {
    try{
        const {e, p} = req.body;
        const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [e]);
        const user = rows[0];
        
        if (!user) return res.status(401).json({message: "The given email or password is incorrect!"});
        const passchk = await bcrypt.compare(p, user.password);
        if (passchk) {
            const tokenData = {id: user.id,email: user.email,role: user.role};
            const token = jwt.sign(tokenData, JWT_SECRET, {expiresIn: '24h' });
            res.status(200).json({message: "Login successful!",token: token});
        } else {
            res.status(401).json({message: "Invalid email or password."});
        }
    }
    catch (error) {
        res.status(500).json({message: "Server error."});
    }

});

app.post('/resetp', async (req, res) => {
    try{
        const {e,newp} = req.body;
        const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [e]);
        if (rows.length === 0) return res.status(404).json({message: "There is no account like that!"});
        const hash = await bcrypt.hash(newp, 10);
        await pool.query('UPDATE users SET password = ? WHERE email = ?',[hash, e]);
        res.status(200).json({message: "Password has been reseted!"});
        
    } catch (error) {
        res.status(500).json({message: "Server error."});
    }
});

app.post('/createfolder', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(401).json({message: "Unauthorized"});
        
        const decoded = jwt.verify(token, JWT_SECRET);
        const { foldername, parent } = req.body;
        
        const [existing] = await pool.query(
            'SELECT * FROM files WHERE filename=? AND user_id=? AND parent=?', [foldername, decoded.id, parent]
        );
        if (existing.length > 0) {
            return res.status(400).json({message: "A folder with this name already exists here!"});
        }

        await pool.query(`INSERT INTO files (filename,user_id,filesize,upload,type,parent) VALUES (?,?,?,?,0,?)`, [foldername, decoded.id, 0, new Date(), parent]);
        
        console.log("Folder created.");
        res.status(200).json({message: "Folder created successfully!"});
    } catch (error) {
        res.status(500).json({message: "Server error."});
    }
});

app.post('/upload', upload.single('uploaded_file'), async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        if (req.file) fs.unlinkSync(req.file.path); 
        return res.status(401).json({message: "Unauthorized"});
    }
    const decoded = jwt.verify(token, JWT_SECRET);

    const parent = req.body.parent || 'root'; 

    const filename = req.file.filename;
    const sanitizedFileName = req.file.originalname.replace(/\s+/g, '_');
    const [existing] = await pool.query(
        'SELECT * FROM files WHERE filename=? AND user_id=? AND parent=?', [sanitizedFileName, decoded.id, parent]
    );
    
    if (existing.length > 0) {
        fs.unlinkSync(req.file.path);
        console.log("File existed");
        return res.status(400).json({message: "You already uploaded a file with this name in this folder!"});
    }

    let size = Math.ceil(req.file.size / (1024 * 1024));
    await pool.query(`INSERT INTO files (filename,user_id,filesize,upload,type,parent) VALUES (?,?,?,?,1,?)`, [sanitizedFileName, decoded.id, size, new Date(), parent]);
    
    console.log("File uploaded.");
    res.status(200).json({message: "File uploaded successfully!"});
});

app.get('/files/mine', async (req, res) => {
    try{
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(401).json({message: "Unauthorized"});

        const parent = req.query.parent || 'root';
        const decoded = jwt.verify(token, JWT_SECRET);
        
        const [files] = await pool.query('SELECT * FROM files WHERE user_id = ? AND parent = ? ORDER BY type ASC, file_id DESC', [decoded.id, parent]);
        res.status(200).json(files);
        
    } catch (error) {
       res.status(500).json({message: "Server error."});
    }
});

app.listen(8000, () => {
    console.log(`Server running at http://localhost:8000`);
});