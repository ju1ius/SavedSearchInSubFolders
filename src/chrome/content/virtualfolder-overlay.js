/**
 * This overlay is now used only for debugging purposes.
 * It monkeypatches the onOk() callback called when a virtual folder
 * is saved, so that we can call hooks before/after the saving process.
 *
 **/

(function(){


const {classes: Cc, interfaces: Ci, utils: Cu, results : Cr} = Components;

Cu.import("resource://SavedSearchInSubFolders/SavedSearchInSubFolders.js");
Cu.import("resource://SavedSearchInSubFolders/aop.js");

window.addEventListener("load", function(e)
{
    var j3s = ju1ius.SavedSearchInSubFolders;

    if (!j3s.getBoolPref('debug')) { return; }
    if (!j3s.getBoolPref('watch_folders')) { return; }

    // Hook on the onOK callback defined in chrome://messenger/content/virtualFolderProperties.js
    AOP.around({
        target: window,
        method: 'onOk'
    }, function(invocation) {
        var result = invocation.proceed();
        j3s.debug("Final search string is now:\n" + gSearchFolderURIs);
        return result;
    });

}, false);


})();
