var EXPORTED_SYMBOLS = ['ju1ius'];

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cr = Components.results;
const Cu = Components.utils;

Cu.import("resource:///modules/iteratorUtils.jsm");
Cu.import("resource:///modules/virtualFolderWrapper.js");
Cu.import("resource:///modules/StringBundle.js");
Cu.import("resource://gre/modules/Services.jsm");

const app = Cc["@mozilla.org/steel/application;1"].getService(Ci.steelIApplication);
const AccountManager = Cc["@mozilla.org/messenger/account-manager;1"].getService(Ci.nsIMsgAccountManager);
const ActivityManager = Cc["@mozilla.org/activity-manager;1"].getService(Ci.nsIActivityManager);
const MailSession = Cc["@mozilla.org/messenger/services/session;1"].getService(Ci.nsIMsgMailSession);
const NotificationService =  Cc["@mozilla.org/messenger/msgnotificationservice;1"].getService(Ci.nsIMsgFolderNotificationService);
const nsMsgFolderFlags = Ci.nsMsgFolderFlags;


var SavedSearchInSubFolders = function()
{
  this.preferences = Services.prefs.getBranch("extensions.savedsearchinsubfolders.");
  this.strbundle = new StringBundle('chrome://SavedSearchInSubFolders/locale/messages.properties');

  if(this.preferences.getBoolPref('watch_folders')) {
    MailSession.AddFolderListener(this, Ci.nsIFolderListener.added);
  }
}

SavedSearchInSubFolders.prototype = {

  /**
   * Watch for newly created folders. Implements nsIFolderListener.
   *
   * @param nsIMsgFolder parent_folder
   * @param nsISupports  item
   **/
  OnItemAdded: function(parent_folder, item)
  {
    // If no parent, this is an account
    if(!parent_folder || parent_folder.isSpecialFolder(nsMsgFolderFlags.Trash, false)) {
      return;
    }

    if(item instanceof Ci.nsIMsgFolder) {
      folder = item.QueryInterface(Ci.nsIMsgFolder);
      if(folder.isSpecialFolder(nsMsgFolderFlags.Trash, true)) {
        return;
      } else if(folder.isSpecialFolder(nsMsgFolderFlags.Virtual, false)) {
        this.updateVirtualFolder(folder);
        return;
      }
      this.updateVirtualFolders();
    }
  },

  /**
   * Updates search folders of all virtual folders
   * to include all descendent subfolders
   **/
  updateVirtualFolders: function()
  {
    let start_time = Date.now();
    for each(let virtual_folder in this.getAllVirtualFolders()) {
      let search_uris = this.getSearchUrisWithDescendents(virtual_folder);
      virtual_folder.searchFolders = search_uris.join('|');
      virtual_folder.cleanUpMessageDatabase();
    }
    AccountManager.saveVirtualFolders();
    this.addActivityEvent("update.activity.message", start_time);
  },

  /**
   * Updates all search folders of a given virtual folder
   * to include all descendent subfolders
   *
   * @param VirtualFolderWrapper | nsIMsgFolder virtual_folder
   **/
  updateVirtualFolder: function(virtual_folder)
  {
    let start_time = Date.now();
    if(virtual_folder instanceof Ci.nsIMsgFolder) {
      virtual_folder = VirtualFolderHelper.wrapVirtualFolder(virtual_folder);
    }
    let search_uris = this.getSearchUrisWithDescendents(virtual_folder);
    virtual_folder.searchFolders = search_uris.join('|');
    virtual_folder.cleanUpMessageDatabase();
    AccountManager.saveVirtualFolders();
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
   * Returns an iterator on all incoming servers,
   * as instances of nsIMsgIncomingServer.
   *
   * @return Iterator
   **/
  getAllServers: function()
  {
    return fixIterator(AccountManager.allServers, Ci.nsIMsgIncomingServer);
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
      for each(let folder in this.getDescendents(rootFolder)) {
        if(folder.flags & nsMsgFolderFlags.Virtual) {
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
  getDescendentsUris: function(aFolder)
  {
    let uris = [];
    for each(let current_folder in this.getDescendents(aFolder)) {
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
  getDescendents: function(aFolder)
  {
    let subFolders = Cc["@mozilla.org/supports-array;1"].createInstance(Ci.nsISupportsArray);
    aFolder.ListDescendents(subFolders);
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
  getSearchUrisWithDescendents: function(virtual_folder)
  {
    let searchFolders = virtual_folder.searchFolders;
    var search_uris = [];
    for each(let folder in fixIterator(searchFolders, Ci.nsIMsgFolder)) {
      search_uris.push(folder.folderURL);
      if(!folder.hasSubFolders) continue;
      if(folder.isSpecialFolder(nsMsgFolderFlags.Inbox, false)) continue;
      var uris = this.getDescendentsUris(folder);
      for(let i = 0, l = uris.length; i < l; ++i) {
        let uri = uris[i];
        if(-1 === search_uris.indexOf(uri)) {
          search_uris.push(uri);
        }
      }
    }
    return search_uris;
  },

  /**
   * Fires an activity event
   *
   * @param String|Array  message
   * @param Date          start_time
   **/
  addActivityEvent: function(message, start_time)
  {
    if(message instanceof Array) {
      message = this.localize(message[0], message.slice(1));
    } else if (typeof message === "string") {
      message = this.localize(message);
    }
    // Add and activity event
    let event = Cc["@mozilla.org/activity-event;1"].createInstance(Ci.nsIActivityEvent);
    // Initiator is omitted  
    event.init(message, null, "SavedSearchInSubFolders", start_time, Date.now());
    ActivityManager.addActivity(event);
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
    app.console.log(msg);
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

var _instance = null;

var ju1ius =
{
  SavedSearchInSubFolders:
  {
    getInstance: function()
    {
      if(null === _instance) {
        var newClass = Object.create(SavedSearchInSubFolders.prototype);
        _instance = SavedSearchInSubFolders.apply(newClass, arguments) || newClass; 
      }
      return _instance;
    },

    reload: function()
    {
      _instance = null;
      ju1ius.SavedSearchInSubFolders.getInstance();
    }
  }
}

