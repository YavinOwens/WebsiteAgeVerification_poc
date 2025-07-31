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
        """Setup Selenium WebDriver for browser automation"""
        chrome_options = Options()
        chrome_options.add_argument("--headless")
        chrome_options.add_argument("--no-sandbox")
        chrome_options.add_argument("--disable-dev-shm-usage")
        chrome_options.add_argument("--disable-gpu")
        chrome_options.add_argument("--window-size=1920,1080")
        chrome_options.add_argument("--remote-debugging-port=9222")
        
        try:
            service = Service(ChromeDriverManager().install())
            self.driver = webdriver.Chrome(service=service, options=chrome_options)
        except Exception as e:
            print(f"{Fore.YELLOW}Warning: Could not initialize Chrome driver: {str(e)}{Style.RESET_ALL}")
            print(f"{Fore.YELLOW}Will use requests-based scraping instead{Style.RESET_ALL}")
            self.driver = None
        
    def get_website_content(self, url: str) -> Tuple[str, str]:
        """
        Get website content using Selenium or requests with SSL error handling
        
        Args:
            url: Website URL to analyze
            
        Returns:
            Tuple of (page_source, page_text)
        """
        try:
            if self.driver:
                # Use Selenium if available
                self.driver.get(url)
                time.sleep(3)  # Wait for page to load
                
                # Get page source
                page_source = self.driver.page_source
            else:
                # Fallback to requests with SSL error handling
                headers = {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.5',
                    'Accept-Encoding': 'gzip, deflate',
                    'Connection': 'keep-alive',
                    'Upgrade-Insecure-Requests': '1',
                }
                
                # Try multiple approaches for SSL issues
                session = requests.Session()
                
                # Configure session for better SSL handling
                session.verify = False
                session.trust_env = False
                
                # Try multiple user agents and approaches
                user_agents = [
                    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                ]
                
                for user_agent in user_agents:
                    try:
                        headers['User-Agent'] = user_agent
                        response = session.get(url, headers=headers, timeout=20, verify=False)
                        response.raise_for_status()
                        break
                    except (requests.exceptions.SSLError, requests.exceptions.ConnectionError, requests.exceptions.Timeout):
                        continue
                else:
                    # If all attempts failed, try with a different approach
                    try:
                        import ssl
                        ssl_context = ssl.create_default_context()
                        ssl_context.check_hostname = False
                        ssl_context.verify_mode = ssl.CERT_NONE
                        
                        # Create a custom adapter
                        from requests.adapters import HTTPAdapter
                        from urllib3.util.ssl_ import create_urllib3_context
                        
                        class CustomHTTPAdapter(HTTPAdapter):
                            def init_poolmanager(self, *args, **kwargs):
                                context = create_urllib3_context()
                                context.check_hostname = False
                                context.verify_mode = ssl.CERT_NONE
                                kwargs['ssl_context'] = context
                                return super().init_poolmanager(*args, **kwargs)
                        
                        session.mount('https://', CustomHTTPAdapter())
                        response = session.get(url, headers=headers, timeout=20, verify=False)
                        response.raise_for_status()
                    except Exception:
                        raise requests.exceptions.SSLError(f"All SSL connection attempts failed for {url}")
                
                page_source = response.text
            
            # Extract text content
            soup = BeautifulSoup(page_source, 'html.parser')
            
            # Remove script and style elements
            for script in soup(["script", "style"]):
                script.decompose()
                
            page_text = soup.get_text()
            
            return page_source, page_text
            
        except Exception as e:
            error_msg = str(e)
            if "SSL" in error_msg:
                print(f"{Fore.YELLOW}SSL Error accessing {url}: Site may be blocked or have certificate issues{Style.RESET_ALL}")
            elif "403" in error_msg:
                print(f"{Fore.YELLOW}Access Forbidden for {url}: Site may block automated requests{Style.RESET_ALL}")
            elif "404" in error_msg:
                print(f"{Fore.YELLOW}Page Not Found for {url}: Site may be down or moved{Style.RESET_ALL}")
            elif "timeout" in error_msg.lower():
                print(f"{Fore.YELLOW}Timeout accessing {url}: Site may be slow or overloaded{Style.RESET_ALL}")
            else:
                print(f"{Fore.RED}Error accessing {url}: {error_msg}{Style.RESET_ALL}")
            return "", ""
    
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