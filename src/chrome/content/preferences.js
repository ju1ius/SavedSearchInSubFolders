
Components.utils.import("resource://SavedSearchInSubFolders/SavedSearchInSubFolders.js");


window.addEventListener('load', function()
{
    window.sizeToContent();
});

function onWatchFoldersChange(event)
{
    var pref = event.target,
        value = pref.value;
    if (value) {
        ju1ius.SavedSearchInSubFolders.watchFolders();
    } else {
        ju1ius.SavedSearchInSubFolders.unwatchFolders();
    }
}
