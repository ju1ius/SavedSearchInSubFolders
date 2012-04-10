(function(){

Components.utils.import("resource://SavedSearchInSubFolders/SavedSearchInSubFolders.js");
var app = Components.classes["@mozilla.org/steel/application;1"].getService(
  Components.interfaces.steelIApplication
);

window.addEventListener("load", function(e)
{
  app.console.log('Overlay loaded');
  var ss_in_sf = ju1ius.SavedSearchInSubFolders.getInstance(document);
}, false);

})();
