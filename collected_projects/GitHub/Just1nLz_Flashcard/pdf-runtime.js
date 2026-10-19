import {getDocument, GlobalWorkerOptions} from 'pdfjs-dist/legacy/build/pdf.mjs';
import workerSource from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs';
let workerUrl;
export async function readPdf(file, progress) {
 if(file.size>25*1024*1024)throw new Error('Choose a PDF smaller than 25 MB.');
 if(!workerUrl){workerUrl=URL.createObjectURL(new Blob([workerSource],{type:'text/javascript'}));GlobalWorkerOptions.workerSrc=workerUrl;}
 const task=getDocument({data:new Uint8Array(await file.arrayBuffer()),useSystemFonts:true,isEvalSupported:false});
 let passwordProtected=false;task.onPassword=()=>{passwordProtected=true;task.destroy().catch(()=>{});};
 let doc;
 try{
  doc=await task.promise;
  if(doc.numPages>100)throw new Error('Choose a PDF with 100 pages or fewer.');
  const pages=[];
  for(let n=1;n<=doc.numPages;n++){
   progress?.(`Reading page ${n} of ${doc.numPages}…`);
   const page=await doc.getPage(n), content=await page.getTextContent();
   const width=page.view[2]-page.view[0],height=page.view[3]-page.view[1];
   const answerFonts=content.items.filter(i=>i.str?.trim()&&i.transform[4]>width*.70&&i.transform[5]>40&&i.transform[5]<height-60);
   const counts=new Map();for(const i of answerFonts)counts.set(i.fontName,(counts.get(i.fontName)||0)+1);
   const answerFont=[...counts].sort((a,b)=>b[1]-a[1])[0]?.[0];
   pages.push({width,height,items:content.items,answerFont});page.cleanup();
  }
  return pages;
 }catch(e){if(passwordProtected||/password/i.test(e.message)||e.name==='PasswordException')throw new Error('This PDF is password protected. Export an unlocked copy first.');throw e;}
 finally{if(doc)await doc.destroy();else await task.destroy();}
}
