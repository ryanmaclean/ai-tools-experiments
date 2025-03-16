[00:00:00] **Jason Hand:** Okay, so in a previous video I was able to use Cursor to find a bug or bugs in a project I have that helps me keep track of and display, vinyl records that I own. And it worked great. It was a bug I had as part of a my code base for quite some time. And you should go watch the video.

Just to give you a quick run through what it was, is this is just a site that you can view all of my records, although I'm zoomed in a little far here. It looks weird. And. Click on any of 'em. And it's mostly worked. However, used to have this problem that over here in the search bar, if you search for something, like I've got a bunch of Zappa records, and then you go to click on it

it. This one seemed a little weird, but the rest of them it was always just the absolutely the wrong [00:01:00] record. It was pointing to some other data and it would pull up just other records. So anyway I talked to Cursor and we worked out the problem and solution and deployed it. And everything's working great.

And it got me thinking about some other bugs and other projects that I have that maybe we could go look at too. And it reminded me of one in particular that I want to take a look at and see if Cursor can help me solve for also. So in my GitHub repo the Vinyl Viewer project is what we did on the previous one.

This next one I wanna look at is my Ignite Karaoke. And for those of you who aren't familiar with what Ignite Karaoke is it's often. Something that takes place at conferences and unconferences and events where just karaoke people go up in front of others and [00:02:00] perform to a certain degree.

And in this case, they're improvising. Really just a narrative for the image that is on the screen. People that are very creative and and can think on their feet do quite well with this. And it's really quite fun and impressive in a lot of ways. So anyway, I I put together this app to let people play Ignite Karaoke.

You can put it in your own images, whatever. And it's all just done through a web, this web app. So you could host it yourself if you'd like, or, run it locally like this. And I did go ahead because it's just HTML and JavaScript and CSSI did just deploy it to a GitHub page so that you can actually play with it and experience it.

So I'm gonna pull that up here and we'll take a look at this and just see what this thing is. As you can see, just a blank blank screen here. Couple buttons at the top, down here at the bottom might be a little difficult to see, but you can click on trial and that of course will take you to a trial of Datadog.

And then code will take you [00:03:00] back into the repository. So you can grab this. You can see that I've got some, a little bit of animation going on here with my CSS both across this here. It's really busy, which I kinda I wanted it to be that way. Little weird, little gamey. And then the top here was intended to be kinda like fire, like the ignite theme here with the flames.

So I wanted this like flame experience. Thing at the top. It's difficult to do with just simple CSS, but that's what I came up with and it's fine. Now, the way the game works is you can choose between random images or Datadog images. Random images are, is just like what it sounds, play just displays in this case, six, I'm gonna change this to three, but you can do three, six, or nine.

And that's, of course, configurable in the software or in the in the code. And it's gonna just pull up three random images that I can then improvise some sort of narrative around. If I was to choose Datadog. What it'll do is pull up what we call [00:04:00] hero images. Just a, a bunch of different images that we have at Datadog that have showed up in blogs and almost all of them.

If not all of them have some sort of connection to technology or something in the observability space. But anyway, if we just we'll go with random 'cause it's much more fun. And you'll see that, a random image pulls up and it does this sort of soft zoom that some of these images are a little odd, but.

It does this sort of soft zoom effect, the Ken Burns effect is what it's known as, and that actually is perfect, that, that works the way I expect it to. What I don't like is Oh yeah. And so at the end here to it. It shows the images that were displayed as well as the link from where they came. So let's say I don't like this image anymore.

What I can do is I now have the actual image, [00:05:00] URL, so we can go into the configuration file and remove that one from our options. But what I don't like, if we just do it again let's karaoke again. What I don't like is this space up here. So I could never figure out in the CSS where to set my image and have it so that does this kin burns effect, but that it starts somewhere higher on the, in the screen and it doesn't leave all this room up there.

So that's my bug that I want to try to fix and I was gonna see if Cursor could help me with that. So let's let's go ahead and do that and I'm gonna close this and we will need the code for this. So I'm gonna grab the repository there and let's open up cursor. However, I'm going to need, let's go do a new window.

And [00:06:00] we are gonna clone. Our Ignite. Now I'm coming in from, I wanna put it on my Tu, WSL. I'm gonna save it into here

and that's fine. We'll make this a little easier to read for everyone. Okay so this is my project. This is Pull it up. Oops, that is this thing. And , we are going to pop into chat.

And explain what's going on which is pretty similar to what I did in the other video where I asked it to help me find a bug there. I just said here's my code base and here's what I want you to solve for me. And it was pretty much able to do that right away. [00:07:00] So we're gonna add some context here now.

I just wanted to add the whole thing,

but I don't think we can do that. So I think probably the most, the thing that makes the most sense is for sure the index, for sure. The script and for sure the CSS, everything else is probably not really important. I feel like, okay, so we've got index script and style, our main files as the context, and I'm going to explain the problem.

When this app loads an image, the image starts off to far.

Below on the display [00:08:00] and there is, I would guess like 30 pixels. There is 20 to 30 pixels of space near the top. Above the image

and below. I don't know how it's labeled in my CSS, but we'll say below. Below the CSS flame effect. Maybe that can, it can figure out what I'm talking about. 'cause that's what I called it when I remember when I was first creating it, I think. Okay. So I've told her what the problem is.

How can I load the image higher

to avoid?

No, we'll just leave it at that.

Okay. So I. Maybe I'll I'll pop over here just to give you one quick more, one more look at what it's [00:09:00] like currently. So if we'll leave it on random. We'll go with three again. So see this space here,

I, I just can't find a way to make this so that the image loads a little bit further up. I want it to start up a little bit more. Seems like a simple thing, but I struggled with the CSS to figure it out. And so there's always this, there's always been this bar of just wasted space and in some of the images it matters 'cause there's like something at the bottom that I want to see or display.

So anyway, that's that's what we wanna do. And let's see what old sonnet thinking. I thinks we should do about it.

I'll make this a little smaller maybe.

Alright, let's see what it says here.

There's a flame effect at the top of the page. Yeah. Issue is that there's, yeah, I think that's just [00:10:00] repeating what I told it first. The main slideshow, divs up takes up a full viewport. Okay. I remember that.

So it's just proposing what might be the cause of some of these issues. Let's modify the CSS. Sure. It starts right below the flame effect.

Okay. Here's the change you need. Match the flame effect. Remove any defaults. All right, let's go ahead and apply that.

It adds the top 25 pixels, so it's the margin to zero. Okay. All right. What I need to do is,

so this seems to be just a CSS change, which is what I suspected and kinda hoping so update to CSS to fix gap in image. Display port

and we'll push that out.

[00:11:00] While that's doing that, we can go ahead and pop over into GitHub and take a look at the actions. 'cause this will be building, since it's a GitHub page, builds out a new version of the page. We can just delete this one or, close the tab.

Okay, build's done waiting on the deployment. And any second.

Okay. Alright. So far everything looks pretty much the same. Let's go ahead and just do, oh. Oh, this is actually better, but I couldn't click on the other two buttons. We might have created some bugs. Our gap's gone,

but I couldn't change the number of images from six to three. Okay, so we've created one bug. After getting rid of another one.

Whoa.

I wonder let's just let's just talk to, [00:12:00] once this is done here, we'll talk. It's a cursor again. I guess we don't have to wait on it. Kinda wanna see what the end of it looks like though. And, okay. See, I still can't click on the, this button and that button and I can't scroll in here. I can only click on the Let's Karaoke button.

Alright, let's go talk to Cursor about this air, air our grievances with the ai. So

the image loads correctly now, however. I have lost the ability to click any of the other elements [00:13:00] IE buttons, and I don't have to be that specific.

I can only click the Let's carry Okie button.

How do I fix this? Okay. Claude 3.7 Summit Thinking model. What do you got for me?

Okay. The issue is likely related to the element positioning and Z index in your CSS. Okay.

The one thing I like about this, even though it's creating code for me, I haven't like actually written any code. I feel like I'm understanding what's going on a little bit more because it does do a really great job of explaining. What the problems are, what the possible problems are [00:14:00] what what you're gonna try to do to fix 'em, all that kind of stuff.

So I think that's impressive. And even after, it gives you all this, it'll still give you the code that it thinks you need to change. So we're gonna go ahead and apply that code fix. Which is going to set the Z index.

Sure. That all that stuff is working and, okay. No need to save. We

let's see. Now we are fixing button problem.

And we'll close this

check in on our actions.

Okay, our build is finished and the deployment is now ready. That doesn't seem to have done anything. Let me just refresh hard, refresh the browser because that was a problem. There we go.

Okay, so now [00:15:00] let's change this to three and let's karaoke. I.

Yeah. Okay. I think we fixed it.

The image is definitely better. As far as the ga, the gap is gone. I.

Sweet. Let's try one more.

Somebody. Somebody's over there with a banana. Okay.

I would probably be doing that too.

As you can see, these are can be pretty funny when left up to it in your own interpretation. Alright, so that fixed it. We fixed our code. Oh. Did I lose the ability? Oh, don't, no, we're not quite there yet. Shoot, now I can't click the bottom. I've lost my ability. Shoot. We almost didn't catch that one.

Okay, back to cursor.

I can click the other elements now, however, [00:16:00] links in the footer for trial and code. No longer work.

Okay. Let's see. See what it has to think about that. So it's, I wanna just refresh and see what it's like over Yeah, it's the same deal over here too. So what's cursor think? Sounds like we still have a Z index issue.

Okay, we'll go ahead and apply that and accept it. So it's just another change. The CSSZ index stuff, we shall push that up.

Okay, our build is done. Now. We're just waiting on our deployment to finish.

And I'm gonna do a quick ref hard refresh here. I've had to do that before. And there we go. Now I can get into [00:17:00] trial

and code. Oops. Alright, I think we fixed it. Let's do one more.

Some images I've learned might be dead images or could just be that they just take a little while to load. That was one of my favorites, I think.

That's straight up a tv.

Last one. I think I did. Okay. Alright, so I think we've found all of our bugs. Thank you cursor.

This image never loaded, which I should just take out. But by the way, lemme just show you where that's at.

So you'll see at the bottom here, I. Image library. Random images from the images do js ON file and the Datadog random images are from the Datadog. So if you look at the J-J-S-O-N [00:18:00] file and the images folder, oh, sorry, not in there. This one right here, images, JSON, this is where it's getting all of our all of our images from.

And I could go in there and remove, say for example, this. This one here.

Copy that. Let's just go, let's just edit. Edit this file from here. Find

it's right here. Line 19.

Okay. I think we're, I think we're all done here,

Mr. Ai Hands.

There you go. Ignite Karaoke JavaScript version. You'll download it now. Make it your own. The next thing I'll probably do is I don't love, this is another thing too, but if the on these really long URLs, it pushes my image out, but I don't really know what else to do. The whole point is to show the URL that you can copy it.

I'll have to come up with a new way to like [00:19:00] implement copying A URL without showing it, if I'm gonna, if I'm gonna do that. But until then, I think that's all I wanted to show off for this one. We'll see you next time.

