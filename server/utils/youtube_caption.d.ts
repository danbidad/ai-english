// youtube_caption.ts 모듈의 모든 함수 선언을 담은 타입 정의 파일입니다.
// 함수들은 호출 계층 구조에 따라 우선순위가 높은 순서(상위 함수부터)로 정렬되어 있습니다.

// =================================================================
// 1. 공개 함수 (Exported Functions) - 최상위 진입점
// =================================================================

/**
 * 지정된 YouTube 동영상의 제목, 설명 및 전체 자막을 가져옵니다.
 * @param options - videoID와 lang을 포함하는 옵션 객체
 * @returns 동영상 상세 정보와 자막을 포함하는 Promise<VideoDetails>
 */
export declare const getVideoDetails: (options: Options) => Promise<VideoDetails>;

/**
 * 지정된 YouTube 동영상의 자막(transcript) 데이터만 가져옵니다.
 * @param options - videoID와 lang을 포함하는 옵션 객체
 * @returns 자막(Subtitle) 객체의 배열을 담은 Promise
 */
export declare const getSubtitles: (options: Options) => Promise<Subtitle[]>;

// =================================================================
// 2. 내부 함수 (Internal Functions) - 호출 관계에 따라 정렬
// =================================================================

/**
 * YouTube InnerTube API에서 비디오 정보(player, next)를 처리합니다.
 * @param videoID - 동영상 ID
 * @returns 플레이어 데이터와 다음 컨텐츠 데이터를 담은 객체 Promise
 * @internal 호출하는 함수: getVideoDetails, getSubtitles
 */
declare function getVideoInfo(videoID: string): Promise<{ playerData: any; nextData: any | null }>;

/**
 * Engagement Panel(참여 패널)에서 스크립트(자막)를 추출합니다. (최신 방식)
 * @param videoID - 동영상 ID
 * @param nextData - getVideoInfo에서 얻은 next API 응답 데이터
 * @returns 추출된 자막(Subtitle) 객체의 배열을 담은 Promise
 * @internal 호출하는 함수: getVideoDetails, getSubtitles
 */
declare function getTranscriptFromEngagementPanel(videoID: string, nextData: any): Promise<Subtitle[]>;

/**
 * 플레이어 데이터에 포함된 기존 자막 트랙에서 자막을 추출합니다. (대체/이전 방식)
 * @param videoID - 동영상 ID
 * @param playerData - getVideoInfo에서 얻은 player API 응답 데이터
 * @param lang - 자막 언어 코드
 * @returns 추출된 자막(Subtitle) 객체의 배열을 담은 Promise
 * @internal 호출하는 함수: getVideoDetails, getSubtitles
 */
declare function getSubtitlesFromCaptions(videoID: string, playerData: any, lang?: string): Promise<Subtitle[]>;

/**
 * YouTube InnerTube API 엔드포인트에 요청을 보냅니다.
 * @param endpoint - API 엔드포인트 경로 (예: '/player')
 * @param data - API 요청에 필요한 페이로드 데이터
 * @returns API 응답 데이터를 담은 객체 Promise
 * @internal 호출하는 함수: getVideoInfo, getTranscriptFromEngagementPanel
 */
declare function fetchInnerTube(endpoint: string, data: any): Promise<any>;

/**
 * InnerTube API 요청에 필요한 세션 데이터를 생성합니다.
 * @returns 클라이언트 컨텍스트와 방문자 데이터를 포함하는 객체
 * @internal 호출하는 함수: getVideoInfo, getTranscriptFromEngagementPanel
 */
declare function generateSessionData(): { context: object; visitorData: string };

/**
 * XML 형식의 자막 텍스트를 파싱하여 Subtitle 객체 배열로 변환합니다.
 * @param transcript - XML 형식의 자막 원본 텍스트
 * @param startRegex - 시작 시간을 추출하기 위한 정규식
 * @param durRegex - 지속 시간을 추출하기 위한 정규식
 * @returns Subtitle 객체의 배열
 * @internal 호출하는 함수: getSubtitlesFromCaptions
 */
declare function extractSubtitlesFromXML(transcript: string, startRegex: RegExp, durRegex: RegExp): Subtitle[];

/**
 * InnerTube API 컨텍스트에 필요한 임의의 방문자 데이터를 생성합니다.
 * @returns 11자리 문자열로 된 방문자 데이터
 * @internal 호출하는 함수: generateSessionData
 */
declare function generateVisitorData(): string;

/**
 * 디버그 네임스페이스를 기반으로 로거 함수를 생성합니다.
 * @param namespace - 로거의 네임스페이스
 * @returns 조건부로 메시지를 콘솔에 출력하는 로거 함수
 * @internal 호출하는 함수: (모듈 최상단에서 사용)
 */
declare function createLogger(namespace: string): (message: string, ...args: any[]) => void;