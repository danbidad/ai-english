// TTS 클라이언트 초기화
import {TextToSpeechClient} from "@google-cloud/text-to-speech";
import {protos} from '@google-cloud/text-to-speech';
import {writeFileSync} from 'fs';
import {v4 as uuidv4} from 'uuid';
import {Router} from "express";
import {dirname, join} from 'path';

export const ttsRouter = Router();

export const ttsClient = new TextToSpeechClient({
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
});

// TTS API 엔드포인트
ttsRouter.post('/text-to-speech', async (req, res) => {
  try {
    const { text, languageCode = 'ko-KR', voiceName = 'ko-KR-Standard-A' } = req.body;

    const request: protos.google.cloud.texttospeech.v1.ISynthesizeSpeechRequest = {
      input: { text },
      voice: {
        languageCode,
        name: voiceName,
      },
      audioConfig: { audioEncoding: 'MP3' as const },
    };

    const [response] = await ttsClient.synthesizeSpeech(request);
    const audioFileName = `${uuidv4()}.mp3`;
    const audioPath = join(__dirname, '../public/audio', audioFileName);

    if (response.audioContent) {
      writeFileSync(audioPath, response.audioContent, 'binary');
      res.json({
        audioUrl: `/audio/${audioFileName}`,
        message: 'TTS 변환이 완료되었습니다.'
      });
    } else {
      res.status(500).json({ error: '오디오 콘텐츠가 없습니다.' });
    }
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'TTS 변환 중 오류가 발생했습니다.' });
  }
});
