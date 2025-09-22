import axios, { AxiosInstance } from 'axios';
import { XMLParser } from 'fast-xml-parser';

import { unescape } from './html-unescaping.js';
import {
  VideoUnavailable,
  TooManyRequests,
  YouTubeRequestFailed,
  NoTranscriptFound,
  TranscriptsDisabled,
  NotTranslatable,
  TranslationLanguageNotAvailable,
  NoTranscriptAvailable,
  FailedToCreateConsentCookie,
  InvalidVideoId,
} from './errors.js';
import { formatWatchUrl } from './settings.js';

// Types for transcript data
export interface TranscriptItem {
  text: string;
  start: number;
  duration: number;
}

export interface TranslationLanguage {
  language: string;
  language_code: string;
}

function raiseHttpErrors(response: any, videoId: string): any {
  if (response.status >= 400) {
    throw new YouTubeRequestFailed(videoId, new Error(`HTTP error ${response.status}`));
  }
  return response;
}

export class TranscriptListFetcher {
  private httpClient: AxiosInstance;

  constructor(httpClient: AxiosInstance) {
    this.httpClient = httpClient;
  }

  async fetch(videoId: string): Promise<TranscriptList> {
    const html = await this.fetchVideoHtml(videoId);
    return TranscriptList.build(
      this.httpClient,
      videoId,
      this.extractCaptionsJson(html, videoId)
    );
  }

  private extractCaptionsJson(html: string, videoId: string): any {
    const splittedHtml = html.split('"captions":');

    if (splittedHtml.length <= 1) {
      if (videoId.startsWith("http://") || videoId.startsWith("https://")) {
        throw new InvalidVideoId(videoId);
      }
      if (html.includes('class="g-recaptcha"')) {
        throw new TooManyRequests(videoId);
      }
      if (!html.includes('"playabilityStatus":')) {
        throw new VideoUnavailable(videoId);
      }

      throw new TranscriptsDisabled(videoId);
    }

    const captionsJson = JSON.parse(
      splittedHtml[1].split(',"videoDetails')[0].replace(/\n/g, "")
    ).playerCaptionsTracklistRenderer;

    if (captionsJson === null) {
      throw new TranscriptsDisabled(videoId);
    }

    if (!("captionTracks" in captionsJson)) {
      throw new NoTranscriptAvailable(videoId);
    }

    return captionsJson;
  }

  private createConsentCookie(html: string, videoId: string): void {
    const match = html.match('name="v" value="(.*?)"');
    if (match === null) {
      throw new FailedToCreateConsentCookie(videoId);
    }

    // Set cookie in axios instance
    this.httpClient.defaults.headers.Cookie = `CONSENT=YES+${match[1]}; Domain=.youtube.com`;
  }

  private async fetchVideoHtml(videoId: string): Promise<string> {
    let html = await this.fetchHtml(videoId);
    if (html.includes('action="https://consent.youtube.com/s"')) {
      this.createConsentCookie(html, videoId);
      html = await this.fetchHtml(videoId);
      if (html.includes('action="https://consent.youtube.com/s"')) {
        throw new FailedToCreateConsentCookie(videoId);
      }
    }
    return html;
  }

  private async fetchHtml(videoId: string): Promise<string> {
    const response = await this.httpClient.get(
      formatWatchUrl(videoId),
      { headers: { "Accept-Language": "en-US" } }
    );
    return unescape(raiseHttpErrors(response, videoId).data);
  }
}

export class TranscriptList {
  videoId: string;
   manuallyCreatedTranscripts: { [key: string]: Transcript };
   generatedTranscripts: { [key: string]: Transcript };
   translationLanguages: TranslationLanguage[];

  constructor(
    videoId: string,
    manuallyCreatedTranscripts: { [key: string]: Transcript },
    generatedTranscripts: { [key: string]: Transcript },
    translationLanguages: TranslationLanguage[]
  ) {
    this.videoId = videoId;
    this.manuallyCreatedTranscripts = manuallyCreatedTranscripts;
    this.generatedTranscripts = generatedTranscripts;
    this.translationLanguages = translationLanguages;
  }

  static build(
    httpClient: AxiosInstance,
    videoId: string,
    captionsJson: any
  ): TranscriptList {
    const translationLanguages: TranslationLanguage[] = (captionsJson.translationLanguages || []).map(
      (translationLanguage: any) => ({
        language: translationLanguage.languageName.simpleText,
        language_code: translationLanguage.languageCode,
      })
    );

    const manuallyCreatedTranscripts: { [key: string]: Transcript } = {};
    const generatedTranscripts: { [key: string]: Transcript } = {};

    for (const caption of captionsJson.captionTracks) {
      const isGenerated = caption.kind === "asr";
      const transcriptDict = isGenerated ? generatedTranscripts : manuallyCreatedTranscripts;

      transcriptDict[caption.languageCode] = new Transcript(
        httpClient,
        videoId,
        caption.baseUrl,
        caption.name.simpleText,
        caption.languageCode,
        isGenerated,
        caption.isTranslatable ? translationLanguages : []
      );
    }

    return new TranscriptList(
      videoId,
      manuallyCreatedTranscripts,
      generatedTranscripts,
      translationLanguages
    );
  }

  [Symbol.iterator](): Iterator<Transcript> {
    const transcripts = [
      ...Object.values(this.manuallyCreatedTranscripts),
      ...Object.values(this.generatedTranscripts)
    ];
    let index = 0;

    return {
      next(): IteratorResult<Transcript> {
        if (index < transcripts.length) {
          return { value: transcripts[index++], done: false };
        } else {
          return { value: undefined as any, done: true };
        }
      }
    };
  }

  findTranscript(languageCodes: string[]): Transcript {
    return this.findTranscriptHelper(
      languageCodes,
      [this.manuallyCreatedTranscripts, this.generatedTranscripts]
    );
  }

  findGeneratedTranscript(languageCodes: string[]): Transcript {
    return this.findTranscriptHelper(
      languageCodes,
      [this.generatedTranscripts]
    );
  }

  findManuallyCreatedTranscript(languageCodes: string[]): Transcript {
    return this.findTranscriptHelper(
      languageCodes,
      [this.manuallyCreatedTranscripts]
    );
  }

  private findTranscriptHelper(
    languageCodes: string[],
    transcriptDicts: { [key: string]: Transcript }[]
  ): Transcript {
    for (const languageCode of languageCodes) {
      for (const transcriptDict of transcriptDicts) {
        if (languageCode in transcriptDict) {
          return transcriptDict[languageCode];
        }
      }
    }

    throw new NoTranscriptFound(this.videoId, languageCodes, this);
  }

  toString(): string {
    return (
      `For this video (${this.videoId}) transcripts are available in the following languages:\n\n` +
      `(MANUALLY CREATED)\n` +
      `${this.getLanguageDescription(Object.values(this.manuallyCreatedTranscripts).map(t => t.toString()))}\n\n` +
      `(GENERATED)\n` +
      `${this.getLanguageDescription(Object.values(this.generatedTranscripts).map(t => t.toString()))}\n\n` +
      `(TRANSLATION LANGUAGES)\n` +
      `${this.getLanguageDescription(this.translationLanguages.map(
        tl => `${tl.language_code} ("${tl.language}")`
      ))}`
    );
  }

  private getLanguageDescription(transcriptStrings: string[]): string {
    const description = transcriptStrings.map(transcript => ` - ${transcript}`).join('\n');
    return description || "None";
  }
}

export class Transcript {
  httpClient: AxiosInstance;
  videoId: string;
  url: string;
  language: string;
  languageCode: string;
  isGenerated: boolean;
  translationLanguages: TranslationLanguage[];
  translationLanguagesDict: { [key: string]: string };

  constructor(
    httpClient: AxiosInstance,
    videoId: string,
    url: string,
    language: string,
    languageCode: string,
    isGenerated: boolean,
    translationLanguages: TranslationLanguage[]
  ) {
    this.httpClient = httpClient;
    this.videoId = videoId;
    this.url = url;
    this.language = language;
    this.languageCode = languageCode;
    this.isGenerated = isGenerated;
    this.translationLanguages = translationLanguages;
    this.translationLanguagesDict = translationLanguages.reduce((dict, tl) => {
      dict[tl.language_code] = tl.language;
      return dict;
    }, {} as { [key: string]: string });
  }

  async fetch(preserveFormatting: boolean = false): Promise<TranscriptItem[]> {
    const response = await this.httpClient.get(
      this.url,
      { headers: { "Accept-Language": "en-US" } }
    );
    return new TranscriptParser(preserveFormatting).parse(
      raiseHttpErrors(response, this.videoId).data
    );
  }

  toString(): string {
    return `${this.languageCode} ("${this.language}")${this.isTranslatable ? "[TRANSLATABLE]" : ""}`;
  }

  get isTranslatable(): boolean {
    return this.translationLanguages.length > 0;
  }

  translate(languageCode: string): Transcript {
    if (!this.isTranslatable) {
      throw new NotTranslatable(this.videoId);
    }

    if (!(languageCode in this.translationLanguagesDict)) {
      throw new TranslationLanguageNotAvailable(this.videoId);
    }

    return new Transcript(
      this.httpClient,
      this.videoId,
      `${this.url}&tlang=${languageCode}`,
      this.translationLanguagesDict[languageCode],
      languageCode,
      true,
      []
    );
  }
}

class TranscriptParser {
  private static FORMATTING_TAGS = [
    "strong",  // important
    "em",      // emphasized
    "b",       // bold
    "i",       // italic
    "mark",    // marked
    "small",   // smaller
    "del",     // deleted
    "ins",     // inserted
    "sub",     // subscript
    "sup",     // superscript
  ];

  private htmlRegex: RegExp;

  constructor(preserveFormatting: boolean = false) {
    this.htmlRegex = TranscriptParser.getHtmlRegex(preserveFormatting);
  }

  private static getHtmlRegex(preserveFormatting: boolean): RegExp {
    if (preserveFormatting) {
      const formatsRegex = TranscriptParser.FORMATTING_TAGS.join("|");
      const regex = `<\\/?(?!\\/?(`+ formatsRegex + `)\\b).*?\\b>`;
      return new RegExp(regex, "i");
    } else {
      return new RegExp("<[^>]*>", "i");
    }
  }

  parse(plainData: string): TranscriptItem[] {
    const parser = new XMLParser({ ignoreAttributes: false });
    const result = parser.parse(plainData);

    if (!result.transcript || !result.transcript.text) {
      return [];
    }

    // Ensure we have an array of text elements
    const textElements = Array.isArray(result.transcript.text)
      ? result.transcript.text
      : [result.transcript.text];

    return textElements.filter(element => element['#text']).map(element => {
      return {
        text: this.htmlRegex.test(element['#text'])
          ? element['#text'].replace(this.htmlRegex, "")
          : element['#text'],
        start: parseFloat(element['@_start']),
        duration: parseFloat(element['@_dur'] || "0.0")
      };
    });
  }
}
