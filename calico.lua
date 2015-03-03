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

-- Splits an array-like table on a delimiter
function split (s, d)
    local t, i = {}, 1
    
    if d == nil then
        d = '%s'
    end
    
    for str in s:gmatch ("([^"..d.."]+)") do
        t[i] = str
        i = i + 1
    end
    
    return t
end

-- Limits a number to boundaries
function bounds (l, n, h)
  return math.max (l, math.min (n, h))
end

-- Empties an array-like table in place
function empty (a)
  for k in ipairs (a) do
    a[k] = nil
  end
end

---- Main Table Object & pseudo global settings

Calico = {}

Calico.audio_directory = 'audio'
Calico.sound_table = 'sound_bites'
Calico.chat_table = 'chat_responses'

---- Commands & Queue

-- Commands
Calico.commands = {}


-- Audio Related
Calico.commands['stop'] = function (event, args)
  if piepan.Audio.IsPlaying () then
    piepan.Audio.Stop ()
  end
end

Calico.commands['volume'] = function (event, args)
  local vol = tonumber (args[1])
  local setting, percentage = true, nil

  if not vol then
    vol = piepan.Audio.Volume ()
    setting = false
  end
  
  if setting then
    vol = bounds (0, vol, 1)
    piepan.Audio.SetVolume (vol)
  end
  
  percentage = math.floor (vol * 100)
  piepan.Self.Channel.Send ('Volume: '..percentage..'%', false)
end

-- Queue related
Calico.commands['empty queue'] = function (event, args)
  empty (Calico.queue)
end

Calico.commands['list queue'] = function (event, args)
  -- todo
end

-- Movement related
Calico.commands['leave now'] = function (event, args)
  print ('Calico was asked to wait outside.')
  piepan.Disconnect ()
end

-- Queue
Calico.queue = {}

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
  
  request = assert ( con:execute ('SELECT response FROM '..dbtable..' WHERE cmd = "'..cmd..'"') )
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
  
  request = assert ( con:execute ('SELECT dir, filename, ext FROM '..dbtable..' WHERE cmd = "'..cmd..'"') )
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
    if table.getn (Calico.queue) < 10 then
      table.insert (Calico.queue, clip)
    end
    return
  end
  
  local fileInfo, fpath = Calico.getFileInfo (clip), nil
  
  if not fileInfo then
    Calico.playNext ()
    return
  end
  
  fpath = Calico.audio_directory .. '/'
  fpath = fpath .. fileInfo['dir'] .. '/'
  fpath = fpath .. fileInfo['filename'] .. '.'
  fpath = fpath .. fileInfo['ext']
  
  piepan.Audio.Play ( { filename = fpath, callback = Calico.playNext } )
end

Calico.playNext = function ()
  local count = table.getn (Calico.queue)
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
  local msg = event.Message:lower ()
  msg = compact (trim (msg))
    
  local cmds = split (msg, ';')
  
  for k, v in ipairs (cmds) do
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
    
    -- Add help exceptions
  end
end

Calico.connected = function (event)
  print ('Calico is purring')
  piepan.Audio.SetVolume (0.5)
  piepan.Self.Move (piepan.Channels[3])
end

---- Events

piepan.On ('connect', Calico.connected)
piepan.On ('message', Calico.delegateMessage)