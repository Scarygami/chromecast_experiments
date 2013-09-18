(function(global) {
  "use strict";

  var
    my_app_id = "<YOUR_CHROMECAST_APP_ID_HERE>",
    my_namespace = "<YOUR_NAMESPACE_HERE>",
    doc = global.document,
    receiver,
    channelHandler,
    messages = doc.getElementById("messages"),
    max_width = messages.offsetWidth,
    max_height = messages.offsetHeight,
    callback_count = 0,
    photos = [], currentPhoto = -1, timer, stopped = false, displayTime = 4000;

  // Fetch data via jsonp
  function fetchData(url, cb) {
    var script;

    callback_count++;

    global["jsonp_callback_" + callback_count] = function (data) {
      cb(data);
    };

    if (url.indexOf("?") >= 0) {
      url += "&";
    } else {
      url += "?";
    }
    url += "callback=jsonp_callback_" + callback_count;

    script = doc.createElement("script");
    script.src = url;
    doc.head.appendChild(script);
  }

  function slideShow() {
    var image, start;
    if (!!photos && photos.length > 0) {
      global.clearTimeout(timer);
      currentPhoto++;
      if (currentPhoto >= photos.length) {
        currentPhoto = 0;
      }
      image = new global.Image();

      image.onerror = function () {
        timer = global.setTimeout(slideShow, 1);
      };
      image.onabort = function () {
        timer = global.setTimeout(slideShow, 1);
      };
      image.onload = function () {
        if (stopped) { return; }
        var delay = start - (new Date()).getTime();

        /*
         * wait until display time of the previous photos is over
         * before actually showing the image after loading
         */
        timer = global.setTimeout(function () {
          if (stopped) { return; }

          var img, w, h;
          img = doc.createElement("img");

          // Sizing and centering the image
          w = max_width;
          h = max_width / image.width * image.height;
          if (h > max_height) {
            h = max_height;
            w = max_height / image.height * image.width;
          }
          img.style.width = w + "px";
          img.style.height = h + "px";
          if (h < max_height) {
            img.style.marginTop = ((max_height - h) / 2) + "px";
          }

          img.src = image.src;

          messages.innerHTML = "";
          messages.appendChild(img);

          // immediately start loading the next image
          timer = global.setTimeout(slideShow, 1);
        }, Math.max(1, displayTime - delay));
      };
      start = (new Date()).getTime();
      image.src = photos[currentPhoto];
    } else {
      messages.innerHTML = "No photos found.";
    }
  }

  function loadAlbum(data) {
    var i, photo;
    photos = [];
    currentPhoto = -1;
    if (!!data && !!data.feed && !!data.feed.entry && data.feed.entry.length > 0) {
      for (i = 0; i < data.feed.entry.length; i++) {
        photo = data.feed.entry[i];
        photos.push(photo.media$group.media$thumbnail[0].url.replace("/s72/", "/s1280/"));
      }
    }
    stopped = false;
    global.setTimeout(slideShow, 1);
  }

  function onMessage(event) {
    if (!!event.message.url) {
      // Stop previous slideshow if still running
      stopped = true;
      global.clearTimeout(timer);

      messages.innerHTML = "Fetching photos...";
      fetchData(event.message.url, loadAlbum);
      return;
    }
    if (!!event.message.action) {
      if (event.message.action === "STOP_CAST") {
        stopped = true;
        global.clearTimeout(timer);
        messages.innerHTML = "Waiting for input...";
        return;
      }
    }
  }

  // initialize receiver
  receiver = new global.cast.receiver.Receiver(my_app_id, [my_namespace]);
  channelHandler = new global.cast.receiver.ChannelHandler(my_namespace);
  channelHandler.addChannelFactory(receiver.createChannelFactory(my_namespace));
  receiver.start();
  channelHandler.addEventListener(global.cast.receiver.Channel.EventType.MESSAGE, onMessage);

}(this));