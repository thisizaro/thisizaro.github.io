---
title: WSL2 - The Linux Setup I Had All Along (But Never Used)
featured: true
layout: post
excerpt: >
  I recently started shifting my development workflow to WSL2. I had WSL installed on my laptop for a long time. I never really used it. Recently, I decided to actually explore it.
---
# 

I had WSL installed on my laptop for a long time.

I don’t remember when or why I installed it. Probably while following some tutorial or trying something out. But after installing it, I never really used it. It just sat there.

Recently, I decided to actually explore it.

What I found was surprisingly powerful.

---

## Table of Contents

* [What Even Is WSL2?](#what-even-is-wsl2)
* [Is It a Virtual Machine?](#is-it-a-virtual-machine)
* [How WSL Actually Works (Mental Model)](#how-wsl-actually-works-mental-model)
* [Where Does Linux Live in My System?](#where-does-linux-live-in-my-system)
* [Why I Was Seeing Docker Instead of Linux](#why-i-was-seeing-docker-instead-of-linux)
* [Installing My Own Linux (Ubuntu)](#installing-my-own-linux-ubuntu)
* [Moving WSL from C Drive to D Drive](#moving-wsl-from-c-drive-to-d-drive)
* [Understanding the File System (Windows ↔ Linux)](#understanding-the-file-system-windows--linux)
* [VS Code Integration (This Surprised Me)](#vs-code-integration-this-surprised-me)
* [Running Servers and Accessing Them](#running-servers-and-accessing-them)
* [Windows vs Linux: Where Do I Install Things?](#windows-vs-linux-where-do-i-install-things)
* [Docker and WSL (Important Separation)](#docker-and-wsl-important-separation)
* [The Git Issue I Faced](#the-git-issue-i-faced)
* [Disk Usage and Why It Keeps Growing](#disk-usage-and-why-it-keeps-growing)
* [Root Access and sudo vs su](#root-access-and-sudo-vs-su)
* [What WSL Is Actually Useful For](#what-wsl-is-actually-useful-for)
* [What I Am Planning Next](#what-i-am-planning-next)

---

## What Even Is WSL2?

WSL2 (Windows Subsystem for Linux) lets you run a real Linux environment inside Windows.

Without:

* Dual boot
* VirtualBox
* Restarting your system

It gives you:

* A real Linux kernel
* Full Linux tooling
* Tight integration with Windows

---

## Is It a Virtual Machine?

Short answer: yes, but not like the ones you are used to.

WSL2 uses a lightweight virtual machine powered by Hyper-V.

The difference from VirtualBox:

* No manual RAM/CPU allocation
* Starts instantly
* Shares resources dynamically
* Deep integration with Windows

So you get VM-level isolation with near-native usability.

---

## How WSL Actually Works (Mental Model)

Think of it like this:

```
[ Windows OS ]
      ↓
[ Hyper-V (hidden) ]
      ↓
[ WSL2 lightweight VM ]
      ↓
[ Linux Kernel ]
      ↓
[ Distros (Ubuntu, Docker, etc) ]
```

<!-- <image of architecture diagram here> -->

This mental model cleared most of my confusion.

---

## Where Does Linux Live in My System?

Each WSL distro is stored as a `.vhdx` file.

This is a virtual hard disk containing the entire Linux filesystem.

Example locations:

* Default: inside AppData
* Custom: anywhere you import it (like D drive)

So your “Linux system” is basically a single growing file.

<!-- <image of vhdx storage diagram here> -->

---

## Why I Was Seeing Docker Instead of Linux

When I first opened WSL, I saw:

```
docker-desktop:/#
```

I thought my system was broken.

Turns out:

* Docker Desktop uses WSL internally
* It creates its own Linux distro (`docker-desktop`)
* If no default distro is set, WSL opens that

So I wasn’t in Ubuntu. I was inside Docker’s internal environment.

---

## Installing My Own Linux (Ubuntu)

I installed Ubuntu using:

```
wsl --install -d Ubuntu
```

Then:

* Created a user
* Set password
* Got a proper Linux shell

---

## Moving WSL from C Drive to D Drive

Since C drive space was limited, I moved it:

```
wsl --export Ubuntu D:\WSL\ubuntu.tar
wsl --unregister Ubuntu
wsl --import Ubuntu D:\WSL\Ubuntu D:\WSL\ubuntu.tar --version 2
```

Now my Linux system lives entirely in D:.

---

## Understanding the File System (Windows ↔ Linux)

One of the most useful features:

Windows drives are mounted inside Linux:

* `C:` → `/mnt/c`
* `D:` → `/mnt/d`

So I can do:

```
cd /mnt/d/my-project
```

No copying required.

<!-- <image of file bridge diagram here> -->

---

## VS Code Integration (This Surprised Me)

From inside WSL:

```
code .
```

VS Code opens — using my Windows installation.

What’s happening:

```
VS Code (Windows UI)
        ↓
WSL Extension
        ↓
Linux Environment (runs code)
```

<!-- <image of vscode integration diagram here> -->

So:

* Editor = Windows
* Execution = Linux

---

## Running Servers and Accessing Them

If I run a server in WSL:

```
npm start
```

And it runs on:

```
localhost:3000
```

I can open it directly in my Windows browser.

No configuration needed.

<!-- <image of port forwarding diagram here> -->

---

## Windows vs Linux: Where Do I Install Things?

This was my biggest confusion.

Clear rule:

* Windows apps stay in Windows
* Dev tools go into Linux

### Windows:

* Browser
* VS Code (UI)
* GUI apps

### WSL Linux:

* Node
* Python
* Git
* Backend tools

<!-- <image of tool separation diagram here> -->

Important:
Installing something in Linux does NOT make it available in Windows.

They are separate environments.

---

## Docker and WSL (Important Separation)

Docker uses WSL internally, but:

* It has its own distro (`docker-desktop`)
* It stores data in its own `.vhdx`
* It is separate from Ubuntu

```
Docker Desktop
   ↓
docker-desktop (WSL distro)
   ↓
Containers

Ubuntu (your dev environment)
```

<!-- <image of docker vs ubuntu diagram here> -->

---

## The Git Issue I Faced

Same project, same folder:

* In Windows → clean
* In WSL → tons of changes

This happens because:

* Different line endings (CRLF vs LF)
* Different Git configs
* Different environments

Lesson:
Avoid mixing Git operations across Windows and WSL.

Pick one environment.

---

## Disk Usage and Why It Keeps Growing

WSL uses `.vhdx` files.

Important behavior:

* They grow automatically
* They do NOT shrink automatically

This is why Docker storage suddenly becomes huge.

You need manual compaction to shrink it.

---

## Root Access and sudo vs su

I tried:

```
su
```

It failed.

Because:

* Root password is disabled in WSL

Correct way:

```
sudo <command>
```

---

## What WSL Is Actually Useful For

At first I thought it’s just for learning Linux commands.

It’s not.

It is useful for:

* Backend development
* Running Linux-native tools
* Docker and containers
* Testing environments
* Local servers
* Development workflows

It replaces:

* VirtualBox
* Dual boot setups

---

## What I Am Planning Next

Now that I understand WSL:

* Move dev tools from Windows → Linux
* Clean up C drive
* Use Linux as primary dev environment
* Keep Windows for UI and apps

---

## Final Thought

I had this installed for months.

Never used it.

Turns out, it was one of the most useful tools already sitting in my system.

---

This is Part 1.

Part 2 covers my Git setup and development workflow inside WSL.
