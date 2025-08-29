-- Insert sample claims data for testing
-- First, let's insert some sample claims with proper relationships

-- Claims for Dr Emily Johnson (456789A)
INSERT INTO claims (
  patient_id,
  practitioner_id,
  encounter_id,
  items,
  total_amount,
  currency,
  notes,
  submission_status,
  status,
  created_at
) VALUES
-- Recent claims (last 30 days)
(
  (SELECT id FROM mbs_patients WHERE full_name = 'Olivia Brown' LIMIT 1),
  (SELECT id FROM mbs_practitioners WHERE provider_number = '456789A' LIMIT 1),
  'ENC-2024-001',
  '[{"code": "23", "description": "Professional attendance by a general practitioner", "quantity": 1, "unitPrice": 41.20}]'::jsonb,
  41.20,
  'AUD',
  'Regular consultation',
  'success',
  'paid',
  NOW() - INTERVAL '5 days'
),
(
  (SELECT id FROM mbs_patients WHERE full_name = 'Olivia Brown' LIMIT 1),
  (SELECT id FROM mbs_practitioners WHERE provider_number = '456789A' LIMIT 1),
  'ENC-2024-002',
  '[{"code": "36", "description": "Consultation Level C", "quantity": 1, "unitPrice": 82.40}]'::jsonb,
  82.40,
  'AUD',
  'Complex consultation',
  'success',
  'paid',
  NOW() - INTERVAL '10 days'
),
(
  (SELECT id FROM mbs_patients WHERE full_name = 'Olivia Brown' LIMIT 1),
  (SELECT id FROM mbs_practitioners WHERE provider_number = '456789A' LIMIT 1),
  'ENC-2024-003',
  '[{"code": "721", "description": "Health Assessment", "quantity": 1, "unitPrice": 67.00}]'::jsonb,
  67.00,
  'AUD',
  'Annual health assessment',
  'failed',
  'rejected',
  NOW() - INTERVAL '15 days'
),

-- Claims for Dr Daniel Wright (456790B)
(
  (SELECT id FROM mbs_patients WHERE full_name = 'William Harris' LIMIT 1),
  (SELECT id FROM mbs_practitioners WHERE provider_number = '456790B' LIMIT 1),
  'ENC-2024-004',
  '[{"code": "11700", "description": "ECG", "quantity": 1, "unitPrice": 26.55}]'::jsonb,
  26.55,
  'AUD',
  'ECG examination',
  'success',
  'paid',
  NOW() - INTERVAL '8 days'
),
(
  (SELECT id FROM mbs_patients WHERE full_name = 'William Harris' LIMIT 1),
  (SELECT id FROM mbs_practitioners WHERE provider_number = '456790B' LIMIT 1),
  'ENC-2024-005',
  '[{"code": "23", "description": "Professional attendance by a general practitioner", "quantity": 1, "unitPrice": 41.20}]'::jsonb,
  41.20,
  'AUD',
  'Follow-up consultation',
  'success',
  'paid',
  NOW() - INTERVAL '12 days'
),

-- Claims for Mia Collins, NP (456791C)
(
  (SELECT id FROM mbs_patients WHERE full_name = 'Sophia Martinez' LIMIT 1),
  (SELECT id FROM mbs_practitioners WHERE provider_number = '456791C' LIMIT 1),
  'ENC-2024-006',
  '[{"code": "2713", "description": "Mental Health", "quantity": 1, "unitPrice": 102.00}]'::jsonb,
  102.00,
  'AUD',
  'Mental health consultation',
  'success',
  'paid',
  NOW() - INTERVAL '3 days'
),
(
  (SELECT id FROM mbs_patients WHERE full_name = 'Sophia Martinez' LIMIT 1),
  (SELECT id FROM mbs_practitioners WHERE provider_number = '456791C' LIMIT 1),
  'ENC-2024-007',
  '[{"code": "23", "description": "Professional attendance by a general practitioner", "quantity": 1, "unitPrice": 41.20}, {"code": "11700", "description": "ECG", "quantity": 1, "unitPrice": 26.55}]'::jsonb,
  67.75,
  'AUD',
  'Consultation with ECG',
  'failed',
  'rejected',
  NOW() - INTERVAL '20 days'
),

-- Older claims (90+ days ago) for testing date filters
(
  (SELECT id FROM mbs_patients WHERE full_name = 'Olivia Brown' LIMIT 1),
  (SELECT id FROM mbs_practitioners WHERE provider_number = '456792D' LIMIT 1),
  'ENC-2023-001',
  '[{"code": "36", "description": "Consultation Level C", "quantity": 1, "unitPrice": 82.40}]'::jsonb,
  82.40,
  'AUD',
  'Specialist consultation',
  'success',
  'paid',
  NOW() - INTERVAL '95 days'
),
(
  (SELECT id FROM mbs_patients WHERE full_name = 'William Harris' LIMIT 1),
  (SELECT id FROM mbs_practitioners WHERE provider_number = '456793E' LIMIT 1),
  'ENC-2023-002',
  '[{"code": "721", "description": "Health Assessment", "quantity": 1, "unitPrice": 67.00}]'::jsonb,
  67.00,
  'AUD',
  'Health assessment',
  'success',
  'paid',
  NOW() - INTERVAL '120 days'
),

-- Very old claims (180+ days ago)
(
  (SELECT id FROM mbs_patients WHERE full_name = 'Sophia Martinez' LIMIT 1),
  (SELECT id FROM mbs_practitioners WHERE provider_number = '456794F' LIMIT 1),
  'ENC-2023-003',
  '[{"code": "23", "description": "Professional attendance by a general practitioner", "quantity": 1, "unitPrice": 41.20}]'::jsonb,
  41.20,
  'AUD',
  'Regular consultation',
  'success',
  'paid',
  NOW() - INTERVAL '200 days'
),
(
  (SELECT id FROM mbs_patients WHERE full_name = 'Olivia Brown' LIMIT 1),
  (SELECT id FROM mbs_practitioners WHERE provider_number = '456795G' LIMIT 1),
  'ENC-2023-004',
  '[{"code": "2713", "description": "Mental Health", "quantity": 1, "unitPrice": 102.00}]'::jsonb,
  102.00,
  'AUD',
  'Psychology consultation',
  'failed',
  'rejected',
  NOW() - INTERVAL '210 days'
);

-- Add some recent claims for better testing
INSERT INTO claims (
  patient_id,
  practitioner_id,
  encounter_id,
  items,
  total_amount,
  currency,
  notes,
  submission_status,
  status,
  created_at
) VALUES
(
  (SELECT id FROM mbs_patients WHERE full_name = 'William Harris' LIMIT 1),
  (SELECT id FROM mbs_practitioners WHERE provider_number = '456789A' LIMIT 1),
  'ENC-2024-008',
  '[{"code": "58503", "description": "Chest X-ray", "quantity": 1, "unitPrice": 73.65}]'::jsonb,
  73.65,
  'AUD',
  'Chest X-ray examination',
  'success',
  'paid',
  NOW() - INTERVAL '2 days'
),
(
  (SELECT id FROM mbs_patients WHERE full_name = 'Sophia Martinez' LIMIT 1),
  (SELECT id FROM mbs_practitioners WHERE provider_number = '456790B' LIMIT 1),
  'ENC-2024-009',
  '[{"code": "11506", "description": "Pathology Test", "quantity": 1, "unitPrice": 25.50}]'::jsonb,
  25.50,
  'AUD',
  'Blood test',
  'success',
  'paid',
  NOW() - INTERVAL '6 days'
),
(
  (SELECT id FROM mbs_patients WHERE full_name = 'Olivia Brown' LIMIT 1),
  (SELECT id FROM mbs_practitioners WHERE provider_number = '456791C' LIMIT 1),
  'ENC-2024-010',
  '[{"code": "16400", "description": "Ultrasound", "quantity": 1, "unitPrice": 108.00}]'::jsonb,
  108.00,
  'AUD',
  'Abdominal ultrasound',
  'pending',
  'submitted',
  NOW() - INTERVAL '1 day'
);
