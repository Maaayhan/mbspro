-- =============================
-- Create organization
-- =============================

INSERT INTO mbs_organizations (name, hpio, phone, address, fhir)
VALUES (
  'Melbourne City Medical Centre',
  '8003621111111111',                        
  '+61 3 9123 4567',
  '100 Collins St, Melbourne VIC 3000, AU',
  '{
    "resourceType": "Organization",
    "id": "org-melbourne-medical",
    "identifier": [
      {"system":"http://ns.electronichealth.net.au/id/hi/hpio/1.0","value":"8003621111111111"}
    ],
    "name": "Melbourne City Medical Centre",
    "telecom": [{"system":"phone","value":"+61 3 9123 4567"}],
    "address": [{
      "line":["100 Collins St"],"city":"Melbourne","state":"VIC","postalCode":"3000","country":"AU"}
    ]
  }'::jsonb
)
RETURNING id;

INSERT INTO mbs_organizations (name, hpio, phone, address, fhir)
VALUES (
  'Royal Melbourne Cardiology Centre',
  '8003622222222222',
  '+61 3 9222 1111',
  '50 Flemington Rd, Parkville VIC 3052, AU',
  '{
    "resourceType": "Organization",
    "id": "org-royal-melbourne-cardiology",
    "identifier": [
      {"system":"http://ns.electronichealth.net.au/id/hi/hpio/1.0","value":"8003622222222222"}
    ],
    "name": "Royal Melbourne Cardiology Centre",
    "telecom": [{"system":"phone","value":"+61 3 9222 1111"}],
    "address": [{
      "line":["50 Flemington Rd"], "city":"Parkville", "state":"VIC", "postalCode":"3052", "country":"AU"
    }]
  }'::jsonb
)
RETURNING id;

-- =============================
-- Create practitioners
-- =============================

-- Dr Emily Johnson (GP)
INSERT INTO mbs_practitioners (full_name, specialty, hpii, phone, organization_id, provider_number, fhir)
VALUES (
  'Dr Emily Johnson', 'General Practice', '8003612222222222', '+61 3 9650 1111', 
  (SELECT id FROM mbs_organizations WHERE name = 'Melbourne City Medical Centre' LIMIT 1),
  '456789A',
  '{
    "resourceType":"Practitioner",
    "id":"prac-emily-johnson",
    "identifier":[
      {"system":"http://ns.electronichealth.net.au/id/hi/hpii/1.0","value":"8003612222222222"}
    ],
    "name":[{"family":"Johnson","given":["Emily"],"prefix":["Dr"]}],
    "qualification":[{"code":{"text":"FRACGP"}}],
    "telecom":[{"system":"phone","value":"+61 3 9650 1111"}]
  }'::jsonb
);

-- Dr Daniel Wright (GP)
INSERT INTO mbs_practitioners (full_name, specialty, hpii, phone, organization_id, provider_number, fhir)
VALUES (
  'Dr Daniel Wright', 'General Practice', '8003613333333333', '+61 3 9650 2222', 
  (SELECT id FROM mbs_organizations WHERE name = 'Melbourne City Medical Centre' LIMIT 1),
  '456790B',
  '{
    "resourceType":"Practitioner",
    "id":"prac-daniel-wright",
    "identifier":[
      {"system":"http://ns.electronichealth.net.au/id/hi/hpii/1.0","value":"8003613333333333"}
    ],
    "name":[{"family":"Wright","given":["Daniel"],"prefix":["Dr"]}],
    "qualification":[{"code":{"text":"MBBS, FRACGP"}}],
    "telecom":[{"system":"phone","value":"+61 3 9650 2222"}]
  }'::jsonb
);

-- Nurse Practitioner（护理计划常见参与者）
INSERT INTO mbs_practitioners (full_name, specialty, hpii, phone, organization_id, provider_number, fhir)
VALUES (
  'Mia Collins, NP', 'Nurse Practitioner', '8003614444444444', '+61 3 9650 3333',
  (SELECT id FROM mbs_organizations WHERE name = 'Melbourne City Medical Centre' LIMIT 1),
  '456791C',
  '{
    "resourceType":"Practitioner",
    "id":"prac-mia-collins-np",
    "identifier":[{"system":"http://ns.electronichealth.net.au/id/hi/hpii/1.0","value":"8003614444444444"}],
    "name":[{"family":"Collins","given":["Mia"]}],
    "qualification":[{"code":{"text":"Nurse Practitioner"}}],
    "telecom":[{"system":"phone","value":"+61 3 9650 3333"}]
  }'::jsonb
);

-- Cardiologist（心内科）
INSERT INTO mbs_practitioners (full_name, specialty, hpii, phone, organization_id, provider_number, fhir)
VALUES (
  'Dr Priya Patel', 'Cardiology', '8003615555555555', '+61 3 9650 4444', 
  (SELECT id FROM mbs_organizations WHERE name = 'Royal Melbourne Cardiology Centre' LIMIT 1),
  '456792D',
  '{
    "resourceType":"Practitioner",
    "id":"prac-priya-patel-cardiology",
    "identifier":[{"system":"http://ns.electronichealth.net.au/id/hi/hpii/1.0","value":"8003615555555555"}],
    "name":[{"family":"Patel","given":["Priya"],"prefix":["Dr"]}],
    "qualification":[{"code":{"text":"FRACP (Cardiology)"}}],
    "telecom":[{"system":"phone","value":"+61 3 9650 4444"}]
  }'::jsonb
);

-- Respiratory & Sleep（呼吸与睡眠）
INSERT INTO mbs_practitioners (full_name, specialty, hpii, phone, organization_id, provider_number, fhir)
VALUES (
  'Dr Ahmed Youssef', 'Respiratory & Sleep', '8003616666666666', '+61 3 9650 5555', 
  (SELECT id FROM mbs_organizations WHERE name = 'Royal Melbourne Cardiology Centre' LIMIT 1),
  '456793E',
  '{
    "resourceType":"Practitioner",
    "id":"prac-ahmed-youssef-resp-sleep",
    "identifier":[{"system":"http://ns.electronichealth.net.au/id/hi/hpii/1.0","value":"8003616666666666"}],
    "name":[{"family":"Youssef","given":["Ahmed"],"prefix":["Dr"]}],
    "qualification":[{"code":{"text":"FRACP (Respiratory & Sleep)"}}],
    "telecom":[{"system":"phone","value":"+61 3 9650 5555"}]
  }'::jsonb
);

-- Obstetrics & Gynaecology（产科/妇科）
INSERT INTO mbs_practitioners (full_name, specialty, hpii, phone, organization_id, provider_number, fhir)
VALUES (
  'Dr Sarah Nguyen', 'Obstetrics & Gynaecology', '8003617777777777', '+61 3 9650 6666',
  (SELECT id FROM mbs_organizations WHERE name = 'Royal Melbourne Cardiology Centre' LIMIT 1),
  '456794F',
  '{
    "resourceType":"Practitioner",
    "id":"prac-sarah-nguyen-obgyn",
    "identifier":[{"system":"http://ns.electronichealth.net.au/id/hi/hpii/1.0","value":"8003617777777777"}],
    "name":[{"family":"Nguyen","given":["Sarah"],"prefix":["Dr"]}],
    "qualification":[{"code":{"text":"FRANZCOG"}}],
    "telecom":[{"system":"phone","value":"+61 3 9650 6666"}]
  }'::jsonb
);

-- Clinical Psychologist（临床心理）
INSERT INTO mbs_practitioners (full_name, specialty, hpii, phone, organization_id, provider_number, fhir)
VALUES (
  'Grace Thompson, MPsych(Clin)', 'Clinical Psychology', '8003618888888888', '+61 3 9650 7777',
  (SELECT id FROM mbs_organizations WHERE name = 'Royal Melbourne Cardiology Centre' LIMIT 1),
  '456795G',
  '{
    "resourceType":"Practitioner",
    "id":"prac-grace-thompson-clin-psych",
    "identifier":[{"system":"http://ns.electronichealth.net.au/id/hi/hpii/1.0","value":"8003618888888888"}],
    "name":[{"family":"Thompson","given":["Grace"]}],
    "qualification":[{"code":{"text":"MPsych(Clin), AHPRA Registered"}}],
    "telecom":[{"system":"phone","value":"+61 3 9650 7777"}]
  }'::jsonb
);

-- Dietitian（营养师，APD）
INSERT INTO mbs_practitioners (full_name, specialty, hpii, phone, organization_id, provider_number, fhir)
VALUES (
  'Emily Park, APD', 'Dietetics', '8003619999999999', '+61 3 9650 8888',
  (SELECT id FROM mbs_organizations WHERE name = 'Royal Melbourne Cardiology Centre' LIMIT 1),
  '456796H',
  '{
    "resourceType":"Practitioner",
    "id":"prac-emily-park-dietitian",
    "identifier":[{"system":"http://ns.electronichealth.net.au/id/hi/hpii/1.0","value":"8003619999999999"}],
    "name":[{"family":"Park","given":["Emily"]}],
    "qualification":[{"code":{"text":"APD (Accredited Practising Dietitian)"}}],
    "telecom":[{"system":"phone","value":"+61 3 9650 8888"}]
  }'::jsonb
);

-- =============================
-- Create patients
-- =============================

-- Olivia Brown (普通门诊)
INSERT INTO mbs_patients (
  full_name, gender, dob, medicare_number, phone, address, managing_org_id, gp_id, fhir
)
VALUES (
  'Olivia Brown', 'female', '1990-04-18', '3012345678', '+61 3 9666 1234',
  '50 Swanston St, Melbourne VIC 3000, AU',
  (SELECT id FROM mbs_organizations LIMIT 1),
  (SELECT id FROM mbs_practitioners WHERE full_name = 'Dr Emily Johnson' LIMIT 1),
  '{
    "resourceType":"Patient",
    "id":"pat-olivia-brown",
    "identifier":[{"system":"http://ns.electronichealth.net.au/id/medicare-number","value":"3012345678"}],
    "name":[{"family":"Brown","given":["Olivia"]}],
    "gender":"female",
    "birthDate":"1990-04-18",
    "telecom":[{"system":"phone","value":"+61 3 9666 1234"}],
    "address":[{"line":["50 Swanston St"],"city":"Melbourne","state":"VIC","postalCode":"3000","country":"AU"}],
    "generalPractitioner":[{"reference":"Practitioner/prac-emily-johnson"}],
    "managingOrganization":{"reference":"Organization/org-melbourne-medical"}
  }'::jsonb
);

-- Liam Smith (慢病随访)
INSERT INTO mbs_patients (
  full_name, gender, dob, medicare_number, phone, address, managing_org_id, gp_id, fhir
)
VALUES (
  'Liam Smith', 'male', '1982-09-05', '3012345679', '+61 3 9666 2345',
  '200 Bourke St, Melbourne VIC 3000, AU',
  (SELECT id FROM mbs_organizations LIMIT 1),
  (SELECT id FROM mbs_practitioners WHERE full_name = 'Dr Emily Johnson' LIMIT 1),
  '{
    "resourceType":"Patient",
    "id":"pat-liam-smith",
    "identifier":[{"system":"http://ns.electronichealth.net.au/id/medicare-number","value":"3012345679"}],
    "name":[{"family":"Smith","given":["Liam"]}],
    "gender":"male",
    "birthDate":"1982-09-05",
    "telecom":[{"system":"phone","value":"+61 3 9666 2345"}],
    "address":[{"line":["200 Bourke St"],"city":"Melbourne","state":"VIC","postalCode":"3000","country":"AU"}],
    "generalPractitioner":[{"reference":"Practitioner/prac-emily-johnson"}],
    "managingOrganization":{"reference":"Organization/org-melbourne-medical"}
  }'::jsonb
);

-- Charlotte Wilson
INSERT INTO mbs_patients (
  full_name, gender, dob, medicare_number, phone, address, managing_org_id, gp_id, fhir
)
VALUES (
  'Charlotte Wilson', 'female', '1975-11-22', '3012345680', '+61 3 9666 3456',
  '75 Lonsdale St, Melbourne VIC 3000, AU',
  (SELECT id FROM mbs_organizations LIMIT 1),
  (SELECT id FROM mbs_practitioners WHERE full_name = 'Dr Daniel Wright' LIMIT 1),
  '{
    "resourceType":"Patient",
    "id":"pat-charlotte-wilson",
    "identifier":[{"system":"http://ns.electronichealth.net.au/id/medicare-number","value":"3012345680"}],
    "name":[{"family":"Wilson","given":["Charlotte"]}],
    "gender":"female",
    "birthDate":"1975-11-22",
    "telecom":[{"system":"phone","value":"+61 3 9666 3456"}],
    "address":[{"line":["75 Lonsdale St"],"city":"Melbourne","state":"VIC","postalCode":"3000","country":"AU"}],
    "generalPractitioner":[{"reference":"Practitioner/prac-daniel-wright"}],
    "managingOrganization":{"reference":"Organization/org-melbourne-medical"}
  }'::jsonb
);

-- Ethan Taylor (儿童，哮喘)
INSERT INTO mbs_patients (
  full_name, gender, dob, medicare_number, phone, address, managing_org_id, gp_id, fhir
)
VALUES (
  'Ethan Taylor', 'male', '2015-06-10', '3012345681', '+61 3 9666 4567',
  '12 Flinders St, Melbourne VIC 3000, AU',
  (SELECT id FROM mbs_organizations LIMIT 1),
  (SELECT id FROM mbs_practitioners WHERE full_name = 'Dr Emily Johnson' LIMIT 1),
  '{
    "resourceType":"Patient",
    "id":"pat-ethan-taylor",
    "identifier":[{"system":"http://ns.electronichealth.net.au/id/medicare-number","value":"3012345681"}],
    "name":[{"family":"Taylor","given":["Ethan"]}],
    "gender":"male",
    "birthDate":"2015-06-10",
    "telecom":[{"system":"phone","value":"+61 3 9666 4567"}],
    "address":[{"line":["12 Flinders St"],"city":"Melbourne","state":"VIC","postalCode":"3000","country":"AU"}],
    "generalPractitioner":[{"reference":"Practitioner/prac-emily-johnson"}],
    "managingOrganization":{"reference":"Organization/org-melbourne-medical"},
    "extension":[{"url":"http://hl7.org/fhir/StructureDefinition/patient-interpreterRequired","valueBoolean":false}],
    "condition":[{"code":{"text":"Asthma"}}]
  }'::jsonb
);

-- Margaret Harris (老年人，多病共存)
INSERT INTO mbs_patients (
  full_name, gender, dob, medicare_number, phone, address, managing_org_id, gp_id, fhir
)
VALUES (
  'Margaret Harris', 'female', '1947-02-14', '3012345682', '+61 3 9666 5678',
  '88 Elizabeth St, Melbourne VIC 3000, AU',
  (SELECT id FROM mbs_organizations LIMIT 1),
  (SELECT id FROM mbs_practitioners WHERE full_name = 'Dr Daniel Wright' LIMIT 1),
  '{
    "resourceType":"Patient",
    "id":"pat-margaret-harris",
    "identifier":[{"system":"http://ns.electronichealth.net.au/id/medicare-number","value":"3012345682"}],
    "name":[{"family":"Harris","given":["Margaret"]}],
    "gender":"female",
    "birthDate":"1947-02-14",
    "telecom":[{"system":"phone","value":"+61 3 9666 5678"}],
    "address":[{"line":["88 Elizabeth St"],"city":"Melbourne","state":"VIC","postalCode":"3000","country":"AU"}],
    "generalPractitioner":[{"reference":"Practitioner/prac-daniel-wright"}],
    "managingOrganization":{"reference":"Organization/org-melbourne-medical"},
    "condition":[
      {"code":{"text":"Hypertension"}},
      {"code":{"text":"Type 2 Diabetes"}},
      {"code":{"text":"COPD"}}
    ]
  }'::jsonb
);

-- Wei Zhang (移民背景，需要中文翻译)
INSERT INTO mbs_patients (
  full_name, gender, dob, medicare_number, phone, address, managing_org_id, gp_id, fhir
)
VALUES (
  'Wei Zhang', 'male', '1980-11-30', '3012345683', '+61 3 9666 6789',
  '120 La Trobe St, Melbourne VIC 3000, AU',
  (SELECT id FROM mbs_organizations LIMIT 1),
  (SELECT id FROM mbs_practitioners WHERE full_name = 'Dr Emily Johnson' LIMIT 1),
  '{
    "resourceType":"Patient",
    "id":"pat-wei-zhang",
    "identifier":[{"system":"http://ns.electronichealth.net.au/id/medicare-number","value":"3012345683"}],
    "name":[{"family":"Zhang","given":["Wei"]}],
    "gender":"male",
    "birthDate":"1980-11-30",
    "telecom":[{"system":"phone","value":"+61 3 9666 6789"}],
    "address":[{"line":["120 La Trobe St"],"city":"Melbourne","state":"VIC","postalCode":"3000","country":"AU"}],
    "generalPractitioner":[{"reference":"Practitioner/prac-emily-johnson"}],
    "managingOrganization":{"reference":"Organization/org-melbourne-medical"},
    "extension":[
      {"url":"http://hl7.org/fhir/StructureDefinition/patient-interpreterRequired","valueBoolean":true},
      {"url":"http://hl7.org/fhir/StructureDefinition/patient-preferredLanguage","valueCodeableConcept":{"text":"Mandarin"}}
    ]
  }'::jsonb
);

-- Sophie Clarke (孕妇)
INSERT INTO mbs_patients (
  full_name, gender, dob, medicare_number, phone, address, managing_org_id, gp_id, fhir
)
VALUES (
  'Sophie Clarke', 'female', '1996-07-12', '3012345684', '+61 3 9666 7890',
  '15 Queen St, Melbourne VIC 3000, AU',
  (SELECT id FROM mbs_organizations LIMIT 1),
  (SELECT id FROM mbs_practitioners WHERE full_name = 'Dr Daniel Wright' LIMIT 1),
  '{
    "resourceType":"Patient",
    "id":"pat-sophie-clarke",
    "identifier":[{"system":"http://ns.electronichealth.net.au/id/medicare-number","value":"3012345684"}],
    "name":[{"family":"Clarke","given":["Sophie"]}],
    "gender":"female",
    "birthDate":"1996-07-12",
    "telecom":[{"system":"phone","value":"+61 3 9666 7890"}],
    "address":[{"line":["15 Queen St"],"city":"Melbourne","state":"VIC","postalCode":"3000","country":"AU"}],
    "generalPractitioner":[{"reference":"Practitioner/prac-daniel-wright"}],
    "managingOrganization":{"reference":"Organization/org-melbourne-medical"},
    "extension":[
      {"url":"http://hl7.org/fhir/StructureDefinition/patient-pregnancyStatus","valueCodeableConcept":{"text":"Pregnant (20 weeks)"}}
    ]
  }'::jsonb
);