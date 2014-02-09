/*
 * Copyright (c) 2014 Gerwin Sturm, FoldedSoft e.U. / www.foldedsoft.at
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License. You may obtain
 * a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations under
 * the License.
 */

(function (global) {
  "use strict";

  var
    doc = global.document,
    con = global.console,
    cast_loader,
    main = doc.getElementById("contentPane"),


    refreshSelector = ".tke.oDc",
    refreshButtonClassList = ["d-k-l", "b-c", "b-c-U", "JFd", "JZ"],
    headerSelector = ".Ima.Xic",
    postClassList = ["Yp", "yt", "Xa"],
    buttonClass = "d-s Cy a1b CTc x0c castButton",
    postTextClass = "Ct",
    postImgSelector = ".ar.Mc",
    reshareSelector = ".qg",
    reshareAuthorSelector = ".ob.tv.Ub.Hf",
    authorClass = "zi",
    authorImageClass = "Uk wi hE",
    timestampClass = "uv",

    postObserver, refreshObserver,
    casting = false, receivers = false,
    applicationID = "02B37093",
    namespace = "urn:x-cast:com.allmycast.pluscast",
    session = null,
    castButton;

  function listContainsList(list1, list2) {
    var i;
    for (i = 0; i < list2.length; i++) {
      if (!list1.contains(list2[i])) {
        return false;
      }
    }
    return true;
  }

  function selectorFromClassList(classList) {
    return "." + classList.join(".");
  }

  /*
   * Cast SDK Loadeer
   */

  cast_loader = {
    READY: "ready",
    WRONG_BROWSER: "wrong browser",
    EXTENSION_MISSING: "extension missing",
    SDK_NOT_FOUND: "sdk not found",
    callbacks: [],
    loading: true,
  };

  cast_loader.finish = function (state) {
    var cb;
    cast_loader.loading = false;
    cast_loader.state = state;
    while (cast_loader.callbacks.length > 0) {
      cb = cast_loader.callbacks.shift();
      cb(cast_loader.state);
    }
  };

  cast_loader.onReady = function (cb) {
    if (cast_loader.loading) {
      cast_loader.callbacks.push(cb);
    } else {
      cb(cast_loader.state);
    }
  };

  cast_loader.script = doc.createElement("script");
  cast_loader.script.type = "text/javascript";

  cast_loader.script.onload = function () {
    function waitForApi() {
      if (!global.chrome.cast.isAvailable) {
        global.setTimeout(waitForApi, 100);
      } else {
        cast_loader.finish(cast_loader.READY);
      }
    }

    if (!global.chrome.cast) {
      cast_loader.finish(cast_loader.SDK_NOT_FOUND);
      return;
    }

    if (global.chrome.cast.extensionId) {
      waitForApi();
    } else {
      global.chrome.cast.ApiBootstrap_.findInstalledExtension_(function (extensionId) {
        if (!extensionId) {
          cast_loader.finish(cast_loader.EXTENSION_MISSING);
        } else {
          waitForApi();
        }
      });
    }
  };

  cast_loader.script.onerror = function (e) {
    cast_loader.finish(cast_loader.SDK_NOT_FOUND);
  };

  cast_loader.script.src = "https://www.gstatic.com/cv/js/sender/v1/cast_sender.js";
  doc.getElementsByTagName("head")[0].appendChild(cast_loader.script);


  /*
   * Cast SDK initialization
   */

  function onInitSuccess() {
    con.log("Cast SDK successfully initialized");
  }

  function onError(message) {
    con.log("CAST SDK error", message);
  }

  function sessionUpdateListener(isAlive) {
    if (!isAlive) {
      session = null;
      casting = false;
      if (!!castButton) {
        castButton.getElementsByTagName("img")[0].src = "https://allmycast.appspot.com/pluscast/cast.png";
      }
    }
  }

  function sessionListener(e) {
    session = e;
    session.addUpdateListener(sessionUpdateListener);
  }

  function receiverListener(e) {
    if (e === "available") {
      con.log("receivers found");
      receivers = true;
      if (!!castButton) {
        castButton.style.display = "inline-block";
      }
    } else {
      con.log("no receivers");
      receivers = false;
      if (!!castButton) {
        castButton.style.display = "none";
      }
    }
  }

  function initCast(state) {
    if (state === cast_loader.READY) {
      var
        sessionRequest = new global.chrome.cast.SessionRequest(applicationID),
        apiConfig = new global.chrome.cast.ApiConfig(sessionRequest,
                                                     sessionListener,
                                                     receiverListener);

      global.chrome.cast.initialize(apiConfig, onInitSuccess, onError);
    }
  }

  // Try to send a message to a Google Cast device
  function sendMessage(message, cb) {
    if (session !== null) {
      session.sendMessage(namespace, message, cb.bind(global, true), cb.bind(global, false));
    } else {
      global.chrome.cast.requestSession(function(e) {
        session = e;
        session.addUpdateListener(sessionUpdateListener);
        session.sendMessage(namespace, message, cb.bind(global, true), cb.bind(global, false));
      }, onError);
    }
  }

  function forceRefresh(node) {
    global.setTimeout(function () {
      node.click();
    }, 1000);
  }

  function initRefreshObserver() {
    var node = main.querySelector(refreshSelector);
    if (!node) {
      global.setTimeout(initRefreshObserver, 1000);
      return;
    }
    refreshObserver = new global.MutationObserver(function (mutations) {
      mutations.forEach(function (mutation) {
        var i, node;
        if (!!mutation.addedNodes) {
          for (i = 0; i < mutation.addedNodes.length; i++) {
            node = mutation.addedNodes[i];
            if (!!node.classList && listContainsList(node.classList, refreshButtonClassList)) {
              if (casting) { forceRefresh(node); }
              return;
            }
          }
        }
      });
    });
    refreshObserver.observe(node, {childList: true});
    node.addEventListener("DOMNodeRemovedFromDocument", function () {
      global.setTimeout(initRefreshObserver, 1000);
    }, false);
  }

  function update(nodes) {
    var i, node, castPosts = [], html, img, tmp;
    for (i = 0; i < nodes.length; i++) {
      node = nodes[i];
      if (!!node.classList && listContainsList(node.classList, postClassList)) {
        html = node.getElementsByClassName(postTextClass)[0].innerHTML;
        img = node.querySelector(postImgSelector);
        tmp = node.querySelector(reshareSelector);
        if (!!tmp) {
          tmp = tmp.parentNode.parentNode;
          html += "<div style=\"border-top: 1px solid #CCC; margin-top: 5px;\"><b>" + tmp.querySelector(reshareAuthorSelector).textContent + "</b> originally shared:<br>";
          html += tmp.getElementsByClassName(postTextClass)[0].innerHTML;
          html += "</div>";
        }
        if (!!img) {
          html += "<br><img src=\"" + img.src + "\">";
        }
        castPosts.push({
          "id": node.id,
          "html": html,
          "author": node.getElementsByClassName(authorClass)[0].textContent,
          "pic": node.getElementsByClassName(authorImageClass)[0].src.replace("s46-c-k-no", "s100-c-k-no"),
          "time": node.getElementsByClassName(timestampClass)[0].textContent
        });
      }
    }
    if (castPosts.length > 0) {
      sendMessage({"posts": castPosts}, function () {});
    }
  }

  function initCastButton() {
    var img, node;
    node = main.querySelector(headerSelector);
    if (!node) {
      global.setTimeout(initCastButton, 1000);
      return;
    }
    castButton = doc.createElement("span");
    castButton.className = buttonClass;
    castButton.style.position = "relative";
    castButton.style.width = "40px";
    castButton.innerHTML = "&nbsp;";
    img = doc.createElement("img");
    if (casting) {
      img.src = "https://allmycast.appspot.com/pluscast/casting.png";
    } else {
      img.src = "https://allmycast.appspot.com/pluscast/cast.png";
    }
    if (!receivers) {
      castButton.style.display = "none";
    }
    img.style.position = "absolute";
    img.style.top = "7px";
    castButton.appendChild(img);
    node.appendChild(castButton);

    castButton.onclick = function () {
       if (casting) {
        if (session) {
          session.stop();
          session = null;
        }
        casting = false;
        castButton.getElementsByTagName("img")[0].src = "https://allmycast.appspot.com/pluscast/cast.png";
        postObserver.disconnect();
      } else {
        sendMessage({"start": true}, function (success, error) {
          var i, nodes = [], tmpNodes;
          if (success) {
            casting = true;
            castButton.getElementsByTagName("img")[0].src = "https://allmycast.appspot.com/pluscast/casting.png";
            postObserver.observe(main, {childList: true, subtree: true});

            // Fill with initial list of posts
            tmpNodes = main.querySelectorAll(selectorFromClassList(postClassList));
            for (i = 0; i < tmpNodes.length && i < 5; i++) {
              nodes.unshift(tmpNodes[i]);
            }
            update(nodes);
          }
        });
      }
    };

    castButton.addEventListener("DOMNodeRemovedFromDocument", function () {
      castButton = null;
      global.setTimeout(initCastButton, 1000);
    }, false);
  }

  // handle nodes that get added dynamically after the script started
  postObserver = new global.MutationObserver(function (mutations) {
    if (!casting) { return; }
    mutations.forEach(function (mutation) {
      if (!!mutation.addedNodes && mutation.addedNodes.length > 0) {
        update(mutation.addedNodes);
      }
    });
  });


  global.setTimeout(function () {
    initRefreshObserver();
    initCastButton();
    cast_loader.onReady(initCast);
  }, 10);
}(this));