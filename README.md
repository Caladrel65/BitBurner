# BitBurner
JavaScript+ files for BitBurner. I basically started learning JS with this game, so anything fancy is pretty new to me.  
If you have recommendations that don't use too much syntactic sugar, go ahead and make a PR with an explanation.  
Side note: I forget to update stuff for months or even years. Feel free to remind me to update this.

As with others who put their work up, I reserve the right to not update this except at my own whim. **Use at your own risk.**  
There are certain elements of the game that I believe are best to play through yourself.  
I have scripted some of those elements and they may not be available here.  
Feel free to reach out and ask for them - I may have requirements before I share them.  
(Like I said, I think some parts are best to go through yourself, at least enough to learn a little bit)

Edit ~1 year later: Lol, I never even put in my scripts. I'll start working on that :) Like I said, give me some time to get these going.

# Spoilers be here.
**You've been warned.**

Current BitNode path:
Done: 1.1->1.2->1.3->2.1->4.1->4.2->5.1->3.1->4.3->3.2->3.3 (SF: 1.3/2.1/3.3/4.3/5.1)  
Plan: (Finish working on corp.js)->10.1->10.2/3?->9.1/2/3?  
Current Project: corp.js. After that I'm grabbing sleeves. Goal is Sleeves->Gang->Corp for most BNs.

I haven't done this before so I'm just gonna throw a [Insert rest of disclaimer here].

Please give me some time to upload these, I'm pretty burned out and I'm prioritizing corp.js so I can work on something else other than BN3.

# Scripts:
`start.js` // alias start kills everything on home and runs start.js, which opens everything else. Considering removing and putting all into t4k30v3r  
`hack.js` // currently loops with loop.js, hack picks targets and passes all info to loop, which re-calls hack. Considering combining into one.  
`loop.js` // runs hackScript.js, growScript.js, weakScript.js  
`hackScript.js` // it do be hacking  
`growScript.js` // it do be growing  
`weakScript.js` // it do be weaking  
`factionShare.js` // gets called from start.js instead of hack.js, opens shareScript.js like loop.js calls the others.  
`shareScript.js` // it do be sharing  
`hacknetloop.js` // buys hacknet nodes. Not servers, will update after SF9  
`batchScript.js` // incomplete and probably very wrong  
`hunter.js` // finds server path, will be implemented into other scripts and removed // shamelessly stolen and tweaked for my purposes  
`n00dles.js` // kept around because fun  

# Scripts not on here:
`corp.js`  
`dump.js`  
`employeeHelper.js`  
`t4k30v3r.js`  
`t4k30v3r_w41t.js`  
`player.js`  
`gang.js`  
`test.js`  
