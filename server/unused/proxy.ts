import {Request, Response, Router} from 'express';
import axios, {AxiosRequestConfig} from 'axios';

export const proxyRouter = Router();

proxyRouter.all('*', proxyHandler);

async function proxyHandler(req: Request, res: Response) {
  let transparency = req.path.toLowerCase().startsWith('/trans/')

  try {
    const apiPath = transparency ? req.path.replace('/trans/', '') : req.path.replace('/', '');
    const queryString = req.url.split('?')[1] || '';
    const targetUrl: string = `${apiPath}${queryString ? '?' + queryString : ''}`;

    //console.log(targetUrl)

    // 헤더 정리
    const forwardHeaders: Record<string, any> = {...req.headers};
    delete forwardHeaders.host;
    delete forwardHeaders.referer;
    delete forwardHeaders['content-length'];

    // targetUrl을 기반으로 리퍼러 헤더 설정
    const url = new URL(targetUrl);
    forwardHeaders.referer = `${url.protocol}//${url.host}/`;
    //console.log(forwardHeaders)

    const axiosConfig: AxiosRequestConfig = {
      method: req.method as any,
      url: targetUrl,
      headers: transparency ? forwardHeaders : {},
      timeout: 30000,
      validateStatus: () => true,
      // 원시 스트림 데이터 직접 전달
      data: req.method !== 'GET' && req.method !== 'HEAD' ? req.body : undefined,
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
      withCredentials: transparency, // 쿠키 포함하여 요청 보내기
    };

    const response = await axios(axiosConfig);
    const response2 = await fetch(targetUrl)
    const body2 = await response2.text()

    console.log(response.headers, response.data.length)
    console.log(response2.headers, body2.length)

    // 응답 헤더 전달
    const responseHeaders = {...response.headers};
    delete responseHeaders['content-encoding'];
    delete responseHeaders['transfer-encoding'];
    delete responseHeaders['connection'];

    Object.keys(responseHeaders).forEach(key => {
      res.setHeader(key, responseHeaders[key]);
    });

    // 응답의 Set-Cookie를 프록시 도메인에 맞게 변환
    if (transparency && responseHeaders['set-cookie']) {
      const modifiedCookies =
        responseHeaders['set-cookie'].map((cookie) => cookie.replace(/Domain=[^;]+;/i, ''));
      res.setHeader('Set-Cookie', modifiedCookies);
    }

    res.status(response.status).send(response.data);

  } catch (error: any) {
    console.error('Proxy error:', error.message);

    if (error.response) {
      res.status(error.response.status).send(error.response.data);
    } else {
      res.status(500).json(error);
    }
  }
}
