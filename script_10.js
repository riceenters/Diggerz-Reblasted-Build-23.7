
(function(){
  var NEED=["diggerz-io_300x250","preroll","info","changes","a_ver","a_info","a_changes","a_desc"];
  function ensure(id){
    var el=document.getElementById(id);
    if(el)return el;
    el=document.createElement("div");
    el.id=id;
    el.style.cssText="display:none;visibility:hidden;position:absolute;left:-9999px;width:0;height:0";
    (document.body||document.documentElement).appendChild(el);
    return el;
  }
  var _ge=Document.prototype.getElementById;
  Document.prototype.getElementById=function(id){
    var el=_ge.call(this,id);
    if(!el&&NEED.indexOf(id)>=0) el=ensure(id);
    return el;
  };
  NEED.forEach(function(id){try{ensure(id)}catch(e){}});
})();
