# Billboards Module

This document provides a comprehensive overview of the Billboards module, including its architecture, API endpoints, and usage examples.

## Table of Contents

- [Billboards Module](#billboards-module)
  - [Table of Contents](#table-of-contents)
  - [Module Overview](#module-overview)
  - [Architecture](#architecture)
  - [API Endpoints](#api-endpoints)
    - [Get Billboards](#get-billboards)
    - [Import Billboards from Excel](#import-billboards-from-excel)
    - [Delete Billboards](#delete-billboards)
  - [Getting Started](#getting-started)
    - [Prerequisites](#prerequisites)
    - [Installation](#installation)
    - [Running the Application](#running-the-application)
  - [Error Handling](#error-handling)

## Module Overview

The Billboards module is a key component of the application, designed to manage and display billboard messages across various organizations. It offers functionalities for retrieving, creating, and deleting billboards, with a primary focus on bulk operations to enhance efficiency. The module is built with a clean architecture, separating concerns into distinct layers for business logic, data access, and API exposure. This modular design ensures maintainability and scalability, making it easy to extend and adapt to future requirements.

A standout feature of the Billboards module is its ability to import data from Excel files, streamlining the process of adding multiple billboards at once. This functionality is particularly useful for administrators who need to manage large volumes of data without manual entry. The module also supports wildcard billboards, which can be broadcast to all organizations, providing a flexible way to communicate important announcements.

## Architecture

The Billboards module follows a clean, domain-driven architecture that separates concerns into four distinct layers:

- **Domain Layer**: This layer contains the core business logic and entities of the module, such as `BillboardsEntity` and `UserBillboardStateEntity`. It is completely independent of other layers and defines the foundational data structures and business rules.

- **Application Layer**: This layer orchestrates the application's use cases and business logic. It contains services like `BillboardsService`, which handles tasks such as retrieving billboards, importing data from Excel, and processing deletions. The application layer also includes commands and queries, following the Command Query Responsibility Segregation (CQRS) pattern to separate read and write operations.

- **Infrastructure Layer**: This layer is responsible for all external-facing concerns, such as database interactions and communication with other services. It includes repositories like `BillboardsRepository` and `UserBillboardsStateRepository`, which handle data persistence and retrieval.

- **Interface Layer**: This layer exposes the module's functionality to the outside world through a well-defined API. It includes controllers like `BillboardController`, which handle incoming HTTP requests, validate data, and delegate tasks to the application layer.

This layered architecture ensures that the module is modular, scalable, and easy to maintain. Each layer has a specific responsibility, and dependencies are managed to flow inward, with the domain layer at the core.

## API Endpoints

The Billboards module exposes the following API endpoints:

### Get Billboards

- **Endpoint**: `GET /api/v1/billboards`
- **Description**: Retrieves a list of billboards for the authenticated user's organization.
- **Response**:
  - `200 OK`: Returns a list of billboards.
- **Example**:
  ```bash
  curl -X GET /api/v1/billboards
  ```

### Import Billboards from Excel

- **Endpoint**: `POST /api/v1/billboards/import`
- **Description**: Imports billboards from an Excel file. The file should contain columns for organization ID and message.
- **Request**:
  - **Headers**: `Content-Type: multipart/form-data`
  - **Body**: An Excel file (`.xlsx`) with the required columns.
- **Response**:
  - `201 Created`: Returns the result of the import operation, including the number of created billboards and any errors.
- **Example**:
  ```bash
  curl -X POST /api/v1/billboards/import \
    -H "Content-Type: multipart/form-data" \
    -F "file=@/path/to/your/file.xlsx"
  ```

### Delete Billboards

- **Endpoint**: `POST /api/v1/billboards/delete`
- **Description**: Deletes billboards in bulk based on the provided organization and billboard IDs.
- **Request**:
  - **Body**: An array of objects, each containing `organizationId` and `billboardId`.
- **Response**:
  - `200 OK`: Returns the outcome of the bulk delete operation, including successes and failures.
- **Example**:
  ```bash
  curl -X POST /api/v1/billboards/delete \
    -H "Content-Type: application/json" \
    -d '[
          {
            "organizationId": "org-123",
            "billboardId": "billboard-456"
          }
        ]'
  ```

## Getting Started

To get started with the Billboards module, follow these steps:

### Prerequisites

- Node.js
- npm or yarn
- MongoDB

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   ```
2. Install dependencies:
   ```bash
   npm install
   ```

### Running the Application

To run the application in development mode, use the following command:

```bash
npm run start:dev
```

## Error Handling

The Billboards module includes robust error handling to ensure a reliable and predictable API. When an error occurs, the API will return a meaningful error message with an appropriate HTTP status code. Common error responses include:

- `400 Bad Request`: Returned when the request payload is invalid or missing required parameters.
- `401 Unauthorized`: Returned when the request is not authenticated.
- `403 Forbidden`: Returned when the authenticated user does not have permission to perform the requested action.
- `404 Not Found`: Returned when the requested resource is not found.
- `500 Internal Server Error`: Returned for unexpected server-side errors.

By following this documentation, you can effectively integrate with and extend the Billboards module.