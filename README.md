# Billboards Service

This service manages billboards for organizations. It allows creating, retrieving, and deleting billboards.

## Getting Started

### Prerequisites

- Node.js
- npm or yarn
- MongoDB

### Installation

1.  Clone the repository.
2.  Install the dependencies:
    ```bash
    npm install
    ```
3.  Set up your environment variables. You can copy the `.env.example` file to `.env` and fill in the required values.

### Running the Application

```bash
npm start
```

## API Endpoints

### GET /api/v1/billboards

Returns all active billboards.

### GET /api/v1/billboards/:id

Returns a single billboard by its ID.

### GET /api/v1/billboards/:organizationId

Returns the latest active billboard for a given organization.

### POST /api/v1/billboards/import

Imports billboards from an Excel file. The file should have the following columns:

-   `organizationId`: The ID of the organization.
-   `message`: The message to be displayed on the billboard.

### DELETE /api/v1/billboards/:id

Deletes a billboard by its ID (soft delete).

### POST /api/v1/billboards/:organizationId/dismiss/:id

Allows a user to dismiss a billboard for a specific organization.
