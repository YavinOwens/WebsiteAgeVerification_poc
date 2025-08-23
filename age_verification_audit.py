#!/usr/bin/env python3
"""
Age Verification Audit Tool
Uses Ollama SDK to analyze websites for age verification capabilities
"""

import os
import json
import time
import requests
import urllib3
import random
from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass
from datetime import datetime
import pandas as pd
from tqdm import tqdm
from colorama import init, Fore, Style
import ollama
from bs4 import BeautifulSoup
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager

# Suppress SSL warnings
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# Initialize colorama for colored output
init()

@dataclass
class AgeVerificationResult:
    """Data class to store age verification analysis results"""
    website: str
    has_age_verification: bool
    verification_type: str
    confidence_score: float
    details: str
    timestamp: datetime
    screenshot_path: Optional[str] = None

class AgeVerificationAuditor:
    """Main class for auditing age verification on websites"""
    
    def __init__(self, ollama_model: str = "phi3"):
        """
        Initialize the auditor
        
        Args:
            ollama_model: The Ollama model to use for analysis
        """
        self.ollama_model = ollama_model
        self.results: List[AgeVerificationResult] = []
        self.setup_driver()
        
    def setup_driver(self):
        """Setup Selenium WebDriver with enhanced headless detection evasion"""
        from selenium.webdriver.chrome.service import Service as ChromeService
        from selenium.webdriver.chrome.options import Options
        import os
        import ssl
        import random
        
        # Disable SSL verification at the Python level
        ssl._create_default_https_context = ssl._create_unverified_context
        
        # Configure Chrome options with extensive evasion techniques
        chrome_options = Options()
        
        # Standard headless options
        chrome_options.add_argument("--headless=new")  # New headless mode is less detectable
        chrome_options.add_argument("--no-sandbox")
        chrome_options.add_argument("--disable-dev-shm-usage")
        chrome_options.add_argument("--disable-gpu")
        
        # Set a random viewport size to appear more human-like
        width = random.randint(1200, 1920)
        height = random.randint(800, 1080)
        chrome_options.add_argument(f"--window-size={width},{height}")
        
        # Disable automation flags
        chrome_options.add_argument("--disable-blink-features=AutomationControlled")
        chrome_options.add_experimental_option("excludeSwitches", ["enable-automation"])
        chrome_options.add_experimental_option('useAutomationExtension', False)
        
        # Disable various automation signals
        chrome_options.add_argument("--disable-infobars")
        chrome_options.add_argument("--disable-extensions")
        chrome_options.add_argument("--disable-popup-blocking")
        chrome_options.add_argument("--disable-notifications")
        chrome_options.add_argument("--disable-save-password-bubble")
        chrome_options.add_argument("--disable-single-click-autofill")
        chrome_options.add_argument("--disable-translate")
        
        # SSL and security settings
        chrome_options.add_argument("--ignore-certificate-errors")
        chrome_options.add_argument("--allow-running-insecure-content")
        chrome_options.add_argument("--allow-insecure-localhost")
        chrome_options.add_argument("--disable-web-security")
        chrome_options.add_argument('--ignore-ssl-errors=yes')
        chrome_options.add_argument('--accept-insecure-certs')
        
        # Language and location settings
        chrome_options.add_argument("--lang=en-US,en;q=0.9")
        
        # Set a common user agent that changes with each run
        user_agents = [
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1.1 Safari/605.1.15',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0'
        ]
        chrome_options.add_argument(f'user-agent={random.choice(user_agents)}')
        
        try:
            # Try using the Homebrew-installed chromedriver
            service = ChromeService(executable_path="/opt/homebrew/bin/chromedriver")
            
            # Initialize the WebDriver with service and options
            self.driver = webdriver.Chrome(service=service, options=chrome_options)
            
            # Set reasonable timeouts
            self.driver.set_page_load_timeout(30)
            self.driver.set_script_timeout(30)
            
            # Execute CDP commands to further evade detection
            self.driver.execute_cdp_cmd('Network.setUserAgentOverride', {
                "userAgent": chrome_options.arguments[-1].split('=', 1)[1],
                "platform": "Win32"
            })
            
            # Override the navigator properties
            self.driver.execute_script("""
                // Override the plugins property to use a more common fingerprint
                Object.defineProperty(navigator, 'plugins', {
                    get: () => [1, 2, 3, 4, 5],
                });
                
                // Override the languages property
                Object.defineProperty(navigator, 'languages', {
                    get: () => ['en-US', 'en'],
                });
                
                // Override the webdriver property
                Object.defineProperty(navigator, 'webdriver', {
                    get: () => undefined,
                });
                
                // Override the chrome object
                window.chrome = {
                    runtime: {},
                    // Add other chrome properties as needed
                };
            """)
            
            # Set additional CDP parameters
            self.driver.execute_cdp_cmd('Page.addScriptToEvaluateOnNewDocument', {
                'source': '''
                    Object.defineProperty(navigator, 'webdriver', {
                        get: () => undefined
                    });
                    window.navigator.chrome = {
                        runtime: {},
                        // etc.
                    };
                '''
            })
            
            # Set geolocation and timezone to common values
            params = {
                'latitude': 51.5074,
                'longitude': -0.1278,
                'accuracy': 100
            }
            self.driver.execute_cdp_cmd('Emulation.setGeolocationOverride', params)
            
            # Set timezone
            self.driver.execute_cdp_cmd('Emulation.setTimezoneOverride', {
                'timezoneId': 'Europe/London'
            })
            
            print(f"{Fore.GREEN}Successfully initialized Chrome driver with enhanced anti-detection.{Style.RESET_ALL}")
            
        except Exception as e:
            print(f"{Fore.YELLOW}Warning: Could not initialize Chrome driver. Error: {e}{Style.RESET_ALL}")
            print(f"{Fore.YELLOW}Falling back to requests-based scraping with SSL verification disabled.{Style.RESET_ALL}")
            self.driver = None
        
    def get_website_content(self, url: str, max_retries: int = 3) -> Tuple[str, str]:
        """
        Get website content using Selenium or requests with anti-bot bypass
        
        Args:
            url: Website URL to analyze
            max_retries: Maximum number of retry attempts
            
        Returns:
            Tuple of (page_source, final_url)
        """
        # Common browser user agents
        user_agents = [
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1.1 Safari/605.1.15',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0'
        ]
        
        # Common headers
        headers = {
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'DNT': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Sec-Fetch-User': '?1',
            'Cache-Control': 'max-age=0',
            'Referer': 'https://www.google.com/'
        }
        
        # Try with Selenium first if available
        if self.driver is not None:
            for attempt in range(max_retries):
                try:
                    print(f"{Fore.CYAN}Attempt {attempt + 1}/{max_retries}: Fetching {url} using Selenium...{Style.RESET_ALL}")
                    
                    # Rotate user agent
                    user_agent = user_agents[attempt % len(user_agents)]
                    self.driver.execute_cdp_cmd('Network.setUserAgentOverride', {"userAgent": user_agent})
                    
                    # Add random delay to appear more human-like
                    time.sleep(random.uniform(1.0, 3.0))
                    
                    # Configure Chrome to ignore SSL errors
                    self.driver.execute_cdp_cmd('Network.setIgnoreCertificateErrors', {'ignore': True})
                    
                    # Navigate to the page with JavaScript disabled first to avoid bot detection
                    try:
                        self.driver.execute_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")
                        self.driver.get('about:blank')
                        self.driver.execute_script("window.open('')")
                        self.driver.switch_to.window(self.driver.window_handles[-1])
                    except:
                        pass
                    
                    # Now try to load the actual URL
                    self.driver.get(url)
                    
                    # Wait for JavaScript to execute with random delay
                    time.sleep(random.uniform(2.0, 5.0))
                    
                    # Get page source and check for anti-bot measures
                    page_source = self.driver.page_source.lower()
                    current_url = self.driver.current_url
                    
                    # Check for common anti-bot measures
                    if any(term in page_source for term in ['bot', 'captcha', 'security', 'access denied', 'forbidden', 'cloudflare']):
                        print(f"{Fore.YELLOW}Warning: Possible anti-bot measure detected{Style.RESET_ALL}")
                        if attempt < max_retries - 1:
                            continue
                    
                    # Check if we got a valid response
                    if not page_source or len(page_source) < 100:
                        print(f"{Fore.YELLOW}Warning: Received empty or very small page{Style.RESET_ALL}")
                        if attempt < max_retries - 1:
                            continue
                    
                    if "404" in self.driver.title.lower() or "not found" in page_source:
                        print(f"{Fore.YELLOW}Warning: Page not found (404) for {url}{Style.RESET_ALL}")
                        return "", current_url
                    
                    return page_source, current_url
                    
                except Exception as e:
                    print(f"{Fore.YELLOW}Attempt {attempt + 1} failed: {str(e)}{Style.RESET_ALL}")
                    if attempt == max_retries - 1:
                        print(f"{Fore.RED}All Selenium attempts failed, falling back to requests{Style.RESET_ALL}")
                        try:
                            self.driver.quit()
                        except:
                            pass
                        self.driver = None
                    else:
                        # Wait before retry with exponential backoff
                        time.sleep(2 ** attempt)
        
        # Fall back to requests with rotating user agents and retries
        for attempt in range(max_retries):
            try:
                # Create a new session for each attempt
                session = requests.Session()
                session.verify = False  # Disable SSL verification
                
                # Disable SSL warnings for requests
                requests.packages.urllib3.disable_warnings()
                
                # Set headers with rotating user agent
                headers['User-Agent'] = user_agents[attempt % len(user_agents)]
                
                print(f"{Fore.CYAN}Attempt {attempt + 1}/{max_retries}: Falling back to requests for {url}...{Style.RESET_ALL}")
                
                # Try with verify=False to bypass SSL verification
                response = session.get(
                    url,
                    headers=headers,
                    timeout=15,
                    verify=False,  # Disable SSL verification
                    allow_redirects=True
                )
                
                # Check for common anti-bot measures in response
                if any(term in response.text.lower() for term in ['bot', 'captcha', 'security', 'access denied', 'forbidden', 'cloudflare']):
                    print(f"{Fore.YELLOW}Warning: Possible anti-bot measure detected{Style.RESET_ALL}")
                    if attempt < max_retries - 1:
                        continue
                
                response.raise_for_status()
                
                # Check if we got a valid response
                if not response.text or len(response.text) < 100:
                    print(f"{Fore.YELLOW}Warning: Received empty or very small page{Style.RESET_ALL}")
                    if attempt < max_retries - 1:
                        continue
                
                return response.text, response.url
                
            except requests.exceptions.SSLError as e:
                print(f"{Fore.YELLOW}SSL Error: {str(e)}{Style.RESET_ALL}")
                if attempt == max_retries - 1:
                    return "", f"SSL Error: {str(e)}"
            
            except requests.exceptions.RequestException as e:
                print(f"{Fore.YELLOW}Attempt {attempt + 1} failed: {str(e)}{Style.RESET_ALL}")
                if attempt == max_retries - 1:
                    return "", f"Request failed: {str(e)}"
                
                # Exponential backoff
                time.sleep(2 ** attempt)
        
        return "", "All attempts failed"
    
    def analyze_with_ollama(self, url: str, page_text: str) -> Dict:
        """
        Use Ollama to analyze website for age verification
        
        Args:
            url: Website URL
            page_text: Extracted text content
            
        Returns:
            Analysis results from Ollama
        """
        prompt = f"""
        Analyze the following website content for age verification mechanisms.
        
        Website: {url}
        Content: {page_text[:3000]}  # Limit content length
        
        Please provide a JSON response with the following structure:
        {{
            "has_age_verification": boolean,
            "verification_type": "string (e.g., 'birth_date_input', 'age_checkbox', 'credit_card', 'government_id', 'none')",
            "confidence_score": float (0.0 to 1.0),
            "details": "string describing what you found"
        }}
        
        Look for:
        1. Age verification popups or overlays
        2. Birth date input fields
        3. Age confirmation checkboxes
        4. Credit card verification requirements
        5. Government ID verification
        6. Age-related warnings or disclaimers
        7. Terms of service mentioning age requirements
        """
        
        try:
            response = ollama.chat(model=self.ollama_model, messages=[
                {
                    'role': 'user',
                    'content': prompt
                }
            ])
            
            # Extract JSON from response
            content = response['message']['content']
            
            # Try to parse JSON from the response
            try:
                # Find JSON in the response
                start_idx = content.find('{')
                end_idx = content.rfind('}') + 1
                if start_idx != -1 and end_idx != 0:
                    json_str = content[start_idx:end_idx]
                    return json.loads(json_str)
                else:
                    # Fallback: create a basic response
                    return {
                        "has_age_verification": False,
                        "verification_type": "unknown",
                        "confidence_score": 0.0,
                        "details": "Could not parse Ollama response"
                    }
            except json.JSONDecodeError:
                return {
                    "has_age_verification": False,
                    "verification_type": "unknown",
                    "confidence_score": 0.0,
                    "details": "Invalid JSON response from Ollama"
                }
                
        except Exception as e:
            print(f"{Fore.RED}Error with Ollama analysis: {str(e)}{Style.RESET_ALL}")
            return {
                "has_age_verification": False,
                "verification_type": "error",
                "confidence_score": 0.0,
                "details": f"Ollama error: {str(e)}"
            }
    
    def take_screenshot(self, url: str) -> str:
        """
        Take a screenshot of the website
        
        Args:
            url: Website URL
            
        Returns:
            Path to screenshot file or None if failed
        """
        if not self.driver:
            return None
            
        try:
            # Create audit_data directory if it doesn't exist
            import os
            audit_dir = "audit_data"
            os.makedirs(audit_dir, exist_ok=True)
            
            # Generate filename
            domain = url.replace("https://", "").replace("http://", "").replace("/", "_")
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"screenshot_{domain}_{timestamp}.png"
            
            screenshot_path = os.path.join(audit_dir, filename)
            self.driver.save_screenshot(screenshot_path)
            return screenshot_path
        except Exception as e:
            print(f"{Fore.YELLOW}Failed to take screenshot: {e}{Style.RESET_ALL}")
            return None
    
    def audit_website(self, url: str) -> AgeVerificationResult:
        """
        Audit a single website for age verification
        
        Args:
            url: Website URL to audit
            
        Returns:
            AgeVerificationResult object
        """
        print(f"{Fore.CYAN}Auditing: {url}{Style.RESET_ALL}")
        
        # Get website content
        page_source, page_text = self.get_website_content(url)
        
        if not page_text:
            return AgeVerificationResult(
                website=url,
                has_age_verification=False,
                verification_type="error",
                confidence_score=0.0,
                details="Could not access website - may be blocked, down, or have SSL issues",
                timestamp=datetime.now()
            )
        
        # Analyze with Ollama
        analysis = self.analyze_with_ollama(url, page_text)
        
        # Take screenshot
        screenshot_path = self.take_screenshot(url)
        
        # Create result
        result = AgeVerificationResult(
            website=url,
            has_age_verification=analysis.get("has_age_verification", False),
            verification_type=analysis.get("verification_type", "unknown"),
            confidence_score=analysis.get("confidence_score", 0.0),
            details=analysis.get("details", ""),
            timestamp=datetime.now(),
            screenshot_path=screenshot_path
        )
        
        # Print result
        status = f"{Fore.GREEN}✓ Age verification found" if result.has_age_verification else f"{Fore.RED}✗ No age verification"
        print(f"  {status}{Style.RESET_ALL}")
        print(f"  Type: {result.verification_type}")
        print(f"  Confidence: {result.confidence_score:.2f}")
        print(f"  Details: {result.details}")
        
        return result
    
    def audit_websites(self, urls: List[str]) -> List[AgeVerificationResult]:
        """
        Audit multiple websites
        
        Args:
            urls: List of website URLs to audit
            
        Returns:
            List of AgeVerificationResult objects
        """
        print(f"{Fore.BLUE}Starting age verification audit for {len(urls)} websites...{Style.RESET_ALL}")
        
        results = []
        for url in tqdm(urls, desc="Auditing websites"):
            result = self.audit_website(url)
            results.append(result)
            time.sleep(1)  # Be respectful to websites
            
        self.results = results
        return results
    
    def save_results(self, results: List[AgeVerificationResult], output_prefix: str = "age_verification_audit") -> Tuple[str, str]:
        """
        Save audit results to CSV and JSON files in audit_data folder
        
        Args:
            results: List of AgeVerificationResult objects
            output_prefix: Prefix for output filenames
            
        Returns:
            Tuple of (csv_path, json_path)
        """
        # Create audit_data directory if it doesn't exist
        import os
        audit_dir = "audit_data"
        os.makedirs(audit_dir, exist_ok=True)
        
        # Generate timestamp for unique filenames
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        # Create filenames with audit_data directory
        csv_filename = f"{output_prefix}_{timestamp}.csv"
        json_filename = f"{output_prefix}_{timestamp}.json"
        
        csv_path = os.path.join(audit_dir, csv_filename)
        json_path = os.path.join(audit_dir, json_filename)
        
        # Convert results to DataFrame format
        data = []
        for result in results:
            data.append({
                'website': result.website,
                'has_age_verification': result.has_age_verification,
                'verification_type': result.verification_type,
                'confidence_score': result.confidence_score,
                'details': result.details,
                'timestamp': result.timestamp.isoformat(),
                'screenshot_path': result.screenshot_path
            })
        
        # Save as CSV
        df = pd.DataFrame(data)
        df.to_csv(csv_path, index=False)
        
        # Save as JSON
        with open(json_path, 'w') as f:
            json.dump(data, f, indent=2, default=str)
        
        return csv_path, json_path
    
    def print_summary(self):
        """Print a summary of the audit results"""
        total = len(self.results)
        with_verification = sum(1 for r in self.results if r.has_age_verification)
        without_verification = total - with_verification
        
        print(f"\n{Fore.BLUE}=== AUDIT SUMMARY ==={Style.RESET_ALL}")
        print(f"Total websites audited: {total}")
        print(f"Websites with age verification: {with_verification}")
        print(f"Websites without age verification: {without_verification}")
        print(f"Verification rate: {with_verification/total*100:.1f}%")
        
        # Show verification types
        types = {}
        for result in self.results:
            if result.has_age_verification:
                types[result.verification_type] = types.get(result.verification_type, 0) + 1
        
        if types:
            print(f"\n{Fore.YELLOW}Verification types found:{Style.RESET_ALL}")
            for vtype, count in types.items():
                print(f"  {vtype}: {count}")
    
    def cleanup(self):
        """Clean up resources"""
        if hasattr(self, 'driver') and self.driver:
            self.driver.quit()

def main():
    """Main function to run the age verification audit"""
    # Example websites to test
    test_websites = [
        "https://www.alcohol.com",
        "https://www.cigarettes.com", 
        "https://www.casino.com",
        "https://www.pornhub.com",
        "https://www.reddit.com",
        "https://www.youtube.com",
        "https://www.facebook.com",
        "https://www.instagram.com"
    ]
    
    # Initialize auditor
    auditor = AgeVerificationAuditor(ollama_model="phi3")
    
    try:
        # Run audit
        results = auditor.audit_websites(test_websites)
        
        # Save results
        csv_path, json_path = auditor.save_results(results)
        print(f"{Fore.GREEN}Results saved to: {csv_path}{Style.RESET_ALL}")
        print(f"{Fore.GREEN}Results saved to: {json_path}{Style.RESET_ALL}")
        
        # Print summary
        auditor.print_summary()
        
    except KeyboardInterrupt:
        print(f"\n{Fore.YELLOW}Audit interrupted by user{Style.RESET_ALL}")
    except Exception as e:
        print(f"\n{Fore.RED}Error during audit: {str(e)}{Style.RESET_ALL}")
    finally:
        auditor.cleanup()

if __name__ == "__main__":
    main() 