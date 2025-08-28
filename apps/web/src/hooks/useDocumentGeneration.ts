'use client';

import { useState } from 'react';
import type { GenerateDocRequest, GenerateDocResponse } from '@mbspro/shared';

interface UseDocumentGenerationOptions {
  onSuccess?: (document: GenerateDocResponse) => void;
  onError?: (error: string) => void;
}

export function useDocumentGeneration(options?: UseDocumentGenerationOptions) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [document, setDocument] = useState<GenerateDocResponse | null>(null);

  const generateDocument = async (request: GenerateDocRequest): Promise<GenerateDocResponse | null> => {
    setLoading(true);
    setError(null);

    try {
      const apiBase = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000';
      const response = await fetch(`${apiBase}/api/generate-doc`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        const errorMessage = errorData?.message || `HTTP ${response.status}: ${response.statusText}`;
        throw new Error(errorMessage);
      }

      const result: GenerateDocResponse = await response.json();
      setDocument(result);
      options?.onSuccess?.(result);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate document';
      setError(errorMessage);
      options?.onError?.(errorMessage);
      console.error('Document generation error:', err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setError(null);
    setDocument(null);
    setLoading(false);
  };

  return {
    generateDocument,
    loading,
    error,
    document,
    reset
  };
}
