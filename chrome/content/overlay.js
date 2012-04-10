(function(){

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cr = Components.results;
const Cu = Components.utils;

Cu.import("resource:///modules/iteratorUtils.jsm");
Cu.import("resource:///modules/virtualFolderWrapper.js");

const Application = Cc["@mozilla.org/steel/application;1"].getService(Ci.steelIApplication);
const AccountManager = Cc["@mozilla.org/messenger/account-manager;1"].getService(Ci.nsIMsgAccountManager);
const ActivityManager = Cc["@mozilla.org/activity-manager;1"].getService(Ci.nsIActivityManager);
const PrefService = Cc["@mozilla.org/preferences-service;1"].getService(Ci.nsIPrefService);
const PromptService = Cc["@mozilla.org/embedcomp/prompt-service;1"].getService(Ci.nsIPromptService);
const MailSession = Cc["@mozilla.org/messenger/services/session;1"].getService(Ci.nsIMsgMailSession);
const NotificationService =  Cc["@mozilla.org/messenger/msgnotificationservice;1"].getService(Ci.nsIMsgFolderNotificationService);
//const RdfService = Cc['@mozilla.org/rdf/rdf-service;1'].getService(Ci.nsIRDFService);

var ju1ius = {};

/*
ju1ius.FolderListener = function(){};
ju1ius.FolderListener.prototype = {
  OnItemAdded: function(parent, item, viewString) {
    Application.console.log(parent);
    Application.console.log(item);
    Application.console.log(viewString);
  },
  OnItemRemoved: function(parent, item, viewString) {
    Application.console.log(parent);
    Application.console.log(item);
    Application.console.log(viewString);
  },
  OnItemPropertyChanged: function(parent, item, viewString) {},
  OnItemIntPropertyChanged: function(item, property, oldValue, newValue) {},
  OnItemBoolPropertyChanged: function(item, property, oldValue, newValue) {},
  OnItemUnicharPropertyChanged: function(item, property, oldValue, newValue) {},
  OnItemPropertyFlagChanged: function(item, property, oldFlag, newFlag) {},
  OnItemEvent: function(item, event) {
    Application.console.log(event);
    Application.console.log(item);
  },
  OnFolderLoaded: function(aFolder) {},
  OnDeleteOrMoveMessagesCompleted: function(aFolder) {}
};

ju1ius.MsgFolderListener = function(){};
ju1ius.MsgFolderListener.prototype = {
  folderAdded: function(aFolder) {
    Application.console.log(aFolder);
  },
  folderDeleted: function(aFolder) {
    Application.console.log(aFolder);
  },
  folderMoveCopyCompleted: function(aMove, aSrcFolder, aDestFolder) {
    Application.console.log(aMove, aSrcFolder, aDestFolder);
  },
  folderRenamed: function(aOrigFolder, aNewFolder) {
    Application.console.log(aOrigFolder, aNewFolder);
  },
  itemEvent: function(aItem, aEvent, aData) {
    Application.console.log(aItem, aEvent, aData);
  }
}
*/

ju1ius.SavedSearchInSubFolders = function()
{
  this.string_bundle = document.getElementById("SavedSearchInSubFolders-string-bundle");
  this.preferences = PrefService.getBranch("extensions.SavedSearchInSubFolders.");

  this.menu_item = document.getElementById('SavedSearchInSubFolders-action-menu-item');
  this.menu_item.addEventListener('command', this.onMenuItemCommand.bind(this));

  MailSession.AddFolderListener(this, Ci.nsIFolderListener.added);
  //NotificationService.addListener(
    //this,
    //NotificationService.folderAdded |
    //NotificationService.folderDeleted |
    //NotificationService.folderMoveCopyCompleted |
    //NotificationService.folderRenamed |
    //NotificationService.itemEvent
  //);
}

ju1ius.SavedSearchInSubFolders.prototype = {

  // ---------- nsIFolderListener implementation
  //
  OnItemAdded: function(aParentFolder, aFolder)
  {
    // If no parent, this is an account
    if(!aParentFolder) { return; }
    if(aFolder.isSpecialFolder(nsMsgFolderFlags.Trash, false)) {
      return;
    }
    //Application.console.log("Added: " + aParentFolder.URI + " > " + aFolder.URI);
    this.updateVirtualFolders();
  },
  //
  // ---------- /END nsIFolderListener implementation
  
  // ---------- nsIMsgFolderListener implementation
  /*
  folderAdded: function(aFolder) {
    if (aFolder.isSpecialFolder(nsMsgFolderFlags.Trash, false)) {
      return;
    }
    this.updateVirtualFolders();
    Application.console.log("Added: " + aFolder.URI);
    this.last_event = {
      type: 'added',
      uri: aFolder.folderURL
    };
  },
  */
  // ---------- /END nsIMsgFolderListener implementation

  onMenuItemCommand: function(e)
  {
    if(!this.prompt()) {
      return;
    }
    this.updateVirtualFolders();
  },

  prompt: function()
  {
    let p_msg = this.string_bundle.getString("promptMessage"),
        p_msg_q = this.string_bundle.getString("promptMessage_Question"),
        t_msg = this.string_bundle.getString("promptTitle"),
        p_msg_c = p_msg + " " + p_msg_q;

    return PromptService.confirm(null, t_msg, p_msg_c);
  },

  updateVirtualFolders: function()
  {
    let start_time = Date.now();

    for each(let virtual_folder in this.getAllVirtualFolders()) {
      let searchFolders = virtual_folder.searchFolders;
      var search_uris = [];
      for each(let folder in fixIterator(searchFolders, Ci.nsIMsgFolder)) {
        search_uris.push(folder.folderURL);
        if(!folder.hasSubFolders) continue;
        if(folder.flags & nsMsgFolderFlags.Inbox) continue;
        //Application.console.log(folder.folderURL);
        var uris = this.getDescendentsUris(folder);
        for(let i = 0, l = uris.length; i < l; ++i) {
          let uri = uris[i];
          if(-1 === search_uris.indexOf(uri)) {
            search_uris.push(uri);
          }
        }
      }
      //virtual_folder.searchFolders = search_uris.join('|');
      Application.console.log(search_uris);
      virtual_folder.cleanUpMessageDatabase();
    }
    //AccountManager.saveVirtualFolders();
    this.addActivityEvent(this.string_bundle.getString("activityMessage"), start_time);
  },

  /**
   * Returns all virtual folders as instance of VirtualFolderHelper
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
   * Returns an iterator on all incoming servers as nsIMsgIncomingServer.
   *
   * @return Iterator
   **/
  getAllServers: function()
  {
    return fixIterator(AccountManager.allServers, Ci.nsIMsgIncomingServer);
  },

  /**
   * Returns an iterator on all virtual folders of the given nsIMsgIncomingServer, as nsIMsgFolder.
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
   * Returns an iterator on all descendants of the given nsIMsgFolder, as nsIMsgFolder.
   *
   * @return Iterator
   **/
  getDescendents: function(aFolder)
  {
    let subFolders = Cc["@mozilla.org/supports-array;1"].createInstance(Ci.nsISupportsArray);
    aFolder.ListDescendents(subFolders);
    return fixIterator(subFolders, Ci.nsIMsgFolder);
  },

  addActivityEvent: function(message, start_time)
  {
    // Add and activity event
    let event = Cc["@mozilla.org/activity-event;1"].createInstance(Ci.nsIActivityEvent);
    // Initiator is omitted  
    event.init(message, null, "Saved Search Them All!", start_time, Date.now()); // completion time  
    ActivityManager.addActivity(event);
  }

};

window.addEventListener("load", function(e)
{
  var ss_in_sf = new ju1ius.SavedSearchInSubFolders();
}, false);

})();
