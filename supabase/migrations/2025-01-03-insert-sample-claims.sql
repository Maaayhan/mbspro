-- ============================================
-- Mock generator: 多病人、多医生、多 item (1~3)，热门 MBS 项目
-- Items 格式严格为 code/display/modifiers/unitPrice
-- ============================================

WITH params AS (
  SELECT
    3::int    AS TOTAL_ROWS,
    3::int      AS FAILED_FIXED,
    NOW() - INTERVAL '6 months' AS START_TS,
    NOW()        AS END_TS
),

-- 扩展的热门 MBS 项目池
mbs_catalog AS (
  SELECT * FROM (VALUES
    ('23','GP consultation <20min',38.75),
    ('36','GP consultation ≥20min',76.95),
    ('44','GP consultation >40min',111.50),
    ('721','GP management plan',132.00),
    ('723','Team care arrangement',112.00),
    ('732','GP review of plan',72.00),
    ('10997','Allied health follow-up',53.00),
    ('104','Specialist consultation <20min',85.00),
    ('105','Specialist consultation >20min',150.00),
    ('58503','Chest XR (lung fields)',54.10),
    ('58506','Chest XR + fluoroscopy',69.80),
    ('55036','Abdomen ultrasound',120.00),
    ('63395','MRI brain',720.00),
    ('11505','Spirometry full',42.40),
    ('2700','Mental health treatment plan',230.00),
    ('80000','Clinical psychology consult',180.00),
    ('93000','Dietitian consult',65.00)
  ) AS t(code, display, unitPrice)
),

reject_reasons AS (
  SELECT ARRAY[
    'Missing referral letter',
    'Service exceeds frequency limits',
    'Mutually exclusive item billed',
    'Telehealth billed without required video',
    'Consultation time below threshold'
  ] AS reasons
),

pat_pool AS (SELECT id AS patient_id FROM mbs_patients),
prac_pool AS (SELECT id AS practitioner_id FROM mbs_practitioners),

-- === 成功行
success_rows AS (
  SELECT
    (SELECT patient_id
     FROM pat_pool
     ORDER BY md5((gs::text || random()::text))
     LIMIT 1) AS patient_id,
    (SELECT practitioner_id
     FROM prac_pool
     ORDER BY md5((gs::text || random()::text))
     LIMIT 1) AS practitioner_id,
    (params.START_TS
      + ((gs::float + random()) / ((SELECT TOTAL_ROWS FROM params)::float + 1))
        * EXTRACT(EPOCH FROM (params.END_TS - params.START_TS)) * INTERVAL '1 second'
    ) AS service_ts,
    'success'::varchar(50) AS submission_status
  FROM generate_series(1, (SELECT TOTAL_ROWS - FAILED_FIXED FROM params)) gs, params
),

-- === 失败行
failed_rows AS (
  SELECT
    (SELECT patient_id
     FROM pat_pool
     ORDER BY md5((gs::text || random()::text))
     LIMIT 1) AS patient_id,
    (SELECT practitioner_id
     FROM prac_pool
     ORDER BY md5((gs::text || random()::text))
     LIMIT 1) AS practitioner_id,
    (params.START_TS
      + ((gs::float + random()) / ((SELECT TOTAL_ROWS FROM params)::float + 1))
        * EXTRACT(EPOCH FROM (params.END_TS - params.START_TS)) * INTERVAL '1 second'
    ) AS service_ts,
    'failed'::varchar(50) AS submission_status
  FROM generate_series(1, (SELECT FAILED_FIXED FROM params)) gs, params
),

-- === 合并 + seed_id 唯一标识
all_seeds AS (
  SELECT row_number() OVER () AS seed_id, *
  FROM (
    SELECT * FROM success_rows
    UNION ALL
    SELECT * FROM failed_rows
  ) u
),

-- === items 每行独立随机
items_built AS (
  SELECT
    s.seed_id,
    s.patient_id,
    s.practitioner_id,
    s.service_ts,
    s.submission_status,
    ('enc-' || substr(encode(gen_random_bytes(6),'hex'), 1, 12)) AS encounter_id,
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'code', c.code,
          'display', c.display,
          'modifiers', '[]'::jsonb,
          'unitPrice', c.unitPrice
        )
      )
      FROM (
        SELECT *
        FROM mbs_catalog
        ORDER BY md5(s.seed_id::text || random()::text)
        LIMIT (1 + floor(random() * 3))
      ) c
    ) AS items
  FROM all_seeds s
),

-- === 拼装数据
prepared AS (
  SELECT
    gen_random_uuid() AS id,
    i.patient_id,i.practitioner_id,i.encounter_id,i.items,
    (SELECT SUM((e->>'unitPrice')::numeric)
       FROM jsonb_array_elements(i.items) e)::numeric(10,2) AS total_amount,
    'AUD'::varchar(10) AS currency,
    NULL::text AS notes,
    i.submission_status,
    CASE WHEN i.submission_status='failed'
      THEN (SELECT reasons[ceil(random()*array_length(reasons,1))]
            FROM reject_reasons)
      ELSE NULL END AS submission_error_reason,
    'submitted'::varchar(50) AS status,
    i.service_ts
  FROM items_built i
),

-- === 转换成 FHIR claim
final_rows AS (
  SELECT
    p.id,p.patient_id,p.practitioner_id,p.encounter_id,p.items,
    p.total_amount,p.currency,p.notes,
    p.submission_status,p.submission_error_reason,p.status,
    (
      WITH lines AS (SELECT jsonb_array_elements(p.items) AS e),
           tot AS (SELECT SUM((e->>'unitPrice')::numeric)::numeric(10,2) AS amt FROM lines)
      SELECT jsonb_build_object(
        'resourceType','Claim','status','active','use','claim',
        'created',to_char(p.service_ts,'YYYY-MM-DD"T"HH24:MI:SSOF'),
        'identifier',jsonb_build_array(
            jsonb_build_object('system','urn:mbspro:encounter','value',p.encounter_id)
        ),
        'provider',jsonb_build_object('reference','Practitioner/'||p.practitioner_id::text),
        'patient',jsonb_build_object('reference','Patient/'||p.patient_id::text),
        'item',(SELECT jsonb_agg(
                  jsonb_build_object(
                    'productOrService',
                    jsonb_build_object('coding',
                      jsonb_build_array(
                        jsonb_build_object('system','http://mbs.gov.au/item',
                                           'code',e->>'code','display',e->>'display'))
                    ),
                    'unitPrice',jsonb_build_object('value',(e->>'unitPrice')::numeric,'currency','AUD')
                  )
                )
                FROM jsonb_array_elements(p.items) e),
        'total',(SELECT jsonb_build_object('value',amt,'currency','AUD') FROM tot)
      )
    )::jsonb AS fhir_data,
    p.service_ts AS created_at,
    p.service_ts AS updated_at
  FROM prepared p
)

-- === 插入表
INSERT INTO claims (
  id,patient_id,practitioner_id,encounter_id,items,
  total_amount,currency,notes,submission_status,
  submission_error_reason,status,fhir_data,
  created_at,updated_at
)
SELECT
  id,patient_id,practitioner_id,encounter_id,items,
  total_amount,currency,notes,submission_status,
  submission_error_reason,status,fhir_data,
  created_at,updated_at
FROM final_rows
RETURNING id,submission_status,total_amount,items;
