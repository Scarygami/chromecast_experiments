(function (global) {
  "use strict";

  var
    my_app_id = "<YOUR_CHROMECAST_APP_ID_HERE>",
    my_namespace = "<YOUR_NAMESPACE_HERE>",
    doc = global.document,
    con = global.console,
    gapi, my_id,
    cast_api,
    cast_activity,
    receivers,
    currentCast,
    receiverList = doc.getElementById("receiver_list"),
    killSwitch = doc.getElementById("kill"),
    appDiv = doc.getElementById("app"),
    signinButton = doc.getElementById("signinButton"),
    signoutButton = doc.getElementById("signoutButton"),
    albumsDiv = doc.getElementById("albums");

  // Fetch data via jsonp
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

  function onLaunch(activity) {
    if (activity.status === 'running') {
      cast_activity = activity;
      killSwitch.style.display = "inline-block";
      albumsDiv.style.display = "block";
    }
  }

  function doLaunch(receiver) {
    var request;
    if (!cast_activity) {
      // Only launch when no other receiver has been launched yet
      request = new global.cast.LaunchRequest(my_app_id, receiver);
      cast_api.launch(request, onLaunch);
    }
  }

  function receiverClicked(e) {
    var id = e.target.getAttribute("data-id"), receiver, i;
    e.preventDefault();

    if (!!id) {
      for (i = 0; i < receivers.length; i++) {
        if (receivers[i].id === id) {
          receiver = receivers[i];
          break;
        }
      }
      if (!!receiver) {
        doLaunch(receiver);
      }
    }
  }

  function onReceiverList(list) {
    var i, item;
    if (list.length > 0) {
      receivers = list;
      receiverList.innerHTML = "";
      for (i = 0; i < receivers.length; i++) {
        item = doc.createElement("span");
        item.setAttribute("data-id", receivers[i].id);
        item.className = "receiver";
        item.innerHTML = receivers[i].name;
        receiverList.appendChild(item);
        item.onclick = receiverClicked;
      }
    } else {
      receiverList.innerHTML = "Looking for receivers...";
    }
  }

  function castAlbum(e) {
    var url = e.target.getAttribute("data-url");
    if (!!cast_activity && !!url) {
      if (currentCast === e.target) {
        // album is already being cast, stop casting
        currentCast.src = "cast.png";
        currentCast = null;
        cast_api.sendMessage(cast_activity.activityId, my_namespace, {"action": "STOP_CAST"});
      } else {
        if (!!currentCast) {
          currentCast.src = "cast.png";
        }
        currentCast = e.target;
        currentCast.src = "casting.png";
        cast_api.sendMessage(cast_activity.activityId, my_namespace, {"url": url});
      }
    }
  }

  function showAlbums(data) {
    var i, album, div, img;
    if (!!data && !!data.feed && !!data.feed.entry && data.feed.entry.length > 0) {
      albumsDiv.innerHTML = "";
      for (i = 0; i < data.feed.entry.length; i++) {
        album = data.feed.entry[i];
        if (album.gphoto$numphotos.$t > 3) { // skipping small albums (mostly photos from posts)
          div = doc.createElement("div");
          div.className = "album";
          img = doc.createElement("img");
          img.src = album.media$group.media$thumbnail[0].url.replace("/s160-c/", "/s100-c/");
          div.appendChild(img);
          img = doc.createElement("img");
          img.src = "cast.png";
          img.className = "cast";
          img.setAttribute("data-url", album.link[0].href);
          img.title = album.title.$t + " / " + album.gphoto$numphotos.$t  + " photos";
          div.appendChild(img);
          albumsDiv.appendChild(div);
          img.onclick = castAlbum;
        }
      }
    }
  }

  function initializeApp() {
    gapi = global.gapi;
    if (!cast_api) {
      cast_api = new global.cast.Api();
      cast_api.addReceiverListener(my_app_id, onReceiverList);
    }

    gapi.client.load("plus", "v1", function () {
      gapi.client.plus.people.get({"userId": "me"}).execute(function (data) {
        my_id = data.id;
        fetchData("https://picasaweb.google.com/data/feed/api/user/" + my_id + "?kind=album&alt=json", showAlbums);
      });
    });
  }

  global.signinCallback = function (authResult) {
    if (!authResult.error) {
      signinButton.style.display = "none";
      appDiv.style.display = "block";
      initializeApp();
    }
  };

  function loadPlus() {
    var po, s;
    po = doc.createElement('script');
    po.type = 'text/javascript';
    po.async = true;
    po.src = 'https://apis.google.com/js/client:plusone.js';
    s = doc.getElementsByTagName('script')[0];
    s.parentNode.insertBefore(po, s);
  }

  global.addEventListener('message', function(event) {
    if (event.source === global && event.data &&
        event.data.source === 'CastApi' &&
        event.data.event === 'Hello') {
      loadPlus();
    }
  });

  function disconnectChromecast() {
    if (!!cast_activity) {
      cast_api.stopActivity(cast_activity.activityId, function() {
        cast_activity = null;
        if (!!currentCast) {
          currentCast.src = "cast.png";
        }
        currentCast = null;
        killSwitch.style.display = "none";
        albumsDiv.style.display = "none";
      });
    }
  }

  global.disconnectCallback = function (data) {
    con.log(data);
  };

  signoutButton.onclick = function () {
    var script, token;
    if (global.glassapp) { global.glassapp.stop(); }
    signinButton.style.display = "block";
    appDiv.style.display = "none";
    disconnectChromecast();

    token = global.gapi.auth.getToken();

    if (token && token.access_token) {
      // Revoke permissions
      script = doc.createElement("script");
      script.src = "https://accounts.google.com/o/oauth2/revoke?token=" + token.access_token + "&callback=disconnectCallback";
      doc.head.appendChild(script);
    }
  };

  killSwitch.onclick = disconnectChromecast;

}(this));