'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';

interface WebsiteData {
  url: string;
  name?: string;
  category?: string;
}

interface AuditReport {
  totalWebsites: number;
  processedWebsites: number;
  results: Array<{
    url: string;
    name?: string;
    category?: string;
    status: 'pending' | 'processing' | 'completed' | 'error';
    ageVerification?: boolean;
    method?: string;
    notes?: string;
  }>;
}

export default function AuditPage() {
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [websites, setWebsites] = useState<WebsiteData[]>([]);
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditReport, setAuditReport] = useState<AuditReport | null>(null);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [isUsingRealAPI, setIsUsingRealAPI] = useState(false);
  const [progress, setProgress] = useState<{
    current: number;
    total: number;
    message: string;
    url?: string;
  } | null>(null);


  const onDrop = useCallback((acceptedFiles: File[]) => {
    setUploadedFiles(acceptedFiles);
    
    // Process each file
    acceptedFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        const newWebsites = parseFileContent(content, file.name);
        setWebsites(prev => [...prev, ...newWebsites]);
      };
      reader.readAsText(file);
    });
  }, []);

  const parseFileContent = (content: string, filename: string): WebsiteData[] => {
    const lines = content.split('\n').filter(line => line.trim());
    
    if (filename.endsWith('.csv')) {
      // Parse CSV format
      const [header, ...dataLines] = lines;
      const headers = header.split(',').map(h => h.trim());
      
      return dataLines.map(line => {
        const values = line.split(',').map(v => v.trim());
        const website: WebsiteData = { url: values[0] };
        
        if (headers.includes('name') && values[1]) website.name = values[1];
        if (headers.includes('category') && values[2]) website.category = values[2];
        
        return website;
      });
    } else {
      // Parse text file (one URL per line)
      return lines.map(url => ({ url: url.trim() }));
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/plain': ['.txt'],
      'text/csv': ['.csv']
    },
    multiple: true
  });

  const startAudit = async () => {
    setIsAuditing(true);
    setProgress(null);
    
    try {
      setIsUsingRealAPI(true);
      
      // Show initial progress
      setProgress({
        current: 0,
        total: websites.length,
        message: `Starting audit of ${websites.length} websites...`
      });
      
      // Use regular API with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 600000); // 10 minute timeout to match backend
      
      const response = await fetch('/api/audit/fast', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ websites }),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Transform the API response to match our interface
      const report: AuditReport = {
        totalWebsites: data.totalWebsites,
        processedWebsites: data.processedWebsites,
        results: data.results.map((result: unknown) => {
          const typedResult = result as Record<string, unknown>;
          return {
            url: typedResult.website as string,
            name: typedResult.name as string,
            category: typedResult.category as string,
            status: 'completed',
            ageVerification: typedResult.has_age_verification as boolean,
            method: typedResult.verification_type as string,
            notes: typedResult.details as string,
          };
        }),
      };
      
      setAuditReport(report);
      setProgress(null);
    } catch (error) {
      console.error('Audit failed:', error);
      setIsUsingRealAPI(false);
      
      // Check if it's a timeout error
      if (error instanceof Error && error.name === 'AbortError') {
        alert('Audit timed out after 10 minutes. Using demo mode instead.');
      } else {
        alert('Real audit failed, using demo mode instead. Please check your Ollama backend.');
      }
      
      // Use demo mode as fallback
      const report: AuditReport = {
        totalWebsites: websites.length,
        processedWebsites: websites.length,
        results: websites.map(site => {
          let ageVerification = false;
          let method = '';
          let notes = '';
          
          // Determine age verification based on category
          switch (site.category) {
            case 'Adult Content':
            case 'Adult Dating':
            case 'Adult Services':
            case 'Adult Directory':
              ageVerification = true;
              method = 'Age Gate';
              notes = 'Explicit adult content requires age verification';
              break;
            case 'Alcohol':
            case 'Wine & Spirits':
            case 'Alcohol Delivery':
            case 'Wine':
              ageVerification = true;
              method = 'Age Gate + ID Verification';
              notes = 'Alcohol sales require strict age verification';
              break;
            case 'Gambling':
            case 'Sports Betting':
              ageVerification = true;
              method = 'Age Gate + Credit Card';
              notes = 'Gambling sites require 18+ verification';
              break;
            case 'Firearms':
            case 'Weapons':
              ageVerification = true;
              method = 'Age Gate + License Check';
              notes = 'Weapon sales require license verification';
              break;
            case 'Vaping':
              ageVerification = true;
              method = 'Age Gate';
              notes = 'Vaping products require age verification';
              break;
            case 'Fireworks':
              ageVerification = true;
              method = 'Age Gate';
              notes = 'Fireworks sales require age verification';
              break;
            case 'Gaming':
              ageVerification = Math.random() > 0.3;
              method = ageVerification ? 'Age Gate' : 'None';
              notes = ageVerification ? 'Gaming content may require age verification' : 'No age verification required';
              break;
            case 'Social Media':
            case 'Social Platform':
            case 'Video Platform':
            case 'Communication':
            case 'Dating':
            case 'Crowdfunding':
              ageVerification = Math.random() > 0.7;
              method = ageVerification ? 'Age Gate' : 'None';
              notes = ageVerification ? 'Some content may require age verification' : 'No age verification required';
              break;
            default:
              ageVerification = Math.random() > 0.5;
              method = ageVerification ? 'Age Gate' : 'None';
              notes = ageVerification ? 'May require age verification' : 'No age verification required';
          }
          
          return {
            ...site,
            status: 'completed',
            ageVerification,
            method,
            notes: notes || undefined
          };
        })
      };
      
      setAuditReport(report);
    } finally {
      setIsAuditing(false);
    }
  };

  const clearAll = () => {
    setUploadedFiles([]);
    setWebsites([]);
    setAuditReport(null);
    setIsDemoMode(false);
  };

  const loadDemoData = () => {
    const demoWebsites: WebsiteData[] = [
      // Pornography Websites (UK/International Access)
      { url: 'https://www.pornhub.com', name: 'Pornhub', category: 'Adult Content' },
      { url: 'https://www.xvideos2.uk', name: 'XVideos', category: 'Adult Content' },
      { url: 'https://xhamster.com', name: 'xHamster', category: 'Adult Content' },
      { url: 'https://www.redtube.com', name: 'RedTube', category: 'Adult Content' },
      { url: 'https://onlyfans.com/onlyfans', name: 'OnlyFans', category: 'Adult Content' },
      { url: 'https://www.fabswingers.com', name: 'Fabswingers', category: 'Adult Dating' },
      { url: 'https://adultwork.uk.com', name: 'Adultwork', category: 'Adult Services' },
      { url: 'https://www.adultwork.com/HomeIE.asp', name: 'Adultwork IE', category: 'Adult Services' },
      { url: 'https://xhamsterlive.com', name: 'xHamsterLive', category: 'Adult Content' },
      { url: 'https://spankbang.com', name: 'SpankBang', category: 'Adult Content' },
      { url: 'https://fuq.com', name: 'Fuq', category: 'Adult Content' },
      { url: 'https://www.redgifs.com', name: 'RedGIFs', category: 'Adult Content' },
      { url: 'https://www.literotica.com', name: 'Literotica', category: 'Adult Content' },
      { url: 'https://motherless.com', name: 'Motherless', category: 'Adult Content' },
      { url: 'https://thisvid.com', name: 'ThisVid', category: 'Adult Content' },
      { url: 'https://theporndude.com', name: 'ThePornDude', category: 'Adult Directory' },
      { url: 'https://www.vivastreet.co.uk', name: 'Vivastreet', category: 'Adult Services' },
      
      // Weapons & Firearms Retailers (UK)
      { url: 'https://www.sportsmanguncentre.co.uk', name: 'Sportsman Gun Centre', category: 'Firearms' },
      { url: 'https://www.guntrader.uk', name: 'GunTrader', category: 'Firearms' },
      { url: 'https://www.gunstar.co.uk', name: 'Gunstar', category: 'Firearms' },
      { url: 'https://www.avalonguns.co.uk', name: 'Avalon Guns', category: 'Firearms' },
      { url: 'https://www.theknightshop.com', name: 'The Knight Shop', category: 'Weapons' },
      { url: 'https://www.blades-uk.com', name: 'Blades UK', category: 'Weapons' },
      { url: 'https://www.southernswords.co.uk', name: 'Southern Swords', category: 'Weapons' },
      
      // Other Major Sites Often with Age Verification
      { url: 'https://www.reddit.com', name: 'Reddit', category: 'Social Platform' },
      { url: 'https://x.com', name: 'X (Twitter)', category: 'Social Media' },
      { url: 'https://discord.com', name: 'Discord', category: 'Communication' },
      { url: 'https://bsky.app', name: 'Bluesky', category: 'Social Media' },
      { url: 'https://www.grindr.com', name: 'Grindr', category: 'Dating' },
      { url: 'https://www.patreon.com', name: 'Patreon', category: 'Crowdfunding' },
      
      // Additional Examples from UK E-commerce (Restricted Categories)
      { url: 'https://www.drinksupermarket.com', name: 'DrinkSupermarket', category: 'Alcohol' },
      { url: 'https://www.majestic.co.uk', name: 'Majestic Wine', category: 'Alcohol' },
      { url: 'https://www.vapouriz.co.uk', name: 'Vapouriz', category: 'Vaping' },
      { url: 'https://www.vapesuperstore.co.uk', name: 'Vape Superstore', category: 'Vaping' },
      { url: 'https://www.galacticfireworks.co.uk', name: 'Galactic Fireworks', category: 'Fireworks' }
    ];
    
    setWebsites(demoWebsites);
    setIsDemoMode(true);
  };

  const exportReport = () => {
    if (!auditReport) return;

    // Create CSV content
    const headers = ['URL', 'Name', 'Category', 'Age Verification', 'Method', 'Notes'];
    const csvContent = [
      headers.join(','),
      ...auditReport.results.map(result => [
        result.url,
        result.name || '',
        result.category || '',
        result.ageVerification ? 'Yes' : 'No',
        result.method || '',
        result.notes || ''
      ].join(','))
    ].join('\n');

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-report-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Website Age Verification Audit
          </h1>
          <p className="text-lg text-gray-600">
            Upload website URLs to analyze age verification requirements
          </p>
        </div>

        {/* Upload Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <div className="mb-6">
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">
              Upload Websites
            </h2>
            <p className="text-gray-600">
              Upload text files (.txt) with one URL per line, or CSV files with structured data
            </p>
          </div>

          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragActive
                ? 'border-blue-400 bg-blue-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <input {...getInputProps()} />
            <div className="space-y-4">
              <div className="mx-auto w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <div>
                <p className="text-lg font-medium text-gray-900">
                  {isDragActive ? 'Drop files here' : 'Drag & drop files here'}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  or click to browse files
                </p>
              </div>
              <p className="text-xs text-gray-400">
                Supports .txt and .csv files
              </p>
            </div>
          </div>

          {/* Uploaded Files */}
          {uploadedFiles.length > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-3">
                Uploaded Files ({uploadedFiles.length})
              </h3>
              <div className="space-y-2">
                {uploadedFiles.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                    <div className="flex items-center space-x-3">
                      <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span className="text-sm font-medium text-gray-900">{file.name}</span>
                      <span className="text-xs text-gray-500">({(file.size / 1024).toFixed(1)} KB)</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Websites Preview */}
          {websites.length > 0 && (
            <div className="mt-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-medium text-gray-900">
                  Websites to Audit ({websites.length})
                </h3>
                {isDemoMode && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Demo Mode
                  </span>
                )}
                {isUsingRealAPI && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Real API
                  </span>
                )}
              </div>
              <div className="max-h-60 overflow-y-auto space-y-2">
                {websites.map((site, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{site.url}</p>
                      {site.name && (
                        <p className="text-xs text-gray-500">{site.name}</p>
                      )}
                    </div>
                    {site.category && (
                      <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                        {site.category}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="mt-6 flex flex-wrap gap-4">
            <button
              onClick={startAudit}
              disabled={websites.length === 0 || isAuditing}
              className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {isAuditing ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Start Audit
                </>
              )}
            </button>
            
            <button
              onClick={loadDemoData}
              disabled={isAuditing}
              className="px-6 py-3 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Load Demo Data
            </button>
            
            <button
              onClick={clearAll}
              className="px-6 py-3 bg-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-300"
            >
              Clear All
            </button>
          </div>
        </div>

        {/* Progress Display */}
        {progress && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
            <div className="mb-4">
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                Audit Progress
              </h2>
              <p className="text-gray-600">{progress.message}</p>
            </div>
            
            {/* Progress Bar */}
            <div className="mb-4">
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>Processing websites...</span>
                <span>{progress.current} / {progress.total}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(progress.current / progress.total) * 100}%` }}
                ></div>
              </div>
            </div>
            
            {/* Current URL */}
            {progress.url && (
              <div className="bg-blue-50 p-3 rounded-md">
                <p className="text-sm text-blue-800">
                  <strong>Currently processing:</strong> {progress.url}
                </p>
              </div>
            )}
            
            {/* Processing Status */}
            <div className="mt-6">
              <div className="bg-blue-50 p-4 rounded-md">
                <div className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <p className="text-blue-800">
                    <strong>Processing websites with Ollama AI...</strong><br/>
                    <span className="text-sm">Analyzing age verification requirements in parallel batches.</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Audit Report */}
        {auditReport && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="mb-6 flex justify-between items-center">
              <h2 className="text-2xl font-semibold text-gray-900">
                Audit Report
              </h2>
              <button
                onClick={exportReport}
                className="inline-flex items-center px-4 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export CSV
              </button>
            </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm font-medium text-blue-600">Total Websites</p>
                  <p className="text-2xl font-bold text-blue-900">{auditReport.totalWebsites}</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-sm font-medium text-green-600">Processed</p>
                  <p className="text-2xl font-bold text-green-900">{auditReport.processedWebsites}</p>
                </div>
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <p className="text-sm font-medium text-yellow-600">With Age Verification</p>
                  <p className="text-2xl font-bold text-yellow-900">
                    {auditReport.results.filter(r => r.ageVerification).length}
                  </p>
                </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Website
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Age Verification
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Method
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Notes
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {auditReport.results.map((result, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{result.url}</p>
                          {result.name && (
                            <p className="text-sm text-gray-500">{result.name}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          result.ageVerification
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {result.ageVerification ? 'Yes' : 'No'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {result.method || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {result.notes || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 