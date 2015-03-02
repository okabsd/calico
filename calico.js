// Calico.js
// Mumble Bot built ontop of piepan
// Colin 'Oka' Hall-Coates, 2015 MIT


;(function () {
  
  // Array empty method
  Array.prototype.empty = function () {
    while (this.length > 0) {
      this.pop();
    }
  };
  
  // AudioClip Constructor
  function AudioClip(directory, filename, extension) {
    this.dir = directory;
    this.file = filename;
    this.ext = extension || 'mp3';
  }
  
  // Main Constructor
  function Calico() {
    piepan.Audio.SetVolume(0.5);
  }
  
  // Audio Directory
  Calico.prototype.audioDir = 'audio';
  // Subsubdirs
  var subdirs = ['cena', 'frank', 'misc'];
  
  Calico.prototype.queue = [];
  
  // Audio Output
  Calico.prototype.clips = {
    // Cena
    'slam': new AudioClip(subdirs[0], 'slam'),
    'name': new AudioClip(subdirs[0], 'name'),
    'love': new AudioClip(subdirs[0], 'love'),
    'theme': new AudioClip(subdirs[0], 'theme'),
    'ready?': new AudioClip(subdirs[0], 'ready'),
    'champ?': new AudioClip(subdirs[0], 'whoischamp'),
    'collect': new AudioClip(subdirs[0], 'collect'),
    'watching': new AudioClip(subdirs[0], 'watching'),
    'excuse me': new AudioClip(subdirs[0], 'excuseme'),
    'undertaker': new AudioClip(subdirs[0], 'undertaker'),
    'this house': new AudioClip(subdirs[0], 'notinthishouse'),
    'theme song': new AudioClip(subdirs[0], 'timeisnow'),
    
    // Frank
    'ftp': new AudioClip(subdirs[1], 'ftp'),
    'nyes': new AudioClip(subdirs[1], 'nyes'),
    'books': new AudioClip(subdirs[1], 'books'),
    'oh wow': new AudioClip(subdirs[1], 'ohwow'),
    'nanda?': new AudioClip(subdirs[1], 'nanda'),
    'wahaha': new AudioClip(subdirs[1], 'wahaha'),
    'chin chin': new AudioClip(subdirs[1], 'chinchin'),
    
    // Misc
    'hate': new AudioClip(subdirs[2], 'getin'),
    'sawft': new AudioClip(subdirs[2], 'sawft'),
    'hello': new AudioClip(subdirs[2], 'hello'),
    'strong': new AudioClip(subdirs[2], 'strong'),
    'what up': new AudioClip(subdirs[2], 'whatup'),
    'my life': new AudioClip(subdirs[2], 'mylife'),
    'awesome': new AudioClip(subdirs[2], 'awesome'),
    'dunked on': new AudioClip(subdirs[2], 'dunkedon'),
    'weak stuff': new AudioClip(subdirs[2], 'weakstuff'),
    'aint got five': new AudioClip(subdirs[2], 'aintgotfive')
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
    'empty queue': function (self, event, args) {
      var numClips = self.queue.length,
            clipString = 'clips';
            
      if (numClips > 0) {
        self.queue.empty();
        
        if (numClips === 1) {
          clipString = 'clip';
        }
        
        piepan.Self.Channel.Send('Cleared ' + numClips + ' ' + clipString + ' from the queue.', false);
      }
    },
    
    // Advanced Chat 
    'help': function (self, event, args) {
      piepan.Self.Channel.Send('<b>do [COMMAND]</b> - Call literal commands. e.g., <i>do show +play</i>', false);
      piepan.Self.Channel.Send('<b>say [COMMAND]</b> - Print associated text. e.g., <i>say cena</i>', false);
      piepan.Self.Channel.Send('<b>play [COMMAND]</b> - Play associated audio clip. e.g., <i>play slam</i>', false);
    },
    'show': function (self, event, args) {
      var query = self.methodToHash[args[0]];
      
      if (typeof self[query]  === 'object') {
        var response = 'Commands in [' + args[0].toUpperCase() + ']: ';
        
        for (var prop in self[query]) {
          response += '[' + prop + '] ';
        }
        
        piepan.Self.Channel.Send(response, false);
      }
    },
    'list queue': function (self, event, args) {
      var output = 'Clips in queue: ';
      if (self.queue.length > 0) {
        self.queue.forEach(function (clip) {
          output += '[' + clip + '] ';
        });
        
        piepan.Self.Channel.Send(output, false);
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
      var room = args[0] || '27';
      
      if (piepan.Channels[room]) {
        piepan.Self.Move(piepan.Channels[room]);
      }
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
    piepan.Self.SetComment('I am a Calico Bot. Type <b>help</b> for a list of basic commands, and <b>do show +[COMMAND]</b> for advanced commands.');
    piepan.Self.Move(piepan.Channels['3']);
  };
  
  Calico.prototype.roomSwitch = function (event) {
    
  };
  
  Calico.prototype.talkBack = function (request) {
    if (!this.responses[request]) {
      return;
    }
    
    var response = this.responses[request];
    
    piepan.Self.Channel.Send(response, false);
  };
  
  // Play next in queue if it exists
  Calico.prototype.playNext = function () {
    var next;
    
    if (this.queue.length > 0) {
      next = this.queue.shift();
      this.playAudio(next);
    }
  };
  
  Calico.prototype.playAudio = function (clip) {
    // Ignore non-existant clips
    if (!this.clips[clip]) {
      return;
    }
    
    // Push clips onto the queue
    if (piepan.Audio.IsPlaying()) {
      if (this.queue.length < 10) {
        this.queue.push(clip);
      }
      return;
    }
    
    var dir = this.clips[clip].dir,
        file = this.clips[clip].file,
        ext = this.clips[clip].ext,
        path = this.audioDir + '/' + dir + '/' + file + '.' + ext,
        that = this;
        
    piepan.Audio.Play({
      filename: path,
      callback: function () {
        that.playNext();
      }
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
        message = message.replace(/\s+/g, ' ');
    
    var cmds = message.split(';'),
        that = this;
    
    cmds.forEach(function (cmd) {
      cmd = cmd.trim();
      
      // Three main commands
      if (cmd.substring(0, 2) === 'do') {
        that.issueCommand(event, cmd.slice(3));
      }
      
      if (cmd.substring(0, 4) === 'play') {
        that.playAudio(cmd.slice(5));
      }
      
      if (cmd.substring(0, 3) === 'say') {
        that.talkBack(cmd.slice(4));
      }
      
      // Help exception
      if (cmd === 'help' ||
          cmd === '?') {
        that.commands.help();
      }
    });
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