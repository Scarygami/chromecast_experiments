(function (global) {
  "use strict";

  var
    doc = global.document,
    con = global.console,
    chr = global.chrome,
    applicationID = "YOUR_APP_ID",
    namespace = "urn:x-cast:com.appspot.allmyplus.photocast",
    session = null, gapi, my_id, currentCast,
    dom = {
      "messageCard": doc.getElementById("messageCard"),
      "message": doc.getElementById("message"),
      "signinButton": doc.getElementById("signinButton"),
      "signoutButton": doc.getElementById("signoutButton"),
      "app": doc.getElementById("app"),
      "albums": doc.getElementById("albums"),
      "albumheader": doc.getElementById("albumheader")
    };

  function showMessage(message) {
    if (message) {
      dom.message.innerHTML = message;
      dom.messageCard.style.display = "block";
    } else {
      dom.message.innerHTML = "";
      dom.messageCard.style.display = "none";
    }
  }

  function onInitSuccess() {
    con.log("onInitSuccess");
  }

  function onError(message) {
    con.log("onError: " + JSON.stringify(message));
  }

  function onSuccess(message) {
    con.log("onSuccess: " + message);
  }

  function sessionUpdateListener(isAlive) {
    var message = isAlive ? "Session Updated" : "Session Removed";
    message += ": " + session.sessionId;
    con.log(message);
    if (!isAlive) {
      session = null;
      if (!!currentCast) {
        currentCast.src = "cast.png";
        currentCast = null;
      }
    }
  }

  function receiverMessage(namespace, message) {
    con.log("receiverMessage: " + namespace, message);
  }

  function sessionListener(e) {
    con.log("New session ID:" + e.sessionId);
    session = e;
    session.addUpdateListener(sessionUpdateListener);
    session.addMessageListener(namespace, receiverMessage);
  }

  function receiverListener(e) {
    if (e === "available") {
      con.log("receiver found");
      dom.albums.classList.remove("no_receiver");
      showMessage();
    } else {
      con.log("receiver list empty");
      dom.albums.classList.add("no_receiver");
      showMessage("No receivers found...");
    }
  }

  function loadPlus() {
    var po, s;
    po = doc.createElement("script");
    po.type = "text/javascript";
    po.async = true;
    po.src = "https://apis.google.com/js/client:plusone.js";
    s = doc.getElementsByTagName("script")[0];
    s.parentNode.insertBefore(po, s);
  }

  function initializeCastApi() {
    var
      sessionRequest = new chr.cast.SessionRequest(applicationID),
      apiConfig = new chr.cast.ApiConfig(sessionRequest,
                                         sessionListener,
                                         receiverListener);

    chr.cast.initialize(apiConfig, onInitSuccess, onError);
    loadPlus();
  }

  function waitForApi() {
    if (!chr.cast || !chr.cast.isAvailable) {
      global.setTimeout(waitForApi, 100);
    } else {
      initializeCastApi();
    }
  }

  if (!chr) {
    showMessage("Sorry! This page only works in <a href=\"https://www.google.com/chrome\">Google Chrome.</a>");
    return;
  }

  if (!chr.cast) {
    showMessage("Cast API not found, this shouldn't happen...");
    return;
  }

  if (chr.cast.extensionId) {
    waitForApi();
  } else {
    chr.cast.ApiBootstrap_.findInstalledExtension_(function (extensionId) {
      if (!extensionId) {
        showMessage("Please install the <a href=\"https://chrome.google.com/webstore/detail/google-cast/boadgeojelhgndaghljhdicfkmllpafd\">Google Cast extension</a>.");
      } else {
        waitForApi();
      }
    });
  }

  function sendMessage(message, cb) {
    if (session !== null) {
      session.sendMessage(namespace, message, cb.bind(global, true), cb.bind(global, false));
    } else {
      chr.cast.requestSession(function(e) {
        session = e;
        session.addUpdateListener(sessionUpdateListener);
        session.addMessageListener(namespace, receiverMessage);
        session.sendMessage(namespace, message, cb.bind(global, true), cb.bind(global, false));
      }, onError);
    }
  }

  function fetchData(url, cb) {
    var script;

    global.jsonp_callback = function (data) {
      cb(data);
    };

    if (url.indexOf("?") >= 0) {
      url += "&";
    } else {
      url += "?";
    }
    url += "callback=jsonp_callback";

    script = doc.createElement("script");
    script.src = url;
    doc.head.appendChild(script);
  }

  function castAlbum(e) {
    var url = e.target.getAttribute("data-url");
    if (!!url) {
      if (currentCast === e.target) {
        // album is already being cast, stop casting
        sendMessage({"action": "STOP_CAST"}, function (success, error) {
          if (success) {
            currentCast.src = "cast.png";
            currentCast = null;
          } else {
            con.log(error);
          }
        });
      } else {
        sendMessage({"url": url}, function (success, error) {
          if (success) {
            if (!!currentCast) {
              currentCast.src = "cast.png";
            }
            currentCast = e.target;
            currentCast.src = "casting.png";
          } else {
            con.log(error);
          }
        });
      }
    }
  }

  function showAlbums(data) {
    var i, album, div, img, a;
    if (!!data && !!data.feed && !!data.feed.entry && data.feed.entry.length > 0) {
      dom.albums.innerHTML = "";
      dom.albumheader.style.display = "block";
      for (i = 0; i < data.feed.entry.length; i++) {
        album = data.feed.entry[i];
        if (album.gphoto$numphotos.$t > 3) { // skipping small albums (mostly photos from posts)
          div = doc.createElement("div");
          div.className = "album";
          img = doc.createElement("img");
          img.src = album.media$group.media$thumbnail[0].url.replace("/s160-c/", "/s120-c/");
          img.title = album.title.$t + " / " + album.gphoto$numphotos.$t  + " photos";
          div.appendChild(img);
          a = doc.createElement("a");
          a.href = "https://plus.google.com/photos/" + my_id + "/albums/" + album.gphoto$id.$t;
          a.target="_blank";
          a.className = "plus";
          img = doc.createElement("img");
          img.src = "gplus.png";
          a.appendChild(img);
          div.appendChild(a);
          img = doc.createElement("img");
          img.src = "cast.png";
          img.className = "cast";
          img.setAttribute("data-url", album.link[0].href);
          img.title = album.title.$t + " / " + album.gphoto$numphotos.$t  + " photos";
          div.appendChild(img);
          dom.albums.appendChild(div);
          img.onclick = castAlbum;
        }
      }
    }
  }

  function initializeApp() {
    gapi = global.gapi;
    gapi.client.load("plus", "v1", function () {
      gapi.client.plus.people.get({"userId": "me"}).execute(function (data) {
        my_id = data.id;
        fetchData("https://picasaweb.google.com/data/feed/api/user/" + my_id + "?kind=album&alt=json", showAlbums);
      });
    });
  }

  global.signinCallback = function (authResult) {
    if (authResult && !authResult.error) {
      dom.signinButton.style.display = "none";
      dom.albumheader.style.display = "none";
      dom.app.style.display = "block";
      initializeApp();
    } else {
      dom.signinButton.style.display = "block";
      dom.app.style.display = "none";
    }
  };

  function onStopAppSuccess() {
    con.log("onStopAppSuccess");
  }

  global.disconnectCallback = function (data) {
    con.log(data);
  };

  dom.signoutButton.onclick = function () {
    var script, token;
    dom.app.style.display = "none";
    dom.signinButton.style.display = "block";
    if (!!session) {
      session.stop(onStopAppSuccess, onError);
      session = null;
      if (!!currentCast) {
        currentCast.src = "cast.png";
        currentCast = null;
      }
    }

    token = global.gapi.auth.getToken();

    if (token && token.access_token) {
      // Revoke permissions
      script = doc.createElement("script");
      script.src = "https://accounts.google.com/o/oauth2/revoke?token=" + token.access_token + "&callback=disconnectCallback";
      doc.head.appendChild(script);
    }
  };

}(this));


