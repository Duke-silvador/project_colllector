function joinPdfLines(lines) {
  return lines.reduce((text,line)=>text.endsWith('-') ? text.slice(0,-1)+line : text+(text?' ':'')+line,'').trim();
}
function pdfRowText(items) {
  let text='',previous=null;
  for(const item of items){
    const space=previous && (/\s$/.test(previous.raw||'')||/^\s/.test(item.raw||'')||!Number.isFinite(previous.width)||item.x-previous.x-previous.width>1);
    text+=(space?' ':'')+item.text;previous=item;
  }
  return text;
}
function pdfRows(page) {
  const rows=[];
  for(const item of page.items){
    if(!item.str?.trim())continue;
    const x=item.transform[4], y=page.height-item.transform[5];
    let row=rows.find(r=>Math.abs(r.y-y)<2);
    if(!row){row={y,items:[]};rows.push(row);}
    row.items.push({text:item.str.trim(),raw:item.str,x,width:item.width,font:item.fontName});
  }
  return rows.sort((a,b)=>a.y-b.y).map(row=>({...row,items:row.items.sort((a,b)=>a.x-b.x)}));
}
export function parsePdfPages(pages) {
  const allText=pages.map(p=>pdfRows(p).map(r=>pdfRowText(r.items)).join('\n')).join('\n');
  const quizlet=/Study online at .*quizlet/i.test(allText);
  if(!allText.trim())throw new Error('This PDF has no selectable text. Scanned or photo PDFs need OCR first.');
  if(quizlet){
    const cards=[];let current=null;
    for(const page of pages){
      const rows=pdfRows(page).filter(r=>r.y>60&&r.y<page.height-40);
      for(const row of rows){
        const numberItems=row.items.filter(i=>i.x<page.width*.075);
        const number=numberItems.map(i=>i.text).join('');
        if(/^\d+\.$/.test(number)){
          if(Number(number.slice(0,-1))!==cards.length+1)throw new Error('Card numbering is incomplete or out of order. Use a full Quizlet print export or import Q:/A: text.');
          current={term:[],definition:[]};cards.push(current);
        }
        if(!current)continue;
        const content=row.items.filter(i=>i.x>=page.width*.075);
        // Quizlet prints answers and card numbers in a second font. This
        // separates columns even when a question extends across most of a row.
        const answerFont=page.answerFont;
        const right=content.filter(i=>answerFont ? i.font===answerFont : i.x>=page.width*.73);
        const left=content.filter(i=>!right.includes(i));
        if(left.length)current.term.push(pdfRowText(left));
        if(right.length)current.definition.push(pdfRowText(right));
      }
    }
    if(!cards.length||cards.some(c=>!c.term.length||!c.definition.length))throw new Error('Some questions or answers could not be paired. No cards were replaced. Try Q:/A: text instead.');
    return {cards:cards.map(c=>({term:joinPdfLines(c.term),definition:joinPdfLines(c.definition)})),format:'Quizlet print',warnings:allText.includes('\ufffd')?['The PDF contains unreadable characters (�). Correct them in the editable text before importing.']:[]};
  }
  // Explicit markers avoid guessing answer keys from arbitrary course notes.
  const cards=[];let current=null,part=null;
  for(let line of allText.split('\n')){
    line=line.trim();if(!line||/^\d+\s*\/\s*\d+$/.test(line))continue;
    let match=line.match(/^(?:\d+[.)]\s*)?(?:Q(?:uestion)?)[.:]\s*(.*)$/i);
    if(match){current={term:[match[1]],definition:[],answers:[]};cards.push(current);part='term';continue;}
    if(current&&/^Type:\s*Select all that apply\.?$/i.test(line)){current.multi=true;part=null;continue;}
    match=line.match(/^(?:A(?:nswer)?)[.:]\s*(.*)$/i);
    if(match&&current){if(current.multi){current.answers.push([match[1]]);part='multi-answer';}else{current.definition.push(match[1]);part='definition';}continue;}
    if(current&&part==='multi-answer'){current.answers.at(-1).push(line);continue;}
    if(current&&part)current[part].push(line);
  }
  if(!cards.length||cards.some(c=>!joinPdfLines(c.term)||(c.multi?c.answers.length<2||c.answers.some(a=>!joinPdfLines(a)):!joinPdfLines(c.definition))))throw new Error('Unsupported PDF layout. Use a Quizlet print export or a text PDF with each Question: followed by Answer:. Scanned PDFs and separate answer-key pages are not supported.');
  return {cards:cards.map(c=>c.multi?{term:joinPdfLines(c.term),definition:c.answers.map(joinPdfLines).join('\n'),type:'multi',answers:c.answers.map(joinPdfLines)}:{term:joinPdfLines(c.term),definition:joinPdfLines(c.definition)}),format:'Question / Answer',warnings:['Check every pair: page headers or footers may need removal.']};
}
