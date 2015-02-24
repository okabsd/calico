;(function () {
  
  function Calico() {
    piepan.Audio.SetVolume(0.8);
  }

  Calico.prototype.audioPrefix = 'audio/';
  Calico.prototype.audioSuffix = '.mp3';

  // Audio Output
  Calico.prototype.clips = {
    'slam': 'slam',
    'name': 'name',
    'love': 'love',
    'theme': 'theme',
    'hello': 'hello',
    'ready?': 'ready',
    'champ?': 'whois',
    'collect': 'collect',
    'watching': 'watching',
    'excuse me': 'excuseme',
    'dunked on': 'dunkedon',
    'theme song': 'timeisnow',
    'undertaker': 'undertaker',
    'this house': 'notinthishouse'
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
    'stop': function (self, args) {
      piepan.Audio.Stop();
    },
    'leave now': function (self, args) {
      console.log('Calico was asked to leave.');
      piepan.Disconnect();
    },
    'help': function (self, args) {
      piepan.Self.Channel.Send('<b>do [COMMAND]</b> - Call literal commands. e.g., <i>do show +play</i>', false);
      piepan.Self.Channel.Send('<b>say [COMMAND]</b> - Print associated text. e.g., <i>say cena</i>', false);
      piepan.Self.Channel.Send('<b>play [COMMAND]</b> - Play associated audio clip. e.g., <i>play slam</i>', false);
    },
    'set volume': function (self, args) {
      var val = Math.max(0, Math.min(parseFloat(args[0], 10), 10)),
          response = 'Volume: ' + Math.floor(val * 100) + '%';
      
      piepan.Audio.SetVolume(val);
      piepan.Self.Channel.Send(response, false);
    },
    'show': function (self, args) {
      var query = self.methodToHash[args[0]],
          response = 'Commands in [' + query.toUpperCase() + ']: ';
      
      if (typeof self[query]  === 'object') {
        for (var prop in self[query]) {
          response += '[' + prop + '] ';
        }
        
        piepan.Self.Channel.Send(response, false);
      }
    }
  };
  
  Calico.prototype.methodToHash = {
    'play': 'clips',
    'say': 'responses',
    'do': 'commands'
  };
  
  Calico.prototype.connected = function (event) {
    console.log('Calico is purring.');
  };
  
  Calico.prototype.roomSwitch = function (event) {
    event.Channel.Send('Calico.js bot incoming! Type <b>help</b> for a list of basic commands, and <b>do show +[COMMAND]</b> for advanced commands.', false);
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
    
    var dir = this.audioPrefix,
        file = this.clips[clip],
        ext = this.audioSuffix;
    
    piepan.Audio.Play({
      filename: dir + file + ext
    });
  };
  
  Calico.prototype.issueCommand = function (command) {
    var args = command.split(' +');
        cmd = args.shift();
    if (this.commands[cmd]) {
      this.commands[cmd](this, args);
    }
  };

  Calico.prototype.delegateCommand = function(event) {
    if (event.Sender === null) {
      return;
    }

    var message = event.Message.toLowerCase();
    message = message.trim();
    message = message.replace(/\s+/g, ' ');
    
    
    // Three main commands
    if (message.substring(0, 2) === 'do') {
      this.issueCommand(message.slice(3));
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