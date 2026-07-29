const getFolderSize = require("get-folder-size");
const multer = require('multer');
const storage = multer.diskStorage({destination: './files',filename: (req, file, cb) => {cb(null, Date.now() + '-' + file.originalname.replace(/\s+/g, '_'));}});
const upload = multer({storage: storage });
var morgan = require('morgan');
const mysql = require('mysql2/promise');
const fs = require('node:fs');
const videopath = './files';

let pool;
async function databaser(){
    pool = await mysql.createConnection({host: 'localhost',user: 'root',password: '1q2w3e4r'});
    await pool.query('CREATE DATABASE IF NOT EXISTS gdrive');
    await pool.end()
    pool = await mysql.createPool({host: 'localhost',user: 'root',password: '1q2w3e4r',database: 'gdrive'});
    await pool.query(`CREATE TABLE IF NOT EXISTS users (id INT AUTO_INCREMENT PRIMARY KEY,email VARCHAR(255) UNIQUE NOT NULL,password VARCHAR(255) NOT NULL)`);
    await pool.query(`CREATE TABLE IF NOT EXISTS files (file_id INT AUTO_INCREMENT PRIMARY KEY,filename VARCHAR(255),user_id INT,filesize INT,upload DATE)`);
    console.log("Table created");
    // const [rows, fields] = await pool.query('SELECT filename FROM videos');
    // const ef=[]
    // for(let i=0;i<rows.length;i++){
    //     ef.push(rows[i]['filename']);
    // }
    // const files = fs.readdirSync(videopath);
    // console.log(files);
    // console.log(rows);
    // console.log(ef);
    // for(let i=0;i<files.length;i++){
    //     if ((files[i]).endsWith('.mp4')) if (!ef.includes(files[i])) await pool.query(`INSERT INTO videos (title, filename, views, likes,uploaded) VALUES (?, ?, 0, 0,'test@dtube.com')`,[files[i].replace('.mp4', ''), files[i]]);
    // } 
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
//app.use('/videos', express.static('videos'));


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

app.post('/upload', upload.single('uploaded_file'), async (req, res) => {
    //try{
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            if (req.file) fs.unlinkSync(req.file.path); 
            return res.status(401).json({message: "Unauthorized"});
        }
        
        const decoded = jwt.verify(token, JWT_SECRET);

        //const {title} = req.body;
        const filename = req.file.filename;
        const sanitizedFileName = req.file.originalname.replace(/\s+/g, '_');
        const [existing] = await pool.query(
            'SELECT * FROM files WHERE filename=? AND user_id=?',[sanitizedFileName,decoded.id]
        );
        if (existing.length > 0) {
            fs.unlinkSync(req.file.path);
            console.log("File existed")
            return res.status(400).json({message: "You already uploaded a video with this title or file name!"});
        }

        let size = await getFolderSize.loose(`./${filename}`);
        await pool.query(`INSERT INTO files (filename,user_id,filesize,upload) VALUES (?,?,?,?)`,[sanitizedFileName,decoded.id,,new Date()]);
        
        console.log("File uploaded.")
        res.status(200).json({message: "File uploaded successfully!"});
        
    // } catch (error) {
    //     res.status(500).json({message: "Server error."});
    // }
});

app.get('/files/mine', async (req, res) => {
    try{
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(401).json({message: "Unauthorized"});

        const decoded = jwt.verify(token, JWT_SECRET);
        const [files] = await pool.query('SELECT * FROM files WHERE user_id = ? ORDER BY user_id DESC', [decoded.id]);
        res.status(200).json(files);
        
    } catch (error) {
       res.status(500).json({message: "Server error."});
    }
});

app.listen(8000, () => {
    console.log(`Server running at http://localhost:8000`);
});