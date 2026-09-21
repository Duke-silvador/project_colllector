#!/usr/bin/env python3
import json,math,sys
MAGIC='APEXMODEL1'
class ApexModel:
 def __init__(self,path):
  with open(path,encoding='utf-8') as f:d=json.load(f)
  if d.get('format')!=MAGIC: raise ValueError('invalid APEX model')
  self.d=d
 def generate(self,prompt,max_tokens=128):
  v=self.d['vocab']; rows=self.d['weights']; ids=[v.get(c,0) for c in prompt][-self.d['context']:]; out=[]
  for _ in range(max_tokens):
   prev=ids[-1] if ids else 0; row=rows[prev]; nxt=max(range(len(row)),key=lambda i:(row[i],-i)); ch=self.d['id_to_token'][nxt]; out.append(ch); ids=(ids+[nxt])[-self.d['context']:]
   if ch=='\n': break
  return ''.join(out)
def main():
 if len(sys.argv)<2: print('usage: apex-runtime.py MODEL [PROMPT]',file=sys.stderr); return 2
 p=' '.join(sys.argv[2:]) if len(sys.argv)>2 else sys.stdin.read(); print(ApexModel(sys.argv[1]).generate(p))
if __name__=='__main__': raise SystemExit(main())
