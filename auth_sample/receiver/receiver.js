(function(global) {
  "use strict";

  var
    my_app_id = "<YOUR_CHROMECAST_APP_ID_HERE>",
    my_namespace = "<YOUR_NAMESPACE_HERE>",
    doc = global.document,
    receiver,
    channelHandler,
    messages = doc.getElementById("messages"),
    auth, gapi;

  global.clientLoaded = function () {
    gapi = global.gapi;
    gapi.auth.setToken(auth);
    gapi.client.load("plus", "v1", function () {
      gapi.client.plus.people.get({"userId": "me"}).execute(function (result) {
        messages.innerHTML = "Connected as " + result.displayName + "<br><img src=\"" + result.image.url + "&sz=250\"><br><br>";
      });
    });
  };

  function loadPlus() {
    var po, s;
    po = doc.createElement('script');
    po.type = 'text/javascript';
    po.async = true;
    po.src = 'https://apis.google.com/js/client.js?onload=clientLoaded';
    s = doc.getElementsByTagName('script')[0];
    s.parentNode.insertBefore(po, s);
  }

  function onMessage(event) {
    if (!!event.message.access_token) {
      auth = event.message;
      loadPlus();
    }
  }

  receiver = new global.cast.receiver.Receiver(my_app_id, [my_namespace]);
  channelHandler = new global.cast.receiver.ChannelHandler(my_namespace);
  channelHandler.addChannelFactory(receiver.createChannelFactory(my_namespace));
  receiver.start();
  channelHandler.addEventListener(global.cast.receiver.Channel.EventType.MESSAGE, onMessage);

  }(this));