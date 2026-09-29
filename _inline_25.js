
(function(){
  // Removed: document keydown/keypress Enter handlers were double-sending chat.
  // Native chat already binds Enter to y1 via D31.q39 — one send only.
  try {
    var old = document.getElementById('diggerz-chat-enter-btn');
    if (old) old.style.display = 'none';
  } catch (e) {}
})();
