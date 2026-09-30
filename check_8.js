
		window.addEventListener ("touchmove", function (event) { event.preventDefault (); }, { capture: false, passive: false });
		if (typeof window.devicePixelRatio != 'undefined' && window.devicePixelRatio > 2) {
			var meta = document.getElementById ("viewport");
			if (meta) meta.setAttribute ('content', 'width=device-width, initial-scale=' + (2 / window.devicePixelRatio) + ', user-scalable=no');
		}

		window.addEventListener("keydown", function(e) {
  			if(e.keyCode == 40 || e.keyCode == 38) {
    			e.preventDefault();
			  }
		}, false);

		window.addEventListener("wheel", function(e) {
    e.preventDefault();
}, { passive: false });

	