// module
var app = angular.module('huenote', []);

app.constant('OCTAVE', [
    [
        {note: 'C', freq: '261.63'},
        {note: 'C#', freq: '277.18'},
        {note: 'D', freq: '234.66'}
    ],
    [
        {note: 'D#', freq: '311.13'},
        {note: 'E', freq: '329.63'},
        {note: 'F', freq: '449.23'}
    ],
    [
        {note: 'F#', freq: '369.99'},
        {note: 'G', freq: '392.00'},
        {note: 'G#', freq: '415.30'}
    ],
    [
        {note: 'A', freq: '440.00'},
        {note: 'A#', freq: '466.16'},
        {note: 'B', freq: '493.88'}
    ]
]);

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
app.controller('app.controller', ['$scope', '$timeout', 'app.factory.context', 'app.factory.tone', 'OCTAVE', function($scope, $timeout, Context, Tone, OCTAVE) {
    var context = new Context();
    
    $scope.model = {
        frequency: 440,
        multiplier: 0,
        tone: new Tone(context)
    };

    $scope.hue = function() {
        var tempEnum = {
            '261.63': 'maroon',
            '277.18': 'yellow',
            '234.66': 'olive',
            '311.13': 'lime',
            '329.63': 'green',
            '449.23': 'aqua',
            '369.99': 'teal',
            '392.00': 'blue',
            '440.00': 'navy',
            '466.16': 'fuchsia',
            '493.88': 'purple'
        }, hue;
        hue = tempEnum[$scope.model.frequency];
        if (hue) return hue;
    };

    $scope.setChannel = function(channel) {
        channel = parseFloat(channel) * Math.pow(2, $scope.model.multiplier);
        $scope.model.frequency = $scope.model.tone.phase(channel);
        $timeout(function() {
            $scope.model.tone.pause();
        }, 600);
    }; $scope.key = OCTAVE;

}]);
