// youtube-captions.ts

import axios from 'axios';
import {YouTubeTranscriptApi} from "../index.js";

interface TranscriptItem {
  text: string;
  start: number;
  duration: number;
}

async function getYoutubeTranscript(videoId: string, languageCode: string = 'ko'): Promise<TranscriptItem[]> {
  try {
    // YouTubeTranscriptApi 클래스를 사용
    const transcript = await YouTubeTranscriptApi.getTranscript(videoId, [languageCode]);
    return transcript;
  } catch (error) {
    console.error('자막을 가져오는 도중 오류가 발생했습니다:', error);
    throw error;
  }
}

// 메인 함수
async function main() {
  try {
    // 테스트할 유튜브 비디오 ID 설정
    const videoId = '8qbHNPsXnf0'; // 예: 'dQw4w9WgXcQ'
    
    console.log(`비디오 ID ${videoId}의 자막을 가져오는 중...`);
    
    // 1. 사용 가능한 자막 목록 가져오기
    const transcriptList = await YouTubeTranscriptApi.listTranscripts(videoId);
    console.log('\n사용 가능한 자막 목록:');
    console.log('수동으로 생성된 자막:', Object.keys(transcriptList.manuallyCreatedTranscripts));
    console.log('자동 생성된 자막:', Object.keys(transcriptList.generatedTranscripts));
    console.log('번역 가능한 언어:', transcriptList.translationLanguages);
    
    // 2. 한국어 자막 가져오기 시도
    try {
      const koreanTranscript = await getYoutubeTranscript(videoId, 'ko');
      console.log('\n한국어 자막:', koreanTranscript);
      koreanTranscript.slice(0, 5).forEach((item, index) => {
        console.log(`${index + 1}. [${item.start}s-${item.start + item.duration}s]: ${item.text}`);
      });
      console.log(`... 외 ${koreanTranscript.length - 5}개 항목`);
    } catch (error) {
      console.log('한국어 자막을 찾을 수 없습니다. 영어 자막을 시도합니다.');
      
      // 3. 영어 자막 가져오기
      const englishTranscript = await getYoutubeTranscript(videoId, 'en');
      console.log('\n영어 자막:');
      englishTranscript.slice(0, 5).forEach((item, index) => {
        console.log(`${index + 1}. [${item.start}s-${item.start + item.duration}s]: ${item.text}`);
      });
      console.log(`... 외 ${englishTranscript.length - 5}개 항목`);
    }
    
  } catch (error) {
    console.error('프로그램 실행 중 오류가 발생했습니다:', error);
  }
}

// 프로그램 실행
main();