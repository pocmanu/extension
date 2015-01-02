function Onglet() {

  this.tabId;
  this.tabRef;
  this.index;
  this.active;
  this.pinned;
  this.windowId;
  this.selfUpdating = false;
}


Onglet.prototype.connect = function() {

  this.tabRef.on("value", this.refChangeListener.bind(this));
}


Onglet.prototype.disconnect = function() {

  this.tabRef.off("value", this.refChangeListener.bind(this));
}


Onglet.prototype.setUrl = function(url) {

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

  this.index = index;
  if (this.selfUpdating === false) {
    this.tabRef.update({"index":index});
    this.tabRef.setPriority(index);
  } else {
    this.selfUpdating = false;
  }
}


Onglet.prototype.delete = function() {

  this.tabRef.remove();
}


Onglet.prototype.setNew = function(windowId, id, index, url, pinned, active, ref) {

  this.windowId = windowId;
  this.tabId = id;
  this.tabRef = ref;
  this.url = url;
  this.index = index;
  this.pinned = pinned;
  this.active = active;
  this.tabRef.setPriority(index);
  this.connect();
}


Onglet.prototype.update = function(windowId, tabId, index, url, pinned, active, ref) {

  var oldindex = this.index;
  this.windowId = windowId;
  this.tabId = tabId;
  this.index = index;
  this.url = url;
  this.pinned = pinned;
  this.active = active;
  this.tabRef = ref;
  this.connect();
}


Onglet.prototype.refChangeListener = function(snapshot) {

  var onglet = this;
  var changedTabRef = snapshot.val();
  if (changedTabRef === null) {
    return;
  }
  chrome.tabs.query({windowId:onglet.windowId}, function(tabs) {
    // console.log("tab ref changed index : " + changedTabRef.index + " / stored tab ref index : " + onglet.index);
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
        // console.log("updating tab " + onglet.tabId + " with properties : " + properties);
        chrome.tabs.update(onglet.tabId, properties);
      }
    }
    else if (changedTabRef.index > onglet.index) { // tab should move forwards
      // console.log("tab " + onglet.index + " should move forwards");
      onglet.selfUpdating = true;
      chrome.tabs.move(onglet.tabId, {windowId:onglet.windowId, index:onglet.index + 1});
    }
    else if (changedTabRef.index < onglet.index) { // tab should move backwards
      // console.log("tab " + onglet.index + " should move backwards");
      onglet.selfUpdating = true;
      chrome.tabs.move(onglet.tabId, {windowId:onglet.windowId, index:onglet.index - 1});
    }
  });
}