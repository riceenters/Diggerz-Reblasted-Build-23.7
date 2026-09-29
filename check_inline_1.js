
var aiptag = {cmd: {display: [], player: {push: function (callback) { callback(); }}}};
var aipDisplayTag = {display: function () {}, refresh: function () {}};
var adplayer = {startPreRoll: function () {
    var title = Main.GetChildByName("clicked");
    if (title && title.d52) {
        Main.thisMain.userName = title.d52.q35;
        Main.SaveGlobals();
    }
    Main.InitMainGame();
}};
function gtag() {}
