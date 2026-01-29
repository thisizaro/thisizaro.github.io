---
title: Projects
layout: contentbase
gh: <span class="fab fa-github fa-lg"></span>
git: <span class="fas fa-code-branch fa-lg"></span>
bb: <span class="fab fa-bitbucket fa-lg"></span>
web: <span class="fas fa-globe fa-lg"></span>
pdf: <span class="fas fa-file-pdf fa-lg"></span>
tw: <span class="fab fa-twitter fa-lg"></span>
---

# Current Projects

These are things I'm actively playing around with (maybe once a week or once
every 6 months).

## CICFlowMeter API

**Tech Stack:** Python • FastAPI • Docker

**Project Link:** [https://github.com/thisizaro/cicflowmeter-docker-api](https://github.com/thisizaro/cicflowmeter-docker-api)

**Blog:** [CICFlowMeter API (Dockerized)](/2026/01/15/cicflowmeter-api/)

- Built a Dockerized REST API to process uploaded PCAP files using CICFlowMeter and return extracted network
  flow features as CSV files.
- Orchestrated execution of Java/Gradle-based CICFlowMeter from a FastAPI service, isolating heavy dependencies
  from the API layer.
- Implemented file handling, ZIP packaging, and controlled single-request execution to support large PCAP analysis
  workloads.
- Exposed interactive API documentation using Swagger UI for easy testing and integration.
- **Technologies:** Python, FastAPI, Docker, Java, Gradle, CICFlowMeter, PCAP, REST API

---

## SafeShare Backend

**Tech Stack:** Python • FastAPI • Cryptography

**Project Link:** [https://github.com/thisizaro/safeshare_backend](https://github.com/thisizaro/safeshare_backend)

**Blog:**

- Developing a secure file-sharing service using FastAPI, implementing JWT (JSON Web Tokens) for stateless
  authentication and Bcrypt for secure password hashing.
- Authored comprehensive technical documentation including SRS, System Architecture, and Testing Plans,
  following industry-standard SDLC practices.
- Designed a Role-Based Access Control (RBAC) system and middleware to protect sensitive API endpoints.
- **Technologies:** Python, FastAPI, JWT, Bcrypt, Docker, Swagger/OpenAPI

---

## KataYomi — Katakana Hover Reader

**Tech Stack:** Chrome Extension • JavaScript

**Project Link:** [https://github.com/thisizaro/KataYomi](https://github.com/thisizaro/KataYomi)

**Blog:**

- Building a lightweight Chrome extension (Manifest V3) to assist Japanese learners by displaying Hiragana readings
  for Katakana text on hover.
- Implemented client-side Katakana detection by traversing DOM text nodes and matching specific Unicode ranges
  (U+30A0–U+30FF).
- Developed a custom translation logic using Unicode offset mapping for fast, dictionary-free conversion.
- Designed a non-intrusive tooltip overlay to display readings without disrupting original page layout.
- **Technologies:** JavaScript, Chrome Extension API, DOM Manipulation, Unicode Processing

---

## KernelTalk

**Tech Stack:** C • Linux Kernel • IPC

**Project Link:**[https://github.com/thisizaro/KernelTalk](https://github.com/thisizaro/KernelTalk)

**Blog:**

- Built a Linux kernel module enabling multi-client terminal-based chat via a custom character device
  (`/dev/kerneltalk`).
- Implemented producer–consumer synchronization using a circular buffer to safely handle concurrent operations.
- Designed blocking and non-blocking I/O behavior to manage message flow across multiple user-space processes.
- Enabled kernel–user space communication using file operations (open, read, write) in C.
- **Technologies:** C, Linux Kernel, IPC, Character Device Drivers
