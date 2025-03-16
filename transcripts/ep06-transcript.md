[00:00:00] **Jason Hand:** Hi everyone. In a previous video, I went into a tool called Cursor and explored what you could do with that came up some really fun and interesting things, and you should go watch that video. You can go check that out here at the AI Labs experiments and related tools page that we've set up. I will include a link to this site that you can go look that all up.

Check it out. But for the purposes of this video, what I thought we would do is take cursor to another place and give it another experiment and just see how it handles it. So what I wanted to do today is actually go back into one of the projects that I worked on a long time ago that I just called the vinyl viewer, and we'll open up this.

Repo and the vinyl viewer was just like a weekend project. I did, you can see last updated 10 months ago. So it's been a while. It's nothing more than a JavaScript an HTML and [00:01:00] CSS site. You could stand up yourself and run if you'd like. And I've got it set up running here as a GitHub page so you can actually see it in action.

We can run through the demo and all it is is just displaying these little vinyl platters, these, final disc final records with some text over it. And you can see there's a number for each one. And it's not every one of my records, but it's most of them. It's a lot of them.

I'll have to admit that there's probably a lot more in here than I really need. But I do have quite a few of them and it allows me to click on one and then real quickly look at information about that record. And even listen to a clip so we can Alison Brown there before YouTube takes me down for copyright violations.

But you get the idea here. I can scroll through scroll through everything and check out the records. There's a lot of records here though, so you know, finding something is a little bit of a challenge. And of course I added this search bar at the [00:02:00] top and I have quite a few Frank Zappa records.

So if I just filter out Frank Zappa you can see it. It actually does a pretty good job. It does a great job actually. It shows all of my Frank Zappa records. However, when I click on the record, you can see this is the high woman. That's not Frank Zappa. This is Silver Bullets. Chung's revenge is pulling up.

Watch House Jazz from Hell is pulling up some bluegrass. Something's not quite right with this whole setup. This is pulling up some kings of Leon. So I have some ideas, I have some theories about what's going on, but I've never taken the time to actually track down. Why it's behaving the way it is.

So I thought maybe this could be a job for Cursor. So let's actually pull up Cursor

and I'm already connected to the [00:03:00] Vinyl Viewer project. I got that set up already and. I think all I really want to do, or what I think I need to do is chat with Claude and we're gonna use Claude Sonet thinking 3.7 Sonic thinking. I'm just gonna tell it basically what I just told you, that this application seems to work.

However, there's a problem with search and. I'd like to try to track down what's going on. I feel like that might be a little bit of a tall order, but we're gonna see that's what we're here to do. Okay, so in this project, the app displays the correct results when the user [00:04:00] searches for. Something. However, the user clicks on the image

from the search results, clicks on one of the images I.

A different record is displayed. And what's funny in here is I'm saying record, but I actually mean record. I just don't mean the same record for the record. So a different record is displayed. This is not the desired behavior. How can we.

Figure out the problem [00:05:00] and correct it. So I'm being a little specific slash pedantic. I dunno if pedantic is the right word, but I'm trying to be pretty, pretty detailed in what we're doing here without leading it on too much. And let's just see. Let's see what happens.

So I'm gonna scroll, I'm gonna let it run through just a little bit more. It's coming up with some code fixes, some code changes, I should say. Let's go back. Okay. So we need to diagnose while clicking on a search result shows a different record than what was displayed. Yes. First we need to understand the data flow.

Yeah. Incorrect ID being passed when a user clicks. [00:06:00] Yeah. Caching problems. Yeah. Not sure about race condition. I feel like that's probably not what's going on. Alright. So without seeing the actual code, I'll need to provide a general diagnostic. So I think. I need to let it know that it can look at this code.

Right.

Alright. So it's given me some suggestions on different ways to put in some better debugging, and then it once again says without seeing the specific code, so let's add the code and I wanna say.

If we just give it probably the index file as well as this script js file [00:07:00] found here, we should be good. But it'd be nice if I could just tell it to say this whole thing.

Is the project. I just want you to take a look at the whole directory, but for now we'll keep it to this, although I wonder if images has anything to do with that. I doubt it. I don't. I don't remember if there's anything in there. Okay. These are the primary files with the code that needs to be evaluated.

All right. Okay, here we go. I defined where I dropped it in. So let's an analyze. Looking at the code, I can see the problem. When this user searches, the app creates a new array called filtered data, [00:08:00] containing only the records that match the search. However, when the user clicks on a card, the click handler is using the original JSON data array.

To find the record to display not the filtered data array. That makes sense. All right, so it's saying I can apply this to the index file. Let's go ahead and do that.

Now. The problem is that after filtering the indices in the card container no longer aligned with the indices in the original JSON data array. When you click on a card, the code is determining its position in the card container and then using the index to access the original data, which is incorrect.

The solution is simple. When a user has performed a search, the app should use filter data array. Yeah. Okay. Fixed search results displaying wrong record and click okay. Here's the fix for the existing code of the script file.[00:09:00] 

I'm gonna go ahead and apply that.

What I like about this method, more than like a chat, GPT, is the lack of copying and pasting means less errors. But also anytime you see this like existing code stuff, sometimes it, it gives you like a bunch of blocks. And it's just hard to decipher like where in your existing code that's supposed to go when it just shows existing code.

So this is definitely a much nicer experience. What's happening, the bug occurs because when you search, the app creates a new array called filtered data. However, when you click a cards, looking at the JSON data, the fix mixes, code check, we're currently just fine. Okay, cool. Alright, so we've made these changes.

I'm gonna accept the file, accept the changes there, and let's go ahead and [00:10:00] I need to mark this as safe. Close that and we will add

bug squashing now. Maybe

say bug hunting for now.

And while that's doing its thing, we should be able to pull this up here and

there's nothing really happening. There's no actions. I guess it does have a minor build that takes place.[00:11:00] 

Okay, we'll open this up. So this is our new app here. Everything looks. Looks good.

Okay, now here's the big reveal. Search for Zappa Equipped to the front. Will this be sleep Dirt?

No, it's not sleep dirt. It's Ray Mont. Will this be Chung's revenge? No. Okay. Oh, we got something though. That's a no. Okay. [00:12:00] So we still don't have a fix. Interesting. After all those changes,

all we did was change

the. Script file. Did the index file not get changed?

Let me add the script back in here just for context and make sure. Yeah I'm not real sure I know I said apply all.[00:13:00] 

Okay. It doesn't think there's anything wrong.

I'm go ahead and apply this.

It's odd that it didn't ask me to save anything though.

Okay. Let's apply that.[00:14:00] 

And we'll go ahead and do this, which will be some for some better debugging. We don't wanna do that. That's our secondary backup plan. All right, let's go ahead and accept these changes.

And I believe it still doesn't ship my index files needing to be pushed up, which just doesn't make sense.[00:15:00] 

All right, we'll let this finish building and if we don't have a fix,

I think we will pause.

Okay.

Another thing it does too, I should have said, is it randomizes the order every time. So like Frampton's first here, and then if I refresh it that way, 'cause there's so many of these, like I just didn't wanna [00:16:00] always be looking at the same ones. So the order is always randomized, but they're all there.

Let's see what happens. Oh, hey, look at that. OMG

Act one and two. Hot diggity. Alright, so who else do I have a bunch of stuff from? How about yeah, a couple. Casey Musgraves. How about Ryan Adams got a couple of him. He's got a bunch of him. Excellent. Cool. A different Tony Rise, different Tony's I can also open this up over in disc cogs. So cool.[00:17:00] 

Wow. I can't tell you how good it feels to have that bug squashed. So another win for Cursor helped me fix a 10, 10 month old bug in my website. And yeah, I think that's all I wanted to share. We'll see you next time.

