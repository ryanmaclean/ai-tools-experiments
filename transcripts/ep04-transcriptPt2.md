[00:00:00] **Jason Hand:** Okay, we'll pick up where we left off here. All right, so

I went ahead on my other machine and logged into GitHub and made a few changes to the project so that it is set up for being a GitHub page. And the only thing is because,

because I'm coming with my own workflow file

right here.

I believe I need to just deploy from the branch, from the main branch, which is where that at. 

Anyway, we've got it set up for deploying from the branch.

I only have really just the main branches where I'm just pushing things. 'cause previously just markdown wasn't really anything important here. So I may have to reconsider which [00:01:00] what my branching strategy is. But for now it's just in main and nothing else is set up. I'm not using a custom domain.

I think we're good. I've got my secrets.

And D-D-A-P-I. Key DD app key matches the oops

workflow language, DD API, key DD app Key.

D-D-A-P-K-A-P-I, key DDF Key, everything looks correct as far as I can tell. This is where I'm not so sure because I did get an error when I tried to redeploy, and it was something similar to this step down here. So I'm gonna try to run it again and we'll get the air and then we'll probably feed that into [00:02:00] Claude and see what it thinks we should do.

So here's the original build. Here. You can see similar, what I was talking about. I'm gonna go ahead and just rerun. Develop process knowing it is going to fail

and gimme basically the same thing. But I'm gonna copy this and we're gonna go head back over into Claude.

All right. We've pretty much done all that. Okay, and face this in and see what it thinks.

This is what it means by vibe coding.

So it looks like it is changing some files, changing the workflow file, [00:03:00] or it did change the workflow file. See what it said. I've updated the workflow file with filing changes, okay, from V three to 44. All right, this should fix my error.

Maybe there was a problem with, oh no. This needs to be changed. Okay. Let's have it fix this part.

Oops. I never know if I'm capturing anything. You wanna do that.

All right, so let's set the record there that is not correct, so we'll just get this to fix itself, hopefully. Yep.

Yep. I already fixed that.

Okay. Finished? Yeah. Here's a summary. Updated GitHub actions to correct. Okay? Yep. Okay, so that means we take a look at the code.

We [00:04:00] are changing.

A number of things through out here

and there. Okay, good. Fix the read me file. I forgot about that. Let's go ahead and just add that and add that

and we cross our fingers.

Pull this down. Quick refresh

so far. Oh, why do we have two?

Not sure what happened there, but look at that. Wow.

And a little feedback form him at the bottom. Huh? Color me. Impressed. Look at that. Even hovering, click this, it goes to the

alright, so this pretty impressed. We should probably,

this is my impressed face. That was pretty good. Man. And this is being hosted on GitHub. Okay. But it's pretty in all, does it work as far as the form goes [00:05:00] though? So let's find out

and.

I didn't really. Oh yeah. Okay.

He really was. Okay. See what happens. Submit feedback submitted development mode.

Okay, let's go get Datadog. Bring it back over here.

And go into our logs explorer,

and

what we think happened was that some logs were sent over.

And I don't think I'm gonna be able to spot it that way, but so far I don't see anything. Doesn't mean it didn't work necessarily.

Okay. What should we try now?

I guess I, I would like to see what's happening on the console. Anything weird. Let's clear that out and try one more time.

We will do that. Let's take a look at our console. [00:06:00] Nothing really weird happening in here. It seems as though it went

however I.

No indications of it here. All right, so we got no errors. I'm thinking.

While I'm thinking, I wanna browse around here. I'm deployed. Do I have multiple

flu files? No, just the one. Okay. We could just talk to Claude and say the app is. Deployed and accessible. It looks great. I'm always flattering. Yeah, just in case you never know. It looks great. However, I can't tell if the submission form is working. I'm not [00:07:00] seeing any logs. Reach Datadog.

I am also not seeing anything in the console for logs or errors. How can I verify if data logs are being sent?

What you got? Claude?

So it seems to me it's gonna add some better logging so that when something, if something happening is happening, it's at least gonna be captured and displayed as a console log within the browser.

I am wondering about seeing if we shouldn't just go ahead and instrument more Datadog stuff on here.

But let's not get ahead of ourself. See what this [00:08:00] tells us.

If something's just started showing up in Datadog, that would be amazing, but I'm not totally convinced anything was ever sent.

We'll see what Claude can actualize for us.

This means I don't have to deploy again. I should ask you what it thinks is the easiest way to.

Just run it locally.

Okay. Let's see what we got here. Problem identified browser. Yeah, I wondered about this. Prevent direct. A VI calls to Datadog. Okay.

I guess this is good. This confirms, the problem is that we still need to have some sort of like script to make the API call, and because it's a static page on GitHub pages, they don't really allow for that. So what it's recommended you do or I do, is put a function or a [00:09:00] serverless thing somewhere that the app call, and then that thing actually is what makes the API call with my key and everything, and we could do it with netlify.

Netlify is not a bad. Option because I've already got some stuff running in Netlify.

It did add some better logging.

Okay. So it just wants me to go for, in Netlify it looks like.

Yeah. Okay. Let's then take a look at.

What is it? Trying to, let's see what changes it has in there. Okay, so it's, it did actually update everything and then read me file. Okay. We'll just go ahead and accept all those changes.

Just leave it like that.

It is working, which is main benefit. Okay. Now assuming nothing different [00:10:00] here.

Okay, so at least we got that. Now we got some feedback and in the console we even got some feedback.

All right, so that's all good,

but we still don't have a working site as far as sending anything over into Datadog. So 

I am gonna go ahead and log into Netlify.

Okay, so I'm in Netlify and I believe we will let's go back and read and see. Sign up new site from get.

I just given dify some privileges here. That's my personal one, but where's the.

This isn't the one I want to do.

Where is the one about ai?

All right. What I do need to get is [00:11:00] this.

I just don't understand why.

There's just more. I gotta go in here and

enable.

Yeah. Here we go. Okay, so that one, now we're getting somewhere.

There we go. Okay. Build. We're gonna build off main, build command.

Don't, no, I feel like I can.

Leave all that alone and let's see what happens.

Instructions say,

oh, we know I might have missed something there.

Let's see what happens though. It's building

and it says it's published.

Okay. And look at there

and

pretty straight. Alright, so this is fantastic. . Okay, so that's cool. But. What's going on down [00:12:00] here?

Hold breath. There was a problem submitting your feedback. Please try again.

Okay, so now we're getting some Oh yeah, of course. I don't, I have not provided my

secrets.

Where are secrets stored?

Is this what I'm looking for?

Okay. I guess you can do it like this. All right then. So let me grab

. Okay. Let's go

in here. Put you there. Get back into my keys.

All right. I'm gonna move this over here for just a moment.

And then grab This should be done with that now.

Okay, so bringing this back over right now I've got the API key and the app key, both saved in here as environment [00:13:00] variables.

. Let's see, what's the easiest way to redeploy?

I could just make some changes to the code.

See what that does. Let's do that. 'cause I'm curious if it will pick it up.

So if I change something.

Let's say here.

All right.

I'll just add something like the session. Ryan focused on something simple

and then.

Small change to redeploy.

Okay, this can go up there.

And here we got a new build happening.

Play a game while you're waiting.

Okay. Everything looks successful

and

there's our new website

close. That one doesn't look any different. Three consoles empty,

and if we go all the way to the [00:14:00] bottom.

Hey, look at that. According to this, it actually went through and if we hop over into, in the Datadog, we got our feedback. Look at that.

Use your feedback submission. Alright, so we have a working app.

Thank you for your feedback. Okay. That was pretty much the goal was to get a working functional form set up. Using Datadog as the, service provider for the form. It's not, we don't have, there is no form in Datadog, but I'm just sending logs in and I'm gonna see if I can format those in a way that can do something with 'em.

But yeah, at the end of the day, we successfully, I guess we can. [00:15:00] Talk about what happened there, but I

used Claude Code to create this website, which is currently hosted on Netlify

and I. The repo is in GitHub, and I originally set this up or was trying to set this up so that I could deploy it to a GitHub page to show everything, but it wasn't really working. And the reason is because of some limitations with GitHub pages, with cores CORS. Anyway, long story short talking to co talking to.

Claude code here. It recommended we move to Netlify and we did that. So we pointed the repo, pointed a net. Netlify deployment to that repo. Made some changes, a few changes to the a [00:16:00] few different things, including adding secrets in. This is what it deployed, and created this pretty not bad looking website.

With a page for every episode.

And

so last time we talked about radio a bit and I feel like maybe I, I didn't give. So yeah I'm pretty overall pleased with this and impressed with this, and.

I love that it actually opens things in a new tab for me, which is exactly what the way I'd want to do it. So yeah, let's do it. Let's do one more form submission, some one from Ryan. I.

He was using automatic 1111 last time.

Also a true statement. Let's submit. Thank you for your feedback. And then over on our side and [00:17:00] Datadog. There we go. No, I should probably go in. There's the one from Ryan. I should probably go in and change a few things on some of these fields that are coming over. But that's definitely a V two thing. And I think for the purposes of. This little experiment we can conclude here and call it a win.

And lemme know if you have any questions. Thanks.

