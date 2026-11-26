import {timingSafeEqual} from 'node:crypto';

const id = value => typeof value === 'string' && /^[1-9]\d{0,15}$/.test(value);
const sessionCookie = /(?:^|;\s*)(MUSIC_U=[^;\r\n]{1,4096})(?:;|$)/;
const qrKey = value => typeof value === 'string' && /^[A-Za-z0-9_.=-]{1,256}$/.test(value);
const offset = value => Number.isInteger(Number(value)) && Number(value) >= 0 && Number(value) <= 100000;
const routes = {
  '/login/qr/key': ['login_qr_key', () => ({})],
  '/login/qr/create': ['login_qr_create', p => qrKey(p.key) && {key:p.key, qrimg:true}],
  '/login/qr/check': ['login_qr_check', p => qrKey(p.key) && {key:p.key}],
  '/login/status': ['login_status', () => ({})],
  '/cloudsearch': ['cloudsearch', p => typeof p.keywords === 'string' && p.keywords.trim() &&
    p.keywords.length <= 100 && {keywords:p.keywords, type:1, limit:20}],
  '/user/playlist': ['user_playlist', p => id(p.uid) && offset(p.offset) && {uid:p.uid, limit:50, offset:Number(p.offset)}],
  '/playlist/track/all': ['playlist_track_all', p => id(p.id) && offset(p.offset) && {id:p.id, limit:50, offset:Number(p.offset)}],
  '/song/url/v1': ['song_url_v1', p => id(p.id) && {id:p.id, level:'standard'}],
  '/lyric': ['lyric', p => id(p.id) && {id:p.id}],
};

function json(res, status, body) {
  res.writeHead(status, {'Content-Type':'application/json; charset=utf-8'});
  res.end(JSON.stringify(body));
}

async function readParams(req, url) {
  if (req.method === 'GET') return Object.fromEntries(url.searchParams);
  if (req.headers['content-type']?.split(';')[0] !== 'application/json') return null;
  let body = '';
  for await (const chunk of req.setEncoding('utf8')) {
    body += chunk;
    if (body.length > 8192) return null;
  }
  const parsed = JSON.parse(body);
  return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
}

function publicBody(name, body) {
  if (name === 'login_qr_check') {
    const cookie = typeof body.cookie === 'string' ? sessionCookie.exec(body.cookie)?.[1] : undefined;
    return {code:body.code, ...(body.code === 803 && cookie ? {cookie} : {})};
  }
  if (name === 'login_status') {
    const {code, profile} = body.data ?? {};
    return {data:{code, profile:profile ? {userId:profile.userId, nickname:profile.nickname} : null}};
  }
  return body;
}

export function createGateway(api, {key, origins}) {
  if (typeof key !== 'string' || !/^[A-Za-z0-9_-]{32,128}$/.test(key)) {
    throw new Error('CHEN_MUSIC_KEY must be 32–128 URL-safe characters.');
  }
  const expected = Buffer.from(key);
  const allowedOrigins = new Set(origins);
  return async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Vary', 'Origin');
    const origin = req.headers.origin;
    if (origin) {
      if (!allowedOrigins.has(origin)) return json(res, 403, {code:403});
      res.setHeader('Access-Control-Allow-Origin', origin);
    }
    let url;
    try { url = new URL(req.url, 'http://localhost'); }
    catch { return json(res, 400, {code:400}); }
    if ((url.pathname === '/healthz' || url.pathname === '/') && req.method === 'GET') {
      return json(res, 200, {ok:true});
    }
    if (!Object.hasOwn(routes, url.pathname)) return json(res, 404, {code:404});
    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Methods':'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers':'X-Chen-Music-Key, Content-Type',
        'Access-Control-Max-Age':'600',
      });
      return res.end();
    }
    const sent = Buffer.from(req.headers['x-chen-music-key'] || '');
    if (sent.length !== expected.length || !timingSafeEqual(sent, expected)) {
      return json(res, 401, {code:401});
    }
    if (req.method !== 'GET' && req.method !== 'POST') return json(res, 405, {code:405});
    const [handler, parse] = routes[url.pathname];
    let args;
    try {
      const params = await readParams(req, url);
      args = params && parse(params);
      if (!args) return json(res, 400, {code:400});
      if (req.method === 'POST' && typeof params.cookie === 'string') {
        const cookie = sessionCookie.exec(params.cookie)?.[1];
        if (!cookie) return json(res, 400, {code:400});
        args.cookie = cookie;
      }
    } catch {
      return json(res, 400, {code:400});
    }
    try {
      const {status, body} = await api[handler](args);
      if (status !== 200 || !body || typeof body !== 'object') return json(res, 502, {code:502});
      if (handler === 'login_qr_check' && ![800, 801, 802, 803].includes(body.code)) {
        return json(res, 502, {code:502});
      }
      return json(res, 200, publicBody(handler, body));
    } catch {
      return json(res, 502, {code:502});
    }
  };
}
