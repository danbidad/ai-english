import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import {__filename__dirname} from './filename.js';

const BYPASS_MODE=1
const {__filename, __dirname} = __filename__dirname(import.meta.url);

// Default cache directory
const DEFAULT_CACHE_DIR = path.join(__dirname, '..', '.cache');

function getCacheFilePath(url, options?: RequestInit, cacheDir = DEFAULT_CACHE_DIR, is_full_path_name = true) {
  // full패스네임인지 아닌지 '/'가 포함되어 있는지로 판단한다. 최소한 ./로 시작해야 하기 때문이다
  if (is_full_path_name && !cacheDir.includes('/'))
    throw Error('cacheDir is not full path name: ' + cacheDir)

  if (!is_full_path_name)
    cacheDir = path.join(__dirname, '..', cacheDir);

  const todayDir = getTodayCacheDir(cacheDir);
  const filename = generateCacheFilename(url, options);
  const filePath = path.join(todayDir, filename);

  return filePath + '.txt';

  function generateCacheFilename(url, options?: RequestInit) {
    const data = JSON.stringify({url, options});
    return crypto.createHash('md5').update(data).digest('hex');
  }

  function getTodayCacheDir(cacheDir = DEFAULT_CACHE_DIR) {
    const today = new Date().toISOString().split('T')[0]; // Format: YYYY-MM-DD
    const todayDir = path.join(cacheDir, today);

    // Create the directory if it doesn't exist
    if (!fs.existsSync(todayDir)) {
      fs.mkdirSync(todayDir, {recursive: true});
    }

    return todayDir;
  }
}

async function readFromCache(filePath: string) {
  const fileData = await fs.promises.readFile(filePath);

  // Extract contentType from the first 40 bytes
  const contentTypeBuffer = fileData.subarray(0, 40);
  const contentType = contentTypeBuffer.toString().trim();

  // Extract fileSize from the next 10 bytes
  const fileSizeBuffer = fileData.subarray(40, 50);
  const fileSize = parseInt(fileSizeBuffer.toString().trim(), 10);

  // Extract body from the rest of the file
  const body = fileData.subarray(50);

  // Validate file size
  if (body.length !== fileSize) {
    throw new Error(`File size mismatch: ${body.length} !== ${fileSize}`);
  }

  return {contentType, body};
}

function writeToCache(filePath, contentType, body: Buffer) {
  // Prepare contentType to fit in 40 bytes
  const contentTypeBuffer = Buffer.alloc(40);
  contentTypeBuffer.write(contentType);

  // Prepare fileSize to fit in 10 bytes
  const fileSizeBuffer = Buffer.alloc(10);
  fileSizeBuffer.write(body.length.toString());

  // Combine contentType, fileSize, and body
  const fileData = Buffer.concat([contentTypeBuffer, fileSizeBuffer, body]);

  // Write to file
  fs.promises.writeFile(filePath, fileData);
}

export async function cachedFetch(url, options?: RequestInit, cacheDir = DEFAULT_CACHE_DIR, is_full_path_name = true) {
  // Check if the response is cached
  const cacheFilePath = getCacheFilePath(url, options, cacheDir, is_full_path_name);

  if (!BYPASS_MODE && fs.existsSync(cacheFilePath)) {
    // Read from cache
    try {
      const {contentType, body} = await readFromCache(cacheFilePath);
      return <Response>{
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers({
          'content-type': contentType,
        }),
        text: () => Promise.resolve(body.toString('utf-8')),
        json: () => Promise.resolve(JSON.parse(body.toString('utf-8'))),
      };
    } catch (error) {
      try {
        // 캐쉬를 읽는데 뭔가 오류가 발생하면 캐쉬 파일은 즉시 삭제한다
        fs.unlinkSync(cacheFilePath);
      } catch (error) {
        // 캐쉬 파일을 삭제하는데 실패하더라도 아무런 에러도 내지 않는다
      }
    }
  }

  // Fetch from network
  const response = await fetch(url, options);
  const contentType = response.headers.get('content-type') || 'application/octet-stream';
  const contentLength = parseInt(response.headers.get('content-length') || '1', 10);

  if (response.ok && contentLength > 0) {
    // Get the response body as a buffer
    const arrayBuffer = await response.arrayBuffer();
    const body = Buffer.from(arrayBuffer);
    const filePath = getCacheFilePath(url, options)
    writeToCache(filePath, contentType, body);
  }

  return response
}
