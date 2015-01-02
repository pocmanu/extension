function SessionManager() {

  this.sessions = new Map();
  this.tabManager = new TabManager();
  this.bookmarkManager = new BookmarkManager();
  this.currentSessionRef;
}

SessionManager.prototype.init = function(firebaseRef) {

  this.sessions = new Map();
  this.firebaseRef = firebaseRef;
  this.connect();
}

SessionManager.prototype.connect = function() {

  this.firebaseRef.child("sessions").on("child_added", this.sessionListener.bind(this));
}

SessionManager.prototype.disconnect = function() {

  this.firebaseRef.child("sessions").off("child_added", this.sessionListener.bind(this));
}

SessionManager.prototype.sessionListener = function(snapshot) {

  var ref = snapshot.val();
  this.sessions[ref.name] = {
    name:ref.name,
    tabsRef:ref.sessionTabsRef,
    bookmarksRef:ref.sessionBookmarksRef,
    selected:localStorage["session"] === ref.name,
    img:ref.img
  };
  chrome.runtime.sendMessage({sessions_loaded:this.sessions});
}


SessionManager.prototype.createNewSession = function(name, windowId) {

 	var sessionsRef = this.firebaseRef.child("sessions");
  var sessionTabsRef = this.firebaseRef.child("sessionTabs").push({"sessionName":name});
  var sessionBookmarksRef = this.firebaseRef.child("sessionBookmarks").push({"sessionName":name});
  sessionsRef.push({"name":name, "user":userid, "sessionTabsRef":sessionTabsRef.name(), "sessionBookmarksRef":sessionBookmarksRef.name()});

  this.setCurrent(name, windowId);

  var sessionManager = this;
  chrome.tabs.query({windowId:thiswindowId}, function(tabs) {
    var tab;
    var tabProps;
    for (i = 0; i < tabs.length; i++) {
      tab = tabs[i];
      tabProps = {"windowId":this.thiswindowId, "url":tab.url, "index":tab.index, "pinned":tab.pinned, "active":tab.active};
      sessionManager.tabManager.appendTab(tabProps, true);
    }
  });

  sessionManager.bookmarkManager.save();
}


SessionManager.prototype.setCurrent = function(name, windowId) {

  this.tabManager.clear();
  this.currentSessionRef = this.sessions[name];
  this.tabManager.init(this.firebaseRef.child("sessionTabs").child(this.currentSessionRef.tabsRef), windowId);
  this.bookmarkManager.init(this.firebaseRef.child("sessionBookmarks").child(this.currentSessionRef.bookmarksRef));
}


SessionManager.prototype.restoreSession = function(name, windowId) {

  this.setCurrent(name, windowId);
}