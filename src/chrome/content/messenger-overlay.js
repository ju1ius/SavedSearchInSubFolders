(function(){

const {classes: Cc, interfaces: Ci, utils: Cu, results : Cr} = Components;

Cu.import("resource://SavedSearchInSubFolders/SavedSearchInSubFolders.js");
Cu.import("resource://SavedSearchInSubFolders/dom.js");

var dom = DOM(document),
    j3s = ju1ius.SavedSearchInSubFolders;

window.addEventListener("load", function(e)
{
    // bootsrap extension
    j3s.boot();
    // add debug context menu
    var menupopup = dom.qs('#folderPaneContext'),
        debug_item = dom.qs('#SavedSearchInSubFolders-folderPaneContext-debug');

    menupopup.addEventListener('popupshowing', function(event) {
        debug_item.hidden = !j3s.getBoolPref('debug');
    });

    debug_item.addEventListener('command', function(event) {
        var folder = gFolderTreeView.getSelectedFolders()[0];
        window.openDialog(
            'chrome://SavedSearchInSubFolders/content/folder-debug-dialog.xul',
            '',
            'chrome,modal,centerscreen',
            { folder: folder }
        );
    });

}, false);


})();
