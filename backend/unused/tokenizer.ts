import mecab from 'mecab-ko-ts';
import kuromoji from 'kuromoji';

async function analyzeSentence(sentence: string): Promise<{ surface: string; features: string[] }[]> {
  try {
    const result = await mecab.posSync(sentence); // 형태소 분석
    return result.map(item => ({
      surface: item[0], // 형태소 단어
      features: item[1], // 품사 등 추가 정보
    }));
  } catch (error) {
    console.error("형태소 분석 중 오류 발생:", error);
    throw error;
  }
}

// Tokenizer 빌드 (비동기 작업)
const getTokenizer = (): Promise<kuromoji.Tokenizer<kuromoji.IpadicFeatures>> => {
  return new Promise((resolve, reject) => {
    kuromoji.builder({ dicPath: '../node_modules/kuromoji/dict' }).build((err, tokenizer) => {
      if (err) {
        return reject(err);
      }
      resolve(tokenizer);
    });
  });
};

/**
 * 일본어 텍스트를 형태소 분석합니다.
 * @param text 분석할 일본어 텍스트
 * @returns 형태소 분석 결과 배열
 */
async function analyzeJapaneseText(text: string): Promise<kuromoji.IpadicFeatures[]> {
  try {
    const tokenizer = await getTokenizer();
    const tokens = tokenizer.tokenize(text);
    return tokens;
  } catch (error) {
    console.error('형태소 분석 중 오류 발생:', error);
    throw error; // 또는 적절한 오류 처리
  }
}

// 함수 사용 예시
async function exampleUsage() {
  const japaneseText = 'すもももももももものうち';
  try {
    const tokens = await analyzeJapaneseText(japaneseText);
    console.log(`원본 텍스트: ${japaneseText}`);
    console.log('형태소 분석 결과:');
    tokens.forEach(token => {
      console.log({
        surface_form: token.surface_form, // 표층형
        pos: token.pos,                 // 품사
        pos_detail1: token.pos_detail1,   // 품사 세부1
        pos_detail2: token.pos_detail2,   // 품사 세부2
        pos_detail3: token.pos_detail3,   // 품사 세부3
        conjugated_type: token.conjugated_type, // 활용형
        conjugated_form: token.conjugated_form, // 활용 종류
        basic_form: token.basic_form,     // 기본형
        reading: token.reading,         // 읽기
        pronunciation: token.pronunciation // 발음
      });
    });
  } catch (error) {
    console.error('예시 실행 중 오류:', error);
  }
}

// 예시 실행
//exampleUsage();
