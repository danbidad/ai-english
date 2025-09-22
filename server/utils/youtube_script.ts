// from youtube-caption-extractor

import he from 'he';
import striptags from 'striptags';
import {cachedFetch} from "./cached_fetch.js";

interface Subtitle {
  start: string;
  dur: string;
  text: string;
}

interface CaptionTrack {
  baseUrl: string;
  vssId: string;
}

export interface Options {
  videoId: string;
  lang?: string;
}

export interface VideoDetails {
  title: string;
  description: string;
  subtitles_list?: CaptionTrack[];
  subtitles?: Subtitle[];
}

export const getVideoDetails = async ({videoId, lang,}: Options): Promise<VideoDetails> => {
  const response = await fetch(`https://youtube.com/watch?v=${videoId}`);
  const data = await response.text();

  // Extract title and description from the page data
  const titleMatch = data.match(
    /<meta name="title" content="([^"]*|[^"]*[^&]quot;[^"]*)">/
  );
  const descriptionMatch = data.match(
    /<meta name="description" content="([^"]*|[^"]*[^&]quot;[^"]*)">/
  );

  const title = titleMatch ? titleMatch[1] : 'No title found';
  const description = descriptionMatch
    ? descriptionMatch[1]
    : 'No description found';

  // Check if the video page contains captions
  if (!data.includes('captionTracks')) {
    console.warn(`No captions found for video: ${videoId}`);
    return {
      title,
      description,
      subtitles_list: [],
    };
  }

  // Extract caption tracks JSON string from video page data
  const regex = /"captionTracks":(\[.*?])/;
  const regexResult = regex.exec(data);

  if (!regexResult) {
    console.warn(`Failed to extract captionTracks from video: ${videoId}`);
    return {
      title,
      description,
      subtitles_list: [],
    };
  }

  const [_, captionTracksJson] = regexResult;
  const captionTracks = JSON.parse(captionTracksJson);

  if (lang) {
    const captiontrack =
      captionTracks.find((track: CaptionTrack) => track.vssId === `.${lang}`) ||
      captionTracks.find((track: CaptionTrack) => track.vssId === `a.${lang}`) ||
      captionTracks.find(
        (track: CaptionTrack) => track.vssId && track.vssId.match(`.${lang}`)
      );

    if (captiontrack) {
      try {
        let subtitles = await getSubtitles(captiontrack.baseUrl)
        if (subtitles.length > 0)
          return {
            title,
            description,
            subtitles_list: captionTracks,
            subtitles: subtitles
          };
      } catch (error) {

      }
    }
  }

  return {
    title,
    description,
    subtitles_list: captionTracks,
  };
};

export const getSubtitles = async (baseUrl) => {
// Fetch subtitles XML from the subtitle track URL
  const subtitlesResponse = await cachedFetch(baseUrl);
  const transcript = await subtitlesResponse.text();

  if ( transcript.length === 0 )
    return []

// Define regex patterns for extracting start and duration times
  const startRegex = /start="([\d.]+)"/;
  const durRegex = /dur="([\d.]+)"/;

// Process the subtitles XML to create an array of subtitle objects
  const lines = transcript
    .replace('<?xml version="1.0" encoding="utf-8" ?><transcript>', '')
    .replace('</transcript>', '')
    .split('</text>')
    .filter((line: string) => line && line.trim())
    .reduce((acc: Subtitle[], line: string) => {
      // Extract start and duration times using regex patterns
      const startResult = startRegex.exec(line);
      const durResult = durRegex.exec(line);

      if (!startResult || !durResult) {
        console.warn(`Failed to extract start or duration from line: ${line}`);
        return acc;
      }

      const [, start] = startResult;
      const [, dur] = durResult;

      // Clean up subtitle text by removing HTML tags and decoding HTML entities
      const htmlText = line
        .replace(/<text.+>/, '')
        .replace(/&amp;/gi, '&')
        .replace(/<\/?[^>]+(>|$)/g, '');
      const decodedText = he.decode(htmlText);
      const text = striptags(decodedText);

      // Create a subtitle object with start, duration, and text properties
      acc.push({
        start,
        dur,
        text,
      });

      return acc;
    }, []);

  return lines
}
