(function(){


const {classes: Cc, interfaces: Ci, utils: Cu, results : Cr} = Components;

Cu.import("resource://SavedSearchInSubFolders/SavedSearchInSubFolders.js");
Cu.import("resource://SavedSearchInSubFolders/aop.js");
    

var j3s = ju1ius.SavedSearchInSubFolders,
    watch_folders;


window.addEventListener("load", function(e)
{
    watch_folders = j3s.getBoolPref('watch_folders');

    AOP.around({
        target: window,
        method: 'addFolderToSearchListString'
    }, addFolderHook);

}, false);

/**
 * Hook on addFolderToSearchListString
 * from chrome://messenger/content/virtualFolderListDialog.js
 *
 * Called for each folder checked in the dialog.
 * The folder is passed as argument, and the function returns the accumulated uris,
 * as a "|" delimited string list.
 */
function addFolderHook(invocation)
{
    var folder = invocation.arguments[0],
        // set this to the result of the invocation,
        // in case it was modified by another addon
        currentSearchString = invocation.proceed() || '',
        uris = new Set(currentSearchString.split('|'));

    uris.add(folder.URI);
    j3s.debug("Added folder to search string:\n" + folder.folderURL);

    if (watch_folders && folder.hasSubFolders && !j3s.isInbox(folder)) {
        for (let uri of j3s.getDescendantsUris(folder)) {
            uris.add(uri);
        }
    }
    currentSearchString = [u for(u of uris)].join('|');
    j3s.debug("Current search string is now:\n" + currentSearchString);

    return currentSearchString;

}

})();
