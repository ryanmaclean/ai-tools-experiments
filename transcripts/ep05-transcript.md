[00:00:00] **Jason:** Hey there. Welcome back. I thought we'd do another experiment with an AI tool to see if we can solve a problem. That's. Sort of the point of a lot of these videos, if you've been keeping up is to go through some of the recent tools that have been announced and made available to us in the developer space and just see if they can solve our problems and how they work and have a better understanding of them.

And that's what we're here to do now. So I thought we would actually try to make some changes, some updates to my website. And my website is just as you can probably imagine, jason hand.com. And this is really just a template that I got from Netlify which is where it's deployed. Okay, I'm deploying it over here, Netlify.

And I just used this template that was available when you when you first create an account on Netlify. Made life easy for me. I didn't really wanna spend a lot [00:01:00] of time designing a new site. I just wanted to get something going and then get some content in here. What I started it off with was an info page, which has got some stuff in here, including me, picture of me, some links to some different stuff.

Up here at the top we've got next projects. Projects are meant to be just recent things that I'm working on, whether that's. Webinars or speaking opportunities or my podcast just, variety of projects that I'm involved in. And there's a couple that I need to I need to add to here.

And then thoughts was really just an experiment where I've taken some previous interviews of mine and summarize them using ai. And then broke them down into little sort of chunks. And it was, an experiment too. I'm not really into making writing blog posts and writing these huge things really that much [00:02:00] anymore.

And, but I still wanted to have some thoughts and opinions out there. So I was just experimenting with this. But I think I'm gonna turn this off for now. In terms of a, just a feature of my website, I don't really wanna spend that much time on it. And. There's just other things I'd rather do.

This AI section of my menu takes you to some of those links. So I still want to have this AI or, a link something up here to the AI experiments that, that is this, that we're working on. But I don't want it to go to this stuff anymore. And then in the dere. Page, I'd like to just change this so that it just says, listen to my podcast.

I don't want this stuff in there anymore. So I kinda went through it before I got on camera here and just jotted down some ideas that I want to do in terms of, or, take action on that. I want to wanna do this site including the main page. I wanna take these [00:03:00] featured posts off since we're gonna be taking those thoughts.

That's what those are. We'll make that disappear. Some changes to some footers. So anyway, long story short, I've got a file in here that is pretty much just a list of things that I want to do in the site, and we can go through them real quick. But my intention is actually to just pan this over to Claude Code.

Just the full to-do list and see what it thinks and what it can do for me. Because in my previous experiments with Claude, I was able to give it a list of things that I needed to do, and it, for the most part, handled it. And those were actually, I think, a little bit more complex than what I'm having this to do.

This is a little bit more, I'm intending to give it a little bit more generic instructions rather than more specific instructions, but honestly, I don't [00:04:00] care how it gets some of this stuff done or how it gets any of it done. Some of it's just a matter of adding some new files and text. The one thing that's a little bit tricky that I'm curious to see how it handles as I've asked it in my notes here.

Let's see. And a new project page. Update the Devereux page.

I thought I had one more in here.

Yeah. This is a good start. If you're reading along here, I don't wanna read all this, but remove the thoughts menu from the option mark all thought takes as drafts and unpublish them. I guess that's the one I was thinking of [00:05:00] that might be a little tricky on how that does that, because if you look at the code for this website it's just it's next JS for the most part and there's a lot of tailwind stuff.

I really haven't dug into the code, too much to see. To see how it works because again I don't really care. I just wanted, a decent looking website that was easy to update. And so anyway, what I wanna do is just take all of this stuff from my to-do list and move it into Claude code.

And let's make this just a little bit smaller now and see what see what happens. So what what I'm gonna do is I've got,

I've already got if we look at our directory let's first go into dev and then look around. We have this [00:06:00] personal web folder, which is the code base. My code. We can see that over here. This is personal web, so that's the repository. I've already cloned it down into my machine. So we're gonna go into personal web and you can see it's it already detects that this is a GitHub repo.

All right. And we can look around in here just to confirm that this is what we think it is and it is. So what I wanna do is from here, this is the root of my code base, is let's summon Claude by just typing in Claude. And we've got some questions here. And let me make this just a little bit bigger so we can see everything.

Do you trust the files in this folder? This is my personal footer and gives me some different. Details about that on executing code and that kind of thing. I'm gonna say yes. And now I'm free [00:07:00] to let's make this a little smaller so everything fits. Now I'm free to start asking questions. So I'm going to tell Claude my intentions here on what I'd like to do with my code.

And I'm gonna paste in that to-do list of everything that we have. And then we'll just watch and see what happens. Alright, so I have a website that is built using the code base we are in currently. I just reviewed the site and have a list of updates I'd like to make and hope you can help me with this.

That here is the list of things I want done [00:08:00] and I believe I can shift enter. Nope, I think I did that last time. Okay. At least it didn't start spinning off here. So let me copy the to-do list and paste that in. We'll paste. Anyway,

now that Claude knows what I want, we'll just sit here and see what it thinks.

And what I think I'll do also is just open up vs code and open up.

[00:09:00] That project. Bring that over here.

We'll go ahead and do this

and.

A couple housekeeping things we needed to do here.

Okay.

Okay. So we have that ready to go and let's just check in on Claude.

Still [00:10:00] transmuting.

I haven't counted how many, oh, hey. We just got okay. Do you wanna make this edit to config file? Yes. And let's go ahead and give it permission to just do all that. For the rest of this session, so we're not answering yes for everything, giving up a little control there, but that's the experiment to see what it does without too much interaction and intervention from me.

But anyway, I want to pull up, I guess I can just open up another terminal [00:11:00] here. And so if we go in and let me just make this bigger

and we'll look around here. At sorry.

Just looking at the list of things that we're doing, so removing the thoughts. Thing from the menu Mark. All thought takes. I explained some of those down here. I wanted to add a new project. So recently I spoke at a conference in Pasadena called the Southern California Linux Con Expo. And I wanted to add details about that.

I also wanted to I found like I ha I have a little sh Etsy store link that I used for my podcast. But I've decided not to continue using that. So anyway, I'm taking that out of the links section. I'm gonna replace it with my YouTube link since I'm starting [00:12:00] to put more stuff on YouTube now.

And then yeah, so the, there's 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11. So that was basically what I was trying to get at is how many things did I give it to do? And the answer is 11. Alright, so although it came back here with a list of nine things that it accomplished, let's see what it has. I've completed all the requested updates, removed with thoughts, menu option, all the thoughts posts will be hidden and they're now filtered out in the get all posts sorted.

Interesting. Added new menu options for Ignite Karaoke, which takes you to Yeah, hopefully. And then great. I like that it adds a little emoji here. It's fun.

Okay, so all changes have been [00:13:00] implemented successfully. Does that mean Yeah. Look at that. So the config file changed, index, bunch of files changed. Alright, let's just real quick. Look, take a quick visual snapshot of what our main website looks like here. And then I'm gonna go ahead. I know I could, do all this locally, but part of the experiment that I'm doing with all these is trying to trust it on what it's created for me.

And I don't want to do a lot of back and forth changes. It's not that hard for me to just commit nude code, if that's what we're gonna do and this is Claude Code updates.[00:14:00] 

All right, so that's been, code's been pushed out. We can verify that we come over here and just do a quick refresh. We'll see that. Few files. Now have a now indicator and if we go into netlify, maybe do a refresh here. We should see that we've got a new deployment firing up

and this one will take a little bit of time for it to cook and build. Hopefully we'll see some different. Different menu options up here. At least one more project listed in here. All these featured posts should go away. That whole section should go away, and there sh should be some differences in the footer.[00:15:00] 

We're just watching our build process here over on Netlify.

Initializing step is done.[00:16:00] 

All right. Okay, so everything looks like it has completed successfully, and we can. Open our production deploy and look at that. The top has definitely changed, I think. I'm gonna have to go back and tell to remove that though. 'cause I didn't get, I forgot, I didn't get real specific on that part. Okay.

And look at this. What, oh, wait. I think it's just that. That's the one I had already, I think. Okay. 'cause I did have, I guess it's true. I did have an article in there, a project in there stating I was gonna be speaking. So we'll take a look at it closer. But it did remove all of the thought takes. That's good.

And there was a change down here, which is good. There's supposed to be some, there was something down here previously, and now let's go look up here and info. It [00:17:00] took my shopping link away and added my YouTube page, which is good. Great. And

I don't see any real big changes in here, but I think also. I might have not been per perfectly clear on what I wanted there. I also was not clear on removing all this stuff that was just something I was thinking out loud, but didn't actually put in there. It did get this part right to just go listen to my podcast.

Now I want to add some images in here and now Ignite Karaoke. Oh look, I think I wanted it to go into a new tab, but, it's still fun that it did it.

Now it just feels like it's baked in into my website and yeah. So we'll let this finish up just [00:18:00] 'cause I like seeing these pictures sometimes.

All right,

Technically that works. And then I get you. I bet you this one, yeah, this works too.

Sweet. I did want it to open up in a new tab. That's okay. And then this one comes to our experiments tab. Okay. So yeah, we're pretty close. I tell you what let's just see if we can clean it up. Let's make a few more changes. Move the AI menu option.

Leave the AI experiments.[00:19:00] 

And then

if possible,

force a new tab to open

when users click. The karaoke

vinyl viewer or AI experiments menu option. Now, this is interesting because. Depending on how this is actually implemented in the code it's not gonna be a straightforward solution because to do it, to have some of the menu options not do that. Some of 'em open in a new tab and some of 'em [00:20:00] don't.

Is gonna be the challenge. Now, I don't really want everything opening up in a new tab. I just wanted the karaoke, the vinyl viewer and the AI experiments ones to open in a new tab. But if I can't figure out a good way to handle this and keep like the projects and the other stuff there, I may just move those links to a different place instead of having them as menu options.

Because the menu op, the menu's kind of getting large, excuse me, the menu's getting a little long and anyway, but let's, let's do this. Let's see what it thinks we should do here.[00:21:00] 

Okay. You can see there.

You can see there where it's got the target equals under blank in quotes. That, that's what you would put in like an a, like a hyperlink to make it work in the, in HTML. But again, I don't know that you can do that for a, all

the menus. It'll be interesting because also this isn't just a straightforward, like HTML and JavaScript app. It's a next JS app. So it's JavaScript at, its core, but I didn't create it and it's definitely got a lot of stuff in there

that I'm not [00:22:00] using.

Looking at these suggestions here, it's making some changes to some TypeScript files,

which is

more than I expected it to do. Okay. Alright. I got some, I got an update. Perfect. I've now removed the AI menu option from the config. JSON updated the action component to correctly handle the target attribute. Okay. Added the target property to the link model and the CMS [00:23:00] ensured that the link component passes the target attribute along shown, okay, keep.

Okay. Interesting. All right, let's see. Let's see if it's true. Pull our code back up. Oops. And we'll go ahead and add all this in here. Again. I know I could check this locally. I. If you're wondering why is that fool not just checking things locally, we're just yellowing stuff into production for these experiments.

And I'm just gonna call this more cleanup.

And let's come over here and take a look to a new refresh.[00:24:00] 

Oops. Not that one.

And then we just watch our deployment.

I'm noticing some PHP in here.

A little surprised.[00:25:00] 

Okay. I think we almost there and that shouldn't be it. So let's do a quick refresh here and we've gotten rid of our AI link at the top. That's good. And then, and you know what, I'm just gonna do a hold down the shift key and hit a refresh here. Just make sure I. And what we expect now for these three links that they open up in a new tab.

Ta-da, vinyl viewer, AI experiments. Sweet. Okay, but not derel, and not projects, and not info. Just[00:26:00] 

ignite karaoke. Alright. So what did we learn? We learned that

we can pretty much give

Claude

a huge list of things that you want done with very little explicit instructions. And it's gonna get, it's gonna get most of the way there.

Yeah, I feel like that was pretty, pretty much a success.

Crash and burn. I.[00:27:00] 

Yeah. All right. And this is this is what it was in the original shape. Okay. Now we've got, so it was 1, 2, 3, 5. Now we got rid of that one, added a few more. And I bet you if we just do a quick refresh over here.

So there we have it. Now we've got updates to the website, and Claude Code helped me do all that in almost exactly 30 minutes. And I didn't have to write any code. I knew you know how to. Do all that stuff manually, but honestly a lot of it's just gonna be copying and pasting and duplicating files to start as a, to use as a [00:28:00] starting point.

And then yeah, so it's gonna be a much easier moving forward to keep my website up to date just simply by creating a list of things I need done, dropping it into Claude Code or. A lot of them are gonna work the same way, but just dropping all that in there and then letting it see what it can do.

So I hope this video has been helpful for you and we'll see you on the next one.

