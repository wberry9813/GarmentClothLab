import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import './garment.css';

type Preset = 'tshirt' | 'cape';
const root = document.querySelector<HTMLDivElement>('#garment-app')!;
root.innerHTML = `
<header class="topbar"><div><div class="eyebrow">GARMENT CLOTH LAB / 01</div><h1>Garment Motion</h1></div><div class="status"><i></i> LOCAL PHYSICS · NO CLOUD</div></header>
<main class="layout"><section class="stage"><div class="stage-note"><span>LIVE SIMULATION</span><span id="fps">60 FPS</span></div><div id="viewport"></div><div class="stage-hint">拖动衣物施加外力 · 拖动空白区域旋转视角</div></section>
<aside class="panel"><section><div class="section-label">GARMENT PRESET</div><div class="preset-row"><button class="preset active" data-preset="tshirt"><span class="swatch"></span><b>T-shirt</b><small>棉质 · 肩部悬挂</small></button><button class="preset" data-preset="cape"><span class="swatch cape"></span><b>Cape</b><small>轻薄 · 颈部悬挂</small></button></div></section>
<section><div class="section-label">YOUR GARMENT</div><label class="upload"><input id="upload" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml"><span>＋</span><div><b>导入服装图片</b><small>推荐透明背景 PNG / SVG</small></div></label><div id="filename" class="filename">当前：演示白色棉质 T 恤</div></section>
<section><div class="section-label">FABRIC PHYSICS</div><label class="control"><span>风力 <output id="wind-value">0.35</output></span><input id="wind" type="range" min="0" max="2" step="0.01" value="0.35"></label><label class="control"><span>约束强度 <output id="soft-value">0.58</output></span><input id="soft" type="range" min="0.15" max="1" step="0.01" value="0.58"></label><label class="control"><span>阻尼 <output id="damp-value">0.035</output></span><input id="damp" type="range" min="0.005" max="0.12" step="0.001" value="0.035"></label><label class="toggle"><input id="auto" type="checkbox" checked><span>持续微风</span></label></section>
<section class="actions"><button id="impulse" class="primary">施加轻风</button><button id="reset" class="secondary">重置悬挂</button></section><p class="disclaimer">原型说明：服装轮廓纹理映射到三维布料网格。当前尚未实现自动服装识别、真实裁片缝合和自碰撞；不透明照片会连同背景一起变形。</p></aside></main>
<footer>GarmentClothLab · Prototype 0.1 <span>Three.js + Verlet cloth · Runs entirely in your browser</span></footer>`;

const viewport = document.querySelector<HTMLDivElement>('#viewport')!;
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
renderer.setSize(viewport.clientWidth, viewport.clientHeight);
renderer.setClearColor('#eeeae4'); renderer.outputColorSpace = THREE.SRGBColorSpace;
viewport.appendChild(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(35, viewport.clientWidth / viewport.clientHeight, .1, 50);
camera.position.set(0, .05, 5.5);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; controls.dampingFactor = .075; controls.enablePan = false; controls.minDistance = 3.7; controls.maxDistance = 8;
scene.add(new THREE.HemisphereLight(0xffffff, 0xb2a99d, 2));
const key = new THREE.DirectionalLight(0xffffff, 2.2); key.position.set(-2, 3, 4); scene.add(key);
const rim = new THREE.DirectionalLight(0xd7c9ef, 1); rim.position.set(3, 1, -2); scene.add(rim);

const hanger = new THREE.Group();
const hp = [new THREE.Vector3(0,1.63,0),new THREE.Vector3(0,1.82,0),new THREE.Vector3(0,1.82,0),new THREE.Vector3(-.12,1.72,0),new THREE.Vector3(-.12,1.72,0),new THREE.Vector3(-.88,1.36,0),new THREE.Vector3(-.88,1.36,0),new THREE.Vector3(0,1.22,0),new THREE.Vector3(0,1.22,0),new THREE.Vector3(.88,1.36,0),new THREE.Vector3(.88,1.36,0),new THREE.Vector3(.12,1.72,0),new THREE.Vector3(.12,1.72,0),new THREE.Vector3(0,1.82,0)];
hanger.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(hp),new THREE.LineBasicMaterial({color:0x71685e}))); scene.add(hanger);

const cols=43, rows=55, count=cols*rows, w=2.05, h=2.55;
const pos=new Float32Array(count*3), prev=new Float32Array(count*3), uv:number[]=[], indices:number[]=[];
const ea:number[]=[], eb:number[]=[], rest:number[]=[], strength:number[]=[];
const idx=(x:number,y:number)=>y*cols+x;
function constraint(a:number,b:number,s:number){ea.push(a);eb.push(b);const ax=pos[a*3],ay=pos[a*3+1],az=pos[a*3+2],bx=pos[b*3],by=pos[b*3+1],bz=pos[b*3+2];rest.push(Math.hypot(bx-ax,by-ay,bz-az));strength.push(s);}
for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){const i=idx(x,y),u=x/(cols-1),v=y/(rows-1);pos[i*3]=(u-.5)*w;pos[i*3+1]=1.12-v*h;pos[i*3+2]=.012*Math.sin(u*9)*Math.sin(v*4);prev.set(pos.subarray(i*3,i*3+3),i*3);uv.push(u,1-v);if(x<cols-1&&y<rows-1){const a=idx(x,y),b=idx(x+1,y),c=idx(x,y+1),d=idx(x+1,y+1);indices.push(a,c,b,b,c,d);}if(x<cols-1)constraint(idx(x,y),idx(x+1,y),1);if(y<rows-1)constraint(idx(x,y),idx(x,y+1),1);if(x<cols-1&&y<rows-1){constraint(idx(x,y),idx(x+1,y+1),.72);constraint(idx(x+1,y),idx(x,y+1),.72);}if(x<cols-2)constraint(idx(x,y),idx(x+2,y),.32);if(y<rows-2)constraint(idx(x,y),idx(x,y+2),.32);}
const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(pos,3).setUsage(THREE.DynamicDrawUsage));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.setIndex(indices);geo.computeVertexNormals();
const material=new THREE.MeshPhysicalMaterial({color:0xffffff,transparent:true,alphaTest:.025,side:THREE.DoubleSide,roughness:.86,metalness:0,sheen:.45,sheenRoughness:.9});
const garment=new THREE.Mesh(geo,material);garment.position.y=-.03;scene.add(garment);

let preset:Preset='tshirt',wind=.35,softness=.58,damping=.035,autoWind=true,time=0,impulse=0;
const pins=new Map<number,THREE.Vector3>();
function setPins(){pins.clear();for(const u of (preset==='tshirt'?[.34,.66]:[.28,.72])){const x=Math.round(u*(cols-1)),y=2,i=idx(x,y);pins.set(i,new THREE.Vector3(pos[i*3],pos[i*3+1],pos[i*3+2]));}}
function reset(){for(let i=0;i<count;i++){const u=(i%cols)/(cols-1),v=Math.floor(i/cols)/(rows-1);pos[i*3]=(u-.5)*w;pos[i*3+1]=1.12-v*h;pos[i*3+2]=.012*Math.sin(u*9)*Math.sin(v*4);}prev.set(pos);setPins();}
function step(dt:number){const damp=Math.pow(1-damping,dt*60);for(let i=0;i<count;i++){const k=i*3;if(pins.has(i)){const p=pins.get(i)!;pos[k]=p.x;pos[k+1]=p.y;pos[k+2]=p.z;prev[k]=p.x;prev[k+1]=p.y;prev[k+2]=p.z;continue;}const vx=(pos[k]-prev[k])*damp,vy=(pos[k+1]-prev[k+1])*damp,vz=(pos[k+2]-prev[k+2])*damp;prev[k]=pos[k];prev[k+1]=pos[k+1];prev[k+2]=pos[k+2];const u=(i%cols)/(cols-1),v=Math.floor(i/cols)/(rows-1),gust=autoWind?Math.sin(time*1.45+u*5.5+v*2.4)*.5+.5:.08;pos[k]+=vx+Math.sin(time*.7+v*3)*wind*gust*dt*.018;pos[k+1]+=vy-9.8*dt*dt*.65;pos[k+2]+=vz+(wind*gust+impulse)*Math.sin(u*Math.PI)*dt*.035;}for(let it=0;it<6;it++){for(let c=0;c<ea.length;c++){const a=ea[c],b=eb[c],ia=a*3,ib=b*3,dx=pos[ib]-pos[ia],dy=pos[ib+1]-pos[ia+1],dz=pos[ib+2]-pos[ia+2],d=Math.hypot(dx,dy,dz)||1e-8,cor=((d-rest[c])/d)*.5*softness*strength[c],ox=dx*cor,oy=dy*cor,oz=dz*cor;if(!pins.has(a)){pos[ia]+=ox;pos[ia+1]+=oy;pos[ia+2]+=oz;}if(!pins.has(b)){pos[ib]-=ox;pos[ib+1]-=oy;pos[ib+2]-=oz;}}for(const [i,p] of pins){const k=i*3;pos[k]=p.x;pos[k+1]=p.y;pos[k+2]=p.z;}}impulse*=.965;}
function kickAt(x:number,y:number,amount:number){let best=0,bd=Infinity;for(let i=0;i<count;i++){const d=Math.hypot(pos[i*3]-x,pos[i*3+1]-y);if(d<bd){bd=d;best=i;}}const bx=pos[best*3],by=pos[best*3+1];for(let i=0;i<count;i++){const k=i*3,d=Math.hypot(pos[k]-bx,pos[k+1]-by);if(d>.62||pins.has(i))continue;const f=1-d/.62;prev[k]-=amount*f*.11;prev[k+1]+=amount*f*.05;prev[k+2]-=amount*f*.14;}}
const loader=new THREE.TextureLoader();
function setTexture(url:string){loader.load(url,t=>{t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=renderer.capabilities.getMaxAnisotropy();material.map?.dispose();material.map=t;material.needsUpdate=true;reset();});}
function loadPreset(p:Preset){preset=p;setTexture(`${import.meta.env.BASE_URL}demo-${p}.svg`);document.querySelectorAll<HTMLButtonElement>('.preset').forEach(b=>b.classList.toggle('active',b.dataset.preset===p));document.querySelector('#filename')!.textContent=p==='tshirt'?'当前：演示白色棉质 T 恤':'当前：演示多层披风';reset();}
document.querySelectorAll<HTMLButtonElement>('.preset').forEach(b=>b.addEventListener('click',()=>loadPreset(b.dataset.preset as Preset)));
document.querySelector<HTMLInputElement>('#upload')!.addEventListener('change',e=>{const file=(e.target as HTMLInputElement).files?.[0];if(!file)return;const url=URL.createObjectURL(file);loader.load(url,t=>{URL.revokeObjectURL(url);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=renderer.capabilities.getMaxAnisotropy();material.map?.dispose();material.map=t;material.needsUpdate=true;document.querySelector('#filename')!.textContent=`当前：${file.name}`;reset();},undefined,()=>URL.revokeObjectURL(url));});
function range(id:string,fn:(n:number)=>void,out:string){const input=document.querySelector<HTMLInputElement>('#'+id)!,output=document.querySelector<HTMLOutputElement>('#'+out)!;input.addEventListener('input',()=>{const n=Number(input.value);fn(n);output.value=n.toFixed(2);});}
range('wind',n=>wind=n,'wind-value');range('soft',n=>softness=n,'soft-value');range('damp',n=>damping=n,'damp-value');
document.querySelector<HTMLInputElement>('#auto')!.addEventListener('change',e=>autoWind=(e.target as HTMLInputElement).checked);
document.querySelector('#impulse')!.addEventListener('click',()=>{impulse=1.5;kickAt(0,.1,1.4);});document.querySelector('#reset')!.addEventListener('click',reset);
const ray=new THREE.Raycaster(),pointer=new THREE.Vector2();let dragging=false;
function setPointer(e:PointerEvent){const r=renderer.domElement.getBoundingClientRect();pointer.set(((e.clientX-r.left)/r.width)*2-1,-((e.clientY-r.top)/r.height)*2+1);}
renderer.domElement.addEventListener('pointerdown',e=>{setPointer(e);ray.setFromCamera(pointer,camera);const hit=ray.intersectObject(garment)[0];if(hit){dragging=true;controls.enabled=false;renderer.domElement.setPointerCapture(e.pointerId);kickAt(hit.point.x,hit.point.y,1.2);e.stopImmediatePropagation();}});
renderer.domElement.addEventListener('pointermove',e=>{if(!dragging)return;setPointer(e);ray.setFromCamera(pointer,camera);const hit=ray.intersectObject(garment)[0];if(hit)kickAt(hit.point.x,hit.point.y,.3);});
const stopDrag=()=>{dragging=false;controls.enabled=true;};renderer.domElement.addEventListener('pointerup',stopDrag);renderer.domElement.addEventListener('pointercancel',stopDrag);
let last=performance.now(),frames=0,fpsStart=last;
function animate(now:number){const dt=Math.min((now-last)/1000,.033);last=now;time+=dt;step(dt);geo.attributes.position.needsUpdate=true;geo.computeVertexNormals();controls.update();renderer.render(scene,camera);frames++;if(now-fpsStart>1000){document.querySelector('#fps')!.textContent=`${Math.round(frames*1000/(now-fpsStart))} FPS`;frames=0;fpsStart=now;}requestAnimationFrame(animate);}
function resize(){const rw=viewport.clientWidth,rh=viewport.clientHeight;if(!rw||!rh)return;camera.aspect=rw/rh;camera.updateProjectionMatrix();renderer.setSize(rw,rh);}
new ResizeObserver(resize).observe(viewport);loadPreset('tshirt');requestAnimationFrame(animate);
