// module
var app = angular.module('huenote', []);

app.constant('OCTAVE', (function() {
    var a = Math.pow(2, 1/12);
    return _.map([
        {note: 'C', step:-9, color: 'red'},
        {note: 'C#', step:-8, color: 'maroon'},
        {note: 'D', step:-7, color: 'yellow'},
        {note: 'D#', step:-6, color: 'olive'},
        {note: 'E', step:-5, color: 'lime'},
        {note: 'F', step:-4, color: 'green'},
        {note: 'F#', step:-3, color: 'aqua'},
        {note: 'G', step:-2, color: 'teal'},
        {note: 'G#', step:-1, color: 'blue'},
        {note: 'A', step:0, color: 'navy'},
        {note: 'A#', step:1, color: 'fuchsia'},
        {note: 'B', step:2, color: 'purple'}
    ], function(note) {
        return _.extend(note, {
            freq: 440 * Math.pow(a, note.step)
        });
    });
})());

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

        this.phase = _.bind(function(frequency) {
            this.pause();
            this.waveform = new Waveform(this.context, frequency);
            this.play();
            return frequency;
        }, this);
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
        tone: new Tone(context),
        get hue() { return (sample($scope.model.frequency) || {}).color;},
        get sat() { return (5 - parseInt($scope.model.multiplier)) / 10}
    };

    $scope.setChannel = function(channel) {
        channel = parseFloat(channel) * Math.pow(2, $scope.model.multiplier);
        $scope.model.frequency = $scope.model.tone.phase(channel);
        $timeout(function() {
            $scope.model.tone.pause();
        }, 600);
    }; $scope.key = [[OCTAVE[0], OCTAVE[1], OCTAVE[2]], [OCTAVE[3], OCTAVE[4], OCTAVE[5]], [OCTAVE[6], OCTAVE[7], OCTAVE[8]], [OCTAVE[9], OCTAVE[10], OCTAVE[11]]];

    $scope.playTest = function(type) {
        var score = [];
        switch (type) {
            case 'octaves':
                score = ['C:-4', 'C:-3', 'C:-2', 'C:-1', 'C:0', 'C:1', 'C:2', 'C:3', 'C:4'];
                break;
            case 'softkitty':
                score = ['D#', 'C', 'C#', 'A#:-1', 'G#:-1', 'C', 'D#', 'D#', 'D#', 'C', 'C#', 'A#:-1', 'G#:-1', 'A#:-1', 'G#:-1', 'G#:-1'];
                break;
            default:
                score = ['C', 'D#', 'F', 'F#', 'G', 'A#', 'B', 'C:1', 'B', 'A#', 'G', 'F#', 'F', 'D#', 'C'];
                break;
        }
        play(score);
    };

    function sample(freq) {
        var note = _.findWhere(OCTAVE, {freq:freq});
        if (_.isUndefined(note)) {
            note = _.find(OCTAVE, function(tone) {
                return !((freq > 440) ? (freq % tone.freq) % 1 : (tone.freq / freq) % 1);
            });
        }
        return note;
    }

    function play(tones) {
        playTone(_.first(tones));
        $timeout(function() {
            var rest = _.rest(tones);
            if (rest.length) play(rest);
        }, 750);

        function playTone(tone) {
            tone = tone.split(':');
            var note = tone[0], key = parseInt(tone[1]) || 0,
                freq = freq = (_.findWhere(OCTAVE, {note:note}) || {}).freq || 440;

            if (_.isNumber(key)) $scope.model.multiplier = key;
            return $scope.setChannel(freq);
        }
    }

}]);
