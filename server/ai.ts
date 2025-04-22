import { ChatAnthropic } from "@langchain/anthropic";
import { OpenAI, DallEAPIWrapper, ChatOpenAI } from "@langchain/openai";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { Router } from 'express';
import axios from 'axios';
import dotenv from "dotenv";
dotenv.config();
console.log(process.env.ANTHROPIC_API_KEY)

export const aiRouter = Router();

// AI 모델 초기화
export const models: { [key: string]: ChatAnthropic | ChatOpenAI | ChatGoogleGenerativeAI } = {
    'claude-3-haiku-20240307': new ChatAnthropic({
        anthropicApiKey: process.env.ANTHROPIC_API_KEY,
        model: "claude-3-haiku-20240307",
        temperature: 1.0,
        maxTokens: 4096
    }),
    'claude-3.5-sonnet-20240620': new ChatAnthropic({
        anthropicApiKey: process.env.ANTHROPIC_API_KEY,
        model: "claude-3-5-sonnet-20240620",
        temperature: 1.0,
        maxTokens: 8192
    }),
    'openai-gpt-3.5-turbo': new ChatOpenAI({
        apiKey: process.env.OPENAI_API_KEY,
        model: "gpt-4o",
        temperature: 1.0,
        maxTokens: 4096,
    }),
    'gemini-1.5-pro': new ChatGoogleGenerativeAI({
        apiKey: process.env.GEMINI_API_KEY,
        model: "gemini-1.5-pro",
        temperature: 1.0,
        maxOutputTokens: 8192
    }),
    'gemini-1.5-flash': new ChatGoogleGenerativeAI({
        apiKey: process.env.GEMINI_API_KEY,
        model: "gemini-1.5-flash",
        temperature: 0.95,
        maxOutputTokens: 8192
    }),
    'gemini-1.5-flash-8B': new ChatGoogleGenerativeAI({
        apiKey: process.env.GEMINI_API_KEY,
        model: "gemini-1.5-flash-8b",
        temperature: 1.0,
        maxOutputTokens: 8192
    }),
    'gemini-2.0-flash': new ChatGoogleGenerativeAI({
        apiKey: process.env.GEMINI_API_KEY,
        model: "gemini-2.0-flash-exp",
        temperature: 1.0,
        maxOutputTokens: 8192
    }),
};

export async function aireq(option: { rule?:string, message?:string, model?:string, messages?:{role:string, content:string}[] }) {
    let selectedModel = models[0] // default

    try {
        if ( option?.model ) {
            selectedModel = models[option.model as keyof typeof models] ?? models[0];
        }

        let messages = option.messages
        if (!messages) {
            messages = [{ role: "user", content: option.message! }];
            if ( option.rule ) {
                messages.unshift({ role: "system", content: option.rule });
            }
        }

        const startTime = Date.now()
        const response = await selectedModel.invoke(messages);
        const endTime = Date.now()

        console.log(endTime - startTime + 'ms', response.usage_metadata)
        return response.content;
    } catch (error) {
        console.error('Error:', error);
        return null;
    }
}

// 채팅 API 엔드포인트
aiRouter.post('/chat', async (req, res) => {
    try {
        const { message, rule, model } = req.body;
        let selectedModel = models[model as keyof typeof models];
        if (!selectedModel) {
            //return res.status(400).json({ error: '유효하지 않은 모델입니다.' });
            selectedModel = models['claude-3-haiku-20240307']
        }

        const messages = [{ role: "system", content: rule }, { role: "user", content: message }];
        const response = await selectedModel.invoke(messages);
        res.json({ response });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: '서버 오류가 발생했습니다.' });
    }
});

// 이미지 생성 API 엔드포인트 - DALL-E
aiRouter.post('/generate-image', async (req, res) => {
    try {
        const { message, rule } = req.body;
        const dalleModel = new DallEAPIWrapper({
            apiKey: process.env.OPENAI_API_KEY,
            modelName: "dall-e-3",
            n: 1
        });

        const imageUrl = await dalleModel.invoke(message);
        res.json({
            imageUrl,
            message: '이미지가 생성되었습니다.'
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: '이미지 생성 중 오류가 발생했습니다.' });
    }
});

// Runware를 사용한 이미지 생성 엔드포인트
aiRouter.post('/runware-generate-image', async (req, res) => {
    try {
        const { message, rule } = req.body;

        const response = await axios.post('https://api.runware.ai/v1', [
            {
                taskType: "authentication",
                apiKey: process.env.RUNWARE_API_KEY
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
            }
        ], {
            headers: { 'Content-Type': 'application/json' }
        });

        const imageUrl = response.data.data[0].imageURL;
        res.json({
            imageUrl,
            message: 'Runware를 사용하여 이미지가 생성되었습니다.'
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Runware를 사용하여 이미지 생성 중 오류가 발생했습니다.' });
    }
});

export default aiRouter;
