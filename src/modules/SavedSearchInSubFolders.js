var EXPORTED_SYMBOLS = ['ju1ius'];

const {classes: Cc, interfaces: Ci, utils: Cu, results : Cr} = Components;

Cu.import("resource://app/modules/iteratorUtils.jsm");
Cu.import("resource://app/modules/virtualFolderWrapper.js");
Cu.import("resource://gre/modules/StringBundle.js");
Cu.import("resource://gre/modules/Services.jsm");

Cu.import("resource://SavedSearchInSubFolders/moz.js");

/**
 * Set up our global namespace
 **/
if (!ju1ius || typeof ju1ius !== 'object') {
    var ju1ius = {};
}

const FolderFlags = Ci.nsMsgFolderFlags;


var SavedSearchInSubFolders = function()
{
    this.preferences = Services.prefs.getBranch("extensions.savedsearchinsubfolders.");
    this.strbundle = new StringBundle('chrome://SavedSearchInSubFolders/locale/messages.properties');

    if (this.preferences.getBoolPref('watch_folders')) {
        moz.mailSession.AddFolderListener(this, Ci.nsIFolderListener.added);
        // The following are already handled internally
        //MailSession.AddFolderListener(this, Ci.nsIFolderListener.removed);
        //MailSession.AddFolderListener(this, Ci.nsIFolderListener.event);
    }
}

SavedSearchInSubFolders.prototype = {

    /**
     * Watch for newly created folders. Implements nsIFolderListener.
     *
     * @param nsIMsgFolder parent_folder
     * @param nsISupports  item
     **/
    OnItemAdded: function(parent_item, item)
    {
        // Not a Folder...
        if (!(item instanceof Ci.nsIMsgFolder)) return;
        // If no parent, this is an account
        if (!parent_item) return;
        if (this.isTrash(item) || this.isVirtual(item) || this.isJunk(item)) {
            return;
        }
        // update all virtual folders, since this folder could appear in
        // several of them
        this.updateVirtualFolders();
    },

    OnItemEvent: function(item, event)
    {
        if (!(item instanceof Ci.nsIMsgFolder)) return;
        if (this.isTrash(item) || this.isVirtual(item) || this.isJunk(item)) {
            return;
        }
        if (event.toString() == "RenameCompleted") {
            for each(let vf in this.getVirtualFoldersForSearchUri(item.folderURL)) {
                this.updateVirtualFolder(vf);
            }
        }
    },

    OnItemRemoved: function (parent_item, item) {
        if (!(item instanceof Ci.nsIMsgFolder)) return;
        if (this.isTrash(item) || this.isVirtual(item) || this.isJunk(item)) {
            return;
        }
        for each(let vf in this.getVirtualFoldersForSearchUri(item.folderURL)) {
            this.updateVirtualFolder(vf);
        }
    },

    /**
     * Updates search folders of all virtual folders
     * to include all descendant subfolders
     **/
    updateVirtualFolders: function()
    {
        let start_time = Date.now();
        for each(let virtual_folder in this.getAllVirtualFolders()) {
            let search_uris = this.getSearchUrisWithDescendants(virtual_folder);
            virtual_folder.searchFolders = search_uris.join('|');
            virtual_folder.cleanUpMessageDatabase();
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
    updateVirtualFolder: function(virtual_folder)
    {
        let start_time = Date.now();
        if (virtual_folder instanceof Ci.nsIMsgFolder) {
            virtual_folder = VirtualFolderHelper.wrapVirtualFolder(virtual_folder);
        }
        let search_uris = this.getSearchUrisWithDescendants(virtual_folder);
        virtual_folder.searchFolders = search_uris.join('|');
        virtual_folder.cleanUpMessageDatabase();
        moz.accountManager.saveVirtualFolders();
        this.addActivityEvent("update.activity.message", start_time);
    },

    /**
     * Returns an Iterator on all the virtual folders,
     * as instances of VirtualFolderWrapper
     *
     * Don't forget to call the cleanUpMessageDatabase() method
     * on each instance to avoid memory leaks.
     *
     * @return Iterator
     **/
    getAllVirtualFolders: function()
    {
        var virtual_folders = [];
        for each(let server in this.getAllServers()) {
            for each(let virtual_folder in this.getVirtualFolders(server)) {
                let wrapper = VirtualFolderHelper.wrapVirtualFolder(virtual_folder);
                virtual_folders.push(wrapper);
            }
        }
        return fixIterator(virtual_folders);
    },

    /**
     * Returns an Iterator on all virtual folders having
     * their searchFolderURIs property containing the given uri
     * as instances of VirtualFolderWrapper
     *
     * Don't forget to call the cleanUpMessageDatabase() method
     * on each instance to avoid memory leaks.
     *
     * @return Iterator
     **/
    getVirtualFoldersForSearchUri: function(uri)
    {
        var virtual_folders = [];
        for each(let vf in this.getAllVirtualFolders()) {
            if (-1 !== vf.searchFolderURIs.indexOf(uri)) virtual_folders.push(vf);
        }
        return fixIterator(virtual_folders);
    },

    /**
     * Returns an iterator on all incoming servers,
     * as instances of nsIMsgIncomingServer.
     *
     * @return Iterator
     **/
    getAllServers: function()
    {
        return fixIterator(moz.accountManager.allServers, Ci.nsIMsgIncomingServer);
    },

    /**
     * Returns an iterator on all the virtual folders of the given nsIMsgIncomingServer,
     * as instances of nsIMsgFolder.
     *
     * @return Iterator
     **/
    getVirtualFolders: function(server)
    {
        let virtual_folders = [],
        rootFolder  = server.rootFolder;
        if (rootFolder) {
            for each(let folder in this.getDescendants(rootFolder)) {
                if (folder.flags & FolderFlags.Virtual) {
                    virtual_folders.push(folder);
                }
            }
        }
        return fixIterator(virtual_folders, Ci.nsIMsgFolder);
    },

    /**
     * Returns the URIs of all descendants of the given nsIMsgFolder
     *
     * @return Array
     **/
    getDescendantsUris: function(aFolder)
    {
        let uris = [];
        for each(let current_folder in this.getDescendants(aFolder)) {
            uris.push(current_folder.folderURL);
        }
        return uris;
    },

    /**
     * Returns an iterator on all the descendants of the given nsIMsgFolder,
     * as instances of nsIMsgFolder.
     *
     * @return Iterator
     **/
    getDescendants: function(aFolder)
    {
        let subFolders = Cc["@mozilla.org/array;1"].createInstance(Ci.nsIMutableArray);
        aFolder.ListDescendants(subFolders);
        return fixIterator(subFolders, Ci.nsIMsgFolder);
    },

    /**
     * Returns a list of search folder URIs, including all subfolders,
     * for a given virtual folder.
     *
     * @param VirtualFolderWrapper virtual_folder
     *
     * @return Array The list of search URIs
     **/
    getSearchUrisWithDescendants: function(virtual_folder)
    {
        var search_uris = {};
        let searchFolders = virtual_folder.searchFolders;
        for each(let folder in fixIterator(searchFolders, Ci.nsIMsgFolder)) {
            search_uris[folder.folderURL] = null;
            if (!folder.hasSubFolders || this.isInbox(folder)) continue;
            for each(let uri in this.getDescendantsUris(folder)) {
                search_uris[uri] = null
            }
        }
        return Object.keys(search_uris);
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
        return this.strbundle.get(msg, args); 
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
        if (this.preferences.getBoolPref('debug')) {
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


/**
 * Export our module class as a Singleton
 **/
var __instance__ = null;

ju1ius.SavedSearchInSubFolders = {

    getInstance: function()
    {
        if (null === __instance__) {
            var newClass = Object.create(SavedSearchInSubFolders.prototype);
            __instance__ = SavedSearchInSubFolders.apply(newClass, arguments) || newClass; 
        }
        return __instance__;
    },

    reload: function()
    {
        __instance__ = null;
        ju1ius.SavedSearchInSubFolders.getInstance();
    }

};
