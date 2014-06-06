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
  observe: function(aSubject, aTopic, aData) {
    var window = aSubject.QueryInterface(Ci.nsIDOMWindow);
    window.addEventListener('DOMContentLoaded', this, false);
  },

  handleEvent: function(aEvent) {
    switch (aEvent.type) {
      case 'DOMContentLoaded':
        let (window = aEvent.currentTarget) {
          window.removeEventListener(aEvent.type, this, false);
          this.initWindow(window);
        }
        return;
    }
  },

  initWindow: function(aWindow) {
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

  setSearchQuery: function(aWindow) {
    var field = aWindow.document.getElementById('peopleSearchInput');
    field.value = prefs.getPref(DEFAULT_SEARCH_QUERY);
    aWindow.onEnterInSearchBar();
  },

  initField: function(aWindow) {
    this.setSearchQuery(aWindow);

    var field = aWindow.document.getElementById('peopleSearchInput');
    var dirTree = aWindow.document.getElementById('dirTree');
    aWindow = null;

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
  }
};

Services.obs.addObserver(AbDefaultSearch, 'chrome-document-global-created', false);

WindowManager.getWindows(null).forEach(function(aWindow) {
  AbDefaultSearch.initWindow(aWindow);
});

function shutdown() {
  Services.obs.removeObserver(AbDefaultSearch, 'chrome-document-global-created');

  WindowManager = undefined;
  AbDefaultSearch = undefined;
  Services = undefined;
}
