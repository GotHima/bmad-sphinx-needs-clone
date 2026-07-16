---
title: "Sphinx Needs Clone — Next.js MVP"
status: final
created: 2026-07-16
updated: 2026-07-16
---

# Sphinx Needs Clone — Next.js MVP

## 1. Overview

A browser-based requirements management tool that replicates the core Sphinx Needs experience in a modern Next.js web application. Users can create typed requirement objects ("needs"), link them to each other for traceability, and view them in a filterable table. Data is persisted in a local SQLite database.

**Personal project. MVP scope only.**

---

## 2. Problem Statement

Sphinx Needs is powerful but locked to the Sphinx/RST toolchain — it requires Python, a build step, and plain-text file authoring. There is no interactive browser UI for creating and exploring need objects in real time. This project delivers that interactive layer as a lightweight web app.

---

## 3. Users

Single user (the developer/owner). No authentication, no multi-user support.

---

## 4. Functional Requirements

### 4.1 Need Types

**FR-1** The system shall support user-defined need types (e.g., `req`, `spec`, `test`, `impl`).

**FR-2** Each need type shall have: a name, a short prefix (used for ID generation), and a display color.

**FR-3** Need types shall be configurable via a settings page (create, edit, delete).

---

### 4.2 Need CRUD

**FR-4** The system shall allow users to create a need with the following fields:
- `id` — auto-generated from type prefix + sequential counter (e.g., `REQ_001`), editable
- `type` — selected from configured need types
- `title` — short text
- `status` — single string value (default: `open`); user-defined status values configurable in settings
- `tags` — free-form comma-separated list
- `description` — multi-line rich text (plain textarea, no WYSIWYG required for MVP)

**FR-5** The system shall allow users to edit any field of an existing need.

**FR-6** The system shall allow users to delete a need. Deleting a need shall also remove all link references to it from other needs.

**FR-7** IDs shall be globally unique. The system shall prevent saving a need with a duplicate ID.

---

### 4.3 Links (Traceability)

**FR-8** A need shall support outgoing links to one or more other needs by ID.

**FR-9** The system shall automatically compute and display incoming backlinks (which needs link *to* this one).

**FR-10** Links shall be added/removed from the need edit form via an ID search-and-select input.

---

### 4.4 Needs Table View

**FR-11** The system shall display all needs in a sortable, filterable table.

**FR-12** The table shall support filtering by: type, status, tags (any-of), and free-text search across id and title.

**FR-13** Visible columns shall include: ID, Type, Title, Status, Tags, Links (count or IDs).

**FR-14** Clicking a row shall open the need detail/edit view.

---

### 4.5 Data Persistence

**FR-15** All data shall be persisted in a local SQLite database via a Next.js API route layer.

**FR-16** The database shall be created automatically on first run if it does not exist.

---

## 5. Non-Functional Requirements

**NFR-1 Stack:** Next.js (App Router), TypeScript, Tailwind CSS, SQLite via `better-sqlite3`.

**NFR-2 Performance:** Table view shall render up to 500 needs without pagination.

**NFR-3 Deployability:** Must run locally with `npm run dev`. No external services or environment variables required.

**NFR-4 Code quality:** TypeScript strict mode. No `any` types in production code paths.

---

## 6. Out of Scope (MVP)

- Diagrams / flow charts (needflow equivalent)
- `needs.json` import/export
- Multiple link types (only a single generic `links` relationship)
- Versioning or history
- Authentication / multi-user
- Hosted/cloud deployment
- Gantt, pie, or bar chart views
- External integrations (Jira, GitHub)

---

## 7. Success Metrics

The MVP is successful when:
- A need can be created, edited, and deleted end-to-end in the browser.
- Links between needs are visible with backlink computation.
- The table can be filtered to find a specific need in under 3 seconds on a cold load of 100 needs.
- Data survives a server restart (SQLite persistence confirmed).

Counter-metric: MVP is not successful if any of the four operations (create/edit/delete/filter) require touching the database directly or restarting the server.

---

## 8. Open Questions

*None — scope is well-defined for this personal MVP.*
