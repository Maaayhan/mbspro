-- 创建 claims 表
CREATE TABLE IF NOT EXISTS claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES mbs_patients(id) ON DELETE SET NULL,
  practitioner_id UUID REFERENCES mbs_practitioners(id) ON DELETE SET NULL,
  encounter_id TEXT NOT NULL,
  
  -- 索赔项目，使用 JSONB 存储灵活的数据结构
  items JSONB NOT NULL,
  
  -- 金额和货币
  total_amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(10) NOT NULL DEFAULT 'AUD',
  
  -- 备注和状态
  notes TEXT,
  
  -- 新增：提交状态和失败原因
  submission_status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 可选值：pending, success, failed
  submission_error_reason TEXT, -- 存储失败原因的详细描述
  
  status VARCHAR(50) NOT NULL DEFAULT 'submitted',
  
  -- FHIR 数据存储
  fhir_data JSONB,
  
  -- 时间戳
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 为常用查询添加索引
CREATE INDEX IF NOT EXISTS idx_claims_patient_id ON claims(patient_id);
CREATE INDEX IF NOT EXISTS idx_claims_practitioner_id ON claims(practitioner_id);
CREATE INDEX IF NOT EXISTS idx_claims_status ON claims(status);
CREATE INDEX IF NOT EXISTS idx_claims_submission_status ON claims(submission_status);
CREATE INDEX IF NOT EXISTS idx_claims_created_at ON claims(created_at);

-- 为表启用行级安全策略
ALTER TABLE claims ENABLE ROW LEVEL SECURITY;

-- 创建策略允许用户管理自己的索赔
CREATE POLICY "Allow authenticated users to manage their own claims" ON claims
FOR ALL USING (auth.uid() IN (
  SELECT patient_id FROM claims
  UNION
  SELECT practitioner_id FROM claims
));

-- 授予基本权限
GRANT ALL ON claims TO authenticated, anon;
-- 移除对不存在序列的授权
