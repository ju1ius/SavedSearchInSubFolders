(function() {

const XUL = "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";

const {
    classes: Cc,
    interfaces: Ci,
    utils: Cu,
    results: Cr
} = Components;

const FolderFlags = Ci.nsMsgFolderFlags;

Cu.import("resource://SavedSearchInSubFolders/dom.js");
Cu.import("resource://SavedSearchInSubFolders/moz.js");
Cu.import("resource://SavedSearchInSubFolders/SavedSearchInSubFolders.js");

var j3s = ju1ius.SavedSearchInSubFolders.getInstance(),
    dom = DOM(document);

window.addEventListener('load', function()
{
    var folder = window.arguments[0].folder,
        tab = dom.qs('#SavedSearchInSubFolders-debug-tab'),
        copy_btn = dom.qs('#SavedSearchInSubFolders-copy-info');
    if (!folder) {
        return;
    }
    if (!j3s.preferences.getBoolPref('debug')) {
        tab.hidden = true;
        return;
    }

    populateFolderInfo(folder);
    populateServerInfo(folder);
    addLinkHandlers();
    copy_btn.addEventListener('click', function(evt) {
        copy_info();
    });
});

function populateFolderInfo(folder)
{
    var listbox = dom.qs('#SavedSearchInSubFolders-folder-info');
    add_row(listbox, 'Name', folder.name);
    add_row(listbox, 'URI', folder.folderURL);
    add_row(listbox, 'Flags', [k for([k, v] of enumerateFlags(folder))].join(', '));
    add_row(listbox, 'Has subfolders', folder.hasSubFolders);
    add_row(listbox, 'Number of messages', folder.getTotalMessages(false));
    if (folder.hasSubFolders) {
        add_row(listbox, 'Number of subfolders', folder.numSubFolders);
        add_row(listbox, 'Number of messages (including subfolders)', folder.getTotalMessages(true));
    }
    add_row(listbox, 'Local path', folder.filePath.path);
    add_row(listbox, 'Charset', folder.charset);
    add_row(listbox, 'Size on disk', folder.sizeOnDisk);
    add_row(listbox, 'Allows sub folder creation ?', folder.canCreateSubfolders);
    add_row(listbox, 'Allows renaming ?', folder.canRename);
    add_row(listbox, 'Allows compacting ?', folder.canCompact);
    add_row(listbox, 'In Virtual folder search scope ?', folder.inVFEditSearchScope);
    if (folder instanceof Ci.nsIMsgImapMailFolder) {
        add_row(listbox, '[IMAP] Verified as online folder ?', folder.verifiedAsOnlineFolder);
        add_row(listbox, '[IMAP] Online name', folder.onlineName);
        add_row(listbox, '[IMAP] Is namespace?', folder.isNamespace);
        add_row(listbox, '[IMAP] Hierarchy delimiter', folder.hierarchyDelimiter);
    }
}

function enumerateFlags(folder)
{
    var flags = folder.flags;
    for (let f in FolderFlags) {
        if (flags & FolderFlags[f]) {
            yield [f, FolderFlags[f]];
        }
    }  
}

function populateServerInfo(folder)
{
    var listbox = dom.qs('#SavedSearchInSubFolders-server-info'),
        server = folder.server;
    add_row(listbox, 'URI', server.serverURI);
    add_row(listbox, 'Host', server.hostName);
    add_row(listbox, 'User', server.username);
    add_row(listbox, 'Port', server.port);
    add_row(listbox, 'Remote type', server.type);
    add_row(listbox, 'Local type', server.localStoreType);
    add_row(listbox, 'Local path', server.localPath.path);
    add_row(listbox, 'Allows search operations ?', server.canSearchMessages);
    add_row(listbox, 'Allows sub folder creation ?', server.canCreateFoldersOnServer);
    add_row(listbox, 'Supports filters ?', server.canHaveFilters);
    add_row(listbox, 'Allows message filing ?', server.canFileMessagesOnServer);
    add_row(listbox, 'Allows compacting folders ?', server.canCompactFoldersOnServer);
    add_row(listbox, 'Allows undo delete ?', server.canUndoDeleteOnServer);
    if (server instanceof Ci.nsIImapIncomingServer) {
        add_row(listbox, '[IMAP] Admin URL', server.adminUrl);
        add_row(listbox, '[IMAP] Server directory', server.serverDirectory);
        add_row(listbox, '[IMAP] Supports dual-use folders', server.dualUseFolders);
        add_row(listbox, '[IMAP] Max number of connections', server.maximumConnectionsNumber);
        add_row(listbox, '[IMAP] Personal namespace', server.personalNamespace);
        add_row(listbox, '[IMAP] Public namespace', server.publicNamespace);
        add_row(listbox, '[IMAP] Other users namespace', server.otherUsersNamespace);
        add_row(listbox, '[IMAP] Is AOL server ?', server.isAOLServer);
        add_row(listbox, '[IMAP] Is GMail server ?', server.isGMailServer);
    }

}

function addLinkHandlers()
{
    var links = dom.qsa('#SavedSearchInSubFolders-debug-panel a[href]');
    for (let link of links) {
        link.addEventListener('click', function(event) {
            event.preventDefault();
            moz.openUri(link.href);
        });
    }
}

function copy_info()
{
    var output = ['# Folder Info', '# ===================='];
    for (let row of dom.qsa('#SavedSearchInSubFolders-folder-info listitem')) {
        output.push(serialize_row(row));
    }
    output.push('', '# ServerInfo', '# ====================');
    for (let row of dom.qsa('#SavedSearchInSubFolders-server-info listitem')) {
        output.push(serialize_row(row));
    }
    output = output.join('\n');
    moz.clipboardHelper.copyString(output);
}

function add_row(listbox)
{
    var args = Array.prototype.slice.call(arguments, 1),
        row = dom.el('listitem');
    for (let arg of args) {
        let cell = dom.el('listcell');
        dom.attr(cell, 'label', arg);
        dom.append(cell, row)
    }
    dom.append(row, listbox);
}

function serialize_row(row)
{
    var cells = dom.qsa('listcell', row),
        output = [];
    for (let cell of cells) {
        output.push(dom.attr(cell, 'label'));
    }
    return output.join(': ');
}


})();
