define([], function() {
  
  var pluginConf = {
      name: "Kar+",
      osc: false,
      audioOut: 1,
      audioIn: 1,
      version: '0.0.1-alpha1',
      hostParameters : {
            enabled: true,
            parameters: {
                freq: {
                    name: ['Freq'],
                    label: 'Hz',
                    range: {
                        min: 120,
                        default: 440,
                        max: 14000
                    }
                },
                feedback: {
                    name: ['Fdb'],
                    label: 'x',
                    range: {
                        min: 0,
                        default: 0.02,
                        max: 1
                    }
                }
            }
        }
  };


    function SampleDelay(maxDelayInSamplesSize, delayInSamples) {
      this.delayBufferSamples = new Float32Array(maxDelayInSamplesSize); // The maximum size of delay
      this.delayInputPointer  = delayInSamples;
      this.delayOutputPointer = 0;
      this.delayInSamples     = delayInSamples;
    }

    SampleDelay.prototype.setDelayInSamples = function(delayInSamples) {
      
      this.delayInSamples = Math.round(delayInSamples);
      this.delayInputPointer = this.delayOutputPointer + delayInSamples;

      if (this.delayInputPointer >= this.delayBufferSamples.length-1) {
        this.delayInputPointer = this.delayInputPointer - this.delayBufferSamples.length; 
      }
    };

    SampleDelay.prototype.process = function(input, output) {

      for (var i=0; i<input.length; i++) {

        // Add audio data with the delay in the delay buffer
        this.delayBufferSamples[this.delayInputPointer] = input[i];
       
        // delayBufferSamples could contain initial NULL's, return silence in that case
        var delaySample = this.delayBufferSamples[this.delayOutputPointer];

        // Return the audio with delay mix
        output[i] = delaySample;

        // Manage circular delay buffer pointers
        this.delayInputPointer++;

        if (this.delayInputPointer >= this.delayBufferSamples.length-1) {
          this.delayInputPointer = 0;
        }
         
        this.delayOutputPointer++;

        if (this.delayOutputPointer >= this.delayBufferSamples.length-1) {
          this.delayOutputPointer = 0; 
        } 
      }
    };

    var initPlugin = function(args) {
        
      this.name = args.name;
      this.id = args.id;
      this.audioSource = args.audioSources[0];
      this.audioDestination = args.audioDestination[0];
      this.context = args.audioContext;
  		this.gainDNode = this.context.createGainNode();
      this.gainINode = this.context.createGainNode();
      this.lpFilter = context.createBiquadFilter();
      lowpassFilter.type = lowpassFilter.LOWPASS; // explicitly set type
      lowpassFilter.frequency.value = 20000;
      this.delayNode = createJavaScriptNode(1024, 1, 1);
      this.delayProcessor = new SampleDelay (1024, 512)

      this.delayProcessor.onaudioprocess = function (e) {

        var outBuffer = e.outputBuffer.getChannelData(0);
        var inBuffer = e.inputBuffer.getChannelData(0);
        this.delayNode (inBufferL, outBuffer);

      }.bind(this);

      this.audioSource.connect(this.gainINode);
      this.gainINode.connect(this.lpFilter);
      this.lpFilter.connect(this.delayNode);
      this.delayNode.connect(this.gainDNode);
      this.gainDNode.connect(this.gainINode);
      this.lpFilter.connect(this.audioDestination);

      /* Parameter callbacks */
      var onParmChange = function (id, value) {
        this.pluginState[id] = value;
        if (id === 'freq') {
          //this.gainDuplicatorNodes[0].gain.value = value;
          var N = this.context.sampleRate / value;
          this.delayProcessor.setDelayInSamples(N);
        }
        else if (id === 'feedback') {
          this.gainDNode.gain.value = value; 
        }
      }

      if (args.initialState && args.initialState.data) {
          /* Load data */
          this.pluginState = args.initialState.data;
      }
      else {
          /* Use default data */
          this.pluginState = {
              delay: pluginConf.hostParameters.parameters.delay.range.default,
              gain: pluginConf.hostParameters.parameters.gain.range.default
          };
      }

      for (param in this.pluginState) {
            if (this.pluginState.hasOwnProperty(param)) {
                args.hostInterface.setParm (param, this.pluginState[param]);
                onParmChange.apply (this, [param, this.pluginState[param]]);
            }
        }

      var saveState = function () {
          return { data: this.pluginState };
      };
      args.hostInterface.setSaveState (saveState);
      args.hostInterface.setHostCallback (onParmChange);

      // Initialization made it so far: plugin is ready.
      args.hostInterface.setInstanceStatus ('ready');
        
    };
    
    return {
        initPlugin: initPlugin,
        pluginConf: pluginConf
    };
});