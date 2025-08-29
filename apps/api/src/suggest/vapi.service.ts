import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class VapiService {
  private readonly logger = new Logger(VapiService.name);
  private readonly apiKey: string;
  private readonly assistantId: string;

  constructor() {
    this.apiKey = process.env.VAPI_API_KEY;
    this.assistantId = process.env.VAPI_ASSISTANT_ID;
    
    if (!this.apiKey) {
      this.logger.error('VAPI_API_KEY is not configured');
    }
    if (!this.assistantId) {
      this.logger.error('VAPI_ASSISTANT_ID is not configured');
    }
  }

  async createCall() {
    if (!this.apiKey) {
      throw new Error('VAPI_API_KEY is not configured');
    }
    
    if (!this.assistantId) {
      throw new Error('VAPI_ASSISTANT_ID is not configured');
    }

    try {
      this.logger.log('Creating Vapi call...');
      
      const response = await fetch('https://api.vapi.ai/call', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        // body: JSON.stringify({
        //   assistantId: this.assistantId,
        //   type: 'webCall'
        // })
          body: JSON.stringify({
            assistantId: process.env.VAPI_ASSISTANT_ID,
            type: 'outboundPhoneCall', // ✅ must include
            transport: {
              provider: 'vapi.websocket',
              audioFormat: {
                format: 'pcm_s16le',
                container: 'raw',
                sampleRate: 16000,
              },
            },
          }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`VAPI API error: ${response.status} - ${errorText}`);
        throw new Error(`VAPI API error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      this.logger.log('Vapi call created successfully');
      return result;
    } catch (error) {
      this.logger.error(`Failed to create VAPI call: ${error.message}`);
      throw new Error(`Failed to create VAPI call: ${error.message}`);
    }
  }
}