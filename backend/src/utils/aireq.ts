import { ChatAnthropic } from "@langchain/anthropic";
import { ChatOpenAI } from "@langchain/openai";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { AIMessage, HumanMessage, SystemMessage } from '@langchain/core/messages';
import dotenv from "dotenv";
import { UsageDB } from "../../db/usage/usagedb.js";

type AIType = 'openai' | 'anthropic' | 'google';

class AIAttachedFile {
  buffer: Buffer;
  fieldname?: string;
  filename?: string;
  mimetype?: string;

  constructor(buffer: Buffer, fieldname?: string, filename?: string, mimetype?: string) {
    this.fieldname = fieldname;
    this.filename = filename;
    this.mimetype = mimetype;
    this.buffer = buffer;
  }
}

// AI 모델 초기화
export const models: { [key: string]: any } = {
  'claude-3-haiku-20240307': {
    type: 'anthropic',
    name: 'claude-3-haiku-20240307',
    chatmodel: ChatAnthropic
  },
  'claude-3.5-sonnet-20240620': {
    type: 'anthropic',
    name: 'claude-3.5-sonnet-20240620',
    chatmodel: ChatAnthropic
  },
  'openai-gpt-3.5-turbo': {
    type: 'openai',
    name: 'openai-gpt-3.5-turbo',
    chatmodel: ChatOpenAI
  },
  'gemini-1.5-pro': {
    type: 'google',
    name: 'gemini-1.5-pro',
    chatmodel: ChatGoogleGenerativeAI
  },
  'gemini-1.5-flash': {
    type: 'google',
    name: 'gemini-1.5-flash',
    chatmodel: ChatGoogleGenerativeAI
  },
  'gemini-1.5-flash-8B': {
    type: 'google',
    name: 'gemini-1.5-flash-8B',
    chatmodel: ChatGoogleGenerativeAI
  },
  'gemini-2.0-flash': {
    type: 'google',
    name: 'gemini-2.0-flash',
    chatmodel: ChatGoogleGenerativeAI
  },
  'gemini-2.5-flash': {
    type: 'google',
    name: 'gemini-2.5-flash',
    chatmodel: ChatGoogleGenerativeAI
  },
  'gemini-flash-lite-latest': {
    type: 'google',
    name: 'gemini-flash-lite-latest',
    chatmodel: ChatGoogleGenerativeAI
  }
}

export async function queryToAI({ model, systemPrompt, prompt, files, prev_messages, chatmode }: {
  model?,
  systemPrompt?: string,
  prompt?: string,
  files?: AIAttachedFile[],
  prev_messages?
  chatmode?
}): Promise<any> {
  const messages: any[] = prev_messages || [];
  if (!model) {
    console.log('디폴트 모델을 사용합니다')
    model = 'gemini-2.0-flash';
  }
  let modelInfo = models[model];
  if (!modelInfo) {
    console.log(model, '모델을 찾을 수 없습니다 디폴트 모델을 사용합니다')
    modelInfo = models['gemini-2.0-flash']
  }
  let apiKey = await UsageDB.getAPIKey(modelInfo.type, modelInfo.name, { preferFree: true })
  console.log(apiKey)
  console.log(process.env.GEMINI_API_KEY)
  apiKey = process.env.GEMINI_API_KEY

  const chatmodel = new modelInfo.chatmodel({
    apiKey: apiKey,
    model: modelInfo.name,
    //temperature: 1.0,
    //maxTokens: 8192
  });
  if (systemPrompt) messages.push(new SystemMessage(systemPrompt));

  if (files && files.length > 0) {
    const content: any[] = [];
    if (prompt) content.push({ type: 'text', text: prompt });
    for (const f of files) {
      content.push({
        type: 'image_url',
        image_url: `data:${f.mimetype};base64,${f.buffer.toString('base64')}`,
        filename: f.filename,
      });
    }
    messages.push(new HumanMessage({ content }));
  } else {
    messages.push(new HumanMessage(prompt || ''));
  }

  const startTime = Date.now()
  const res = await chatmodel.invoke(messages);
  const endTime = Date.now()

  console.log(endTime - startTime + 'ms', res.usage_metadata)

  UsageDB.addTokenUsage(apiKey, modelInfo.name, res.usage_metadata.input_tokens, res.usage_metadata.output_tokens).catch((error) => {
    console.error('Error:', error);
  })

  if (chatmode) {
    messages.push(new AIMessage(res.content))
    return messages;
  } else
    return res
}


export async function aireq(option: {
  rule?: string,
  message?: string,
  model?: string,
  messages?: { role: string, content: string }[]
}) {
  let selectedModel, apiKey

  try {
    if (option?.model) {
      selectedModel = models[option.model as keyof typeof models]
      if (!selectedModel)
        option.model = 'gemini-2.0-flash'
    } else {
      option.model = 'gemini-2.0-flash'
      selectedModel = models['gemini-2.0-flash'];
    }

    let messages = option.messages
    if (!messages) {
      messages = [{ role: "user", content: option.message! }];
      if (option.rule) {
        messages.unshift({ role: "system", content: option.rule });
      }
    }

    switch (selectedModel.type) {
      case 'anthropic':
        apiKey = process.env.ANTHROPIC_API_KEY
        break;
      case 'openai':
        apiKey = process.env.OPENAI_API_KEY
        break;
      case 'google':
        apiKey = process.env.GOOGLE_API_KEY
        break;
      default:
        throw new Error('Invalid model type');
    }

    let model = new selectedModel.chatmodel({
      apiKey: apiKey,
      model: option.model
    })

    const startTime = Date.now()
    const response = await model.invoke(messages);
    const endTime = Date.now()

    console.log(endTime - startTime + 'ms', response.usage_metadata)

    return response.content;
  } catch (error) {
    console.error('Error:', error);
    return null;
  }
}
