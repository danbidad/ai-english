import {Router} from 'express';
import {getSubtitles, getVideoDetails} from './utils/youtube_script.js';
import {aireq} from './ai.js';
import * as fs from 'fs';
import * as path from "path";
import axios from 'axios';
import {JSDOM} from 'jsdom';
import {__dirname} from './utils/filename.js';
import {YouTubeTranscriptApi} from "./transcript/index.js";
import { cachedFetch } from "./utils/cached_fetch.js";

export const youtubeRouter = Router(); // /youtube에 연결 예정

// 자막 가져오기 API 엔드포인트
youtubeRouter.get('/subtitles_list/:videoId', endpoint_GetSubTitlesList)
youtubeRouter.get('/subtitles/url/(.*)', endpoint_GetSubTitles)
youtubeRouter.get('/arranged_subtitles/:videoId', endpoint_GetArrangedSubTitles)
youtubeRouter.get('/arranged_subtitles/:videoId/:lang', endpoint_GetArrangedSubTitles)
youtubeRouter.get('/search', endpoint_GetSearch)
youtubeRouter.get('/info/:videoId', endpoint_GetVideoInfo)
youtubeRouter.get('/info/:videoId/:lang', endpoint_GetVideoInfo)

async function endpoint_GetSubTitlesList(req, res) {
  try {
    const {videoId} = req.params;
    const list = await YouTubeTranscriptApi.listTranscripts(videoId)
    console.log(list)
    res.json({
      generated: list?.generatedTranscripts ? Object.fromEntries(Object.entries(list.generatedTranscripts).map(([key, value]) => [
        key,
        value.url
      ])) : {},
      manually: list?.manuallyCreatedTranscripts ? Object.fromEntries(Object.entries(list.manuallyCreatedTranscripts).map(([key, value]) => [
        key,
        value.url
      ])) : {},
    })
  } catch (error) {
    console.error('Error:', error)
    res.status(500).json({error: '유튜브 자막 목록 가져오는 중 오류가 발생했습니다.'})
  }
}

async function endpoint_GetSearch(req, res) {
  try {
    const query = req.query.q;
    if (!query) {
      return res.status(400).json({error: '검색어를 입력해주세요.'});
    }

    // 유튜브 검색 결과 페이지 URL 생성
    const maxResults = parseInt(req.query.maxResults as string, 10) || 20; // Default to 20 if not provided
    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(String(query))}&max_results=${maxResults}`;

    // 유튜브 검색 페이지 가져오기
    const response = await axios.get(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept-Language': req.query.loc ?? 'en-US'
      }
    });

    // 응답 HTML 파싱하기
    const dom = new JSDOM(response.data);
    const document = dom.window.document;

    // 검색 결과에서 데이터 추출하기
    const results = extractSearchResults(response.data);

    res.json({
      results,
      message: '유튜브 검색 결과를 성공적으로 가져왔습니다.'
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({error: '유튜브 검색 중 오류가 발생했습니다.'});
  }

  function extractSearchResults(html) {
    const videoPattern =
      /{"videoRenderer":{"videoId":"([^"]+)".*?"title":{"runs":\[{"text":"([^"]+)"}].*?"publishedTimeText":{"simpleText":"([^"]+)".*?{"accessibilityData":{"label":"([^"]+)".*?"viewCountText":{"simpleText":"([^"]+)"}.*?"ownerText":{"runs":\[{"text":"([^"]+)"/g

    const results: any[] = [];
    let match;

    // 정규식으로 동영상 정보 추출
    while ((match = videoPattern.exec(html)) !== null) {
      results.push({
        videoId: match[1],
        title: match[2],
        publicAt: match[3],
        length: match[4],
        channelName: match[6],
        viewCount: match[5],
        thumbnail: `https://i.ytimg.com/vi/${match[1]}/hqdefault.jpg`,
        url: `https://www.youtube.com/watch?v=${match[1]}`
      });

      // 결과 개수 제한
      //if ( results.length >= 20 ) break;
    }

    return results;
  }
}

async function endpoint_GetVideoInfo(req, res) {
  try {
    const {videoId, lang, url} = req.params;
    const details = await getVideoDetails({ videoId, lang });
    res.json(details);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({message: '자막을 가져오는 중 오류가 발생했습니다.', error});
  }
}

async function endpoint_GetSubTitles(req, res) {
  try {
    const apiPath = req.path.replace('/', '');
    const queryString = req.url.split('?')[1] || '';
    let targetUrl = `${apiPath}${queryString ? '?' + queryString : ''}`;
    let targetUrl2 = req.params[0]

    const subtitles = await getSubtitles(targetUrl2)
    res.json(subtitles);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({message: '자막을 가져오는 중 오류가 발생했습니다.', error});
  }
}

async function endpoint_GetArrangedSubTitles(req, res) {
  try {
    const {videoId, lang} = req.params;
    const details = await getVideoDetails({
      videoId: videoId,
      lang: lang ?? 'en'
    });

    if ( !details.subtitles )
      return

    let combinedText = details.subtitles
      .map((subtitle, index) => subtitle.text)
      .join('\r\n').replace(/\[.*?]/g, '');

    const formattedDate = new Date().toISOString().replace(/[:.-]/g, '').slice(0, 15); // YYYYMMDDTHHMMSS 형식

    // fs.writeFile(path.join(path.resolve(__dirname, '../result'), details.title.replace(/[\\/:*?"<>|]/g, '_') + ".1.txt"), combinedText, 'utf8', (err) => {
    //     if ( err ) {
    //         console.error('파일 저장 중 오류가 발생했습니다:', err);
    //     }
    // });

    const result = await getRearrangedSubtitles(combinedText);

    // 파일 이름에서 허용되지 않는 문자 제거 또는 대체
    fs.writeFile(path.join(path.resolve(__dirname, '../result'), details.title.replace(/[\\/:*?"<>|]/g, '_') + ".2.txt"), result, 'utf8', (err) => {
      if (err) {
        console.error('파일 저장 중 오류가 발생했습니다:', err);
      }
    });

    const subtitles = await makeNewSubtitle(details.subtitles as ISubtitle[], result);

    res.json({
      subtitles: subtitles,
      message: '자막을 성공적으로 가져왔습니다.'
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({message: '자막을 가져오는 중 오류가 발생했습니다.', error});
  }
}

async function getRearrangedSubtitles(orgSubtitlesCombinedText: string) {
  let messages = [{
    role: "system",
    content: `당신은 자막을 분석하는 전문가입니다.
주어진 자막은 문장의 시작과 끝이 섞여 있습니다.
문장의 시작과 끝을 찾아내어 한줄에 하나의 문장씩만 나오도록 단어들을 다시 정렬해주세요.
번역은 필요없습니다.
출력이 완료되면 마지막에 <<END>>라는 표시를 남기세요.
만약 output token이 모자라서 출력이 중간에 끊긴다면 이어서 내가 continue라고 말하면 정확하게 끊긴 부분에 뒤이어 계속해주세요.`
  }, {
    role: "user",
    content: orgSubtitlesCombinedText
  }];

  console.log(orgSubtitlesCombinedText)
  let completeContent = '';

  for (let isEndFound = false, tryCount = 1; !isEndFound && tryCount <= 3; tryCount++) {
    const result = await aireq({model: 'gemini-1.5-flash-8B', messages}) as string;
    console.log(result)

    console.log(`------------------------ ${tryCount} ---------------------------`)
    completeContent += result;

    if (result.includes('<<END>>')) {
      isEndFound = true;
      break;
    } else {
      // If <<END>> is not found, prepare the next message to continue
      messages.push({role: 'assistant', content: result}, {role: 'user', content: 'continue'});
    }
  }

  // Process the completeContent as needed
  //console.log(completeContent);
  return completeContent.replace('<<END>>', '').trim()
}

export function findDifferences(originalTokens: string[], modifiedTokens: string[]) {
  interface IWordDifference {
    type: 'added' | 'removed' | 'modified';
    originalWord?: string;
    newWord?: string;
    originalPosition: number;
    newPosition: number;
  }

  const differences: IWordDifference[] = [];
  const markerPos: number[] = [];
  let i = 0; // 원본 토큰 인덱스
  let j = 0; // 수정된 토큰 인덱스

  while (i < originalTokens.length || j < modifiedTokens.length) {
    let orgWord = getOrgWord()
    let modWord = getModWord()

    // 두 토큰이 모두 존재하고 같은 경우
    if (i < originalTokens.length && j < modifiedTokens.length && orgWord === modWord) {
      i++;
      j++;
      continue;
    }

    // 앞으로 최대 5개의 토큰을 미리 보기
    const lookAhead = 5;
    let foundMatch = false;

    // 원본 토큰이 나중에 나타나는지 확인 (삭제된 경우)
    for (let k = 1; k <= lookAhead && j + k < modifiedTokens.length; k++) {
      if (i < originalTokens.length && orgWord === refNextWord('mod', k).word) {
        // 중간에 추가된 토큰들 기록
        for (let l = 0; l < k; l++) {
          differences.push({
            type: 'added',
            newWord: refNextWord('mod', l).word,
            originalPosition: i,
            newPosition: j + refNextWord('mod', l).distance
          });
        }
        j += k;
        foundMatch = true;
        break;
      }
    }

    if (!foundMatch) {
      // 수정된 토큰이 나중에 나타나는지 확인 (추가된 경우)
      for (let k = 1; k <= lookAhead && i + k < originalTokens.length; k++) {
        if (j < modifiedTokens.length &&
          refNextWord('org', k).word === modifiedTokens[j].toLowerCase()) {
          // 중간에 삭제된 토큰들 기록
          for (let l = 0; l < k; l++) {
            differences.push({
              type: 'removed',
              originalWord: refNextWord('org', l).word,
              originalPosition: i + refNextWord('org', l).distance,
              newPosition: j
            });
          }
          refNextWord('org', k, true)
          foundMatch = true;
          break;
        }
      }
    }

    // 매칭되는 토큰을 찾지 못한 경우 (수정된 경우)
    if (!foundMatch) {
      if (i < originalTokens.length && j < modifiedTokens.length) {
        differences.push({
          type: 'modified',
          originalWord: originalTokens[i],
          newWord: modifiedTokens[j],
          originalPosition: i,
          newPosition: j
        });
        i++;
        j++;
      } else if (i < originalTokens.length) {
        // 원본에만 남은 토큰이 있는 경우
        differences.push({
          type: 'removed',
          originalWord: originalTokens[i],
          originalPosition: i,
          newPosition: j
        });
        i++;
      } else {
        // 수정본에만 남은 토큰이 있는 경우
        differences.push({
          type: 'added',
          newWord: modifiedTokens[j],
          originalPosition: i,
          newPosition: j
        });
        j++;
      }
    }
  }

  let finalTokens = modifiedTokens.slice() // copy

  for (let i = markerPos.length - 1; i >= 0; i--) {
    finalTokens.splice(markerPos[i], 0, `{${i}}`)
  }

  return finalTokens


  function getOrgWord() {
    // 만약 다음번 word가 마커{}인 경우에는 정상 단어가 나올때까지 계속 스킵한다.
    for (; i < originalTokens.length && originalTokens[i] == '{}'; i++)
      // {}이 등장했을때 ModWord쪽의 위치를 기록해둔다 (나중에 ModWord쪽에 {}를 삽입하기 위해서다}
      markerPos.push(j);

    // 순수하게 영문자만 비교하기 위해 모든 기호를 제거한다
    if (i < originalTokens.length) return originalTokens[i].toLowerCase().replace(/[.,!?\-%$]/g, '');
    else return '';
  }

  function getModWord() {
    // 만약 다음번 word가 마커<>인 경우에는 정상 단어가 나올때까지 계속 스킵한다.
    for (; j < modifiedTokens.length && modifiedTokens[j] == '<>'; j++) ;
    // 순수하게 영문자만 비교하기 위해 모든 기호를 제거한다
    if (j < modifiedTokens.length) return modifiedTokens[j].toLowerCase().replace(/[.,!?\-%$]/g, '');
    else return '';
  };

  // i와 j값은 실제로 바꾸지 않고 현재 i값 또는 j값을 기준으로 앞으로 단어를 탐색한다 (뒤로는 탐색 안함)
  function refNextWord(tokens_type: 'org' | 'mod', cnt: number, push_marker = false) {
    let tokens = originalTokens;
    let idx = i;
    let line_marker = '{}'

    console.assert(tokens_type == 'org' || tokens_type == 'mod');
    console.assert(cnt >= 0);

    if (tokens_type == 'mod') {
      tokens = modifiedTokens;
      line_marker = '<>'
      idx = j
    }

    // cnt 갯수만큼 단어를 탐색한다
    for (let next = 0; next < cnt; next++) {
      // 마커가 나오면 스킵한다
      do {
        // i또는 j는 절대 마커를 가르키지 않는다. 그러므로 인덱스 값부터 먼저 늘린다
        idx++;
        // 마커 기록 명령이 있으면 마커를 만날때마다 위치를 기록해둔다
        if (tokens_type == 'org' && push_marker && tokens[idx] == '{}') markerPos.push(j)
      } while (idx < tokens.length && tokens[idx] == line_marker)
    }

    // 마커 기록 명령이 있고 현재 토큰 타입이 org인 경우에는 i값을 실제로 전진시킨다
    if (tokens_type == 'org' && push_marker) i = idx

    if (idx < tokens.length)
      return {
        word: tokens[idx].toLowerCase().replace(/[.,!?\-%$]/g, ''),
        distance: tokens_type == 'org' ? idx - i : idx - j
      };
    else
      return {
        word: '',
        distance: -1
      };
  }
}

interface ISubtitle {
  text: string;
  start: string;
  dur: string;
}


async function makeNewSubtitle(orgSubtitles: ISubtitle[], arranged_text: string) {
  // 자막 텍스트만 추출하여 하나의 문자열로 결합
  let orgTokens = orgSubtitles.map((subtitle, index) => ('{} ' + subtitle.text)).join(' ').split(/[\s]+/)
  let arrangedTokens = arranged_text.split('\n').map((line, index) => ('<> ' + line)).join(' ').split(/[!?\s]+/)

  let finalTokens = findDifferences(orgTokens, arrangedTokens)

  let final = finalTokens.join(' ').trim().replace(/\<\>/g, '\r\n').trim().split('\r\n')
  let subtitles: ISubtitle[] = [];

  for (let idx = 0; idx < final.length; idx++) {
    // Extract the text content by removing any {number} markers
    const textWithoutMarkers = final[idx].replace(/\{\d+\}/g, '').trim();
    let startTime = '';
    let dur = '';

    // 내용이 있으면
    if (textWithoutMarkers) {
      // 맨처음부터 마커로 시작하면 해당 자막의 시작 위치는 해당 마커로 결정된다
      if (final[idx].trim().charAt(0) == '{') {
        const match = final[idx].match(/\{(\d+)\}/g);

        if (match) {
          // Get the last {number}, extract the number, and use it as the index for orgSubtitles
          const lastMarker = match[0];
          const index = parseInt(lastMarker.replace(/\{|\}/g, ''), 10);

          // Retrieve the corresponding start time from orgSubtitles
          if (!isNaN(index) && orgSubtitles[index]) {
            startTime = orgSubtitles[index].start;
            dur = orgSubtitles[index].dur;
          }
        }
      } else {
        // 마커로 시작하지 않는 경우에는 이전의 마지막 마커를 찾아서 해당 마커를 자신의 시작 위치로 한다

        // Find the last {number} in the previous line of `final` to retrieve the start time
        const previousLine = (final[idx - 2] || '') + (final[idx - 1] || '');
        const nextLine = (final[idx + 1] || '') + (final[idx + 2] || '');
        const match = previousLine.match(/\{(\d+)\}/g);

        if (match) {
          // Get the last {number}, extract the number, and use it as the index for orgSubtitles
          const lastMarker = match[match.length - 1];
          const index = parseInt(lastMarker.replace(/\{|\}/g, ''), 10);

          // Retrieve the corresponding start time from orgSubtitles
          if (!isNaN(index) && orgSubtitles[index]) {
            startTime = orgSubtitles[index].start;
            dur = orgSubtitles[index].dur;
          }
        } else {
          // 만약 이전 라인들에서 마커를 찾을 수 없다면?
          console.log(final[idx - 3])
          console.log(final[idx - 2])
          console.log(final[idx - 1])
          console.log(final[idx])
          throw new Error('Cannot find the previous marker');
        }
      }

      // 자막의 끝나는 시간도 새로 계산한다
      const currentLineMarkers = final[idx].match(/\{(\d+)\}/g) || [];
      const nextLineMarkers = final[idx + 1]?.match(/\{(\d+)\}/g) || [];

      if (currentLineMarkers.length > 0) {
        const lastMarkerInCurrentLine = currentLineMarkers[currentLineMarkers.length - 1];
        const lastMarkerIndex = parseInt(lastMarkerInCurrentLine.replace(/\{|\}/g, ''), 10);

        if (!isNaN(lastMarkerIndex) && orgSubtitles[lastMarkerIndex]) {
          const lastMarkerEndTime = calculateEndTime(orgSubtitles[lastMarkerIndex].start, orgSubtitles[lastMarkerIndex].dur);

          if (nextLineMarkers.length > 0) {
            const firstMarkerInNextLine = nextLineMarkers[0]!;
            const firstMarkerIndex = parseInt(firstMarkerInNextLine.replace(/\{|\}/g, ''), 10);

            if (!isNaN(firstMarkerIndex) && orgSubtitles[firstMarkerIndex]) {
              const nextMarkerStartTime = orgSubtitles[firstMarkerIndex].start;
              dur = calculateDuration(lastMarkerEndTime, nextMarkerStartTime);
            }
          } else {
            // If there is no next line, use the duration of the last marker in the current line
            dur = orgSubtitles[lastMarkerIndex].dur;
          }
        }
      }

      // Add the processed subtitle to the subtitles array
      subtitles.push({
        text: textWithoutMarkers,
        start: startTime,
        dur: dur
      });
    }
  }

  console.log(final)
  return subtitles;

  function parseTime(time: string): Date | null {
    const timeParts = time.split('.').map(Number);
    if (timeParts.length === 3) {
      const [hours, minutes, seconds] = timeParts;
      return new Date(1970, 0, 1, hours, minutes, seconds, 0);
    } else {
      const [minutes, seconds] = timeParts;
      return new Date(1970, 0, 1, 0, minutes, seconds, 0);
    }
    return null;
  }

  function calculateEndTime(start: string, dur: string) {
    const startTime = parseTime(start);
    const duration = parseTime(dur);

    if (!startTime || !duration) {
      throw new Error('Invalid start or duration format');
    }

    const endTime = new Date(startTime.getTime() + duration.getTime());
    return formatTime(endTime);

    function formatTime(date: Date): string {
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const seconds = String(date.getSeconds()).padStart(2, '0');
      return `${hours}:${minutes}:${seconds}`;
    }
  }

  function calculateDuration(lastMarkerEndTime: string, nextMarkerStartTime: string) {
    return "";
    const start = parseTime(lastMarkerEndTime);
    const end = parseTime(nextMarkerStartTime);

    if (!start || !end) {
      throw new Error('Invalid marker times provided for duration calculation');
    }

    const durationMilliseconds = end!.getTime() - start!.getTime();

    if (durationMilliseconds < 0) {
      throw new Error('Invalid duration: End time is earlier than start time');
    }

    const durationSeconds = Math.floor((durationMilliseconds / 1000) % 60);
    const durationMinutes = Math.floor((durationMilliseconds / (1000 * 60)) % 60);
    const durationHours = Math.floor(durationMilliseconds / (1000 * 60 * 60));

    return `${durationHours.toString().padStart(2, '0')}:${durationMinutes.toString().padStart(2, '0')}:${durationSeconds.toString().padStart(2, '0')}`;
  }
}


export default youtubeRouter;


/*
import express, { Request, Response } from 'express';
import axios from 'axios';

const proxyRouter = express.Router();

// URL을 파라미터로 받아서 해당 URL로 GET 요청을 보내고 데이터를 그대로 반환하는 엔드포인트
proxyRouter.get('/proxy', async (req: Request, res: Response) => {
  try {
    const targetUrl = req.query.url as string;

    // URL 파라미터가 없는 경우 에러 반환
    if (!targetUrl) {
      return res.status(400).json({
        error: 'URL 파라미터가 필요합니다. ?url=<대상_URL> 형식으로 요청해주세요.'
      });
    }

    // URL 유효성 검사
    try {
      new URL(targetUrl);
    } catch (error) {
      return res.status(400).json({
        error: '유효하지 않은 URL입니다.'
      });
    }

    // 대상 URL로 GET 요청 보내기
    const response = await axios.get(targetUrl, {
      timeout: 10000, // 10초 타임아웃
      headers: {
        'User-Agent': 'ProxyRouter/1.0',
        'Content-Type': req.query.contentType as string
      }
    });

    // 원본 응답의 헤더 중 일부를 클라이언트에 전달
    if (response.headers['content-type']) {
      res.set('Content-Type', response.headers['content-type']);
    }

    // 데이터 그대로 반환
    res.status(response.status).send(response.data);

  } catch (error: any) {
    console.error('프록시 요청 오류:', error.message);

    if (error.response) {
      // 대상 서버에서 오류 응답이 온 경우
      res.status(error.response.status).json({
        error: '대상 서버 오류',
        message: error.response.data || error.message
      });
    } else if (error.code === 'ECONNABORTED') {
      // 타임아웃 오류
      res.status(408).json({
        error: '요청 타임아웃',
        message: '대상 서버 응답 시간이 초과되었습니다.'
      });
    } else {
      // 기타 네트워크 오류
      res.status(500).json({
        error: '프록시 요청 실패',
        message: error.message
      });
    }
  }
});

export default proxyRouter;

 */
