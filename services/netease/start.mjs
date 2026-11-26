import {createServer} from 'node:http';
import api from '@neteasecloudmusicapienhanced/api';
import {createGateway} from './gateway.mjs';

const defaultOrigins = 'https://localhost,http://127.0.0.1:5173,http://localhost:5173';
const origins = (process.env.CHEN_MUSIC_ORIGINS || defaultOrigins).split(',').map(value => value.trim());
const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || '127.0.0.1';
const gateway = createGateway(api, {key:process.env.CHEN_MUSIC_KEY, origins});
// The upstream library can log raw response bodies and Set-Cookie values on errors.
const log = console.log.bind(console);
console.log = (label, ...args) => {
  if (label === '[ERR]') return log('NetEase upstream request failed.');
  return log(label, ...args);
};
createServer(gateway).listen(port, host, () => console.log('Chen music service is listening on port ' + port));
