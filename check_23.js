
		if (window.gameScriptLoadsFailed()) {
    window.reportGameLoadError('A required game script is unavailable.');
} else if (!window.lime || typeof window.lime.embed !== 'function') {
    window.reportGameLoadError('The game runtime is unavailable. Check that diggerz.js loaded successfully.');
} else {
    try {
        window.lime.embed('diggerz', 'openfl-content', 0, 0, { parameters: {} });
    } catch (error) {
        window.reportGameLoadError('Startup failed: ' + error.message);
        console.error('Diggerz startup failed:', error);
    }
}
	