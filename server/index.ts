import express from "express";
import cors from "cors";
import {fileURLToPath} from 'url';
import {dirname, join} from 'path';
import aiRouter from './ai.js';
import youtubeRouter from './youtube.js';
import {ttsRouter} from "./tts.js";
import dotenv from "dotenv";
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const port = 3000;

// 미들웨어 설정
app.use(cors());
app.use(express.json());
app.use(express.static(join(__dirname, '../public')));

// AI 관련 라우터 추가
app.use('/', aiRouter);
// YouTube 관련 라우터 추가
app.use('/youtube', youtubeRouter);

app.listen(port, () => {
    //console.clear();
    console.log(`서버가 http://localhost:${port} 에서 실행 중입니다`);
});

