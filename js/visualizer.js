// An IIFE ("Iffy") - see the notes in mycourses
(function () {
    "use strict";

    var NUM_SAMPLES = 256;
    var SOUND_1 = 'media/Rockabye.mp3';
    var SOUND_2 = 'media/Don\'t Let Me Down.mp3';
    var SOUND_3 = 'media/In The Name Of Love.mp3';
    var bandNames = [" (feat. Sean Paul & Anne-Marie) by Clean Bandit", " (feat. Daya) - Illenium Remix by The Chainsmokers", " (feat. Bebe Rexha) by Martin Garrix"]
    var trackSelect;
    var songNumber;
    var audioElement;
    var analyserNode;
    var canvas, ctx;
    var maxRadius;
    var invert = false;
    var tint = false;
    var noise = false;
    var lines = false;
    var brightness = true;
    var delayAmount = 0;
    var delayNode;
    var frequencyGradient;
    var waveform = false;
    var tintColor = "red";

    function init() {
        // set up canvas stuff
        canvas = document.querySelector('canvas');
        ctx = canvas.getContext("2d");

        // get reference to <audio> element on page
        audioElement = document.querySelector('audio');

        // call our helper function and get an analyser node
        analyserNode = createWebAudioContextWithAnalyserNode(audioElement);

        // Set Up Track Select
        trackSelect = document.querySelector("#trackSelect");
        songNumber = trackSelect.selectedIndex;

        // setup linear gradient
        frequencyGradient = ctx.createLinearGradient(0, 480, 0, 100);
        frequencyGradient.addColorStop(0, "green");
        frequencyGradient.addColorStop(.65, "yellow");
        frequencyGradient.addColorStop(1, "red");

        // get sound track <select> and Full Screen button working
        setupUI();

        // set up filters
        setupFilters();

        // load and play default sound into audio element
        playStream(audioElement, SOUND_1);

        // start animation loop
        update();
    }


    function createWebAudioContextWithAnalyserNode(audioElement) {
        var audioCtx, analyserNode, sourceNode;
        // create new AudioContext
        // The || is because WebAudio has not been standardized across browsers yet
        // http://webaudio.github.io/web-audio-api/#the-audiocontext-interface
        audioCtx = new(window.AudioContext || window.webkitAudioContext);

        // create an analyser node
        analyserNode = audioCtx.createAnalyser();

        // create DelayNode instance
        delayNode = audioCtx.createDelay();
        delayNode.delayTime.value = delayAmount;

        /*
        We will request NUM_SAMPLES number of samples or "bins" spaced equally 
        across the sound spectrum.
			
        If NUM_SAMPLES (fftSize) is 256, then the first bin is 0 Hz, the second is 172 Hz, 
        the third is 344Hz. Each bin contains a number between 0-255 representing 
        the amplitude of that frequency.
        */

        // fft stands for Fast Fourier Transform
        analyserNode.fftSize = NUM_SAMPLES;

        // this is where we hook up the <audio> element to the analyserNode
        sourceNode = audioCtx.createMediaElementSource(audioElement);

        /*
        sourceNode.connect(analyserNode);

        // here we connect to the destination i.e. speakers
        analyserNode.connect(audioCtx.destination);
        */

        // connect source node directly to speakers sowe can hear the unaltered source in this channel

        sourceNode.connect(audioCtx.destination);

        // this channel will play and visualize the delay

        sourceNode.connect(delayNode);
        delayNode.connect(analyserNode);
        analyserNode.connect(audioCtx.destination);


        return analyserNode;
    }

    function setupUI() {
        document.querySelector("#trackSelect").onchange = function (e) {
            playStream(audioElement, e.target.value);
        };
    }

    function playStream(audioElement, path) {
        audioElement.src = path;
        audioElement.play();
        audioElement.volume = 0.2;
        songNumber = trackSelect.selectedIndex;
        document.querySelector('#status').innerHTML = "Now Playing: " + trackSelect.options[songNumber].innerHTML + bandNames[songNumber];
    }

    function update() {
        // this schedules a call to the update() method in 1/60 seconds
        requestAnimationFrame(update);

        /*
        	Nyquist Theorem
        	http://whatis.techtarget.com/definition/Nyquist-Theorem
        	The array of data we get back is 1/2 the size of the sample rate 
        */

        // create a new array of 8-bit integers (0-255)
        var data = new Uint8Array(NUM_SAMPLES / 2);

        if(document.querySelector("#visualSelect").value == "wave") {
            waveform = true;
        }
        else {
            waveform = false;
        }
        

        if(waveform){
            analyserNode.getByteTimeDomainData(data); // waveform data
        }
        else{
            // populate the array with the frequency data
        // notice these arrays can be passed "by reference" 
            analyserNode.getByteFrequencyData(data);
        }
        
        // Change Delay Mode Amount
        delayAmount = document.querySelector("#delaySlider").value;
        delayNode.delayTime.value = delayAmount;
        
        tintColor = document.querySelector("#tintSelect").value;

        // DRAW!
        ctx.clearRect(0, 0, 800, 600);
        var barWidth = 13;
        var barSpacing = 1;
        var barHeight = 100;
        var topSpacing = 120;
        var barLoop = 0;

        // loop through the data and draw!
        for (var i = 0; i < data.length; i += 2) {
             //'rgba(0,255,0,0.6)';

            if (waveform) {

                ctx.strokeStyle = "rgba(0,255,0,.2)";
                ctx.lineWidth = 10;
                ctx.beginPath();
                ctx.moveTo(0, canvas.height / 2);
                ctx.quadraticCurveTo(canvas.width / 2, canvas.height / 2 + (data[i] * 2), canvas.width, canvas.height / 2);
                ctx.stroke();


                ctx.strokeStyle = "rgba(0,255,0,.2)";
                ctx.lineWidth = 10;
                ctx.beginPath();
                ctx.moveTo(0, canvas.height / 2);
                ctx.quadraticCurveTo(canvas.width / 2, canvas.height / 2 - (data[i] * 2), canvas.width, canvas.height / 2);
                ctx.stroke();
            }
            else{
                ctx.fillStyle = frequencyGradient;
                
                ctx.fillRect(barLoop * (barWidth + barSpacing), topSpacing + 256 - data[i], barWidth, 480 - topSpacing / 2 + 256 - data[i]);
            }




            // red-ish circles
            var percent = data[i] / 255;
            maxRadius = document.querySelector("#circleMaxRadius").value;
            var circleRadius = percent * maxRadius;
            ctx.beginPath();
            ctx.fillStyle = makeColor(117, 255, 248, .34 - percent / 3.0);
            ctx.arc(canvas.width / 2, canvas.height / 2, circleRadius, 0, 2 * Math.PI, false);
            ctx.fill();
            ctx.closePath();

            // blue-ish circles, bigger, more transparent

            ctx.beginPath();
            ctx.fillStyle = makeColor(67, 255, 0, .10 - percent / 10.0);
            ctx.arc(canvas.width / 2, canvas.height / 2, circleRadius * 1.5, 0, 2 * Math.PI, false);
            ctx.fill();
            ctx.closePath();

            // yellow-ish circles, smaller

            ctx.beginPath();
            ctx.fillStyle = makeColor(255, 0, 238, .5 - percent / 5.0);
            ctx.arc(canvas.width / 2, canvas.height / 2, circleRadius * .5, 0, 2 * Math.PI, false);
            ctx.fill();
            ctx.closePath();

            barLoop++;
        }

        manipulatePixels();


    }

    // HELPER
    function makeColor(red, green, blue, alpha) {
        var color = 'rgba(' + red + ',' + green + ',' + blue + ', ' + alpha + ')';
        return color;
    }

    // FULL SCREEN MODE
    function requestFullscreen(element) {
        if (element.requestFullscreen) {
            element.requestFullscreen();
        } else if (element.mozRequestFullscreen) {
            element.mozRequestFullscreen();
        } else if (element.mozRequestFullScreen) { // camel-cased 'S' was changed to 's' in spec
            element.mozRequestFullScreen();
        } else if (element.webkitRequestFullscreen) {
            element.webkitRequestFullscreen();
        }
        // .. and do nothing if the method is not supported
    };

    function manipulatePixels() {
        // i) Get all of the rgba pixel data of the canvas by grabbing the 
        // ImageData Object
        // https://developer.mozilla.org/en-US/docs/Web/API/ImageData
        var imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        // ii) imageData.data is an 8-bit typed array - values range from 0-255
        // imageData.data contains 4 values per pixel: 4 x canvas.width x
        // canvas.height = 1024000 values!
        // we're looping through this 60 FPS - wow!
        var data = imageData.data;
        var length = data.length;
        var width = imageData.width

        // iii) Iterate through each pixel
        // we step by 4 so that we can manipulate 1 pixel per iteration
        // data[i] is the red value
        // data[i+1] is the green value
        // data[i+2] is the blue value
        // data[i+3] is the alpha value

        for (var i = 0; i < length; i += 4) {
            // iv) increase red value only
            if (tint) {
                // just the red channel this time
                if(tintColor == "red"){
                    data[i] = data[i] + 100;
                }
                else if(tintColor == "green") {
                    data[i + 1] = data[i + 1] + 100;
                }
                else if(tintColor == "blue") {
                    data[i + 2] = data[i + 2] + 100;
                }
                
            }

            // v) invert every color channel
            if (invert) {
                var red = data[i];
                var green = data[i + 1];
                var blue = data[i + 2];

                data[i] = 255 - red; // set red value
                data[i + 1] = 255 - green; // set blue value
                data[i + 2] = 255 - blue; // set green value
                // data[i+3] is the alpha but we're leaving that alone
            }

            // vi) noise
            if (noise && Math.random() < .10) {
                data[i] = data[i + 1] = data[i + 2] = 128; // gray noise

                // data[i] = data[i+1] = data[i+2] = 255;   // or white noise
                // data[i] = data[i+1] = data[i+2] = 0;     // or black noise

                data[i + 3] = 255; // alpha
            }

            if (lines) {
                var row = Math.floor(i / 4 / width);
                if (row % 50 == 0) {
                    // this row
                    data[i] = data[i + 1] = data[i + 2] = data[i + 3] = 255;

                    data[i + (width * 4)] =
                        data[i + (width * 4) + 1] =
                        data[i + (width * 4) + 2] =
                        data[i + (width * 4) + 3] = 255;
                }
            }

            if (brightness) {
                var darkness = 100 - document.querySelector("#brightness").value;

                var red = data[i];
                var green = data[i + 1];
                var blue = data[i + 2];

                data[i] = red - darkness; // set red value
                data[i + 1] = green - darkness; // set blue value
                data[i + 2] = blue - darkness; // set green value
                // data[i+3] is the alpha but we're leaving that alone
            }
        }
        // put the modified data back on the canvas
        ctx.putImageData(imageData, 0, 0);
    }

    function setupFilters() {
        document.querySelector("#noise").onchange = function (e) {
            console.log("checked=" + e.target.checked);
            noise = e.target.checked;
        }

        document.querySelector("#lines").onchange = function (e) {
            console.log("checked=" + e.target.checked);
            lines = e.target.checked;
        }

        document.querySelector("#invert").onchange = function (e) {
            console.log("checked=" + e.target.checked);
            invert = e.target.checked;
        }

        document.querySelector("#tintCheck").onchange = function (e) {
            console.log("checked=" + e.target.checked);
            tint = e.target.checked;
        }
    }


    window.addEventListener("load", init);
}());
