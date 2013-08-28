(function(){


const {classes: Cc, interfaces: Ci, utils: Cu, results : Cr} = Components;

Cu.import("resource://SavedSearchInSubFolders/SavedSearchInSubFolders.js");

window.addEventListener("load", function(e)
{
    var j3s = ju1ius.SavedSearchInSubFolders.getInstance(),
        watch_folders = j3s.preferences.getBoolPref('watch_folders');

    // Hook on addFolderToSearchListString from chrome://messenger/content/virtualFolderListDialog.js
    ju1ius.aop.around({
        target: window,
        method: 'addFolderToSearchListString'
    }, function(invocation) {
        var aFolder = invocation.arguments[0],
            //aCurrentSearchURIString = invocation.arguments[1],
            // set this to the result of the invocation,
            // in case it was modified by another addon
            aCurrentSearchURIString = invocation.proceed(),
            uris = [],
            searchStr = '';

        j3s.debug("Adding folder to search string:\n" + aFolder.folderURL);

        if (aCurrentSearchURIString) {
            uris = aCurrentSearchURIString.split('|');
        }
        if (-1 === uris.indexOf(aFolder.folderURL)) {
            uris.push(aFolder.folderURL);
        }
        if (watch_folders && aFolder.hasSubFolders && !j3s.isInbox(aFolder)) {
            for each(let uri in j3s.getDescendantsUris(aFolder)) {
                if (-1 === uris.indexOf(uri)) uris.push(uri);
            }
        }
        searchStr = uris.join('|');
        j3s.debug("Current search string is now:\n" + searchStr);

        return searchStr;
    });

}, false);


})();
