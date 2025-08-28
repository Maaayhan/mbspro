/**
 * MBS Catalog Constants
 * Used as fallback when Supabase queries fail
 */

export const MBS: Record<string, { code: string; title: string; fee: number }> =
  {
    "23": {
      code: "23",
      title: "Professional attendance by a general practitioner",
      fee: 39.1,
    },
    "24": {
      code: "24",
      title: "Professional attendance by a general practitioner (Level B)",
      fee: 76.95,
    },
    "36": {
      code: "36",
      title: "Professional attendance by a general practitioner (Level C)",
      fee: 113.3,
    },
    "721": {
      code: "721",
      title: "Professional attendance by a specialist",
      fee: 150.0,
    },
    "104": {
      code: "104",
      title: "Professional attendance by a consultant physician",
      fee: 200.0,
    },
    "109": {
      code: "109",
      title: "Professional attendance by a consultant physician (Level B)",
      fee: 300.0,
    },
    "116": {
      code: "116",
      title: "Professional attendance by a consultant physician (Level C)",
      fee: 400.0,
    },
    "5020": {
      code: "5020",
      title: "Telehealth attendance by a general practitioner",
      fee: 39.1,
    },
    "5028": {
      code: "5028",
      title: "Telehealth attendance by a specialist",
      fee: 150.0,
    },
    "5040": {
      code: "5040",
      title: "Telehealth attendance by a consultant physician",
      fee: 200.0,
    },
  };
