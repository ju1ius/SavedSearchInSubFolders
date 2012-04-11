(function(){


const Cc = Components.classes;
const Ci = Components.interfaces;
const Cr = Components.results;
const Cu = Components.utils;

Cu.import("resource://SavedSearchInSubFolders/SavedSearchInSubFolders.js");


window.addEventListener("load", function(e)
{
  var j3s = ju1ius.SavedSearchInSubFolders.getInstance();
  var dialog = document.getElementById('virtualFolderPropertiesDialog');

  if(!j3s.preferences.getBoolPref('watch_folders')) { return; }

  // Arguments passed to virtualFolderProperties.xul
  var arguments = window.arguments[0];
  if(!arguments.editExistingFolder) {
    // New virtual folder, handled by SavedSearchInSubFolders.OnItemAdded
    return;
  }
  var folder = arguments.folder;
  // Remap the onOK callback defined in chrome://messenger/content/virtualFolderProperties.js
  // so that we can call our hook after it.
  // FIXME: Is there a cleaner way to do this ?
  var saveCallback = onOK;
  onOK = function(){};
  dialog.ondialogaccept = null;

  dialog.addEventListener('dialogaccept', function(e)
  {
    e.stopPropagation();
    // call original callback to save the virtual folder
    if(!saveCallback()) {
      return false;
    }
    // call our hook to update search folders
    j3s.updateVirtualFolder(folder);
    return true;

  }, false);

}, false);


})();
