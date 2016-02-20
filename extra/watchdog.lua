#!/usr/bin/env lua

repeat
	code = os.execute(arg[1])
until code == 2
