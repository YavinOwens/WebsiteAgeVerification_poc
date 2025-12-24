# Age Verification Audit Tool

A Python workflow that uses the Ollama SDK to search for and test websites for age verification capabilities. This tool can analyze various types of websites to determine if they implement age verification mechanisms.

## Features

- 🔍 **AI-Powered Analysis**: Uses Ollama SDK with LLM models to intelligently analyze website content
- 🌐 **Multi-Category Testing**: Pre-configured categories for alcohol, gambling, adult content, social media, tobacco, and gaming websites
- 📸 **Screenshot Capture**: Automatically captures screenshots of audited websites ("In progress")
- 📊 **CSV Reporting**: Exports results in both CSV and JSON formats
- 🎨 **CLI**: Color-coded command-line interface with progress tracking
- 🔧 **Flexible Configuration**: Easy-to-modify settings and website categories

## Prerequisites

- Python 3.8 or higher
- Chrome browser installed
- Ollama installed and running locally

## Installation

1. **Clone or download the project files**

2. **Install Python dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Install and start Ollama:**
   ```bash
   # Install Ollama using Homebrew (recommended for Mac)
   brew install ollama
   
   # Start Ollama service
   ollama serve
   
   # Pull a model (e.g., phi3)
   ollama pull phi3
   ```

## Usage

### Basic Usage

**Audit websites from a predefined category:**
```bash
python cli.py --category alcohol
```

**Audit specific URLs:**
```bash
python cli.py --urls https://example.com https://test.com
```

**Audit websites from a text file:**
```bash
python cli.py --file websites.txt
```

### Advanced Usage

**Use a different Ollama model:**
```bash
python cli.py --category gambling --model phi3
```

**Custom output filename:**
```bash
python cli.py --category adult_content --output my_results
```

**Disable screenshots:**
```bash
python cli.py --category social_media --no-screenshots
```

**Verbose output:**
```bash
python cli.py --category gaming --verbose
```

**List available categories:**
```bash
python cli.py --list-categories
```

### Available Categories

- `alcohol`: Alcohol-related websites
- `gambling`: Online gambling and casino sites
- `adult_content`: Adult content websites
- `social_media`: Social media platforms
- `tobacco`: Tobacco and smoking-related sites
- `gaming`: Gaming platforms and stores

## Output

The tool generates comprehensive audit reports in multiple formats:

### File Structure
All audit results are automatically saved in the `audit_data/` folder with the following structure:

```
audit_data/
├── age_verification_audit_YYYYMMDD_HHMMSS.csv
├── age_verification_audit_YYYYMMDD_HHMMSS.json
├── comprehensive_audit_data_YYYYMMDD_HHMMSS.csv
├── comprehensive_audit_data_YYYYMMDD_HHMMSS.json
└── screenshot_*.png (if screenshots enabled)
```

### Output Formats

**CSV Format:**
- `website`: URL of the audited website
- `has_age_verification`: Boolean indicating if age verification was found
- `verification_type`: Type of verification (birth_date_input, credit_card, government_id, age_checkbox, none, error)
- `confidence_score`: Confidence level (0.0-1.0)
- `details`: Detailed analysis and reasoning
- `timestamp`: When the audit was performed
- `screenshot_path`: Path to screenshot (if enabled)

**JSON Format:**
- Same data as CSV but in structured JSON format
- Includes additional metadata and nested objects
- Better for programmatic processing

### Example Output

```csv
website,has_age_verification,verification_type,confidence_score,details,timestamp,screenshot_path
https://www.example.com,True,birth_date_input,0.95,"Website requires birth date input for age verification",2025-07-30T14:03:40.034033,
https://www.test.com,False,none,1.00,"No age verification mechanisms found",2025-07-30T14:03:50.188086,
```

### Audit Summary

The tool provides a summary showing:
- Total websites audited
- Number with/without age verification
- Verification rate percentage
- Types of verification found
- Error handling for inaccessible sites

## Configuration

Edit `config.py` to customize:

- **Ollama settings**: Model name and host
- **Browser settings**: Headless mode, window size, timeouts
- **Analysis settings**: Content length limits, confidence thresholds
- **Website categories**: Add or modify website lists
- **Output settings**: Directories and file formats

## Architecture

### Core Components

1. **AgeVerificationAuditor**: Main class handling the audit workflow
2. **Web Scraping**: Selenium-based browser automation
3. **AI Analysis**: Ollama SDK integration for content analysis
4. **Data Management**: Results storage and export functionality
5. **CLI Interface**: User-friendly command-line interface

### Workflow

1. **Website Access**: Navigate to target website using Selenium
2. **Content Extraction**: Extract and clean page content
3. **AI Analysis**: Send content to Ollama for age verification analysis
4. **Screenshot Capture**: Take visual snapshot of the page
5. **Result Storage**: Save findings to structured data format
6. **Report Generation**: Export comprehensive audit reports

## Age Verification Types Detected

The tool can identify various age verification mechanisms:

- **Birth Date Input**: Date of birth entry forms
- **Age Checkbox**: Simple age confirmation checkboxes
- **Credit Card**: Payment verification requirements
- **Government ID**: Official document verification
- **Social Security**: SSN-based verification
- **Age Popup**: Modal dialogs requesting age
- **Terms Acceptance**: Age-related terms of service
- **Parental Consent**: Parent approval requirements
- **None**: No age verification found

## Troubleshooting

### Common Issues

**Ollama Connection Error:**
```bash
# Make sure Ollama is running
ollama serve

# Check available models
ollama list
```

**Browser Setup Issues:**
```bash
# Install Chrome if not present (Mac M2)
brew install --cask google-chrome

# Alternative: Install Chromium
brew install --cask chromium
```

**Permission Errors:**
```bash
# Make scripts executable
chmod +x cli.py
chmod +x age_verification_audit.py
```

### Debug Mode

Enable verbose output to see detailed information:
```bash
python cli.py --category alcohol --verbose
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is open source and available under the MIT License.

## Disclaimer

This tool is designed for educational and research purposes. Always respect website terms of service and robots.txt files when conducting automated testing. The tool includes reasonable delays between requests to avoid overwhelming target servers.

## Support

For issues and questions:
1. Check the troubleshooting section
2. Review the configuration options
3. Ensure all prerequisites are met
4. Try running with verbose output for debugging

---

**Note**: This tool analyses publicly accessible website content. Always comply with applicable laws and website terms of service when conducting audits. 

additionally this is for learning purposes and should not be used for malicious purposes.