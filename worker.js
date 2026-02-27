/**
 * Cloudflare Worker — 6551 News API Proxy
 * Token 存在 Worker 环境变量里，前端不暴露
 *
 * 部署后设置 Secret：
 *   wrangler secret put OPENNEWS_TOKEN
 * 或在 Cloudflare Dashboard → Workers → Settings → Variables 添加
 */

const ALLOWED_ORIGIN = '*'; // 上线后改成你的 GitHub Pages 域名
const API_BASE = 'https://ai.6551.io';

const ROUTES = {
  '/api/news/search':  { upstream: '/open/news_search',  method: 'POST' },
  '/api/news/types':   { upstream: '/open/news_type',    method: 'GET'  },
  '/api/twitter/user': { upstream: '/open/twitter_user_info', method: 'POST' },
  '/api/twitter/search': { upstream: '/open/twitter_search', method: 'POST' },
};

export default {
  async fetch(request, env) {
    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    const url = new URL(request.url);
    const route = ROUTES[url.pathname];

    if (!route) {
      return new Response(JSON.stringify({ error: 'Not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': ALLOWED_ORIGIN },
      });
    }

    const token = env.OPENNEWS_TOKEN;
    if (!token) {
      return new Response(JSON.stringify({ error: 'Token not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': ALLOWED_ORIGIN },
      });
    }

    // 转发请求
    const upstreamUrl = `${API_BASE}${route.upstream}${url.search}`;
    const body = route.method === 'POST' ? await request.text() : undefined;

    const resp = await fetch(upstreamUrl, {
      method: route.method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body,
    });

    const data = await resp.text();
    return new Response(data, {
      status: resp.status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
        'Cache-Control': 'no-cache',
      },
    });
  },
};
