-- Calico.lua
-- Experimental lua version
-- TODO: LuaSQL

require 'bin/conf'
driver = require 'luasql.mysql'
db = driver.mysql()
con = assert ( db:connect(DB_NAME, DB_USER, DB_PASS) )

-- Main Table Object
Calico = {}


-- Core funcionality

Calico.lookUp = function (query)
  local request, response
  
  request = assert ( con:execute('SELECT path FROM sound_bites WHERE cmd = "' .. query .. '"') )
  response = assert ( request:fetch({}) )
  
  if response[1] then
    piepan.Audio.Play ( { filename = response[1] } )
  end
end


-- Event Handlers

Calico.searchMessage = function (event)
  local message
  message = event.Message
  
  for rq in message:gmatch(':[%a%d]*%s?') do
    print (rq)
    Calico.lookUp(rq:sub(2))
  end
end


Calico.connected = function (event)
  print ('Calico is purring')
  piepan.Self.Move(piepan.Channels[3])
end


-- Events
piepan.On ('connect', Calico.connected)
piepan.On ('message', Calico.searchMessage)