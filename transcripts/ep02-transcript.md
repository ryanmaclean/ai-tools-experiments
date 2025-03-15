[00:00:00] **Ryan MacLean:** So listen, I spent my weekend trying to stay away from AI generated stuff. I don't know why, I just stayed off the computer.

But it sounds like you've been digging into some stuff. What have you been up to? 

[00:00:11] **Jason Hand:** Yeah I didn't spend all weekend on the computer, but I did spend a chunk of range of time on Friday Yeah, I was too nice outside to do that. Mmm. I played golf actually. Oh, there you go I used to get outside enjoy the weather but on Friday before I was done, you know with the day working I spent a fair amount of time playing with this new tool that I had learned about called warp.

It's not actually new. It's been around for a while on Linux and Mac, but they just released it on windows and it's a terminal like shell complete package type of thing, but does a whole bunch of other stuff too. That kind of modernizes it a little bit, but also keeps it in the command line interface feeling, slash terminals, feeling vibe, [00:01:00] explaining it, it just doesn't get it.

[00:01:02] **Ryan MacLean:** You almost need to show it. 

[00:01:03] **Jason Hand:** Yeah. Yeah, you got it. You definitely have to, I would say, I'm going to show it for sure, but I think everybody should go play with it. 

[00:01:08] **Ryan MacLean:** It's like, how much better can this be than PuTTY or what have you, you know what I mean? 

[00:01:13] **Jason Hand:** But, you may be thinking what does that have to do with AI? We're already getting off track. So it has an AI agent built into it. Cursor is what we were going to talk about today.

And I wanted to have an app ready to go to see if cursor can help me with that. But then I learned about warp and I got sidetracked as I do. Sonnet 3. 7 also just recently came out. From Claude, right? From Claude and also a companion app called Code, Claude Code, which is also a terminal, it's more of a Python thing, package, or I don't know if you called a library.

there's been a bunch of other things I wanted to play with, but long story short, I went ahead and spent some time with terminal going through just the free tier to see how many like tokens it would let me play with and just see what it was doing.

I recorded the whole process. So I thought we could step through that before we get into [00:02:00] cursor because honestly, warp was really fun. I'm looking forward to playing with it more, using it more, not just playing with it, but it seems very useful. So let me pull up a video of that first here, and then we can go through that together.

Okay, so if you want to share my screen here. Anyway, once you get Warp installed, if you're familiar with the Windows Terminal, if you've ever used that, it's going to feel very similar to that. And so you can go back and forth between natural conversations or just like typing in commands. If you ask Claude what to do, it'll tell you what command to run and it'll even pre populate it for you. So it gives you, a little bit of heads up on stuff.

I didn't really want to go that route first when I started playing with this. I wanted to dive right in with what can Cloud 3. 0, or sorry, 3. 7 Sonnet build for me using this. And previously, I'd already been thinking about some ideas around just a very basic demo that can send some logs and metrics to Datadog.

That we can visually see [00:03:00] on a dashboard in Datadog. Just to show you how basically how easy it is to, instrument something. And so that's what I aimed to do here Warp. And I put that in there and, I'm not going to go through all, whatever this is, hour long video.

We don't have time for that. But you can see that after it thought through what it needed to do. Is this a reasoning model? I believe it is a reasoning model. Where it gives you what it thinks it needs to do. And then if it's a command that you need to run in the terminal, it comes up like this and then gives you the option to hit enter or click on it to run it. And then it just throws that into the terminal and then executes it for you. Very cool.

And so you just go through that process, especially when you're in, a new environment like I am, I'm on this new Windows machine here. And so nothing's really set up at all. it goes through and decides what needs to be done, creating different directories, based on what I asked it.

And here you can see me just experimenting with the interface a little bit to see one of the really cool things about warp is the share block feature. 

[00:03:59] **Ryan MacLean:** Yeah, it [00:04:00] wasn't necessarily the strong suit. Yeah, I would agree. 

[00:04:02] **Jason Hand:** So now you can actually like copy. What and paste it just like it is somebody else or share it with somebody else. I should say. It's not necessarily exactly right, 

[00:04:12] **Ryan MacLean:** but I'll grab all that white space. So it's not all jumble when you go to paste it.

[00:04:16] **Jason Hand:** Exactly. Yeah. So that's like one of those things of. 

[00:04:18] **Ryan MacLean:** Indeed. Why does a new terminal need to make this obvious? That's hilarious. 

[00:04:22] **Jason Hand:** Okay, so over here on the right now, you can see where it's starting to create some code for me.

It's creating this index file. And before it actually creates anything, it always gives you this diff. thing or, if it's just new code, it's all green here like this You just hit apply changes or hit enter and it starts creating that file. 

[00:04:40] **Ryan MacLean:** Where did it get the code color 632? C A 6, because I know that code color, but not everyone's going to be aware of why that's important. 

[00:04:50] **Jason Hand:** For those of you who don't know, that's the Datadog purple.

[00:04:52] **Ryan MacLean:** Exactly, thank you.

[00:04:54] **Jason Hand:** And yes, so that's why it's actually done quite well there. Gotcha. So let's [00:05:00] fast forward here a little bit. I think eventually I pull over. Look at that. So here's the file, the index file that it created initially. There we go. Pull up the app. Now what I was trying to get it to do, if you read the text, or the prompt, is I wanted to just drop my own JSON file in there that sort of Right.

Represents a log or a metric, and then put in my own API key because that way it's easier for everybody to just drop their own key in and play with this, that turned out to be not a great implementation or I guess approach to doing all this. To full transparency, I went down this route for a long time for the rest of this video.

But then last night, I came back and decided to take another stab at it, but I went ahead and signed up for Warp, to unlock some more tokens. I'm not paying for anything. 

Yeah, it's just that I signed up. And so far, I haven't hit any limitations, but I did, come up with a new approach and I actually got it [00:06:00] working. So I'm not going to spend any more time going through that video because I feel like everybody should just go dive into warp and experience it for yourself.

because it is fun, and it works pretty well. but coming back over to my screen, this app here is what I eventually built with warp and Cloud 3. 7's on it. when I started over from scratch and gave it a little bit more specifics on what I want to do, tried to reduce the scope on what was happening and just make it more simple.

So from this interface, you can choose a log or metric and. when you hit start streaming, it's actually going to start down here letting you know that something's happening and sending data to Datadog. And I can see over here in Warp, what's going on, the logs that are being pumped out and sent to my app.

And this is a server, or a Python, just like a proxy app that was built. One of the other things, and I'm going to switch this over to metrics too and let that run. More specifically, is I told it I want to [00:07:00] use Next.

[00:07:00] **Ryan MacLean:** Gotcha, yep. 

[00:07:01] **Jason Hand:** and that made the whole thing a lot, more just out of the box better. You know what I mean? Once I gave it those specifics, It actually, I thought produced a pretty good app.

[00:07:11] **Ryan MacLean:** I have noticed that Next. js and Tailwind do seem to be like keywords. I don't know if it's like when the models were trained and if it's like a cutoff date or something like that, but I wonder what the cutoff is for 3. 7 and whether or not It's a little bit later than something else.

Okay, so yeah, it's end of October 2024, which to me says that yeah, for things like Tailwind, for example, it's going to be a lot more knowledgeable, but probably also of other frameworks as well. That's really cool. 

[00:07:36] **Jason Hand:** Okay, cool. so you can see it stopped here, and I've got this, one of the things in the new prompt that I gave it was to time out after 60 seconds.

I didn't want somebody to take this demo and start it and forget it was running and then just spam, their Datadog account with a bunch of stuff. So anyway, I baked in a little fail safe there, but 

But anyway, if we pop over into Datadog, we can [00:08:00] see, these are the metrics that were coming in, I don't know if you saw over here on the right. The code is just dimmer, just generating random numbers to send over.

[00:08:08] **Ryan MacLean:** but then down here in the logs, we can see, there's not a whole lot over here, but we can confirm this is coming from our app, the rest of it's all just generic stuff. There's the log message itself. a win, I would say, for an AI tool to help me build a really simple demo app that shows off some Datadog stuff. 

And I think last time you were asking me about sample proms and things like that. I don't really have one for apps, but I will say I tend to go through the same kind of app as we were talking about radio, like a front end for an LM or something like this simple type of app between them.

[00:08:40] **Ryan MacLean:** And I feel like a good way is to see what frameworks they pick on their own or when you give them one. How does it work with it? That kind of thing. So To me, at least, you get a good base to compare Cursor to at this point. I feel like it's massive. I'm just scratching the surface, but yeah, fair enough. I flirted with maybe playing with it over the weekend. [00:09:00] but then decided to just, start from scratch and just experience it together. so let me, I'm gonna close, Warp here. Sounds good.

I'm also interested because Courser has a terminal, which kind of does some of the stuff that I'm seeing in Warp, but also does not do some of the things that I see Warp can do. And I wonder if, because it can consume shells at least, maybe not terminals, but shells themselves. And I wonder if there's a way I can work with it.

Okay. Cool to see. . 

[00:09:24] **Jason Hand:** It's immediately asking me about my keyboard setup and key bindings. 

[00:09:28] **Ryan MacLean:** Now, are you Vim or Emacs? Where do you stand? 

[00:09:31] **Jason Hand:** The great debate.

[00:09:32] **Ryan MacLean:** Indeed. 

[00:09:32] **Jason Hand:** Between Vim and Emacs, I'm certainly more Vim. Fair enough. But, to be honest VS Code is home for me. 

[00:09:39] **Ryan MacLean:** And it's for a lot of people these days, yeah. I thought this was interesting because, to me, the fact they included Atom and Sublime was cool. As somebody who used to like both of those a lot, and unfortunately I haven't used them in years, but yeah, I was a big fan.

I also found the fact that Vim and Emacs were the first was maybe indicative of their, who they're trying to win over in terms of hearts and [00:10:00] minds. 

[00:10:00] **Jason Hand:** Yeah VS Code just because that feels right for me. Language for AI. That's interesting. That's funny that you have that story because just this morning, I was doing some research using Perplexity. Confirming or looking up some additional stuff for a talk I'm about to give.

And Perplexity has this new advanced research thing. So it started stepping through all of its stuff and eventually it got to a source that I believe was in Spanish or Portuguese. and then the reasoning and all the text output switched to that language the rest of it.

I never said, to change or anything. It changed based on the source, which was weird. Anyway. Codebase wide, I guess I'll leave that enabled. 

[00:10:42] **Ryan MacLean:** Yeah, my understanding is this is, if you've only got one file open in something like a mono repo, it might be interesting to not want to look at the entire codebase.

but in my case, it's not a big deal. I've just left it enabled. 

[00:10:54] **Jason Hand:** Yeah, okay. And then I installed both of these, but I've never used them, so I'm not sure if they're key or not. [00:11:00] They do pop up a couple of permission things. Yeah, they might on Windows as well. and the same thing for cursor. I think it's just so you can one of them so you can open the browser, the other ones because it's got a little terminal tool that again, I've not used.

[00:11:12] **Ryan MacLean:** Okay, now this is another one. 

one of the first ones, I think, is Pylance. When dealing with Python, and I think there's one For JS as well, that it uses making sure that it's running tests as it goes through. 

Okay, this might pop you into another window, but I'm happy to waste some time while you're doing that.

[00:11:28] **Jason Hand:** It did. That's all right. How about I'll just, we'll switch to my camera and, I'll set up an account.

[00:11:34] **Ryan MacLean:** Sure thing. And the thing that, just while you're doing this, I noticed, and you were talking about the free tier and warp, or not signing up and signing in.

as much as I love Cursor, and I have paid for it, prior to paying for it, I did run out of credits on that free account, and I ended up just signing up with two other email addresses, because, I got a few. I felt bad, I gotta be honest, because I know that they're paying for whatever this is on the back end, that they're just trying to get you in.

But once you get on a roll, and you probably felt this with [00:12:00] Warp, is you're just like, just one more thing. It's just, ah, just one more turn. It's this next one will fix this tiny little bug. But you're so close to having a fully fledged app, that it feels if you're telling your Assistant or your temp or somebody who's coming in with your code 

And I just kept going and I would spend like I don't know 12 hours 14 hours and stuff But yeah I think the signup thing is interesting to me in terms of the way that they bring on People like it. They're trying to get people In for free basically to show them the utility and if we're going to think about what is it called proof of value if we're going to think of that kind of term, it felt to me like there was value immediately, but it took a little while for me to prove it.

[00:12:39] **Jason Hand:** It sounds like your experience was very similar to mine with Warp. Yeah, exactly. I think we can switch over here to my right screen now. Perfect. So I did go ahead and just sign up. with my Google account. And that, took me to this screen. And now we're into what, oddly, looks like VS Code. I wouldn't say oddly. I think [00:13:00] that's intentional. Because it's basically VS Code. Yes. In terms of the back. I don't even know if fork is like the right term for this. 

Okay. cool. So before we hit record, we talked about what should we do here. Should we start from scratch or actually show it some code and see what it thinks from that? I'm in the camp of let's show it the code that the other one created.

[00:13:22] **Ryan MacLean:** I might agree, actually. I feel like the ergonomics of setting up a new project are going to be the same with the same language model backend. I think in warp as in cursor, the difference is it's got a couple different ways of doing it. One is, I think it's called Composer, and the other one is Chat.

I guess there's three. And the third is as you're typing your text in. So those are different experiences. It might be a little bit different than Warp, but in terms of creating a piece of software, I think it'd be roughly the same. 

[00:13:48] **Jason Hand:** So we should open a project, and just point it at the, or go into our, let's see, Dev, and then Streaming App.

So this is the app that Warp helped [00:14:00] me create. 

[00:14:01] **Ryan MacLean:** And you'll see that there's a welcome on the top left. It just wants to make sure that you understand all the different modes. One is as you're typing. The next is to tell it to fix your code for you. The one after that, that I got a ton of value out of, is just asking questions of your code.

And then the last is chatting with your code base, which is where I spend most of my time. Asking questions of the code base. Is there a better way to do this? Is there some algorithm that I've forgotten?

Or do I really need a while loop here? That kind of stuff is really handy for me as somebody who can code, but doesn't do it all the time. Okay. 

Yeah, they want you to onboard properly, I think is what they're saying. 

[00:14:37] **Jason Hand:** Okay. we don't want to read the changelog right now, where do you suggest we go from here? 

[00:14:42] **Ryan MacLean:** I would start at gitignore, just to see how well warp did with that, because this can be one of those things, because I see you've got an env file, and I don't want you to touch that.

Yeah. I do wonder if it's ignoring the env file in the gitignore, because this is one of those things that cursor can do, but doesn't always do properly. Okay. 

[00:14:57] **Jason Hand:** So let, hold on. 

[00:14:59] **Ryan MacLean:** Did you do this on your [00:15:00] own though? 

[00:15:00] **Jason Hand:** Yeah, I did this. No, no code has been, no code has been changed. This is all me. This is, this server. Oh, I see what's happening. Yeah. I

[00:15:07] **Ryan MacLean:** like this, but also I understand in Visual Studio Code, this is similar. I find it a little bit annoying when I've already got something that can handle Python and it's asking me for something else. Not the end of the world, but I think VS Code does that as well.

[00:15:21] **Jason Hand:** Yeah, I think it's best to just have maintain sort of the experience across. Yeah, everything anyway, that's why you chose okay, so that should be good to go for now. I'm sure we'll get more of those 

[00:15:35] **Ryan MacLean:** I think you can just click on that extension thing or the file manager there on the top left 

[00:15:42] **Jason Hand:** All right.

So yeah, I don't know that we have to necessarily Examine this real close. But this is definitely Untouched since, being created with 

[00:15:52] **Ryan MacLean:** a couple of things in here that I'll say just because I know Datadog is like the logs and metrics in point, end [00:16:00] point, like the intake end points can change.

[00:16:02] **Jason Hand:** You just reminded me of something that I want to point out One thing it got wrong that I did not catch for the longest time is that in my Env file, which I can't show you because it'll show my keys.

But The name of that secret is DD Underscore API underscore key. Yeah, right and I think you yeah, so right here. However somewhere in the code It was datadog underscore API key. 

[00:16:31] **Ryan MacLean:** I've had the exact same problem with Cursor. Where it creates multiple variables that do exactly the same thing and uses them interchangeably through your code.

[00:16:40] **Jason Hand:** Really, what I'm embarrassed is that I fed all the errors, I kept feeding the errors back into warp and it never even hinted or suggested that as a possible cause of why we were getting 404.

Four errors, I think, or four or three errors at the time. Anyway, it was just Oh that was a huge opportunity for [00:17:00] detecting what in the world is this not, why is it not working? 

[00:17:02] **Ryan MacLean:** I wonder though, if this is a good friction log for us, because I bet you somewhere in our docs that it says Datadog API key, and then it says DDA API key, because I've seen both before in our docs.

I wonder if it's ingested old versions of the docs, and it's got some of that stuff in the memory, as well as the newer stuff, and then it's doing Two things at the same time. It feels like at this stage, in 2025, the current year, that it looks like, adjusting your documentation for AI use seems to be important, which is odd to me, but it does seem critical.

Especially in, I'm not sure if you've done it in Cursor yet, but you can add documentation. And depending on the form of the documentation, you'll have more or less success, basically. 

[00:17:45] **Jason Hand:** I did see in a video that you can add docs as like a source.

[00:17:51] **Ryan MacLean:** You were, I think, suggesting that we ask it to make sense of this code. Is that what your first suggestion was or what do you think? So PEP 8 is the style guide.

basically, so [00:18:00] it's one of these. earlier tickets from Python that will tell you basically that your project should look a certain way. now one thing that I will often do is grab my Python code and say hey, does this comply to PEP 8?

So PEP 8 is what it is. it means are there, did you hit enter after Your function, that kind of stuff, twice as opposed to once. So there's enough space there, because white space is important to Python for legibility. And again, not that this code is bad, I just wonder, looking at it, if there'd be a pep8 way to handle this file.

And I think at least on Mac, what it would generally do is use pylance to go through that stuff. But I wonder what Curse will do on Windows to see if it's compliant with pep8, basically. 

[00:18:37] **Jason Hand:** Okay how do we put it through the ringer? 

[00:18:40] **Ryan MacLean:** We'll find out. I think what you can do here is, normally you'd select it all and then start a chat.

if you hit on the top right there, there's a little sidebar button just to the left of that. That one there. 

[00:18:51] **Jason Hand:** Toggle AI pane. 

[00:18:52] **Ryan MacLean:** I didn't know it was called AI pane. Composer is pretty handy when you want to update your code, seamlessly.

Okay. But the nice thing here is that you didn't need to control or [00:19:00] command A, that entire file to put into context. It knows already that the context, you can see on that first line there, is server. py. So it's got all of this in its context when you're talking to it. Now, on the model that you've got there, I wonder, are you able to pick 3.

7? I'm not sure if I've seen it yet. Oh, and there is a thinking. Okay. There we go. This makes a lot more sense. Gotcha. And then I just say Hey, is this file like PEP8 compliant?

[00:19:22] **Jason Hand:** Okay. So is this file,

P E P. 

[00:19:28] **Ryan MacLean:** And then eight, the number eight. 

[00:19:30] **Jason Hand:** Okay, and then compliant. 

[00:19:32] **Ryan MacLean:** Yeah, I guess that's the thing, but yeah, does it conform to PEP 8? Yeah, that should be fine. And then, yeah, you just hit, I think it's control enter or just What I like about this is a lot of that little, the ergonomics of just doing this kind of stuff is very easy. It doesn't take a lot of work. It's going pretty good, but that is a good failure though. I've yet to see this happen, but I wonder if 3. 7 is pretty popular.

[00:19:58] **Jason Hand:** Yeah, let's do it. Let's try it one more [00:20:00] time. 

[00:20:00] **Ryan MacLean:** It did pretty good though. It did say that, hey, there were some blank lines that you need to remove. There were some that you need to add, which is pretty cool. Overall, it's pretty good, but not there. 

Okay, that's where, what I was hoping you would get to as well is that there are different packages that you can use that aren't part of VS code that may or may not be installed, that it can leverage when it's testing. And PyLance is the one that I was using, but it can do things like run pylint on your code on its own, which is like pretty amazing.

Now up here, you can apply this. And see how you can do it like, incrementally, you can do like little portions of it as well if you don't want to do the entire file. Which is handy, because sometimes it will mess up little pieces of code.

And then, you can see it looks pretty well the same and it's probably just added a space here and there, kind of thing, because Pep8 is rather specific. 

[00:20:45] **Jason Hand:** Yeah, okay. But yeah, you don't get a diff or anything that tells you what 

[00:20:50] **Ryan MacLean:** You do, yeah, if you scroll down, I think in that same window where you applied, you could actually do a diff, was my understanding.

But maybe that's in Composer mode? maybe because it already didn't It might be a [00:21:00] Composer thing, but Composer will give you a diff, and it would be in that same little, dropdown there. Which is pretty handy. 

Run and say yes to all imagine if you're doing, like a yum install or an apt upgrade kind of thing, just YOLO made basically just say yes, say yes to everything, just do it like continue until it runs is a good one. that prompt that you had in the beginning in that you were defining how the app should work.

It looks like when I'm working with cursor, the better way to do it is to define test that should pass A user should be able to open a web page, type in their API key, hit submit, and see that the logs are there would be like a very similar to what you're saying, but phrasing it like a test, and it can continue through that until that is true, which is pretty interesting.

[00:21:42] **Jason Hand:** There's another file that's part of this, the interface. I was going to just see if, should we stick with. Let's see what the reasoning model does. what we could ask it is there anything we can do to make this more accessible? 

[00:21:54] **Ryan MacLean:** There we go, yeah, that's perfect.

[00:21:59] **Jason Hand:** yeah, [00:22:00] anything that can be done to make this, app interface more, accessible. without changing the primary color. I forget the color hex, so we're just going to hope that it can figure out purple. 

[00:22:16] **Ryan MacLean:** I just know it starts with 632. I didn't know the rest of it.

[00:22:19] **Jason Hand:** Oh yeah. I know it when I see it at this point. Let's just go with this. I'm not going to give a lot more specifics. I thought about just saying, not only is there anything, but go ahead and do it, right? 

Don't even ask it like a question about the error and it. It's not a bad presumption that I'd like to get to the bottom of this error, but. 

[00:22:40] **Ryan MacLean:** This is three weeks of meetings right here. 

Even just having a proposal is very handy for this type of problem.

Wow. 

[00:22:51] **Jason Hand:** Okay. Unsurprisingly, it found a lot. 

[00:22:56] **Ryan MacLean:** I'm actually surprised because it's a very simple app. But yeah, there is a [00:23:00] lot in here. 

[00:23:00] **Jason Hand:** I think there are a lot of things that we can do to make things more accessible with the fonts and the colors and the spacing. the question is, Yeah, okay, we've got the apply all, so let's, 

Yeah, so let me. 

[00:23:14] **Ryan MacLean:** OK, so from here you can start the terminal in Cursor. Because it's got a terminal that's similar, but not the same as Warp. Because it has some AI stuff in here as well. 

[00:23:22] **Jason Hand:** Oh wait, we don't want to be in PowerShell though.

[00:23:23] **Ryan MacLean:** In the chat you could actually say, Hey, how do I start my app? And it can tell you and you can run it from there. 

[00:23:29] **Jason Hand:** Okay, so just how do I start my app? 

[00:23:33] **Ryan MacLean:** Yeah. And I wonder because one of the things that I noticed in Warp that it did was allow you to click on stuff to have it start.

Ah, look at that. Pip install. We don't have a requirements. txt, which is a good callout. Because there are some imports at the start of the file there.

But it says we can just do python server py. If you mouse over that, are you able to click it into the terminal? Yeah. Ah, it starts a new terminal, which is that's alright. [00:24:00] 

[00:24:00] **Jason Hand:** That's fine. Yeah. Okay. So yeah, that's what I expected to look like. And then if we come over here and refresh, I think, yeah, so our app is working.

All right. So this is before. And then can we get back 

[00:24:12] **Ryan MacLean:** just scroll up.

It's a lot. Okay. Massive mess. one of 10 changes. 

And it feels like to me, I want to split that terminal out. I haven't tried that yet, but I do a lot in the terminal. So for me, it's mostly the editor of the terminal and the chat interface, and it feels like I want those to almost be windows on their own. Okay. 

[00:24:38] **Jason Hand:** Yeah, I agree. I have the same problem in VS Code too.

[00:24:41] **Ryan MacLean:** Now, does it need to reload or is it hot reloading?

[00:24:44] **Jason Hand:** I am checking. It doesn't look really any different. 

[00:24:48] **Ryan MacLean:** Because I didn't even know hot reloading was a thing, full disclosure. Until I started playing around with JavaScript. It was a bit of an aha moment for me.

[00:24:55] **Jason Hand:** The fact that you could just have the website update as you're editing your code. [00:25:00] It probably needs to restart it. 

let's just kill it, and run it again. 

[00:25:06] **Ryan MacLean:** You can actually grab errors from this console, and add them as context to the chat as well, which is pretty nice.

[00:25:12] **Jason Hand:** Oh, neat. 

[00:25:13] **Ryan MacLean:** Yeah. Super handy. 

[00:25:15] **Jason Hand:** Alright, let's bring this back, and 

Let's see what it changed. Okay, so It looks the same. I wonder if floating in a different browser window would change it. But looking the same is a good thing. 

I don't recall this, this purple highlighter. 

[00:25:30] **Ryan MacLean:** It did say it was changing the highlight, yeah.

[00:25:32] **Jason Hand:** So that's cool. let's start sending some metrics over. Definitely nothing extreme. 

[00:25:40] **Ryan MacLean:** Which is cool.

[00:25:41] **Jason Hand:** Let's go back to the last five minutes or so, and yep. Still works, and it's somehow more accessible. I bet you in the code too, it's a little more clear if we compared. 

[00:25:54] **Ryan MacLean:** Should not be used in production. Oh, interesting. I didn't know that. They don't [00:26:00] want you using their CDN in Prod. That's not a bad call.

[00:26:02] **Jason Hand:** I feel like that's a success. 

[00:26:04] **Ryan MacLean:** Yeah, absolutely. 

[00:26:07] **Jason Hand:** Being able to just say, here's my code, make it better. didn't break anything. 

[00:26:13] **Ryan MacLean:** Now there are a number of editors out there like this, and I think the only thing that came to mind when you were talking about warp, and I didn't want to put this in your brain, but it feels like to me warp is something that is, if there is a Venn diagram of editing, it feels like the terminal's part of the editor now, so like warp would be part of Cursor, which is part of something that uses Sonnet or other large language models, but can also use your docs, that kind of stuff.

But it feels like the editor's, what is it, the Emacs OS kind of thing? Like it's trying to become that entire all singing, all dancing, like start here and don't go anywhere else. Cursor's not there yet. Cursor's not that editor that's like the Emacs operating system yet. But it's awfully close. Like at this point in time, if Cursor could run a VM and click on stuff.

[00:27:00] I would be very interested and it feels like the next step, like we're almost there. 

[00:27:04] **Jason Hand:** And it doesn't feel like it's really that far behind, or that it needs to be that far behind. 

[00:27:07] **Ryan MacLean:** No, they're very fast and updating and adding new stuff, 

[00:27:10] **Jason Hand:** 7 was in there, for example, and that's brand new. Oh yeah. 

And if it's always, you know really going to be closely representing what the latest and greatest that VS Code offers. They're also just piggybacking on great velocity with that tool. 

[00:27:26] **Ryan MacLean:** Because they've changed the way that Copilot works in VS Code as well, which is similar to this now. 

[00:27:30] **Jason Hand:** I've been using VS Code, not a ton, but up until Warp, the Warp Terminal, I've been using it for pretty much everything, but I've been Deliberately avoiding the new GitHub copilot like button and logo and everything because I wanted to save it for a deeper dive.

So I know it's there. I have clicked on it just to see how it would rearrange my screen. But then turn it off because I was like, I'm going to go back. 

[00:27:56] **Ryan MacLean:** The feedback I get from people about VS code in terms of negative is that it's slow or [00:28:00] slower than they expect and some of it's down to, you got 30 extensions installed, when you turn it on, it's going to check for updates.

Some people don't want any AI agent touching their code, that kind of thing. So for them, it's chat window only, please. Don't mess with my stuff, don't be in my terminal I'd rather all that is separate. Some people want it to be part of the whole app, and I think, Cursor's claim to fame on YouTube might be like, I made a full app in five minutes.

So I've heard other people playing with, WindSurf is one, JetBrains has its own kind of, AI stuff, so does Vim, so does Emacs now, so people are trying to use that as well. And then VS Code itself is changing a little bit, so it's, the space, and there's Bolt as well, yeah, the space is changing quite a bit.

There's Replit as well, which is a little bit different. Yeah, we're pretty close to time here. 

[00:28:43] **Jason Hand:** Yeah, I have a hard stop, so we do need to wrap this one up.

Go play with the Warp Terminal, because I just, I want to talk to other people about it, because it's just, I love it.

You get 3. 7 credits for free, 

I need to spend more time with cursor, but I like it so far. It feels very comfortable. Feels just like VS code. [00:29:00] Obviously it does. It seems to be like does a lot of the same stuff that I just demonstrated you can do over and warp.

[00:29:05] **Jason Hand:** So there's the experience is like comfortable already. I know how to have that conversation, so I just need to come up with some more time and some projects to play with. 

[00:29:16] **Ryan MacLean:** For me the thing that I like the most is docs is when I'm doing this stuff it's like a mini rag.

I have the docs for the thing I'm dealing with that I don't understand into this 'cause like, I'm lost. 

[00:29:24] **Jason Hand:** That would've saved me like an hour, I think. Oh, okay. With or because of what I told you. It was just wrong. It got the something wrong out of the docs and I assumed keep going. That it, I just didn't even look that close.

I want to wait until it doesn't work and then I have to get my eyes on it. I don't want to be there from the beginning of the code. I just want to help you troubleshoot. Let's get through this together anyway. So yeah, that was my experience.

And I think if I could have said here's the data dog docs, here's the source of truth at the beginning, I think we could have avoided me being down this path that I spent an hour. 

[00:29:57] **Ryan MacLean:** I find I learned so much about our product just by [00:30:00] adding the docs into Cursor that it seems silly, but it's like we have new docs every day, every week, every month, and I'm always falling behind, so it's awesome for me to be able to have the current source of truth as I'm playing around with stuff.

Alright, we should probably wrap it up there, so for those of you watching, I hope this has been helpful. And we'll see you on the next one. Bye.

