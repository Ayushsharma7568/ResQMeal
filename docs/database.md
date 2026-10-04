# Database Schema (MongoDB / Mongoose)

This document describes the Mongoose models and their relationships for the "Don't Waste It" food rescue platform.

## Architecture

The project has been migrated from PostgreSQL/Prisma to MongoDB/Mongoose. The models are stored in `backend/src/models/`.

## Collections (Models)

### 1. User
Stores authentication and basic profile data for all types of users.
- `role`: FOOD_PROVIDER | FOOD_SEEKER | VOLUNTEER | ADMIN
- Indexed on `email` and `role`.

### 2. Organization
Stores detailed information for food providers and NGOs.
- **Reference**: Belongs to one `User` (via `userId`).
- `type`: RESTAURANT, HOTEL, NGO, CHARITY, etc.
- Contains the physical address and verification status.

### 3. OrganizationDocument
Stores documents required for verifying organizations (FSSAI licenses, NGO certificates).
- **Reference**: Belongs to one `Organization` (via `organizationId`).
- Includes status workflow: PENDING → VERIFIED | REJECTED.

### 4. FoodListing
Created by Food Providers when they have surplus food.
- **Reference**: Belongs to `User` (provider) (via `providerId`).
- `status`: AVAILABLE → CLAIMED → CONFIRMED → PICKUP_ASSIGNED → PICKED_UP → DELIVERED → COMPLETED.
- **Subdocument**: Contains `foodItems` (array of items with category and quantity).

### 5. FoodClaim
Created by Food Seekers (NGOs) to claim a FoodListing.
- **Reference**: Corresponds to one `FoodListing` (via `foodListingId`).
- **Reference**: Claimed by one `User` (seeker) (via `seekerId`).
- Needs confirmation from the provider.

### 6. PickupRequest
Created for a confirmed FoodClaim to assign a Volunteer.
- **Reference**: Corresponds to one `FoodClaim` (via `foodClaimId`).
- **Reference**: Assigned to one `User` (volunteer) (via `volunteerId`).
- Tracks timestamps for scheduling and pickup completion.

### 7. Delivery
Created when a volunteer successfully picks up the food and is en route to the seeker.
- **Reference**: Corresponds to one `PickupRequest` (via `pickupRequestId`).
- **Reference**: Managed by one `User` (volunteer) (via `volunteerId`).
- Includes receiver details upon successful delivery.

### 8. ImpactMetric
Stores aggregate statistics for the platform dashboard.
- Tracks total rescues, meals served, kg rescued, and CO2 saved.

## Important Workflows & Relationships

1. **Food Provider Flow**:
   User(Provider) → created → Organization → creates → FoodListing (with embedded FoodItems)

2. **Food Seeker Flow**:
   User(Seeker) → finds FoodListing → creates → FoodClaim

3. **Logistics Flow**:
   Confirmed FoodClaim → generates → PickupRequest → accepted by User(Volunteer) → translates to → Delivery → upon completion → updates ImpactMetric

## Setup and Connection

The database connection is managed in `src/config/database.js` using Mongoose. The connection string is read from `MONGODB_URI` in the `.env` file.
