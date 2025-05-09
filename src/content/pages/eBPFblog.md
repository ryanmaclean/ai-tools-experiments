# Hands-On with eBPF and AI Tools: Accelerating Kernel-Level Observability

## The Challenge: Bridging Kernel Programming and Rapid Prototyping

When I first set out to learn about eBPF (Extended Berkeley Packet
Filter), my aim wasn't just to understand it in theory but to apply it
in a way that would give me some hands on experience. For many of us the kernel is often over looked and is some what mysterious. And for those of us working in
infrastructure or security, the kernel can feel like an opaque,
intimidating space—one where even seasoned engineers hesitate to
experiment. But the real challenge isn't just the complexity, it's
also the time and expertise required to get something up and 
running.

As I put it in my conversation with Jason Hand, "the best way that I
learn anything is by trying something, seeing if it breaks or if it
actually works when I try to run it." eBPF is especially intriguing because it
lets us interact directly with the operating system kernel, opening
the door to deep observability and control over critical resources
like memory and network interfaces. Yet, for those new to kernel-level
programming—or even seasoned developers short on time—the learning
curve can be steep.

This is where generative AI tools like ChatGPT and GitHub Copilot are
changing the game. Can they help lower the bar for experimentation and
learning with technologies like eBPF?

## Why eBPF Matters: Context and Key Use Cases

At its core, eBPF allows us to run sandboxed programs in the Linux
kernel without modifying source code or loading kernel modules. This
capability is a major leap for observability, security, and
performance tooling. As I explained during our discussion, "eBPF...
works very closely with the kernel of your operating system or your
computer itself, which controls how your computer uses hardware... how
I can control, like how I access memory or the network or anything at
all. It's really cool."

### Suggested Visual: eBPF System Architecture

An effective diagram here would show the application/user space,
kernel space, and hardware layers, highlighting how eBPF programs are
loaded from user space, verified and run in kernel space, and can
attach to system calls, network events, or tracepoints.

### Real-World Applications

At Datadog, we use eBPF across several products, including:

- **Universal Service Monitoring**
- **Cloud Network Monitoring**
- **Security Monitoring**

These leverage eBPF to collect telemetry, trace system calls, and
detect suspicious events with minimal overhead. For students or
professionals curious about security, I often recommend looking up
eBPF—and sometimes even challenge them to do so on the spot. "I often
will ask them if they know about eBPF and if they say no... I ask them
to pull out their phone and then to look up eBPF."

For further reading, the [official eBPF
documentation](https://ebpf.io/) and [Datadog's own
resources](https://www.datadoghq.com/knowledge-center/ebpf/) are excellent starting points.

## Experimenting with eBPF Using Generative AI

My goal for testing what eBPF can do was to monitor critical Linux files—specifically the
`/etc/shadow` file, which stores user privilege information.
Unauthorized changes here are a major security concern. I wanted to
see if I could build a simple eBPF-based monitor for this file with
minimal prior programming experience, primarily using AI-assisted
tooling.

I asked ChatGPT: "write a program to monitor changes to a file (e.g.,
/etc/shadow) on Linux using eBPF." The initial output wasn't perfect,
but it was a starting point. As I explained, "Was it perfect out of
the box? No. Was I able to use another tool, Copilot with GitHub and
VS Studio Code to get it right? 100%."

### Sample Code Snippet (AI-generated and corrected)

```python
#!/usr/bin/env python3 

from bcc import BPF
from time import sleep
import os

# Target path
TARGET_PATH = "/etc/shadow"

# BPF program
bpf_source = """
#include <uapi/linux/ptrace.h>
#include <linux/fs.h>

int trace_write(struct pt_regs *ctx, struct file *file) {
    char filename[256];
    bpf_probe_read_str(&filename, sizeof(filename), file->f_path.dentry->d_name.name);

    if (file->f_path.dentry != NULL) {
        bpf_probe_read_str(&filename, sizeof(filename), file->f_path.dentry->d_name.name);
        if (filename[0] != '\\0') {
            bpf_trace_printk("Write attempt: %s\\n", filename);
        }
    }

    return 0;
}
"""

# Initialize BPF
b = BPF(text=bpf_source)
b.attach_kprobe(event="vfs_write", fn_name="trace_write")

print("Monitoring writes to shadow... Ctrl+C to exit.")
try:
    while True:
        try:
            (task, pid, cpu, flags, ts, msg) = b.trace_fields()
            # Decode the bytes object to a string
            msg = msg.decode('utf-8', errors='replace')  # Replace invalid characters if any
            # Check if "shadow" is in the message
            if "shadow" in msg:
                print(f"ALERT: Possible modification attempt to a critical file! [msg: {msg}]")
        except ValueError:
            # Handle cases where trace_fields() doesn't return valid data
            continue
except KeyboardInterrupt:
    print("Exiting...")
```
*Note: In practice, filtering for `/etc/shadow` and handling
permissions requires additional logic.*

### Debugging with Copilot

After encountering a Python error ("bytes-like object is required, not
string"), I pasted the error into Copilot, which quickly pointed out
the issue and suggested a fix. The process was iterative—tweaking
prompts, making corrections, and learning along the way. As I shared:
"The time savings is almost as important as it lowers the frustration
of searching the web for a solution and sifting through things that
may not be relevant."

## Implementation Process and Key Decisions

The workflow looked like this:

1. **Prompt ChatGPT for a starter script** (Python, using BCC).
2. **Test and note errors** (e.g., type mismatches, missing logic for
file filtering).
3. **Use Copilot for debugging and clarification**; paste errors and
get targeted suggestions.
4. **Iterate quickly**: Modify code, rerun, and observe output.
5. **Manual validation**: Edit `/etc/shadow` (with caution) and verify
immediate detection.

This workflow allowed me, as a self-described "infra guy" and not a
developer, to quickly go from idea to working prototype. I didn't have
to scour Stack Overflow or GitHub issues for hours.

### Trade-Offs and Limitations

- **Security:** This method is *not* suitable for production
monitoring of critical files. As I noted, "Would I rely on this method
to do production level monitoring of critical system files? That would
be a no for that."
- **Code Quality:** The AI-generated code often needs manual
correction and review, especially for security-sensitive tasks.
- **Performance:** eBPF is highly efficient, but naïve scripts may
miss edge cases or introduce unnecessary overhead.

## Results and Observability

The result was a functional script that immediately detected changes
to `/etc/shadow`, printing results in real-time:

> "If I go ahead... and write something silly in the shadow file and then save it, you see that I wrote it because that is the write attempt of shadow, so we know exactly that something happened... That was immediate. It was very much right away."

**Suggested Visual:** Terminal output showing real-time alerts upon
file modification.

While this experiment only scratched the surface—"this much of what we
can do with eBPF"—it demonstrated how AI tooling can enable fast
prototyping and learning.

## Practical Use Cases and Considerations

### Where This Approach Excels

- **Rapid Prototyping:** Quickly testing ideas without programming expertise.
- **Learning by Doing:** "Theory is important but the practical
application helps solidify what you’ve learned."
- **Experimentation:** Exploring new observability or security
concepts in a safe, isolated environment.

### Deployment and Scalability

- **Production Readiness:** For robust, secure deployments, leverage
mature tools (e.g., Datadog's eBPF-powered monitoring) rather than DIY
scripts.
- **Resource Needs:** eBPF's efficiency means minimal CPU and memory
impact, but poorly written programs can affect system stability.
- **Ethics:** Monitoring critical files or TTY activity has privacy
and security implications. Always respect organizational policies and
user consent.

## The Future: AI-Driven Observability and Greener Computing

Looking ahead, the intersection of kernel-level observability and AI
promises even more powerful tools for system monitoring,
troubleshooting, and automation. As I mentioned, "Future innovations I
am interested in with regards to kernel level programming and AI would
be gaining an understanding of how we can better tune AI...not
just in the time it takes to complete a query but more so when it
comes down to the environmental impact."

Possible directions include:

- **AI-optimized programs for minimal energy consumption**
- **Automated anomaly detection on kernel events**
- **Self-healing infrastructure with feedback from kernel telemetry**

Open questions remain around making these tools more accessible,
transparent, and sustainable.

## Recommendations for Getting Started

For those new to eBPF and AI-assisted coding, my advice is simple:
start with hands-on goals. "Have an idea of something you want to
accomplish," and use AI tools like ChatGPT and Copilot to scaffold
your learning. Don't be afraid to experiment—even if you're not a
developer.

For further exploration:

- [eBPF Official Documentation](https://ebpf.io/)
- [Datadog Knowledge Center](https://www.datadoghq.com/knowledge-center/ebpf/)
- [ChatGPT](https://chat.openai.com/chat)
- [GitHub Copilot](https://github.com/features/copilot)

## Final Thoughts

The combination of Cloud Computing, eBPF and AI-powered coding tools has made
kernel-level experimentation more approachable than ever, especially
for those of us without a deep programming background. As I told
Jason, "If you're afraid of doing something, because you're not a
developer such as me... How do I get there?"

The answer: dive in, experiment, and let AI help you bridge the gap.
