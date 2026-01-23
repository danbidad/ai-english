import axios from "axios";

class ProxyRotator {
  private proxies: string[] = [];
  private index: number = 0;

  shuffle(): void {
    for (let i = this.proxies.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.proxies[i], this.proxies[j]] = [this.proxies[j], this.proxies[i]];
    }
    this.index = 0;
  }

  setList(proxies: string[]): void {
    this.proxies = proxies || [];
    this.index = 0;
  }

  getNext(): string | null {
    if (this.proxies.length === 0) {
      return null;
    }
    const proxy = this.proxies[this.index % this.proxies.length];
    this.index = (this.index + 1) % (1 << 30);

    console.log(`getNext(): ${proxy}`)
    return proxy;
  }

  getProxiesCount(): number {
    return this.proxies.length;
  }
}

export const proxyRotator = new ProxyRotator();

const WEBSHARE_API_KEY_LIST = [
  'uwuwdr1kheu7a0tq' + '6avjm3yq64onpsctx1eh0ru9', // danbidad@gmail.com
  '3judf9mc4p9hu2lx71eenooni' + '2wakfswkgz9tpqt'  // danbidad2@gmail.com
]
const WEBSHARE_API_BASE = 'https://proxy.webshare.io/api/v2/proxy/list/';

// Fetch proxies from Webshare API
async function fetchWebshareProxies(): Promise<string[]> {
  if (!WEBSHARE_API_KEY_LIST || WEBSHARE_API_KEY_LIST?.length < 1) {
    console.warn('WEBSHARE_API_KEY not set, running without proxies');
    return [];
  }

  const proxies: string[] = [];
  let page = 1;

  for (var key_idx = 0; key_idx < WEBSHARE_API_KEY_LIST.length; key_idx++) {
    const headers = { Authorization: `Token ${WEBSHARE_API_KEY_LIST[key_idx]}` };

    try {
      while (true) {
        const response = await axios.get(WEBSHARE_API_BASE, {
          params: { mode: 'direct', page, page_size: 50 },
          headers,
          timeout: 20000,
        });

        const data = response.data;
        const results = data.results || [];

        if (results.length === 0) {
          break;
        }

        for (const item of results) {
          const username = item.username;
          const password = item.password;
          const ip = item.proxy_address;
          const port = item.port;

          // Build HTTP proxy URL
          let proxyUrl: string;
          if (username && password) {
            proxyUrl = `http://${username}:${password}@${ip}:${port}`;
          } else {
            proxyUrl = `http://${ip}:${port}`;
          }
          proxies.push(proxyUrl);
        }

        // Check for pagination
        if (data.next) {
          page += 1;
        } else {
          break;
        }
      }

      console.log(`Loaded ${proxies.length} proxies from Webshare`);
    } catch (error) {
      console.error('Error fetching Webshare proxies:', error);
    }
  }

  return proxies;
}

// Initialize proxies on startup
export async function initializeProxies(): Promise<void> {
  const proxies = await fetchWebshareProxies();
  proxyRotator.setList(proxies);
  proxyRotator.shuffle();
}

// Call initialization immediately
initializeProxies();
