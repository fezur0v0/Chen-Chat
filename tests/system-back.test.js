import test from 'node:test';
import assert from 'node:assert/strict';
import {connectAndroidBack} from '../src/system-back.js';

test('system back is inert on web and reports a missing native App plugin',async()=>{
 assert.deepEqual(await connectAndroidBack({capacitor:{getPlatform:()=> 'web'},back:()=>{throw Error('not called')}}),{connected:false,reason:'not-android'});
 assert.deepEqual(await connectAndroidBack({capacitor:{getPlatform:()=> 'android',Plugins:{}},back:()=>true}),{connected:false,reason:'missing-app-plugin'});
});

test('native back consumes in-app navigation and only minimizes at the root',async()=>{
 let handler,consumed=true,minimized=0,removed=0;
 const native={addListener(name,fn){assert.equal(name,'backButton');handler=fn;return {remove:async()=>removed++}},minimizeApp:async()=>minimized++};
 const result=await connectAndroidBack({capacitor:{getPlatform:()=> 'android',Plugins:{App:native}},back:()=>consumed});
 assert.equal(result.connected,true);await handler();assert.equal(minimized,0);consumed=false;await handler();assert.equal(minimized,1);await result.remove();assert.equal(removed,1);
});

test('rapid back callbacks cannot minimize twice while the native call is pending',async()=>{
 let handler,finish,minimized=0;const waiting=new Promise(r=>finish=r);
 await connectAndroidBack({capacitor:{getPlatform:()=> 'android',Plugins:{App:{addListener(_n,fn){handler=fn;return {remove(){}}},minimizeApp:async()=>{minimized++;await waiting}}}},back:()=>false});
 const first=handler();await handler();assert.equal(minimized,1);finish();await first;
});

test('registration and native failures are handled without forcing an exit',async()=>{
 let errors=0,handler;
 const result=await connectAndroidBack({capacitor:{getPlatform:()=> 'android',Plugins:{App:{addListener(){throw Error('unavailable')}}}},back:()=>true,onError:()=>errors++});
 assert.equal(result.reason,'registration-failed');
 await connectAndroidBack({capacitor:{getPlatform:()=> 'android',Plugins:{App:{addListener(_n,fn){handler=fn;return {remove(){}}},minimizeApp(){throw Error('unavailable')}}}},back:()=>false,onError:()=>errors++});
 await handler();assert.equal(errors,2);
});
