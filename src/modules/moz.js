var EXPORTED_SYMBOLS = ["moz"];

const {
    classes: Cc,
    interfaces: Ci,
    utils: Cu,
    Constructor: Cctor
} = Components;

Cu.import("resource://gre/modules/XPCOMUtils.jsm");


var moz = {

  ctor: {},

  openUri: function(uri)
  {
    // first construct an nsIURI object using the ioservice
    var uriToOpen = this.ioService.newURI(uri, null, null);
    // now, open it!
    this.externalProtocolService.loadURI(uriToOpen, null);
  },

  getService: function(cid, iface)
  {
      return Cc[cid].getService(Ci[iface]);
  }
};

// ========== Services getters
//
var services = new Map([
    // get<ServiceName>: [component_id, interface]
    ['app', ["@mozilla.org/steel/application;1", 'steelIApplication']],
    ['accountManager', ['@mozilla.org/messenger/account-manager;1', 'nsIMsgAccountManager']],
    ['activityManager', ['@mozilla.org/activity-manager;1', 'nsIActivityManager']],
    ['mailSession', ['@mozilla.org/messenger/services/session;1', 'nsIMsgMailSession']],
    ['notificationService', ['@mozilla.org/messenger/msgnotificationservice;1', 'nsIMsgFolderNotificationService']],
    ['ioService', ["@mozilla.org/network/io-service;1", 'nsIIOService2']],
    ['externalProtocolService', ["@mozilla.org/uriloader/external-protocol-service;1", 'nsIExternalProtocolService']],
    ['clipboardHelper', ["@mozilla.org/widget/clipboardhelper;1", 'nsIClipboardHelper']],
    ['clipboard', ["@mozilla.org/widget/clipboard;1", 'nsIClipboard']],
]);

function makeServiceGetter(cid, iface) {
    return function() {
        return this.getService(cid, iface);
    }
}

for (let [name, [cid, iface]] of services) {
    XPCOMUtils.defineLazyServiceGetter(moz, name, cid, iface);
    //moz['get' + name] = makeServiceGetter(cid, iface);
}
//services = undefined;

// ========== Objects
//
var objs = new Map([
    //class: [constructor, component id, interface]
    ["MutableArray", ["nsMutableArray", "@mozilla.org/array;1", "nsIMutableArray"]],
    ["LocalFile", ["nsLocalFile", "@mozilla.org/file/local;1", "nsILocalFile"]]
]);

for (let [klass, [ctor, cid, iface]] of objs) {
    moz.ctor[ctor] = cid;
    moz[klass] = Cctor(cid, Ci[iface]);
}
//objs = undefined;
