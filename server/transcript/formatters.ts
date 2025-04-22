/**
 * Base class for all formatters
 */
export abstract class Formatter {
  /**
   * Format a single transcript
   */
  abstract formatTranscript(transcript: any, options?: any): string;

  /**
   * Format multiple transcripts
   */
  abstract formatTranscripts(transcripts: any[], options?: any): string;
}

/**
 * Formatter for pretty-printing transcripts
 */
export class PrettyPrintFormatter extends Formatter {
  /**
   * Pretty prints a transcript
   *
   * @param transcript The transcript to format
   * @param options Additional formatting options
   * @returns A pretty printed string representation of the transcript
   */
  formatTranscript(transcript: any, options?: any): string {
    return JSON.stringify(transcript, null, 2);
  }

  /**
   * Pretty prints a list of transcripts
   *
   * @param transcripts The transcripts to format
   * @param options Additional formatting options
   * @returns A pretty printed string representation of the transcripts
   */
  formatTranscripts(transcripts: any[], options?: any): string {
    return this.formatTranscript(transcripts, options);
  }
}

/**
 * Formatter for JSON output
 */
export class JSONFormatter extends Formatter {
  /**
   * Converts a transcript into a JSON string
   *
   * @param transcript The transcript to format
   * @param options Additional formatting options
   * @returns A JSON string representation of the transcript
   */
  formatTranscript(transcript: any, options?: any): string {
    return JSON.stringify(transcript, options);
  }

  /**
   * Converts a list of transcripts into a JSON string
   *
   * @param transcripts The transcripts to format
   * @param options Additional formatting options
   * @returns A JSON string representation of the transcripts
   */
  formatTranscripts(transcripts: any[], options?: any): string {
    return this.formatTranscript(transcripts, options);
  }
}

/**
 * Formatter for plain text output
 */
export class TextFormatter extends Formatter {
  /**
   * Converts a transcript into plain text with no timestamps
   *
   * @param transcript The transcript to format
   * @param options Additional formatting options
   * @returns All transcript text lines separated by newline breaks
   */
  formatTranscript(transcript: any, options?: any): string {
    return transcript.map((line: any) => line.text).join("\n");
  }

  /**
   * Converts a list of transcripts into plain text with no timestamps
   *
   * @param transcripts The transcripts to format
   * @param options Additional formatting options
   * @returns All transcript text lines separated by newline breaks
   */
  formatTranscripts(transcripts: any[], options?: any): string {
    return transcripts
      .map(transcript => this.formatTranscript(transcript, options))
      .join("\n\n\n");
  }
}

/**
 * Base class for text-based transcript formats (SRT, WebVTT)
 */
abstract class _TextBasedFormatter extends TextFormatter {
  /**
   * Format a timestamp into the appropriate string representation
   */
  protected abstract _formatTimestamp(hours: number, mins: number, secs: number, ms: number): string;

  /**
   * Format the header of the transcript file
   */
  protected abstract _formatTranscriptHeader(lines: string[]): string;

  /**
   * Format a single transcript line
   */
  protected abstract _formatTranscriptHelper(i: number, timeText: string, line: any): string;

  /**
   * Helper that converts time into a transcript cue timestamp
   *
   * @param time A float representing time in seconds
   * @returns A string formatted as a cue timestamp, 'HH:MM:SS.MS'
   */
  protected _secondsToTimestamp(time: number): string {
    time = parseFloat(time.toString());
    const hours_float = Math.floor(time / 3600);
    const remainder = time % 3600;
    const mins_float = Math.floor(remainder / 60);
    const secs_float = Math.floor(remainder % 60);

    const hours = Math.floor(hours_float);
    const mins = Math.floor(mins_float);
    const secs = Math.floor(secs_float);
    const ms = Math.round((time - Math.floor(time)) * 1000);

    return this._formatTimestamp(hours, mins, secs, ms);
  }

  /**
   * A basic implementation of WEBVTT/SRT formatting
   */
  formatTranscript(transcript: any[], options?: any): string {
    const lines: string[] = [];

    for (let i = 0; i < transcript.length; i++) {
      const line = transcript[i];
      const end = line.start + line.duration;

      let nextStart: number;
      if (i < transcript.length - 1 && transcript[i + 1].start < end) {
        nextStart = transcript[i + 1].start;
      } else {
        nextStart = end;
      }

      const timeText = `${this._secondsToTimestamp(line.start)} --> ${this._secondsToTimestamp(nextStart)}`;
      lines.push(this._formatTranscriptHelper(i, timeText, line));
    }

    return this._formatTranscriptHeader(lines);
  }
}

/**
 * Formatter for SRT subtitle files
 */
export class SRTFormatter extends _TextBasedFormatter {
  protected _formatTimestamp(hours: number, mins: number, secs: number, ms: number): string {
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
  }

  protected _formatTranscriptHeader(lines: string[]): string {
    return lines.join("\n\n") + "\n";
  }

  protected _formatTranscriptHelper(i: number, timeText: string, line: any): string {
    return `${i + 1}\n${timeText}\n${line.text}`;
  }
}

/**
 * Formatter for WebVTT subtitle files
 */
export class WebVTTFormatter extends _TextBasedFormatter {
  protected _formatTimestamp(hours: number, mins: number, secs: number, ms: number): string {
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
  }

  protected _formatTranscriptHeader(lines: string[]): string {
    return "WEBVTT\n\n" + lines.join("\n\n") + "\n";
  }

  protected _formatTranscriptHelper(i: number, timeText: string, line: any): string {
    return `${timeText}\n${line.text}`;
  }
}

/**
 * Factory class for loading formatters
 */
export class FormatterLoader {
  /**
   * Map of formatter types to their constructor functions
   */
  static TYPES: Record<string, new () => Formatter> = {
    "json": JSONFormatter,
    "pretty": PrettyPrintFormatter,
    "text": TextFormatter,
    "webvtt": WebVTTFormatter,
    "srt": SRTFormatter
  };

  /**
   * Error thrown when an unknown formatter type is requested
   */
  static UnknownFormatterType = class extends Error {
    constructor(formatterType: string) {
      super(
        `The format '${formatterType}' is not supported. ` +
        `Choose one of the following formats: ${Object.keys(FormatterLoader.TYPES).join(", ")}`
      );
    }
  };

  /**
   * Loads the Formatter for the given formatter type
   *
   * @param formatterType The type of formatter to load (default: "pretty")
   * @returns A Formatter instance
   */
  load(formatterType: string = "pretty"): Formatter {
    if (!Object.keys(FormatterLoader.TYPES).includes(formatterType)) {
      throw new FormatterLoader.UnknownFormatterType(formatterType);
    }

    const FormatterClass = FormatterLoader.TYPES[formatterType];
    return new FormatterClass();
  }
}
