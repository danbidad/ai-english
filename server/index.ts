import express from "express";
import cors from "cors";
import session from "express-session";
import {fileURLToPath} from 'url';
import {dirname, join} from 'path';
import { proxyRouter } from './proxy.js';
import aiRouter from './ai.js';
import youtubeRouter from './youtube.js';
import {ttsRouter} from "./tts.js";
import dotenv from "dotenv";

// SQLite 세션 저장소 사용 시
// import SQLiteStore from 'connect-sqlite3';
// const SQLiteStoreSession = SQLiteStore(session);

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const port = 3000;

// 미들웨어 설정
app.use(cors({
    origin: true, // 또는 특정 도메인 지정
    credentials: true // 세션 쿠키를 위해 필요
}));

// 세션 설정
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key-here', // .env 파일에 추가 권장
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
        secure: false, // HTTPS 환경에서는 true로 설정
        httpOnly: true,
        maxAge: 30 * 60 * 1000 // 30분 (밀리초)
    }
    // SQLite 저장소 사용 시
    // store: new SQLiteStoreSession({
    //     db: 'sessions.db',
    //     dir: './data'
    // })
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static(join(__dirname, '../public')));

// AI 관련 라우터 추가
app.use('/', aiRouter);
// YouTube 관련 라우터 추가
app.use('/youtube', youtubeRouter);
app.use('/proxy', proxyRouter);
app.use('/tts', ttsRouter);

app.listen(port, () => {
    console.log(`서버가 http://localhost:${port} 에서 실행 중입니다`);
});
