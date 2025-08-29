import { Controller, Get } from '@nestjs/common';
import { readFileSync } from 'fs';
import { join } from 'path';

@Controller('patients')
export class PatientsController {
  @Get()
  getPatients() {
    try {
      const patientsPath = join(process.cwd(), '..', '..', 'data', 'patient.json');
      const rawData = readFileSync(patientsPath, 'utf8');
      const data = JSON.parse(rawData);
      return data;
    } catch (error) {
      console.error('Error reading patient data:', error);
      return { patients: [], error: 'Failed to load patient data' };
    }
  }
}
