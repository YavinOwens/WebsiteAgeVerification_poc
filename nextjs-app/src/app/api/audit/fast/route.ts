import { NextRequest, NextResponse } from 'next/server';
import { Ollama } from 'ollama';
import { jsonrepair } from 'jsonrepair';

// Configuration constants
const OLLAMA_CONFIG = {
  host: 'http://localhost:11434',
  timeout: 60000, // 60 seconds per request
  maxRetries: 2,
  healthCheckTimeout: 10000, // 10 seconds for health check
  batchSize: 3, // Process 3 websites at a time
  maxTotalTime: 600000, // 10 minutes total timeout for the entire audit (set to 0 to disable)
  enableTotalTimeout: true, // Set to false to disable total timeout
  // To disable timeout completely, set: enableTotalTimeout: false
  // To change timeout duration, set: maxTotalTime: 600000 (10 minutes)
} as const;

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

// Initialize Ollama client with timeout configuration
const ollama = new Ollama({
  host: OLLAMA_CONFIG.host,
  request: {
    timeout: OLLAMA_CONFIG.timeout,
  },
});

// Age verification prompt template
const AGE_VERIFICATION_PROMPT = `Analyze the following website for age verification mechanisms. 

Website: {url}
Category: {category}

Please determine if this website has age verification requirements and what type of verification is used.

Consider:
- Age verification popups or overlays
- Birth date input fields
- Age confirmation checkboxes
- Credit card requirements
- Government ID requirements
- Terms of service age restrictions
- Content warnings or age gates

IMPORTANT: Respond ONLY with valid JSON in this exact format. Use double quotes for all strings and property names. Do not include any text before or after the JSON:

{
  "has_age_verification": true,
  "verification_type": "popup",
  "confidence_score": 0.8,
  "details": "Detailed explanation of findings"
}`;

/**
 * Robust JSON parsing helper that handles malformed JSON from AI models
 * @param content - The raw content from the AI model
 * @param website - Website information for logging
 * @returns Parsed JSON object or null if parsing fails
 */
function parseRobustJSON(content: string, website: WebsiteData): any {
  try {
    // First, try to extract JSON from the content
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.log(`No JSON found in response for ${website.url}`);
      return null;
    }

    let jsonString = jsonMatch[0];
    console.log(`Extracted JSON string for ${website.url}:`, jsonString);

    // Pre-process: Fix obvious issues before attempting parsing
    let preProcessedJson = jsonString
      // Fix unquoted property names that are immediately followed by values
      .replace(/(\w+):\s*([^",\s][^,}]*)/g, '"$1": "$2"')
      // Fix unquoted property names followed by quoted values
      .replace(/(\w+):\s*"([^"]*)"/g, '"$1": "$2"')
      // Fix unquoted property names followed by null
      .replace(/(\w+):\s*null/g, '"$1": "null"')
      // Fix unquoted property names followed by true/false
      .replace(/(\w+):\s*(true|false)/g, '"$1": "$2"');

    // Attempt 1: Direct JSON parsing
    try {
      return JSON.parse(preProcessedJson);
    } catch (error) {
      console.log(`Direct JSON parsing failed for ${website.url}, attempting repairs...`);
    }

    // Attempt 2: Use jsonrepair library for automatic fixes
    try {
      const repaired = jsonrepair(preProcessedJson);
      return JSON.parse(repaired);
    } catch (error) {
      console.log(`jsonrepair failed for ${website.url}, trying manual fixes...`);
    }

    // Attempt 3: Manual fixes for common AI model JSON issues
    try {
      let fixedJson = preProcessedJson;
      
      // Fix common issues
      fixedJson = fixedJson
        // Replace single quotes with double quotes
        .replace(/'/g, '"')
        // Fix unquoted property names (more comprehensive) - handle all cases
        .replace(/(\w+):\s*/g, '"$1": ')
        // Fix trailing commas
        .replace(/,(\s*[}\]])/g, '$1')
        // Fix missing quotes around boolean values
        .replace(/:\s*(true|false)\s*([,}])/g, ':"$1"$2')
        // Fix missing quotes around numbers (if they're meant to be strings)
        .replace(/:\s*(\d+\.\d+)\s*([,}])/g, ':"$1"$2')
        // Remove any non-printable characters
        .replace(/[\x00-\x1F\x7F-\x9F]/g, '')
        // Fix multiple spaces
        .replace(/\s+/g, ' ')
        // Fix null values without quotes
        .replace(/:\s*null\s*([,}])/g, ':"null"$1')
        // Fix empty strings
        .replace(/:\s*""\s*([,}])/g, ':"empty"$1')
        // Fix unquoted property names that appear after other properties
        .replace(/([^"])\s*(\w+):\s*/g, '$1, "$2": ')
        // Fix unquoted property names at the start of objects
        .replace(/\{\s*(\w+):\s*/g, '{ "$1": ')
        // Fix specific pattern like "anonymityScore: 0.95" -> "anonymityScore": "0.95"
        .replace(/(\w+):\s*(\d+\.\d+)/g, '"$1": "$2"')
        // Fix specific pattern like "confidence_score: 0" -> "confidence_score": "0"
        .replace(/(\w+):\s*(\d+)/g, '"$1": "$2"')
        .trim();

      return JSON.parse(fixedJson);
    } catch (error) {
      console.log(`Manual JSON fixes failed for ${website.url}:`, error);
    }

    // Attempt 4: Try to extract key-value pairs and build JSON manually
    try {
      const keyValuePairs: Record<string, any> = {};
      
      // Extract has_age_verification with multiple patterns
      const hasVerificationPatterns = [
        /has_age_verification["\s]*:["\s]*(true|false)/i,
        /has_age_verification["\s]*:["\s]*"?(true|false)"?/i,
        /has_age_verification["\s]*:["\s]*([^",\s}]+)/i,
        /has_age_verification["\s]*:["\s]*null/i
      ];
      
      for (const pattern of hasVerificationPatterns) {
        const match = content.match(pattern);
        if (match) {
          if (match[0].includes('null')) {
            keyValuePairs.has_age_verification = false;
          } else {
            const value = match[1]?.toLowerCase();
            keyValuePairs.has_age_verification = value === 'true' || value === 'yes' || value === '1';
          }
          break;
        }
      }
      
      // Extract verification_type with multiple patterns
      const verificationTypePatterns = [
        /verification_type["\s]*:["\s]*"([^"]+)"?/i,
        /verification_type["\s]*:["\s]*([^",\s}]+)/i,
        /verification_type["\s]*:["\s]*"([^"]*)"?/i,
        /verification_type["\s]*:["\s]*null/i
      ];
      
      for (const pattern of verificationTypePatterns) {
        const match = content.match(pattern);
        if (match) {
          if (match[0].includes('null')) {
            keyValuePairs.verification_type = 'none';
          } else if (match[1]) {
            keyValuePairs.verification_type = match[1].replace(/"/g, '').trim();
          }
          break;
        }
      }
      
      // Extract confidence_score with multiple patterns
      const confidencePatterns = [
        /confidence_score["\s]*:["\s]*([0-9.]+)/i,
        /confidence_score["\s]*:["\s]*"([0-9.]+)"/i,
        /confidence["\s]*:["\s]*([0-9.]+)/i,
        /confidence_score["\s]*:["\s]*([0-9]+)/i
      ];
      
      for (const pattern of confidencePatterns) {
        const match = content.match(pattern);
        if (match) {
          const score = parseFloat(match[1]);
          if (!isNaN(score)) {
            // Normalize score to 0-1 range if it's not already
            const normalizedScore = score > 1 ? score / 100 : score;
            if (normalizedScore >= 0 && normalizedScore <= 1) {
              keyValuePairs.confidence_score = normalizedScore;
              break;
            }
          }
        }
      }
      
      // Extract details with multiple patterns
      const detailsPatterns = [
        /details["\s]*:["\s]*"([^"]+)"/i,
        /details["\s]*:["\s]*([^"]+)/i,
        /details["\s]*:["\s]*"([^"]*)"?/i
      ];
      
      for (const pattern of detailsPatterns) {
        const match = content.match(pattern);
        if (match && match[1]) {
          keyValuePairs.details = match[1].replace(/"/g, '').trim();
          break;
        }
      }
      
      // Set defaults if not found
      if (keyValuePairs.has_age_verification === undefined) {
        // Try to infer from content
        const hasVerification = content.toLowerCase().includes('age verification') || 
                               content.toLowerCase().includes('birth date') ||
                               content.toLowerCase().includes('age gate') ||
                               content.toLowerCase().includes('verification');
        keyValuePairs.has_age_verification = hasVerification;
      }
      
      if (!keyValuePairs.verification_type) {
        keyValuePairs.verification_type = keyValuePairs.has_age_verification ? 'detected' : 'none';
      }
      
      if (!keyValuePairs.confidence_score) {
        keyValuePairs.confidence_score = keyValuePairs.has_age_verification ? 0.7 : 0.5;
      }
      
      if (!keyValuePairs.details) {
        keyValuePairs.details = 'Parsed from AI response';
      }
      
      if (Object.keys(keyValuePairs).length > 0) {
        console.log(`Built JSON from key-value extraction for ${website.url}:`, keyValuePairs);
        return keyValuePairs;
      }
    } catch (error) {
      console.log(`Key-value extraction failed for ${website.url}:`, error);
    }

          console.log(`All JSON parsing attempts failed for ${website.url}`);
      
      // Final fallback: try to extract basic information from the raw content
      try {
        const fallbackResult: Record<string, any> = {};
        
        // Try to determine if age verification is mentioned
        const hasVerification = content.toLowerCase().includes('age verification') || 
                               content.toLowerCase().includes('birth date') ||
                               content.toLowerCase().includes('age gate') ||
                               content.toLowerCase().includes('verification') ||
                               content.toLowerCase().includes('over 18') ||
                               content.toLowerCase().includes('adult content');
        
        fallbackResult.has_age_verification = hasVerification;
        fallbackResult.verification_type = hasVerification ? 'detected' : 'none';
        fallbackResult.confidence_score = hasVerification ? 0.6 : 0.4;
        fallbackResult.details = 'Parsed from raw content analysis';
        
        console.log(`Using fallback parsing for ${website.url}:`, fallbackResult);
        return fallbackResult;
      } catch (fallbackError) {
        console.error(`Fallback parsing also failed for ${website.url}:`, fallbackError);
        return null;
      }
    } catch (error) {
      console.error(`Unexpected error in parseRobustJSON for ${website.url}:`, error);
      return null;
    }
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

    console.log(`Processing ${websites.length} websites with direct Ollama integration`);

    // Set up total timeout for the entire audit process (optional)
    const startTime = Date.now();
    const checkTimeout = () => {
      if (!OLLAMA_CONFIG.enableTotalTimeout || OLLAMA_CONFIG.maxTotalTime <= 0) {
        return; // Timeout disabled
      }
      const elapsed = Date.now() - startTime;
      if (elapsed > OLLAMA_CONFIG.maxTotalTime) {
        throw new Error(`Audit process timed out after ${OLLAMA_CONFIG.maxTotalTime / 1000} seconds`);
      }
    };

    // Test if Ollama is available with timeout
    try {
      const healthCheck = await Promise.race([
        ollama.list(),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Ollama health check timed out')), OLLAMA_CONFIG.healthCheckTimeout)
        )
      ]);
      console.log('Ollama is available, using direct integration');
    } catch (ollamaError) {
      console.error('Ollama not available:', ollamaError);
      return NextResponse.json(
        { 
          error: 'Ollama service not available or not responding. Please ensure Ollama is running with: ollama serve',
          details: ollamaError instanceof Error ? ollamaError.message : 'Unknown error'
        },
        { status: 503 }
      );
    }

    const results: AuditResult[] = [];

    // Process websites in parallel batches for better performance
    for (let i = 0; i < websites.length; i += OLLAMA_CONFIG.batchSize) {
      // Check timeout before processing each batch
      checkTimeout();
      
      const batch = websites.slice(i, i + OLLAMA_CONFIG.batchSize);
      
      const batchPromises = batch.map(async (website) => {
        try {
          const prompt = AGE_VERIFICATION_PROMPT
            .replace('{url}', website.url)
            .replace('{category}', website.category || 'Unknown');

          console.log(`Analyzing: ${website.url}`);

          // Retry logic for Ollama requests
          let response;
          let retryCount = 0;
          
          while (retryCount <= OLLAMA_CONFIG.maxRetries) {
            // Check timeout before each retry attempt
            checkTimeout();
            
            try {
              response = await ollama.chat({
                model: 'phi3', // Using phi3 as specified
                messages: [
                  {
                    role: 'user',
                    content: prompt
                  }
                ],
                options: {
                  temperature: 0.1, // Lower temperature for more consistent results
                  num_predict: 500, // Limit response length
                  num_ctx: 2048, // Limit context window for faster responses
                }
              }) as Promise<{ message: { content: string } }>;
              
              // If we get here, the request was successful
              break;
            } catch (error) {
              retryCount++;
              console.log(`Attempt ${retryCount} failed for ${website.url}:`, error);
              
              if (retryCount > OLLAMA_CONFIG.maxRetries) {
                throw new Error(`Ollama request failed after ${OLLAMA_CONFIG.maxRetries} retries: ${error}`);
              }
              
              // Wait before retrying (exponential backoff)
              await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
            }
          }

          let result: AuditResult;
          
          try {
            // Use robust JSON parsing helper
            const content = response.message.content;
            console.log(`Raw response for ${website.url}:`, content);
            
            const parsed = parseRobustJSON(content, website);
            
            if (parsed) {
              // Successfully parsed JSON
              result = {
                website: website.url,
                has_age_verification: parsed.has_age_verification || false,
                verification_type: parsed.verification_type || 'unknown',
                confidence_score: parsed.confidence_score || 0,
                details: parsed.details || 'No details provided',
                timestamp: new Date().toISOString(),
                name: website.name,
                category: website.category,
              };
            } else {
              // Fallback parsing for non-JSON responses
              const hasVerification = content.toLowerCase().includes('age verification') || 
                                   content.toLowerCase().includes('birth date') ||
                                   content.toLowerCase().includes('age gate') ||
                                   content.toLowerCase().includes('verification');
              
              result = {
                website: website.url,
                has_age_verification: hasVerification,
                verification_type: hasVerification ? 'detected' : 'none',
                confidence_score: hasVerification ? 0.7 : 0.5,
                details: content,
                timestamp: new Date().toISOString(),
                name: website.name,
                category: website.category,
              };
            }
          } catch (parseError) {
            console.error(`Failed to parse response for ${website.url}:`, parseError);
            console.error(`Response content:`, response.message.content);
            result = {
              website: website.url,
              has_age_verification: false,
              verification_type: 'unknown',
              confidence_score: 0,
              details: 'Failed to parse Ollama response',
              timestamp: new Date().toISOString(),
              name: website.name,
              category: website.category,
            };
          }

          return result;
        } catch (error) {
          console.error(`Error processing ${website.url}:`, error);
          
          // Determine if it's a timeout error
          const isTimeout = error instanceof Error && (
            error.message.includes('timeout') || 
            error.message.includes('timed out') ||
            error.message.includes('ETIMEDOUT') ||
            error.message.includes('ENOTFOUND')
          );
          
          return {
            website: website.url,
            has_age_verification: false,
            verification_type: isTimeout ? 'timeout' : 'error',
            confidence_score: 0,
            details: isTimeout 
              ? 'Request timed out - Ollama service may be overloaded or unavailable'
              : `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
            timestamp: new Date().toISOString(),
            name: website.name,
            category: website.category,
          };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      console.log(`Completed batch ${Math.floor(i / OLLAMA_CONFIG.batchSize) + 1}/${Math.ceil(websites.length / OLLAMA_CONFIG.batchSize)}`);
      
      // Check timeout after each batch
      checkTimeout();
    }

    return NextResponse.json({
      success: true,
      results: results,
      totalWebsites: websites.length,
      processedWebsites: results.length,
    });

  } catch (error) {
    console.error('API Error:', error);
    
    // Check if it's a timeout error
    const isTimeout = error instanceof Error && error.message.includes('timed out');
    
    return NextResponse.json(
      { 
        error: isTimeout ? 'Audit process timed out' : 'Failed to process audit request',
        details: error instanceof Error ? error.message : 'Unknown error',
        processedWebsites: results?.length || 0,
        totalWebsites: websites?.length || 0
      },
      { status: isTimeout ? 408 : 500 }
    );
  }
}

 