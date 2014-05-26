var EXPORTED_SYMBOLS = ['ju1ius'];

const {classes: Cc, interfaces: Ci, utils: Cu, results : Cr} = Components;

Cu.import("resource://app/modules/iteratorUtils.jsm");
Cu.import("resource://app/modules/virtualFolderWrapper.js");
Cu.import("resource://gre/modules/StringBundle.js");
Cu.import("resource://gre/modules/Services.jsm");

Cu.import("resource://SavedSearchInSubFolders/moz.js");

moz.app.console.log('SavedSearchInSubFolders Extension loaded');

/**
 * Set up our global namespace
 **/
if (!ju1ius || typeof ju1ius !== 'object') {
    var ju1ius = {};
}

const FolderFlags = Ci.nsMsgFolderFlags;

var j3s, SavedSearchInSubFolders, FolderListener,
    prefs, strbundle;

prefs = Services.prefs.getBranch("extensions.savedsearchinsubfolders.");
strbundle = new StringBundle('chrome://SavedSearchInSubFolders/locale/messages.properties');

FolderListener = {

    /**
     * Watch for newly created folders. Implements nsIFolderListener.
     *
     * @param nsIMsgFolder parent_folder
     * @param nsISupports  item
     **/
    OnItemAdded: function(parent_item, item)
    {
        // Not a Folder...
        if (!(item instanceof Ci.nsIMsgFolder)) {
            return;
        }
        // If no parent, this is an account
        if (!parent_item) {
            return;
        }
        if (j3s.isTrash(item) || j3s.isVirtual(item) || j3s.isJunk(item)) {
            return;
        }
        // update all virtual folders, since this folder could appear in
        // several of them
        j3s.updateVirtualFolders();
    },

    OnItemEvent: function(item, event)
    {
        if (!(item instanceof Ci.nsIMsgFolder)) {
            return;
        }
        if (j3s.isTrash(item) || j3s.isVirtual(item) || j3s.isJunk(item)) {
            return;
        }
        if (event.toString() == "RenameCompleted") {
            for (let vf of j3s.getVirtualFoldersForSearchUri(item.URI)) {
                j3s.updateVirtualFolder(vf);
            }
        }
    },

    OnItemRemoved: function (parent_item, item)
    {
        if (!(item instanceof Ci.nsIMsgFolder)) {
            return;
        }
        if (j3s.isTrash(item) || j3s.isVirtual(item) || j3s.isJunk(item)) {
            return;
        }
        for (let vf of j3s.getVirtualFoldersForSearchUri(item.URI)) {
            j3s.updateVirtualFolder(vf);
        }
    }
};


SavedSearchInSubFolders = {

    boot: function()
    {
        if (prefs.getBoolPref('watch_folders')) {
            this.watchFolders();
        }
    },

    shutdown: function()
    {
        this.unwatchFolders();
    },

    reboot: function()
    {
        this.shutdown();
        this.boot();
    },

    watchFolders: function()
    {
        moz.mailSession.AddFolderListener(FolderListener, Ci.nsIFolderListener.added);
        // The following are already handled internally
        //moz.mailSession.AddFolderListener(FolderListener, Ci.nsIFolderListener.removed);
        //moz.mailSession.AddFolderListener(FolderListener, Ci.nsIFolderListener.event);
    },

    unwatchFolders: function()
    {
        moz.mailSession.RemoveFolderListener(FolderListener);
    },

    /**
     * Updates search folders of all virtual folders
     * to include all descendant subfolders
     **/
    updateVirtualFolders: function()
    {
        let start_time = Date.now();
        for (let vf of this.getAllVirtualFolders()) {
            let wrapped = vf.virtualFolder;
            this.debug('Updating virtual folder: ' + wrapped.name);
            let searchFolders = [f for(f of this.getSearchFoldersWithDescendants(vf))],
                search_str = [f.URI for(f of searchFolders)].join('|');
            vf.searchFolders = searchFolders;
            //let search_uris = this.getSearchUrisWithDescendants(vf),
                //search_str = search_uris.join('|');
            //vf.searchFolders = search_str;
            vf.cleanUpMessageDatabase();
            this.debug(wrapped.name + ': ' + search_str);
        }
        moz.accountManager.saveVirtualFolders();
        this.addActivityEvent("update.activity.message", start_time);
    },

    /**
     * Updates all search folders of a given virtual folder
     * to include all descendant subfolders
     *
     * @param VirtualFolderWrapper | nsIMsgFolder virtual_folder
     **/
    updateVirtualFolder: function(vf)
    {
        let start_time = Date.now();
        if (vf instanceof Ci.nsIMsgFolder) {
            vf = VirtualFolderHelper.wrapVirtualFolder(vf);
        }
        let wrapped = vf.virtualFolder;
        this.debug('Updating virtual folder: ' + wrapped.name);
        let search_uris = this.getSearchUrisWithDescendants(vf);
        vf.searchFolders = search_uris.join('|');
        vf.cleanUpMessageDatabase();
        this.debug(wrapped.name + ': ' + search_str);
        moz.accountManager.saveVirtualFolders();
        this.addActivityEvent("update.activity.message", start_time);
    },

    /**
     * Yields all the virtual folders, as instances of VirtualFolderWrapper
     *
     * Don't forget to call the cleanUpMessageDatabase() method
     * on each instance to avoid memory leaks.
     *
     **/
    getAllVirtualFolders: function()
    {
        for (let server of this.getAllServers()) {
            for (let vf of this.getVirtualFolders(server)) {
                yield VirtualFolderHelper.wrapVirtualFolder(vf);
            }
        }
    },

    /**
     * Yields all virtual folders having
     * their searchFolderURIs property containing the given uri,
     * as instances of VirtualFolderWrapper
     *
     * Don't forget to call the cleanUpMessageDatabase() method
     * on each instance to avoid memory leaks.
     *
     **/
    getVirtualFoldersForSearchUri: function(uri)
    {
        for (let vf of this.getAllVirtualFolders()) {
            if (-1 !== vf.searchFolderURIs.indexOf(uri)) {
                yield vf;
            }
        }
    },

    /**
     * Returns an iterator on all incoming servers,
     * as instances of nsIMsgIncomingServer.
     *
     * @return Iterator
     **/
    getAllServers: function()
    {
        let it = fixIterator(moz.accountManager.allServers, Ci.nsIMsgIncomingServer);
        return (s for(s in it));
    },

    /**
     * Yields all virtual folders on the given nsIMsgIncomingServer,
     * as instances of nsIMsgFolder.
     *
     **/
    getVirtualFolders: function(server)
    {
        let rootFolder  = server.rootFolder;
        if (!rootFolder) {
            this.debug('Server at ' + server.serverURI + ' does not have a root folder !');
            return;
        }
        for (let folder of this.getDescendants(rootFolder)) {
            if (folder.flags & FolderFlags.Virtual) {
                yield folder;
            }
        }
    },

    /**
     * Yields the URIs of all descendants of the given nsIMsgFolder
     *
     **/
    getDescendantsUris: function(folder)
    {
        for (let desc of this.getDescendants(folder)) {
            yield desc.URI;
        }
    },

    /**
     * Returns an iterator on all the descendants of the given nsIMsgFolder,
     * as instances of nsIMsgFolder.
     *
     * @return Iterator
     **/
    getDescendants: function(folder)
    {
        let subFolders = Cc["@mozilla.org/array;1"].createInstance(Ci.nsIMutableArray);
        folder.ListDescendants(subFolders);
        return (f for(f in fixIterator(subFolders, Ci.nsIMsgFolder)));
    },

    /**
     * Returns a list of search folder URIs, including all subfolders,
     * for a given virtual folder.
     *
     * @param VirtualFolderWrapper vf
     *
     * @return Array The list of search URIs
     **/
    getSearchUrisWithDescendants: function(vf)
    {
        var uris = new Set();
        for (let folder of vf.searchFolders) {
            uris.add(folder.URI);
            if (!folder.hasSubFolders || this.isInbox(folder)) continue;
            for (let uri of this.getDescendantsUris(folder)) {
                uris.add(uri);
            }
        }
        return (u for(u of uris));
    },

    getSearchFoldersWithDescendants: function(vf)
    {
        var searchFolders = new Set();
        for (let folder of vf.searchFolders) {
            searchFolders.add(folder);
            if (!folder.hasSubFolders || this.isInbox(folder)) continue;
            for (let desc of this.getDescendants(folder)) {
                searchFolders.add(folder);
            }
        }
        return (f for(f of searchFolders));
    },

    isInbox: function(folder)
    {
        return folder.isSpecialFolder(FolderFlags.Inbox, false);
    },

    isTrash: function(folder)
    {
        return folder.isSpecialFolder(FolderFlags.Trash, true);
    },

    isVirtual: function(folder, check_parents)
    {
        check_parents = !!check_parents;
        return folder.isSpecialFolder(FolderFlags.Virtual, check_parents);
    },

    isJunk: function(folder)
    {
        return folder.isSpecialFolder(FolderFlags.Junk, true);
    },

    isLeafFolder: function(folder)
    {
        var hasSubFolders = folder.hasSubFolders,
            hasMessages = folder.getTotalMessages(false),
            isSpecial = folder.isSpecialFolder(FolderFlags.Virtual
                                                | FolderFlags.Trash
                                                | FolderFlags.Inbox
                                                | FolderFlags.Junk,
                                                false);
        return !hasSubFolders && !hasMessages;
    },

    /**
     * Fires an activity event
     *
     * @param String|Array  message
     * @param Date          start_time
     **/
    addActivityEvent: function(message, start_time)
    {
        if (message instanceof Array) {
            message = this.localize(message[0], message.slice(1));
        } else if (typeof message === "string") {
            message = this.localize(message);
        }
        // Add and activity event
        let event = Cc["@mozilla.org/activity-event;1"].createInstance(Ci.nsIActivityEvent);
        // Initiator is omitted  
        event.init(message, null, "SavedSearchInSubFolders", start_time, Date.now());
        moz.activityManager.addActivity(event);
    },

    /**
     * Translates a localized string
     *
     * @param String  id
     * @param Array   args
     **/
    localize: function(msg, args)
    {
        return strbundle.get(msg, args); 
    },

    /**
     * Logs a message to the javascript console
     *
     * @param String msg
     **/
    log: function(msg)
    {
        moz.app.console.log(msg);
    },

    /**
     * Outputs a debugging message to the javascript console,
     * only if the debug pref is true.
     *
     * @param String msg
     **/
    debug: function(msg)
    {
        if (prefs.getBoolPref('debug')) {
            this.log("[SavedSearchInSubFolders] " + msg);
        }
    },

    /**
     * Opens a cofirm dialog
     *
     * @param String title
     * @param String msg
     **/
    confirm: function(title, msg)
    {
        return Services.prompt.confirm(null, title, msg);
    }

};

function delegate(obj, method) {
    return function () {
        return obj[method].apply(obj, arguments);
    } 
}

/**
 * Prefs methods shortcuts
 */
for (let method of ['getIntPref', 'getBoolPref', 'getCharPref']) {
    SavedSearchInSubFolders[method] = delegate(prefs, method);
}


ju1ius.SavedSearchInSubFolders = SavedSearchInSubFolders;
