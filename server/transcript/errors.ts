import { formatWatchUrl } from './settings.js';

export class CouldNotRetrieveTranscript extends Error {
  protected static ERROR_MESSAGE = "\nCould not retrieve a transcript for the video {video_url}!";
  protected static CAUSE_MESSAGE_INTRO = " This is most likely caused by:\n\n{cause}";
  protected static CAUSE_MESSAGE = "";
  protected static GITHUB_REFERRAL = (
    "\n\nIf you are sure that the described cause is not responsible for this error " +
    "and that a transcript should be retrievable, please create an issue at " +
    "https://github.com/jdepoix/youtube-transcript-api/issues. " +
    "Please add which version of youtube_transcript_api you are using " +
    "and provide the information needed to replicate the error. " +
    "Also make sure that there are no open issues which already describe your problem!"
  );

  videoId: string;

  constructor(videoId: string) {
    super();
    this.videoId = videoId;
    this.message = this.buildErrorMessage();
    this.name = this.constructor.name;
  }

  protected buildErrorMessage(): string {
    const cause = this.cause;
    let errorMessage = (CouldNotRetrieveTranscript.ERROR_MESSAGE as string).replace(
      '{video_url}',
      formatWatchUrl(this.videoId)
    );

    if (cause) {
      errorMessage += (CouldNotRetrieveTranscript.CAUSE_MESSAGE_INTRO as string).replace(
        '{cause}',
        cause
      ) + CouldNotRetrieveTranscript.GITHUB_REFERRAL;
    }

    return errorMessage;
  }

  protected get cause(): string {
    return (this.constructor as typeof CouldNotRetrieveTranscript).CAUSE_MESSAGE;
  }
}

export class YouTubeRequestFailed extends CouldNotRetrieveTranscript {
  protected static CAUSE_MESSAGE = "Request to YouTube failed: {reason}";
  reason: string;

  constructor(videoId: string, httpError: Error) {
    super(videoId);
    this.reason = httpError.toString();
  }

  protected get cause(): string {
    return (YouTubeRequestFailed.CAUSE_MESSAGE as string).replace(
      '{reason}',
      this.reason
    );
  }
}

export class VideoUnavailable extends CouldNotRetrieveTranscript {
  protected static CAUSE_MESSAGE = "The video is no longer available";
}

export class InvalidVideoId extends CouldNotRetrieveTranscript {
  protected static CAUSE_MESSAGE = (
    "You provided an invalid video id. Make sure you are using the video id and NOT the url!\n\n" +
    'Do NOT run: `YouTubeTranscriptApi.get_transcript("https://www.youtube.com/watch?v=1234")`\n' +
    'Instead run: `YouTubeTranscriptApi.get_transcript("1234")`'
  );
}

export class TooManyRequests extends CouldNotRetrieveTranscript {
  protected static CAUSE_MESSAGE = (
    "YouTube is receiving too many requests from this IP and now requires solving a captcha to continue. " +
    "One of the following things can be done to work around this:\n\
        - Manually solve the captcha in a browser and export the cookie. " +
    "Read here how to use that cookie with " +
    "youtube-transcript-api: https://github.com/jdepoix/youtube-transcript-api#cookies\n\
        - Use a different IP address\n\
        - Wait until the ban on your IP has been lifted"
  );
}

export class TranscriptsDisabled extends CouldNotRetrieveTranscript {
  protected static CAUSE_MESSAGE = "Subtitles are disabled for this video";
}

export class NoTranscriptAvailable extends CouldNotRetrieveTranscript {
  protected static CAUSE_MESSAGE = "No transcripts are available for this video";
}

export class NotTranslatable extends CouldNotRetrieveTranscript {
  protected static CAUSE_MESSAGE = "The requested language is not translatable";
}

export class TranslationLanguageNotAvailable extends CouldNotRetrieveTranscript {
  protected static CAUSE_MESSAGE = "The requested translation language is not available";
}

export class CookiePathInvalid extends CouldNotRetrieveTranscript {
  protected static CAUSE_MESSAGE = "The provided cookie file was unable to be loaded";
}

export class CookiesInvalid extends CouldNotRetrieveTranscript {
  protected static CAUSE_MESSAGE = "The cookies provided are not valid (may have expired)";
}

export class FailedToCreateConsentCookie extends CouldNotRetrieveTranscript {
  protected static CAUSE_MESSAGE = "Failed to automatically give consent to saving cookies";
}

export class NoTranscriptFound extends CouldNotRetrieveTranscript {
  protected static CAUSE_MESSAGE = (
    "No transcripts were found for any of the requested language codes: {requested_language_codes}\n\n" +
    "{transcript_data}"
  );

  private requestedLanguageCodes: string[];
  private transcriptData: any;

  constructor(videoId: string, requestedLanguageCodes: string[], transcriptData: any) {
    super(videoId);
    this.requestedLanguageCodes = requestedLanguageCodes;
    this.transcriptData = transcriptData;
  }

  protected get cause(): string {
    return (NoTranscriptFound.CAUSE_MESSAGE as string)
      .replace('{requested_language_codes}', this.requestedLanguageCodes?.toString())
      .replace('{transcript_data}', String(this.transcriptData));
  }
}
