/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

load('lib/WindowManager');
load('lib/prefs');

Cu.import('resource://gre/modules/Services.jsm');

const AB_WINDOW = 'chrome://messenger/content/addressbook/addressbook.xul';
const AB_SIDEBAR = 'chrome://messenger/content/addressbook/abContactsPanel.xul';
const COMPOSE_WINDOW = 'chrome://messenger/content/messengercompose/messengercompose.xul';

const DEFAULT_SEARCH_QUERY = 'extensions.ab-default-search@clear-code.com.query';

prefs.setDefaultPref(DEFAULT_SEARCH_QUERY, '@');

var AbDefaultSearch = {
  get defaultQuery() {
    return prefs.getPref(DEFAULT_SEARCH_QUERY);
  },

  observe: function(aSubject, aTopic, aData) {
    var window = aSubject.QueryInterface(Ci.nsIDOMWindow);
    window.addEventListener('load', this, false);
  },

  handleEvent: function(aEvent) {
    var window = aEvent.currentTarget;
    switch (aEvent.type) {
      case 'load':
        window.removeEventListener(aEvent.type, this, false);
        this.initWindow(window);
        return;

      case 'unload':
        window.addEventListener(aEvent.type, this, false);
        this.windows.splice(this.windows.indexOf(window), 1);
        return;
    }
  },

  initWindow: function(aWindow, aOpened) {
    var uri = aWindow.location.href;
    if (uri.indexOf(AB_WINDOW) == 0 ||
        uri.indexOf(AB_SIDEBAR) == 0) {
      aWindow.setTimeout(function(aSelf) {
        aSelf.initField(aWindow);
      }, 100, this);
    }
    else if (uri.indexOf(COMPOSE_WINDOW) == 0) {
      aWindow.setTimeout(function(aSelf) {
        var window = aWindow.document.getElementById('sidebar').contentWindow;
        aSelf.initWindow(window);
      }, 0, this);
    }
  },

  getField: function(aWindow) {
    return aWindow.document.getElementById('peopleSearchInput');
  },

  setSearchQuery: function(aWindow) {
    var field = this.getField(aWindow);
    field.value = this.defaultQuery;
    aWindow.onEnterInSearchBar();
  },

  initField: function(aWindow) {
    this.setSearchQuery(aWindow);
    this.windows.push(aWindow);

    aWindow.addEventListener('unload', this, false);

    var field = aWindow.document.getElementById('peopleSearchInput');
    var dirTree = aWindow.document.getElementById('dirTree');

    if (field.__abDefaultSearchListener__ &&
        field.__abDefaultSearchListener__.destroy)
      field.__abDefaultSearchListener__.destroy();

    var self = this;
    var listener = function(aEvent) {
      var view = field.ownerDocument.defaultView;
      if (field.__abDefaultSearchListener__timer)
        view.clearTimeout(field.__abDefaultSearchListener__timer);
      field.__abDefaultSearchListener__timer = view.setTimeout(function() {
        field.__abDefaultSearchListener__timer = null;
        if (field.value == '')
          self.setSearchQuery(view);
      }, 100);
    };
    listener.destroy = function() {
      field.inputField.removeEventListener('input', listener, false);
      if (dirTree)
        dirTree.removeEventListener('select', listener, false);
      delete field.__abDefaultSearchListener__;
      field = dirTree = listener = undefined;
    };

    field.inputField.addEventListener('input', listener, false);
    if (dirTree)
      dirTree.addEventListener('select', listener, false);

    field.__abDefaultSearchListener__ = listener;
  },

  windows: []
};

Services.obs.addObserver(AbDefaultSearch, 'chrome-document-global-created', false);

WindowManager.getWindows(null).forEach(function(aWindow) {
  AbDefaultSearch.initWindow(aWindow, true);
});

function shutdown() {
  Services.obs.removeObserver(AbDefaultSearch, 'chrome-document-global-created');
  AbDefaultSearch.windows.forEach(function(aWindow) {
    var field = AbDefaultSearch.getField(aWindow);
    if (field.value == AbDefaultSearch.defaultQuery)
      field.value = '';
    aWindow.removeEventListener('unload', AbDefaultSearch, false);
  });
  AbDefaultSearch.windows = undefined;

  WindowManager = undefined;
  AbDefaultSearch = undefined;
  Services = undefined;
}
