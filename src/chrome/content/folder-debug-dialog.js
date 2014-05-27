(function() {

const XUL = "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";
const HTML = "http://www.w3.org/1999/xhtml";

const {
    classes: Cc,
    interfaces: Ci,
    utils: Cu,
    results: Cr
} = Components;

const FolderFlags = Ci.nsMsgFolderFlags;

Cu.import("resource://app/modules/virtualFolderWrapper.js");

Cu.import("resource://SavedSearchInSubFolders/dom.js");
Cu.import("resource://SavedSearchInSubFolders/moz.js");
Cu.import("resource://SavedSearchInSubFolders/SavedSearchInSubFolders.js");

var j3s = ju1ius.SavedSearchInSubFolders,
    dom = DOM(document);

window.addEventListener('load', function()
{
    var folder = window.arguments[0].folder,
        copy_btn = dom.qs('#copy-info');
    if (!folder) {
        j3s.log('No folder specified');
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
    var listbox = dom.qs('#folder-info');
    add_row(listbox, 'Name', folder.name);
    add_row(listbox, 'URI', folder.URI);
    add_row(listbox, 'URL', folder.folderURL);
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
    if (folder instanceof Ci.nsIMsgImapMailFolder) {
        add_row(listbox, '[IMAP] Verified as online folder ?', folder.verifiedAsOnlineFolder);
        add_row(listbox, '[IMAP] Online name', folder.onlineName);
        add_row(listbox, '[IMAP] Is namespace?', folder.isNamespace);
        add_row(listbox, '[IMAP] Hierarchy delimiter', folder.hierarchyDelimiter);
    }
    if (folder.flags & FolderFlags.Virtual) {
        let vf = VirtualFolderHelper.wrapVirtualFolder(folder),
            search_uris = vf.searchFolderURIs.split('|');
        vf.cleanUpMessageDatabase();
        add_row(listbox, '[VIRTUAL] Search URIs', search_uris);
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
    var listbox = dom.qs('#server-info'),
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
    var links = dom.qsa('a[href]');
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
    for (let row of dom.qsa('#folder-info row')) {
        output.push(serialize_row(row));
    }
    output.push('', '# ServerInfo', '# ====================');
    for (let row of dom.qsa('#server-info row')) {
        output.push(serialize_row(row));
    }
    output = output.join('\n');
    moz.clipboardHelper.copyString(output);
}

function add_row(listbox)
{
    var args = Array.prototype.slice.call(arguments, 1),
        row = dom.el('row');
    for (let arg of args) {
        if (Array.isArray(arg)) {
            let p = dom.el('p', HTML);
            for (let line of arg) {
                dom.append(line, p);
                dom.append(dom.el('br', HTML), p);
            }
            dom.append(p, row);
        } else {
            let cell = dom.el('label');
            dom.attr(cell, 'value', arg);
            dom.append(cell, row)
        }
    }
    dom.append(row, listbox);
}

function serialize_row(row)
{
    var cells = dom.qsa('label, p', row),
        output = [];
    for (let cell of cells) {
        switch (cell.nodeName) {
            case 'label':
                output.push(dom.attr(cell, 'value'));
                break;
            default:
                output.push(dom.text(cell));
                break;
        }
    }
    return output.join(': ');
}


})();
