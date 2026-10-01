
(function () {
    var context = null, lastPlayed = {};
    function audioContext() {
        if (context) return context;
        var AudioCtor = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtor) return null;
        try { context = new AudioCtor(); } catch (error) { return null; }
        return context;
    }
    function output(ctx, volume) {
        var gain = ctx.createGain();
        gain.gain.value = Math.max(0, Math.min(1, volume || 0)) * .22;
        gain.connect(ctx.destination);
        return gain;
    }
    function tone(ctx, destination, start, end, duration, type, delay) {
        delay = delay || 0;
        var now = ctx.currentTime + delay;
        var osc = ctx.createOscillator(), envelope = ctx.createGain();
        osc.type = type || "triangle";
        osc.frequency.setValueAtTime(Math.max(20, start), now);
        osc.frequency.exponentialRampToValueAtTime(Math.max(20, end), now + duration);
        envelope.gain.setValueAtTime(.0001, now);
        envelope.gain.exponentialRampToValueAtTime(1, now + .008);
        envelope.gain.exponentialRampToValueAtTime(.0001, now + duration);
        osc.connect(envelope);
        envelope.connect(destination);
        osc.start(now);
        osc.stop(now + duration + .02)
    }
    function noise(ctx, destination, duration, cutoff, delay) {
        delay = delay || 0;
        var length = Math.max(1, Math.floor(ctx.sampleRate * duration));
        var buffer = ctx.createBuffer(1, length, ctx.sampleRate);
        var data = buffer.getChannelData(0);
        for (var i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
        var source = ctx.createBufferSource(), filter = ctx.createBiquadFilter(), envelope = ctx.createGain();
        source.buffer = buffer;
        filter.type = "lowpass";
        filter.frequency.value = cutoff || 900;
        var now = ctx.currentTime + delay;
        envelope.gain.setValueAtTime(.8, now);
        envelope.gain.exponentialRampToValueAtTime(.0001, now + duration);
        source.connect(filter);
        filter.connect(envelope);
        envelope.connect(destination);
        source.start(now)
    }
    window.DiggerzSynth = {
        play: function (path, volume) {
            if (!(volume > 0)) return false;
            var name = String(path || "").toLowerCase(), now = Date.now();
            // The original client and the reconstructed service can report the
            // same action in one frame. Avoid turning one hit into two sounds.
            if (lastPlayed[name] && now - lastPlayed[name] < 24) return true;
            lastPlayed[name] = now;
            var ctx = audioContext();
            if (!ctx) return false;
            if (ctx.state === "suspended" && ctx.resume) ctx.resume().catch(function () {});
            var destination = output(ctx, volume);
            if (/coin|purchase|levelup|checkpoint/.test(name)) {
                tone(ctx, destination, 620, 880, .11, "sine");
                tone(ctx, destination, 880, 1240, .14, "sine", .08)
            } else if (/jump|flap|uphill/.test(name)) {
                tone(ctx, destination, 190, 520, .16, "triangle")
            } else if (/land|rubble|grenade|death|spikes/.test(name)) {
                noise(ctx, destination, .2, 700);
                tone(ctx, destination, 105, 48, .18, "sine")
            } else if (/punch|kick|saw|lightsword/.test(name)) {
                noise(ctx, destination, .09, 1250);
                tone(ctx, destination, 180, 75, .1, "square")
            } else if (/swap|switch|plate|dooropen/.test(name)) {
                tone(ctx, destination, 310, 220, .08, "square")
            } else if (/pop|balloon/.test(name)) {
                tone(ctx, destination, 520, 115, .08, "sine")
            } else {
                tone(ctx, destination, 260, 210, .06, "triangle")
            }
            if (window.Main) window.Main.diggerzSynthPlayed = (window.Main.diggerzSynthPlayed || 0) + 1;
            return true
        }
    };
}());
