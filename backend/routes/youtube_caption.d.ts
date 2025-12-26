
/**
 * AI_INFO: YouTube 자막 API 엔드포인트 정의
 *
 * 기본 경로: /youtube/caption
 *
 * 이 파일은 youtube_caption.ts 라우트의 엔드포인트를 정리한 참고 문서입니다.
 * AI는 이 정보를 바탕으로 YouTube 자막 관련 기능을 이해하고 활용할 수 있습니다.
 */

declare namespace YoutubeCaptionAPI {
  /**
   * 공통 쿼리 파라미터
   */
  interface CommonQueryParams {
    /** 첫 번째 언어 코드 (예: 'ko', 'en') */
    lang?: string;
    /** 두 번째 언어 코드 (이중 자막용) */
    lang2?: string;
  }

  /**
   * 엔드포인트 1: GET /youtube/caption/list/:videoId
   *
   * 설명: 동영상에서 사용 가능한 자막 목록을 조회합니다.
   *
   * 경로 파라미터:
   * - videoId (required): YouTube 비디오 ID
   *
   * 쿼리 파라미터:
   * - lang (optional): 언어 코드
   * - lang2 (optional): 두 번째 언어 코드
   *
   * 응답:
   * - 200: 자막 목록 배열 반환
   * - 400: videoId가 누락된 경우
   * - 404: 자막을 찾을 수 없는 경우
   * - 500: 서버 오류
   *
   * 예시: GET /youtube/caption/list/dQw4w9WgXcQ?lang=ko
   */
  interface ListCaptionsEndpoint {
    method: 'GET';
    path: '/list/:videoId';
    params: { videoId: string };
    query: CommonQueryParams;
    response: SubtitlesList;
  }

  /**
   * 엔드포인트 2: GET /youtube/caption/details/:videoId
   *
   * 설명: 동영상 상세 정보와 자막을 함께 조회합니다.
   *
   * 경로 파라미터:
   * - videoId (required): YouTube 비디오 ID
   *
   * 쿼리 파라미터:
   * - lang (optional): 언어 코드
   * - lang2 (optional): 두 번째 언어 코드
   *
   * 응답:
   * - 200: 비디오 상세 정보 + 자막 데이터
   * - 400: videoId가 누락된 경우
   * - 500: 서버 오류
   *
   * 예시: GET /youtube/caption/details/dQw4w9WgXcQ?lang=ko&lang2=en
   */
  interface GetDetailsEndpoint {
    method: 'GET';
    path: '/details/:videoId';
    params: { videoId: string };
    query: CommonQueryParams;
    response: VideoDetailsWithCaptions;
  }

  /**
   * 엔드포인트 3: GET /youtube/caption/download/:videoId
   *
   * 설명: 동영상의 자막 데이터만 다운로드합니다 (비디오 정보 제외).
   *
   * 경로 파라미터:
   * - videoId (required): YouTube 비디오 ID
   *
   * 쿼리 파라미터:
   * - lang (optional): 언어 코드
   * - lang2 (optional): 두 번째 언어 코드
   *
   * 응답:
   * - 200: 자막 데이터만 반환
   * - 400: videoId가 누락된 경우
   * - 500: 서버 오류
   *
   * 예시: GET /youtube/caption/download/dQw4w9WgXcQ?lang=ko
   */
  interface DownloadCaptionsEndpoint {
    method: 'GET';
    path: '/download/:videoId';
    params: { videoId: string };
    query: CommonQueryParams;
    response: SubtitlesData;
  }

  /**
   * 공통 에러 응답 형식
   */
  interface ErrorResponse {
    error: string;
    details?: string;
  }

  /**
   * 자막 목록 응답 타입 (실제 구조는 getVideoDetails 함수 참조)
   */
  interface SubtitlesList {
    // getVideoDetails의 subtitles_list 구조
    [key: string]: any;
  }

  /**
   * 비디오 상세 정보 + 자막 응답 타입
   */
  interface VideoDetailsWithCaptions {
    // getVideoDetails의 전체 반환 구조
    subtitles_list: SubtitlesList;
    [key: string]: any;
  }

  /**
   * 자막 데이터만 포함된 응답 타입
   */
  interface SubtitlesData {
    // getSubtitles의 반환 구조
    [key: string]: any;
  }
}

/**
 * AI_INFO: 사용 가이드
 *
 * 1. 자막 목록 확인이 필요한 경우:
 *    → GET /youtube/caption/list/:videoId 사용
 *
 * 2. 비디오 정보와 자막을 모두 가져와야 하는 경우:
 *    → GET /youtube/caption/details/:videoId 사용
 *
 * 3. 자막 데이터만 필요한 경우:
 *    → GET /youtube/caption/download/:videoId 사용
 *
 * 4. 모든 엔드포인트는:
 *    - videoId는 필수 파라미터
 *    - lang, lang2는 선택적 쿼리 파라미터
 *    - 오류 시 적절한 HTTP 상태 코드와 에러 메시지 반환
 *
 * 5. 의존 모듈:
 *    - utils/youtube_caption.js의 getSubtitles, getVideoDetails 함수 사용
 */

export { YoutubeCaptionAPI };
