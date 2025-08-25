# Database Seeding

This directory contains the database seeding functionality for MBSPro.

## Usage

### Run Seed Script
```bash
# From root directory
pnpm --filter @mbspro/api seed

# Or from API directory
pnpm seed
```

### Prerequisites
- PostgreSQL running (use `pnpm db:up` from root)
- Environment variables configured (copy `env.example` to `.env`)

## Seed Data

The seed script populates the `mbs_items` table with synthetic MBS data covering:

### Standard Consultations
- **Item 23**: GP consultation (<20 mins, $41.20)
- **Item 36**: Prolonged GP consultation (20-40 mins, $71.70)
- **Item 44**: Extended GP consultation (>40 mins, $105.55)

### Telehealth Services
- **Item 91800**: Video consultation ($41.20, telehealth-specific)

### After-Hours Services
- **Item 597**: After-hours GP consultation ($71.35)
- **Item 598**: After-hours prolonged consultation ($113.75)

### Specialist Services
- **Item 104**: Specialist consultation ($85.55, referral required)

### Health Assessments
- **Item 703**: Health assessment for 40-49 year olds ($234.30)

### Mental Health
- **Item 2712**: GP mental health treatment plan ($286.75)

### Procedures
- **Item 30192**: Skin lesion excision ($143.95)

## Features

- **Idempotent**: Safe to run multiple times
- **Comprehensive**: Covers all required scenarios (standard, telehealth, after-hours)
- **Realistic Data**: Uses actual MBS item codes and fees
- **Relationships**: Includes mutually exclusive items and references
- **Chunked Insertion**: Processes data in chunks for performance
- **Verification**: Confirms data integrity after seeding
