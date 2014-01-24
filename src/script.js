// module
var app = angular.module('huenote', []);

app.constant('TOUCH_TONES', [
    [
        {digit: '1', loFreq: 697, hiFreq: 1209},
        {digit: '2', loFreq: 697, hiFreq: 1336},
        {digit: '3', loFreq: 697, hiFreq: 1477}
    ],
    [
        {digit: '4', loFreq: 770, hiFreq: 1209},
        {digit: '5', loFreq: 770, hiFreq: 1336},
        {digit: '6', loFreq: 770, hiFreq: 1477}
    ],
    [
        {digit: '7', loFreq: 852, hiFreq: 1209},
        {digit: '8', loFreq: 852, hiFreq: 1336},
        {digit: '9', loFreq: 852, hiFreq: 1477}
    ],
    [
        {digit: '*', loFreq: 941, hiFreq: 1209},
        {digit: '0', loFreq: 941, hiFreq: 1336},
        {digit: '#', loFreq: 941, hiFreq: 1477}
    ]
]);

app.constant('TONE_HUE', {
    '697+1209': {r:0, g:0, b:128},
    '697+1336': {r:0, g:0, b:255},
    '697+1477': {r:75, g:0, b:130},
    '770+1209': {r:0, g:128, b:128},
    '770+1336': {r:0, g:255, b:255},
    '770+1477': {r:0, g:128, b:0},
    '852+1209': {r:0, g:255, b:0},
    '852+1336': {r:255, g:255, b:0},
    '852+1477': {r:255, g:165, b:0},
    '941+1209': {r:255, g:0, b:255},
    '941+1336': {r:255, g:0, b:0},
    '941+1477': {r:128, g:0, b:0}
});

// web audio context factory
app.factory('app.factory.context', function() {
    return constructor;

    /** Web Audio Constructor */
    function constructor() {
        try {
            window.AudioContext = window.AudioContext||window.webkitAudioContext;
            return new AudioContext();
        } catch(e) {
            throw new Error('Web Audio API is not supported in this browser.', e);
        }
    }
});

// web audio sine wave factory
app.factory('app.factory.waveform', function() {
    var constructor = function(context, frequency) {
        this.x = 0;
        this.context = context;
        this.sampleRate = this.context.sampleRate;
        this.frequency = frequency || 440;
        this.next_frequency = this.frequency;
        this.amplitude = 0.5;
        this.playing = false;
        this.nr = true; // noise reduction

        // Create an audio node for the tone generator
        this.node = context.createScriptProcessor(1024, 1);

        // Setup audio data callback for this node. The callback is called
        // when the node is connected and expects a buffer full of audio data
        // in return.
        var that = this;
        this.node.onaudioprocess = function(e) { that.process(e) };
    };

    constructor.prototype.setAmplitude = function(amplitude) {
        this.amplitude = amplitude;
    };

    // Enable/Disable Noise Reduction
    constructor.prototype.setNR = function(nr) {
      this.nr = nr;
    };

    constructor.prototype.setFrequency = function(freq) {
      this.next_frequency = freq;

      // Only change the frequency if not currently playing. This
      // is to minimize noise.
      if (!this.playing) this.frequency = freq;
    };

    constructor.prototype.process = function(e) {
      // Get a reference to the output buffer and fill it up.
      var right = e.outputBuffer.getChannelData(0),
          left = e.outputBuffer.getChannelData(1);

      // We need to be careful about filling up the entire buffer and not
      // overflowing.
      for (var i = 0; i < right.length; ++i) {
        right[i] = left[i] = this.amplitude * Math.sin(
            this.x++ / (this.sampleRate / (this.frequency * 2 * Math.PI)));

        // A vile low-pass-filter approximation begins here.
        //
        // This reduces high-frequency blips while switching frequencies. It works
        // by waiting for the sine wave to hit 0 (on it's way to positive territory)
        // before switching frequencies.
        if (this.next_frequency != this.frequency) {
          if (this.nr) {
            // Figure out what the next point is.
            next_data = this.amplitude * Math.sin(
              this.x / (this.sampleRate / (this.frequency * 2 * Math.PI)));

            // If the current point approximates 0, and the direction is positive,
            // switch frequencies.
            if (right[i] < 0.001 && right[i] > -0.001 && right[i] < next_data) {
              this.frequency = this.next_frequency;
              this.x = 0;
            }
          } else {
            this.frequency = this.next_frequency;
            this.x = 0;
          }
        }
      }
    };

    constructor.prototype.play = function() {
      // Plug the node into the output.
      this.node.connect(this.context.destination);
      this.playing = true;
      return this;
    };

    constructor.prototype.pause = function() {
      // Unplug the node.
      this.node.disconnect();
      this.playing = false;
      return this;
    };

    return constructor;
});

// web audio tone factory
app.factory('app.factory.tone', ['app.factory.waveform', function(Waveform) {
    var constructor = function(context) {
        this.context = context;
        this.waveform = new Waveform(this.context, 440);
        this.paused = true;

        this.phase = _.throttle(_.bind(function(frequency) {
            this.pause();
            this.waveform = new Waveform(this.context, frequency);
            this.play();
            return frequency;
        }, this), 1*1000);
    };

    constructor.prototype.play = function() {
        this.paused = false;
        this.waveform.play();
        return this;
    };

    constructor.prototype.pause = function() {
        this.paused = true;
        this.waveform.pause();  
        return this;
    };

    constructor.prototype.toggle = function() {
        return this[((this.paused) ? 'play' : 'pause')]();
    };

    return constructor;
}]);

// controller
app.controller('app.controller', ['$scope', '$timeout', 'app.factory.context', 'app.factory.tone', 'TOUCH_TONES', 'TONE_HUE', function($scope, $timeout, Context, Tone, TOUCH_TONES, TONE_HUE) {
    var context = new Context();
    
    $scope.model = {
        freqChannelOne: 697,
        freqChannelTwo: 1209,
        tones: [
            new Tone(context),
            new Tone(context)
        ]
    };

    $scope.hue = function() {
        var note = $scope.model.freqChannelOne + '+' + $scope.model.freqChannelTwo, hue = TONE_HUE[note];
        if (hue) return 'rgba(' + hue.r + ',' + hue.g + ',' + hue.b + ',0.5)';
    };

    $scope.$watch('model.freqChannelOne', transition);

    $scope.setChannels = function(channelOne, channelTwo) {
        $scope.model.freqChannelOne = $scope.model.tones[0].phase(channelOne);
        $scope.model.freqChannelTwo = $scope.model.tones[1].phase(channelTwo);
        $timeout(function() {
            $scope.model.tones.forEach(function(tone) {
                tone.pause();
            });
        }, 600);
    }; $scope.dialpad = TOUCH_TONES;

    var n = 5, // number of layers
        m = 10, // number of samples per layer
        stack = d3.layout.stack().offset("wiggle"),
        layers0 = stack(d3.range(n).map(function() { return bumpLayer(m); })),
        layers1 = stack(d3.range(n).map(function() { return bumpLayer(m); }));

    var width = window.innerWidth,
        height = window.innerHeight;

    var x = d3.scale.linear()
        .domain([0, m - 1])
        .range([0, width]);

    var y = d3.scale.linear()
        .domain([0, d3.max(layers0.concat(layers1), function(layer) { return d3.max(layer, function(d) { return d.y0 + d.y; }); })])
        .range([height, 0]);

    var color = d3.scale.linear()
        .range(["#aad", "#556"]);

    var area = d3.svg.area()
        .x(function(d) { return x(d.x); })
        .y0(function(d) { return y(d.y0); })
        .y1(function(d) { return y(d.y0 + d.y); });

    var svg = d3.select("body").append("svg")
        .attr("style", "display:block;position:absolute;top:0;left:0;z-index:-1;")
        .attr("width", width)
        .attr("height", height);

    svg.selectAll("path")
        .data(layers0)
      .enter().append("path")
        .attr("d", area)
        .style("fill", function() { return color(Math.random()); });

    function transition() {
      d3.selectAll("path")
          .data(function() {
            layers1 = stack(d3.range(n).map(function() { return bumpLayer(m); }));
            return layers0 = stack(d3.range(n).map(function() { return bumpLayer(m); }));
          })
        .transition()
          .duration(250)
          .attr("d", area);
    }

    // Inspired by Lee Byron's test data generator.
    function bumpLayer(n) {

      function bump(a) {
        var x = 1 / (.1 + Math.random()),
            y = 2 * Math.random() - .5,
            z = 10 / (.1 + Math.random());
        for (var i = 0; i < n; i++) {
          var w = (i / n - y) * z;
          a[i] += x * Math.exp(-w * w);
        }
      }

      var a = [], i;
      for (i = 0; i < n; ++i) a[i] = 0;
      for (i = 0; i < 5; ++i) bump(a);
      return a.map(function(d, i) { return {x: i, y: Math.max(0, d)}; });
    }
}]);
