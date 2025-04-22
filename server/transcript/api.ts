import axios, { AxiosInstance } from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import * as tough from 'tough-cookie';

import { TranscriptList, TranscriptListFetcher, TranscriptItem } from './transcripts.js';
import { CookiePathInvalid, CookiesInvalid } from './errors.js';

export class YouTubeTranscriptApi {
  /**
   * Retrieves the list of transcripts which are available for a given video
   *
   * @param videoId - The YouTube video ID
   * @param proxies - A dictionary mapping of http and https proxies to be used for the network requests
   * @param cookies - A string of the path to a text file containing YouTube authorization cookies
   * @returns The list of available transcripts
   */
  static async listTranscripts(
    videoId: string,
    proxies?: { http?: string; https?: string },
    cookies?: string | null
  ): Promise<TranscriptList> {
    const httpClient = axios.create();

    if (cookies) {
      const cookieJar = await YouTubeTranscriptApi.loadCookies(cookies, videoId);
      // Apply cookies to axios instance
      httpClient.defaults.headers.Cookie = cookieJar.getCookieStringSync('https://www.youtube.com');
    }

    if (proxies) {
      httpClient.defaults.proxy = {
        host: proxies.http?.split('://')[1].split(':')[0] || proxies.https?.split('://')[1].split(':')[0] || '',
        port: parseInt(proxies.http?.split(':').pop() || proxies.https?.split(':').pop() || '0'),
        protocol: proxies.http ? 'http' : 'https'
      };
    }

    return new TranscriptListFetcher(httpClient).fetch(videoId);
  }

  /**
   * Retrieves the transcripts for a list of videos
   *
   * @param videoIds - A list of YouTube video IDs
   * @param languages - A list of language codes in descending priority
   * @param continueAfterError - If this is set the execution won't be stopped if an error occurs
   * @param proxies - A dictionary mapping of http and https proxies to be used for the network requests
   * @param cookies - A string of the path to a text file containing YouTube authorization cookies
   * @param preserveFormatting - Whether to keep select HTML text formatting
   * @returns A tuple containing a dictionary mapping video IDs to their transcripts, and a list of unretrievable video IDs
   */
  static async getTranscripts(
    videoIds: string[],
    languages: string[] = ["en"],
    continueAfterError: boolean = false,
    proxies?: { http?: string; https?: string },
    cookies?: string,
    preserveFormatting: boolean = false
  ): Promise<[{ [videoId: string]: TranscriptItem[] }, string[]]> {
    if (!Array.isArray(videoIds)) {
      throw new Error("`videoIds` must be an array of strings");
    }

    const data: { [videoId: string]: TranscriptItem[] } = {};
    const unretrievableVideos: string[] = [];

    for (const videoId of videoIds) {
      try {
        data[videoId] = await YouTubeTranscriptApi.getTranscript(
          videoId,
          languages,
          proxies,
          cookies,
          preserveFormatting
        );
      } catch (error) {
        if (!continueAfterError) {
          throw error;
        }
        unretrievableVideos.push(videoId);
      }
    }

    return [data, unretrievableVideos];
  }

  /**
   * Retrieves the transcript for a single video
   *
   * @param videoId - The YouTube video ID
   * @param languages - A list of language codes in descending priority
   * @param proxies - A dictionary mapping of http and https proxies to be used for the network requests
   * @param cookies - A string of the path to a text file containing YouTube authorization cookies
   * @param preserveFormatting - Whether to keep select HTML text formatting
   * @returns A list of transcript items containing text, start time, and duration
   */
  static async getTranscript(
    videoId: string,
    languages: string[] = ["en"],
    proxies?: { http?: string; https?: string },
    cookies?: string,
    preserveFormatting: boolean = false
  ): Promise<TranscriptItem[]> {
    if (typeof videoId !== 'string') {
      throw new Error("`videoId` must be a string");
    }

    const transcriptList = await YouTubeTranscriptApi.listTranscripts(videoId, proxies, cookies);
    const transcript = transcriptList.findTranscript(languages);
    return transcript.fetch(preserveFormatting);
  }

  /**
   * Loads cookies from a file
   *
   * @param cookiesPath - Path to the cookies file
   * @param videoId - YouTube video ID for error reporting
   * @returns A CookieJar object containing the loaded cookies
   */
  private static async loadCookies(cookiesPath: string, videoId: string): Promise<tough.CookieJar> {
    try {
      const cookieJar = new tough.CookieJar();

      // Read the cookie file
      if (!fs.existsSync(cookiesPath)) {
        throw new CookiePathInvalid(videoId);
      }

      const cookieContent = fs.readFileSync(cookiesPath, 'utf8');
      const cookieLines = cookieContent.split('\n').filter(line => line.trim() && !line.startsWith('#'));

      // Parse and add cookies to the jar
      for (const line of cookieLines) {
        const parts = line.split('\t');
        if (parts.length >= 7) {
          const cookie = new tough.Cookie({
            domain: parts[0],
            path: parts[2],
            secure: parts[3] === 'TRUE',
            expires: parts[4] ? new Date(parseInt(parts[4]) * 1000) : undefined,
            key: parts[5],
            value: parts[6]
          });

          cookieJar.setCookieSync(cookie, 'https://www.youtube.com');
        }
      }

      if (cookieJar.getCookiesSync('https://www.youtube.com').length === 0) {
        throw new CookiesInvalid(videoId);
      }

      return cookieJar;
    } catch (error) {
      if (error instanceof CookiesInvalid) {
        throw error;
      }
      throw new CookiePathInvalid(videoId);
    }
  }
}
