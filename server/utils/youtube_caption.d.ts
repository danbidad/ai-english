/// <reference types="node" />

// =================================================================
//                            EXPORTED FUNCTIONS
// =================================================================

/**
 * 비디오 ID를 사용하여 비디오의 제목, 설명, 자막을 가져옵니다.
 */
export declare const getVideoDetails: (options: {
    videoID: string;
    lang?: string;
}) => Promise<{
    title: string;
    description: string;
    subtitles: {
        start: string;
        dur: string;
        text: string;
    }[];
}>;

/**
 * 비디오 ID를 사용하여 자막만 가져옵니다.
 */
export declare const getSubtitles: (options: {
    videoID: string;
    lang?: string;
}) => Promise<{
    start: string;
    dur: string;
    text: string;
}[]>;


// =================================================================
//                            INTERNAL FUNCTIONS
// =================================================================

/**
 * InnerTube API를 사용하여 비디오 정보를 가져옵니다.
 * @calledby getVideoDetails, getSubtitles
 */
declare function getVideoInfo(videoID: string): Promise<{
    playerData: any;
    nextData: any | null;
}>;

/**
 * 참여 패널(engagement panel)을 통해 스크립트를 추출합니다.
 * @calledby getVideoDetails, getSubtitles
 */
declare function getTranscriptFromEngagementPanel(videoID: string, nextData: any): Promise<{
    start: string;
    dur: string;
    text: string;
}[]>;

/**
 * 플레이어 데이터에서 직접 캡션을 추출합니다. (대체 방법)
 * @calledby getVideoDetails, getSubtitles
 */
declare function getSubtitlesFromCaptions(videoID: string, playerData: any, lang: string): Promise<{
    start: string;
    dur: string;
    text: string;
}[]>;

/**
 * InnerTube API 호출을 위한 fetch 함수.
 * @calledby getVideoInfo, getTranscriptFromEngagementPanel
 */
declare function fetchInnerTube(endpoint: string, data: any): Promise<any>;

/**
 * XML 형식의 스크립트에서 자막을 추출합니다.
 * @calledby getSubtitlesFromCaptions
 */
declare function extractSubtitlesFromXML(transcript: string, startRegex: RegExp, durRegex: RegExp): {
    start: string;
    dur: string;
    text: string;
}[];

/**
 * 서버리스 환경에 맞는 세션 데이터를 생성합니다.
 * @calledby getVideoInfo, getTranscriptFromEngagementPanel
 */
declare function generateSessionData(): any;

/**
 * 방문자 데이터를 생성합니다.
 * @calledby generateSessionData
 */
declare function generateVisitorData(): string;

/**
 * 모든 환경에서 작동하는 범용 로거를 생성합니다.
 * @calledby (module scope)
 */
declare const createLogger: (namespace: string) => (message: string, ...args: any[]) => void;
