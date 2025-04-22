import {JSDOM} from "jsdom";

export function unescape(html: string): string {
  const dom = new JSDOM(html);
  return dom.window.document.documentElement.textContent || '';
}
