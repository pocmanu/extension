function TabManager() {

  this.connectedToDistant;
  this.connectedToLocal;
  this.sessionTabsRef;
  this.windowId;
  this.idToTab = new Map();
  this.indexToTab = new Map();
  this.refNameToTab = new Map();
  this.addedTabRefHandler = this.addedTabRefListener.bind(this);
  this.addedTabHandler = this.addedTabListener.bind(this);
  this.updatedTabHandler = this.updateTabListener.bind(this);
  this.replacedTabHandler = this.replacedTabListener.bind(this);
  this.movedTabHandler = this.movedTabListener.bind(this);
}


TabManager.prototype.init = function(sessionTabsRef, windowId) {

  this.windowId = windowId;
  if (this.sessionTabsRef) {
    this.sessionTabsRef.child("tabs").off("child_added", this.addedTabRefHandler);
  }
  this.sessionTabsRef = sessionTabsRef;
  this.sessionTabsRef.child("tabs").on("child_added", this.addedTabRefHandler);
  this.connectWeb();
  this.connectLocal();
  this.sessionTabsRef.child("tabs").once("value", function(snapshot) {
    chrome.tabs.query({windowId:this.windowId}, function(tabs) {
      for (i = tabs.length; i > snapshot.numChildren(); i--) {
        chrome.tabs.remove(tabs[i - 1].id);
      }
    });
  });

  this.addAllListeners();
}


TabManager.prototype.connectWeb = function() {

  this.connectedToDistant = true;
}


TabManager.prototype.disconnectWeb = function() {

  this.connectedToDistant = false;
}


TabManager.prototype.connectLocal = function() {

  this.connectedToLocal = true;
}


TabManager.prototype.disconnectLocal = function() {

  this.connectedToLocal = false;
}


TabManager.prototype.getById = function(id) {

  return this.idToTab[id];
}


TabManager.prototype.getByIndex = function(index) {

  return this.indexToTab[index];
}


TabManager.prototype.getByRefName = function(name) {

  return this.refNameToTab[name];
}


TabManager.prototype.clear = function() {

  this.idToTab = new Map();
  this.indexToTab = new Map();
  this.refNameToTab = new Map();
}


TabManager.prototype.add = function(onglet) {

  this.idToTab[onglet.tabId] = onglet;
  this.indexToTab[onglet.index] = onglet;
  this.refNameToTab[onglet.tabRef.name()] = onglet;
}


TabManager.prototype.replace = function(oldId, newId) {

  var onglet = this.idToTab[oldId];
  onglet.id = newId;
  delete this.idToTab[oldId];
  this.idToTab[newId] = onglet;
}


TabManager.prototype.appendTab = function(props, createNewRef) {

  this.disconnectWeb();
  var onglet = new Onglet();
  var tabRef;
  if (createNewRef) {
    tabRef = this.sessionTabsRef.child("tabs").push({"url":props.url, "index":props.index, "pinned":props.pinned, "active":props.active});
  } else if (props.ref) {
    tabRef = this.sessionTabsRef.child("tabs").child(props.ref);
  }
  onglet.setNew(props.windowId, props.id, props.index, props.url, props.pinned, props.active, tabRef);
  this.add(onglet);
  this.connectWeb();
}


TabManager.prototype.insertTab = function(props) {

  this.disconnectWeb();
  var onglet = new Onglet();
  var tabRef = this.sessionTabsRef.child("tabs").push({"url":props.url, "index":props.index, "pinned":props.pinned, "active":props.active});
  onglet.setNew(props.windowIdprops.id, props.index, props.url, props.pinned, props.active, tabRef);

  if (onglet.index < this.indexToTab.length) { // added tab is not the last one, other onglet needs to have their index updated
    var ongletToPushForward;
    for (i = this.indexToTab.length - 2; i >= onglet.index; i--) { // -2 because new tab is not yet added
      ongletToPushForward = this.getByIndex(i);
      ongletToPushForward.selfUpdating = false;
      ongletToPushForward.setIndex(ongletToPushForward.index + 1);
      this.indexToTab[i] = ongletToPushForward;
    }
  }

  this.add(onglet);
  this.connectWeb();
}


TabManager.prototype.moveForwards = function(tabIndexToMove) {

  var ongletFwd = this.indexToTab[tabIndexToMove];
  var ongletBwd = this.indexToTab[tabIndexToMove + 1];
  this.indexToTab[tabIndexToMove] = ongletBwd;
  this.indexToTab[tabIndexToMove + 1] = ongletFwd;
  ongletFwd.setIndex(tabIndexToMove + 1);
  ongletBwd.setIndex(tabIndexToMove);
}


TabManager.prototype.moveBackwards = function(tabIndexToMove) {

  var ongletBwd = this.indexToTab[tabIndexToMove];
  var ongletFwd = this.indexToTab[tabIndexToMove - 1];
  this.indexToTab[tabIndexToMove] = ongletFwd;
  this.indexToTab[tabIndexToMove - 1] = ongletBwd;
  ongletBwd.setIndex(tabIndexToMove - 1);
  ongletFwd.setIndex(tabIndexToMove);
}


TabManager.prototype.addedTabRefListener = function(snapshot) {

  if (!this.connectedToDistant) {
    return;
  }
  var tab = snapshot.val();
  if (snapshot.name() in this.refNameToTab) {
    //TODO
  } else {
    var properties = {url:tab.url, pinned:tab.pinned, active:tab.active, index:tab.index, ref:snapshot.name()};
    this.restoreTab(properties);
  }
}


TabManager.prototype.addedTabListener = function(tabId) {

  if (!this.connectedToLocal) {
    return;
  }
  if (tabId.windowId === this.windowId && this.getById(tabId.id) == null) {
    this.appendTab({"windowId":this.windowId, "url":tabId.url, "index":tabId.index, "pinned":tabId.pinned, "active":tabId.active}, true);
  }
}


TabManager.prototype.updateTabListener = function(tabId, changeInfo, tab) {

  var onglet = this.getById(tabId);
  if (!this.connectedToLocal) {
    return;
  }
  if (onglet) {
    if (changeInfo.url) {
      onglet.setUrl(changeInfo.url);
    } else if (changeInfo.pinned) {
      onglet.setPinned(changeInfo.pinned);
    }
  }
}


TabManager.prototype.movedTabListener = function(tabId, moveInfo) {

  console.log("tab : " + tabId + " moved from : " + moveInfo.fromIndex + " to : " + moveInfo.toIndex);
  if (moveInfo.fromIndex > moveInfo.toIndex) {
    this.moveBackwards(moveInfo.fromIndex);
  } else {
    this.moveForwards(moveInfo.fromIndex);
  }
}


TabManager.prototype.replacedTabListener = function(addedTabId, removedTabId) {

  console.log("tab " + removedTabId + " replaced by tab " + addedTabId);
  this.replace(removedTabId, addedTabId);
}


TabManager.prototype.removeAllListeners = function() {

  chrome.tabs.onCreated.removeListener(this.addedTabHandler);
  chrome.tabs.onUpdated.removeListener(this.updatedTabHandler);
  chrome.tabs.onReplaced.removeListener(this.replacedTabHandler);
  chrome.tabs.onMoved.removeListener(this.movedTabHandler);
  console.log("listeners removed");
}


TabManager.prototype.addAllListeners = function() {

  this.removeAllListeners();
  chrome.tabs.onCreated.addListener(this.addedTabHandler);
  chrome.tabs.onUpdated.addListener(this.updatedTabHandler);
  chrome.tabs.onReplaced.addListener(this.replacedTabHandler);
  chrome.tabs.onMoved.addListener(this.movedTabHandler);
  console.log("listeners added");
}


TabManager.prototype.restoreTab = function(properties) {

  var tabManager = this;
  tabManager.disconnectLocal();

  var tabProps = {url:properties.url, pinned:properties.pinned, active:properties.active};
  chrome.tabs.query({windowId:tabManager.windowId}, function(tabs) {
    //console.log('tab index : ' + properties.index + ' / tab count : ' + tabs.length);
    properties.windowId = tabManager.windowId;
    if (properties.index === 0) {
      //console.log('trying to update tab from db with listener deactivated');
      chrome.tabs.update(tabs[0].id, tabProps);
      properties.id = tabs[0].id;
      tabManager.appendTab(properties, false);
      tabManager.connectLocal();
    }
    else if (properties.index < tabs.length) {
      // mettre à jour l'onglet à la position 'index'
      for (i = 0; i < tabs.length; i++) {
        var tab = tabs[i];
        if (tab.index === properties.index) {
          chrome.tabs.update(tab.id, tabProps, function(tab) {
            properties.id = tab.id;
            tabManager.appendTab(properties, false);
            tabManager.connectLocal();
          });
        }
      }
    }
    else {
      // créer l'onglet et le mettre à jour avec l'id dans le listener
      tabProps.index = properties.index;
      chrome.tabs.create(tabProps, function(tab) {
        properties.id = tab.id;
        tabManager.appendTab(properties, false);
        tabManager.connectLocal();
      });
    }
  });
}
