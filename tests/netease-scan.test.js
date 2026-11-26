import {randomBytes} from 'node:crypto';
import {createServer} from 'node:http';
import assert from 'node:assert/strict';
import test from 'node:test';
import {createGateway} from '../services/netease/gateway.mjs';
import {createNeteaseAccount} from '../src/apps/music/netease-account.js';

test('protected music service supports QR confirmation and loading a personal playlist', async t => {
  const key = randomBytes(32).toString('hex');
  const cookie = 'MUSIC_U=fixture';
  const image = 'data:image/png;base64,iVBORw0KGgo=';
  const ok = body => ({status:200, body});
  let checks = 0;
  const api = {
    login_qr_key: async () => ok({code:200, data:{unikey:'fixture-key'}}),
    login_qr_create: async args => {
      assert.deepEqual(args, {key:'fixture-key', qrimg:true});
      return ok({code:200, data:{qrimg:image}});
    },
    login_qr_check: async args => {
      assert.deepEqual(args, {key:'fixture-key'});
      checks++;
      return checks === 1 ? ok({code:802}) : ok({code:803, cookie:cookie + '; unrelated=private'});
    },
    login_status: async args => {
      assert.deepEqual(args, {cookie});
      return ok({data:{code:200, profile:{userId:123, nickname:'Test Listener'}}});
    },
    user_playlist: async args => {
      assert.deepEqual(args, {uid:'123', limit:50, offset:0, cookie});
      return ok({code:200, playlist:[{id:456, name:'A playlist'}], more:false});
    },
  };
  const origin = 'https://localhost';
  const server = createServer(createGateway(api, {key, origins:[origin]}));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const endpoint = 'http://127.0.0.1:' + server.address().port;
  const request = (route, options) => fetch(endpoint + route, options);
  assert.equal((await request('/login/qr/key')).status, 401);
  assert.equal((await request('/login/qr/key', {headers:{Origin:'https://other.example'}})).status, 403);
  assert.equal((await request('/login/cellphone', {headers:{'X-Chen-Music-Key':key}})).status, 404);
  const preflight = await request('/login/qr/key', {method:'OPTIONS', headers:{Origin:origin}});
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers.get('access-control-allow-origin'), origin);
  assert.match(preflight.headers.get('access-control-allow-headers'), /X-Chen-Music-Key/);
  const states = [];
  const account = createNeteaseAccount({
    endpoint:() => endpoint, getAccessKey:() => key,
    refresh:() => states.push({qr:account.ui.qr, status:account.ui.status}),
  });
  await account.login();
  assert.ok(states.some(state => state.qr === image));
  assert.ok(states.some(state => state.status.includes('已扫码')));
  assert.equal(account.ui.account?.name, 'Test Listener');
  assert.deepEqual(account.ui.playlists, [{id:'456', title:'A playlist'}]);
  assert.equal(account.cookie(), cookie);
  assert.equal(account.ui.qr, '');
});
