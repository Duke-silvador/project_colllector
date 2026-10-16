from pathlib import Path
p=Path('/mnt/data/chess_work/chess-3d.js')
s=p.read_text()
s="import {makeGPUOverlay} from './webgpu-3d.js';\n"+s
# Chess WebGPU mount
s=s.replace("let dead=false,raf=0,width=1,height=1;\n function paint(){raf=0", "let dead=false,raf=0,width=1,height=1;\n const gpu=makeGPUOverlay(canvas,()=>schedule());gpu?.upload(new Float32Array(mesh.data));\n function paint(){raf=0",1)
s=s.replace("gl.drawArrays(gl.TRIANGLES,0,mesh.data.length/9);\n  const c=overlay", "if(!gpu?.draw(PV,eye,width,height))gl.drawArrays(gl.TRIANGLES,0,mesh.data.length/9);\n  const c=overlay",1)
s=s.replace("resize.disconnect();gl.deleteBuffer(buffer);", "resize.disconnect();gpu?.dispose();gl.deleteBuffer(buffer);",1)
# generic object extension
s=s.replace("export function mountExtra360({canvas,overlay=null,kind='go',size=9,board=[],pieces={},selection=null,targets=[],onSquare,labels=true}){\n if(!canvas||!['go','peace','shogi'].includes(kind))return null;", "export function mountExtra360({canvas,overlay=null,kind='go',size=9,rows=null,cols=null,id='',board=[],pieces={},selection=null,targets=[],onSquare,labels=true}){\n if(!canvas||!['go','peace','shogi','mini','nim','tictactoe','memory'].includes(kind))return null;")
s=s.replace("let n=size,mesh=new Mesh(),dead=false,raf=0,width=1,height=1;let selected=selection,legalTargets=targets;\n let yaw=0,pitch=0.96,distance=n*1.9;\n const coord=(r,c)=>[c-(n-1)/2,r-(n-1)/2];", "let nr=Number(rows)||size,nc=Number(cols)||size,n=Math.max(nr,nc),mesh=new Mesh(),dead=false,raf=0,width=1,height=1;let selected=selection,legalTargets=targets;\n let yaw=0,pitch=0.96,distance=n*1.9;\n const coord=(r,c)=>[c-(nc-1)/2,r-(nr-1)/2];")
s=s.replace("const sizeFrame=n+.62;\n  mesh.box(0,-.26,0,sizeFrame,.62,sizeFrame,wood);\n  mesh.box(0,-.58,0,sizeFrame+.13,.09,sizeFrame+.13,trim);", "const widthFrame=nc+.62,heightFrame=nr+.62;\n  mesh.box(0,-.26,0,widthFrame,.62,heightFrame,wood);\n  mesh.box(0,-.58,0,widthFrame+.13,.09,heightFrame+.13,trim);")
# Add generic block before existing else for peace (since shogi then else)
needle="  }else{\n   for(let r=0;r<5;r++)for(let c=0;c<5;c++){"
block="""  }else if(kind==='mini'||kind==='nim'||kind==='tictactoe'||kind==='memory'){
   const light=hex('#e6ca98'),dark=hex('#815e45');
   const active=new Set((legalTargets||[]).map(t=>`${t.r}:${t.c}`));
   const disc=(x,z,color,king=false)=>{mesh.lathe(x,.14,z,[[.01,.00],[.36,.0],[.39,.08],[.38,.24],[.32,.29],[.01,.29]],color,24);if(king){mesh.lathe(x,.44,z,[[.01,0],[.25,0],[.27,.12],[.01,.16]],hex('#e9c766'),18)}};
   for(let r=0;r<nr;r++)for(let c=0;c<nc;c++){
    const [x,z]=coord(r,c),chosen=selected?.r===r&&selected?.c===c;
    const base=chosen?hex('#f8cd69'):active.has(`${r}:${c}`)?hex('#8bcfa5'):(r+c)%2===0?light:dark;
    mesh.box(x,.065,z,1.002,.105,1.002,base);
    const v=board?.[r]?.[c];
    if(v===null||v===undefined||v==='')continue;
    if(kind==='nim'&&v!==1)continue;
    if(kind==='tictactoe'){
     const ink=hex(v==='X'?'#28699e':'#bd534b');
     if(v==='X'){
      for(const sign of [-1,1])for(let i=0;i<5;i++){const a=(i-2)*.165;mesh.box(x+a,.20,z+sign*a,.16,.17,.18,ink)}
     }else{mesh.lathe(x,.16,z,[[.36,.0],[.34,.02],[.30,.14],[.34,.24],[.36,.26]],ink,32)}
    }else if(kind==='memory'){
      const face=v.visible===true;
      // Cartes rectangulaires épaisses, recto/verso en volume et relief.
      const card=hex(face?'#f8e8c5':'#253f5c');
      mesh.box(x,.17,z,.84,.17,.84,card);
      mesh.box(x,.267,z,.72,.025,.72,hex(face?'#fff4db':'#51769a'));
      if(!face){mesh.lathe(x,.29,z,[[.01,0],[.22,0],[.26,.07],[.23,.11],[.01,.11]],hex('#d7af70'),24)}
    }else if(kind==='mini'||kind==='nim'){
      const own=typeof v==='object'?v.player:(v==='F'?0:v==='G'?1:v);
      const col=hex(v==='F'?'#e98d49':v==='G'?'#f7ead0':own===0?'#dd7460':'#253b62');
      if(v==='F'){
       disc(x,z,col);mesh.sphere(x,.71,z,.21,col,8,16);
       for(const dx of [-.13,.13])mesh.lathe(x+dx,.75,z-.09,[[.01,0],[.105,.20],[.01,.35]],col,9);
      }else if(v==='G'){
       disc(x,z,col);mesh.sphere(x,.67,z,.21,col,8,14);
       mesh.lathe(x,.80,z+.03,[[.02,0],[.11,.12],[.01,.19]],col,12);
      }else{disc(x,z,col,!!v?.king)}
    }
   }
  }else{
   for(let r=0;r<5;r++)for(let c=0;c<5;c++){"""
assert needle in s
s=s.replace(needle,block,1)
# extra gpu init after let eye
needle=" const eye=()=>[distance*Math.cos(pitch)*Math.sin(yaw),distance*Math.sin(pitch),distance*Math.cos(pitch)*Math.cos(yaw)];\n function paint()"
assert needle in s
s=s.replace(needle," const eye=()=>[distance*Math.cos(pitch)*Math.sin(yaw),distance*Math.sin(pitch),distance*Math.cos(pitch)*Math.cos(yaw)];\n const gpu=makeGPUOverlay(canvas,()=>schedule());\n function paint()",1)
s=s.replace("gl.drawArrays(gl.TRIANGLES,0,mesh.data.length/9);\n  if(kind==='shogi'&&overlay){", "if(!gpu?.draw(PV,cam,width,height))gl.drawArrays(gl.TRIANGLES,0,mesh.data.length/9);\n  if(overlay&&(kind==='shogi'||kind==='memory')){",1)
# Include memory label overlay
needle="   for(let r=0;r<9;r++)for(let c=0;c<9;c++){const piece=board?.[r]?.[c];if(!piece)continue;const [x,z]=coord(r,c),q=project([x,.38,z]);if(!q)continue;"
assert needle in s
s=s.replace(needle,"""   if(kind==='memory'){
    const memorySymbols={'♚':'♚','♛':'♛','♜':'♜','♝':'♝','♞':'♞','♟':'♟','★':'★','☀':'☀'};
    for(let r=0;r<nr;r++)for(let c=0;c<nc;c++){
     const v=board?.[r]?.[c];if(!v?.visible)continue;
     const [x,z]=coord(r,c),q=project([x,.305,z]);if(!q)continue;
     const px=(q[0]+1)*width/2,py=(1-q[1])*height/2;
     o.font=`900 ${Math.max(16,Math.round(width/14))}px serif`;o.textAlign='center';o.textBaseline='middle';o.fillStyle='#283d5c';
     o.fillText(memorySymbols[v.symbol]||v.symbol||'★',px,py);
    }
   }
   if(kind==='shogi')for(let r=0;r<9;r++)for(let c=0;c<9;c++){const piece=board?.[r]?.[c];if(!piece)continue;const [x,z]=coord(r,c),q=project([x,.38,z]);if(!q)continue;""",1)
s=s.replace("  gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(mesh.data),gl.STATIC_DRAW);", "  gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(mesh.data),gl.STATIC_DRAW);\n  gpu?.upload(new Float32Array(mesh.data));",1)
# CAUTION gpu is declared AFTER makeGeometry and referenced inside function, but only called after declaration (yes)
s=s.replace("update(next={}){if(dead)return;const was=n;n=Number(next.size)||n;if(next.board)board=next.board;", "update(next={}){if(dead)return;const was=n;nr=Number(next.rows)||Number(next.size)||nr;nc=Number(next.cols)||Number(next.size)||nc;n=Math.max(nr,nc);if(next.board)board=next.board;",1)
s=s.replace("if(next.pieces)pieces=next.pieces;if('selection'", "if(next.pieces)pieces=next.pieces;if('selection'",1)
s=s.replace("canvas.removeEventListener('wheel',wheel);gl.deleteBuffer(buffer);gl.deleteProgram(prog)", "canvas.removeEventListener('wheel',wheel);gpu?.dispose();gl.deleteBuffer(buffer);gl.deleteProgram(prog)",1)
p.write_text(s)
print('patched engine bytes',len(s))
