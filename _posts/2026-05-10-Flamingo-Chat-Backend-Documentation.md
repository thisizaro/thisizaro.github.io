---
title: Flamingo Chat — Backend Documentation
featured: true
layout: post
excerpt: >
  This document explains the complete backend architecture, every data flow, every call graph, and every decision made. It is written for someone maintaining or extending the backend.
---

# Flamingo Chat — Backend Documentation

This document explains the complete backend architecture, every data flow, every call graph, and every decision made. It is written for someone maintaining or extending the backend.

---

## Table of Contents

1. [Architecture overview](#1-architecture-overview)
2. [Package responsibilities](#2-package-responsibilities)
3. [Data structures](#3-data-structures)
4. [Startup sequence](#4-startup-sequence)
5. [Call graphs — every event end to end](#5-call-graphs--every-event-end-to-end)
   - [init](#51-init-event)
   - [join_queue](#52-join_queue-event)
   - [send_message](#53-send_message-event)
   - [leave_chat](#54-leave_chat-event)
   - [ping](#55-ping-event)
   - [presence_update (automatic)](#56-presence_update-automatic)
   - [session cleanup (automatic)](#57-session-cleanup-automatic)
6. [The callback system — how layers talk](#6-the-callback-system--how-layers-talk)
7. [Concurrency model](#7-concurrency-model)
8. [The Hub — connection registry](#8-the-hub--connection-registry)
9. [User lifecycle](#9-user-lifecycle)
10. [Session lifecycle](#10-session-lifecycle)
11. [Chat lifecycle](#11-chat-lifecycle)
12. [Matchmaking logic](#12-matchmaking-logic)
13. [Error paths](#13-error-paths)
14. [Known limitations and future work](#14-known-limitations-and-future-work)

---

## 1. Architecture overview

The backend is split into four distinct layers. Each layer has one job and talks only to adjacent layers.

```
┌─────────────────────────────────────────────────────────┐
│                      Browser / Client                   │
└────────────────────────┬────────────────────────────────┘
                         │ WebSocket (JSON bytes)
┌────────────────────────▼────────────────────────────────┐
│              transport/websocket                        │
│   client.go — one per connection, read/write pumps      │
│   hub.go    — registry of all clients, broadcast        │
│                                                         │
│   KNOWS: WebSocket connections, user IDs (after init)   │
│   DOES NOT KNOW: matchmaking, chat, business logic      │
└────────────────────────┬────────────────────────────────┘
                         │ raw bytes + Client pointer
┌────────────────────────▼────────────────────────────────┐
│                       app                               │
│   handler.go — parses events, routes to server methods  │
│                wires all callbacks                      │
│                                                         │
│   KNOWS: event types, server methods, hub methods       │
│   DOES NOT KNOW: WebSocket internals, business logic    │
└────────────────────────┬────────────────────────────────┘
                         │ method calls
┌────────────────────────▼────────────────────────────────┐
│                      server                             │
│   server.go   — all business logic, owns all state      │
│   state.go    — the in-memory maps                      │
│   presence.go — online count calculation                │
│   worker.go   — background cleanup + presence broadcast │
│                                                         │
│   KNOWS: users, sessions, queue, chats                  │
│   DOES NOT KNOW: WebSockets, HTTP, events format        │
└────────────────────────┬────────────────────────────────┘
                         │ method calls
┌────────────────────────▼────────────────────────────────┐
│              domain packages                            │
│   chat/         — Chat, Manager, Message structs        │
│   matchmaking/  — Queue, QueueEntry, FindMatch          │
│   user/         — User, Session structs                 │
│   events/       — event types, payloads, build/parse    │
│                                                         │
│   KNOWS: pure data and logic only                       │
│   DOES NOT KNOW: anything above them                    │
└─────────────────────────────────────────────────────────┘
```

**The rule:** data flows down for logic, and back up through callbacks for responses. The server never imports transport. Transport never imports server directly. The app layer is the only meeting point.

---

## 2. Package responsibilities

### `cmd/server` — entry point
Only file: `main.go`. Creates one instance of each major component, wires them together via `app.Wire()`, starts background workers, registers the HTTP route, and starts the HTTP server. Contains zero business logic.

### `internal/transport/websocket` — dumb pipe
- `client.go` — wraps a single `*websocket.Conn`. Has two goroutines: `readPump` (reads bytes, calls app handler) and `writePump` (reads from a channel, writes bytes to the connection). Nothing else.
- `hub.go` — a registry of `map[userID]*Client`. Exposes `SendToUser` and `Broadcast`. Its `Run()` goroutine is the only thing that touches the map — everything else communicates through channels.

### `internal/app` — the glue
- `handler.go` — one function `HandleMessage` which is the single entry point from transport. Parses the event, switches on type, calls the right server method. Also has `Wire()` which sets up all server callbacks pointing back into the hub.

### `internal/server` — owns all state and logic
- `server.go` — the `Server` struct with all its methods. This is where decisions are made.
- `state.go` — just `State{ Users map, Sessions map }`. No methods.
- `presence.go` — `GetPresenceStats()` counts online users. `BroadcastPresence()` builds the event and fires `OnBroadcast`.
- `worker.go` — two background goroutines: `runCleanup` (every 10s, expires inactive sessions) and `runPresenceBroadcast` (every 5s, calls `BroadcastPresence`).

### `internal/chat`
- `chat.go` — `Chat` struct. `GetOtherUserID` finds the partner given one user's ID.
- `manager.go` — in-memory `map[chatID]*Chat`. CRUD operations: `CreateChat`, `EndChat`, `GetChat`, `RemoveChat`, `SendMessage`.
- `message.go` — `Message` struct. `MessageType` is `"text"` or `"system"`.

### `internal/matchmaking`
- `queue.go` — `Queue` is a slice of `*QueueEntry`. `AddUser`, `RemoveUser`, `RemoveUsers`.
- `matcher.go` — `FindMatch` does an O(n²) scan of the queue looking for a compatible pair.

### `internal/user`
- `user.go` — `User` struct with status constants: `offline → idle → in_queue → in_chat`.
- `session.go` — `Session` struct. Tracks `LastPingAt` for the cleanup worker.

### `internal/events`
- `events.go` — all `EventType` constants and every payload struct.
- `builder.go` — `BuildEvent` serializes to JSON.
- `parser.go` — `ParseEvent` deserializes from JSON.

---

## 3. Data structures

### User
```go
User {
    ID           string    // hex ID e.g. "a3f9c2b1e4d70c88"
    Gender       string    // "male" | "female" — set on join_queue
    Preference   string    // "male" | "female" — set on join_queue
    Status       Status    // offline | idle | in_queue | in_chat
    CreatedAt    time.Time
    LastActiveAt time.Time
    IsBanned     bool      // reserved, not yet used
}
```

### Session
```go
Session {
    ID           string    // session ID (currently same as userID; can be made independent)
    UserID       string    // which user this session belongs to
    SessionToken string    // reserved for future auth
    StartedAt    time.Time
    LastPingAt   time.Time // updated on every ping; used by cleanup worker
    IsActive     bool      // false = disconnected or timed out
}
```

### Chat
```go
Chat {
    ID        string       // random hex ID
    UserIDs   []string     // exactly two user IDs
    Messages  []*Message   // append-only history (in memory only)
    CreatedAt time.Time
    Status    ChatStatus   // "active" | "ended"
}
```

### Message
```go
Message {
    ID          string
    ChatID      string
    SenderID    string
    Content     string
    MessageType MessageType  // "text" | "system"
    CreatedAt   time.Time
}
```

### QueueEntry
```go
QueueEntry {
    UserID     string
    Gender     string
    Preference string
    JoinedAt   time.Time
    Status     QueueStatus  // "waiting" | "matched" | "left"
}
```

### State (server's in-memory store)
```go
State {
    Users    map[string]*User     // keyed by userID
    Sessions map[string]*Session  // keyed by sessionID
}
```

---

## 4. Startup sequence

```
main()
  │
  ├── server.NewServer()
  │     └── initializes State{Users: {}, Sessions: {}}
  │     └── initializes matchmaking.NewQueue()
  │     └── initializes chat.NewManager()
  │
  ├── ws.NewHub()
  │     └── initializes clients map and all channels
  │
  ├── app.New(srv, hub)
  │     └── stores references to server and hub
  │
  ├── application.Wire()
  │     └── sets server.OnMatchFound  → hub.SendToUser (x2)
  │     └── sets server.OnMessage     → hub.SendToUser
  │     └── sets server.OnChatEnded   → hub.SendToUser
  │     └── sets server.OnBroadcast   → hub.Broadcast
  │     └── sets hub.onDisconnect     → server.SetOnline
  │
  ├── srv.StartCleanupWorker()
  │     └── go runCleanup()           (ticks every 10s)
  │     └── go runPresenceBroadcast() (ticks every 5s)
  │
  ├── go hub.Run()
  │     └── starts the hub event loop (select on channels)
  │
  └── http.HandleFunc("/ws", ...)
        └── http.ListenAndServe(":8080", nil)
```

After this, the server is idle — everything else is event-driven.

---

## 5. Call graphs — every event end to end

### 5.1 `init` event

**Trigger:** Client opens WebSocket and sends `{"type":"init","payload":{"user_id":""}}`

```
[Browser] opens WebSocket to /ws
    │
    ▼
http.HandleFunc("/ws") in main.go
    │
    ▼
ws.ServeWS(hub, application.HandleMessage, w, r)
    │
    ├── upgrader.Upgrade(w, r)          — upgrades HTTP → WebSocket
    │
    ├── client := &Client{conn, send: make(chan []byte, 256)}
    │
    ├── hub.register <- client          — tells hub a new client exists
    │     └── hub.Run() receives it, logs "Client connected (pending init)"
    │         (client is NOT in hub.clients yet — no userID)
    │
    ├── go client.writePump()           — starts goroutine: reads from send channel, writes to WebSocket
    │
    └── go client.readPump(app.HandleMessage)  — starts goroutine: reads from WebSocket
          │
          │  [Browser sends init JSON]
          │
          ▼
    client.readPump reads bytes, calls:
          │
          ▼
    app.HandleMessage(client, data)
          │
          ├── events.ParseEvent(data)   — deserializes JSON into *Event
          │
          ├── switch event.Type → "init"
          │
          └── app.handleInit(client, event)
                │
                ├── unmarshalPayload[InitPayload]   — extracts user_id from payload
                │
                ├── server.InitUser(payload.UserID)
                │     │
                │     ├── [if userID == ""] → generate new ID, create User, store in state.Users
                │     ├── [if userID found] → update Status=idle, LastActiveAt=now, return existing User
                │     └── [if userID not found] → log warning, generate new ID, create User
                │
                ├── client.SetUserID(u.ID)          — client now knows its userID
                │
                ├── hub.RegisterUser(u.ID, client)  — client is now in hub.clients map
                │                                     (can now receive targeted messages)
                │
                ├── events.BuildEvent(EventReady, ReadyPayload{UserID: u.ID})
                │
                ├── client.Send(readyData)           — puts bytes on client.send channel
                │     └── writePump picks it up, sends to WebSocket → [Browser receives "ready"]
                │
                └── server.BroadcastPresence()
                      │
                      ├── server.GetPresenceStats()
                      │     └── iterates state.Users, counts non-offline users by gender
                      │
                      ├── events.BuildEvent(EventPresenceUpdate, PresenceUpdatePayload{...})
                      │
                      └── server.OnBroadcast(data)
                            └── hub.Broadcast(data)
                                  └── hub.broadcast <- data
                                        └── hub.Run() iterates ALL hub.clients, calls client.Send(data)
                                              └── writePump sends to each WebSocket
                                                    → [All browsers receive "presence_update"]
```

**Data created:** `User` in `state.Users`. Client registered in `hub.clients`.

**Data returned to client:** `ready` event with userID, then `presence_update` with online counts.

---

### 5.2 `join_queue` event

**Precondition:** Client has already sent `init` and received `ready`.

**Trigger:** `{"type":"join_queue","payload":{"gender":"male","preference":"female"}}`

```
client.readPump reads bytes
    │
    ▼
app.HandleMessage(client, data)
    │
    ├── events.ParseEvent(data)
    │
    ├── switch → "join_queue"
    │
    └── app.handleJoinQueue(client, event)
          │
          ├── client.GetUserID()        — fails fast if empty (not initialized)
          │
          ├── unmarshalPayload[JoinQueuePayload]
          │
          ├── server.SetPreferences(userID, gender, preference)
          │     └── state.Users[userID].Gender = gender
          │     └── state.Users[userID].Preference = preference
          │     └── state.Users[userID].LastActiveAt = now
          │
          ├── server.JoinQueue(userID)
          │     │
          │     ├── [acquire lock]
          │     ├── user.Status = StatusInQueue
          │     ├── user.LastActiveAt = now
          │     ├── queue.AddUser(userID, gender, preference)
          │     │     └── appends QueueEntry{Status: waiting} to queue.entries slice
          │     ├── [release lock]
          │     │
          │     └── server.TryMatch()           ← called WITHOUT lock (important)
          │           │
          │           ├── [acquire lock]
          │           ├── queue.FindMatch()
          │           │     └── O(n²) scan: find pair where a.Preference==b.Gender && b.Preference==a.Gender
          │           │     └── returns (entryA, entryB) or (nil, nil)
          │           │
          │           ├── [if no match] → return
          │           │
          │           ├── [if match found]
          │           │     ├── queue.RemoveUsers(a.UserID, b.UserID)
          │           │     │     └── rebuilds slice excluding both users
          │           │     │
          │           │     ├── userA.Status = StatusInChat
          │           │     ├── userB.Status = StatusInChat
          │           │     │
          │           │     ├── chatID = generateUserID()     — random hex, no collision
          │           │     ├── chats.CreateChat(chatID, [userA.ID, userB.ID])
          │           │     │     └── Chat{ID, UserIDs, Status:active} stored in chats.chats map
          │           │     │
          │           │     └── server.OnMatchFound(userA.ID, userB.ID, chatID)
          │           │           │   [set by app.Wire()]
          │           │           │
          │           │           ├── BuildEvent(EventMatchFound, {chatID, partnerID: userB.ID})
          │           │           ├── hub.SendToUser(userA.ID, dataA)
          │           │           │     └── hub.send <- {userA.ID, dataA}
          │           │           │           └── hub.Run() finds client, calls client.Send(dataA)
          │           │           │                 └── writePump → WebSocket → [UserA gets match_found]
          │           │           │
          │           │           ├── BuildEvent(EventMatchFound, {chatID, partnerID: userA.ID})
          │           │           └── hub.SendToUser(userB.ID, dataB)
          │           │                 └── [UserB gets match_found]
          │           │
          │           └── [release lock]
          │
          ├── events.BuildEvent(EventQueueJoined, nil)
          └── client.Send(ack)
                └── writePump → WebSocket → [Browser gets "queue_joined"]

Note: queue_joined is sent AFTER JoinQueue returns, which is AFTER TryMatch completes.
So if a match is found immediately, the client receives:
  1. "queue_joined"
  2. "match_found"
in that order.
```

**Data created:** `QueueEntry` in queue. Possibly a `Chat` in chat manager.

**State transitions:** User: `idle → in_queue → in_chat` (if matched immediately).

---

### 5.3 `send_message` event

**Precondition:** User is `StatusInChat`, has a valid `chatID`.

**Trigger:** `{"type":"send_message","payload":{"chat_id":"96a3de...","content":"hello"}}`

```
client.readPump reads bytes
    │
    ▼
app.HandleMessage(client, data)
    │
    └── app.handleSendMessage(client, event)
          │
          ├── client.GetUserID()        — guard: must be initialized
          │
          ├── unmarshalPayload[SendMessagePayload]
          │
          └── server.SendMessage(userID, chatID, content, MessageTypeText)
                │
                ├── [acquire lock]
                │
                ├── state.Users[userID]           — verify user exists
                ├── user.Status == StatusInChat   — verify user is in a chat
                │     └── [if not] → log and return, no message sent
                │
                ├── chats.SendMessage(chatID, userID, content, messageType)
                │     │
                │     ├── chats.chats[chatID]     — verify chat exists and is active
                │     ├── Message{ID: timestamp, ChatID, SenderID, Content, Type, CreatedAt}
                │     └── chat.Messages = append(chat.Messages, msg)
                │           (message is persisted in memory for this session)
                │
                ├── chats.GetChat(chatID)          — get the chat room
                ├── chat.GetOtherUserID(userID)    — iterate UserIDs, return the one that isn't sender
                │
                ├── events.BuildEvent(EventMessageReceived, MessageReceivedPayload{
                │         ChatID, SenderID: userID, Content, MessageType
                │   })
                │
                ├── [release lock]
                │
                └── server.OnMessage(receiverID, eventData)
                      │   [set by app.Wire()]
                      └── hub.SendToUser(receiverID, eventData)
                            └── hub.send <- {receiverID, eventData}
                                  └── hub.Run() finds receiver's client
                                        └── client.Send(eventData)
                                              └── writePump → WebSocket
                                                    → [Partner's browser gets "message_received"]

Note: the SENDER gets no acknowledgement. The frontend should add its own
message to the UI optimistically before calling send_message.
```

**Data created:** `Message` appended to `Chat.Messages` in memory.

**Data flow:** sender → server → partner only. Sender gets nothing back.

---

### 5.4 `leave_chat` event

**Trigger:** `{"type":"leave_chat","payload":{"chat_id":"96a3de..."}}`

```
client.readPump reads bytes
    │
    ▼
app.HandleMessage(client, data)
    │
    └── app.handleLeaveChat(client, event)
          │
          ├── client.GetUserID()
          ├── unmarshalPayload[NextPartnerPayload]  — reuses this payload struct (has chat_id)
          │
          └── server.LeaveChat(userID, chatID)
                │
                ├── [acquire lock]
                │
                ├── chats.GetChat(chatID)
                │     └── [if not found] → log and return
                │
                ├── chat.GetOtherUserID(userID)     — find partner
                │
                ├── chats.EndChat(chatID)
                │     └── chat.Status = StatusEnded
                │
                ├── chats.RemoveChat(chatID)
                │     └── delete(chats.chats, chatID)
                │           (chat is gone from memory — messages lost)
                │
                ├── state.Users[userID].Status   = StatusIdle
                ├── state.Users[partnerID].Status = StatusIdle
                │     (both users are now free to join queue again)
                │
                ├── events.BuildEvent(EventChatEnded, {Reason: "partner_left"})
                │
                ├── [release lock]
                │
                └── server.OnChatEnded(partnerID, data)
                      │   [set by app.Wire()]
                      └── hub.SendToUser(partnerID, data)
                            └── hub.send <- {partnerID, data}
                                  └── hub.Run() finds partner's client
                                        └── client.Send(data)
                                              └── writePump → WebSocket
                                                    → [Partner gets "chat_ended"]

The leaving user gets no response — they initiated, so they
already know the chat is over. Handle it on the frontend immediately.
```

**Data destroyed:** `Chat` removed from `chats.chats`. All messages in it are gone.

**State transitions:** Both users: `in_chat → idle`.

---

### 5.5 `ping` event

**Trigger:** `{"type":"ping","payload":null}` — sent by client every ~20 seconds.

```
client.readPump reads bytes
    │
    ▼
app.HandleMessage(client, data)
    │
    └── app.handlePing(client)
          │
          ├── client.GetUserID()
          │
          └── server.SetOnline(userID)
                │
                ├── [acquire lock]
                ├── user.Status = StatusIdle     — resets status if needed
                ├── user.LastActiveAt = now
                └── [release lock]

Note: currently ping does not update Session.LastPingAt — it updates
User.LastActiveAt instead. The cleanup worker checks Session.LastPingAt.
For the worker to recognize pings, you would need to store the sessionID
on the Client and call server.PingSession(sessionID) here instead.
This is a known gap — see section 14.
```

**No response sent.** The purpose is purely to keep the server-side user state fresh.

---

### 5.6 `presence_update` (automatic)

**Trigger:** `runPresenceBroadcast` goroutine ticks every 5 seconds. Also triggered manually after each `init`.

```
worker.go: runPresenceBroadcast()
    │
    └── ticker.C fires every 5 seconds
          │
          ▼
    server.BroadcastPresence()
          │
          ├── server.GetPresenceStats()
          │     │
          │     ├── [acquire lock]
          │     ├── iterate state.Users
          │     │     for each user:
          │     │       if Status != offline: TotalOnline++
          │     │       if Gender == "male":   MaleOnline++
          │     │       if Gender == "female": FemaleOnline++
          │     └── [release lock]
          │
          ├── events.BuildEvent(EventPresenceUpdate, {Total, Male, Female})
          │
          └── server.OnBroadcast(data)
                │   [set by app.Wire()]
                └── hub.Broadcast(data)
                      └── hub.broadcast <- data
                            └── hub.Run() iterates ALL hub.clients
                                  for each client: client.Send(data)
                                    └── writePump → WebSocket
                                          → [Every connected browser gets presence_update]
```

**No input.** Fires automatically. All connected clients receive it simultaneously.

---

### 5.7 Session cleanup (automatic)

**Trigger:** `runCleanup` goroutine ticks every 10 seconds.

```
worker.go: runCleanup()
    │
    └── ticker.C fires every 10 seconds
          │
          ▼
    server.cleanupInactiveSessions()
          │
          ├── [acquire lock]
          │
          ├── iterate state.Sessions
          │     for each session:
          │       if !session.IsActive → skip (already cleaned up)
          │       if now - session.LastPingAt > 30s:
          │         │
          │         ├── session.IsActive = false
          │         │
          │         └── state.Users[session.UserID]:
          │               user.Status = StatusOffline
          │               queue.RemoveUsers(user.ID)
          │               log "[WORKER] Session timed out, user offline: <id>"
          │
          └── [release lock]

Note: if a timed-out user was in a chat, their partner is NOT notified.
The chat entry remains in chats.chats. This is a known bug — see section 14.

WebSocket disconnection (client closes tab, network drops):
    │
    ▼
client.readPump: conn.ReadMessage() returns error
    │
    └── defer runs:
          ├── hub.unregister <- client
          │     └── hub.Run() receives it:
          │           ├── delete(hub.clients, userID)
          │           ├── close(client.send)
          │           │     └── writePump's channel read returns ok=false → writePump exits
          │           └── hub.onDisconnect(userID)
          │                 │   [set by app.Wire()]
          │                 └── server.SetOnline(userID)
          │                       └── user.Status = StatusIdle, LastActiveAt = now
          │
          └── client.conn.Close()
```

---

## 6. The callback system — how layers talk

The server needs to send data back to clients but cannot import the transport package (that would create a circular dependency and break the layering). Callbacks solve this cleanly.

**The server defines function fields:**

```go
type Server struct {
    OnMatchFound func(userAID, userBID, chatID string)
    OnMessage    func(receiverID string, data []byte)
    OnChatEnded  func(userID string, data []byte)
    OnBroadcast  func(data []byte)
}
```

These are `nil` by default. The server calls them like:

```go
if s.OnMatchFound != nil {
    s.OnMatchFound(userA.ID, userB.ID, chatID)
}
```

**The app layer sets them in `Wire()`:**

```go
a.server.OnMatchFound = func(userAID, userBID, chatID string) {
    // build events, call hub.SendToUser
}
```

**Why this is better than interfaces:** For two or three callbacks, function fields are simpler. An interface would require defining a `Notifier` interface, implementing it on Hub or App, and passing it to the server. More code, same result. Function fields are Go-idiomatic for small callback sets.

**The hub uses the same pattern in reverse:**

```go
hub.SetOnDisconnect(func(userID string) {
    server.SetOnline(userID)
})
```

This lets the hub notify the app layer when a client disconnects, without knowing anything about the server.

---

## 7. Concurrency model

The backend has two concurrency strategies, one per component:

### Server — mutex

```go
type Server struct {
    mu sync.Mutex
    // ...
}
```

Every method that reads or writes `state.Users`, `state.Sessions`, `queue`, or `chats` acquires `s.mu` at the start and defers its release. This means only one operation runs on server state at a time.

**Critical rule in `JoinQueue`:**

```go
func (s *Server) JoinQueue(userID string) {
    s.mu.Lock()
    // ... add to queue ...
    s.mu.Unlock()        // ← release BEFORE calling TryMatch

    s.TryMatch()         // ← TryMatch acquires its own lock internally
}
```

`TryMatch` is called without the lock held because it acquires the lock itself. If `JoinQueue` called `TryMatch` while still holding the lock, it would deadlock — `TryMatch` would try to acquire a lock already held by the same goroutine.

### Hub — channel-based single goroutine

```go
func (h *Hub) Run() {
    for {
        select {
        case <-h.register:   ...
        case c := <-h.unregister: ...
        case msg := <-h.send: ...
        case data := <-h.broadcast: ...
        }
    }
}
```

The `hub.clients` map is only ever read or written inside `Run()`. `Run()` is a single goroutine. Therefore, no mutex is needed on the map — there is no concurrent access by design.

External callers communicate with `Run()` through channels:
- `hub.SendToUser(id, data)` → puts a message on `hub.send` channel
- `hub.Broadcast(data)` → puts data on `hub.broadcast` channel
- `hub.RegisterUser(id, client)` → **exception**: writes directly to the map

`RegisterUser` is a known exception. It is called from the app layer (a different goroutine) but writes directly to `hub.clients`. This is safe in the current architecture because `RegisterUser` is always called before any `SendToUser` for a new client, and Go's memory model guarantees that writes are visible after channel operations. At scale you would route this through a channel too.

### Per-client — two goroutines per connection

Each `Client` has:
- `readPump` goroutine: reads from `conn`, calls `onMessage`. Never writes to `conn`.
- `writePump` goroutine: reads from `client.send` channel, writes to `conn`. Never reads from `conn`.

The two goroutines never communicate directly. `writePump` only ever sees data that was put on the `send` channel by `client.Send()`. This means `conn` is never written from two goroutines simultaneously.

---

## 8. The Hub — connection registry

```
hub.clients: map[string]*Client
    "a3f9c2b1" → *Client{conn, send chan}
    "9ed54084" → *Client{conn, send chan}
    "bd70833a" → *Client{conn, send chan}
```

**Timeline of a client in the hub:**

```
1. Client connects
      → hub.register <- client
      → Run() logs "pending init"
      → client NOT in hub.clients yet (no userID)

2. Client sends init, app processes it
      → hub.RegisterUser(userID, client)
      → client IS in hub.clients now
      → can receive targeted messages

3. Client disconnects (tab close, network drop)
      → readPump error → hub.unregister <- client
      → Run() deletes from hub.clients
      → closes client.send channel
      → writePump sees closed channel, exits
      → onDisconnect(userID) called
```

**What happens if a client disconnects before init:**
- `client.GetUserID()` returns `""`
- `hub.unregister` handler checks for empty userID
- closes `client.send` but does not look in `hub.clients`
- no crash, no leak

---

## 9. User lifecycle

```
[not exists]
     │
     │ InitUser("") or InitUser(unknown_id)
     ▼
  [idle]  ←─────────────────────────────────────────────┐
     │                                                   │
     │ JoinQueue()                                       │
     ▼                                                   │
[in_queue]                                               │
     │                                                   │
     │ TryMatch() finds compatible partner               │
     ▼                                                   │
 [in_chat]                                               │
     │                                                   │
     │ LeaveChat() — user leaves                         │
     │ OR                                                │
     │ OnChatEnded — partner leaves                      │
     └───────────────────────────────────────────────────┘
     │
     │ WebSocket disconnects
     ▼
  [idle]   ← SetOnline() called by hub.onDisconnect
     │
     │ Cleanup worker: LastPingAt > 30s
     ▼
 [offline]
```

**Status meanings:**
- `offline` — not connected or timed out. Excluded from presence counts.
- `idle` — connected, doing nothing. Counted as online.
- `in_queue` — waiting for a match. Counted as online.
- `in_chat` — actively chatting. Counted as online.

**User IDs persist for the lifetime of the server process.** Restarting the server clears all users from memory. There is no database persistence.

---

## 10. Session lifecycle

Sessions track the liveness of a WebSocket connection for the cleanup worker. Currently `CreateSession` exists but is not called automatically — this is a known gap (see section 14).

The cleanup worker checks `session.LastPingAt`. If more than 30 seconds have passed since the last ping, the session is marked inactive and the user is set offline.

**Intended flow (not fully wired yet):**
```
Client connects → CreateSession(sessionID, userID, token)
Client sends ping → PingSession(sessionID) → updates LastPingAt
Client silent 30s → cleanupInactiveSessions() marks session inactive, user offline
Client disconnects → DisconnectSession(sessionID) → marks session inactive, user offline
```

---

## 11. Chat lifecycle

```
TryMatch() finds pair
    │
    ├── chats.CreateChat(chatID, [userA, userB])
    │     └── Chat{Status: active} stored in chats.chats map
    │
    │  [messages flow during chat]
    │
    ├── chats.SendMessage(chatID, ...)
    │     └── Message appended to Chat.Messages slice
    │
    └── LeaveChat(userID, chatID)
          ├── chats.EndChat(chatID)   → Chat.Status = ended
          └── chats.RemoveChat(chatID) → deleted from chats.chats map
                                         all messages are lost
```

Messages are stored in `Chat.Messages` during the chat but there is no endpoint to retrieve them. When the chat ends, the chat is deleted and all messages are gone. This is by design — Flamingo Chat is ephemeral.

---

## 12. Matchmaking logic

The queue is a slice `[]*QueueEntry`. `FindMatch` scans it:

```
for i in entries:
    a = entries[i]
    if a.Status != waiting: skip

    for j in entries[i+1:]:
        b = entries[j]
        if b.Status != waiting: skip

        if a.Preference == b.Gender AND b.Preference == a.Gender:
            return (a, b)   ← first compatible pair found

return (nil, nil)
```

**Complexity:** O(n²) where n is the queue length. Fine for small user counts. Would need a smarter index (e.g. separate lists by preference) for thousands of concurrent users.

**Fairness:** First-come-first-matched. Users who joined earlier appear earlier in the slice and are matched first. This is the natural property of a slice-based queue.

**After a match is found:**
```
queue.RemoveUsers(a.UserID, b.UserID)
    └── rebuilds the slice excluding both users
        O(n) scan
```

The matched entries are removed entirely. The `StatusMatched` constant on `QueueEntry` exists but is never set — entries are removed rather than marked. This is fine.

---

## 13. Error paths

### Client sends malformed JSON
```
events.ParseEvent(data) returns error
    → app.sendError(client, "invalid message format")
    → client.Send(error event)
    → client continues connected (not disconnected)
```

### Client sends event before init
```
client.GetUserID() returns ""
    → app.sendError(client, "not initialized — send init first")
    → event is ignored
```

### Client sends send_message but is not in a chat
```
server.SendMessage():
    user.Status != StatusInChat
    → logs "[SERVER] User not in chat"
    → returns without sending
    → no error sent to client (silent failure)
```

### Client sends leave_chat with invalid chat_id
```
server.LeaveChat():
    chats.GetChat(chatID) not found
    → logs "[CHAT] Chat not found"
    → returns
    → no error sent to client
```

### Hub cannot deliver to a user (user disconnected between send and delivery)
```
hub.SendToUser(userID, data):
    hub.send <- msg
    hub.Run(): hub.clients[userID] not found
    → logs "[HUB] No client for userID"
    → data is dropped
```

### Client send buffer full
```
client.Send(data):
    select { case c.send <- data: ... default: }
    → buffer full (256 messages): data dropped
    → logs "[WS] Send buffer full for user: <id>"
    → client.send is not closed here; hub handles cleanup
```

---

## 14. Known limitations and future work

### Ping does not update Session.LastPingAt
`handlePing` calls `server.SetOnline(userID)` which updates `User.LastActiveAt`. But the cleanup worker checks `Session.LastPingAt`. These are different fields. The result: if sessions were being created, pings would not prevent them from timing out.

**Fix:** Store `sessionID` on the `Client` struct. In `handleInit`, call `server.CreateSession(...)` and `client.SetSessionID(sessionID)`. In `handlePing`, call `server.PingSession(client.GetSessionID())`.

### Timed-out users in chats are not handled
If a user is `in_chat` and their session times out (30s no ping), `cleanupInactiveSessions` sets them `offline` but does not end the chat or notify their partner.

**Fix:** In `cleanupInactiveSessions`, after setting a user offline, check if they had an active chat (scan `chats.chats` for their userID), call `LeaveChat` logic, and fire `OnChatEnded` for their partner.

### Hub.RegisterUser is not thread-safe under load
`RegisterUser` writes directly to `hub.clients` from a non-Run goroutine. Safe now because `RegisterUser` always precedes any `SendToUser` for a new client. Under very high concurrency this assumption could break.

**Fix:** Route registration through a channel in `Run()`, same as unregister.

### No database persistence
All state — users, sessions, chats, queue — is in memory. Server restart = all data lost. User IDs stored in clients' localStorage become invalid.

**Fix:** Add a database (e.g. Redis for sessions, PostgreSQL for users) and load state on startup.

### No user banning logic
`User.IsBanned` field exists but is never checked anywhere.

### ChatEndedPayload only has one reason
Currently `reason` is always `"partner_left"`. Future reasons could include `"timeout"`, `"banned"`, `"server_restart"`.

### Messages are not delivered after reconnect
If a user disconnects mid-chat and reconnects, the chat is gone and missed messages are lost. By design for now.