var myFirebaseRef = new Firebase("https://incandescent-fire-1568.firebaseio.com/");
var userid;
var thiswindowId;
var tabManager = new TabManager();
var sessionManager = new SessionManager();


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

function setup() {
  sessionManager.init(myFirebaseRef);
  chrome.windows.getCurrent(function(window) {
    thiswindowId = window.id;
  });
}

document.addEventListener('DOMContentLoaded', function () {

  tryAutoLogin();

  //chrome.tabs.onMoved.addListener(moveTabListener);
  //chrome.tabs.onCreated.addListener(addedTabListener);
  //chrome.tabs.onUpdated.addListener(updateTabListener);
  //chrome.tabs.onReplaced.addListener(replacedTabListener);
  //chrome.tabs.onRemoved.addListener(removedTabListener);
  chrome.runtime.onMessage.addListener(messageListener);
});


function processSession(session) {

 	if (session.create) {
    sessionManager.createNewSession(session.create);
	} else if (session.restore) {
    sessionManager.restoreSession(session.restore, thiswindowId);
	} else if (session.save) {
    sessionManager.setCurrent(session.save, thiswindowId);
	}
}

/////////////////////////////
// listeners
/////////////////////////////


var messageListener = function(request, sender, sendResponse) {
  if (request.login) {
    login(request.login.mail, request.login.pwd);
  } else if (request.session) {
    processSession(request.session);
  } else if (request.tab) {
    // processTab(request.tab);
  }
}

