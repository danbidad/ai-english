import axios from 'axios';
import {FastifyInstance, FastifyReply, FastifyRequest} from 'fastify';
import {getSubtitles} from '../utils/youtube_caption.js';
import {proxyRotator, initializeProxies} from "../utils/webshare.js";

// Helper function to extract video ID from YouTube URL
function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /^([a-zA-Z0-9_-]{11})$/
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

// Helper function to fetch captions with proxy rotation
async function fetchCaptionsWithProxy(videoId: string, lang?: string): Promise<any[]> {
  try {
    // Fetch subtitles using youtube-caption-extractor
    const subtitles = await getSubtitles({videoID: videoId, lang});
    return subtitles;
  } catch (error) {
    throw error;
  }
}

function formatTime(seconds: number, useDot: boolean = false): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const millis = Math.floor((seconds % 1) * 1000);

  const separator = useDot ? '.' : ',';

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}${separator}${String(millis).padStart(3, '0')}`;
}

// '/youtube/caption' 가 path 앞에 추가된다
export async function youtubeCaptionRoutes(fastify: FastifyInstance) {
  // Health check endpoint
  fastify.get('/proxy_count', async (request: FastifyRequest, reply: FastifyReply) => {
    return reply.send(proxyRotator.getProxiesCount());
  });

  // List available captions for a video
  fastify.get('/list/:videoId', async (
    request: FastifyRequest<{ Params: { videoId: string } }>,
    reply: FastifyReply
  ) => {
    try {
      const {videoId} = request.params;

      if (!videoId) {
        return reply.code(400).send({error: 'videoId is required'});
      }

      // Note: youtube-caption-extractor doesn't provide a method to list all available languages
      // We'll try to fetch captions and return metadata
      try {
        const subtitles = await fetchCaptionsWithProxy(videoId);

        return reply.send({
          video_id: videoId,
          url: youtube_url,
          message: 'Captions available',
          caption_count: subtitles.length
        });
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

  // Download captions for a video
  fastify.get('/download', async (
    request: FastifyRequest<{ Querystring: { url: string; lang?: string } }>,
    reply: FastifyReply
  ) => {
    try {
      const {url, lang} = request.query;

      if (!url) {
        return reply.code(400).send({error: 'url parameter is required'});
      }

      const videoId = extractVideoId(url);
      if (!videoId) {
        return reply.code(400).send({error: 'Invalid YouTube URL or video ID'});
      }

      // Fetch captions with optional language
      const subtitles = await fetchCaptionsWithProxy(videoId, lang);

      if (!subtitles || subtitles.length === 0) {
        return reply.code(404).send({error: 'No captions available'});
      }

      // Convert to requested format (default: srt)
      return reply.send({
        video_id: videoId,
        language: lang || 'auto',
        captions: subtitles
      });
    } catch (error: any) {
      console.error('Error downloading captions:', error);
      return reply.code(500).send({
        error: 'Failed to download captions',
        details: error.message
      });
    }
  });

  // Endpoint to refresh proxies
  fastify.post('/proxy_refresh', async (
    request: FastifyRequest,
    reply: FastifyReply
  ) => {
    try {
      await initializeProxies();
      return reply.send({
        message: 'Proxies refreshed successfully',
        proxies_loaded: proxyRotator.getProxiesCount()
      });
    } catch (error: any) {
      console.error('Error refreshing proxies:', error);
      return reply.code(500).send({
        error: 'Failed to refresh proxies',
        details: error.message
      });
    }
  });
}

// Helper function to format time in SRT/VTT format (HH:MM:SS,mmm or HH:MM:SS.mmm)
