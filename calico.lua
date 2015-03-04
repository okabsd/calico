-- Calico.lua
-- Experimental Lua & LuaSQL version

---- Global Goodies

require 'bin/conf'
driver = require 'luasql.mysql'
db = driver.mysql ()
con = assert ( db:connect(DB_NAME, DB_USER, DB_PASS) )

---- Helper Functions

-- Removes whitespace on the edges of a string
function trim (s)
  return s:match ('^%s*(.-)%s*$')
end

-- Compacts multiple whitespace characters
function compact (s)
  return s:gsub ('%s+', ' ')
end

-- Splits a string into an array-like table on a delimiter
function split (s, d)
  local t = {}
  d = d or '%s'
  
  for str in s:gmatch ("([^"..d.."]+)") do
      t[#t+1] = str
  end
  
  return t
end

-- String interpolation using table subs
function interp (s, tab)
  return (s:gsub ('($%b{})',function (w) return tab[w:sub (3, -2)] or w end))
end

-- Limits a number to boundaries
function bounds (l, n, h)
  return math.max (l, math.min (n, h))
end

-- Empties a table in place
function empty (t)
  for k in ipairs (t) do
    t[k] = nil
  end
end

---- Main Table Object & pseudo global settings

Calico = {}

Calico.audio_directory = 'audio'
Calico.sound_table = 'sound_bites'
Calico.chat_table = 'chat_responses'

---- Queue
Calico.queue = {}

---- Commands
Calico.commands = {}

-- Audio Related
Calico.commands['stop'] = function (event, args)
  if piepan.Audio.IsPlaying () then
    piepan.Audio.Stop ()
  end
end

Calico.commands['volume'] = function (event, args)
  local vol = tonumber (args[1])
  local setting, percentage = true

  if not vol then
    vol = piepan.Audio.Volume ()
    setting = false
  end
  
  if setting then
    vol = bounds (0, vol, 1)
    piepan.Audio.SetVolume (vol)
  end
  
  percentage = math.floor (vol * 100)
  piepan.Self.Channel.Send (interp ('Volume: ${p}%', {p = percentage}), false)
end

Calico.commands['find'] = function (event, args, offset)
  local request, response, query, found
  local search = args[1]
  local offset = offset or 0
  local dbtable = con:escape (Calico.sound_table)
  local qsubs = {t = dbtable, o = offset}
  local message = [[
  <table border="1" cellpadding="5"><thead><tr>
  <th width="50%">NAME</th>
  <th width="50%">CMD</th>
  </tr></thead>
  ]]

  if not search then
    query = 'SELECT name, cmd FROM ${t} ORDER BY name ASC LIMIT 20 OFFSET ${o}'
    query = interp (query, qsubs)
  else
    query = 'SELECT name, cmd FROM ${t} WHERE name LIKE "%${s}%" ORDER BY name ASC LIMIT 20 OFFSET ${o}'
    qsubs['s'] = con:escape (search)
    query = interp (query, qsubs)
  end
  
  request = assert ( con:execute (query) )
  response = true
  
  while response do
    response = request:fetch ({})
    
    if response then
      found = true
      
      local name, cmd
      name = response[1]
      cmd = response[2]
      
      message = message..'<tr><td width="50%" align="center">'..name..'</td>'
      message = message..'<td width="50%" align="center">'..cmd..'</td></tr>'
    end
  end
  
  if found then
    message = message..'</table>'
    event.Sender.Send (message)
    Calico.commands['find'] (event, args, offset + 20)
  else
    event.Sender.Send ('End of results.')
  end
end

-- Queue related
Calico.commands['empty queue'] = function (event, args)
  local count, grammar, response = #Calico.queue
  
  if count == 0 then
    piepan.Self.Channel.Send ('Queue is already empty.', false)
  else 
    empty (Calico.queue)  
    grammar = (count == 1) and 'entry' or 'entries'
    response = interp ('Cleared ${c} ${g} from the queue.', {c = count, g = grammar})
    piepan.Self.Channel.Send (response, false)
  end
end

Calico.commands['list queue'] = function (event, args)
  if #Calico.queue == 0 then
    piepan.Self.Channel.Send ('Queue is empty.', false)
    return
  end
  
  local response = 'Queue:'
  
  for _, v in ipairs (Calico.queue) do
    response = response..' ['..v..']'
  end
  
  piepan.Self.Channel.Send (response, false)
end

-- Movement related
Calico.commands['move here'] = function (event, args)
  local cur, des
  cur = piepan.Self.Channel.ID
  des = event.Sender.Channel.ID
  
  if cur == des then
    return
  else
    piepan.Self.Move (piepan.Channels[des])
  end
end

Calico.commands['get out'] = function (event, args)
  local room = tonumber (args[1]) or 27
  
  piepan.Self.Move (piepan.Channels[room])
end

Calico.commands['leave now'] = function (event, args)
  print ('Calico was asked to wait outside.')
  piepan.Disconnect ()
end

-- Chat related
Calico.commands['help'] = function (event, args)
  local sender = event.Sender
  local help = [[
  Help has arrived!
  <br /><br />
  <b>do [COMMAND]</b> - Call literal commands. e.g., <i>do stop</i>
  <br /><br />
  Some <b>do</b> commands take extra parameters.
  These can be passed in by prefixing a <b>+</b> onto
  the parameter, following the command. e.g., do volume +0.5
  <br /><hr /><br />
  <b>say [COMMAND]</b> - Print associated text. e.g., <i>say hello</i>
  <br /><hr /><br />
  <b>play [COMMAND]</b> - Play associated audio clip. e.g., <i>play theme</i>
  <br /><hr /><br />
  Multiple commands can be sent in one message
  by splitting them up with a semi-colon ( <b>;</b> )<br />
  e.g., play this; say that; do something
  <br />
  ]]
  
  sender.Send (help)
end

Calico.commands['echo'] = function (event, args)
  for _, v in ipairs (args) do
    piepan.Self.Channel.Send (v, false)
  end
end

---- Core funcionality

-- Issue Command
Calico.issueCommand = function (event, command)
  local args = split (command, '+')
    
  for k, v in ipairs (args) do
    args[k] = trim (v)
  end
  
  local cmd = table.remove (args, 1)
  
  if Calico.commands[cmd] then
    Calico.commands[cmd] (event, args)
  end
end

-- Talk Back
Calico.talkBack = function (query)
  local request, response
  local dbtable = con:escape (Calico.chat_table)
  local cmd = con:escape (query)
  local qsubs = {t = dbtable, c = cmd}
  local query = interp ('SELECT response FROM ${t} WHERE cmd = "${c}"', qsubs)
  
  request = assert ( con:execute (query) )
  response = request:fetch ({})
  
  if response then
    piepan.Self.Channel.Send (response[1], false)
  end
end

-- Get File Info
Calico.getFileInfo = function (clip)
  local request, response
  local assoc = {}
  local dbtable = con:escape (Calico.sound_table)
  local cmd = con:escape (clip)
  local qsubs = {t = dbtable, c = cmd}
  local query = interp ('SELECT dir, filename, ext FROM ${t} WHERE cmd = "${c}"', qsubs)
  
  request = assert ( con:execute (query) )
  response = request:fetch ({})
  
  if response then
    assoc['dir'] = response[1]
    assoc['filename'] = response[2]
    assoc['ext'] = response[3]
  else
    assoc = false
  end
  
  return assoc
end

-- Play Audio
Calico.playAudio = function (clip)
  if piepan.Audio.IsPlaying () then
    if #Calico.queue < 10 then
      table.insert (Calico.queue, clip)
    end
    return
  end
  
  local fileInfo, fpath = Calico.getFileInfo (clip)
  
  if not fileInfo then
    Calico.playNext ()
    return
  end
  
  local fsubs = {
    d  = Calico.audio_directory,
    s = fileInfo['dir'],
    f  = fileInfo['filename'],
    e  = fileInfo['ext']
  }
  
  fpath = interp ('${d}/${s}/${f}.${e}', fsubs)
  piepan.Audio.Play ( { filename = fpath, callback = Calico.playNext } )
end

Calico.playNext = function ()
  local count = #Calico.queue
  local nextInLine
  
  if count > 0 then
    nextInLine = table.remove (Calico.queue, 1)
    Calico.playAudio (nextInLine)
  end
end

---- Event Handlers

--[[
Splits message into multiparts
Issue appropriate low level command per part
--]]
Calico.delegateMessage = function (event)
  if event.Sender == nil then
    return
  end
  
  local msg = event.Message:lower ()
  msg = compact (trim (msg))
    
  local cmds = split (msg, ';')
  
  for _, v in ipairs (cmds) do
    v = trim (v)
    
    if v:sub (1, 2) == 'do' then
      Calico.issueCommand (event, v:sub (4))
    end
    
    if v:sub (1, 3) == 'say' then
      Calico.talkBack (v:sub (5))
    end
    
    if v:sub (1, 4) == 'play' then
      Calico.playAudio (v:sub (6))
    end
    
    -- Help exceptions
    if v == 'help' or v == '?' then
      Calico.commands['help'] (event)
    end
  end
end

Calico.connected = function (event)
  print ('Calico is purring')
  piepan.Audio.SetVolume (0.5)
  piepan.Self.SetComment('I\'m a bot! Type <b>?</b> for help on how to use me.')
  piepan.Self.Move (piepan.Channels[3])
end

---- Events

piepan.On ('connect', Calico.connected)
piepan.On ('message', Calico.delegateMessage)