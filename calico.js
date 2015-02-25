// Calico.js
// Mumble Bot built ontop of piepan
// Colin 'Oka' Hall-Coates, 2015 MIT


;(function () {
  
  // AudioClip Constructor
  function AudioClip(directory, filename, extension) {
    this.dir = directory;
    this.file = filename;
    this.ext = extension || 'mp3';
  }
  
  // Main Constructor
  function Calico() {
    piepan.Audio.SetVolume(0.8);
  }
  
  // Directory and format
  Calico.prototype.audioDir = 'audio';

  // Audio Output
  Calico.prototype.clips = {
    // Cena
    'slam': new AudioClip('cena', 'slam'),
    'name': new AudioClip('cena', 'name'),
    'love': new AudioClip('cena', 'love'),
    'theme': new AudioClip('cena', 'theme'),
    'ready?': new AudioClip('cena', 'ready'),
    'champ?': new AudioClip('cena', 'whoischamp'),
    'collect': new AudioClip('cena', 'collect'),
    'watching': new AudioClip('cena', 'watching'),
    'excuse me': new AudioClip('cena', 'excuseme'),
    'undertaker': new AudioClip('cena', 'undertaker'),
    'this house': new AudioClip('cena', 'notinthishouse'),
    'theme song': new AudioClip('cena', 'timeisnow'),
    
    // Frank
    
    // Misc
    'hello': new AudioClip('misc', 'hello'),
    'my life': new AudioClip('misc', 'mylife'),
    'dunked on': new AudioClip('misc', 'dunkedon'),
  };
  
  // Chat Output
  Calico.prototype.responses = {
    'info': 'I am a Mumbtrilo bot built by Oka.',
    'cena': "Who's champ?",
    'pranks': '<a href="https://www.youtube.com/watch?v=wRRsXxE1KVY">Prank Calls</a>',
    'theme': '<a href="https://www.youtube.com/watch?v=OaQ5jZANSe8">Theme Song</a>',
    'john cena': '<a href="http://www.reddit.com/r/potatosalad">John Cena</a>',
    'potato salad': '<a href="http://www.reddit.com/r/johncena">Potato Salad</a>'
  };
  
  // True Commands
  Calico.prototype.commands = {
    // Audio commands
    'stop': function (self, event, args) {
      piepan.Audio.Stop();
    },
    'set volume': function (self, event, args) {
      var val = Math.max(0, Math.min(parseFloat(args[0], 10), 1)),
          response = 'Volume: ' + Math.floor(val * 100) + '%';
      
      piepan.Audio.SetVolume(val);
      piepan.Self.Channel.Send(response, false);
    },
    
    // Excess Chat
    'help': function (self, event, args) {
      piepan.Self.Channel.Send('<b>do [COMMAND]</b> - Call literal commands. e.g., <i>do show +play</i>', false);
      piepan.Self.Channel.Send('<b>say [COMMAND]</b> - Print associated text. e.g., <i>say cena</i>', false);
      piepan.Self.Channel.Send('<b>play [COMMAND]</b> - Play associated audio clip. e.g., <i>play slam</i>', false);
    },
    'show': function (self, event, args) {
      var query = self.methodToHash[args[0]],
          response = 'Commands in [' + args[0].toUpperCase() + ']: ';
      
      if (typeof self[query]  === 'object') {
        for (var prop in self[query]) {
          response += '[' + prop + '] ';
        }
        
        piepan.Self.Channel.Send(response, false);
      }
    },
    'echo': function (self, event, args) {
      var message = args[0];
      
      if (message) {
        if (event.Sender === null) {
          piepan.Self.Channel.Send(message, false);
        } else {
          event.Sender.Send(message);
        }
      }
    },
    
    // Movement
    'move here': function (self, event, args) {
      piepan.Self.Move(event.Sender.Channel);
    },
    'get out': function (self, event, args) {
      piepan.Self.Move(piepan.Channels['27']);
    },
    'leave now': function (self, event, args) {
      console.log('Calico was asked to leave.');
      piepan.Disconnect();
    },
  };
  
  // Method and Command relation
  Calico.prototype.methodToHash = {
    'play': 'clips',
    'say': 'responses',
    'do': 'commands'
  };
  
  // Event Handlers
  Calico.prototype.connected = function (event) {
    console.log('Calico is purring.');
  };
  
  Calico.prototype.roomSwitch = function (event) {
    if (event.Channel.ID !== 27) {
      event.Channel.Send('Calico.js bot incoming! Type <b>help</b> for a list of basic commands, and <b>do show +[COMMAND]</b> for advanced commands.', false);
    }
  };
  
  Calico.prototype.talkBack = function (request) {
    if (!this.responses[request]) {
      return;
    }
    
    var response = this.responses[request];
    
    piepan.Self.Channel.Send(response, false);
  };
  
  Calico.prototype.playAudio = function (clip) {
    if (!this.clips[clip] || piepan.Audio.IsPlaying()) {
      return;
    }
    
    var dir = this.clips[clip].dir,
        file = this.clips[clip].file,
        ext = this.clips[clip].ext,
        path = this.audioDir + '/' + dir + '/' + file + '.' + ext;
        
    piepan.Audio.Play({
      filename: path
    });
  };
  
  Calico.prototype.issueCommand = function (event, command) {
    var args = command.split(' +');
        cmd = args.shift();
        
    if (this.commands[cmd]) {
      this.commands[cmd](this, event, args);
    }
  };

  Calico.prototype.delegateCommand = function(event) {
    if (event.Sender === null) {
      return;
    }

    var message = event.Message.toLowerCase();
    message = message.trim();
    message = message.replace(/\s+/g, ' '),
    resolved = false;
    
    
    // Three main commands
    if (message.substring(0, 2) === 'do') {
      this.issueCommand(event, message.slice(3));
    }
    
    if (message.substring(0, 4) === 'play') {
      this.playAudio(message.slice(5));
    }
    
    if (message.substring(0, 3) === 'say') {
      this.talkBack(message.slice(4));
    }
    
    // Help exception
    if (message === 'help' ||
        message === '?') {
      this.commands.help();
    }
  };

  // Main Object
  var cali = new Calico();
  
  // Events
  piepan.On('connect', function (event) {
    cali.connected(event);
  });
  
  piepan.On('message', function (event) {
    cali.delegateCommand(event);
  });
  
  piepan.On('channelChange', function (event) {
    cali.roomSwitch(event);
  });

}());