---
title: Moving My Development Setup to WSL2 and Setting Up Git the Right Way
featured: true
layout: post
excerpt: >
  I recently started shifting my development workflow to WSL2. I had already been using Git on Windows for a while, so I assumed things would just work the same way. They did, but not for the reasons I initially thought.
---

I recently started shifting my development workflow to WSL2. I had already been using Git on Windows for a while, so I assumed things would just work the same way. They did, but not for the reasons I initially thought.

This write-up is both a guide and a set of notes for myself. It covers what actually happens when you use Git inside WSL, why SSH matters, and how to set things up properly.

---

## Why WSL in the first place

Working in WSL gives a real Linux environment while still staying inside Windows. Most backend systems, servers, and production environments run on Linux. So using WSL makes the development environment closer to real-world systems.

It also avoids a lot of small inconsistencies that come with Windows-based tooling.

---

## Git was already working without installing it

When I first opened WSL and ran Git commands, they worked even though I had not installed Git inside Linux.

This happens because WSL can access Windows executables. So when I ran:

```bash
git
```

it was actually using the Windows installation of Git from a path like:

```bash
/mnt/c/Program Files/Git/bin/git.exe
```

To confirm which Git is being used:

```bash
which git
```

If it shows something under `/mnt/c/...`, it is using Windows Git. If it shows:

```bash
/usr/bin/git
```

then it is using Linux Git.

---

## Installing Git inside WSL

To properly work in a Linux environment, Git should be installed inside WSL:

```bash
sudo apt update
sudo apt install git
```

After installation, running:

```bash
which git
```

should point to:

```bash
/usr/bin/git
```

This means WSL is now using its own native Git instead of the Windows version.

---

## Why not use Windows Git inside WSL

Even though it works, using Windows Git inside WSL leads to issues:

* slower performance when working with many files
* permission inconsistencies
* line ending problems
* authentication issues

Using Linux Git avoids all of these.

---

## Initial Git configuration

After installing Git in WSL, there is no configuration by default.

Checking:

```bash
git config --global --list
```

may show nothing or even an error if no config file exists.

Basic setup:

```bash
git config --global user.name "Your Name"
git config --global user.email "your@email.com"
git config --global init.defaultBranch main
git config --global core.autocrlf input
```

This creates a global config file at:

```bash
~/.gitconfig
```

---

## Understanding the need for SSH

On Windows, I had been using HTTPS for Git operations:

```bash
https://github.com/username/repo.git
```

This usually works with credential managers, so authentication feels automatic.

In WSL, this approach is less reliable because:

* there is no native Windows credential manager integration
* tokens and credentials can behave inconsistently

SSH provides a cleaner solution.

---

## What SSH actually does

SSH allows authentication without typing a password every time.

Instead of logging in repeatedly, it uses a key pair:

* private key stored on the machine
* public key added to the GitHub account

GitHub verifies identity using this key pair.

---

## Generating SSH keys

To generate a key:

```bash
ssh-keygen -t ed25519
```

This creates:

```bash
~/.ssh/id_ed25519
~/.ssh/id_ed25519.pub
```

* `id_ed25519` is the private key
* `id_ed25519.pub` is the public key

The `.ssh` directory is hidden because Linux hides files that start with a dot.

To see hidden files:

```bash
ls -a
```

---

## Adding the key to GitHub

The public key is copied using:

```bash
cat ~/.ssh/id_ed25519.pub
```

and added to the GitHub account under SSH keys.

---

## First SSH connection

Before using Git over SSH, the key needs to be loaded:

```bash
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_ed25519
```

Then test:

```bash
ssh -T git@github.com
```

The first time, it asks to verify the host. This stores GitHub in:

```bash
~/.ssh/known_hosts
```

After that, a successful message confirms authentication.

---

## What persists and what does not

Some parts of the setup are permanent:

* SSH keys in `~/.ssh`
* Git configuration
* known hosts

However, the SSH agent runs in memory. After restarting WSL, it needs to be started again and the key needs to be added again.

---

## Automating SSH setup

To avoid repeating steps every time, the SSH agent can be started automatically using shell configuration.

For bash, this is done in:

```bash
~/.bashrc
```

Adding:

```bash
if ! pgrep -u "$USER" ssh-agent > /dev/null; then
  eval "$(ssh-agent -s)"
fi

ssh-add -l > /dev/null 2>&1 || ssh-add ~/.ssh/id_ed25519
```

This ensures that every new terminal session has SSH ready.

---

## Shell and configuration

The shell controls which configuration file is used.

To check the current shell:

```bash
echo $SHELL
```

Common shells:

* bash uses `~/.bashrc`
* zsh uses `~/.zshrc`

If switching shells later, this configuration needs to be added to the new shell's config file.

---

## Final workflow

After setup, Git operations should use SSH:

```bash
git clone git@github.com:username/repo.git
git push
git pull
```

No password prompts should appear.

---

## Closing thoughts

Initially, Git working in WSL without installation gave the impression that everything was already set up. In reality, it was relying on Windows tools.

Setting up Git and SSH properly inside WSL creates a clean and predictable environment. It also aligns better with how development environments are structured in real-world systems.

This setup removes friction, especially when working frequently with remote repositories.
