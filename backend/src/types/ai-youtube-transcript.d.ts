declare module 'ai-youtube-transcript' {
    export interface GenericProxyConfig {
        httpProxy?: string;
        httpsProxy?: string;
    }

    export class GenericProxyConfig {
        constructor(httpProxy?: string, httpsProxy?: string);
    }

    export interface TranscriptConfig {
        languages?: string[];
        lang?: string;
        preserveFormatting?: boolean;
    }

    export interface TranscriptResponse {
        text: string;
        duration: number;
        offset: number;
        lang?: string;
        isGenerated?: boolean;
    }

    export interface FetchedTranscript {
        snippets: any[]; // 구체적인 타입을 모르면 any 또는 추론된 타입 사용
    }

    export class YoutubeTranscript {
        constructor(httpClient?: any, proxyConfig?: GenericProxyConfig);

        /**
         * Fetch the list of available transcripts
         */
        list(videoId: string): Promise<any[]>; // 실제로는 객체를 반환할 수도 있지만, 우리가 수정한 로직에서 처리함

        /**
         * Fetch transcript content
         */
        fetch(videoId: string, config?: TranscriptConfig): Promise<any>; // FetchedTranscript와 유사
    }
}
