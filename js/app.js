(function() {
  
  // var serverBaseUrl = 'https://api-pitch-server.herokuapp.com';
  var serverBaseUrl = 'http://localhost:5000';
  var usersOnlineAuthEndpoint = serverBaseUrl + '/users_online';
  var notificationEndpoint = serverBaseUrl + '/notification';
  var startPageId = 'splash';
  
  // Page/View navigations
  function Navigations(document, pusher, storage) {
    this._doc = document;
    this._storage = storage;
    
    var navigations = pusher.subscribe('navigations');
    navigations.bind('navigate', this._navigate, this);
    
    var currentPageId = this._storage.getCurrentPageId();
    this._currentPage = this._doc.getElementById(currentPageId);
    
    this.goToPage(currentPageId);
  }
  
  Navigations.prototype._navigate = function(data) {
    var toPageId = data.page_id;
    this.goToPage(toPageId)
  };
  
  Navigations.prototype.goToPage = function(pageId) {
    this._currentPage.style.display = 'none';
    this._currentPage = this._doc.getElementById(pageId);
    this._currentPage.style.display = 'block';
    this._currentPage.classList.add('animated');
    this._currentPage.classList.add('flipInY');
    
    this._storage.setCurrentPageId(pageId);
  };
  
  // To provide a count of the number of online users
  function UserCount(document, pusher, selector) {
    this._doc = document;
    this._selector = selector;
    
    this._usersOnline = pusher.subscribe('presence-users-online');
    
    this._usersOnline.bind('pusher:subscription_succeeded', this._updateUserCount, this);
    this._usersOnline.bind('pusher:member_added', this._updateUserCount, this);
    this._usersOnline.bind('pusher:member_removed', this._updateUserCount, this);
  }
  
  UserCount.prototype._updateUserCount = function() {
    var count = this._usersOnline.members.count;
    var els = this._doc.querySelectorAll(this._selector);
    Array.prototype.forEach.call(els, function(el) {
      el.innerText = count;
    });
  };
  
  // Notification
  function Notifications(document, jq, pusher, formSelector, notifier) {
    this._doc = document;
    this._jq = jq;
    this._notifier = notifier;
    
    var self = this;
    var els = document.querySelectorAll(formSelector);
    Array.prototype.forEach.call(els, function(el) {
      el.addEventListener('submit', self._submit.bind(self));
    });
    
    var notifications = pusher.subscribe('notifications');
    notifications.bind('info', this._infoNotification, this);
  }
  
  Notifications.prototype._submit = function(e) {
    e.preventDefault();
    
    var el = e.currentTarget;
    var textEl = el.querySelector('input[name="message"]');
    var text = textEl.value;
    this._jq.post(notificationEndpoint, {text: text});
  };
  
  Notifications.prototype._infoNotification = function(data) {
    this._notifier.info(data.msg);
  };
  
  // Twitter Presence helper
  function TwitterUserForm(window, document, jq, pusher, selector, avatarService, storage) {
    this._win = window;
    this._doc = document;
    this._jq = jq;
    this._selector = selector;
    this._avatarService = avatarService;
    this._storage = storage;
    
    this._searchTimeoutId = null;
  
    this._jq(selector)
      .find('input[name="twitter_id"]')
      .val(this._storage.getTwitterId())
      .each(function(i, el){
        this._getTwitterAvatar.call(this, this._jq(el))
      }.bind(this))
      .on('keyup', this._handleKeyUp.bind(this));
    this._jq(selector).on('submit', this._submit.bind(this));
  }
  
  TwitterUserForm.prototype._handleKeyUp = function(e) {
    if(this._searchTimeoutId !== null) {
      this._win.clearTimeout(this._searchTimeoutId);
    }
    
    this._searchTimeoutId = this._win.setTimeout(function() {
      this._processEvent(e);
    }.bind(this), 500);
  };
  
  TwitterUserForm.prototype._processEvent = function(e) {
    var inputEl = this._jq(e.currentTarget);
    this._getTwitterAvatar(inputEl);
  };
  
  TwitterUserForm.prototype._getTwitterAvatar = function(inputEl) {
    var avatarEl = inputEl.parents(this._selector).find('img.avatar');
    var twitterId = inputEl.val();
    if(twitterId) {
      this._storage.setTwitterId(twitterId);
      var url = this._avatarService.toTwitterUrl(twitterId);
      avatarEl.attr('src', url);
    }
  };
  
  TwitterUserForm.prototype._submit = function(e) {
    e.preventDefault();
    var form = e.currentTarget;
    
  };
  
  // Toastr Notifier
  function ToastrNotifier(toastr) {
    this._toastr = toastr;
  }
  
  ToastrNotifier.prototype.info = function(msg) {
    this._toastr.info(msg, null, {"positionClass": "toast-top-full-width"});
  };
  
  // avatars.io
  function AvatarsIOService() {
  }
  
  AvatarsIOService.prototype.toTwitterUrl = function(id) {
    var twitterId = id.trim().replace('@', '');
    var url = 'http://avatars.io/twitter/' + twitterId;
    return url;
  }
  
  // State :(
  function LocalStorage(defaultStartPageId) {
    this._id = '_pusherApiPitchApp';
    this.storage = localStorage.getItem(this._id);
    if(this.storage) {
      this.storage = JSON.parse(this.storage);
    }
    else {
      this.storage = {};
    }
    this.storage.currentPageId = this.storage.currentPageId || defaultStartPageId;
    this.storage.twitterId = this.storage.twitterId || '';
    
    this._sync();
  }
  
  LocalStorage.prototype._sync = function() {
    localStorage.setItem(this._id, JSON.stringify(this.storage));
  };
  
  LocalStorage.prototype.getCurrentPageId = function() {
    return this.storage.currentPageId;
  };
  
  LocalStorage.prototype.setCurrentPageId = function(pageId) {
    this.storage.currentPageId = pageId;
    this._sync();
  };
  
  LocalStorage.prototype.getTwitterId = function() {
    return this.storage.twitterId;
  };
  
  LocalStorage.prototype.setTwitterId = function(twitterId) {
    this.storage.twitterId = twitterId;
    this._sync();
  };
  
  LocalStorage.prototype.clear = function() {
    localStorage.removeItem(this._id);
  }
  
  // App
  Pusher.log = function(msg) {
    console.log(msg);
  };
  
  var pusher = new Pusher('ddf4525af004daf4ba2a', {
    encrypted: true,
    authEndpoint: usersOnlineAuthEndpoint
  });
  
  var storage = new LocalStorage(startPageId);
  
  var nav = new Navigations(document, pusher, storage);
  
  new UserCount(document, pusher, '.online-users-count');
  
  new Notifications(document, jQuery, pusher, '.notification-form', new ToastrNotifier(toastr));
  
  new TwitterUserForm(window, document, jQuery, pusher, '.twitter-form', new AvatarsIOService(), storage);
  
  window.addEventListener('load', function() {
    var currentPageId = storage.getCurrentPageId();
    if(currentPageId !== startPageId) {
      nav.goToPage(currentPageId);
    }
  });
  
  window.test = function(channelName, eventName, data) {
    Pusher.instances[0].channel(channelName).emit(eventName, data);
  };
  
  window.clearStorage = function() {
    storage.clear();
  };
  
})();
