
(function () {
    var failures = [];
    var failedFiles = [];

    function render() {
        var panel = document.getElementById('game-load-error');
        if (!panel || failures.length === 0) return;
        panel.hidden = false;
        document.getElementById('game-load-error-detail').textContent = failures.join(' ');
    }

    window.addEventListener('error', function (event) { if (event.message) window.reportGameLoadError(event.message); });
    window.reportGameLoadError = function (message) {
        if (failures.indexOf(message) === -1) failures.push(message);
        render();
    };
    window.addEventListener('DOMContentLoaded', render);
    window.addEventListener('error', function (event) {
        var element = event.target;
        if (!element || element.tagName !== 'SCRIPT') return;
        var url = element.src || '';
        var match = url.match(/\/(howler\.min\.js|pako\.min\.js|FileSaver\.min\.js|diggerz\.js)(?:[?#]|$)/);
        if (!match) return;
        failedFiles.push(match[1]);
        window.reportGameLoadError('Could not load ' + match[1] + '.');
    }, true);
    window.gameScriptLoadsFailed = function () { return failedFiles.length > 0; };
}());
