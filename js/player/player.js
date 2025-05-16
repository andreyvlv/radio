(function () {
  'use strict';

  // Массивы для хранения аудио-элементов и идентификаторов целевых контейнеров
  var audioElements = [];
  var targetIds = [];

  // Добавление CSS-стилей плеера в head документа
  var stylesheetLink = document.createElement("link");
  stylesheetLink.rel = "stylesheet";
  stylesheetLink.href = "/css/player/player.css";
  stylesheetLink.type = "text/css";
  document.getElementsByTagName("head")[0].appendChild(stylesheetLink);

  // Конструктор плеера
  function RadioPlayer(userConfig) {
    this.conf = {
      target: null,
      url: null,
      platform: 'sc',
      mountPoint: 'stream',
      sid: 1,
      volume: 0.75,
      logo: "decline.png",
      bg: "000000",
      artwork: 1,
      artistc: "000000",
      songtitlec: 'ffffff',
      buttonc: 'ffffff',
      autoplay: 0,
      src: ''
    };
    this.cls = {
      wrapper: "radioPlayer-wrapper",
      player: "radioPlayer-player",
      artwork: "radioPlayer-artwork",
      metadata: "radioPlayer-metadata",
      controls: 'radioPlayer-controls',
      artistInfo: 'radioPlayer-artistInfo',
      songtitle: 'radioPlayer-title',
      artistName: "radioPlayer-artist",
      albumName: 'radioPlayer-albumName',
      ppBtn: "radioPlayer-ppBtn material-icons playBtn",
      volSlider: "radioPlayer-volSlider",
      volSliderBar: 'radioPlayer-volSliderBar',
      volIcon: "radioPlayer-volIcon material-icons radioPlayer-vol3"       
    };
    // Переопределяем стандартные настройки переданными параметрами
    for (var key in this.conf) {
      if (userConfig.hasOwnProperty(key)) {
        this.conf[key] = userConfig[key];
      }
    }
    this.init();
  }

  RadioPlayer.prototype = {
    init: function () {
      // Определяем целевой элемент по ID или напрямую, если передан объект
      if (typeof this.conf.target === "object") {
        this.input = this.conf.target;
      } else {
        this.input = document.getElementById(this.conf.target.replace('#', ''));
      }
      if (!this.input) {
        return console.log("Cannot find target element...");
      }

      this.createPlayer();
      var playerInstance = this;
      var conf = this.conf;
      var audioSource, stats;
      // Настройки источника аудио и URL для получения метаданных в зависимости от платформы
      if (conf.platform === 'sc') {
        audioSource = conf.url + '/' + conf.mountPoint;
        stats = conf.url + "/stats?sid=" + conf.sid + "&json=1";
      } else if (conf.platform === 'ic') {
        audioSource = conf.url + '/' + conf.mountPoint;
        stats = conf.url + '/status-json.xsl';
      }

      this.audio = document.createElement("audio");
      this.audio.src = audioSource;
      this.audio.load();
      this.audio.volume = conf.volume;
      audioElements.push(this.audio);
      targetIds.push(this.conf.target.replace('#', ''));

      // Назначаем обработчики событий для кнопки воспроизведения и значка громкости
      this.ppBtn.onclick = () => {
        this.play(audioSource);
      };
      this.volIcon.onclick = () => {
        this.volumeIcon();
      };
      this.volSlider.addEventListener("input", function () {
        playerInstance.setVolume();
      }, false);

      // Запуск периодического обновления метаданных в зависимости от платформы
      if (this.conf.platform === 'sc') {
        this.getSC(stats);
        setInterval(function () {
          playerInstance.getSC(stats);
        }, 8000);
      } else if (this.conf.platform === 'ic') {
        this.getIC(stats);
        setInterval(function () {
          playerInstance.getIC(stats);
        }, 8000);
      }

      // Настройка внешнего вида плеера на основе переданных параметров
      if (conf.bg.length > 0) {
        this.player.style.backgroundColor = '#' + conf.bg;
      }
      if (conf.artistc.length > 0) {
        this.artistInfo.style.color = '#' + conf.artistc;
      }
      if (conf.songtitlec.length > 0) {
        this.songtitle.style.color = '#' + conf.songtitlec;
      }
      if (conf.buttonc.length > 0) {
        this.ppBtn.style.color = '#' + conf.buttonc;
        this.volIcon.style.color = '#' + conf.buttonc;
        var sliderThumbStyle = document.createElement("style");
        sliderThumbStyle.type = "text/css";
        var cssText = ".radioPlayer-controls input[type=range]::-webkit-slider-thumb {background-color: #" + conf.buttonc + '}';
        sliderThumbStyle.appendChild(document.createTextNode(cssText));
        document.getElementsByTagName("head")[0].appendChild(sliderThumbStyle);
      }
      return this;
    },

    createPlayer: function () {
      var classes = this.cls;
      this.wrapper = createElement('div', classes.wrapper);
      this.player = createElement("div", classes.player);
      this.artwork = createElement("div", classes.artwork);
      this.metadata = createElement("div", classes.metadata);
      this.songtitle = createElement('div', classes.songtitle);
      this.artistInfo = createElement("div", classes.artistInfo);
      this.artistName = createElement("span", classes.artistName);
      this.albumName = createElement('span', classes.albumName);
      this.ppBtn = createElement("div", classes.ppBtn, ['id', "ppBtn"]);
      this.controls = createElement('div', classes.controls);
      this.volSlider = createElement("input", classes.volSlider);
      this.volSliderBar = createElement("div", classes.volSliderBar);
      this.volIcon = createElement("div", classes.volIcon);

      // Структурирование элементов плеера
      this.wrapper.appendChild(this.player);
      this.player.appendChild(this.artwork);
      this.player.appendChild(this.metadata);
      this.metadata.appendChild(this.songtitle);
      this.metadata.appendChild(this.artistInfo);
      this.artistInfo.appendChild(this.artistName);
      this.artistInfo.appendChild(this.albumName);
      this.player.appendChild(this.controls);
      this.controls.appendChild(this.volIcon);
      this.controls.appendChild(this.volSlider);
      this.controls.appendChild(this.volSliderBar);
      this.controls.appendChild(this.ppBtn);

      // Настройки для ползунка громкости
      this.volSlider.type = "range";
      this.volSlider.min = 0;
      this.volSlider.max = 100;
      this.volSlider.step = 0.1;
      this.volSlider.value = this.conf.volume * 100;
      this.volSlider.setAttribute("value", this.conf.volume * 100);
      this.volSlider.autocomplete = 'off';
      this.input.appendChild(this.wrapper, this.input.nextSibling);
    },

    play: function (source) {
      var currentPlayer = this;
      // Если уже воспроизводится, останавливаем воспроизведение
      if (this.ppBtn.classList.contains("playing")) {
        this.ppBtn.classList.toggle("playing");
        this.ppBtn.classList.toggle('playBtn');
        this.ppBtn.classList.toggle('pauseBtn');
        this.audio.src = this.conf.src;
      } else {
        // Останавливаем воспроизведение во всех плеерах на странице
        for (var i = 0; i < audioElements.length; i++) {
          audioElements[i].src = currentPlayer.conf.src;
        }
        for (var i = 0; i < targetIds.length; i++) {
          var targetElement = document.getElementById(targetIds[i]);
          var playButton = targetElement.querySelector(".radioPlayer-ppBtn");
          playButton.classList.remove("playing");
          playButton.classList.remove("pauseBtn");
          playButton.classList.add("playBtn");
        }
        this.ppBtn.classList.toggle("playing");
        this.ppBtn.classList.toggle('playBtn');
        this.ppBtn.classList.toggle("pauseBtn");
        this.audio.src = source;
        this.audio.play();
      }
    },

    setVolume: function () {
      var volumeValue = this.volSlider.value;
      var volIcon = this.volIcon;
      if (volumeValue < 55 && volumeValue > 0) {
        volIcon.classList.remove("radioPlayer-vol3", "radioPlayer-vol1");
        volIcon.classList.add("radioPlayer-vol2");
      }
      if (volumeValue == 0) {
        volIcon.classList.remove('radioPlayer-vol2', 'radioPlayer-vol3');
        volIcon.classList.add("radioPlayer-vol1");
      } else if (volumeValue > 55) {
        volIcon.classList.remove("radioPlayer-vol1", 'radioPlayer-vol2');
        volIcon.classList.add('radioPlayer-vol3');
      }
      this.audio.volume = volumeValue / 100;
    },

    volumeIcon: function () {
      var currentVolumeValue = this.volSlider.value;
      var volumeIconDiv = this.volIcon;
      if (volumeIconDiv.classList.contains("radioPlayer-vol1")) {
        volumeIconDiv.classList.remove("radioPlayer-vol1", "radioPlayer-vol2");
        volumeIconDiv.classList.add("radioPlayer-vol3");
        this.audio.volume = currentVolumeValue / 100;
      } else {
        volumeIconDiv.classList.remove("radioPlayer-vol2", "radioPlayer-vol3");
        volumeIconDiv.classList.add("radioPlayer-vol1");
        this.audio.volume = 0;
      }
    },

    getSC: function (statsUrl) {
      var self = this;
      jsonpRequest(statsUrl, function (data) {
        var newSongTitle = data.songtitle;
        if (newSongTitle != self.getNP()) {
          self.setMeta(data);
        }
      });
    },

    getIC: function (statsUrl) {
      var playerInstance = this;
      xhrRequest(statsUrl, function (data) {
        var parsedData = playerInstance.findMP(data);
        var currentSong = parsedData.yp_currently_playing || parsedData.title;
        if (currentSong != playerInstance.getNP()) {
          playerInstance.setMeta(parsedData);
        }
      });
    },

    setMeta: function (data) {
      var player = this;
      var songTitle = data.songtitle || data.yp_currently_playing || data.title;
      var artistAndSongNameArray = getArtistAndSongName(songTitle);
      var artist = artistAndSongNameArray[0] || "Undefined";
      var songName = artistAndSongNameArray[1] || "Undefined";
      this.setNP(songTitle);
      this.artistName.innerHTML = artist;
      this.artistInfo.classList.add('blink-1');
      setTimeout(function () {
        player.artistInfo.classList.remove("blink-1");
      }, 3000);

      songName = songName.replace("_lufs", "");
      this.songtitle.innerHTML = songName;
      this.songtitle.classList.add("blink-1");
      setTimeout(function () {
        player.songtitle.classList.remove("blink-1");
      }, 3000);
      this.getAlbumInfo(artist, songName);
    },

    getAlbumInfo: function (artist, song) {
      var player = this;
      var sanitizedArtist = sanitizeString(artist);
      var sanitizedSong = sanitizeString(song);
      var searchQuery =
        "https://itunes.apple.com/search?term=" +
        sanitizedArtist +
        '-' +
        sanitizedSong +
        "&media=music&limit=1";
      jsonpRequest(searchQuery, function (data) {
        player.setAlbumInfo(data);
      });
    },

    setAlbumInfo: function (responseData) {
      var player = this;
      var albumArtworkUrl, albumName, albumUrl;
      if (responseData.results.length === 1) {
        albumArtworkUrl = responseData.results[0].artworkUrl100;
        albumArtworkUrl = albumArtworkUrl.replace("100x100", "200x200");
        albumName = responseData.results[0].collectionName;
        albumUrl = responseData.results[0].collectionViewUrl;
      } else {
        albumArtworkUrl = this.conf.logo;
        albumName = "Unknown";
        albumUrl = "https://music.apple.com/us/album/unknown";
      }
      this.artwork.style.backgroundImage = "url(\"" + albumArtworkUrl + "\")";

      // Если альбом неизвестен – не выводим его имя
      if (albumName === "Unknown") {
        this.albumName.innerHTML = "";
      } else {
        this.albumName.innerHTML = " - " + albumName;
      }

      this.artwork.classList.add("rotate-in-center");
      setTimeout(function () {
        player.artwork.classList.remove("rotate-in-center");
      }, 1500);
    },

    findMP: function (icestatsData) {
      if (icestatsData.icestats.source.length === undefined) {
        return icestatsData.icestats.source;
      } else {
        for (var i = 0; i < icestatsData.icestats.source.length; i++) {
          var sourceUrl = icestatsData.icestats.source[i].listenurl;
          if (sourceUrl.indexOf(this.conf.mountPoint) >= 0) {
            return icestatsData.icestats.source[i];
          }
        }
      }
    },

    getNP: function () {
      return this.wrapper.getAttribute("data-np");
    },

    setNP: function (nowPlaying) {
      this.wrapper.setAttribute("data-np", nowPlaying);
    }
  };

  // Вспомогательная функция для создания элемента с классом и опциональным атрибутом
  var createElement = function (tag, className, attribute) {
    var element = document.createElement(tag);
    if (className) {
      element.className = className;
    }
    if (attribute && attribute.length === 2) {
      element.setAttribute(attribute[0], attribute[1]);
    }
    return element;
  };

  // Функция для разбора строки с названием песни и исполнителя
  var getArtistAndSongName = function (songTitle) {
    var artistAndSongArray = songTitle.split('-');
    // Если в имени исполнителя присутствует тире, объединяем первые два элемента
    if (artistAndSongArray.length === 3) {
      artistAndSongArray[0] = artistAndSongArray[0] + artistAndSongArray[1];
      artistAndSongArray[1] = artistAndSongArray[2];
    }
    return artistAndSongArray;
  };

  // Функция для «очистки» строки – приведение к нижнему регистру, обрезка и удаление лишних частей
  var sanitizeString = function (str) {
    str = str.toLowerCase();
    str = str.trim();
    if (str.includes('&')) {
      str = str.substr(0, str.indexOf(" &"));
    } else if (str.includes("feat")) {
      str = str.substr(0, str.indexOf(" feat"));
    } else if (str.includes("ft.")) {
      str = str.substr(0, str.indexOf(" ft."));
    } else if (str.includes('[')) {
      str = str.substr(0, str.indexOf(" ["));
    }
    return str;
  };

  // JSONP-запрос для обхода политики CORS
  var jsonpRequest = function (url, callback) {
    var callbackName = "jsonp_callback_" + Math.round(100000 * Math.random());
    window[callbackName] = function (data) {
      delete window[callbackName];
      document.body.removeChild(scriptElement);
      callback(data);
    };
    var scriptElement = document.createElement("script");
    scriptElement.src =
      url + (url.indexOf('?') >= 0 ? '&' : '?') + 'callback=' + callbackName;
    document.body.appendChild(scriptElement);
  };

  // AJAX-запрос с помощью XMLHttpRequest
  var xhrRequest = function (url, callback) {
    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = event => {
      if (xhr.readyState !== 4) {
        return;
      }
      if (xhr.status === 200) {
        callback(JSON.parse(xhr.responseText));
      } else {
        console.warn("request_error");
      }
    };
    xhr.crossOrigin = "anonymous";
    xhr.open("GET", url, true);
    xhr.send();
  };

  // Экспорт конструктора плеера в глобальное пространство имён
  window.radioPlayer = RadioPlayer;
})();
