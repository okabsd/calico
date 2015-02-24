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
    'ready?': 'ready',
    'champ?': 'whois',
    'collect': 'collect',
    'watching': 'watching',
    'excude me': 'excuseme',
    'theme song': 'timeisnow',
    'undertaker': 'undertaker',
    'this house': 'notinthishouse'
  };
  
  // Chat Output
  Calico.prototype.responses = {
    'info': 'I am a Mumbtrilo bot.',
    'cena': "Who's champ?",
    'pranks': '<a href="https://www.youtube.com/watch?v=wRRsXxE1KVY">Prank Calls</a>',
    'theme': '<a href="https://www.youtube.com/watch?v=OaQ5jZANSe8">Theme Song</a>',
    'john cena': '<a href="http://www.reddit.com/r/potatosalad">Potato Salad</a>',
    'potato salad': '<a href="http://www.reddit.com/r/johncena">John Cena</a>'
  };
  
  // True Commands
  Calico.prototype.commands = {
    'stop': function (self) {
      piepan.Audio.Stop();
    },
    'leave now': function (self) {
      console.log('Calico was asked to leave.');
      piepan.Disconnect();
    },
    'help': function (self) {
      piepan.Self.Channel.Send('<b>do [COMMAND]</b> - Call literal commands. e.g., <i>do show +play</i>', false);
      piepan.Self.Channel.Send('<b>say [COMMAND]</b> - Print associated text. e.g., <i>say cena</i>', false);
      piepan.Self.Channel.Send('<b>play [COMMAND]</b> - Play associated audio clip. e.g., <i>play slam</i>', false);
    },
    'set volume': function (self, lvl) {
      var val = parseFloat(lvl, 10);
      val = Math.max(0, Math.min(val, 10));
      
      piepan.Audio.SetVolume(val);
      
      var response = 'Volume is now at ' + Math.floor(val * 100) + '%.';
      piepan.Self.Channel.Send(response, false);
    },
    'show': function (self, command) {
      var query = self.methodToHash[command];
      
      var response = 'Commands in [' + query + ']: ';
      
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
    event.Channel.Send('Calico.js bot incoming! Type help for a list of basic commands, and do show +[COMMAND] for advanced commands.', false);
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
    var parts = command.split(' +');
    if (this.commands[parts[0]]) {
      this.commands[parts[0]](this, parts[1]);
    }
  };

  Calico.prototype.delegateCommand = function(event) {
    if (event.Sender === null) {
      return;
    }

    var message = event.Message.toLowerCase();
    message = message.trim();
    message = message.replace(/\s/g, ' ');
    
    
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
    if (message === 'help') {
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