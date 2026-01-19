import axios from 'axios';
import { models, queryToAI } from "../utils/aireq.js";
import { DallEAPIWrapper } from "@langchain/openai";
import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

console.log(process.env.ANTHROPIC_API_KEY);

// Fastify 스타일 라우터 등록 함수
async function aiRoutes(fastify: FastifyInstance) {
  // 채팅 API 엔드포인트
  fastify.post('/chat', async (
    request: FastifyRequest<{ Body: { message: string; rule?: string; model?: string } }>,
    reply: FastifyReply
  ) => {
    try {
      const { message, rule, model } = request.body || {} as any;
      const response = await queryToAI({ prompt: message, systemPrompt: rule, model: model })
      return reply.send({ response: response.content });
    } catch (error) {
      console.error('Error:', error);
      return reply.code(500).send({ error: '서버 오류가 발생했습니다.' });
    }
  });

  // 이미지 생성 API 엔드포인트 - DALL-E
  fastify.post('/generate-image', async (
    request: FastifyRequest<{ Body: { message: string; rule?: string } }>,
    reply: FastifyReply
  ) => {
    try {
      const { message } = request.body || {} as any;
      const dalleModel = new DallEAPIWrapper({
        apiKey: process.env.OPENAI_API_KEY,
        modelName: "dall-e-3",
        n: 1,
      });

      const imageUrl = await dalleModel.invoke(message);
      return reply.send({
        imageUrl,
        message: '이미지가 생성되었습니다.'
      });
    } catch (error) {
      console.error('Error:', error);
      return reply.code(500).send({ error: '이미지 생성 중 오류가 발생했습니다.' });
    }
  });

  // Runware를 사용한 이미지 생성 엔드포인트
  fastify.post('/runware-generate-image', async (
    request: FastifyRequest<{ Body: { message: string; rule?: string } }>,
    reply: FastifyReply
  ) => {
    try {
      const { message } = request.body || {} as any;

      const response = await axios.post('https://api.runware.ai/v1', [
        {
          taskType: "authentication",
          apiKey: process.env.RUNWARE_API_KEY,
        },
        {
          taskType: "imageInference",
          taskUUID: "39d7207a-87ef-4c93-8082-1433f9c1dc97",
          positivePrompt: message,
          width: 512,
          height: 512,
          modelId: "civitai:102438@133677",
          numberResults: 1,
          outputType: 'URL',
          outputFormat: 'WEBP',
        },
      ], {
        headers: { 'Content-Type': 'application/json' },
      });

      const imageUrl = response.data.data[0].imageURL;
      return reply.send({
        imageUrl,
        message: 'Runware를 사용하여 이미지가 생성되었습니다.'
      });
    } catch (error) {
      console.error('Error:', error);
      return reply.code(500).send({ error: 'Runware를 사용하여 이미지 생성 중 오류가 발생했습니다.' });
    }
  });
}

export default aiRoutes;
