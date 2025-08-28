'use client';

import { useState } from 'react';
import { XMarkIcon, DocumentDuplicateIcon, DocumentArrowDownIcon } from '@heroicons/react/24/outline';
import type { GenerateDocResponse } from '@mbspro/shared';

interface DocumentViewerProps {
  document: GenerateDocResponse;
  isOpen: boolean;
  onClose: () => void;
}

export default function DocumentViewer({ document, isOpen, onClose }: DocumentViewerProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(document.body_markdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy document:', err);
    }
  };

  const downloadAsText = () => {
    const blob = new Blob([document.body_markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement('a');
    a.href = url;
    a.download = `${document.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.md`;
    window.document.body.appendChild(a);
    a.click();
    window.document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose} />
      
      {/* Modal */}
      <div className="relative min-h-screen flex items-center justify-center p-4">
        <div className="relative bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gray-50">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{document.title}</h2>
              {document.meta && (
                <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
                  <span>Type: {document.meta.type}</span>
                  <span>Date: {new Date().toLocaleDateString('en-AU')}</span>
                  {document.meta.practitioner && <span>By: {document.meta.practitioner}</span>}
                </div>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={copyToClipboard}
                className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                <DocumentDuplicateIcon className="h-4 w-4 mr-2" />
                {copied ? 'Copied!' : 'Copy'}
              </button>
              <button
                onClick={onClose}
                className="flex items-center justify-center w-8 h-8 text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 rounded-md"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-grow overflow-y-auto p-6">
            {document.summary && (
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="text-sm font-medium text-blue-900 mb-2">Summary</h3>
                <p className="text-sm text-blue-800">{document.summary}</p>
              </div>
            )}

            <div className="prose prose-sm max-w-none">
              {/* Simple Markdown renderer - in a real app, you'd use a proper markdown library */}
              <div 
                className="whitespace-pre-wrap font-mono text-sm leading-relaxed"
                style={{ fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace' }}
              >
                {document.body_markdown}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
            <div className="text-sm text-gray-500">
              Generated on {new Date().toLocaleDateString('en-AU')}
            </div>
            <div className="flex space-x-2">
              <button
                onClick={downloadAsText}
                className="btn-secondary flex items-center"
              >
                <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
                Download
              </button>
              <button
                onClick={onClose}
                className="btn-primary"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
