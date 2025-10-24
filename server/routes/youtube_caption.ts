import {FastifyInstance, FastifyReply, FastifyRequest} from 'fastify';
import {getSubtitles, getVideoDetails} from '../utils/youtube_caption.js';

// '/youtube/caption' 가 path 앞에 추가된다
export async function youtubeCaptionRoutes(fastify: FastifyInstance) {
  // List available captions for a video
  fastify.get('/list/:videoId', async (
    request: FastifyRequest<{ Params: { videoId: string }, Querystring: { lang, lang2 } }>,
    reply: FastifyReply
  ) => {
    try {
      const {lang, lang2} = request.query;
      const {videoId} = request.params;

      if (!videoId) {
        return reply.code(400).send({error: 'videoId is required'});
      }

      // Note: youtube-caption-extractor doesn't provide a method to list all available languages
      // We'll try to fetch captions and return metadata
      try {
        const result = await getVideoDetails({videoId, lang, lang2});
        return reply.send(result.subtitles_list);
      } catch (error: any) {
        return reply.code(404).send({
          error: 'No captions available for this video',
          details: error.message
        });
      }
    } catch (error: any) {
      console.error('Error listing captions:', error);
      return reply.code(500).send({
        error: 'Failed to list captions',
        details: error.message
      });
    }
  });

  // Get video details with captions
  fastify.get('/details/:videoId', async (
    request: FastifyRequest<{ Params: { videoId: string }, Querystring: { lang?: string; lang2?: string } }>,
    reply: FastifyReply
  ) => {
    try {
      const {lang, lang2} = request.query;
      const {videoId} = request.params;

      if (!videoId) {
        return reply.code(400).send({error: 'Invalid YouTube URL or video ID'});
      }

      // Fetch video details with captions
      const details = await getVideoDetails({videoId, lang, lang2});

      return reply.send(details);
    } catch (error: any) {
      console.error('Error fetching video details:', error);
      return reply.code(500).send({
        error: 'Failed to fetch video details',
        details: error.message
      });
    }
  });

  // Download captions for a video
  fastify.get('/download/:videoId', async (
    request: FastifyRequest<{ Params: { videoId: string }, Querystring: { lang?: string; lang2?: string } }>,
    reply: FastifyReply
  ) => {
    try {
      const {lang, lang2} = request.query;
      const {videoId} = request.params;

      if (!videoId) {
        return reply.code(400).send({error: 'Invalid YouTube URL or video ID'});
      }

      // Fetch captions with optional language
      const result = await getSubtitles({videoId, lang, lang2});
      return reply.send(result);
    } catch (error: any) {
      console.error('Error downloading captions:', error);
      return reply.code(500).send({
        error: 'Failed to download captions',
        details: error.message
      });
    }
  });
}
