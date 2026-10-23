import {collect} from '../../lib/collection.js';
import {read,write} from '../../lib/storage.js';
import {fetchBoard} from '../../lib/leaderboard.js';
export default async()=>{
 try{const r=await collect({readFn:read,writeFn:write,fetchFn:fetchBoard});console.log('TopBomber collection',JSON.stringify(r));return new Response(JSON.stringify({ok:r.ok.length,errors:r.errors.length}),{headers:{'content-type':'application/json'}})}
 catch(e){console.error('TopBomber collection failed',e);return new Response(JSON.stringify({error:String(e.message||e)}),{status:500,headers:{'content-type':'application/json'}})}
};
