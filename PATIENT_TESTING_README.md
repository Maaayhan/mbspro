# Patient Testing for MBSPro Rule Engine

This document describes how to use the patient testing functionality to test the rule engine service with realistic patient data.

## Overview

The patient testing system allows you to:
- Select from predefined test patients with various clinical contexts
- Edit patient details including `last_claimed_items` for frequency testing
- Test rule engine validation with real patient scenarios
- Validate MBS item combinations against patient history and context

## Components

### 1. Patient Data (`/mbspro/apps/web/src/hooks/useSupabaseData.ts`)
Contains 7 essential test patients with diverse characteristics:
- **Provider Types**: GP, Specialist, NP, Registrar
- **Locations**: clinic, home, nursing_home, hospital
- **Consultation Times**: business hours, after-hours
- **Referral Status**: with/without referrals
- **Selected Codes**: various MBS item combinations
- **Last Claimed Items**: historical claims for frequency limit testing
- **Medicare Numbers**: Valid Medicare numbers for claim processing

### 2. Patient Selector Component (`/mbspro/apps/web/src/components/PatientSelector.tsx`)
React component that provides:
- Patient selection interface
- Patient context editing
- Real-time patient data updates

### 3. Patient Hooks (`/mbspro/apps/web/src/hooks/useSupabaseData.ts`)
React hooks that provide patient data directly to components without API calls.

## Test Patients

The system includes 7 essential test patients:

1. **Olivia Brown** (Medicare: 3012345678)
   - 34yo GP, clinic, business hours
   - Tests: Standard GP consultation, business hours validation

2. **Liam Smith** (Medicare: 3012345679)
   - 42yo Specialist, hospital, after-hours, with referral
   - Tests: After-hours rules, specialist referral requirements

3. **Charlotte Wilson** (Medicare: 3012345680)
   - 49yo NP, nursing home, business hours
   - Tests: Location-based rules, NP provider type, frequency limits

4. **Margaret Harris** (Medicare: 3012345682)
   - 77yo GP, home visit, after-hours
   - Tests: Home visit rules, after-hours validation, elderly patient

5. **Ethan Taylor** (Medicare: 3012345681)
   - 9yo GP, clinic, business hours
   - Tests: Pediatric patient rules, age-based restrictions

6. **Wei Zhang** (Medicare: 3012345683)
   - 44yo Registrar, clinic, business hours
   - Tests: Registrar provider type validation

7. **Sophie Clarke** (Medicare: 3012345684)
   - 28yo Specialist, clinic, business hours, with referral
   - Tests: Frequency limits (3x 91827 claims), specialist requirements

## Test Scenarios

### Frequency Limit Testing
- **Sophie Clarke**: Has 3 claims of item "91827" (psychiatrist video attendance)
- **Expected Behavior**: Should trigger frequency limit warnings for items with frequency rules
- **Note**: Item 91827 has frequency limits and requires Specialist + Referral

### After-Hours Rules
- **Patients**: Liam Smith, Margaret Harris
- **Expected Behavior**: Should pass after-hours validation for appropriate items

### Referral Requirements
- **With Referral**: Liam Smith, Sophie Clarke
- **Without Referral**: Olivia Brown, Charlotte Wilson, Margaret Harris, Ethan Taylor, Wei Zhang
- **Expected Behavior**: Referral-required items should pass/fail appropriately

### Location Constraints
- **Clinic**: Olivia Brown, Ethan Taylor, Wei Zhang, Sophie Clarke
- **Hospital**: Liam Smith
- **Nursing Home**: Charlotte Wilson
- **Home**: Margaret Harris
- **Expected Behavior**: Location-specific items should validate correctly

### Provider Type Validation
- **GP**: Olivia Brown, Margaret Harris, Ethan Taylor
- **Specialist**: Liam Smith, Sophie Clarke
- **NP**: Charlotte Wilson
- **Registrar**: Wei Zhang
- **Expected Behavior**: Specialty-required items should validate against provider type

### Age-Based Rules
- **Pediatric**: Ethan Taylor (9yo)
- **Adult**: Olivia Brown (34yo), Liam Smith (42yo), Wei Zhang (44yo), Charlotte Wilson (49yo)
- **Elderly**: Margaret Harris (77yo)
- **Expected Behavior**: Age-restricted items should validate correctly

## Usage

### 1. Start the Application
```bash
# Start both frontend and backend
pnpm dev
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
  selectedCodes: ["23"],
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
1. **Use Sophie Clarke**: Has 3 claims of item 91827 (psychiatrist video attendance)
2. **Requirements**: Specialist provider, referral present
3. **Expected**: Should show frequency limit warnings (3/50 used in calendar year)
4. **Advanced testing**: Edit patient to add more claims for testing higher frequencies

### Location Constraints
Test location-specific items (e.g., hospital-only items) with patients in different locations.

### Provider Type Validation
Test specialty-required items with different provider types.

### Referral Requirements
Test referral-required items with patients who have/do not have referrals.

## Troubleshooting

### Patient Data Not Loading
1. Check that `useSupabaseData.ts` contains patient data
2. Verify the React hooks are working correctly
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

### Test the Patient Data
1. Open browser developer tools
2. Navigate to the suggestions page
3. Check that patient selector loads 7 patients
4. Verify patient context appears when selected

## Adding New Test Patients

To add new test patients:

1. Edit `/mbspro/apps/web/src/hooks/useSupabaseData.ts`
2. Add a new patient object to `mockTestPatients` array
3. Include required fields: id, name, age, medicare_number, provider_type, location, etc.
4. Restart the development server

## Example Test Patient

```typescript
{
  id: 'new-patient-uuid',
  name: 'Test Patient',
  age: 35,
  medicare_number: '3012345685',
  provider_type: 'GP',
  location: 'clinic',
  consult_start: '2024-01-15T10:00:00Z',
  consult_end: '2024-01-15T10:30:00Z',
  hours_bucket: 'business',
  referral_present: false,
  selected_codes: ['23'],
  last_claimed_items: [
    { code: '23', at: '2024-01-01T10:00:00Z' }
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
