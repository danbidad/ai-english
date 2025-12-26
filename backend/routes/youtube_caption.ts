import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { getSubtitles, getVideoDetails } from '../utils/youtube_caption.js';

// 요청 파라미터 및 쿼리스티링에 대한 타입을 정의하여 타입 안정성을 강화합니다.
type ListRequest = FastifyRequest<{ Params: { videoId: string }, Querystring: { lang?: string, lang2?: string } }>;
type DetailsRequest = FastifyRequest<{ Params: { videoId: string }, Querystring: { lang?: string; lang2?: string } }>;
type DownloadRequest = FastifyRequest<{ Params: { videoId: string }, Querystring: { lang?: string; lang2?: string } }>;

/**
 * '/list/:videoId' 경로의 핸들러 함수입니다.
 * 동영상에서 사용 가능한 자막 목록을 조회합니다.
 * @param request - Fastify 요청 객체
 * @param reply - Fastify 응답 객체
 */
async function listCaptionsHandler(request: ListRequest, reply: FastifyReply) {
  try {
    const { lang, lang2 } = request.query;
    const { videoId } = request.params;

    // videoId가 없는 경우, 400 Bad Request 오류를 반환합니다.
    if (!videoId) {
      return reply.code(400).send({ error: 'videoId is required' });
    }

    // getVideoDetails를 호출하여 자막 목록(subtitles_list)을 가져옵니다.
    try {
      const result = await getVideoDetails({ videoId, lang, lang2 });
      return reply.send(result);
    } catch (error: any) {
      // 자막을 찾을 수 없는 경우, 404 Not Found 오류를 반환합니다.
      return reply.code(404).send({
        error: 'No captions available for this video'
      });
    }
  } catch (error: any) {
    console.error('Error listing captions:', error);
    // 그 외 서버 오류 발생 시, 500 Internal Server Error를 반환합니다.
    return reply.code(500).send({
      error: 'Failed to list captions',
      details: error
    });
  }
}

/**
 * '/details/:videoId' 경로의 핸들러 함수입니다.
 * 동영상 상세 정보와 자막을 함께 조회합니다.https://www.youtube.com/watch?v=gzprp_Qufg4
 * @param request - Fastify 요청 객체
 * @param reply - Fastify 응답 객체
 */
async function getDetailsHandler(request: DetailsRequest, reply: FastifyReply) {
  try {
    const { lang, lang2 } = request.query;
    const { videoId } = request.params;

    // videoId가 없는 경우, 400 Bad Request 오류를 반환합니다.
    if (!videoId) {
      return reply.code(400).send({ error: 'Invalid YouTube URL or video ID' });
    }

    // getVideoDetails를 호출하여 동영상 상세 정보와 자막을 가져옵니다.
    const details = await getVideoDetails({ videoId, lang, lang2 });

    return reply.send(details);
  } catch (error: any) {
    console.error('Error fetching video details:', error);
    // 오류 발생 시, 500 Internal Server Error를 반환합니다.
    return reply.code(500).send({
      error: 'Failed to fetch video details',
      details: error.message
    });
  }
}

/**
 * '/download/:videoId' 경로의 핸들러 함수입니다.
 * 동영상의 자막 데이터만 다운로드합니다.
 * @param request - Fastify 요청 객체
 * @param reply - Fastify 응답 객체
 */
async function downloadCaptionsHandler(request: DownloadRequest, reply: FastifyReply) {
  try {
    const { lang, lang2 } = request.query;
    const { videoId } = request.params;

    // videoId가 없는 경우, 400 Bad Request 오류를 반환합니다.
    if (!videoId) {
      return reply.code(400).send({ error: 'Invalid YouTube URL or video ID' });
    }

    // getSubtitles를 호출하여 자막 데이터만 가져옵니다.
    const result = await getSubtitles({ videoId, lang, lang2 });
    return reply.send(result);
  } catch (error: any) {
    console.error('Error downloading captions:', error);
    // 오류 발생 시, 500 Internal Server Error를 반환합니다.
    return reply.code(500).send({
      error: 'Failed to download captions',
      details: error.message
    });
  }
}

/**
 * YouTube 자막 관련 라우트를 Fastify 인스턴스에 등록합니다.
 * '/youtube/caption' 경로가 이 라우트들 앞에 추가됩니다.
 * @param fastify - Fastify 인스턴스
 */
export async function youtubeCaptionRoutes(fastify: FastifyInstance) {
  // 동영상에서 사용 가능한 자막 목록을 조회하는 라우트
  fastify.get('/subtitle_list/:videoId', listCaptionsHandler);

  // 동영상 상세 정보와 자막을 함께 조회하는 라우트
  fastify.get('/info/:videoId', getDetailsHandler);

  // 동영상의 자막 데이터만 다운로드하는 라우트
  fastify.get('/subtitles/:videoId', downloadCaptionsHandler);
}
