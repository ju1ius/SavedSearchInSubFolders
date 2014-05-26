(function(){


const {classes: Cc, interfaces: Ci, utils: Cu, results : Cr} = Components;

Cu.import("resource://SavedSearchInSubFolders/SavedSearchInSubFolders.js");


window.addEventListener("load", function(e)
{
    var j3s = ju1ius.SavedSearchInSubFolders,
        menu_item = document.getElementById('SavedSearchInSubFolders-menu-item'),
        prompt_msg = j3s.localize("update.prompt.message") + "\n" + j3s.localize("update.prompt.question"),
        prompt_title = j3s.localize("update.prompt.title");

    menu_item.addEventListener('command', function(e)
    {
        if (!j3s.confirm(prompt_title, prompt_msg)) {
            return;
        }
        j3s.updateVirtualFolders();
    });

}, false);


})();
