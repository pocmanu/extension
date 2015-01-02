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

var chooseSessionHandler = function(e) {

	e.preventDefault();

  var sessions = document.getElementsByName("session");
  var sessionName;
  var selected = $("input[type='radio'][name='session']:checked");
  if (selected.length > 0) {
      sessionName = selected.val();
  }
	chrome.runtime.sendMessage({session:{choose:sessionName}});
}

function autoInit() {

  var userid = chrome.extension.getBackgroundPage().userid;
  var sessions = chrome.extension.getBackgroundPage().sessions;
  initialize(userid);
}

function initialize(userid) {

	console.log('initialize');
	console.log("logged with id : " + userid);
	if (userid) {
		document.getElementById("auth").style.display="none";
		document.getElementById("authentication").removeEventListener("submit", submitListener, true);

		document.getElementById("choose session").style.display="inline";
		document.getElementById("choose session").addEventListener("submit", chooseSessionHandler);

		document.getElementById("create new session").style.display="inline";
		document.getElementById("create new session").addEventListener("submit", createSessionHandler);
	} else {
		document.getElementById("auth").style.display="inline";
		document.getElementById("authentication").addEventListener("submit", submitListener);

		document.getElementById("choose session").style.display="none";
		document.getElementById("choose session").removeEventListener("submit", chooseSessionHandler, true);

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

  // Container <div> where dynamic content will be placed
  //var container = document.getElementById("container");
  // Clear previous contents of the container
  /*while (container.hasChildNodes()) {
    container.removeChild(container.lastChild);
  }*/
  for (sessionName in sessions){
    /*var session = sessions[sessionName];
    var input = document.createElement("input");
    input.type = "radio";
    input.name = "session";
    input.value = session.name;
    input.id = session.name;
    if (session.selected) {
      input.checked = true;
    }
    container.appendChild(input);
    var label = document.createElement("label");
    label.for = session;
    label.appendChild(document.createTextNode(session.name));
    container.appendChild(label);
    container.appendChild(document.createElement("br"));*/
    var tmpl = document.getElementById("session-row");
    document.body.appendChild(tmpl.content.cloneNode(true));
  }
}

document.addEventListener("DOMContentLoaded", function(){autoInit();});
