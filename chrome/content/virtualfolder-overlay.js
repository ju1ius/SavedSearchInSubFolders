(function(){

Components.utils.import("resource://SavedSearchInSubFolders/SavedSearchInSubFolders.js");

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cr = Components.results;
const Cu = Components.utils;


window.addEventListener("load", function(e)
{
  var app = Cc["@mozilla.org/steel/application;1"].getService(Ci.steelIApplication);
  app.console.log('VirtualFolder Overlay loaded');
  var jss = ju1ius.SavedSearchInSubFolders.getInstance();
  var dialog = document.getElementById('virtualFolderPropertiesDialog');
  dialog.addEventListener('dialogaccept', function(e)
  {
    //e.stopPropagation();
    //jss.updateVirtualFolders();
    app.console.log("After update");
    app.console.log(jss.getAllVirtualFoldersUris());
  }, false);
}, false);


})();
