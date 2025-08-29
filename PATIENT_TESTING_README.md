# Patient Testing for MBSPro Rule Engine

This document describes how to use the new patient testing functionality to test the rule engine service with realistic patient data.

## Overview

The patient testing system allows you to:
- Select from predefined test patients with various clinical contexts
- Edit patient details including `last_claimed_items` for frequency testing
- Test rule engine validation with real patient scenarios
- Validate MBS item combinations against patient history and context

## Components

### 1. Patient Data (`/mbspro/data/patient.json`)
Contains 10 test patients with diverse characteristics:
- **Provider Types**: GP, Specialist, NP, Registrar
- **Locations**: clinic, home, nursing_home, hospital
- **Consultation Times**: business hours, after-hours
- **Referral Status**: with/without referrals
- **Selected Codes**: various MBS item combinations
- **Last Claimed Items**: historical claims for frequency limit testing

### 2. Patient Selector Component (`/mbspro/apps/web/components/PatientSelector.tsx`)
React component that provides:
- Patient selection interface
- Patient context editing
- Real-time patient data updates

### 3. Patients API (`/mbspro/apps/api/src/suggest/patients.controller.ts`)
REST endpoint that serves patient data from the JSON file.

## Test Scenarios

The patient data includes several test scenarios:

### Frequency Limit Testing
- **Patient 006 (Lisa Davis)**: Has 3 claims of item "91827" (psychiatrist video attendance) in recent weeks
- **Patient 007 (Robert Taylor)**: Has 3 claims of item "92479"
- **Expected Behavior**: Should trigger frequency limit warnings/blocking for items with frequency rules
- **Note**: Item 91827 has frequency limits (max 50 per calendar year) and requires Specialist + Referral + Video

### After-Hours Rules
- **Patients**: 002, 004, 008 (after-hours consultations)
- **Expected Behavior**: Should pass after-hours validation for appropriate items

### Referral Requirements
- **With Referral**: Patients 002, 005, 007, 010
- **Without Referral**: Patients 001, 003, 004, 006, 008, 009
- **Expected Behavior**: Referral-required items should pass/fail appropriately

### Location Constraints
- **Clinic**: Patients 001, 005, 006, 008, 010
- **Hospital**: Patients 002, 007
- **Nursing Home**: Patient 003
- **Home**: Patients 004, 009
- **Expected Behavior**: Location-specific items should validate correctly

### Provider Type Validation
- **GP**: Patients 001, 004, 006, 008
- **Specialist**: Patients 002, 007
- **NP**: Patients 003, 009
- **Registrar**: Patients 005, 010
- **Expected Behavior**: Specialty-required items should validate against provider type

### Mutual Exclusivity
- **Patients**: 005, 010 (multiple selected codes)
- **Expected Behavior**: Should warn about mutually exclusive code combinations

## Usage

### 1. Start the Application
```bash
# Start the API server
cd mbspro/apps/api
npm run start:dev

# Start the web application
cd mbspro/apps/web
npm run dev
```

### 2. Select a Patient
1. Navigate to the web application
2. Use the Patient Selector to choose a test patient
3. The patient context will be displayed with their details

### 3. Edit Patient Context (Optional)
1. Click "Edit" on any patient card
2. Modify patient details, selected codes, or last claimed items
3. Save changes to update the patient context

### 4. Test Rule Engine
1. Enter clinical notes in the text area
2. Click "Get Suggestions" to test with patient context
3. The rule engine will evaluate items using the patient's context

## API Integration

The patient context is automatically included in API calls:

```typescript
// When a patient is selected, the suggest API receives:
{
  note: "clinical notes...",
  topN: 5,
  selectedCodes: ["23", "721"],
  lastClaimedItems: [
    { code: "23", at: "2024-01-10T14:30:00Z" }
  ],
  providerType: "GP",
  location: "clinic",
  referralPresent: false,
  consultStart: "2024-01-15T09:00:00Z",
  consultEnd: "2024-01-15T09:30:00Z",
  hoursBucket: "business"
}
```

## Testing the Rule Engine

### Frequency Limits
1. **Use Patient 006 (Lisa Davis)**: Has 3 claims of item 91827 (psychiatrist video attendance)
2. **Requirements**: Specialist provider, referral present, video consultation
3. **Expected**: Should show frequency limit warnings (3/50 used in calendar year)
4. **Advanced testing**: Use the test script `node test-frequency-limits.js` for systematic testing
5. **High frequency test**: Create 55+ claims to trigger frequency limit exceeded status

### Location Constraints
Test location-specific items (e.g., hospital-only items) with patients in different locations.

### Provider Type Validation
Test specialty-required items with different provider types.

### Referral Requirements
Test referral-required items with patients who have/do not have referrals.

## Troubleshooting

### Patient Data Not Loading
1. Check that `/mbspro/data/patient.json` exists
2. Verify the API server is running
3. Check browser console for errors

### Rule Engine Not Using Patient Context
1. Ensure a patient is selected before submitting
2. Check that the patient has the required context fields
3. Verify the API request includes patient data

### Frequency Limits Not Working
1. **Use items with actual frequency limit rules**: Not all MBS items have frequency limits
2. **Check item requirements**: Some items require specific provider types, referrals, or conditions
3. **Test with sufficient claims**: Need enough claims to trigger the frequency limit
4. **Use the debug script**: Run `node debug-frequency-test.js` to debug frequency limits step by step
5. **Use the test script**: Run `node test-frequency-limits.js` for systematic testing
6. **Common items with frequency limits**: 91827, 91828, 91829, 91830, 91831, 91837, 91838, 91839, 92437
7. **Note**: The rule engine uses `mbs_rules.normalized.json`, not `mbs_seed.json`

### Test the Patient API
```bash
cd mbspro
node test-patient-api.js
```

## Adding New Test Patients

To add new test patients:

1. Edit `/mbspro/data/patient.json`
2. Add a new patient object with required fields
3. Include relevant test scenarios in the `test_scenarios` section
4. Restart the API server if needed

## Example Test Patient

```json
{
  "id": "patient_011",
  "name": "Test Patient",
  "age": 35,
  "provider_type": "GP",
  "location": "clinic",
  "consult_start": "2024-01-15T10:00:00Z",
  "consult_end": "2024-01-15T10:30:00Z",
  "hours_bucket": "business",
  "referral_present": false,
  "selected_codes": ["23"],
  "last_claimed_items": [
    {
      "code": "23",
      "at": "2024-01-01T10:00:00Z"
    }
  ]
}
```

## Benefits

- **Realistic Testing**: Test with actual patient scenarios
- **Comprehensive Coverage**: Cover various rule engine scenarios
- **Easy Modification**: Edit patient context for different test cases
- **Visual Feedback**: Clear indication of active patient context
- **Integration**: Seamlessly integrated with existing rule engine

This system provides a robust foundation for testing the MBSPro rule engine with realistic patient data and clinical scenarios.
