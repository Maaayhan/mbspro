-- 创建获取Top MBS Items的函数
CREATE OR REPLACE FUNCTION get_top_mbs_items(top_n INT DEFAULT 5)
RETURNS TABLE (
  code TEXT,
  title TEXT,
  count BIGINT,
  revenue NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH item_stats AS (
    SELECT 
      jsonb_array_elements(items)->>'code' AS code,
      COUNT(*) AS count,
      SUM((jsonb_array_elements(items)->>'unitPrice')::NUMERIC * 
          (jsonb_array_elements(items)->>'quantity')::NUMERIC) AS revenue
    FROM claims
    WHERE 
      submission_status = 'success' AND 
      (status = 'paid' OR status = 'submitted')
    GROUP BY code
  )
  SELECT 
    item_stats.code, 
    COALESCE(mbs_items.title, 'Item ' || item_stats.code) AS title,
    item_stats.count,
    item_stats.revenue
  FROM item_stats
  LEFT JOIN mbs_items ON item_stats.code = mbs_items.code
  ORDER BY item_stats.count DESC, item_stats.revenue DESC
  LIMIT top_n;
END;
$$ LANGUAGE plpgsql;
