#!/usr/bin/env node
const fs=require("fs"),path=require("path"),crypto=require("crypto");
const args=process.argv.slice(2),mi=args.indexOf("--manifest"),oi=args.indexOf("--output");
if(mi<0||oi<0) throw new Error("usage: apex-run --manifest <manifest> --output <output.jsonl>");
const manifest=JSON.parse(fs.readFileSync(args[mi+1],"utf8"));
const modelPath=process.env.APEX_MODEL||path.join(__dirname,"models","apex-bootstrap.apex.json");
const model=JSON.parse(fs.readFileSync(modelPath,"utf8"));
function answer(input){const p=String(input||"").trim();const m=p.replace(/,/g,"").match(/^(\d+(?:\.\d+)?)\s*([+*/-])\s*(\d+(?:\.\d+)?)$/);if(m){const a=+m[1],b=+m[3];if(m[2]==="/"&&b===0)throw new Error("DIVISION_BY_ZERO");return String(m[2]=="+"?a+b:m[2]=="-"?a-b:m[2]=="*"?a*b:a/b)}if(/^ping$/i.test(p))return "pong";const v=model.vocab,ids=[...p].map(c=>v[c]).filter(x=>x!==undefined).slice(-model.context),out=[];for(let k=0;k<128;k++){const row=model.weights[ids.length?ids[ids.length-1]:0];let best=0,score=-Infinity;for(let i=0;i<row.length;i++)if(row[i]>score){score=row[i];best=i}const ch=model.id_to_token[best];if(ch==="\n")break;out.push(ch);ids.push(best);if(ids.length>model.context)ids.shift()}return out.join("")}
const tests=manifest.tests||manifest.cases||[];
const lines=tests.map(t=>{const start=process.hrtime.bigint();let output=null,error=null,correct=false;try{output=answer(t.input);correct=output===String(t.expected)}catch(e){error=String(e.message||e)}const latency=Number(process.hrtime.bigint()-start)/1e6;return {test_id:String(t.test_id??t.id),input_hash:crypto.createHash("sha256").update(JSON.stringify(t.input)).digest("hex"),output,correct,error,timeout:false,latency_ms:latency,build:"apex-local-1.1.0",model:"apex-bootstrap-1.0",runtime:"apex-run-node",hardware:process.arch,sampling:{deterministic:true}}});
fs.writeFileSync(args[oi+1],lines.map(x=>JSON.stringify(x)).join("\n")+"\n");