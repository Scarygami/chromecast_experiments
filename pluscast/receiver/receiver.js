(function (global) {
  "use strict";
  var
    doc = global.document,
    namespace = "urn:x-cast:com.allmycast.pluscast",
    dom = {
      "posts": doc.getElementById("posts")
    },
    castReceiverManager, messageBus,
    received = [],
    postQueue = [],
    running = false;


  function displaypost(post) {
    var div = doc.createElement("div"), tmp;

    div.className = "post";

    tmp = doc.createElement("img");
    tmp.className = "pic";
    tmp.src = post.pic;
    div.appendChild(tmp);

    tmp = doc.createElement("span");
    tmp.className = "time";
    tmp.textContent = post.time;
    div.appendChild(tmp);

    tmp = doc.createElement("span");
    tmp.className = "name";
    tmp.textContent = post.author;
    div.appendChild(tmp);

    tmp = doc.createElement("div");
    tmp.className = "text";
    tmp.innerHTML = post.html;
    div.appendChild(tmp);

    if (dom.posts.children.length === 0) {
      dom.posts.appendChild(div);
    } else {
      if (dom.posts.children.length > 6) {
        // just to keep this small
        dom.posts.removeChild(dom.posts.lastChild);
      }
      dom.posts.insertBefore(div, dom.posts.children[0]);
    }
    global.setTimeout(function () {
      // Fade in
      div.style.opacity = 1;
      div.style.maxHeight = "700px";
    }, 1);
  }

  function handleQueue() {
    if (postQueue.length > 0) {
      running = true;
      displaypost(postQueue.shift());
      global.setTimeout(handleQueue, 3000);
    } else {
      running = false;
    }
  }

  function init() {
    castReceiverManager = global.cast.receiver.CastReceiverManager.getInstance();

    castReceiverManager.onReady = function() {
      castReceiverManager.setApplicationState("Application status is ready.");
      handleQueue();
    };

    castReceiverManager.onSenderDisconnected = function() {
      if (castReceiverManager.getSenders().length === 0) {
        global.close();
      }
    };

    messageBus = castReceiverManager.getCastMessageBus(namespace, global.cast.receiver.CastMessageBus.MessageType.JSON);

    messageBus.onMessage = function(event) {
      var i, post;
      // Handle message
      if (!!event.data.posts) {
        // Show posts
        for (i = 0; i < event.data.posts.length; i++) {
          post = event.data.posts[i];
          if (received.indexOf(post.id) === -1) {
            received.push(post.id);
            postQueue.push(post);
          }
        }
        if (postQueue.length > 0 && !running) {
          running = true;
          global.setTimeout(handleQueue, 3000);
        }
      }
    };

    // initialize the CastReceiverManager with an application status message
    castReceiverManager.start({statusText: "Application is starting"});
  }

  global.onload = init;

}(this));