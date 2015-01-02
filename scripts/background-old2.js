function Store() {
  this.idToTab = new Map();
  this.indexToTab = new Map();
  this.refNameToTab = new Map();
}
Store.prototype.add = function(onglet) {
  this.idToTab[onglet.tabId] = onglet;
  this.indexToTab[onglet.index] = onglet;
  this.refNameToTab[onglet.tabRef.name()] = onglet;
}
Store.prototype.addWithoutIndexing = function(onglet) {
  this.idToTab[onglet.tabId] = onglet;
  this.refNameToTab[onglet.tabRef.name()] = onglet;
}
Store.prototype.getById = function(id) {
  return this.idToTab[id];
}
Store.prototype.getByIndex = function(index) {
  return this.indexToTab[index];
}
Store.prototype.getByRefName = function(name) {
  return this.refNameToTab[name];
}
Store.prototype.replace = function(oldId, newId) {
  var onglet = this.idToTab[oldId];
  onglet.id = newId;
  delete this.idToTab[oldId];
  this.idToTab[newId] = onglet;
}
Store.prototype.moveForwards = function(tabIndexToMove) {
  var ongletFwd = this.indexToTab[tabIndexToMove];
  var ongletBwd = this.indexToTab[tabIndexToMove + 1];
  this.indexToTab[tabIndexToMove] = ongletBwd;
  this.indexToTab[tabIndexToMove + 1] = ongletFwd;
  ongletFwd.setIndex(tabIndexToMove + 1);
  ongletBwd.setIndex(tabIndexToMove);
}
Store.prototype.moveBackwards = function(tabIndexToMove) {
  var ongletBwd = this.indexToTab[tabIndexToMove];
  var ongletFwd = this.indexToTab[tabIndexToMove - 1];
  this.indexToTab[tabIndexToMove] = ongletFwd;
  this.indexToTab[tabIndexToMove - 1] = ongletBwd;
  ongletBwd.setIndex(tabIndexToMove - 1);
  ongletFwd.setIndex(tabIndexToMove);
}
Store.prototype.contains = function(refName) {
  return refName in this.refNameToTab;
}
Store.prototype.remove = function(onglet) {
  delete this.idToTab[onglet.tabId];
  delete this.indexToTab[onglet.index];
  delete this.refNameToTab[onglet.tabRef.name()];
}

var myFirebaseRef = new Firebase("https://incandescent-fire-1568.firebaseio.com/");
var userid;
var sessions = new Array();
var refSessions = new Array();
var currentSession;
var currentSessionTabsRef;
var thiswindowId;
var store = new Store();

function tryAutoLogin() {

	//localStorage.clear();
	if (userid)
		return;
	if (localStorage['token']) {
		console.log('auth with token');
		myFirebaseRef.authWithCustomToken(localStorage['token'], processLogin);
	}
}

function login(mail, pwd) {

	console.log('auth with credentials : mail='+mail+", password="+pwd);
	myFirebaseRef.authWithPassword({
		email    : mail,
		password : pwd
	}, processLogin);
}

function processLogin(error, authData) {

	if (error === null) {
		// user authenticated with Firebase
		console.log("User ID: " + authData.uid + ", Provider: " + authData.provider + ", token: " + authData.token);
		localStorage['token'] = authData.token;
		userid = authData.uid.split(":")[1];
  	chrome.runtime.sendMessage({login_success:userid});
  	setup();
	} else {
		console.log("Error authenticating user:", error);
	}
}

tryAutoLogin();

chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    var session = request.session;
    if (request.login) {
      login(request.login.mail, request.login.pwd);
    } else if (session) {
     	if (session.create) {
	      createSession(session.create);
    	} else if (session.choose) {
    	  chooseSession(session.choose);
    	}
    }
  }
);

var moveTabListener = function(tabId, moveInfo) {
  console.log("tab : " + tabId + " moved from : " + moveInfo.fromIndex + " to : " + moveInfo.toIndex);
  if (moveInfo.fromIndex > moveInfo.toIndex) {
    store.moveBackwards(moveInfo.fromIndex);
  } else {
    store.moveForwards(moveInfo.fromIndex);
  }
};

chrome.tabs.onMoved.addListener(moveTabListener);

var addedTabListener = function(tabId) {

  //console.log(tabId);
  if (currentSessionTabsRef && tabId.windowId === thiswindowId) {

    currentSessionTabsRef.off("child_added", childAddedListener);

    var onglet = new Onglet(thiswindowId);
    var tabRef = currentSessionTabsRef.push({"url":tabId.url, "index":tabId.index, "pinned":tabId.pinned, "active":tabId.active});
    onglet.setNew(tabId.id, tabId.index, tabId.url, tabId.pinned, tabId.active, tabRef);

    chrome.tabs.query({windowId:thiswindowId}, function(tabs) {
      if (onglet.index < tabs.length) { // added tab is not the last one, other onglet needs to have their index updated
        var ongletToPushForward;
        for (i = tabs.length - 2; i >= onglet.index; i--) { // -2 because new tab is not yet added
          ongletToPushForward = store.getByIndex(i);
          ongletToPushForward.selfUpdating = false;
          ongletToPushForward.setIndex(ongletToPushForward.index + 1);
          store.indexToTab[i] = ongletToPushForward;
        }
      }

      store.add(onglet);

      currentSessionTabsRef.on("child_added", childAddedListener);
    });
  }
}

chrome.tabs.onCreated.addListener(addedTabListener);

var updateTabListener = function(tabId, changeInfo, tab) {
  //console.log("updated tab : " + tabId);
  var onglet = store.getById(tabId);
  if (onglet) {
    if (changeInfo.url) {
      onglet.setUrl(changeInfo.url);
    } else if (changeInfo.pinned) {
      onglet.setPinned(changeInfo.pinned);
      //console.log("pinned tab index : " + tab.index);
    }
  }
};

chrome.tabs.onUpdated.addListener(updateTabListener);

chrome.tabs.onReplaced.addListener(
  function(addedTabId, removedTabId) {
    console.log("tab " + removedTabId + " replaced by tab " + addedTabId);
    store.replace(removedTabId, addedTabId);
  }
);

chrome.tabs.onRemoved.addListener(
  function(tabId, removeInfo) {
    if (removeInfo.isWindowClosing) {
      console.log("window is closing, don't delete tab references");
    } else {
      var onglet = store.getById(tabId);
      store.remove(onglet);
      chrome.tabs.query({windowId:thiswindowId}, function(tabs) {
        var movedOnglet;
        for (i = onglet.index; i < tabs.length; i++) {
          movedOnglet = store.getByIndex(i);
          movedOnglet.selfUpdating = false;
          movedOnglet.setIndex(i);
        }
      });
      currentSessionTabsRef.off("child_removed", childRemovedListener);
      onglet.delete();
      currentSessionTabsRef.on("child_removed", childRemovedListener);
    }
  }
);

function setup() {

  var sessionsRef = myFirebaseRef.child("sessions");
  sessionsRef.on("child_added", function(snapshot) {
    sessions[sessions.length] = snapshot.val().name;
    refSessions[refSessions.length] = snapshot.name();
  	chrome.runtime.sendMessage({sessions_loaded:sessions});
  	if (localStorage["session"] === snapshot.val().name) {
  	  restoreSession(snapshot.name());
  	}
  });
  chrome.windows.getCurrent(function(window) {
    thiswindowId = window.id;
  });
  chrome.bookmarks.getTree(function(nodes) {
    console.log(nodes);
    for (var node in nodes) {
      console.log(node);
    }
  });
}

function createSession(name) {

 	var sessionsRef = myFirebaseRef.child("sessions");
  var sessionRef = sessionsRef.push({"name":name, "user":userid});
  localStorage['session'] = name;
  currentSession = name;
  currentSessionTabsRef = addTabs(sessionRef);
}

function restoreSession(sessionId) {

  var opt = {
    type: "basic",
    title: "Restoring session",
    message: "Session ref : " + sessionRef,
    iconUrl: "/firebase_logo.jpg"
  }
  chrome.notifications.create("waf", opt, function(notificationId){console.log("new notification : " + notificationId)});

  var sessionRef = myFirebaseRef.child("sessions").child(sessionId);
  var sessionTabsRef = sessionRef.child("sessionTabsRef").once("value", function(snapshot) {
    if (currentSessionTabsRef) {
      currentSessionTabsRef.off("child_added", childAddedListener);
      currentSessionTabsRef.off("child_removed", childRemovedListener);
    }
    currentSessionTabsRef = myFirebaseRef.child("sessionTabs").child(snapshot.val());

    currentSessionTabsRef.on("child_added", childAddedListener);
    currentSessionTabsRef.on("child_removed", childRemovedListener);
  });
}

var childAddedListener = function(snapshot) {
    var tab = snapshot.val();
    var properties = {url:tab.url, pinned:tab.pinned, active:tab.active};

    chrome.tabs.query({windowId:thiswindowId}, function(tabs) {
      //console.log('tab index : ' + tab.index + ' / tab count : ' + tabs.length);
      if (tab.index === 0) {
        //console.log('trying to update tab from db with listener deactivated');
        var onglet = store.getByIndex(tab.index);
        if (onglet) {
          onglet.update(tabs[tab.index].id, tab.index, tab.url, tab.pinned, tab.active, currentSessionTabsRef.child(snapshot.name()).ref());
        } else {
          onglet = new Onglet(thiswindowId);
          onglet.setNew(tabs[tab.index].id, tab.index, tab.url, tab.pinned, tab.active, currentSessionTabsRef.child(snapshot.name()).ref());
          store.add(onglet);
        }
        chrome.tabs.onUpdated.removeListener(updateTabListener);
        chrome.tabs.update(onglet.tabId, properties);
        chrome.tabs.onUpdated.addListener(updateTabListener);
      }
      else if (store.contains(snapshot.name())) {
        console.log('tab already here, ignore it');
      }
      else if (tabs.length < 10) { // TODO remove this when in production
        // créer l'onglet et le mettre à jour avec l'id dans le listener
        properties.index = tab.index;
        chrome.tabs.onCreated.removeListener(addedTabListener);
        chrome.tabs.create(properties, function(tab) {
          var onglet = new Onglet(thiswindowId);
          onglet.update(tab.id, tab.index, tab.url, tab.pinned, tab.active, currentSessionTabsRef.child(snapshot.name()));
          store.add(onglet);
        });
        chrome.tabs.onCreated.addListener(addedTabListener);
      }
    });
  }

var childRemovedListener = function(snapshot) {
  var tab = snapshot.val();
  var onglet = store.getByIndex(tab.index);
  if (onglet) {
    chrome.tabs.remove(onglet.tabId);
  }
}

function addTabs(sessionRef) {

 	var sessionTabsRef = getSessionTabsRef(sessionRef);
 	var tabRef;
  chrome.tabs.query({windowId:thiswindowId}, function(tabs) {
    var onglet;
    var tabRef;
    for (i = 0; i < tabs.length; i++) {
      onglet = new Onglet(thiswindowId);
      tabRef = sessionTabsRef.push({"url":tabs[i].url, "index":tabs[i].index, "pinned":tabs[i].pinned, "active":tabs[i].active});
      onglet.setNew(tabs[i].id, tabs[i].index, tabs[i].url, tabs[i].pinned, tabs[i].active, tabRef);
      store.add(onglet);
    }
  });
  return sessionTabsRef;
}

function getSessionTabsRef(sessionRef) {

 	var tabsRef = myFirebaseRef.child("sessionTabs");
 	var sessionTabsRef;
 	if (sessionRef.sessionTabsRef) {
 	  sessionTabsRef = sessionRef.sessionTabsRef;
 	} else {
 	  sessionTabsRef = tabsRef.push();
 	  sessionRef.update({"sessionTabsRef":sessionTabsRef.name()});
 	}
 	return sessionTabsRef;
}

function chooseSession(name) {

  localStorage['session'] = name;
 	var sessionRef = refSessions[sessions.indexOf(name)];
  restoreSession(sessionRef);
}