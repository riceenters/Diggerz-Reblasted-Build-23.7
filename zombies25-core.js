'use strict';
// Build 25 Zombies core: independent, server-authoritative solo state machine.
// Uses native Diggerz tile map coordinates, not a new map format.
const BOX_ITEMS = [
  {id:'musket-z',name:'Zombie Musket',damage:35,cooldown:1450},
  {id:'grenade-z',name:'Zombie Grenade Launcher',damage:46,cooldown:900},
  {id:'mortar-z',name:'Zombie Mortar',damage:50,cooldown:1050},
  {id:'homing-z',name:'Zombie Homing Mortar',damage:52,cooldown:1300},
  {id:'beta-z',name:'Zombie Beta Gun',damage:76,cooldown:600},
  {id:'light-z',name:'Zombie Light Gun',damage:115,cooldown:400,range:Infinity}
];
const STARTER={id:'shotgun-z',name:'Zombie Shotgun',damage:14,cooldown:950};
const POWERUPS=['DOUBLE POINTS!','FIRE SALE!','NUKE!','INSTA-KILL','DEATH MACHINE!'];
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
function surfaces(map) {
  const tiles=new Set((map.tiles||[]).filter(t=>Array.isArray(t)&&t[2]>0).map(t=>t[0]+','+t[1]));
  const result=[];
  for(let x=2;x<126;x++)for(let y=2;y<78;y++) {
    if(tiles.has(x+','+y) && !tiles.has(x+','+(y-1)) && !tiles.has(x+','+(y-2)))result.push({x:x+0.5,y:y-1});
  }
  return result;
}
class ZombiesRun {
  constructor(map,emit,options={}) {
    if(!map||map.format!=='diggerz-pvp-map-v1'||map.width!==128||map.height!==80)throw Error('Invalid Diggerz map');
    this.map=map;this.emit=emit;this.rng=options.rng||Math.random;this.time=0;this.phase='countdown';this.countdown=10;
    this.wave=0;this.survived=0;this.points=0;this.totalPoints=0;this.kills=0;this.coins=0;
    this.player={x:64,y:44,hp:100};this.guns=[{...STARTER}];this.active=0;
    this.zombies=[];this.drops=[];this.power={};this.nextId=1;this.lastShot=-10000;
    this.ground=surfaces(map);this.box={x:64,y:43,state:'closed',price:950,selection:null,openingUntil:0,needsPickup:false};
    this._placeBox();this._emit('init',{mapName:map.name,box:this.box,inventory:this.guns,points:0});
  }
  _emit(type,data={}){this.emit({t:'zombies-'+type,...data})}
  _pick(a){return a[Math.floor(this.rng()*a.length)]}
  _placeBox(){const spots=this.ground.filter(p=>p.x>18&&p.x<110&&p.y>20);const p=this._pick(spots.length?spots:this.ground);if(p){this.box.x=p.x;this.box.y=p.y;}}
  beginWave(){
    this.wave++;this.phase='wave';this.pending=4+this.wave*3;this.spawnTimer=0;this._emit('wave',{wave:this.wave,remaining:this.pending});
  }
  tick(dt){
    if(this.phase==='over')return;dt=clamp(Number(dt)||0,0,0.2);this.time+=dt;
    if(this.phase==='countdown'){const old=Math.ceil(this.countdown);this.countdown-=dt;if(Math.ceil(this.countdown)!==old)this._emit('countdown',{seconds:Math.max(0,Math.ceil(this.countdown))});if(this.countdown<=0)this.beginWave();return;}
    if(this.phase==='intermission'){this.intermission-=dt;if(this.intermission<=0)this.beginWave();return;}
    for(const key of Object.keys(this.power))if(this.power[key]<=this.time)delete this.power[key];
    if(this.box.state==='opening'&&this.time>=this.box.openingUntil){this.box.state='ready';this.box.needsPickup=true;this._emit('box',{...this.box});}
    this.spawnTimer-=dt;
    if(this.pending>0&&this.spawnTimer<=0&&this.zombies.length<Math.min(32,8+this.wave*2)){
      this.spawnTimer=Math.max(.35,1.7-this.wave*.08);this.pending--;this._spawn();
    }
    for(const z of this.zombies){
      if(z.hp<=0)continue;
      const dx=this.player.x-z.x,dy=this.player.y-z.y;
      const movement=clamp(dx,-1,1)*Math.min(Math.abs(dx),(.7+this.wave*.035)*dt);
      z.x+=movement;z.state=Math.abs(dx)>.8?'walk':'attack';
      if(Math.abs(dx)<1.1&&Math.abs(dy)<2&&this.time>=z.attackAt){
        z.attackAt=this.time+1.25;
        this.player.hp=Math.max(0,this.player.hp-(8+this.wave*2));this._emit('hit',{hp:this.player.hp,damage:8+this.wave*2,zombie:z.id});
        if(this.player.hp===0){this.finish();return;}
      }
    }
    this.zombies=this.zombies.filter(z=>z.hp>0);
    this.drops=this.drops.filter(d=>d.expires>this.time);
    if(this.pending===0&&this.zombies.length===0){
      this.survived=this.wave;this.phase='intermission';this.intermission=5;this._emit('wave-cleared',{wave:this.wave,coinsPreview:this.survived*3});
    }
    this._emit('state',{wave:this.wave,zombies:this.zombies,player:this.player,points:this.points,drops:this.drops,box:this.box,power:this.power,inventory:this.guns,phase:this.phase});
  }
  _spawn(){
    const p=this._pick(this.ground.filter(p=>Math.abs(p.x-this.player.x)>12))||this._pick(this.ground);
    if(!p)return;
    const z={id:this.nextId++,x:p.x,y:p.y,hp:55+this.wave*14,maxHp:55+this.wave*14,state:'idle',attackAt:this.time+1};
    this.zombies.push(z);this._emit('spawn',{zombie:z});
  }
  move(x,y){if(this.phase==='over')return;const nx=Number(x),ny=Number(y);if(Number.isFinite(nx)&&Number.isFinite(ny)){this.player.x=clamp(nx,0,127);this.player.y=clamp(ny,0,79);}}
  fire(targetId){
    if(this.phase!=='wave')return {ok:false};
    const gun=this.guns[this.active];if(!gun)return {ok:false};
    const rate=this.power['DEATH MACHINE!']?Math.min(gun.cooldown,100):gun.cooldown;
    if((this.time-this.lastShot)*1000<rate)return {ok:false};this.lastShot=this.time;
    const z=this.zombies.find(z=>z.id===targetId);
    if(!z)return {ok:false};
    const range=gun.range||18;if(Math.hypot(z.x-this.player.x,z.y-this.player.y)>range)return {ok:false};
    const damage=this.power['INSTA-KILL']?Infinity:gun.damage;
    z.hp-=damage;
    if(z.hp<=0)this._kill(z);this._emit('shot',{zombie:targetId,weapon:gun.id,damage});
    return {ok:true};
  }
  _kill(z){
    z.hp=0;this.kills++;const points=this.power['DOUBLE POINTS!']?200:100;
    this.points+=points;this.totalPoints+=points;this._emit('kill',{id:z.id,points,total:this.points});
    if(this.rng()<.095){const type=this._pick(POWERUPS);const d={id:this.nextId++,x:z.x,y:z.y,type,expires:this.time+15};this.drops.push(d);this._emit('drop',{drop:d});}
  }
  collect(id){
    const i=this.drops.findIndex(d=>d.id===id);if(i<0)return false;
    const d=this.drops[i];if(Math.hypot(d.x-this.player.x,d.y-this.player.y)>2.5)return false;
    this.drops.splice(i,1);
    if(d.type==='NUKE!'){for(const z of this.zombies.slice())this._kill(z);}
    else this.power[d.type]=this.time+(d.type==='FIRE SALE!'?30:25);
    this._emit('power',{name:d.type,until:this.power[d.type]||this.time,flash:d.type==='NUKE!'});
    return true;
  }
  boxInteract(){
    if(Math.hypot(this.box.x-this.player.x,this.box.y-this.player.y)>3)return {ok:false,reason:'too-far'};
    if(this.box.state==='ready'){
      const prize=this.box.selection;this.box.state='closed';this.box.needsPickup=false;
      if(prize==='teddy'){this._placeBox();this._emit('box',{...this.box,teddy:true});return {ok:true,teddy:true};}
      this.guns.push({...BOX_ITEMS.find(g=>g.id===prize)});this.active=this.guns.length-1;
      this._emit('weapon',{weapon:prize,inventory:this.guns});return {ok:true,weapon:prize};
    }
    if(this.box.state!=='closed')return {ok:false,reason:'busy'};
    const price=this.power['FIRE SALE!']?10:950;
    if(this.points<price)return {ok:false,reason:'not-enough-points'};
    this.points-=price;this.box.state='opening';this.box.openingUntil=this.time+3;
    this.box.selection=this.rng()<.12?'teddy':this._pick(BOX_ITEMS).id;
    this._emit('box',{...this.box,price});return {ok:true};
  }
  setActive(index){if(Number.isInteger(index)&&index>=0&&index<this.guns.length)this.active=index;}
  finish(){
    if(this.phase==='over')return;
    this.phase='over';const coins=this.survived*3;
    // Cosmetic eligibility is reported, never minted without the game's authoritative rewards system.
    this._emit('game-over',{wave:this.wave,wavesSurvived:this.survived,zombiesKilled:this.kills,pointsEarned:this.totalPoints,coins,cosmeticEligible:this.survived>=10});
  }
}
module.exports={ZombiesRun,BOX_ITEMS,POWERUPS,surfaces};
