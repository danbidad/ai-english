import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// ESM 환경에서는 __dirname이 기본적으로 제공되지 않으므로, import.meta.url을 사용하여 현재 파일의 경로를 얻어옵니다.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 탐색을 시작할 폴더 경로 (프로젝트의 'public' 폴더)
const searchDir = path.resolve(__dirname, '..');

// 결과를 저장할 파일 경로
const outputFile = path.resolve(__dirname, '../tailwind/tailwind_temp.css');

// <style type="text/tailwindcss"> 태그의 내용을 찾기 위한 정규식
const regex = /<style type="text\/tailwindcss">([\s\S]*?)<\/style>/g;

/**
 * 지정된 디렉토리에서 재귀적으로 모든 HTML 파일의 경로를 찾습니다.
 * @param {string} dir - 탐색할 디렉토리 경로
 * @returns {Promise<string[]>} HTML 파일 경로의 배열
 */
async function findHtmlFiles(dir) {
  let htmlFiles = [];
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        // 하위 디렉토리인 경우 재귀적으로 탐색
        htmlFiles = htmlFiles.concat(await findHtmlFiles(fullPath));
      } else if (entry.isFile() && (entry.name.endsWith('.html') || entry.name.endsWith('.js'))) {
        // HTML 파일인 경우 배열에 추가
        htmlFiles.push(fullPath);
      }
    }
  } catch (error) {
    // 디렉토리가 존재하지 않는 등 오류 발생 시 콘솔에 로그를 남기고 빈 배열 반환
    console.error(`Error reading directory ${dir}:`, error);
  }
  return htmlFiles;
}

/**
 * HTML 파일에서 스타일을 추출하여 CSS 파일에 저장하는 메인 함수
 */
async function extractStyles() {
  try {
    // CSS 파일이 속한 디렉토리가 존재하는지 확인하고, 없으면 생성
    const outputDir = path.dirname(outputFile);
    await fs.mkdir(outputDir, { recursive: true });

    // 실행 시마다 output 파일을 초기화하여 중복 작성을 방지
    await fs.writeFile(outputFile, '');

    console.log(`Searching for HTML files in: ${searchDir}`);
    const htmlFiles = await findHtmlFiles(searchDir);

    if (htmlFiles.length === 0) {
      console.log('No HTML files found.');
      return;
    }

    console.log(`Found ${htmlFiles.length} HTML file(s).`);

    let allStyles = '';

    for (const file of htmlFiles) {
      const content = await fs.readFile(file, 'utf8');
      let match;
      // 정규식을 사용하여 파일 내용에서 모든 스타일 블록을 찾음
      while ((match = regex.exec(content)) !== null) {
        const styleContent = match[1].trim();
        if (styleContent) {
          allStyles += styleContent + '\n\n';
        }
      }
    }

    if (allStyles) {
      // 추출한 모든 스타일을 파일에 추가
      await fs.appendFile(outputFile, allStyles);
      console.log(`Successfully extracted styles to ${outputFile}`);
    } else {
      console.log('No <style type="text/tailwindcss"> blocks found in any HTML files.');
    }

  } catch (error) {
    console.error('An error occurred during style extraction:', error);
  }
}

// 스크립트 실행
extractStyles();
