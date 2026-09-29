
(function(){
  var RAILWAY = (window.location && window.location.origin) ? window.location.origin : 'https://diggerz-multiplayer-test-production.up.railway.app';
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
      '.diggerz-update-hat239{position:absolute;height:auto;transform:translate(-50%,-100%);transform-origin:50% 100%;filter:drop-shadow(0 2px 1px rgba(0,0,0,.45));image-rendering:pixelated}'+
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
      '<div style="margin-top:18px;text-align:center;display:flex;gap:12px;justify-content:center;flex-wrap:wrap"><button id="diggerz-support239-donate" type="button">Donate with Cash App</button><button id="diggerz-support239-kofi" type="button">Donate to Lime on Ko-fi</button></div>'+
      '<div class="fine">Cash App payments go to $Houstonswallet; use the selected amount shown above. Lime accepts support through Ko-fi at ko-fi.com/limeguy314. The supporter board only shows manually verified donations from either payment method.</div></section>'+
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
      try{sessionStorage.setItem('diggerz.support239.selectedAmount',String(n))}catch(error){}
      window.open('https://cash.app/$Houstonswallet','_blank','noopener,noreferrer');
    };
    document.getElementById('diggerz-support239-kofi').onclick=function(){
      window.open('https://ko-fi.com/limeguy314/','_blank','noopener,noreferrer');
    };
  }

  function boot(){ try { addSupportUI(); } catch(e) { console.warn('[Diggerz Support]', e); } }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
  setTimeout(boot, 500);
})();
