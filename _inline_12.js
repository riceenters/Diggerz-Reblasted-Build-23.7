
(function(){
  // Build 23.7 staff authentication:
  // Konami sequence -> owner or Lime admin code -> admin access.
  // Admin secrets are verified only by the server. No verifier hashes are shipped to browsers.
  var toggle=document.getElementById('diggerz-admin-toggle'), panel=document.getElementById('diggerz-admin-panel'), status=document.getElementById('diggerz-admin-status');
  var pvp=false, ownerAuthenticated=false, limeAuthenticated=false, authBusy=false, adminToken='', adminRole='', adminExpiresAt=0;
  var ownerSequence=['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'];
  var ownerSequenceIndex=0;

  function svc(){var m=window.Main&&window.Main.diggerzService;if(m)return m;var qsvc=window.q&&window.q.diggerzService;if(qsvc)return qsvc;return null}
  function say(v){status.textContent=v&&v.message?v.message:String(v||'Done.')}
  function showToggle(){toggle.style.display='block'}

  function authorizeCurrentService(){
    var s=svc();
    if(!s)return s;
    if(ownerAuthenticated){
      if(s.adminAuthorizeOwner&&!s.adminIsOwnerAuthorized())s.adminAuthorizeOwner(adminToken,adminRole,adminExpiresAt);
      if(s.adminApplyOwnerTag)s.adminApplyOwnerTag()
    } else if(limeAuthenticated){
      if(s.adminAuthorizeLime&&!s.adminIsLimeAuthorized())s.adminAuthorizeLime(adminToken,adminRole,adminExpiresAt);
      if(s.adminApplyLimeTag)s.adminApplyLimeTag()
    }
    return s
  }

  function punishWrongCode(){
    ownerAuthenticated=false;
    limeAuthenticated=false;
    adminToken='';adminRole='';adminExpiresAt=0;window.DiggerzAdminSessionToken='';
    toggle.style.display='none';
    panel.style.display='none';
    var s=svc();
    if(s&&s.adminWrongCodePenalty){s.adminWrongCodePenalty();return}
    // If the service is momentarily unavailable, punish as soon as it appears.
    var tries=0, timer=setInterval(function(){
      tries++;
      var delayed=svc();
      if(delayed&&delayed.adminWrongCodePenalty){
        clearInterval(timer);
        delayed.adminWrongCodePenalty()
      } else if(tries>20) clearInterval(timer)
    },100)
  }

  async function requestOwnerCode(){
    if(authBusy)return;
    authBusy=true;
    try{
      var code=window.prompt('Admin code:');
      if(code===null)return;
      code=String(code).trim();
      var response=await fetch('https://diggerz-multiplayer-test-production.up.railway.app/api/admin/auth',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code:code}),cache:'no-store'});
      var data={};try{data=await response.json()}catch(e){}
      if(!response.ok||!data.ok||!data.token){punishWrongCode();say(data.error==='too-many-attempts'?'Too many failed admin attempts. Try again later.':'Access denied.');return}
      adminToken=String(data.token);adminRole=String(data.role||'');adminExpiresAt=+data.expiresAt||0;window.DiggerzAdminSessionToken=adminToken;window.DiggerzAdminRole=adminRole;window.DiggerzAdminExpiresAt=adminExpiresAt;try{localStorage.setItem('diggerzAdminSessionToken',adminToken);localStorage.setItem('diggerzAdminSessionExpiresAt',String(adminExpiresAt));localStorage.setItem('diggerzAdminRole',adminRole)}catch(e){}
      ownerAuthenticated=adminRole==='owner';limeAuthenticated=adminRole==='lime';
      var s=authorizeCurrentService();showToggle();panel.style.display='block';refreshPlayers();refreshItemCatalog();refreshBans();refreshAdminMaps();
      if(ownerAuthenticated){say('Owner authenticated by server. Official OWNER tag enabled.');if(s&&s.adminApplyOwnerTag)s.adminApplyOwnerTag()}
      else{say('Lime admin authenticated by server. "the real lime" tag enabled.');if(s&&s.adminApplyLimeTag)s.adminApplyLimeTag()}
    }catch(e){say('Admin server authentication failed.');}
    finally{authBusy=false}
  }

  document.addEventListener('keydown',function(e){
    var key=e.key;
    if(key==='B')key='b';
    if(key==='A')key='a';

    if(key===ownerSequence[ownerSequenceIndex]){
      ownerSequenceIndex++;
      if(ownerSequenceIndex===ownerSequence.length){
        e.preventDefault();
        ownerSequenceIndex=0;
        requestOwnerCode()
      }
      return
    }
    ownerSequenceIndex=(key===ownerSequence[0])?1:0
  });

  toggle.onclick=function(){
    if(!ownerAuthenticated&&!limeAuthenticated)return;
    authorizeCurrentService();
    panel.style.display=panel.style.display==='block'?'none':'block';
    refreshPlayers();
    refreshItemCatalog();
    refreshAdminMaps()
  };

  function ownerService(){
    if((!ownerAuthenticated&&!limeAuthenticated)||!adminToken||adminExpiresAt<=Date.now())return null;
    return authorizeCurrentService()
  }

  function refreshPlayers(){var s=ownerService(),input=document.getElementById('admin-player'),listEl=document.getElementById('admin-player-names');try{if(window.DiggerzPvp22&&window.DiggerzPvp22.room)localStorage.setItem('diggerzAdminRoomCode',String(window.DiggerzPvp22.room))}catch(e){}if(!s||!s.adminPlayers||!listEl)return;var old=input.value,list=s.adminPlayers();listEl.innerHTML='';list.forEach(function(p){var o=document.createElement('option');o.value=p.name;listEl.appendChild(o)});input.value=old}

  var adminCatalog=[], adminChoices={};
  function refreshItemCatalog(){
    var s=ownerService(), category=+document.getElementById('admin-item-category').value;
    var input=document.getElementById('admin-item-name'), datalist=document.getElementById('admin-item-names');
    if(!s||!s.adminCatalog)return;
    var previous=input.value;
    adminCatalog=s.adminCatalog(category)||[];
    adminChoices={};
    datalist.innerHTML='';

    var totals={}, used={};
    adminCatalog.forEach(function(entry){totals[entry.name]=(totals[entry.name]||0)+1});
    adminCatalog.forEach(function(entry){
      var label=entry.name;
      if(totals[entry.name]>1){
        used[entry.name]=(used[entry.name]||0)+1;
        label=entry.name+' (Variant '+used[entry.name]+')'
      }
      adminChoices[label.toLowerCase()]={id:entry.id,name:entry.name,label:label};
      if(!adminChoices[entry.name.toLowerCase()])adminChoices[entry.name.toLowerCase()]={id:entry.id,name:entry.name,label:label};
      var option=document.createElement('option');
      option.value=label;
      datalist.appendChild(option)
    });

    if(previous && adminChoices[previous.toLowerCase()]) input.value=previous;
    else input.value='';
    input.placeholder=category===1?'Start typing a block name…':'Start typing an item name…';
    say('Loaded '+adminCatalog.length+' '+(category===1?'blocks.':'items.'))
  }

  document.getElementById('admin-item-category').onchange=refreshItemCatalog;
  document.getElementById('admin-spawn-item').onclick=function(){
    var s=ownerService();if(!s)return say('Admin authentication required.');
    var typed=document.getElementById('admin-item-name').value.trim();
    if(!typed)return say('Choose an item by name first.');
    var choice=adminChoices[typed.toLowerCase()];
    if(!choice){
      var q=typed.toLowerCase(), matches=[];
      for(var key in adminChoices)if(key.indexOf(q)>=0&&adminChoices[key].label.toLowerCase()===key)matches.push(adminChoices[key]);
      if(matches.length===1){choice=matches[0];document.getElementById('admin-item-name').value=choice.label}
    }
    if(!choice)return say('No exact item found. Pick one of the names shown in the list.');
    say(s.adminSpawnItem(+document.getElementById('admin-item-category').value,choice.id,+document.getElementById('admin-item-count').value,document.getElementById('admin-player').value))
  };
  document.getElementById('admin-add-coins').onclick=function(){var s=ownerService();if(!s)return say('Admin authentication required.');say(s.adminSpawnCoins(+document.getElementById('admin-coins').value,document.getElementById('admin-player').value))};
  document.getElementById('admin-kill').onclick=function(){var s=ownerService();if(!s)return say('Admin authentication required.');say(s.adminKillPlayer(document.getElementById('admin-player').value))};
  function selectedAdminName(){return String(document.getElementById('admin-player').value||'').trim()}
  function toggleEffect(effect){var s=ownerService();if(!s)return say('Admin authentication required.');var name=selectedAdminName(),peer=s.pvpFindPeerByName(name),enabled=name&&name!==s.playerName()?!!(peer&&peer.adminEffects&&peer.adminEffects[effect]):!!(s.adminEffects&&s.adminEffects[effect]);say(s.adminSendEffect(effect,name,!enabled))}
  document.getElementById('admin-rename').onclick=function(){var s=ownerService();if(!s)return say('Admin authentication required.');var name=selectedAdminName(),n=document.getElementById('admin-new-name').value.trim();if(!n)return say('Enter a custom name first.');say(s.adminRenameLive(name,n))};
  document.getElementById('admin-god').onclick=function(){toggleEffect('god')};document.getElementById('admin-fly').onclick=function(){toggleEffect('fly')};document.getElementById('admin-noclip').onclick=function(){toggleEffect('noclip')};document.getElementById('admin-invis').onclick=function(){toggleEffect('invis')};
  document.getElementById('admin-inventory-view').onclick=function(){var s=ownerService();if(!s)return say('Admin authentication required.');var box=document.getElementById('admin-inventory');if(box)box.innerHTML='Requesting inventory…';say(s.adminViewInventory(selectedAdminName()))};
  document.getElementById('admin-inventory-refresh').onclick=function(){var s=ownerService();if(!s)return say('Admin authentication required.');var box=document.getElementById('admin-inventory');if(box)box.innerHTML='Refreshing inventory…';say(s.adminViewInventory(selectedAdminName()))};
  document.getElementById('admin-bring').onclick=function(){var s=ownerService();if(!s)return say('Admin authentication required.');say(s.adminBringToMe(selectedAdminName()))};
  document.getElementById('admin-fake-leave').onclick=function(){var s=ownerService();if(!s)return say('Admin authentication required.');say(s.adminFakeLeave(selectedAdminName()))};
  document.getElementById('admin-fake-return').onclick=function(){var s=ownerService();if(!s)return say('Admin authentication required.');say(s.adminFakeReturn(selectedAdminName()))};
  document.getElementById('admin-background-apply').onclick=function(){var s=ownerService();if(!s)return say('Admin authentication required.');say(s.adminApplyBackground(+document.getElementById('admin-background').value))};
  document.getElementById('admin-tp').onclick=function(){var s=ownerService();if(!s)return say('Admin authentication required.');say(s.adminTeleportTo(document.getElementById('admin-player').value.trim()))};
  document.getElementById('admin-send-message').onclick=function(){var s=ownerService();if(!s)return say('Admin authentication required.');var text=document.getElementById('admin-message').value.trim(),scope=document.getElementById('admin-message-scope').value;if(!text)return say('Type a message first.');say(s.adminScreenMessage(text,scope))};
  document.getElementById('admin-control-start').onclick=function(){var s=ownerService();if(!s)return say('Admin authentication required.');say(s.adminControlStart(selectedAdminName()))};
  document.getElementById('admin-control-stop').onclick=function(){var s=ownerService();if(!s)return say('Admin authentication required.');say(s.adminControlStop())};
  document.getElementById('admin-chat-as-send').onclick=function(){var s=ownerService();if(!s)return say('Admin authentication required.');var text=document.getElementById('admin-chat-as').value.trim();if(!text)return say('Type a message first.');say(s.adminChatAs(selectedAdminName(),text));document.getElementById('admin-chat-as').value=''};
  document.getElementById('admin-fake-spawn').onclick=function(){var s=ownerService();if(!s)return say('Admin authentication required.');var n=document.getElementById('admin-fake-name').value.trim()||'Fake Player';say(s.adminFakePlayerSpawn(n));document.getElementById('admin-fake-name').value=''};
  document.getElementById('admin-fake-remove').onclick=function(){var s=ownerService();if(!s)return say('Admin authentication required.');say(s.adminFakePlayerRemove(selectedAdminName()))};
  document.getElementById('admin-fake-remove-all').onclick=function(){var s=ownerService();if(!s)return say('Admin authentication required.');say(s.adminFakePlayerRemoveAll())};
  document.getElementById('admin-map-apply').onclick=function(){var s=ownerService(),sel=document.getElementById('admin-map-select');if(!s||!sel)return say('Admin authentication required.');say(s.adminLoadSelectedMap(sel.value))};
  document.getElementById('admin-map-reset').onclick=function(){var s=ownerService();if(!s)return say('Admin authentication required.');say(s.adminResetMap())};
  document.getElementById('admin-map-import').onclick=function(){var s=ownerService();if(!s)return say('Admin authentication required.');document.getElementById('admin-map-import-file').click()};
  document.getElementById('admin-map-import-file').onchange=async function(e){
    var file=e.target.files&&e.target.files[0]; e.target.value='';
    if(!file)return;
    var s=ownerService(); if(!s)return say('Admin authentication required.');
    try{
      var text=await file.text(), map=JSON.parse(text);
      if(!map||map.format!=='diggerz-pvp-map-v1')throw new Error('Invalid Diggerz map JSON.');
      if((Number(map.width)|0)!==128||(Number(map.height)|0)!==80||!Array.isArray(map.tiles))throw new Error('Map must be a 128×80 Diggerz map.');
      var room=window.DiggerzPvp22&&String(window.DiggerzPvp22.room||'').trim().toUpperCase();
      var token=window.DiggerzAdminSessionToken;
      if(!room||!token)throw new Error('Join a multiplayer room first.');
      var r=await fetch('/api/admin/map/apply',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify({roomCode:room,map:map})});
      var d={};try{d=await r.json()}catch(_){}
      if(!r.ok||!d.ok)throw new Error(d.error||'Map import failed.');
      say('Imported '+(d.mapName||map.name||'map')+' and replaced the map for everyone.');
    }catch(err){say('Map import failed: '+err.message)}
  };
  async function refreshAdminMaps(){var sel=document.getElementById('admin-map-select');if(!sel)return;try{var token=window.DiggerzAdminSessionToken;if(!token)return;var r=await fetch('/api/admin/maps',{headers:{Authorization:'Bearer '+token},cache:'no-store'}),d=await r.json();if(!r.ok||!d.ok)throw new Error(d.error||'map list failed');sel.innerHTML='';(d.maps||[]).forEach(function(m){var o=document.createElement('option');o.value=String(m.name||'');o.textContent=String(m.name||'Map');sel.appendChild(o)});}catch(e){sel.innerHTML='<option value="">Map list unavailable</option>';}}
  setTimeout(refreshAdminMaps,200);

  document.getElementById('admin-modifiers-apply').onclick=function(){var s=ownerService();if(!s)return say('Admin authentication required.');var name=selectedAdminName();var mods={speed:Math.max(.1,Math.min(10,Number(document.getElementById('admin-speed-mod').value)||1)),size:Math.max(.25,Math.min(4,Number(document.getElementById('admin-size-mod').value)||1)),jump:Math.max(.1,Math.min(10,Number(document.getElementById('admin-jump-mod').value)||1)),breakSpeed:Math.max(.1,Math.min(10,Number(document.getElementById('admin-break-mod').value)||1))};say(s.adminSetModifiers(name,mods));};
  document.getElementById('admin-pvp').onclick=function(){var s=ownerService();if(!s)return say('Admin authentication required.');pvp=!pvp;say(s.adminSetPvp(pvp));this.textContent=pvp?'Disable PvP Override':'Enable PvP Override'};


  function authHeaders(){return {'Authorization':'Bearer '+adminToken,'Content-Type':'application/json'}}
  function selectedPeer(){var s=ownerService(),name=document.getElementById('admin-player').value.trim();if(!s||!name)return null;if(window.DiggerzPvp22&&String(window.DiggerzPvp22.connectionId||'')&&name===s.playerName())return {connectionId:window.DiggerzPvp22.connectionId,name:name};var p=s.pvpFindPeerByName?s.pvpFindPeerByName(name):null;return p?{connectionId:p.connectionId,name:p.name}:null}
  var mod={action:'',target:null,permanent:false};
  var modal=document.getElementById('diggerz-admin-modal');
  function openModeration(action){var typed=document.getElementById('admin-player').value.trim(),target=selectedPeer();if(action==='kick'&&!target)return say('Kick requires a connected player.');if(action==='ban'&&!typed)return say('Type the username you want to ban.');if(action==='ban'&&!target)target={connectionId:'',name:typed,offline:true};mod={action:action,target:target,permanent:false};document.getElementById('admin-modal-title').textContent=action==='ban'?'ban player':'kick player';document.getElementById('admin-modal-player').textContent='player: '+target.name+(target.offline?' (offline/private lookup)':'');document.getElementById('admin-ban-time').style.display=action==='ban'?'block':'none';document.getElementById('admin-mod-reason').value='';['seconds','hours','days','weeks','months','years'].forEach(function(k){document.getElementById('admin-ban-'+k).value='0'});var pb=document.getElementById('admin-ban-permanent');pb.classList.remove('active');pb.textContent='Permanent';modal.style.display='flex'}
  function closeModeration(){modal.style.display='none';mod={action:'',target:null,permanent:false}}
  document.getElementById('admin-kick').onclick=function(){if(!ownerService())return say('Admin authentication required.');openModeration('kick')};
  document.getElementById('admin-ban').onclick=function(){if(!ownerService())return say('Admin authentication required.');openModeration('ban')};
  document.getElementById('admin-mod-cancel').onclick=closeModeration;
  document.getElementById('admin-ban-permanent').onclick=function(){mod.permanent=!mod.permanent;this.classList.toggle('active',mod.permanent);this.textContent=mod.permanent?'Permanent: ON':'Permanent'};
  async function moderate(action,target,extra){if(!adminToken)return {ok:false,error:'admin-auth'};var response=await fetch('https://diggerz-multiplayer-test-production.up.railway.app/api/admin/moderate',{method:'POST',headers:authHeaders(),body:JSON.stringify(Object.assign({action:action,targetConnectionId:target&&target.connectionId||'',targetName:target&&target.name||''},extra||{})),cache:'no-store'});var data={};try{data=await response.json()}catch(e){};if(!response.ok)throw new Error(data.error||'moderation failed');return data}
  document.getElementById('admin-mod-confirm').onclick=async function(){if(!mod.target)return;var reason=document.getElementById('admin-mod-reason').value.trim();try{if(mod.action==='kick'){await moderate('kick',mod.target,{reason:reason});say('Kicked '+mod.target.name+'.')}else{var s=+document.getElementById('admin-ban-seconds').value||0,h=+document.getElementById('admin-ban-hours').value||0,d=+document.getElementById('admin-ban-days').value||0,w=+document.getElementById('admin-ban-weeks').value||0,mo=+document.getElementById('admin-ban-months').value||0,y=+document.getElementById('admin-ban-years').value||0;var durationMs=(s+h*3600+d*86400+w*604800+mo*2592000+y*31536000)*1000;if(!mod.permanent&&durationMs<=0){say('Choose a ban length or Permanent.');return}var result=await moderate('ban',mod.target,{reason:reason,permanent:mod.permanent,durationMs:durationMs});say('Banned '+mod.target.name+(mod.permanent?' permanently.':'.')+(result&&result.ejectedConnections?' Ejected '+result.ejectedConnections+' live connection(s).':' Ban will enforce on next connection.'));await refreshBans()}closeModeration()}catch(e){say('Moderation failed: '+e.message)}};
  async function fetchBanList(){
    var response=await fetch('https://diggerz-multiplayer-test-production.up.railway.app/api/admin/bans',{headers:{'Authorization':'Bearer '+adminToken},cache:'no-store'}),data={};
    try{data=await response.json()}catch(e){}
    if(!response.ok)throw new Error(data.error||'failed to load bans');
    return Array.isArray(data.bans)?data.bans:[]
  }
  async function refreshBans(){
    var box=document.getElementById('admin-ban-list');if(!box||!adminToken)return;
    try{
      var list=await fetchBanList();box.innerHTML='';
      if(!list.length){box.textContent='No active bans.';return}
      list.forEach(function(b){
        var btn=document.createElement('button'),until=b.permanent?'PERMANENT':new Date(+b.expiresAt||0).toLocaleString();
        btn.textContent=b.name+' — '+until+' — '+b.reason;
        btn.onclick=async function(){
          if(!confirm('Unban '+b.name+'?'))return;
          btn.disabled=true;
          try{
            var payload={action:'unban',banId:b.id||'',targetName:String(b.name||''),normalizedName:String(b.name||'').trim().toLowerCase()};
            var r=await fetch('https://diggerz-multiplayer-test-production.up.railway.app/api/admin/moderate',{method:'POST',headers:authHeaders(),body:JSON.stringify(payload),cache:'no-store'}),d={};
            try{d=await r.json()}catch(e){}
            if(!r.ok||d.ok===false)throw new Error(d.error||'server rejected unban');
            await new Promise(function(resolve){setTimeout(resolve,120)});
            var check=await fetchBanList(),sameId=String(b.id||''),sameName=String(b.name||'').trim().toLowerCase();
            var stillBanned=check.some(function(x){return (sameId&&String(x.id||'')===sameId)||(!sameId&&String(x.name||'').trim().toLowerCase()===sameName)});
            if(stillBanned)throw new Error('server did not remove the ban');
            say('Unbanned '+b.name+'.');
            await refreshBans()
          }catch(e){say('Unban failed: '+e.message);btn.disabled=false}
        };
        box.appendChild(btn)
      })
    }catch(e){box.textContent='Could not load bans: '+e.message}
  }
  document.getElementById('admin-refresh-bans').onclick=refreshBans;

  // Keep the official tag attached after respawns or mode changes. A newly
  // created local service is re-authorized only because this page session
  // already passed an authorized admin-code check.
  setInterval(function(){
    if(!ownerAuthenticated&&!limeAuthenticated)return;
    var s=authorizeCurrentService();
    if(ownerAuthenticated&&s&&s.adminApplyOwnerTag)s.adminApplyOwnerTag();
    if(limeAuthenticated&&s&&s.adminApplyLimeTag)s.adminApplyLimeTag();
    if(panel.style.display==='block')refreshPlayers()
  },1500);
}());
