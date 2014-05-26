var EXPORTED_SYMBOLS = ['DOM'];


var dom_proto = {

    qs: function(selector, el)
    {
        if (typeof el === 'undefined') el = this.doc;
        return el.querySelector(selector);
    },

    qsa: function(selector, el)
    {
        if (typeof el === 'undefined') el = this.doc;
        return el.querySelectorAll(selector);
    },

    el: function(name, ns)
    {
        if (ns) {
            return this.doc.createElementNS(ns, name);
        }
        return this.doc.createElement(name);
    },

    html: function(el, html)
    {
        if (typeof html === 'undefined') return el.innerHTML;
        el.innerHTML = html;
    },

    text: function(el, text)
    {
        if (typeof html === 'undefined') return el.textContent;
        el.textContent = text;
    },

    attr: function(el, attr, value)
    {
        if (typeof value === 'undefined') return el.getAttribute(attr);
        return el.setAttribute(attr, value);
    },

    append: function(child, parent)
    {
        if (typeof child === 'string') {
            return parent.appendChild(this.doc.createTextNode(child));
        }
        return parent.appendChild(child);
    },

    remove: function(el)
    {
        return el.parentNode.removeChild(el);
    },

    replace: function(old, el)
    {
        return old.parentNode.replaceChild(el, old);
    },

    insertBefore: function(el, sibling)
    {
        return sibling.parentNode.insertBefore(el, sibling);
    },

    insertAfter: function(el, sibling)
    {
        return sibling.parentNode.insertBefore(el, sibling.nextSibling);
    },

    empty: function(el)
    {
        for (let child of el.childNodes) {
            el.removeChild(child);
        }
        return el;
    }
};

var DOM = function(doc)
{
    return Object.create(dom_proto, {
        doc: {value: doc, writable: false, configurable: false},
        win: {value: doc.defaultView, writable: false, configurable: false}
    });
};
