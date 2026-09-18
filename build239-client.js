'use strict';
(function(){
  var BUILD='23.9';
  var RAILWAY='https://diggerz-multiplayer-test-production.up.railway.app';
  var HAT_ID=395;
  var HAT_SRC='data:image/webp;base64,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';
  var runtimePatched=false, tradePatched=false, uiReady=false, adminUiReady=false;

  function addSupportUI(){
    if(uiReady||document.getElementById('diggerz-support239'))return;
    uiReady=true;
    var style=document.createElement('style');
    style.id='diggerz-23-9-support-style';
    style.textContent=
      '#diggerz-support239{display:none;position:fixed;inset:0;z-index:2147483000;background:rgba(0,0,0,.78);align-items:center;justify-content:center;font-family:Arial Black,Impact,Arial,sans-serif;color:#fff}'+
      '#diggerz-support239.open{display:flex}'+
      '#diggerz-support239 .panel{position:relative;width:min(920px,94vw);max-height:90vh;overflow:auto;background:#171717;border:5px solid #f0c22d;box-shadow:0 0 0 4px #111,0 15px 60px #000;padding:22px;display:grid;grid-template-columns:minmax(0,1.35fr) minmax(220px,.8fr);gap:22px}'+
      '#diggerz-support239 h1{font-size:clamp(34px,6vw,70px);line-height:.9;margin:0 0 18px;text-transform:uppercase;letter-spacing:1px;text-shadow:4px 4px 0 #000}'+
      '#diggerz-support239 p{font-family:Arial,sans-serif;font-weight:700;line-height:1.45;font-size:17px}'+
      '#diggerz-support239 .amount{font-size:46px;text-align:center;margin:12px 0;text-shadow:3px 3px 0 #000}'+
      '#diggerz-support239 input[type=range]{width:100%;accent-color:#f0c22d}'+
      '#diggerz-support239 button{font:900 22px Arial Black,Impact,sans-serif;text-transform:uppercase;border:4px solid #111;background:#f0c22d;color:#111;padding:11px 16px;cursor:pointer;box-shadow:0 5px 0 #8a6800}'+
      '#diggerz-support239 .close{position:absolute;right:10px;top:10px;background:#d94a38;color:#fff;font-size:18px;padding:7px 13px;box-shadow:none;z-index:2}'+
      '#diggerz-support239 .board{background:#0d0d0d;border:3px solid #555;padding:14px}'+
      '#diggerz-support239 .board h2{margin:0 0 10px;font-size:28px}'+
      '#diggerz-support239 ol{font-family:Arial,sans-serif;font-weight:800;padding-left:28px;margin:8px 0}'+
      '#diggerz-support239 li{padding:7px 0;border-bottom:1px solid #333}'+
      '#diggerz-support239 .fine{font:12px Arial,sans-serif;color:#bbb;margin-top:12px}'+
      '#diggerz-hat239-layer{position:fixed;inset:0;pointer-events:none;z-index:9999;overflow:hidden}'+
      '.diggerz-update-hat239{position:absolute;height:auto;transform:translate(-50%,-100%);transform-origin:50% 100%;filter:drop-shadow(0 2px 1px rgba(0,0,0,.65))}'+
      '@media(max-width:720px){#diggerz-support239 .panel{grid-template-columns:1fr;padding:16px}}';
    document.head.appendChild(style);

    var box=document.createElement('div');
    box.id='diggerz-support239';
    box.setAttribute('aria-hidden','true');
    box.innerHTML='<div class="panel"><button class="close" type="button">X</button>'+
      '<section><h1>SUPPORT DIGGERZ</h1>'+
      '<p>Diggerz multiplayer runs on paid servers. Support helps cover hosting and development so multiplayer can stay online. It also helps with college expenses. If you have some spare green stuff and feel generous, every dollar helps keep the project moving.</p>'+
      '<div class="amount" id="diggerz-support239-amount">$5</div>'+
      '<input id="diggerz-support239-slider" type="range" min="1" max="1000" value="5" step="1">'+
      '<div style="display:flex;justify-content:space-between;font:700 13px Arial,sans-serif"><span>$1</span><span>$1000</span></div>'+
      '<div style="margin-top:18px;text-align:center"><button id="diggerz-support239-donate" type="button">Donate with Cash App</button></div>'+
      '<div class="fine">Payments go to $Houstonswallet. The supporter board only shows verified donations. Clicking Donate by itself does not add money to the leaderboard.</div></section>'+
      '<aside class="board"><h2>TOP SUPPORTERS</h2><div id="diggerz-support239-total" style="font:900 22px Arial Black,Arial,sans-serif;margin-bottom:8px">Verified total: $0</div><ol id="diggerz-support239-list"><li>No verified donations yet.</li></ol></aside></div>';
    document.body.appendChild(box);

    var layer=document.createElement('div');
    layer.id='diggerz-hat239-layer';
    document.body.appendChild(layer);

    var slider=document.getElementById('diggerz-support239-slider');
    var amount=document.getElementById('diggerz-support239-amount');
    function updateAmount(){amount.textContent='$'+slider.value}
    slider.addEventListener('input',updateAmount);
    updateAmount();

    async function loadBoard(){
      var list=document.getElementById('diggerz-support239-list');
      var total=document.getElementById('diggerz-support239-total');
      try{
        var response=await fetch(RAILWAY+'/api/donations',{cache:'no-store'});
        var data=await response.json();
        var rows=Array.isArray(data.donations)?data.donations:[];
        total.textContent='Verified total: $'+Number(data.total||0).toFixed(2).replace(/\.00$/,'');
        list.innerHTML='';
        if(!rows.length){list.innerHTML='<li>No verified donations yet.</li>';return}
        rows.slice(0,20).forEach(function(d){
          var li=document.createElement('li');
          li.textContent=(d.name||'Anonymous')+' — $'+Number(d.amount||0).toFixed(2).replace(/\.00$/,'');
          list.appendChild(li);
        });
      }catch(error){list.innerHTML='<li>Leaderboard unavailable.</li>'}
    }

    window.DiggerzSupport239={
      open:function(){box.classList.add('open');box.setAttribute('aria-hidden','false');loadBoard()},
      close:function(){box.classList.remove('open');box.setAttribute('aria-hidden','true')}
    };
    box.querySelector('.close').onclick=window.DiggerzSupport239.close;
    box.addEventListener('click',function(e){if(e.target===box)window.DiggerzSupport239.close()});
    document.getElementById('diggerz-support239-donate').onclick=function(){
      var n=Math.max(1,Math.min(1000,parseInt(slider.value,10)||1));
      window.open('https://cash.app/$Houstonswallet/'+n,'_blank','noopener,noreferrer');
    };
  }

  function persistState(service){
    try{
      if(!service||!service.state||!window.localStorage||!window.DiggerzService)return false;
      localStorage.setItem(window.DiggerzService.STORAGE_KEY,JSON.stringify(service.state));
      service.dirty=false;
      return true;
    }catch(error){console.warn('[Diggerz 23.9] escrow save failed:',error);return false}
  }

  function patchRuntime(){
    if(runtimePatched)return true;
    if(!window.DiggerzService||!window.DiggerzRuntime)return false;
    var proto=window.DiggerzService.prototype;
    var rt=window.DiggerzRuntime;
    var h=rt.getH&&rt.getH(),f=rt.getF&&rt.getF(),K=rt.getK&&rt.getK();
    if(!h||!f||!K)return false;

    // Beta Gun is a normal/common mining weapon in 23.9.
    var groups=window.DiggerzService.WEAPON_GROUPS||[];
    var betaPresent=groups.some(function(g){return Array.isArray(g)&&g.indexOf(81)>=0});
    if(!betaPresent)groups.unshift([81]);

    // UPDATE Hat becomes a legitimate wearable catalog item.
    if(window.DiggerzService.ITEM_POOL&&window.DiggerzService.ITEM_POOL.indexOf(HAT_ID)<0)window.DiggerzService.ITEM_POOL.push(HAT_ID);
    var oldN7=h.n7;
    h.n7=function(a,b,c,d,e,g,p,w,k){
      var out=oldN7.apply(this,arguments);
      if(a===2&&c===HAT_ID){
        var obj=out||b;
        try{obj.Init(f.BLANK_PNG())}catch(error){}
        obj.a4=2;
        obj._1='UPDATE Hat';
        obj.c9=true;
        try{h.O27(obj,0,-34,1)}catch(error){}
        return obj;
      }
      return out;
    };

    // The recovered Beta Gun sent a huge legacy beam endpoint. Clamp only type 10.
    var old16=K._16;
    K._16=function(a,b,c,d,e,g){
      if((e|0)===10){
        var dx=c-a,dy=d-b,len=Math.sqrt(dx*dx+dy*dy);
        if(!isFinite(len)||len===0){c=a+160;d=b}
        else if(len>160){c=a+dx/len*160;d=b+dy/len*160}
      }
      return old16.call(this,a,b,c,d,e,g);
    };

    // Preserve type 10 for damage rules, but draw the stable ray-gun visual.
    if(typeof proto.echoProjectile==='function'){
      var oldEcho=proto.echoProjectile;
      proto.echoProjectile=function(a,b,c,d,type){
        return oldEcho.call(this,a,b,c,d,(type|0)===10?4:type);
      };
    }
    if(typeof proto.pvpEchoPeerAttack==='function'){
      var oldPeerEcho=proto.pvpEchoPeerAttack;
      proto.pvpEchoPeerAttack=function(message){
        if(message&&(message.attackType|0)===10){
          var copy={};
          for(var key in message)copy[key]=message[key];
          copy.attackType=4;
          return oldPeerEcho.call(this,copy);
        }
        return oldPeerEcho.call(this,message);
      };
    }

    runtimePatched=true;
    return true;
  }

  function patchTrade(){
    if(tradePatched||!window.DiggerzService)return tradePatched;
    var proto=window.DiggerzService.prototype;
    if(typeof proto.pvpTradeOffer!=='function'||typeof proto.pvpCancelTradeLocal!=='function'||typeof proto.pvpCompleteTrade!=='function')return false;

    var oldOffer=proto.pvpTradeOffer;
    proto.pvpTradeOffer=function(){
      // localSlots are escrow: save the inventory AFTER those items were removed,
      // BEFORE the multiplayer offer can complete. Reloading can no longer clone them.
      persistState(this);
      return oldOffer.apply(this,arguments);
    };

    var oldCancel=proto.pvpCancelTradeLocal;
    proto.pvpCancelTradeLocal=function(){
      var result=oldCancel.apply(this,arguments);
      persistState(this);
      return result;
    };

    var oldComplete=proto.pvpCompleteTrade;
    proto.pvpCompleteTrade=function(receive){
      var tr=this.pvpTrade;
      if(!tr)return;
      if(!this.pvpCompletedTrades)this.pvpCompletedTrades={};
      if(this.pvpCompletedTrades[tr.id])return;
      this.pvpCompletedTrades[tr.id]=true;
      return oldComplete.call(this,receive);
    };

    tradePatched=true;
    return true;
  }

  function addAdminDonationUI(){
    if(adminUiReady)return;
    var panel=document.getElementById('diggerz-admin-panel');
    var status=document.getElementById('diggerz-admin-status');
    if(!panel||!status)return;
    adminUiReady=true;
    var wrap=document.createElement('div');
    wrap.id='admin-donations239';
    wrap.innerHTML='<h3>Verified Donations</h3>'+
      '<label>Supporter Name</label><input id="admin-donation-name" type="text" maxlength="24" placeholder="Anonymous">'+
      '<label>Amount ($1-$1000)</label><input id="admin-donation-amount" type="number" min="1" max="1000" step="0.01" value="5">'+
      '<div class="row"><button id="admin-donation-add" type="button">Add Verified Donation</button><button id="admin-donation-refresh" type="button">Refresh Board</button></div>'+
      '<div id="admin-donation-list" style="margin-top:7px;display:grid;gap:5px"></div>';
    panel.insertBefore(wrap,status);

    function authHeaders(){
      var token=String(window.DiggerzAdminSessionToken||'');
      return {'Content-Type':'application/json','Authorization':'Bearer '+token};
    }
    async function refresh(){
      var list=document.getElementById('admin-donation-list');
      try{
        var r=await fetch(RAILWAY+'/api/admin/donations',{headers:authHeaders(),cache:'no-store'});
        var d=await r.json();
        if(!r.ok){list.textContent='Authenticate as admin first.';return}
        var rows=Array.isArray(d.donations)?d.donations:[];
        list.innerHTML='';
        if(!rows.length){list.textContent='No verified donations yet.';return}
        rows.slice(0,30).forEach(function(row){
          var btn=document.createElement('button');
          btn.type='button';
          btn.textContent=(row.name||'Anonymous')+' — $'+Number(row.amount||0).toFixed(2)+' (remove)';
          btn.onclick=async function(){
            if(!confirm('Remove this verified donation from the leaderboard?'))return;
            await fetch(RAILWAY+'/api/admin/donations',{method:'POST',headers:authHeaders(),body:JSON.stringify({action:'remove',id:row.id})});
            refresh();
          };
          list.appendChild(btn);
        });
      }catch(error){list.textContent='Donation board unavailable.'}
    }
    document.getElementById('admin-donation-refresh').onclick=refresh;
    document.getElementById('admin-donation-add').onclick=async function(){
      var name=document.getElementById('admin-donation-name').value.trim()||'Anonymous';
      var value=Number(document.getElementById('admin-donation-amount').value);
      if(!isFinite(value)||value<1||value>1000){status.textContent='Donation amount must be between $1 and $1000.';return}
      try{
        var r=await fetch(RAILWAY+'/api/admin/donations',{method:'POST',headers:authHeaders(),body:JSON.stringify({action:'add',name:name,amount:value})});
        var d=await r.json();
        status.textContent=r.ok?'Verified donation added.':('Donation entry failed: '+String(d.error||r.status));
        if(r.ok)refresh();
      }catch(error){status.textContent='Donation server unavailable.'}
    };
  }

  var hatNodes={};
  function logicalHead(ent){
    try{
      var head=ent&&ent.i33&&ent.i33.f2?ent.i33.f2('head'):null;
      if(head&&isFinite(head.A7)&&isFinite(head.A8))return{x:head.A7,y:head.A8-8};
    }catch(error){}
    if(ent&&isFinite(ent.A7)&&isFinite(ent.A8))return{x:ent.A7,y:ent.A8-30};
    return null;
  }
  function canvasMetrics(){
    var c=document.querySelector('canvas');
    if(!c)return{x:0,y:0,sx:1,sy:1};
    var r=c.getBoundingClientRect(),w=c.width||r.width||1,h=c.height||r.height||1;
    return{x:r.left,y:r.top,sx:r.width/w,sy:r.height/h};
  }
  function showHat(key,ent,on){
    var layer=document.getElementById('diggerz-hat239-layer');
    if(!layer)return;
    var img=hatNodes[key];
    if(!on||!ent){if(img)img.style.display='none';return}
    var p=logicalHead(ent);
    if(!p){if(img)img.style.display='none';return}
    if(!img){
      img=document.createElement('img');
      img.className='diggerz-update-hat239';
      img.src=HAT_SRC;
      img.alt='';
      layer.appendChild(img);
      hatNodes[key]=img;
    }
    var m=canvasMetrics();
    img.style.display='block';
    img.style.left=(m.x+p.x*m.sx)+'px';
    img.style.top=(m.y+(p.y-7)*m.sy)+'px';
    img.style.width=Math.max(74,118*m.sx)+'px';
  }
  function updateHats(){
    try{
      var svc=window.q&&q.diggerzService;
      var local=window.l&&l.z39;
      var seen={local:true};
      if(svc&&svc.state)showHat('local',local,!!(svc.state.appearance&&svc.state.appearance[1]===HAT_ID));
      var peers=svc&&svc.pvpPeers||{};
      for(var key in peers){
        var peer=peers[key];
        var ap=peer&&peer.info&&peer.info.appearance;
        var ent=svc&&svc.pvpEntityForPeer?svc.pvpEntityForPeer(peer):null;
        seen[key]=true;
        showHat(key,ent,!!(ap&&ap[1]===HAT_ID));
      }
      for(var n in hatNodes)if(n!=='local'&&!seen[n])hatNodes[n].style.display='none';
    }catch(error){}
    requestAnimationFrame(updateHats);
  }

  function boot(){
    addSupportUI();
    patchRuntime();
    patchTrade();
    addAdminDonationUI();
    if(!runtimePatched||!tradePatched||!adminUiReady)setTimeout(boot,250);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);
  else boot();
  requestAnimationFrame(updateHats);
  window.DiggerzBuild239={build:BUILD,hatId:HAT_ID};
})();