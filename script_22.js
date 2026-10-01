
(function(){
  'use strict';
  var AUTH_MARKER='SESSION_AUTHENTICATED';
  var OLD_ACCOUNT_KEY='diggerz.resurrection.accounts.v1',OLD_BOUND_KEY='diggerz.resurrection.boundEmail.v1';
  var state={authenticated:false,email:'',username:'',busy:false};

  function cleanEmail(v){return String(v||'').trim().toLowerCase().slice(0,254)}
  function validEmail(v){return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)}
  function cleanName(v){v=String(v||'').trim();return (!v||v==='Enter Name')?'Player':v.slice(0,24)}
  function popup(menu,text){
    try{menu._9.push(new vb(menu,'',String(text),new Cd,vb.F39))}
    catch(e){try{alert(String(text).replace(/\^[0-9]/g,''))}catch(_e){}}
  }
  function closeField(field){try{field.a2=false;field.a0=1}catch(e){}}
  function applySession(data){
    state.authenticated=!!(data&&data.authenticated!==false&&data.ok!==false&&(data.email||data.user));
    state.email=cleanEmail(data&&data.email||'');state.username=cleanName(data&&data.username||data&&data.name||'');
    try{
      if(window.q&&q.thisMain){
        if(state.authenticated){q.thisMain.userPW=AUTH_MARKER;q.thisMain.userEmail=state.email;if(state.username&&state.username!=='Player'&&(!q.thisMain.userName||q.thisMain.userName==='Enter Name'))q.thisMain.userName=state.username}
        else{q.thisMain.userEmail='';if(!String(q.thisMain.userPW||'').startsWith('NOPASSWORD'))q.thisMain.userPW='NOPASSWORD_'+String(q.thisMain.userUniqueID||'')}
        q.SaveGlobals()
      }
    }catch(e){}
    try{sessionStorage.setItem('diggerz.auth.active.v1',state.authenticated?'1':'0')}catch(e){}
    return state
  }
  async function jsonFetch(url,options){
    options=options||{};options.credentials='same-origin';options.cache='no-store';
    var response=await fetch(url,options),data={};try{data=await response.json()}catch(e){}
    if(!response.ok)throw new Error(data.error||data.message||('HTTP '+response.status));
    return data
  }
  async function refresh(){
    try{return applySession(await jsonFetch('/api/auth/me'))}
    catch(e){return applySession({authenticated:false})}
  }
  async function requestLink(email,username,menu,field){
    if(state.busy)return;email=cleanEmail(email);username=cleanName(username);
    if(!validEmail(email)){popup(menu,'^1Enter a valid email address.');return}
    state.busy=true;
    try{
      await jsonFetch('/api/auth/request-link',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:email,username:username})});
      closeField(field);
      popup(menu,'^2Check your email. ^7Use the one-time Diggerz sign-in link. No password is stored or sent.')
    }catch(e){
      popup(menu,'^1Passwordless sign-in is unavailable on the server right now. ^7You can keep playing as a guest.');
    }finally{state.busy=false}
  }
  async function exchangeMagicToken(){
    var u;try{u=new URL(location.href)}catch(e){return false}
    var token=u.searchParams.get('login_token');if(!token)return false;
    try{
      await jsonFetch('/api/auth/exchange',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token:token})});
      u.searchParams.delete('login_token');history.replaceState(null,'',u.pathname+(u.search?'?'+u.searchParams.toString():'')+u.hash);
      await refresh();return true
    }catch(e){
      u.searchParams.delete('login_token');history.replaceState(null,'',u.pathname+(u.search?'?'+u.searchParams.toString():'')+u.hash);return false
    }
  }
  async function logoutFromMenu(menu){
    try{await jsonFetch('/api/auth/logout',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'})}catch(e){}
    applySession({authenticated:false});
    popup(menu,'^2Signed out. ^7Your local game progress remains on this browser.')
  }

  window.DiggerzAuth237={state:state,requestLink:requestLink,refresh:refresh,logoutFromMenu:logoutFromMenu};

  // Remove credential remnants from the old browser-local account system.
  try{localStorage.removeItem(OLD_ACCOUNT_KEY);localStorage.removeItem(OLD_BOUND_KEY)}catch(e){}
  try{if(sessionStorage.getItem('diggerz.auth.active.v1')==='1'&&window.q&&q.thisMain)q.thisMain.userPW=AUTH_MARKER}catch(e){}

  // Exchange an emailed one-time token if the backend redirects to ?login_token=...
  exchangeMagicToken().then(function(done){if(!done)refresh()});

  // q may finish initializing after this patch; rewrite Globals once to scrub any old upw/uem attributes.
  var scrubTries=0,scrub=setInterval(function(){
    scrubTries++;
    try{if(window.q&&q.thisMain&&typeof q.SaveGlobals==='function'){q.SaveGlobals();clearInterval(scrub)}}catch(e){}
    if(scrubTries>100)clearInterval(scrub)
  },100);
}());
