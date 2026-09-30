
(function () {
    var lastFrames = 0, previous = performance.now(), lastError = '';
    window.addEventListener('error', function (event) {
        if (!event.message) return;
        lastError = event.error && event.error.stack ? event.error.stack : event.message;
    });
    window.addEventListener('unhandledrejection', function (event) {
        lastError = event.reason && event.reason.stack ? event.reason.stack : String(event.reason);
        window.reportGameLoadError(lastError);
    });
    setInterval(function () {
        var main = window.Main, now = performance.now();
        var lines = ['Diggerz original client · build 21.7 + weapons'];
        if (!main || !main.thisMain) {
            lines.push('Runtime: waiting for assets/startup');
        } else {
            var title = main.GetChildByName('title_screen') || main.GetChildByName('clicked');
            var stage = main.thisMain.stage, ctx = stage && stage.context3D;
            var frames = Number(main.iii) || 0;
            lines.push('Initialized: ' + !!main.initted,
                'Frames/sec: ' + Math.round((frames - lastFrames) * 1000 / (now - previous)),
                'Game size: ' + main.SCREENWIDTH + ' × ' + main.SCREENHEIGHT,
                'Menu: ' + (title ? 'present; age ' + title.a1 + '; alpha ' + title.a7 : 'not active'),
                'Menu buttons: ' + (title && title.d52 ? 'created' : 'not created'),
                'Submitted draw calls: ' + (main.diggerzDrawCalls || 0) + '; triangles: ' + (main.diggerzTriangles || 0),
                'WebGL: ' + (ctx ? 'available' : 'unavailable'),
                'Sound files loaded: ' + (main.diggerzAudioLoaded || 0) + '; unavailable: ' + (main.diggerzAudioMissing || 0),
                'Recreated sound effects played: ' + (main.diggerzSynthPlayed || 0),
                'Mining effects shown: ' + (main.diggerzMiningEffects || 0));
            if (main.diggerzConnectionRoute) lines.push('Connection route: ' + main.diggerzConnectionRoute);
            if (main.diggerzService) lines.push('Game service: ' + main.diggerzService.status());
            if (main.diggerzLastSave) lines.push('Last local save: ' + new Date(main.diggerzLastSave).toLocaleTimeString());
            if (main.diggerzSaveError) lines.push('Save warning: ' + main.diggerzSaveError);
            if (ctx && ctx.gl) {
                var error = ctx.gl.getError();
                if (error) lastError = 'WebGL 0x' + error.toString(16) + ' outside sprite batch';
                if (ctx.gl.isContextLost()) lastError = 'WebGL context lost';
            }
            if (title && title.C57) lines.push('Settings icon: alpha ' + title.C57.a7 + '; x ' + Math.round(title.C57.A7) + '; y ' + Math.round(title.C57.A8));
            lastFrames = frames;
        }
        previous = now;
        if (main && main.diggerzGLFirstError) lines.push('First draw error: ' + main.diggerzGLFirstError);
        if (main && main.diggerzGLError) lines.push('Latest draw error: ' + main.diggerzGLError);
        if (lastError) lines.push('Other error: ' + lastError);
        if (!lastError && !(main && main.diggerzGLError)) lines.push('WebGL checks: no errors recorded');
        document.getElementById('diggerz-diagnostics-text').textContent = lines.join('\n');
    }, 1000);
}());
