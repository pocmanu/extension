function BookmarkManager() {

  this.connectedToDistant;
  this.connectedToLocal;
  this.sessionBookmarksRef;
  this.addedBookmarkRefHandler = this.addedBookmarkRefListener.bind(this);
  this.refToId = new Map();
}

BookmarkManager.prototype.init = function(sessionBookmarksRef) {

  this.refToId = new Map();
  this.connectedToDistant = true;
  this.sessionBookmarksRef = sessionBookmarksRef;
  this.sessionBookmarksRef.once('value', function(snapshot) {
    console.log(snapshot.val());
  });
  this.sessionBookmarksRef.child('bookmark').on('child_added', this.addedBookmarkRefHandler);
}


BookmarkManager.prototype.connectWeb = function() {

  this.connectedToDistant = true;
}


BookmarkManager.prototype.disconnectWeb = function() {

  this.connectedToDistant = false;
}


BookmarkManager.prototype.save = function(node) {

  var manager = this;
  var idToRef = new Map();
  var newIdForBookmark = 3;
  function fetch_bookmarks(parentNode) {
    parentNode.forEach(function(bookmark) {
      if (! (bookmark.parentId === undefined || bookmark.parentId === null) && bookmark.parentId != '0') {
        var parentRef;
        if (bookmark.parentId != '1' && bookmark.parentId != '2') {
          parentRef = idToRef[bookmark.parentId];
        }
        var newNode = {'id':newIdForBookmark, 'parentId':bookmark.parentId, 'index':bookmark.index, 'title':bookmark.title};
        if(! (bookmark.url === undefined || bookmark.url === null)) {
          newNode.url = bookmark.url;
        }
        if (parentRef) {
          newNode.parentRef = parentRef;
        }
        manager.disconnectWeb();
        var newBookmarKRef = manager.sessionBookmarksRef.child('bookmarks').push(newNode);
        newBookmarKRef.setPriority(newIdForBookmark++);
        idToRef[bookmark.id] = newBookmarKRef.name();
        manager.connectWeb();
      }
      if (bookmark.children) {
        fetch_bookmarks(bookmark.children);
      }
    });
  }

  chrome.bookmarks.getTree(function(rootNode) {
    fetch_bookmarks(rootNode);
  });
}


BookmarkManager.prototype.addedBookmarkRefListener = function(snapshot) {

  var manager = this;

  if (!this.connectedToDistant) {
    return;
  }
  var bookmarkRef = snapshot.val();
  if (!bookmarkRef.id) {
    return;
  }

  var parentId = bookmarkRef.parentId;
  if (bookmarkRef.parentRef && bookmarkRef.parentRef in manager.refToId) {
    parentId = manager.refToId[bookmarkRef.parentRef];
  }

  var bookmark = {parentId:bookmarkRef.parentId, index:bookmarkRef.index, title:bookmarkRef.title};
  if (bookmarkRef.url) {
    bookmark.url = bookmarkRef.url;
  }
console.log(manager.refToId);
console.log(bookmark);

  chrome.bookmarks.create(bookmark, function(createdBookmark) {
    console.log(createdBookmark);
    manager.refToId[snapshot.name()] = createdBookmark.id;
  });
}