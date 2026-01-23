
import ytsr from 'ytsr';
import { YoutubeTranscript, GenericProxyConfig } from 'ai-youtube-transcript';
import { proxyRotator } from './webshare.js';

interface VideoDetailsParams {
    videoId: string;
    lang?: string;
    lang2?: string;
}

interface SubtitleParams {
    videoId: string;
    lang?: string;
    lang2?: string;
}

/**
 * 프록시 설정을 가져옵니다.
 */
function getProxyConfig(): GenericProxyConfig | undefined {
    const proxyUrl = proxyRotator.getNext();
    if (!proxyUrl) {
        return undefined;
    }
    // GenericProxyConfig 생성자는 (httpProxy, httpsProxy)를 받습니다.
    // 여기서는 동일한 프록시 URL을 둘 다에 사용합니다.
    return new GenericProxyConfig(proxyUrl, proxyUrl);
}

/**
 * 비디오 상세 정보와 자막 목록(또는 자막 내용)을 가져옵니다.
 */
export async function getVideoDetails({ videoId, lang, lang2 }: VideoDetailsParams) {
    try {
        // 1. 비디오 메타데이터 가져오기 (ytsr 사용)
        // ytsr은 검색 라이브러리이므로 비디오 ID로 검색하여 첫 번째 결과를 사용합니다.
        const searchResults = await ytsr(`https://www.youtube.com/watch?v=${videoId}`, { limit: 1 });
        const videoItem = searchResults.items.find((item: any) => item.type === 'video') as any;

        if (!videoItem) {
            throw new Error('Video not found');
        }

        const videoTitle = videoItem.title;
        const author = videoItem.author?.name;
        const views = videoItem.views;

        // 2. 자막 목록 가져오기
        const proxyConfig = getProxyConfig();
        // src/types/ai-youtube-transcript.d.ts에 정의된 커스텀 타입을 사용합니다.
        const ytTranscript = new YoutubeTranscript(undefined, proxyConfig);
        const transcriptList = await ytTranscript.list(videoId);

        // ai-youtube-transcript 라이브러리의 버전에 따라 배열이 아닌 객체(Wrapper)가 반환될 수 있습니다.
        // 객체로 반환되는 경우 .transcripts 또는 ._transcripts 속성에 실제 리스트가 있습니다.
        let safeList: any[] = [];
        if (Array.isArray(transcriptList)) {
            safeList = transcriptList;
        } else if (transcriptList && typeof transcriptList === 'object') {
            if ('transcripts' in transcriptList && Array.isArray((transcriptList as any).transcripts)) {
                safeList = (transcriptList as any).transcripts;
            } else if ('_transcripts' in transcriptList && Array.isArray((transcriptList as any)._transcripts)) {
                safeList = (transcriptList as any)._transcripts;
            }
        }

        // 사용 가능한 자막 언어 목록 구성
        const subtitles_list = safeList.map(t => ({
            language: t.language,
            languageCode: t.languageCode,
            isGenerated: t.isGenerated,
            isTranslatable: t.isTranslatable
        }));

        // 3. 자막 내용 가져오기 (요청된 경우)
        let subtitles: any[] = [];
        if (lang) {
            // 기본 언어 자막
            try {
                const transcript = await ytTranscript.fetch(videoId, { languages: [lang] });
                subtitles = transcript.snippets.map(s => ({
                    start: s.offset / 1000, // ms to seconds
                    dur: s.duration / 1000,
                    text: s.text
                }));
            } catch (e) {
                console.warn(`Failed to fetch subtitles for lang ${lang}:`, e);
            }
        }

        // 두 번째 언어 자막 처리 (필요하다면 구현, 현재 구조상 subtitles에 합치거나 별도 필드로 해야 함)
        // 기존 로직과 호환성을 위해 우선 단일 자막만 subtitles에 넣거나, 
        // lang2가 있으면 병합하는 로직이 필요할 수 있습니다. 
        // 여기서는 간단히 lang 요청 시 해당 자막을 반환하는 것으로 구현합니다.

        return {
            title: videoTitle,
            author,
            views,
            videoId,
            subtitles_list,
            subtitles // 실제 자막 텍스트 (요청 시)
        };

    } catch (error) {
        console.error('getVideoDetails error:', error);
        throw error;
    }
}

/**
 * 자막 내용만 가져옵니다.
 */
export async function getSubtitles({ videoId, lang, lang2 }: SubtitleParams) {
    try {
        const proxyConfig = getProxyConfig();
        const ytTranscript = new YoutubeTranscript(undefined, proxyConfig);

        let targetLang = lang || 'en';

        // 1. 자막 가져오기
        const transcript = await ytTranscript.fetch(videoId, { languages: [targetLang] });

        // 포맷 변환 (기존 호환성 유지)
        const formattedSubtitles = transcript.snippets.map(s => ({
            start: s.offset / 1000,
            dur: s.duration / 1000,
            text: s.text
        }));

        return formattedSubtitles;

    } catch (error) {
        console.error('getSubtitles error:', error);
        throw error;
    }
}
