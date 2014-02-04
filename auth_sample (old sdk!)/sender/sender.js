(function (global) {
  "use strict";

  var
    my_app_id = "<YOUR_CHROMECAST_APP_ID_HERE>",
    my_namespace = "<YOUR_NAMESPACE_HERE>",
    doc = global.document,
    con = global.console,
    cast_api,
    cast_activity,
    receivers,
    receiverList = doc.getElementById("receiver_list"),
    killSwitch = doc.getElementById("kill"),
    appDiv = doc.getElementById("app"),
    signinButton = doc.getElementById("signinButton"),
    signoutButton = doc.getElementById("signoutButton");

  con.log("Sender started.");

  function onLaunch(activity) {
    if (activity.status === 'running') {
      cast_activity = activity;
      killSwitch.disabled = false;

      /*
       * Important note:
       * This will send your access token via an unsecured websocket to the Chromecast receiver.
       * The data won't leave your local network, and tokens expire after 1 hour by default.
       * Still better not to use this for tokens with too many critical permissions.
       */
      cast_api.sendMessage(cast_activity.activityId, my_namespace, global.gapi.auth.getToken());
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
    con.log("Receivers changed");
    con.log(list);
    if (list.length > 0) {
      receivers = list;
      receiverList.innerHTML = "";
      for (i = 0; i < receivers.length; i++) {
        item = doc.createElement("li");
        item.setAttribute("data-id", receivers[i].id);
        item.className = "receiver";
        item.innerHTML = receivers[i].name;
        receiverList.appendChild(item);
        item.onclick = receiverClicked;
      }
    }
  }

  function initializeApi() {
    if (!cast_api) {
      con.log("API initialized");
      cast_api = new global.cast.Api();
      cast_api.addReceiverListener(my_app_id, onReceiverList);
    }
  }

  global.signinCallback = function (authResult) {
    if (!authResult.error) {
      signinButton.style.display = "none";
      appDiv.style.display = "block";
      initializeApi();
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
        killSwitch.disabled = true;
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