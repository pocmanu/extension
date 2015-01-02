var submitListener = function(e) {

	e.preventDefault();

	var email    = document.getElementById("login").value;
	var password = document.getElementById("password").value;

  console.log('sending message : ' + {login:{mail:email,pwd:password}});
	chrome.runtime.sendMessage({login:{mail:email,pwd:password}});
}

var createSessionHandler = function(e) {

	e.preventDefault();

	var sessionName = document.getElementById("session name").value;
	chrome.runtime.sendMessage({session:{create:sessionName}});
}

var restoreSessionHandler = function(e) {

  var hash = e.path[0].hash;
  var sessionName = hash.substring(1, hash.length);
	chrome.runtime.sendMessage({"session":{"restore":sessionName}});
}

var saveSessionHandler = function(e) {

  var hash = e.path[0].hash;
  var sessionName = hash.substring(1, hash.length);
	chrome.runtime.sendMessage({"session":{"save":sessionName}});
}

function autoInit() {

  var userid = chrome.extension.getBackgroundPage().userid;
  initialize(userid);
  var restoredSessions = chrome.extension.getBackgroundPage().sessionManager.sessions;
  if (restoredSessions) {
    addFields(restoredSessions);
  }
}

function initialize(userid) {

	console.log("logged with id : " + userid);
	if (userid) {
		document.getElementById("auth").style.display="none";
		document.getElementById("authentication").removeEventListener("submit", submitListener, true);

		document.getElementById("create new session").style.display="inline";
		document.getElementById("create new session").addEventListener("submit", createSessionHandler);
	} else {
		document.getElementById("auth").style.display="inline";
		document.getElementById("authentication").addEventListener("submit", submitListener);

		document.getElementById("create new session").style.display="none";
		document.getElementById("create new session").removeEventListener("submit", createSessionHandler, true);
	}
}

chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    if (request.login_success) {
      initialize(request.login_success);
    } else if (request.sessions_loaded) {
      addFields(request.sessions_loaded);
    }
  }
);

function addFields(sessions){

  var container = document.getElementById("sessionContainer");
  // Clear previous contents of the container
  while (container.hasChildNodes()) {
    container.removeChild(container.lastChild);
  }

  for (sessionName in sessions){
    var tmpl = document.getElementById("session-row").content.cloneNode(true);
    tmpl.querySelector('.session').innerText = sessionName;
    tmpl.querySelector('a.button.restore').href = "#" + sessionName;
    tmpl.querySelector('a.button.restore').addEventListener("click", restoreSessionHandler, true);
    tmpl.querySelector('a.button.save').href = "#" + sessionName;
    tmpl.querySelector('a.button.save').addEventListener("click", saveSessionHandler, true);
    sessionContainer.appendChild(tmpl);
  }
}

document.addEventListener("DOMContentLoaded", function(){autoInit();});
