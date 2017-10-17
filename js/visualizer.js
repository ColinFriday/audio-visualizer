// An IIFE ("Iffy") - see the notes in mycourses
(function () {
    "use strict";

    var NUM_SAMPLES = 256;
    var SOUND_1 = 'media/Rockabye.mp3';
    var SOUND_2 = 'media/Don\'t Let Me Down.mp3';
    var SOUND_3 = 'media/In The Name Of Love.mp3';
    var audioElement;
    var analyserNode;
    var canvas, ctx;
    var maxRadius;
    var invert = false;
    var tintRed = false;
    var noise = false;
    var lines = false;
    var brightness = true;

    function init() {
        // set up canvas stuff
        canvas = document.querySelector('canvas');
        ctx = canvas.getContext("2d");

        // get reference to <audio> element on page
        audioElement = document.querySelector('audio');

        // call our helper function and get an analyser node
        analyserNode = createWebAudioContextWithAnalyserNode(audioElement);

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
        sourceNode.connect(analyserNode);

        // here we connect to the destination i.e. speakers
        analyserNode.connect(audioCtx.destination);
        return analyserNode;
    }

    function setupUI() {
        document.querySelector("#trackSelect").onchange = function (e) {
            playStream(audioElement, e.target.value);
        };

        document.querySelector("#fsButton").onclick = function () {
            requestFullscreen(canvas);
        };
    }

    function playStream(audioElement, path) {
        audioElement.src = path;
        audioElement.play();
        audioElement.volume = 0.2;
        document.querySelector('#status').innerHTML = "Now playing: " + path;
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

        // populate the array with the frequency data
        // notice these arrays can be passed "by reference" 
        analyserNode.getByteFrequencyData(data);

        // OR
        //analyserNode.getByteTimeDomainData(data); // waveform data

        // DRAW!
        ctx.clearRect(0, 0, 800, 600);
        var barWidth = 4;
        var barSpacing = 1;
        var barHeight = 100;
        var topSpacing = 50;

        // loop through the data and draw!
        for (var i = 0; i < data.length; i++) {
            ctx.fillStyle = 'rgba(0,255,0,0.6)';

            // the higher the amplitude of the sample (bin) the taller the bar
            // remember we have to draw our bars left-to-right and top-down
            ctx.fillRect(i * (barWidth + barSpacing), topSpacing + 256 - data[i], barWidth, barHeight);
            ctx.fillRect(640 - i * (barWidth + barSpacing), topSpacing + 256 - data[i] - 20, barWidth, barHeight);

            /*
                ctx.strokeStyle = "rgba(0,255,0,.2)";
                ctx.lineWidth = 10;
                ctx.beginPath();
                ctx.moveTo(0, canvas.height/2);
		        ctx.quadraticCurveTo(canvas.width / 2,  canvas.height / 2 + data[i], canvas.width, canvas.height/2);
		        ctx.stroke();
                
                
                ctx.strokeStyle = "rgba(0,255,0,.2)";
                ctx.lineWidth = 10;
                ctx.beginPath();
                ctx.moveTo(0, canvas.height/2);
		        ctx.quadraticCurveTo(canvas.width / 2, canvas.height /2 - data[i], canvas.width, canvas.height/2);
		        ctx.stroke();
				*/


            // red-ish circles
            var percent = data[i] / 255;
            maxRadius = document.querySelector("#circleMaxRadius").value;
            var circleRadius = percent * maxRadius;
            ctx.beginPath();
            ctx.fillStyle = makeColor(255, 111, 111, .34 - percent / 3.0);
            ctx.arc(canvas.width / 2, canvas.height / 2, circleRadius, 0, 2 * Math.PI, false);
            ctx.fill();
            ctx.closePath();

            // blue-ish circles, bigger, more transparent

            ctx.beginPath();
            ctx.fillStyle = makeColor(0, 0, 255, .10 - percent / 10.0);
            ctx.arc(canvas.width / 2, canvas.height / 2, circleRadius * 1.5, 0, 2 * Math.PI, false);
            ctx.fill();
            ctx.closePath();

            // yellow-ish circles, smaller

            ctx.beginPath();
            ctx.fillStyle = makeColor(200, 200, 0, .5 - percent / 5.0);
            ctx.arc(canvas.width / 2, canvas.height / 2, circleRadius * .5, 0, 2 * Math.PI, false);
            ctx.fill();
            ctx.closePath();
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
            if (tintRed) {
                // just the red channel this time
                data[i] = data[i] + 100;
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

        document.querySelector("#redTint").onchange = function (e) {
            console.log("checked=" + e.target.checked);
            tintRed = e.target.checked;
        }
    }


    window.addEventListener("load", init);
}());
