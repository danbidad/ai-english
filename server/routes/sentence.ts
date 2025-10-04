import axios from 'axios';
import {models, queryToAI} from "../utils/aireq.js";
import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";


// Fastify 스타일 라우터 등록 함수
async function sentenceRoutes(fastify: FastifyInstance) {
  // 채팅 API 엔드포인트
  fastify.post('/analysis', async (
    request: FastifyRequest<{ Body: { text: string } }>,
    reply: FastifyReply
  ) => {
    try {
      const { text } = request.body || {};
      const response = await queryToAI({prompt: text, systemPrompt: `
주어진 영어문장을 앞에서 부터 뒤로 순차적으로 의미있는 단위로 쪼개시오.
그리고 쪼갠 블럭들이 순서대로 등장할때마다 문장의 전체 해석내용이 어떻게 바뀌고
현재가 어떤 상태이며
앞으로 무엇이 예측되는지를 설명하시오
아래에서 설명하는 json 포맷으로 출력하시오.

[ {
"text_block": "텍스트 블럭",
"block_translation": "이 텍스트 블럭의 번역",
"blocks_translation": "현재까지 공개된 텍스트 블럭들만 가지고 문장으로써 번역",
"state": "현재 문법적으로 어떤 상태인지 설명",
"predict_state": "앞으로 문법적으로 무엇이 예측되는지 설명",
"predict_state2": "앞으로 어떤 내용이 이어질지 예측",
},
]  
      `, model: 'gemini-flash-lite-latest'})
      return reply.send({ response: response.content });
    } catch (error) {
      console.error('Error:', error);
      return reply.code(500).send({ error: '서버 오류가 발생했습니다.' });
    }
  });
}

export default sentenceRoutes;
