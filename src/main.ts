import './style.css'
import * as THREE from 'three'
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js'
import {freshState,install,launch,pickup,tickDanger,type GameState} from './game-state'

const assetRoot='/assets/kenney-space-kit/'
const assets=['astronautA','rover','rock_crystalsLargeA','rock_crystalsLargeB','rocket_baseA','rocket_fuelA','rocket_sidesA','rocket_finsA','rocket_topA','terrain','terrain_roadStraight','terrain_roadCorner','craterLarge','rock_largeA','rock_largeB','turret_single','structure_detailed','hangar_smallA','satelliteDish_large','platform_large','gate_simple','machine_generator','corridor_detailed','rail_middle'] as const
type Asset=typeof assets[number]

const scene=new THREE.Scene()
scene.background=new THREE.Color('#102837')
scene.fog=new THREE.FogExp2('#102837',.018)
const camera=new THREE.PerspectiveCamera(50,innerWidth/innerHeight,.1,160)
const renderer=new THREE.WebGLRenderer({antialias:true})
renderer.setPixelRatio(Math.min(devicePixelRatio,1.75))
renderer.setSize(innerWidth,innerHeight)
renderer.shadowMap.enabled=true
renderer.shadowMap.type=THREE.PCFSoftShadowMap
renderer.outputColorSpace=THREE.SRGBColorSpace
renderer.toneMapping=THREE.ACESFilmicToneMapping
renderer.toneMappingExposure=1.14
document.querySelector('#game')!.append(renderer.domElement)

scene.add(new THREE.HemisphereLight('#c9f0ff','#24303d',1.75))
const sun=new THREE.DirectionalLight('#ffd7ae',4.2)
sun.position.set(-16,24,12)
sun.castShadow=true
sun.shadow.mapSize.set(2048,2048)
sun.shadow.camera.left=-28;sun.shadow.camera.right=28;sun.shadow.camera.top=28;sun.shadow.camera.bottom=-28
scene.add(sun)
const rim=new THREE.DirectionalLight('#70d9ff',1.6)
rim.position.set(14,9,-20)
scene.add(rim)

const starsGeometry=new THREE.BufferGeometry()
const starPositions=new Float32Array(360)
for(let i=0;i<starPositions.length;i+=3){starPositions[i]=(Math.random()-.5)*130;starPositions[i+1]=18+Math.random()*44;starPositions[i+2]=-20-Math.random()*80}
starsGeometry.setAttribute('position',new THREE.BufferAttribute(starPositions,3))
scene.add(new THREE.Points(starsGeometry,new THREE.PointsMaterial({color:'#d8f5ff',size:.18,transparent:true,opacity:.75})))

const clock=new THREE.Clock(),loader=new GLTFLoader(),models=new Map<Asset,THREE.Object3D>(),keys=new Set<string>()
let state:GameState=freshState(),paused=false,player=new THREE.Group(),rocket=new THREE.Group(),rocketExhaust=new THREE.Group(),rocketParts:THREE.Object3D[]=[],cells:THREE.Object3D[]=[],cellBeacons:THREE.Group[]=[],turrets:THREE.Object3D[]=[],elapsed=0,boostHeat=0,boostLocked=false,movementScale=1
const startPosition=new THREE.Vector3(0,0,2),cellPositions=[new THREE.Vector3(0,0,-8),new THREE.Vector3(12,0,-20),new THREE.Vector3(-12,0,-34)],rocketPosition=new THREE.Vector3(0,0,7)
const $=(selector:string)=>document.querySelector<HTMLElement>(selector)!

function prepare(object:THREE.Object3D){object.traverse(child=>{if(child instanceof THREE.Mesh){child.castShadow=true;child.receiveShadow=true}});return object}
function clone(name:Asset,position:THREE.Vector3,scale=1,rotation=0){const object=prepare(models.get(name)!.clone(true));object.position.copy(position);object.scale.setScalar(scale);object.rotation.y=rotation;scene.add(object);return object}
function accent(position:THREE.Vector3,color:string,intensity=4,distance=11){const light=new THREE.PointLight(color,intensity,distance,2);light.position.copy(position);scene.add(light);return light}
function createBeacon(position:THREE.Vector3,color:string){const group=new THREE.Group();group.position.copy(position);const material=new THREE.MeshBasicMaterial({color,transparent:true,opacity:.82});const ring=new THREE.Mesh(new THREE.TorusGeometry(1.28,.065,8,32),material);ring.rotation.x=Math.PI/2;ring.position.y=.1;group.add(ring);const beam=new THREE.Mesh(new THREE.CylinderGeometry(.1,.34,4.8,12,1,true),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.18,depthWrite:false}));beam.position.y=2.4;group.add(beam);const marker=new THREE.Mesh(new THREE.OctahedronGeometry(.22),material);marker.position.y=4.9;group.add(marker);const light=new THREE.PointLight(color,5.8,8,2);light.position.y=1.2;group.add(light);scene.add(group);return group}

async function load(){await Promise.all(assets.map(async name=>{const gltf=await loader.loadAsync(`${assetRoot}${name}.glb`);models.set(name,prepare(gltf.scene));$('#load-status').textContent=`Loading Kenney Space Kit · ${models.size}/${assets.length}`}));buildWorld();reset();$('#loading').hidden=true;$('#hud').hidden=false;animate()}

function buildWorld(){
  for(let z=-40;z<=10;z+=10)for(let x=-20;x<=20;x+=10){const tile=clone('terrain',new THREE.Vector3(x,-.35,z),10,((x+z)/10%2)*Math.PI/2);tile.position.y=-.4}
  for(let z=-33;z<=7;z+=5)clone('terrain_roadStraight',new THREE.Vector3(0,-.2,z),5)
  clone('terrain_roadCorner',new THREE.Vector3(5,-.18,-18),5,Math.PI/2)
  clone('terrain_roadCorner',new THREE.Vector3(-5,-.18,-30),5,-Math.PI/2)

  clone('platform_large',rocketPosition.clone().setY(-.08),4.2)
  clone('structure_detailed',new THREE.Vector3(-8.5,0,4.5),3.25,.18)
  clone('hangar_smallA',new THREE.Vector3(9.5,0,-7),3.5,-.18)
  clone('satelliteDish_large',new THREE.Vector3(-10.5,0,-18),3.45,.35)
  clone('machine_generator',new THREE.Vector3(7.2,0,4),2.45,-.3)
  clone('corridor_detailed',new THREE.Vector3(-7.6,0,-7),2.65,Math.PI/2)
  clone('corridor_detailed',new THREE.Vector3(8,0,-24),2.55,-Math.PI/2)
  clone('gate_simple',new THREE.Vector3(0,0,-3.6),2.35)
  clone('gate_simple',new THREE.Vector3(0,0,-27.5),2.2)
  clone('rover',new THREE.Vector3(4,0,1),2.45,-.55)
  clone('rover',new THREE.Vector3(-6.8,0,-22),2.15,.75)

  ;[[-4,-4],[4,-4],[-5,-12],[5,-12],[-5,-20],[5,-20],[-5,-28],[5,-28]].forEach(([x,z],i)=>clone('rail_middle',new THREE.Vector3(x,0,z),1.4,i%2?Math.PI:0))
  clone('craterLarge',new THREE.Vector3(10,-.08,-30),5)
  ;[[-8,-11],[8,-15],[-7,-25],[7,-35],[-13,-6],[13,-16]].forEach(([x,z],i)=>clone(i%2?'rock_largeB':'rock_largeA',new THREE.Vector3(x,0,z),2.8,(i*.9)%Math.PI))
  turrets=[clone('turret_single',new THREE.Vector3(7,0,-25),2.55,-.4),clone('turret_single',new THREE.Vector3(-7,0,-32),2.55,.4)]

  accent(new THREE.Vector3(0,3,6),'#ff9a5f',5.2,15)
  accent(new THREE.Vector3(-8,2.2,3),'#78ddff',4.2,12)
  accent(new THREE.Vector3(9,2,-8),'#ffd16e',3.4,12)
  accent(new THREE.Vector3(-10,3,-18),'#73bfff',3.6,13)

  rocket.position.copy(rocketPosition);scene.add(rocket)
  for(const name of ['rocket_baseA','rocket_sidesA'] as Asset[]){const part=prepare(models.get(name)!.clone(true));part.scale.setScalar(2.55);rocket.add(part)}
  rocketParts=(['rocket_fuelA','rocket_finsA','rocket_topA'] as Asset[]).map((name,i)=>{const part=prepare(models.get(name)!.clone(true));part.scale.setScalar(2.55);part.position.y=i*.9;part.visible=false;rocket.add(part);return part})
  const outerFlame=new THREE.Mesh(new THREE.ConeGeometry(.72,4.2,18),new THREE.MeshBasicMaterial({color:'#ff7a35',transparent:true,opacity:.72,depthWrite:false,side:THREE.DoubleSide}));outerFlame.rotation.z=Math.PI;outerFlame.position.y=-2.3;rocketExhaust.add(outerFlame)
  const innerFlame=new THREE.Mesh(new THREE.ConeGeometry(.32,3.1,14),new THREE.MeshBasicMaterial({color:'#fff2a8',transparent:true,opacity:.92,depthWrite:false,side:THREE.DoubleSide}));innerFlame.rotation.z=Math.PI;innerFlame.position.y=-1.75;rocketExhaust.add(innerFlame)
  const exhaustLight=new THREE.PointLight('#ff9c52',7,14,2);exhaustLight.position.y=-1.2;rocketExhaust.add(exhaustLight);rocketExhaust.visible=false;rocket.add(rocketExhaust)
  player.add(prepare(models.get('astronautA')!.clone(true)));player.scale.setScalar(2.2);scene.add(player)
  cells=cellPositions.map((position,i)=>clone(i===1?'rock_crystalsLargeB':'rock_crystalsLargeA',position,2.65,i*.7))
  cellBeacons=cellPositions.map((position,i)=>createBeacon(position.clone(),i===1?'#ffb158':'#6ef3ff'))
}

function reset(){state=freshState();elapsed=0;boostHeat=0;boostLocked=false;paused=false;player.position.copy(startPosition);player.rotation.set(0,0,0);cells.forEach((cell,i)=>{cell.position.copy(cellPositions[i]);cell.visible=true;cellBeacons[i].visible=true});rocketParts.forEach(part=>part.visible=false);rocketExhaust.visible=false;rocket.position.copy(rocketPosition);rocket.rotation.set(0,0,0);camera.position.set(startPosition.x+8.8,8.2,startPosition.z+11.5);camera.lookAt(startPosition.x,startPosition.y+1.4,startPosition.z-2.5);$('#terminal').hidden=true;$('#pause').hidden=true;document.body.classList.remove('mission-complete');updateHud()}
function nearbyCell(){return cells.findIndex((cell,i)=>!state.collected[i]&&cell.position.distanceTo(player.position)<3.2)}
function interact(){if(state.phase!=='playing')return;const cell=nearbyCell();if(cell>=0&&state.carrying===null){state=pickup(state,cell);cells[cell].visible=false;cellBeacons[cell].visible=false;chirp(620);updateHud();return}if(state.carrying!==null&&player.position.distanceTo(rocketPosition)<4.8){state=install(state);rocketParts[state.installed-1].visible=true;chirp(880);updateHud();return}if(state.installed===3&&player.position.distanceTo(rocketPosition)<4.8){state=launch(state);chirp(1100);finish()}}
function chirp(frequency:number){const ctx=new AudioContext(),osc=ctx.createOscillator(),gain=ctx.createGain();osc.frequency.value=frequency;gain.gain.setValueAtTime(.045,ctx.currentTime);gain.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+.12);osc.connect(gain).connect(ctx.destination);osc.start();osc.stop(ctx.currentTime+.13)}
function updateHud(){$('#cells').textContent=`${state.installed} / 3`;$('#shield').textContent=Math.ceil(state.shield).toString();$('#heat').textContent=boostLocked?'COOL':Math.ceil(boostHeat).toString();$('#timer-wrap').hidden=state.dustSeconds===null;$('#timer').textContent=Math.ceil(state.dustSeconds??60).toString();$('#objective').textContent=state.installed===3?'Return to the launch platform · press E':state.carrying!==null?'Carry the glowing cell back to the rocket':`Follow the beacon · recover cell ${state.installed+1}`}
function finish(){const success=state.phase==='completed',duration=Math.max(1,Math.round(elapsed));if(success){rocketExhaust.visible=true;rocket.position.y=3.2;camera.position.set(rocketPosition.x+14,11.2,rocketPosition.z+18);camera.lookAt(rocketPosition.x,rocket.position.y+1.5,rocketPosition.z)}$('#terminal-tag').textContent=success?'MISSION COMPLETE':'SIGNAL LOST';$('#terminal-title').textContent=success?'Eos-7 is online':state.phase==='failed_timer'?'The dust front arrived':'Your shield collapsed';$('#terminal-copy').textContent=success?`The relay wakes. Three physical signal cells installed in ${duration} ${duration===1?'second':'seconds'}.`:'Press R to reset every system and try a safer route.';$('#terminal').hidden=false;document.body.classList.toggle('mission-complete',success)}
function movementBasis(){const forward=new THREE.Vector3();camera.getWorldDirection(forward);forward.y=0;forward.normalize();const right=new THREE.Vector3().crossVectors(forward,new THREE.Vector3(0,1,0)).normalize();return{forward,right}}
function move(dt:number){
  if(paused||state.phase!=='playing')return
  const forwardInput=(keys.has('KeyW')||keys.has('ArrowUp')?1:0)-(keys.has('KeyS')||keys.has('ArrowDown')?1:0)
  const rightInput=(keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0)
  const {forward,right}=movementBasis()
  const direction=forward.multiplyScalar(forwardInput).add(right.multiplyScalar(rightInput))
  const wantsBoost=keys.has('ShiftLeft')||keys.has('ShiftRight')
  const boosting=wantsBoost&&!boostLocked&&direction.lengthSq()>0
  if(boosting){boostHeat=Math.min(100,boostHeat+34*dt);if(boostHeat>=100)boostLocked=true}else{boostHeat=Math.max(0,boostHeat-22*dt);if(boostLocked&&boostHeat<=18)boostLocked=false}
  const avatar=player.children[0]
  if(direction.lengthSq()){
    direction.normalize();const speed=(boosting?6.8:4.2)*movementScale
    player.position.addScaledVector(direction,speed*dt);player.position.y=0
    player.position.x=THREE.MathUtils.clamp(player.position.x,-19,19);player.position.z=THREE.MathUtils.clamp(player.position.z,-39,9)
    player.rotation.y=Math.atan2(direction.x,direction.z);player.rotation.z=THREE.MathUtils.lerp(player.rotation.z,-rightInput*.07,.12)
    if(avatar){avatar.position.y=Math.abs(Math.sin(elapsed*8))*.075;avatar.rotation.z=Math.sin(elapsed*8)*.025}
  }else{
    player.position.y=0;player.rotation.z*=.82
    if(avatar){avatar.position.y=THREE.MathUtils.lerp(avatar.position.y,0,.22);avatar.rotation.z*=.78}
  }
  const inDanger=turrets.some(turret=>turret.position.distanceTo(player.position)<7);state=tickDanger(state,dt,inDanger?12*dt:0);if(state.phase!=='playing')finish()
}
function animate(){requestAnimationFrame(animate);const dt=Math.min(clock.getDelta(),.05);if(!paused&&state.phase==='playing')elapsed+=dt;move(dt);cells.forEach((cell,i)=>{cell.rotation.y+=dt*.8;cell.position.y=cellPositions[i].y+.25+Math.sin(elapsed*2+i)*.16;cellBeacons[i].rotation.y+=dt*.55});if(state.phase==='completed'){rocket.position.y+=dt*2.5;rocket.rotation.y+=dt*.5}if(state.phase==='playing'){const target=new THREE.Vector3(player.position.x+8.8,player.position.y+8.2,player.position.z+11.5);camera.position.lerp(target,1-Math.pow(.0005,dt));camera.lookAt(player.position.x,player.position.y+1.4,player.position.z-2.5)}else if(state.phase==='completed'){const target=new THREE.Vector3(rocket.position.x+14,rocket.position.y+11.2,rocket.position.z+18);camera.position.lerp(target,1-Math.pow(.0005,dt));camera.lookAt(rocket.position.x,rocket.position.y+1.5,rocket.position.z)}const cell=nearbyCell();let prompt='';if(state.phase==='playing'){if(cell>=0&&state.carrying===null)prompt='E · PICK UP SIGNAL CELL';else if(player.position.distanceTo(rocketPosition)<4.8&&state.carrying!==null)prompt='E · INSTALL CELL';else if(player.position.distanceTo(rocketPosition)<4.8&&state.installed===3)prompt='E · LAUNCH'}$('#prompt').textContent=prompt;$('#prompt').classList.toggle('visible',Boolean(prompt));updateHud();renderer.render(scene,camera)}

addEventListener('keydown',event=>{keys.add(event.code);if(event.code==='KeyE'&&!event.repeat)interact();if(event.code==='KeyR')reset();if(event.code==='Escape'){paused=!paused;$('#pause').hidden=!paused}})
addEventListener('keyup',event=>keys.delete(event.code))
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight)})
$('#restart').addEventListener('click',reset)
Object.assign(window,{__EOS7__:{getState:()=>structuredClone(state),getPlayerPosition:()=>({x:player.position.x,z:player.position.z}),getMovementBasis:()=>{const {forward,right}=movementBasis();return{forward:{x:forward.x,z:forward.z},right:{x:right.x,z:right.z}}},setMovementScale:(scale:number)=>{movementScale=THREE.MathUtils.clamp(scale,1,8)},teleport:(x:number,z:number)=>player.position.set(x,0,z),interact,reset}})
load().catch(error=>{console.error(error);$('#load-status').textContent=`Asset load failed: ${error instanceof Error?error.message:String(error)}`})
