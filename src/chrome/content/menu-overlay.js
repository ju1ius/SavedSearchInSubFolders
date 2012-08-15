(function(){


const Cc = Components.classes;
const Ci = Components.interfaces;
const Cr = Components.results;
const Cu = Components.utils;

Cu.import("resource://SavedSearchInSubFolders/SavedSearchInSubFolders.js");


window.addEventListener("load", function(e)
{
  var j3s = ju1ius.SavedSearchInSubFolders.getInstance();
  var menu_item = document.getElementById('SavedSearchInSubFolders-menu-item');

  var prompt_msg = j3s.localize("update.prompt.message") + "\n" + j3s.localize("update.prompt.question");
  var prompt_title = j3s.localize("update.prompt.title");

  menu_item.addEventListener('command', function(e)
  {
    if(!j3s.confirm(prompt_title, prompt_msg)) {
      return;
    }
    j3s.updateVirtualFolders();
  });

}, false);


})();
