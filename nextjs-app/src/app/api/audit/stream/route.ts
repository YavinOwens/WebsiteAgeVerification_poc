import { NextRequest } from 'next/server';
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

export async function POST(request: NextRequest) {
  const body: AuditRequest = await request.json();
  const { websites } = body;

  if (!websites || websites.length === 0) {
    return new Response('No websites provided', { status: 400 });
  }

  // Process all websites without limit
  const limitedWebsites = websites;

  // Extract URLs from the websites data
  const urls = limitedWebsites.map(site => site.url);

  // Create a temporary file with the URLs
  const tempFile = path.join(process.cwd(), 'temp_websites.txt');
  fs.writeFileSync(tempFile, urls.join('\n'));

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      // Send initial progress
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({
        type: 'start',
        message: `Starting audit of ${limitedWebsites.length} websites...`,
        total: limitedWebsites.length,
        current: 0
      })}\n\n`));

      // Path to the Python CLI script
      const pythonScript = path.join(process.cwd(), '..', 'cli.py');
      
      // Spawn Python process using the virtual environment
      const pythonProcess = spawn(path.join(process.cwd(), '..', 'venv', 'bin', 'python'), [
        pythonScript,
        '--file', tempFile,
        '--output', 'temp_results'
      ], {
        cwd: path.join(process.cwd(), '..'),
        env: { ...process.env, PYTHONPATH: path.join(process.cwd(), '..') }
      });

      // Set a timeout of 10 minutes
      const timeout = setTimeout(() => {
        pythonProcess.kill('SIGTERM');
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: 'error',
          message: 'Audit timed out after 10 minutes'
        })}\n\n`));
        controller.close();
      }, 600000);

      let currentIndex = 0;
      const results: unknown[] = [];

      pythonProcess.stdout.on('data', (data) => {
        const output = data.toString();
        console.log('Python stdout:', output);
        
        // Send progress updates
        if (output.includes('Auditing:')) {
          const urlMatch = output.match(/Auditing: (https?:\/\/[^\s]+)/);
          if (urlMatch) {
            currentIndex++;
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              type: 'progress',
              message: `Processing ${urlMatch[1]}...`,
              current: currentIndex,
              total: limitedWebsites.length,
              url: urlMatch[1]
            })}\n\n`));
          }
        }

        // Send completion when we see the summary
        if (output.includes('=== AUDIT SUMMARY ===')) {
          // Read the results from the output file
          const auditDataDir = path.join(process.cwd(), '..', 'audit_data');
          if (fs.existsSync(auditDataDir)) {
            try {
              const files = fs.readdirSync(auditDataDir);
              const jsonFiles = files.filter(file => file.endsWith('.json') && file.includes('temp_results_'));
              
              if (jsonFiles.length > 0) {
                const mostRecentFile = jsonFiles.sort().pop();
                const outputFile = path.join(auditDataDir, mostRecentFile!);
                const fileContent = fs.readFileSync(outputFile, 'utf8');
                const fileResults = JSON.parse(fileContent);
                
                // Clean up the file
                fs.unlinkSync(outputFile);
                
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                  type: 'complete',
                  message: 'Audit completed successfully!',
                  results: fileResults,
                  total: limitedWebsites.length,
                  processed: fileResults.length
                })}\n\n`));
              }
            } catch (fileError) {
              console.error('Failed to read results file:', fileError);
            }
          }
        }
      });

      pythonProcess.stderr.on('data', (data) => {
        const error = data.toString();
        console.error('Python stderr:', error);
        
        if (error.includes('SSL Error') || error.includes('Error accessing')) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'warning',
            message: `Warning: ${error.trim()}`,
            current: currentIndex,
            total: limitedWebsites.length
          })}\n\n`));
        }
      });

      pythonProcess.on('close', (code) => {
        clearTimeout(timeout);
        
        if (code === 0) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'complete',
            message: 'Audit completed successfully!',
            results: results,
            total: limitedWebsites.length,
            processed: results.length
          })}\n\n`));
        } else {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'error',
            message: `Python process failed with code ${code}`
          })}\n\n`));
        }
        
        // Clean up temp file
        try {
          fs.unlinkSync(tempFile);
        } catch (e) {
          console.error('Failed to clean up temp file:', e);
        }
        
        controller.close();
      });

      pythonProcess.on('error', (error) => {
        clearTimeout(timeout);
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: 'error',
          message: `Failed to start Python process: ${error.message}`
        })}\n\n`));
        controller.close();
      });
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
} 