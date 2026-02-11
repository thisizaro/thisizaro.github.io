**Backend Engineer**\
FastAPI • PostgreSQL • Docker • Deployment

I build production-ready backend systems with strong foundations in Linux and systems programming.

My focus areas include:

    - Designing scalable REST APIs
    - Implementing authentication & RBAC systems
    - Structuring relational databases
    - Containerizing and deploying backend services

This site documents my backend projects, engineering notes, and technical explorations.

Here are a few blog posts of mine I wanted to feature:

{% for post in site.posts %}{% if post.featured %}
- [{{ post.title }}]({{ post.url }}) <small>{{ post.date | date_to_long_string }}</small>{% endif %} {% endfor %}
