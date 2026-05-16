---
title: Notes About Concepts in Go.
featured: true
layout: post
excerpt: >
  This document contains my personal notes while learning GO Lang through building a project. 
---
# Notes About Concepts in Go That I Learned While Building a Project

I recently built a real-time anonymous chat application in Go using WebSockets. It was my first serious Go project and also my first time working with real-time systems.

While building it, I came across many backend concepts that I had only heard about before. These are some simple notes about what I learned.

---

# 1. Goroutines

Goroutines are lightweight threads managed by Go.

They allow multiple tasks to run at the same time without manually managing operating system threads.

Example:

```go
go sendMessage()
```

This starts `sendMessage()` in the background while the rest of the program continues running.

In my project, goroutines were used for:

* handling multiple WebSocket connections
* running read and write loops separately
* cleanup workers
* asynchronous metric logging

One thing I learned quickly is that goroutines are easy to create, but once many of them run together, debugging becomes much harder.

---

# 2. Channels

Channels are used for communication between goroutines.

Instead of directly sharing memory, goroutines can pass data through channels.

Sending data:

```go
messages <- "hello"
```

Receiving data:

```go
msg := <-messages
```

In the chat project, channels were heavily used inside the WebSocket hub.

Examples:

* registering clients
* unregistering clients
* broadcasting messages
* routing events

Channels made the flow of communication cleaner and easier to reason about.

---

# 3. Mutexes

When multiple goroutines access shared data at the same time, race conditions can happen.

Mutexes help prevent this by allowing only one goroutine to modify shared state at a time.

Example:

```go
mu.Lock()
users[id] = user
mu.Unlock()
```

I used mutexes around shared structures like:

* users map
* sessions
* chats
* matchmaking queue

At first I used mutexes almost everywhere. Later I realized that too many locks can make code difficult to maintain.

---

# 4. WebSocket Hub Architecture

This was one of the most confusing concepts initially.

I learned that many WebSocket applications use a central `Hub` to manage all active connections.

The hub is responsible for:

* connected clients
* broadcasts
* disconnects
* message routing

Instead of every part of the application touching WebSocket connections directly, everything communicates through the hub.

I also learned why WebSocket systems usually separate reading and writing into two loops:

* `readPump`
* `writePump`

The read loop handles incoming messages.

The write loop handles outgoing messages.

This avoids concurrent writes to the same WebSocket connection.

---

# 5. Event-Driven Systems

While building the project, I realized almost everything could be treated as an event.

Examples:

```txt
join_queue
send_message
match_found
next_partner
chat_ended
```

The frontend sends events to the backend.

The backend processes them and sends new events back.

This approach made the system easier to extend because new features could be added as new event types instead of tightly coupling everything together.

---

# 6. Concurrency Handling

Concurrency is not only about running tasks in parallel.

It is also about managing shared state safely.

Even simple situations became complicated once multiple users interacted with the system simultaneously.

Examples:

* two users joining queue together
* users disconnecting mid-chat
* reconnecting users
* multiple goroutines updating shared maps

This forced me to think carefully about which part of the code owns which data.

---

# 7. Cleanup Workers

In-memory systems can slowly collect stale data if cleanup is ignored.

I added background workers that periodically checked:

* inactive users
* dead sessions
* expired connections

Example:

```go
for {
    time.Sleep(time.Minute)
    cleanupInactiveUsers()
}
```

Without cleanup workers, memory usage and stale state would continue growing over time.

---

# 8. Avoiding Circular Dependencies

At one point my packages became tightly connected.

Example:

```txt
server -> websocket
websocket -> server
```

This caused circular dependency problems.

I learned that transport layers should not contain business logic.

So I separated responsibilities more clearly:

* transport layer for WebSockets
* app layer for coordination
* server layer for business logic

This made the architecture much easier to understand and maintain.

---

# 9. State Machines

Even though I did not explicitly design a formal state machine, the application naturally behaved like one.

Users moved through states like:

```txt
offline
idle
in_queue
in_chat
```

Certain actions were only valid in certain states.

Examples:

* a user in `offline` cannot send messages
* a user already in `in_chat` should not join queue again

Thinking in terms of states helped prevent invalid behavior.

---

# 10. In-Memory Realtime Systems

The entire system currently runs in memory.

This means:

* users
* chats
* queues
* sessions

all exist only inside the running server process.

This makes the application very fast because no database queries are needed for most operations.

But it also means all state disappears if the server restarts.

This taught me an important tradeoff between speed and persistence.

---

# Final Thoughts

This project taught me much more than just Go syntax.

It helped me understand how real-time systems behave internally and why backend architecture matters even in relatively small projects.

Many concepts that looked confusing initially only started making sense after debugging real problems during development.
