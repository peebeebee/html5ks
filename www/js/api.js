"use strict";
window.html5ks.api = {
  seen_scene: function (scene) {
    return !!html5ks.persistent.seen_scenes[scene];
  },
  scene_register: function (scene) {
    html5ks.persistent.seen_scenes.scene = true;
  },
  fading: function (audio, dir, fade) {
    var fadeSet = html5ks.persistent.settings.fade,
        step = fadeSet / (fade * 1000),
        over = audio.volume + step * dir;
    if (over > 1) {
      audio.volume = 1;
    } else if (over < 0) {
      audio.volume = 0;
    } else {
      audio.volume += step * dir;
      setTimeout(function () {
        html5ks.api.fading(audio, dir, fade);
      }, fadeSet);
    }
  },
  play: function (channel, name, fade) {
    // TODO: fade
    var deferred = when.defer(),
        audio = html5ks.elements.audio[channel];
    audio.src = "/dump/" + (channel === "music" ? "bgm/" + html5ks.data.music[name] + ".ogg" : html5ks.data.sfx[name]);
    audio.load();
    audio.volume = fade ? 0 : 1;
    audio.play();
    audio.addEventListener("playing", function playing() {
      audio.removeEventListener("playing", playing, false);
      deferred.resolve();
      if (fade) {
        html5ks.api.fading(audio, 1, fade);
      }
    }, false);
    audio.addEventListener("error", function error() {
      audio.removeEventListener("error", error, false);
      deferred.reject(this.error);
    }, false);
    return deferred.promise;
  },
  stop: function (channel, fade) {
    var deferred = when.defer(),
        audio = html5ks.elements.audio[channel],
        fadeSet = html5ks.persistent.settings.fade;
    if (fade) {
      this.fading(audio, -1, fade);
    } else {
      audio.pause();
    }
    deferred.resolve();
    return deferred.promise;
  },
  movie_cutscene: function (vid_src) {
    var deferred = when.defer(),
        video = html5ks.elements.video;
    video.src = "/dump/video/" + vid_src + ".webm";
    video.load();
    video.play();
    var done = function () {
      this.style.display = "none";
      this.pause();
      deferred.resolve();
    };
    video.addEventListener("mouseup", done, false);
    video.addEventListener("ended", done, false);
    video.addEventListener("error", function () {
      deferred.reject(this.error);
    }, false);
    return deferred.promise;
  },
  act_op: function (this_video) {
    // strip off extension
    return this.movie_cutscene(this_video.slice(0,-4));
  },
  iscene: function (target, is_h, is_end) {
    this.scene_register(target);
    var label = html5ks.data.script[target],
        i = 0;
    (function run() {
      html5ks.api.runInst(label[i]).then(run, console.error);
      i++;
    }());
  },
  window: function (action, transition) {
    var windw = html5ks.elements.window,
        deferred = when.defer();
    if (action === "show") {
      windw.style.display = "block";
    } else {
      windw.style.display = "none";
    }
    deferred.resolve(action);
    return deferred.promise;
  },
  // NOT iscene
  scene: function (type, name) {
    var deferred = when.defer(),
        nom = type;
    if (name) {
      nom = type + "_" + name;
    }
    var img = new Image();
    var image = html5ks.data.images[nom];
    if (!image) {
      var typ = {
        "bg": {dir:"bgs",ext:"jpg"}
      }[type];
      image = typ.dir + "/" + name + "." + typ.ext;
    }
    if (typeof image == "string") {
      if (image.substring(0,1) == "#") {
        html5ks.elements.bg.style.background = image;
        deferred.resolve();
        return deferred.promise;
      } else {
        image = {image: image};
      }
    }
    img.onload = function () {
      console.debug("setting bg " + img.src);
      html5ks.elements.bg.style.background = "url(" + img.src + ")";
      deferred.resolve();
    };
    img.onerror = function () {
      throw new Error("bg could not load");
    };
    img.src = "/dump/" + image.image;
    return deferred.promise;
  },
  show: function () {
    var deferred = when.defer();
    deferred.resolve();
    return deferred.promise;
  },
  hide: function () {
    var deferred = when.defer();
    deferred.resolve();
    return deferred.promise;
  },
  with: function (transition, action) {
    return this.runInst(action);
  },
  runInst: function (inst) {
    var cmd = inst[0],
        args = inst.slice(1);
    if (html5ks.data.characters[cmd]) {
      return this.character(cmd, args);
    } else {
      if (this[cmd]) {
        return this[cmd].apply(this, args);
      } else if (/^[A-Z]/.test(cmd)) {
        console.log("cmd starts with caps, probably character");
        return this.character(cmd, args);
      } else {
        console.error("no such cmd " + cmd);
        var deferred = when.defer();
        deferred.resolve();
        return deferred.promise;
      }
    }
  },
  character: function (name, str) {
    var deferred = when.defer(),
        text = str,
        char = html5ks.data.characters[name];
    if (!char) {
      char = { name: name }
    }
    if (char.what_prefix) {
      text = char.what_prefix + text;
    }
    if (char.what_suffix) {
      text = text + char.what_suffix;
    }
    var who = html5ks.elements.who;
    who.textContent = char.name;
    if (char.color) {
      who.style.color = char.color;
    } else {
      who.style.color = "#ffffff";
    }
    html5ks.elements.say.textContent = text;
    html5ks.next = function () {
      deferred.resolve(text);
      html5ks.next = function () {};
    };
    if (html5ks.state.auto) {
      setTimeout(html5ks.next, 1000 + html5ks.persistent.settings.autospeed * text.length);
    }
    return deferred.promise;
  },
  Pause: function (duration) {
    var deferred = when.defer();
    setTimeout(function () {
      deferred.resolve();
    }, duration * 1000);
    return deferred.promise;
  }
};