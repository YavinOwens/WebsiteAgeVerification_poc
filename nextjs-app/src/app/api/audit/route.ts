import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

interface WebsiteData {
  url: string;
  name?: string;
  category?: string;
}

interface AuditRequest {
  websites: WebsiteData[];
}

interface AuditResult {
  website: string;
  has_age_verification: boolean;
  verification_type: string;
  confidence_score: number;
  details: string;
  timestamp: string;
  name?: string;
  category?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: AuditRequest = await request.json();
    const { websites } = body;

    if (!websites || websites.length === 0) {
      return NextResponse.json(
        { error: 'No websites provided' },
        { status: 400 }
      );
    }

        // Process all websites without limit
    const limitedWebsites = websites;

    // Extract URLs from the websites data
    const urls = limitedWebsites.map(site => site.url);

    // Create a temporary file with the URLs
    const tempFile = path.join(process.cwd(), 'temp_websites.txt');
    fs.writeFileSync(tempFile, urls.join('\n'));

    // Call the Python backend
    const results = await callPythonBackend(tempFile);

    // Clean up temp file
    fs.unlinkSync(tempFile);

    // Map results back to include name and category
    const mappedResults: AuditResult[] = results.map((result: unknown, index: number) => {
      const typedResult = result as Record<string, unknown>;
      return {
        website: typedResult.website as string,
        has_age_verification: typedResult.has_age_verification as boolean,
        verification_type: typedResult.verification_type as string,
        confidence_score: typedResult.confidence_score as number,
        details: typedResult.details as string,
        timestamp: typedResult.timestamp as string,
        name: websites[index]?.name,
        category: websites[index]?.category,
      };
    });

    return NextResponse.json({
      success: true,
      results: mappedResults,
      totalWebsites: websites.length,
      processedWebsites: results.length,
    });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Failed to process audit request' },
      { status: 500 }
    );
  }
}

async function callPythonBackend(tempFile: string): Promise<unknown[]> {
  return new Promise((resolve, reject) => {
    // Path to the Python CLI script (relative to the project root)
    const pythonScript = path.join(process.cwd(), '..', 'cli.py');
    
    // Spawn Python process using the virtual environment
    const pythonProcess = spawn(path.join(process.cwd(), '..', 'venv', 'bin', 'python'), [
      pythonScript,
      '--file', tempFile,
      '--output', 'temp_results'
    ], {
      cwd: path.join(process.cwd(), '..'), // Run from parent directory
      env: { ...process.env, PYTHONPATH: path.join(process.cwd(), '..') }
    });

    // Set a timeout of 10 minutes (600 seconds)
    const timeout = setTimeout(() => {
      pythonProcess.kill('SIGTERM');
      reject(new Error('Python process timed out after 10 minutes'));
    }, 600000);

    let stdout = '';
    let stderr = '';

    pythonProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    pythonProcess.on('close', (code) => {
      clearTimeout(timeout); // Clear the timeout
      
      if (code === 0) {
        try {
          // Try to parse JSON output
          const results = JSON.parse(stdout);
          resolve(results);
        } catch {
          // If JSON parsing fails, try to read from output file
          // Look for the most recent JSON file in audit_data directory
          const auditDataDir = path.join(process.cwd(), '..', 'audit_data');
          if (fs.existsSync(auditDataDir)) {
            try {
              const files = fs.readdirSync(auditDataDir);
              const jsonFiles = files.filter(file => file.endsWith('.json') && file.includes('temp_results_'));
              
              if (jsonFiles.length > 0) {
                // Get the most recent file
                const mostRecentFile = jsonFiles.sort().pop();
                const outputFile = path.join(auditDataDir, mostRecentFile!);
                const fileContent = fs.readFileSync(outputFile, 'utf8');
                const results = JSON.parse(fileContent);
                fs.unlinkSync(outputFile); // Clean up
                resolve(results);
              } else {
                reject(new Error('No output file found in audit_data directory'));
              }
            } catch (fileError) {
              console.error('Failed to parse results:', fileError);
              reject(new Error('Failed to parse audit results'));
            }
          } else {
            reject(new Error('audit_data directory not found'));
          }
        }
      } else {
        console.error('Python process error:', stderr);
        reject(new Error(`Python process failed with code ${code}: ${stderr}`));
      }
    });

    pythonProcess.on('error', (error) => {
      clearTimeout(timeout); // Clear the timeout
      console.error('Failed to start Python process:', error);
      reject(error);
    });
  });
} 