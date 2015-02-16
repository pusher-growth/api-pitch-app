(function() {
  
  // var serverBaseUrl = 'https://api-pitch-server.herokuapp.com';
  var serverBaseUrl = 'http://localhost:5000';
  var usersOnlineAuthEndpoint = serverBaseUrl + '/users_online';
  var notificationEndpoint = serverBaseUrl + '/notification';
  
  // Page/View navigations
  function Navigations(document, pusher, startPageId) {
    this._doc = document;
    
    this._currentPage = this._doc.getElementById(startPageId);
    
    var navigations = pusher.subscribe('navigations');
    navigations.bind('navigate', this._navigate, this);
  }
  
  Navigations.prototype._navigate = function(data) {
    this._currentPage.style.display = 'none';
    
    this._currentPage = this._doc.getElementById(data.page_id);
    this._currentPage.style.display = 'block';
    this._currentPage.classList.add('animated');
    this._currentPage.classList.add('flipInY'); 
  }
  
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
  
  // Toastr Notifier
  function ToastrNotifier(toastr) {
    this._toastr = toastr;
  }
  
  ToastrNotifier.prototype.info = function(msg) {
    this._toastr.info(msg, null, {"positionClass": "toast-top-full-width"});
  };
  
  // App
  Pusher.log = function(msg) {
    console.log(msg);
  };
  
  var pusher = new Pusher('ddf4525af004daf4ba2a', {
    encrypted: true,
    authEndpoint: usersOnlineAuthEndpoint
  });
  
  new Navigations(document, pusher, 'splash');
  
  new UserCount(document, pusher, '.online-users-count');
  
  new Notifications(document, jQuery, pusher, '.notification_form', new ToastrNotifier(toastr));
  
  
  window.test = function(channelName, eventName, data) {
    Pusher.instances[0].channel(channelName).emit(eventName, data);
  };
  
})();
