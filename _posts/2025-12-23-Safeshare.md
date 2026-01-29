---
title: Safeshare Explained
featured: true
layout: post
---

# SafeShare

## Description

SafeShare is a secure file-sharing and access control system that allows users to upload, manage, and share files safely. It features role-based access, audit logging, and a REST API for integration and management.

## Features

- User authentication and role-based access control.
- Secure file upload, download, and sharing.
- Audit logs for all file-related actions.
- REST API with Swagger UI documentation.
- Dockerized deployment for easy setup.

## Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/thisizaro/safeshare_backend.git
   cd safeshare
   ```

2. Set up environment variables in a `.env` file.
3. Build and run Docker containers:

   ```bash
   docker-compose up --build
   ```

4. Access the API at `http://localhost:8000/docs`.

## Usage

- Register as a user and login.
- Upload files and share them with specific users.
- Admin users can view all uploaded files and audit logs.

## Documentation

- [Project Overview](https://github.com/thisizaro/safeshare_backend/blob/main/docs/01_Project_Overview.md)
- [Software Requirements Specification](https://github.com/thisizaro/safeshare_backend/blob/main/docs/02_SRS.md)
- [System Architecture & Design](https://github.com/thisizaro/safeshare_backend/blob/main/docs/03_Architecture_Design.md)
- [Project Plan & Development Standards](https://github.com/thisizaro/safeshare_backend/blob/main/docs/04_Project_Plan.md)
- [Testing & Deployment](https://github.com/thisizaro/safeshare_backend/blob/main/docs/05_Testing_Deployment.md)

## Contributing

1. Fork the repository.
2. Create a new branch for your feature or bugfix.
3. Commit changes with clear messages.
4. Push the branch and create a pull request.

## License

This project is licensed under the MIT License.

## Contact

**Developer:** Aranya Dutta (thisizaro)
**Email:** \[[thisisaro.official@gmail.com](mailto:thisisaro.official@gmail.com)]
