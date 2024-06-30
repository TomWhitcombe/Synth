document.addEventListener("DOMContentLoaded", function() {
    const AttackSlider = document.getElementById('AttackSlider');
    const DecaySlider = document.getElementById('DecaySlider');
    const SustainSlider = document.getElementById('SustainSlider');
    const ReleaseSlider = document.getElementById('ReleaseSlider');

    const WidthSlider = document.getElementById('VoiceWidth');

    function get(ID)
    {
        return document.getElementById(ID);
    }

    
    class Envelope
    {
        constructor(ctx, attack, decay, sustain, release)
        {
            this.attack = attack;
            this.decay = decay;
            this.sustain = sustain;
            this.release = release;
            this.brain = ctx.createGain();
            this.context = ctx;

            this.brain.gain.value = 0;
        }

        onNoteStart()
        {
            const timeNow = this.context.currentTime;
            this.brain.gain.cancelScheduledValues(timeNow);

            this.brain.gain.setValueAtTime(0, timeNow);
            const attackTime = timeNow + Number(this.attack.value);
            this.brain.gain.linearRampToValueAtTime(1, attackTime);
            const sustainValue = Number(this.sustain.value);
            this.brain.gain.setTargetAtTime(sustainValue, attackTime, Number(this.decay.value));
        }

        onNoteEnd()
        {
            const timeNow = this.context.currentTime;
            this.brain.gain.cancelScheduledValues(timeNow);

            const releaseTime = timeNow + Number(this.release.value);
            this.brain.gain.setValueAtTime(this.brain.gain.value, timeNow);
            this.brain.gain.linearRampToValueAtTime(0, releaseTime);

        }

        get connection()
        {
            return this.brain;
        }
    }

    class Source
    {
        constructor(ctx, frequency, type)
        {
            this.sources = [];
            this.gain = ctx.createGain();
            this.gain.gain.value = 0;
            this.numVoices = 3;
            for(var i=0; i < this.numVoices; i++)
            {
                const src = ctx.createOscillator();
                src.frequency.value = frequency;
                src.type = type;
                src.connect(this.gain);
                this.sources.push(src);
            }
        }

        get connection()
        {
            return this.gain;
        }

        adjustWidth(width)
        {
            this.sources[0].detune.value = -width;
            this.sources[2].detune.value = width;
        }

        adjustGain(value)
        {
            this.gain.gain.value = value;
        }

        start()
        {
            for(var i=0; i < this.numVoices; i++)
            {
                this.sources[i].start();
                console.log('Starting oscillator', i);
            }
        }

        stop()
        {
            for(var i=0; i < this.numVoices; i++)
            {
                this.sources[i].stop();
            }
        }
    }

    class SourceButton
    {
        constructor(params, frequency, type, buttonUI)
        {
            this.source = new Source(params.context, frequency, type, buttonUI);
            this.envelope = new Envelope(params.context, params.attack, params.decay, params.sustain, params.release);

            this.source.connection.connect(this.envelope.connection);
            this.pressed = false;
            this.sourceStarted = false;

            buttonUI.onmousedown = this.mouseDown.bind(this);
            buttonUI.onmouseup = this.mouseFinish.bind(this)
            buttonUI.onmouseleave = this.mouseFinish.bind(this)

            this.withChangeBinding = this.onWidthChanged.bind(this); 
            if(params.width)
            {
                params.width.addEventListener('input', this.withChangeBinding);
            }
        }
        

        mouseDown()
        {
            if(!this.pressed)
            {
                if(!this.sourceStarted)
                {
                    this.source.start();
                    this.sourceStarted = true;
                    this.source.adjustGain(1);
                }
                
                this.envelope.onNoteStart();
                this.pressed =true;
                console.log('pressed ', this);
            }
        };

        mouseFinish()
        {
            if(this.pressed)
            {
                this.pressed = false;
                this.envelope.onNoteEnd();
            }
        }

        onWidthChanged(value)
        {
            this.source.adjustWidth(Number(value.target.value));
        }

        get connection()
        {
            return this.envelope.connection;
        }
    }


    let audioContext = new (window.AudioContext || window.webkitAudioContext)(); 
    
    const LPFSlider = get('LowPassFreq');
    const LPQSlider = get('LowPassQ');

    const lowPass = audioContext.createBiquadFilter();
    lowPass.type = 'lowpass';
    lowPass.frequency.value = LPFSlider.value;
    lowPass.Q.value = LPQSlider.value;

    LPFSlider.addEventListener('input', () => {
        lowPass.frequency.value = LPFSlider.value;
    });

    LPQSlider.addEventListener('input', () => {
        lowPass.Q.value = LPQSlider.value;
    });

    let sharedButtonParams = 
    {
        context: audioContext,
        attack: AttackSlider,
        decay: DecaySlider,
        sustain: SustainSlider,
        release: ReleaseSlider,
        width: WidthSlider
    }

    const A = new SourceButton(sharedButtonParams, 440, 'sawtooth', get('Play A'));
    const D = new SourceButton(sharedButtonParams,  523.25, 'sawtooth', get('Play D'));
    A.connection.connect(lowPass);
    D.connection.connect(lowPass);

    lowPass.connect(audioContext.destination);
});