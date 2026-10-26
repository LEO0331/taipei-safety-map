import { readFile, readdir } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { join } from 'node:path';
import { performance } from 'node:perf_hooks';
import { atomicJson, OUTPUT, hash } from './fireRescueAccessPolicySources.ts';
import { DEFAULT_CONFIG, runAccessScenario, accessBriefing, accessBriefingCsv } from '../src/lib/fireRescueAccessScenarios.ts';
import type { Snapshot } from '../src/types/fireRescueAccessPolicy.ts';
const pointer=JSON.parse(await readFile(`${OUTPUT}/current.json`,'utf8')), bytes=await readFile(`${OUTPUT}/${pointer.filename}`), snapshot:Snapshot=JSON.parse(bytes.toString());
const assets=await readdir('dist/assets'), bundle=[];
for(const name of assets.filter(x=>/^(index-|FireRescueAccessPolicyDashboard-).+\.(js|css)$/.test(x))) {
 const data=await readFile(`dist/assets/${name}`);bundle.push({name,bytes:data.length,gzip:gzipSync(data).length});
}
const baselinePath=process.argv.find(x=>x.startsWith('--baseline='))?.slice(11);
const baselineBundle=[];
if(baselinePath)for(const name of (await readdir(baselinePath)).filter(x=>/^index-.+\.js$/.test(x))){const data=await readFile(join(baselinePath,name));baselineBundle.push({name,bytes:data.length,gzip:gzipSync(data).length,sha256:hash(data)});}
const timings=[];
for(const capacity of [5,10,'all'] as const)for(const strategy of ['evidence-first','balanced'] as const){
 const samples:number[]=[];for(let i=0;i<100;i++){const start=performance.now();runAccessScenario(snapshot,{...DEFAULT_CONFIG,capacity,strategy});samples.push(performance.now()-start)}samples.sort((a,b)=>a-b);
 timings.push({capacity,strategy,runs:100,medianMs:samples[50],p95Ms:samples[95]});
}
const all=runAccessScenario(snapshot,{...DEFAULT_CONFIG,capacity:'all'}), json=JSON.stringify(await accessBriefing(snapshot,all,pointer.sha256)), csv=await accessBriefingCsv(snapshot,all,pointer.sha256);
const result={measuredAt:new Date().toISOString(),environment:`Node ${process.version} ${process.platform} ${process.arch}; local process, not browser render timings`,baseline:{sha:'0ee4cb1856d7eaa1ecdff99197fe151bc60c10ea',shellBytesReported:891000,shellGzipReported:241150,precision:'Vite display kB rounded to 0.01; exact baseline bundle below uses same Node gzipSync as after',exactBundle:baselineBundle},bundle,snapshot:{bytes:bytes.length,gzip:gzipSync(bytes).length,sha256:hash(bytes)},scenarioCpu:timings,allExport:{rows:all.selected.length,jsonBytes:Buffer.byteLength(json),csvBytes:Buffer.byteLength(csv)},processMemory:process.memoryUsage(),memoryLimitation:'Node process memory is not browser retained heap; browser evidence records bounded DOM node counts and on-demand pagination separately'};
await atomicJson('docs/fire-rescue-access-policy-performance.json',result);console.log(JSON.stringify(result,null,2));
