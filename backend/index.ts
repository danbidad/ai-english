import Fastify from 'fastify';
import fastifyCors from '@fastify/cors';
import fastifyCookie from '@fastify/cookie';
import fastifySession from '@fastify/session';
import fastifyFormbody from '@fastify/formbody';
import dotenv from 'dotenv';
import aiRoutes from './routes/ai.js';
import sentenceRoutes from "./routes/sentence.js";
import { youtubeCaptionRoutes } from './routes/youtube_caption.js';
// SQLite 세션 저장소 사용 시
// import SQLiteStore from 'connect-sqlite3';
// const SQLiteStoreSession = SQLiteStore(session);

dotenv.config();
console.log("LOAD ENV OK")

// 서버에서 정적 파일을 서빙하지 않으므로 __dirname 계산 불필요

async function main() {
  const port = 3000;
  const fastify = Fastify({ logger: {
      level: 'info',
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          singleLine: true,
          translateTime: 'SYS:standard',
        },
      },
    }, bodyLimit: 50 * 1024 * 1024 });

  // 미들웨어 설정
  await fastify.register(fastifyCors, {
    origin: true, // 또는 특정 도메인 지정
    credentials: true // 세션 쿠키를 위해 필요
  });

  await fastify.register(fastifyCookie);
  await fastify.register(fastifySession, {
    secret: process.env.SESSION_SECRET || 'your-secret-key-here-longer-than-32bytes',
    rolling: true,
    cookie: {
      secure: false, // HTTPS 환경에서는 true로 설정
      httpOnly: true,
      maxAge: 30 * 60 * 1000 // 30분 (밀리초)
    }
  });

  await fastify.register(fastifyFormbody);

  await fastify.register(aiRoutes, { prefix: '/ai' });
  await fastify.register(sentenceRoutes, { prefix: '/sentence' });
  await fastify.register(youtubeCaptionRoutes, { prefix: '/youtube' });

  try {
    await fastify.listen({ port, host: '0.0.0.0' });
    console.log(`서버가 http://localhost:${port} 에서 실행 중입니다`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

await main();
