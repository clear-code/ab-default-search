/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

load('lib/WindowManager');

Cu.import('resource://gre/modules/Services.jsm');

const AB_WINDOW = 'chrome://messenger/content/addressbook/addressbook.xul';
const AB_SIDEBAR = 'chrome://messenger/content/addressbook/abContactsPanel.xul';
const COMPOSE_WINDOW = 'chrome://messenger/content/messengercompose/messengercompose.xul';

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
        aSelf.setSearchQuery(aWindow);
      }, 0, this);
    }
    else if (uri.indexOf(COMPOSE_WINDOW) == 0) {
      aWindow.setTimeout(function(aSelf) {
        var window = aWindow.document.getElementById('sidebar').contentWindow;
        aSelf.initWindow(window);
      }, 0, this);
    }
  },

  setSearchQuery: function(aWindow) {
    aWindow.document.getElementById('peopleSearchInput').value = '@';
    aWindow.onEnterInSearchBar();
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
