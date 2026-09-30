
(function(){
  // These helpers MUST exist before the OpenFL client starts.  The previous
  // version only created them after l.z39.n38.B30 existed, which could race
  // the native mouse handler and produce "DiggerzCanPlaceNative is not defined".
  // Coaster Town native tile constants: BLOCK_LAYER=0, FLOATER_LAYER=1,
  // BKND_LAYER=2.  Q36 is the tile's actual native layer.  Do not reinterpret
  // layer 1 as a player/pet layer.
  window.DiggerzTileLayers={BLOCK_LAYER:0,FLOATER_LAYER:1,BKND_LAYER:2};
  window.DiggerzPlacementLayer=function(item){
    try{
      var q36=(item&&item.Q36)|0;
      return (q36>=0&&q36<=2)?q36:0;
    }catch(e){return 0}
  };
  // Continuous player placement shield: the player owns a floating 3-wide
  // hitbox (left cell + body + right cell) that FOLLOWS the player and never
  // snaps to the tile grid.  Placement into any cell that intersects this
  // shield is rejected so blocks cannot be planted on top of a player and
  // corrupt the native grid.
  window.DiggerzPlayerShieldOverlapsCell=function(px,py,cx,cy){
    if(!isFinite(px)||!isFinite(py)||!isFinite(cx)||!isFinite(cy))return false;
    // Placement cell AABB (1x1, centered on integer tile coords).
    var half=0.5;
    var cellL=cx-half, cellR=cx+half, cellT=cy-half, cellB=cy+half;
    // Player shield: ~1 block left, body, ~1 block right.  Continuous floats —
    // NOT rounded to grid — so the shield moves exactly with the player.
    var hw=0.50;  // horizontal half-width (tight around player)
    var hh=0.50;  // vertical half-height → 1 block tall total (matches player)
    var margin=0.05;
    var shL=px-hw-margin, shR=px+hw+margin, shT=py-hh-margin, shB=py+hh+margin;
    // AABB intersection
    if(cellR<shL||cellL>shR||cellB<shT||cellT>shB)return false;
    return true;
  };
  // Back-compat alias used by older call sites.
  window.DiggerzPlayerOverlapsCell=function(px,py,cx,cy,radius){
    if(window.DiggerzPlayerShieldOverlapsCell(px,py,cx,cy))return true;
    // Fallback circular test for very small entities.
    var r=(radius>0.05&&radius<2)?radius:0.72;
    var half=0.5, left=cx-half, right=cx+half, top=cy-half, bottom=cy+half;
    var qx=Math.max(left,Math.min(px,right)), qy=Math.max(top,Math.min(py,bottom));
    return Math.hypot(px-qx,py-qy) < r;
  };
  window.DiggerzCanPlaceNative=function(service,x,y,item){
    try{
      if(!service||!item||typeof l==='undefined'||!l.z39||!l._44)return false;
      x|=0; y|=0;
      var layer=window.DiggerzPlacementLayer(item);
      var px=l.z39.b6/l._44, py=l.z39.b7/l._44;
      try{
        var layerGrid=l.z38&&l.z38.R39&&l.z38.R39[layer];
        if(layerGrid&&typeof layerGrid.r33==='function'&&layerGrid.r33(x*l._44,y*l._44))return false;
      }catch(_gridCheck){}
      if(Math.hypot(x-px,y-py)>5)return false;
      // Local player floating left+center+right shield.
      if(window.DiggerzPlayerShieldOverlapsCell(px,py,x,y))return false;
      // Multiplayer / fake peers — same continuous shield.
      var peers=service.pvpEnsurePeers?service.pvpEnsurePeers():{};
      for(var k in peers){
        var peer=peers[k];
        var ent=service.pvpEntityForPeer?service.pvpEntityForPeer(peer):null;
        if(ent&&ent.a2!==false&&ent.b6!==undefined&&ent.b7!==undefined&&
           window.DiggerzPlayerShieldOverlapsCell(ent.b6/l._44,ent.b7/l._44,x,y))return false;
        if(peer&&isFinite(peer.lastX)&&isFinite(peer.lastY)&&
           window.DiggerzPlayerShieldOverlapsCell(peer.lastX/l._44,peer.lastY/l._44,x,y))return false;
      }
      var scene=l.z38&&l.z38._9;
      if(scene)for(var i=0;i<scene.length;i++){
        var e=scene[i];
        if(!e||e===l.z39||e.a2===false||e._1==='target_dummy_marker'||e._1==='tilepick')continue;
        if(e.b6===undefined||e.b7===undefined)continue;
        if(e.b34&&window.DiggerzPlayerShieldOverlapsCell(e.b6/l._44,e.b7/l._44,x,y))return false;
      }
      return true;
    }catch(e){return false}
  };
})();
