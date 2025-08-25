import { DataSource } from 'typeorm';
import { MbsItem } from '../entities/mbs-item.entity';
import { databaseConfig } from '../config/database.config';
import * as dotenv from 'dotenv';

dotenv.config();

// Synthetic MBS data covering various scenarios
const SEED_DATA: Partial<MbsItem>[] = [
  // Standard GP consultations
  {
    code: '23',
    title: 'Professional attendance by a general practitioner',
    desc: 'Professional attendance by a general practitioner at consulting rooms, surgery or hospital (not being a service to which item 24, 25, 26, 27, 28, 30, 35, 36, 37, 38, 40, 43, 44, 47, 48, 50, 51, 600, 601, 602, 603, 604 or 605 applies) if the attendance is for less than 20 minutes duration',
    fee: 41.20,
    timeThreshold: 20,
    flags: { telehealth: true, after_hours: false },
    mutuallyExclusiveWith: ['24', '25', '26', '27', '28', '30', '35', '36', '37', '38'],
    references: ['MBS Guidelines 2023', 'GP Consultation Standards', 'Time-based Billing Guide'],
  },
  {
    code: '36',
    title: 'Professional attendance by a general practitioner - prolonged',
    desc: 'Professional attendance by a general practitioner exceeding 20 minutes but not exceeding 40 minutes duration',
    fee: 71.70,
    timeThreshold: 40,
    flags: { telehealth: true, after_hours: false },
    mutuallyExclusiveWith: ['23', '44'],
    references: ['MBS Guidelines 2023', 'Prolonged Consultation Guidelines', 'Clinical Documentation Requirements'],
  },
  {
    code: '44',
    title: 'Professional attendance by a general practitioner - extended',
    desc: 'Professional attendance by a general practitioner exceeding 40 minutes duration',
    fee: 105.55,
    timeThreshold: null, // No upper time limit
    flags: { telehealth: true, after_hours: false },
    mutuallyExclusiveWith: ['23', '36'],
    references: ['MBS Guidelines 2023', 'Extended Consultation Framework'],
  },
  
  // Telehealth-specific items
  {
    code: '91800',
    title: 'Telehealth consultation by general practitioner',
    desc: 'Professional video consultation conducted by a general practitioner with a patient not physically present at the same location as the practitioner',
    fee: 41.20,
    timeThreshold: 20,
    flags: { telehealth: true, after_hours: false, video_required: true },
    mutuallyExclusiveWith: ['23', '91801'],
    references: ['Telehealth Guidelines 2023', 'Video Consultation Standards', 'Digital Health Requirements'],
  },
  
  // After-hours consultations
  {
    code: '597',
    title: 'After-hours GP consultation',
    desc: 'Professional attendance by a general practitioner provided between 11pm and 7am on any day, or between 11pm on Saturday and 7am on Monday',
    fee: 71.35,
    timeThreshold: 20,
    flags: { telehealth: false, after_hours: true },
    mutuallyExclusiveWith: ['23', '36', '598'],
    references: ['After Hours Guidelines', 'Emergency Care Standards', 'Weekend Service Protocols'],
  },
  {
    code: '598',
    title: 'After-hours GP consultation - prolonged',
    desc: 'After-hours professional attendance by a general practitioner exceeding 20 minutes but not exceeding 40 minutes',
    fee: 113.75,
    timeThreshold: 40,
    flags: { telehealth: false, after_hours: true },
    mutuallyExclusiveWith: ['597', '599'],
    references: ['After Hours Guidelines', 'Extended After Hours Care'],
  },
  
  // Specialist consultations
  {
    code: '104',
    title: 'Professional attendance by a specialist',
    desc: 'Professional attendance by a specialist in the practice of his or her specialty where the patient is referred',
    fee: 85.55,
    timeThreshold: 45,
    flags: { telehealth: false, after_hours: true, referral_required: true },
    mutuallyExclusiveWith: ['105', '116'],
    references: ['Specialist Guidelines', 'Referral Requirements', 'Specialist Care Standards'],
  },
  
  // Health assessments
  {
    code: '703',
    title: 'Health assessment for people aged 40-49 years',
    desc: 'Health assessment for people aged 40-49 years inclusive who are at risk of developing chronic disease',
    fee: 234.30,
    timeThreshold: null,
    flags: { telehealth: true, after_hours: false, preventive: true },
    mutuallyExclusiveWith: ['705', '707', '715'],
    references: ['Health Assessment Guidelines', 'Preventive Care Framework', 'Chronic Disease Prevention'],
  },
  
  // Mental health items
  {
    code: '2712',
    title: 'GP mental health consultation',
    desc: 'Preparation of a GP Mental Health Treatment Plan by a general practitioner',
    fee: 286.75,
    timeThreshold: null,
    flags: { telehealth: true, after_hours: false, mental_health: true },
    mutuallyExclusiveWith: ['2713', '2715'],
    references: ['Mental Health Guidelines', 'Care Plan Requirements', 'Psychological Treatment Framework'],
  },
  
  // Procedures
  {
    code: '30192',
    title: 'Excision of skin lesion',
    desc: 'Excision of malignant or premalignant lesion of the skin by any method',
    fee: 143.95,
    timeThreshold: null,
    flags: { telehealth: false, after_hours: true, procedure: true },
    mutuallyExclusiveWith: [],
    references: ['Surgical Guidelines', 'Skin Cancer Treatment', 'Minor Procedures Manual'],
  },
];

async function seed() {
  console.log('🌱 Starting comprehensive MBS database seeding...');

  // Create a new DataSource instance for seeding
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    username: process.env.DB_USERNAME || 'mbspro',
    password: process.env.DB_PASSWORD || 'mbspro',
    database: process.env.DB_DATABASE || 'mbspro',
    synchronize: true, // Ensure tables are created/updated
    entities: [MbsItem],
    logging: process.env.NODE_ENV === 'development',
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

  try {
    await dataSource.initialize();
    console.log('📦 Database connection established');

    const mbsItemRepository = dataSource.getRepository(MbsItem);

    // Make idempotent: only clear and reseed if no data exists or if forced
    const existingCount = await mbsItemRepository.count();
    
    if (existingCount > 0) {
      console.log(`📊 Found ${existingCount} existing MBS items`);
      console.log('🔄 Clearing existing data for fresh seed...');
      await mbsItemRepository.clear();
    }

    console.log('🧹 Database cleared, inserting seed data...');

    // Insert sample data in chunks for better performance
    const chunkSize = 5;
    let totalInserted = 0;

    for (let i = 0; i < SEED_DATA.length; i += chunkSize) {
      const chunk = SEED_DATA.slice(i, i + chunkSize);
      const createdItems = await mbsItemRepository.save(chunk);
      totalInserted += createdItems.length;
      console.log(`✅ Inserted chunk ${Math.floor(i / chunkSize) + 1}: ${createdItems.length} items`);
    }

    console.log(`🎉 Database seeding completed successfully!`);
    console.log(`📈 Total items inserted: ${totalInserted}`);
    
    // Verify the data
    const finalCount = await mbsItemRepository.count();
    console.log(`🔍 Verification: ${finalCount} items now in database`);

    // Show sample of inserted data
    const sampleItems = await mbsItemRepository.find({ 
      take: 3,
      order: { code: 'ASC' }
    });
    console.log('📋 Sample inserted items:');
    sampleItems.forEach(item => {
      console.log(`   ${item.code}: ${item.title} ($${item.fee})`);
    });

  } catch (error) {
    console.error('❌ Error during seeding:', error);
    
    if (error.message?.includes('connect')) {
      console.error('💡 Make sure PostgreSQL is running: pnpm db:up');
    }
    
    process.exit(1);
  } finally {
    await dataSource.destroy();
    console.log('🔌 Database connection closed');
  }
}

// Handle script execution
if (require.main === module) {
  seed()
    .then(() => {
      console.log('✨ Seed script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Seed script failed:', error);
      process.exit(1);
    });
}

export { seed };
