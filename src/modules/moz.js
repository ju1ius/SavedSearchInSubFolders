var EXPORTED_SYMBOLS = ["moz"];

const {
    classes: Cc,
    interfaces: Ci,
    Constructor: CCtor
} = Components;

var moz = {
  con: {}
};

var objs = [
    {klass: "MutableArray", con: "nsMutableArray", cid: "@mozilla.org/array;1", iface: "nsIMutableArray"},
    {klass: "LocalFile", con: "nsLocalFile", cid: "@mozilla.org/file/local;1", iface: "nsILocalFile"}
];

for each(let def in objects) {
    moz.con[def.con] = def.cid;
    moz[klass] = CCtor(moz.con[def.con], Ci[iface]);
}
