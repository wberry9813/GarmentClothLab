import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import './garment.css';

const root=document.querySelector<HTMLDivElement>('#garment-app')!;
root.innerHTML=`
<header class="topbar"><div><div class="eyebrow">GARMENT CLOTH LAB / 03</div><h1>Garment Motion</h1></div><div class="status"><i></i> SINGLE-PIECE CLOTH · LOCAL</div></header>
<main class="layout"><section class="stage"><div class="stage-note"><span>LIVE FABRIC SIMULATION</span><span id="fps">60 FPS</span></div><div id="viewport"></div><div class="stage-hint">拖动衣服施加外力 · 拖动空白区域旋转视角</div></section>
<aside class="panel"><section><div class="section-label">GARMENT</div><div class="garment-card"><img src="${import.meta.env.BASE_URL}white-tshirt.webp" alt="White T-shirt"/><div><b>Classic White T-shirt</b><small>内置基准素材 · 棉质</small></div></div></section>
<section><div class="section-label">YOUR IMAGE</div><label class="upload"><input id="upload" type="file" accept="image/png,image/jpeg,image/webp"><span>＋</span><div><b>替换服装图片</b><small>建议使用透明背景图片</small></div></label><div id="filename" class="filename">当前：内置白色 T 恤</div></section>
<section><div class="section-label">FABRIC MOTION</div><label class="control"><span>风力 <output id="wind-value">0.22</output></span><input id="wind" type="range" min="0" max="1" step="0.01" value="0.22"></label><label class="control"><span>柔软度 <output id="soft-value">0.42</output></span><input id="soft" type="range" min="0.1" max="0.9" step="0.01" value="0.42"></label><label class="control"><span>阻尼 <output id="damp-value">0.055</output></span><input id="damp" type="range" min="0.015" max="0.12" step="0.001" value="0.055"></label><label class="toggle"><input id="auto" type="checkbox" checked><span>自然微风</span></label></section>
<section class="actions"><button id="gust" class="primary">轻推衣摆</button><button id="reset" class="secondary">恢复初始状态</button></section><p class="disclaimer">V0.3：整件衣服作为一个整体，使用稳定规则网格与低幅度受控摆动。透明通道只负责显示裁切，不参与网格拓扑。当前是视觉优先的 2.5D 布料展示，不是服装裁片仿真。</p></aside></main>
<footer>GarmentClothLab · Prototype 0.3 <span>Stable grid · Controlled drape · Browser-local physics</span></footer>`;

const host=document.querySelector<HTMLDivElement>('#viewport')!;
const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));renderer.setSize(host.clientWidth,host.clientHeight);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;host.appendChild(renderer.domElement);
const scene=new THREE.Scene();scene.background=new THREE.Color('#eeeae4');
const camera=new THREE.PerspectiveCamera(32,host.clientWidth/host.clientHeight,.1,40);camera.position.set(0,.02,6.2);
const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.07;controls.enablePan=false;controls.minDistance=4.5;controls.maxDistance=8;
scene.add(new THREE.HemisphereLight(0xffffff,0xb8b1a7,1.65));
const key=new THREE.DirectionalLight(0xffffff,2);key.position.set(-2.8,3.5,4);scene.add(key);
const fill=new THREE.DirectionalLight(0xe4e8f2,.65);fill.position.set(3,.5,2);scene.add(fill);
const rim=new THREE.DirectionalLight(0xffffff,.9);rim.position.set(0,2,-3);scene.add(rim);

const cols=58,rows=66,count=cols*rows,W=3.25,H=3.15,TOP=1.58;
const pos=new Float32Array(count*3),prev=new Float32Array(count*3),uv:number[]=[],indices:number[]=[];
const A:number[]=[],B:number[]=[],rest:number[]=[],kind:number[]=[];
const id=(x:number,y:number)=>y*cols+x;
function link(a:number,b:number,k:number){const p=a*3,q=b*3;A.push(a);B.push(b);rest.push(Math.hypot(pos[q]-pos[p],pos[q+1]-pos[p+1],pos[q+2]-pos[p+2]));kind.push(k);}
function initPose(){for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){const i=id(x,y),u=x/(cols-1),v=y/(rows-1);pos[i*3]=(u-.5)*W*(1-.035*v);pos[i*3+1]=TOP-v*H-.045*Math.sin(u*Math.PI)*v;pos[i*3+2]=.035*Math.sin(u*Math.PI*2)*(.25+.75*v)+.018*Math.sin(v*Math.PI*3)*Math.sin(u*Math.PI);prev.set(pos.subarray(i*3,i*3+3),i*3);}}
initPose();
for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){const a=id(x,y),u=x/(cols-1),v=y/(rows-1);uv.push(u,1-v);if(x<cols-1&&y<rows-1){const b=id(x+1,y),c=id(x,y+1),d=id(x+1,y+1);indices.push(a,c,b,b,c,d);}if(x<cols-1)link(a,id(x+1,y),0);if(y<rows-1)link(a,id(x,y+1),0);if(x<cols-1&&y<rows-1){link(a,id(x+1,y+1),1);link(id(x+1,y),id(x,y+1),1);}if(x<cols-2)link(a,id(x+2,y),2);if(y<rows-2)link(a,id(x,y+2),2);}
const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(pos,3).setUsage(THREE.DynamicDrawUsage));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.setIndex(indices);geometry.computeVertexNormals();
const material=new THREE.MeshPhysicalMaterial({color:0xffffff,roughness:.78,metalness:0,sheen:.62,sheenColor:new THREE.Color('#fff'),sheenRoughness:.92,clearcoat:.025,side:THREE.DoubleSide,transparent:true,alphaTest:.018,depthWrite:true});
const cloth=new THREE.Mesh(geometry,material);scene.add(cloth);
const pins=new Map<number,THREE.Vector3>();
function setPins(){pins.clear();for(const u of [.30,.70]){const i=id(Math.round(u*(cols-1)),Math.round(.095*(rows-1))),k=i*3;pins.set(i,new THREE.Vector3(pos[k],pos[k+1],pos[k+2]));}}
setPins();
let wind=.22,soft=.42,damping=.055,auto=true,time=0,gust=0,acc=0;
const h=1/120;
function reset(){initPose();setPins();acc=0;geometry.attributes.position.needsUpdate=true;geometry.computeVertexNormals();}
function substep(dt:number){const damp=Math.pow(1-damping,dt*60);for(let i=0;i<count;i++){const k=i*3,p=pins.get(i);if(p){pos[k]=p.x;pos[k+1]=p.y;pos[k+2]=p.z;prev[k]=p.x;prev[k+1]=p.y;prev[k+2]=p.z;continue;}const vx=(pos[k]-prev[k])*damp,vy=(pos[k+1]-prev[k+1])*damp,vz=(pos[k+2]-prev[k+2])*damp;prev[k]=pos[k];prev[k+1]=pos[k+1];prev[k+2]=pos[k+2];const u=(i%cols)/(cols-1),v=Math.floor(i/cols)/(rows-1),env=Math.sin(Math.PI*u)*(.22+.78*v),breeze=auto?(Math.sin(time*.82+u*3.2+v*2.1)*.55+Math.sin(time*.43-u*1.7+v*3.1)*.25):0,force=(breeze*wind+gust)*env;pos[k]+=vx+Math.sin(time*.6+v*2.4)*force*dt*dt*2.2;pos[k+1]+=vy-.16*dt*dt*(.25+v);pos[k+2]+=vz+force*dt*dt*8;}
for(let it=0;it<5;it++){for(let c=0;c<A.length;c++){const a=A[c],b=B[c],p=a*3,q=b*3,dx=pos[q]-pos[p],dy=pos[q+1]-pos[p+1],dz=pos[q+2]-pos[p+2],d=Math.hypot(dx,dy,dz)||1e-8,s=kind[c]===0?1:kind[c]===1?.82:.32,cor=(d-rest[c])/d*.5*soft*s,ox=dx*cor,oy=dy*cor,oz=dz*cor;if(!pins.has(a)){pos[p]+=ox;pos[p+1]+=oy;pos[p+2]+=oz;}if(!pins.has(b)){pos[q]-=ox;pos[q+1]-=oy;pos[q+2]-=oz;}}for(const [i,p] of pins){const k=i*3;pos[k]=p.x;pos[k+1]=p.y;pos[k+2]=p.z;}}gust*=.965;}
function step(dt:number){acc+=Math.min(dt,.05);let n=0;while(acc>=h&&n<6){time+=h;substep(h);acc-=h;n++;}if(n===6)acc=0;}
const loader=new THREE.TextureLoader();
function texture(url:string,done?:()=>void){loader.load(url,t=>{t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=renderer.capabilities.getMaxAnisotropy();material.map?.dispose();material.map=t;material.needsUpdate=true;reset();done?.();});}
texture(`${import.meta.env.BASE_URL}white-tshirt.webp`);
function kick(x:number,y:number,amount:number){let best=-1,bd=Infinity;for(let i=0;i<count;i++){if(pins.has(i))continue;const d=Math.hypot(pos[i*3]-x,pos[i*3+1]-y);if(d<bd){bd=d;best=i;}}if(best<0)return;const bx=pos[best*3],by=pos[best*3+1],r=.72;for(let i=0;i<count;i++){if(pins.has(i))continue;const k=i*3,d=Math.hypot(pos[k]-bx,pos[k+1]-by);if(d>r)continue;const f=(1-d/r)**2;prev[k]-=amount*f*.045;prev[k+2]-=amount*f*.1;}}
document.querySelector<HTMLInputElement>('#upload')!.addEventListener('change',e=>{const file=(e.target as HTMLInputElement).files?.[0];if(!file)return;const url=URL.createObjectURL(file);texture(url,()=>URL.revokeObjectURL(url));document.querySelector('#filename')!.textContent='当前：'+file.name;});
function range(id:string,set:(v:number)=>void,out:string){const el=document.querySelector<HTMLInputElement>('#'+id)!,o=document.querySelector<HTMLOutputElement>('#'+out)!;el.addEventListener('input',()=>{set(Number(el.value));o.value=Number(el.value).toFixed(2);});}
range('wind',v=>wind=v,'wind-value');range('soft',v=>soft=v,'soft-value');range('damp',v=>damping=v,'damp-value');
document.querySelector<HTMLInputElement>('#auto')!.addEventListener('change',e=>auto=(e.target as HTMLInputElement).checked);
document.querySelector('#gust')!.addEventListener('click',()=>{gust=.9;kick(0,-.35,1);});
document.querySelector('#reset')!.addEventListener('click',reset);
const ray=new THREE.Raycaster(),pointer=new THREE.Vector2();let dragging=false;
function pointerAt(e:PointerEvent){const r=renderer.domElement.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);}
renderer.domElement.addEventListener('pointerdown',e=>{pointerAt(e);ray.setFromCamera(pointer,camera);const hit=ray.intersectObject(cloth)[0];if(!hit)return;dragging=true;controls.enabled=false;renderer.domElement.setPointerCapture(e.pointerId);kick(hit.point.x,hit.point.y,1);e.stopImmediatePropagation();});
renderer.domElement.addEventListener('pointermove',e=>{if(!dragging)return;pointerAt(e);ray.setFromCamera(pointer,camera);const hit=ray.intersectObject(cloth)[0];if(hit)kick(hit.point.x,hit.point.y,.24);});
const stop=()=>{dragging=false;controls.enabled=true;};renderer.domElement.addEventListener('pointerup',stop);renderer.domElement.addEventListener('pointercancel',stop);
let last=performance.now(),frames=0,fpsStart=last;
function animate(now:number){const dt=Math.min((now-last)/1000,.05);last=now;step(dt);geometry.attributes.position.needsUpdate=true;geometry.computeVertexNormals();controls.update();renderer.render(scene,camera);frames++;if(now-fpsStart>1000){document.querySelector('#fps')!.textContent=Math.round(frames*1000/(now-fpsStart))+' FPS';frames=0;fpsStart=now;}requestAnimationFrame(animate);}
function resize(){const w=host.clientWidth,h=host.clientHeight;if(!w||!h)return;camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h);}
new ResizeObserver(resize).observe(host);requestAnimationFrame(animate);
