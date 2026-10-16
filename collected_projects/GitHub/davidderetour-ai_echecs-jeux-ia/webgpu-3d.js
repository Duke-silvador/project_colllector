/* Moteur graphique WebGPU facultatif (Safari 26+, Chrome/Android compatibles).
   WebGL local reste prêt en secours si la puce ou WebGPU ne répond pas.
   Aucune bibliothèque ni ressource distante. */
export function makeGPUOverlay(canvas,onReady=()=>{}){
 const parent=canvas?.parentElement;
 if(!parent||!navigator.gpu||!window.isSecureContext)return null;
 let disposed=false,ready=false,device=null,context=null,pipeline=null,uniforms=null,bindGroup=null;
 let vertices=null,vertexBuffer=null,vertexCount=0,depth=null,msaa=null,shownWidth=0,shownHeight=0,format=null;
 const layer=document.createElement('canvas');layer.className='webgpu-overlay';layer.setAttribute('aria-hidden','true');
 layer.style.cssText='position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:1;display:none';
 parent.style.position='relative';canvas.after(layer);
 const clearResources=()=>{try{vertexBuffer?.destroy();depth?.destroy();msaa?.destroy()}catch{}};
 const upload=data=>{vertices=data instanceof Float32Array?data:new Float32Array(data||[]);vertexCount=vertices.length/9;
  if(!ready||disposed)return;vertexBuffer?.destroy();if(!vertices.length){vertexBuffer=null;return;}
  vertexBuffer=device.createBuffer({size:Math.max(4,vertices.byteLength),usage:GPUBufferUsage.VERTEX|GPUBufferUsage.COPY_DST});
  device.queue.writeBuffer(vertexBuffer,0,vertices);
 };
 function ensureSize(w,h){w=Math.max(1,Math.round(w));h=Math.max(1,Math.round(h));if(w===shownWidth&&h===shownHeight)return;
  shownWidth=w;shownHeight=h;layer.width=w;layer.height=h;
  depth?.destroy();msaa?.destroy();
  depth=device.createTexture({size:[w,h],format:'depth24plus',usage:GPUTextureUsage.RENDER_ATTACHMENT,sampleCount:4});
  msaa=device.createTexture({size:[w,h],format,usage:GPUTextureUsage.RENDER_ATTACHMENT,sampleCount:4});
 }
 function draw(pv,eye,w,h){if(!ready||disposed||!vertexBuffer||!vertexCount)return false;
  try{ensureSize(w,h);
   const u=new Float32Array(20);u.set(pv,0);u.set([eye[0],eye[1],eye[2],1],16);
   device.queue.writeBuffer(uniforms,0,u);
   const encoder=device.createCommandEncoder();const pass=encoder.beginRenderPass({
    colorAttachments:[{view:msaa.createView(),resolveTarget:context.getCurrentTexture().createView(),clearValue:{r:.07,g:.105,b:.165,a:1},loadOp:'clear',storeOp:'discard'}],
    depthStencilAttachment:{view:depth.createView(),depthClearValue:1,depthLoadOp:'clear',depthStoreOp:'discard'}});
   pass.setPipeline(pipeline);pass.setBindGroup(0,bindGroup);pass.setVertexBuffer(0,vertexBuffer);pass.draw(vertexCount);pass.end();device.queue.submit([encoder.finish()]);return true;
  }catch(e){console.warn('Retour automatique WebGL :',e);ready=false;layer.style.display='none';return false}
 }
 (async()=>{
  try{
   const adapter=await navigator.gpu.requestAdapter({powerPreference:'high-performance'});if(!adapter||disposed)throw Error('WebGPU non pris en charge par le GPU');
   device=await adapter.requestDevice();if(disposed)return;
   context=layer.getContext('webgpu');if(!context)throw Error('Contexte WebGPU indisponible');
   format=navigator.gpu.getPreferredCanvasFormat();context.configure({device,format,alphaMode:'opaque'});
   const shader=device.createShaderModule({code:`
struct Camera { pv:mat4x4<f32>, eye:vec4<f32> };
@group(0) @binding(0) var<uniform> camera:Camera;
struct Vert { @location(0) pos:vec3<f32>, @location(1) normal:vec3<f32>, @location(2) color:vec3<f32> };
struct Frag { @builtin(position) pos:vec4<f32>, @location(0) normal:vec3<f32>, @location(1) color:vec3<f32>, @location(2) world:vec3<f32> };
@vertex fn vs(v:Vert)->Frag{var o:Frag;o.pos=camera.pv*vec4<f32>(v.pos,1.0);o.normal=v.normal;o.color=v.color;o.world=v.pos;return o;}
@fragment fn fs(v:Frag)->@location(0) vec4<f32>{
 let n=normalize(v.normal);let light=normalize(vec3<f32>(0.45,0.95,0.70));
 let ray=normalize(camera.eye.xyz-v.world);
 let diffuse=max(dot(n,light),0.0);
 let spec=pow(max(dot(n,normalize(ray+light)),0.0),42.0)*0.22;
 let rim=pow(1.0-max(dot(n,ray),0.0),3.0)*0.13;
 let warm=vec3<f32>(1.04,1.00,0.95);
 return vec4<f32>(min(v.color*(0.45+0.59*diffuse)*warm+vec3<f32>(spec+rim),vec3<f32>(1.0)),1.0);
}`});
   const layout=[{arrayStride:36,stepMode:'vertex',attributes:[{shaderLocation:0,offset:0,format:'float32x3'},{shaderLocation:1,offset:12,format:'float32x3'},{shaderLocation:2,offset:24,format:'float32x3'}]}];
   pipeline=device.createRenderPipeline({layout:'auto',vertex:{module:shader,entryPoint:'vs',buffers:layout},fragment:{module:shader,entryPoint:'fs',targets:[{format}]},primitive:{topology:'triangle-list',cullMode:'back'},depthStencil:{depthWriteEnabled:true,depthCompare:'less',format:'depth24plus'},multisample:{count:4}});
   uniforms=device.createBuffer({size:80,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});
   bindGroup=device.createBindGroup({layout:pipeline.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:uniforms}}]});
   device.lost.then(()=>{ready=false;layer.style.display='none';onReady()});
   if(disposed)return;
   ready=true;layer.style.display='block';parent.closest('.board-3d-viewport,.shogi-stage,.board-webgl')?.classList.add('webgpu-active');upload(vertices);onReady();
  }catch(e){if(!disposed){layer.remove();console.info('WebGPU indisponible : rendu WebGL conservé',e?.message||e)}}
 })();
 return {upload,draw,get ready(){return ready&&!disposed},get name(){return ready?'WebGPU':'WebGL'},dispose(){disposed=true;ready=false;parent.closest('.board-3d-viewport,.shogi-stage,.board-webgl')?.classList.remove('webgpu-active');clearResources();uniforms?.destroy();layer.remove()}};
}
