//HTML IDs
const MEDIA_ID = '#audio',
    TIMELINE_ID = '#timeline';

//Cookie Functions
// function writeCookie(name, value, days) {
//     var date, expires;
//     if (days) {
//         date = new Date();
//         date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
//         expires = "; expires=" + date.toGMTString();
//     } else {
//         expires = "";
//     }
//     document.cookie = name + "=" + value + expires + "; path=/";
// }

// function readCookie(name) {
//     var i, c, ca, nameEQ = name + "=";
//     ca = document.cookie.split(';');
//     for (i = 0; i < ca.length; i++) {
//         c = ca[i];
//         while (c.charAt(0) == ' ') {
//             c = c.substring(1, c.length);
//         }
//         if (c.indexOf(nameEQ) == 0) {
//             return c.substring(nameEQ.length, c.length);
//         }
//     }
//     return '';
// }

$(document).ready(function () {
    var _buffered = 0;
    var _currentTrack = 0;
    var _totalTracks = 0;
    var _media = $(MEDIA_ID)[0];
    var _audioContext = new AudioContext();
    var _canvas = $("#canvas")[0];
    var _canvasContext = _canvas.getContext("2d");
    var _nextUnusedID = 0;

    var gainDb = -40.0;
    var bandSplit = [360, 3600];

    //Dynamic CSS Sheet
    var _styleSheet = (function () {
        var style = document.createElement("style");
        style.appendChild(document.createTextNode(""));
        document.head.appendChild(style);
        return style.sheet;
    })();

    setInterval(update, 16.6);
    setInterval(getSources, 5000);

    function getSources() {
        $.ajax({
            type: 'GET',
            url: '/audioVisualizer/php/getSources.php',
            success: function (sources) {
                var existent = [];
                $(".sources").each(function (i, e) { existent[i] = e.innerHTML; });
                var newSources = [];
                $.each(JSON.parse(sources), function (i, source) {
                    if ($.inArray(source, existent) == -1) {
                        newSources[newSources.length] = source;
                    }
                });
                var unavailableSources = [];
                $.each(existent, function (i, source) {
                    if ($.inArray(source, JSON.parse(sources)) == -1) {
                        unavailableSources[unavailableSources.length] = source;
                    }
                });
                $.each(newSources, function (i, source) {
                    $("#sourceList").append("<li><button id=\"source_" + _nextUnusedID + "\" class='sources styledButton'>" + source + "</button></li>");
                    $("#source_" + _nextUnusedID).click(function () {
                        _media.src = "uploads/" + this.innerHTML;
                        if (_currentTrack < _totalTracks)
                            $("#source_" + _currentTrack).removeClass("lightGreyBackground");
                        _currentTrack = this.id.split("_")[1];
                        $("#" + this.id).addClass("lightGreyBackground");
                        _media.load();
                        _media.play();
                    });
                    _nextUnusedID++;
                });
                $(".sources").each(function (i, e) {
                    if ($.inArray(e.innerHTML, unavailableSources) != -1) {
                        $(e).parent().remove();
                    }
                });
                regenerateSourceIDs()
            }
        });
    }

    getSources();

    function regenerateSourceIDs() {
        var id = 0;
        $(".sources").each(function (i, e) {
            e.id = "source_" + id;
            id++;
        });
        _totalTracks = id;
    }

    $("#uploadForm").submit(function () {
        event.preventDefault();
        for (var i = 0; i < $("#fileToUpload").prop("files").length; i++) {
            var formData = new FormData($(this)[0]);
            formData.append("fileToUpload", $("#fileToUpload").prop("files")[i]);
            $.ajax({
                type: 'POST',
                url: '/audioVisualizer/php/upload.php',
                data: formData,
                processData: false,
                contentType: false
            });
        }
        $("#fileToUpload").val("");
    });

    //Left Analyzer
    var leftAnalyser = _audioContext.createAnalyser();
    leftAnalyser.fftSize = 2048;
    leftAnalyser.smoothingTimeConstant = 0.95;

    //Right Analyzer
    var rightAnalyser = _audioContext.createAnalyser();
    rightAnalyser.fftSize = 2048;
    rightAnalyser.smoothingTimeConstant = 0.95;

    //Low Analyzer
    var lowAnalyzer = _audioContext.createAnalyser();
    lowAnalyzer.fftSize = 64;
    lowAnalyzer.smoothingTimeConstant = 0.95;

    //////////////////////EQ//////////////////////

    //HighFilter
    var highBand = _audioContext.createBiquadFilter();
    highBand.type = "lowshelf";
    highBand.frequency.value = bandSplit[0];
    highBand.gain.value = gainDb;

    //LowFilter
    var lowBand = _audioContext.createBiquadFilter();
    lowBand.type = "highshelf";
    lowBand.frequency.value = bandSplit[1];
    lowBand.gain.value = gainDb;

    //MidFilter
    var midBand = _audioContext.createGain();
    var hInvert = _audioContext.createGain();
    hInvert.gain.value = -1.0;
    var lInvert = _audioContext.createGain();
    lInvert.gain.value = -1.0;

    //Connections
    var audioSrc = _audioContext.createMediaElementSource(_media);
    audioSrc.connect(highBand);
    audioSrc.connect(lowBand);
    audioSrc.connect(midBand);

    highBand.connect(hInvert);
    lowBand.connect(lInvert);
    hInvert.connect(midBand);
    lInvert.connect(midBand);

    //HighGain, MidGain, LowGain
    var highGain = _audioContext.createGain();
    var midGain = _audioContext.createGain();
    var lowGain = _audioContext.createGain();

    highBand.connect(highGain);
    midBand.connect(midGain);
    lowBand.connect(lowGain);

    var sum = _audioContext.createGain();
    lowGain.connect(lowAnalyzer);
    lowAnalyzer.connect(sum);
    midGain.connect(sum);
    highGain.connect(sum);

    //LeftGain, RightGain, MainGain
    var leftGain = _audioContext.createGain();
    var rightGain = _audioContext.createGain();
    var mainGain = _audioContext.createGain();

    var splitter = _audioContext.createChannelSplitter(2);
    var merger = _audioContext.createChannelMerger(2);

    sum.connect(mainGain);
    mainGain.connect(splitter);

    splitter.connect(leftGain, 0, 0);
    splitter.connect(rightGain, 1, 0);

    leftGain.connect(leftAnalyser);
    rightGain.connect(rightAnalyser);

    leftAnalyser.connect(merger, 0, 0);
    rightAnalyser.connect(merger, 0, 1);

    merger.connect(_audioContext.destination);

    var frequencyData0 = new Uint8Array(leftAnalyser.frequencyBinCount);
    var frequencyData1 = new Uint8Array(rightAnalyser.frequencyBinCount);
    var frequencyData2 = new Uint8Array(lowAnalyzer.frequencyBinCount);

    //EQ Inputs
    function changeGain(type, value) {
        switch (type) {
            case 'lowGain': lowGain.gain.value = value; break;
            case 'midGain': midGain.gain.value = value; break;
            case 'highGain': highGain.gain.value = value; break;
            case 'leftGain': leftGain.gain.value = value; break;
            case 'rightGain': rightGain.gain.value = value; break;
            case 'mainGain': mainGain.gain.value = value; break;
        }
    }
    ////////////////////////////////////////////////////

    function drawSliderProgress(slider) {
        var p = (slider.value / slider.max * 100).toFixed(2);
        var parts = ["background: linear-gradient(to right", " black " + p + "%", " white " + p + "%);"];
        for (var i = 0; i < _styleSheet.rules.length; i++) {
            if (new RegExp("^#" + slider.id).test(_styleSheet.rules[i].selectorText)) {
                if ("#" + slider.id == TIMELINE_ID) {
                    parts[2] = " lightgrey " + p + "%";
                    parts[3] = " lightgrey " + _buffered + "%";
                    parts[4] = " white " + _buffered + "%);";
                }
                _styleSheet.removeRule(i);
            }
        }
        _styleSheet.addRule("#" + slider.id + "::-webkit-slider-runnable-track", parts.join(","));
    }

    //Events
    $(TIMELINE_ID).on("input", function () { if ($(MEDIA_ID).attr('src')) _media.currentTime = this.value; else this.value = 0; });
    $(MEDIA_ID).on("timeupdate", function () {
        $(TIMELINE_ID).val(this.currentTime);
        drawSliderProgress($(TIMELINE_ID)[0]);
    })
        .on("progress", function () { if (_media.buffered.length > 0) _buffered = (_media.buffered.end(_media.buffered.length - 1) / _media.duration * 100).toFixed(2); })
        .on("loadedmetadata", function () { this.currentTime = 0; _buffered = 0; $(TIMELINE_ID).attr('max', this.duration); $('#durationLabel').html((this.duration / 60).toFixed(2).replace(".", ":")); })
        .on("ended", function () { $("#nextTrackButton").trigger("click"); })
        .on("play", function () { $("#playPauseButton i").html("pause"); })
        .on("pause", function () { $("#playPauseButton i").html("play_arrow"); });
    $("#eqHigh").on("input", function () { changeGain("highGain", this.value); drawSliderProgress(this); });
    $("#eqMid").on("input", function () { changeGain("midGain", this.value); drawSliderProgress(this); });
    $("#eqLow").on("input", function () { changeGain("lowGain", this.value); drawSliderProgress(this); });
    $("#eqLeft").on("input", function () { changeGain("leftGain", this.value); drawSliderProgress(this); });
    $("#eqRight").on("input", function () { changeGain("rightGain", this.value); drawSliderProgress(this); });
    $("#eqMain").on("input", function () { changeGain("mainGain", this.value); drawSliderProgress(this); });
    $("#playPauseButton").click(function () { if (_media.paused) _media.play(); else _media.pause(); });
    $("#previousTrackButton").click(function () {
        var id = _currentTrack == 0 ? _totalTracks - 1 : _currentTrack - 1;
        $("#source_" + id).trigger("click");
    });
    $("#nextTrackButton").click(function () {
        var id = _currentTrack == _totalTracks - 1 ? 0 : parseInt(_currentTrack) + 1;
        $("#source_" + id).trigger("click");
    });

    //Canvas Functions
    function drawCanvasLine(x0, x1, y) {
        _canvasContext.beginPath();
        _canvasContext.moveTo(x0, y);
        _canvasContext.lineTo(x1, y);
        _canvasContext.stroke();
    }

    function drawCanvasArc(i, w, h, r, a, b) {
        var m = Math.PI / 12; //15 degrees
        var o = m * (i % 24);
        _canvasContext.beginPath();
        _canvasContext.arc(w, h, r, m * a + o, m * b + o);
        _canvasContext.stroke();
    }
    //var test = 0;

    //Update Function
    function update() {
        //Get Frequency Data
        leftAnalyser.getByteFrequencyData(frequencyData0);
        rightAnalyser.getByteFrequencyData(frequencyData1);
        lowAnalyzer.getByteFrequencyData(frequencyData2);

        //if(test % 60 == 0 && _media.paused == false) console.log(frequencyData0); //for(var i = 0; i < frequencyData2.length; i++) console.log(eArr.next().value);
        var cT = _media.currentTime / 60;
        $('#currentTimeLabel').html(cT.toFixed(2).replace(".", ":"));

        _canvasContext.clearRect(0, 0, _canvas.width, _canvas.height);
        for (var i = 0; i < frequencyData0.length; i++) {
            drawCanvasLine(0, frequencyData0[i], _canvas.height - i);
            drawCanvasLine(_canvas.width, _canvas.width - frequencyData1[i], _canvas.height - i);
        }
        for (var i = 0; i < frequencyData2.length; i++) {
            var w = _canvas.width / 2;
            var h = _canvas.height / 2;
            var r = frequencyData2[i] * _canvas.height / 512;
            drawCanvasArc(i, w, h, r, 1, 5);
            drawCanvasArc(i, w, h, r, 7, 11);
            drawCanvasArc(i, w, h, r, 13, 17);
            drawCanvasArc(i, w, h, r, 19, 23);
        }
    }
});
