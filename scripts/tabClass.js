function Onglet(windowId) {
  this.tabId;
  this.tabRef;
  this.index;
  this.active;
  this.pinned;
  this.windowId = windowId;
  this.selfUpdating = false;
}

Onglet.prototype.setUrl = function(url) {
  //console.log("calling seturl with url : " + url);
  this.url = url;
  this.selfUpdating = true;
  this.tabRef.update({"url":url});
}

Onglet.prototype.setPinned = function(pinned) {
  this.pinned = pinned;
  this.selfUpdating = true;
  this.tabRef.update({"pinned":pinned});
}

Onglet.prototype.setIndex = function(index) {
  var oldindex = this.index;
  this.index = index;
  if (this.selfUpdating === false) {
    this.tabRef.update({"index":index});
    this.tabRef.setPriority(index);
  } else {
    //console.log("index self updating, ignore");
    this.selfUpdating = false;
  }
}

Onglet.prototype.setNew = function(id, index, url, pinned, active, ref) {
  this.tabId = id;
  this.tabRef = ref;
  this.url = url;
  this.index = index;
  this.pinned = pinned;
  this.active = active;
  this.tabRef.setPriority(index);

  var onglet = this;
  this.tabRef.on("value", function(snapshot) {refChangeListener(snapshot, onglet)});
}

Onglet.prototype.update = function(tabId, index, url, pinned, active, ref) {
  var oldindex = this.index;
  this.tabId = tabId;
  this.index = index;
  this.url = url;
  this.pinned = pinned;
  this.active = active;
  this.tabRef = ref;

  var onglet = this;
  this.tabRef.on("value", function(snapshot) {refChangeListener(snapshot, onglet)});
}

Onglet.prototype.delete = function() {
  this.tabRef.remove();
}

var refChangeListener = function(snapshot, onglet) {

  var changedTabRef = snapshot.val();
  if (changedTabRef === null) {
    return;
  }
  chrome.tabs.query({windowId:onglet.windowId}, function(tabs) {
    console.log("tab ref changed index : " + changedTabRef.index + " / stored tab ref index : " + onglet.index);
    if (onglet.index === changedTabRef.index) { // tab in the right position
      var properties = {};
      if (onglet.url != changedTabRef.url) {
        properties.url = changedTabRef.url;
      }
      if (onglet.pinned != changedTabRef.pinned) {
        properties.pinned = changedTabRef.pinned;
      }
      if (onglet.active != changedTabRef.active) {
        properties.active = changedTabRef.active;
      }
      if (properties.url || properties.pinned || properties.active) {
        console.log("updating tab " + onglet.tabId + " with properties : " + properties);
        chrome.tabs.update(onglet.tabId, properties);
      }
    }
    else if (changedTabRef.index > onglet.index) { // tab should move forwards
      console.log("tab " + onglet.index + " should move forwards");
      onglet.selfUpdating = true;
      chrome.tabs.move(onglet.tabId, {windowId:onglet.windowId, index:onglet.index + 1});
    }
    else if (changedTabRef.index < onglet.index) { // tab should move backwards
      console.log("tab " + onglet.index + " should move backwards");
      onglet.selfUpdating = true;
      chrome.tabs.move(onglet.tabId, {windowId:onglet.windowId, index:onglet.index - 1});
    }
  });
}