(function(){

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cr = Components.results;
const Cu = Components.utils;

Cu.import("resource://SavedSearchInSubFolders/SavedSearchInSubFolders.js");

window.addEventListener("load", function(e)
{
  var j3s = ju1ius.SavedSearchInSubFolders.getInstance();
  var watch_folders = j3s.preferences.getBoolPref('watch_folders');

  // Monkey patches chrome://messenger/content/virtualFolderListDialog.js
  addFolderToSearchListString = function (aFolder, aCurrentSearchURIString)
  {
    j3s.debug("Adding folder to search string:\n" + aFolder.URI);

    var uris = [],
        searchStr;

    if (aCurrentSearchURIString) {
      uris = aCurrentSearchURIString.split('|');
    }
    if(-1 === uris.indexOf(aFolder.URI)) {
      uris.push(aFolder.URI);
    }
    if(watch_folders && aFolder.hasSubFolders && !j3s.isInbox(aFolder)) {
      for each(let uri in j3s.getDescendentsUris(aFolder)) {
        if(-1 === uris.indexOf(uri)) uris.push(uri);
      }
    }
    searchStr = uris.join('|');
    j3s.debug("Current search string is now:\n" + searchStr);
    return searchStr;
  }

}, false);


})();
