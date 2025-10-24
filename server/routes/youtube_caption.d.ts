import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

/**
 * Initializes the YouTube caption routes.
 * The base path for these routes is '/youtube/caption'.
 *
 * @param fastify The Fastify instance.
 *
 * ---
 *
 * ### GET /proxy_count
 *
 * Health check endpoint.
 *
 * **Response:**
 * - `200 OK` - Returns the number of available proxies.
 *
 * ---
 *
 * ### GET /list/:videoId
 *
 * Lists available captions for a video.
 *
 * **Params:**
 * - `videoId` (string): The ID of the YouTube video.
 *
 * **Response:**
 * - `200 OK`: `{ video_id: string, message: 'Captions available', caption_count: number }`
 * - `400 Bad Request`: `{ error: 'videoId is required' }`
 * - `404 Not Found`: `{ error: 'No captions available for this video', details: string }`
 * - `500 Internal Server Error`: `{ error: 'Failed to list captions', details: string }`
 *
 * ---
 *
 * ### GET /download
 *
 * Downloads captions for a video.
 *
 * **Query Parameters:**
 * - `url` (string): The URL of the YouTube video.
 * - `lang` (string, optional): The language code for the captions.
 *
 * **Response:**
 * - `200 OK`: `{ video_id: string, language: string, captions: Array<{ text: string, start: number, duration: number }> }`
 * - `400 Bad Request`: `{ error: 'url parameter is required' }` or `{ error: 'Invalid YouTube URL or video ID' }`
 * - `404 Not Found`: `{ error: 'No captions available' }`
 * - `500 Internal Server Error`: `{ error: 'Failed to download captions', details: string }`
 *
 * ---
 *
 * ### POST /proxy_refresh
 *
 * Refreshes the list of proxies.
 *
 * **Response:**
 * - `200 OK`: `{ message: 'Proxies refreshed successfully', proxies_loaded: number }`
 * - `500 Internal Server Error`: `{ error: 'Failed to refresh proxies', details: string }`
 *
 * ---
 */
export declare function youtubeCaptionRoutes(fastify: FastifyInstance): Promise<void>;
