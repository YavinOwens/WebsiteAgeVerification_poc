#!/usr/bin/env python3
"""
Command Line Interface for Age Verification Audit Tool
"""

import argparse
import sys
import os
from typing import List
from colorama import init, Fore, Style

from age_verification_audit import AgeVerificationAuditor
from config import WEBSITE_CATEGORIES, OLLAMA_MODEL

# Initialize colorama
init()

def print_banner():
    """Print the tool banner"""
    banner = f"""
{Fore.CYAN}
╔══════════════════════════════════════════════════════════════╗
║                    Age Verification Audit Tool                ║
║                    Powered by Ollama SDK                     ║
╚══════════════════════════════════════════════════════════════╝
{Style.RESET_ALL}
"""
    print(banner)

def print_categories():
    """Print available website categories"""
    print(f"{Fore.YELLOW}Available website categories:{Style.RESET_ALL}")
    for category, urls in WEBSITE_CATEGORIES.items():
        print(f"  {Fore.GREEN}{category}{Style.RESET_ALL}: {len(urls)} websites")
    print()

def get_websites_from_category(category: str) -> List[str]:
    """Get websites from a specific category"""
    if category not in WEBSITE_CATEGORIES:
        print(f"{Fore.RED}Error: Category '{category}' not found.{Style.RESET_ALL}")
        print_categories()
        sys.exit(1)
    
    return WEBSITE_CATEGORIES[category]

def get_websites_from_file(filepath: str) -> List[str]:
    """Get websites from a text file (one URL per line)"""
    try:
        with open(filepath, 'r') as f:
            urls = [line.strip() for line in f if line.strip()]
        
        # Validate URLs
        valid_urls = []
        for url in urls:
            if url.startswith(('http://', 'https://')):
                valid_urls.append(url)
            else:
                print(f"{Fore.YELLOW}Warning: Skipping invalid URL: {url}{Style.RESET_ALL}")
        
        return valid_urls
    except FileNotFoundError:
        print(f"{Fore.RED}Error: File '{filepath}' not found.{Style.RESET_ALL}")
        sys.exit(1)
    except Exception as e:
        print(f"{Fore.RED}Error reading file: {str(e)}{Style.RESET_ALL}")
        sys.exit(1)

def validate_urls(urls: List[str]) -> List[str]:
    """Validate and clean URLs"""
    valid_urls = []
    for url in urls:
        # Add https:// if no protocol specified
        if not url.startswith(('http://', 'https://')):
            url = 'https://' + url
        
        # Basic URL validation
        if '.' in url and len(url) > 10:
            valid_urls.append(url)
        else:
            print(f"{Fore.YELLOW}Warning: Skipping invalid URL: {url}{Style.RESET_ALL}")
    
    return valid_urls

def main():
    """Main CLI function"""
    parser = argparse.ArgumentParser(
        description="Age Verification Audit Tool - Analyze websites for age verification mechanisms",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python cli.py --category alcohol
  python cli.py --urls https://example.com https://test.com
  python cli.py --file websites.txt
  python cli.py --category gambling --model llama2
  python cli.py --category adult_content --output my_results
        """
    )
    
    # Input options (mutually exclusive)
    input_group = parser.add_mutually_exclusive_group(required=False)
    input_group.add_argument(
        '--category', '-c',
        choices=list(WEBSITE_CATEGORIES.keys()),
        help='Website category to audit'
    )
    input_group.add_argument(
        '--urls', '-u',
        nargs='+',
        help='Individual URLs to audit'
    )
    input_group.add_argument(
        '--file', '-f',
        help='Text file containing URLs (one per line)'
    )
    
    # Optional arguments
    parser.add_argument(
        '--model', '-m',
        default=OLLAMA_MODEL,
        help=f'Ollama model to use (default: phi3)'
    )
    parser.add_argument(
        '--output', '-o',
        help='Output filename prefix (default: auto-generated)'
    )
    parser.add_argument(
        '--no-screenshots',
        action='store_true',
        help='Disable screenshot capture'
    )
    parser.add_argument(
        '--list-categories',
        action='store_true',
        help='List available website categories and exit'
    )
    parser.add_argument(
        '--verbose', '-v',
        action='store_true',
        help='Enable verbose output'
    )
    
    args = parser.parse_args()
    
    # Print banner
    print_banner()
    
    # Handle list categories
    if args.list_categories:
        print_categories()
        return
    
    # Get websites to audit
    websites = []
    if args.category:
        websites = get_websites_from_category(args.category)
        print(f"{Fore.BLUE}Auditing {len(websites)} websites from category: {args.category}{Style.RESET_ALL}")
    elif args.urls:
        websites = validate_urls(args.urls)
        print(f"{Fore.BLUE}Auditing {len(websites)} custom URLs{Style.RESET_ALL}")
    elif args.file:
        websites = get_websites_from_file(args.file)
        print(f"{Fore.BLUE}Auditing {len(websites)} websites from file: {args.file}{Style.RESET_ALL}")
    else:
        print(f"{Fore.RED}No input specified. Use --category, --urls, or --file.{Style.RESET_ALL}")
        sys.exit(1)
    
    if not websites:
        print(f"{Fore.RED}No valid websites to audit.{Style.RESET_ALL}")
        sys.exit(1)
    
    # Print websites to be audited
    if args.verbose:
        print(f"\n{Fore.YELLOW}Websites to audit:{Style.RESET_ALL}")
        for i, url in enumerate(websites, 1):
            print(f"  {i}. {url}")
        print()
    
    # Initialize auditor
    try:
        auditor = AgeVerificationAuditor(ollama_model=args.model)
    except Exception as e:
        print(f"{Fore.RED}Error initializing auditor: {str(e)}{Style.RESET_ALL}")
        print(f"{Fore.YELLOW}Make sure Ollama is running and the model '{args.model}' is available.{Style.RESET_ALL}")
        sys.exit(1)
    
    # Disable screenshots if requested
    if args.no_screenshots:
        auditor.take_screenshot = lambda url: None
    
    try:
        # Run audit
        results = auditor.audit_websites(websites)
        
        # Save results
        output_prefix = args.output if args.output else "age_verification_audit"
        csv_path, json_path = auditor.save_results(results, output_prefix)
        print(f"{Fore.GREEN}Results saved to: {csv_path}{Style.RESET_ALL}")
        print(f"{Fore.GREEN}Results saved to: {json_path}{Style.RESET_ALL}")
        
        # Print summary
        auditor.print_summary()
        
        print(f"\n{Fore.GREEN}Audit completed successfully!{Style.RESET_ALL}")
        
    except KeyboardInterrupt:
        print(f"\n{Fore.YELLOW}Audit interrupted by user{Style.RESET_ALL}")
    except Exception as e:
        print(f"\n{Fore.RED}Error during audit: {str(e)}{Style.RESET_ALL}")
    finally:
        auditor.cleanup()

if __name__ == "__main__":
    main() 