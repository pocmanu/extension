function TabManager() {
  this.idToTab = new Map();
  this.indexToTab = new Map();
  this.refNameToTab = new Map();
}
TabManager.prototype.add = function(onglet) {
  this.idToTab[onglet.tabId] = onglet;
  this.indexToTab[onglet.index] = onglet;
  this.refNameToTab[onglet.tabRef.name()] = onglet;
}
TabManager.prototype.addWithoutIndexing = function(onglet) {
  this.idToTab[onglet.tabId] = onglet;
  this.refNameToTab[onglet.tabRef.name()] = onglet;
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
TabManager.prototype.replace = function(oldId, newId) {
  var onglet = this.idToTab[oldId];
  onglet.id = newId;
  delete this.idToTab[oldId];
  this.idToTab[newId] = onglet;
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
TabManager.prototype.contains = function(refName) {
  return refName in this.refNameToTab;
}
TabManager.prototype.remove = function(onglet) {
  delete this.idToTab[onglet.tabId];
  delete this.indexToTab[onglet.index];
  delete this.refNameToTab[onglet.tabRef.name()];
}
