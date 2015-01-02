var myFirebaseRef = new Firebase("https://incandescent-fire-1568.firebaseio.com/");
var userid;
var sessions = new Array();
var refSessions = new Array();
var currentSession;
var currentSessionTabsRef;
var tabIdRefMap = new Map();
var tabRefIndexMap = new Map();
var windowId;

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
  var concernedTabRef = tabIdRefMap[tabId];
  if (moveInfo.fromIndex > moveInfo.toIndex) {
    getTabIdAt(moveInfo.toIndex + 1, function(tabId) {
    changeTabIndex(tabIdRefMap[tabId], true);
    //changeTabIndex(tabIdRefMap[getTabIdAt(moveInfo.toIndex + 1)], true);
    changeTabIndex(concernedTabRef, false);
    });
  } else {
    changeTabIndex(tabIdRefMap[getTabIdAt(moveInfo.toIndex - 1)], false);
    changeTabIndex(concernedTabRef, true);
  }
};

chrome.tabs.onMoved.addListener(moveTabListener);

var addedTabListener = function(tabId, moveInfo) {
  if (currentSessionTabsRef) {
    var newTabRef = currentSessionTabsRef.push({"url":tabId.url, "index":tabId.index, "pinned":tabId.pinned, "active":tabId.active});
    newTabRef.setPriority(tabId.index);
    tabIdRefMap[tabId.id] = newTabRef;
    tabRefIndexMap[newTabRef.name()] = tabId.index;

    var newTabIndex = tabId.index;
    chrome.tabs.query({windowId:this.windowId}, function(tabs) {
      if (newTabIndex < tabs.length) {
        for (i = newTabIndex + 1; i < tabs.length; i++) {
          var tabRef = tabIdRefMap[tabs[i].id];
          changeTabIndex(tabRef, true);
        }
      }
    });
  }
}

function changeTabIndex(tabRef, increase) {
  if (increase) {
    tabRefIndexMap[tabRef.name()] = tabRefIndexMap[tabRef.name()] + 1;
  } else {
    tabRefIndexMap[tabRef.name()] = tabRefIndexMap[tabRef.name()] - 1;
  }
  tabRef.update({"index":tabRefIndexMap[tabRef.name()]});
  tabRef.setPriority(tabRefIndexMap[tabRef.name()]);
}

chrome.tabs.onCreated.addListener(addedTabListener);

var updateTabListener = function(tabId, changeInfo, tab) {
  //console.log("updated tab : " + tabId);
  var concernedTabRef = tabIdRefMap[tabId];
  if (concernedTabRef) {
    if (changeInfo.url) {
      concernedTabRef.update({"url":changeInfo.url});
    } else if (changeInfo.pinned) {
      concernedTabRef.update({"pinned":changeInfo.pinned});
      console.log("pinned tab index : " + tab.index);
    }
  }
};

chrome.tabs.onUpdated.addListener(updateTabListener);

chrome.tabs.onReplaced.addListener(
  function(addedTabId, removedTabId) {
    console.log("tab " + removedTabId + " replaced by tab " + addedTabId);
    var concernedTabRef = tabIdRefMap[removedTabId];
    delete tabIdRefMap[removedTabId];
    tabIdRefMap[addedTabId] = concernedTabRef;
  }
);

function setup() {

  var sessionsRef = myFirebaseRef.child("sessions");
  sessionsRef.on("child_added", function(snapshot) {
    sessions[sessions.length] = snapshot.val().name;
    refSessions[refSessions.length] = snapshot.name();
  	chrome.runtime.sendMessage({sessions_loaded:sessions});
  	if (localStorage["session"] === snapshot.val().name) {
  	  restoreSession(snapshot);
  	}
  });
  chrome.windows.getCurrent(function(window) {
    windowId = window.id;
  });
}

function createSession(name) {

 	var sessionsRef = myFirebaseRef.child("sessions");
  var sessionRef = sessionsRef.push({"name":name, "user":userid});
  localStorage['session'] = name;
  currentSession = name;
  currentSessionTabsRef = addTabs(sessionRef);
}

function restoreSession(sessionRef) {
  console.log("current window : " + windowId);
  var sessionTabsRef = sessionRef.child("sessionTabsRef").val();
  currentSessionTabsRef = myFirebaseRef.child("sessionTabs").child(sessionTabsRef);
  currentSessionTabsRef.on("child_added", function(snapshot) {
    var tab = snapshot.val();
    var properties = {url:tab.url, pinned:tab.pinned, active:tab.active};
    chrome.tabs.query({windowId:this.windowId}, function(tabs) {
      //console.log('tab index : ' + tab.index + ' / tab count : ' + tabs.length);
      if (tab.index === 0) {
        //console.log('trying to update tab from db with listener deactivated');
        chrome.tabs.onUpdated.removeListener(updateTabListener);
        chrome.tabs.update(tabs[tab.index].id, properties, function(newtab) {
          tabIdRefMap[newtab.id] = currentSessionTabsRef.child(snapshot.name());
          tabRefIndexMap[snapshot.name()] = newtab.index;
        });
        chrome.tabs.onUpdated.addListener(updateTabListener);
      }
      else if (snapshot.name() in tabRefIndexMap) {
        console.log('tab already here, ignore it');
      }
      /*else if (tab.index < tabs.length) {
        //console.log('trying to restore tab from db with listener deactivated');
        chrome.tabs.onCreated.removeListener(addedTabListener);
        chrome.tabs.create(properties, function(newtab) {
          tabIdRefMap[newtab.id] = currentSessionTabsRef.child(snapshot.name());
          tabRefIndexMap[snapshot.name()] = newtab.index;
        });
        chrome.tabs.onCreated.addListener(addedTabListener);
      }*/
      else if (tabs.length < 10) { // TODO remove this when in production
        //console.log('trying to restore tab from db with listener deactivated');
        chrome.tabs.onCreated.removeListener(addedTabListener);
        chrome.tabs.create(properties, function(newtab) {
          tabIdRefMap[newtab.id] = currentSessionTabsRef.child(snapshot.name());
          tabRefIndexMap[snapshot.name()] = newtab.index;
        });
        chrome.tabs.onCreated.addListener(addedTabListener);
      }
    });
  });

  currentSessionTabsRef.on("child_changed", function(snapshot) {

    var changedTabRef = snapshot.val();
    var changedTabIndex = tabRefIndexMap[snapshot.name()];
    var properties = {url:changedTabRef.url, pinned:changedTabRef.pinned, active:changedTabRef.active};

      console.log("current tab index : " + changedTabIndex + " / wanted : " + changedTabRef.index);
      if (changedTabIndex === changedTabRef.index) { // tab in the right position
        chrome.tabs.update(getTabIdAt(changedTabIndex), properties);
      } else if (changedTabIndex > changedTabRef.index) { // tab should move backwards
        while (changedTabIndex > changedTabRef.index) {
          console.log("tab " + (changedTabIndex - 1) + " should move forwards");
          chrome.tabs.onMoved.removeListener(moveTabListener);
          changeTabIndex(tabIdRefMap[getTabIdAt(changedTabIndex - 1)], true); // previous tab moves forward
          changeTabIndex(snapshot.ref(), false); // concerned tab moves backward
          chrome.tabs.onMoved.addListener(moveTabListener);
        }
      } else if (changedTabIndex < changedTabRef.index) { // tab should move forwards
        while (changedTabIndex < changedTabRef.index) {
          chrome.tabs.onMoved.removeListener(moveTabListener);
          changeTabIndex(tabIdRefMap[getTabIdAt(changedTabIndex + 1)], false); // next tab moves backward
          changeTabIndex(snapshot.ref(), true); // concerned tab moves forward
          chrome.tabs.onMoved.addListener(moveTabListener);
        }
      }
  });
}

function getTabIdAt(index, callback) {
  var id;
  //chrome.tabs.query({windowId:this.windowId}, function(tabs) {
  chrome.tabs.query({currentWindow:true}, function(tabs) {
    console.log(tabs);
    id = tabs[index].id;
  console.log("found tab id : " + id + " for index : " + index);
  console.log(tabIdRefMap);
  return id;
  });
}

function addTabs(sessionRef) {

 	var sessionTabsRef = getSessionTabsRef(sessionRef);
 	var tabRef;
  chrome.tabs.query({windowId:this.windowId}, function(tabs) {
    for (i = 0; i < tabs.length; i++) {
      tabRef = sessionTabsRef.push({"url":tabs[i].url, "index":tabs[i].index, "pinned":tabs[i].pinned, "active":tabs[i].active});
      tabRef.setPriority(tabs[i].index);
      tabIdRefMap[tabs[i].id] = tabRef;
      tabRefIndexMap[tabRef] = tabs[i].index;
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
 	var sessionRef = myFirebaseRef.child("sessions").child(refSessions[sessions.indexOf(name)]);
  restoreSession(sessionRef);
}