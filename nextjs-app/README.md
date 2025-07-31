# Age Verification Audit Tool

A comprehensive web application for auditing age verification mechanisms on websites using AI-powered analysis. This tool helps identify whether websites implement proper age verification systems for age-restricted content.

## 🚀 Features

### **AI-Powered Analysis**
- **Ollama Integration**: Direct AI analysis using the phi3 model
- **Robust JSON Parsing**: Handles malformed AI responses with multi-layer fallbacks
- **Real-time Processing**: Parallel batch processing for efficient audits
- **Smart Error Handling**: Comprehensive error recovery and fallback mechanisms

### **User Interface**
- **Modern React/TypeScript**: Built with Next.js 14 and TypeScript
- **File Upload Support**: Drag & drop .txt and .csv files
- **Real-time Progress**: Live audit status and progress tracking
- **Responsive Design**: Works on desktop and mobile devices
- **Navigation**: Help & Docs → Audit Websites → Dashboard

### **Audit Capabilities**
- **Multiple Website Categories**: Adult content, firearms, alcohol, gambling, vaping
- **Comprehensive Analysis**: Age gates, ID verification, credit card requirements
- **Detailed Reporting**: Confidence scores, verification methods, detailed findings
- **Export Functionality**: Download audit results in various formats

## 🛠️ Technology Stack

- **Frontend**: Next.js 14, React 18, TypeScript
- **AI Integration**: Ollama with phi3 model
- **Styling**: Tailwind CSS
- **JSON Processing**: jsonrepair library
- **File Handling**: React Dropzone
- **Backend**: Python CLI tools (optional)

## 📋 Prerequisites

### **Required Software**
- **Node.js** (v18 or higher)
- **npm** or **yarn**
- **Ollama** (for AI analysis)

### **Ollama Setup**
1. Install Ollama: [https://ollama.ai](https://ollama.ai)
2. Pull the phi3 model:
   ```bash
   ollama pull phi3
   ```
3. Start Ollama service:
   ```bash
   ollama serve
   ```

## 🚀 Quick Start

### **1. Clone the Repository**
```bash
git clone https://github.com/YavinOwens/WebsiteAgeVerification_poc.git
cd WebsiteAgeVerification_poc/nextjs-app
```

### **2. Install Dependencies**
```bash
npm install
# or
yarn install
```

### **3. Start the Development Server**
```bash
npm run dev
# or
yarn dev
```

### **4. Open the Application**
Navigate to [http://localhost:3000](http://localhost:3000) in your browser.

## 📖 Usage Guide

### **Starting an Audit**

1. **Upload Website List**
   - Drag & drop a .txt or .csv file
   - Or use the built-in demo data
   - Supported formats: one URL per line or CSV with columns

2. **Configure Audit Settings**
   - Choose between "Demo Mode" or "Real API"
   - Real API requires Ollama to be running
   - Demo mode provides sample results

3. **Monitor Progress**
   - Real-time progress updates
   - Batch processing status
   - Error handling and retry attempts

4. **Review Results**
   - Detailed audit findings
   - Confidence scores
   - Verification method identification
   - Export results for further analysis

### **File Format Examples**

**Text File (.txt)**
```
https://example.com
https://another-site.com
https://test-website.org
```

**CSV File (.csv)**
```csv
url,name,category
https://example.com,Example Site,Adult Content
https://another-site.com,Another Site,Firearms
https://test-website.org,Test Site,Gambling
```

## ⚙️ Configuration

### **Timeout Settings**
The application uses configurable timeouts to prevent hanging requests:

```typescript
const OLLAMA_CONFIG = {
  timeout: 60000, // 60 seconds per request
  maxRetries: 2,
  maxTotalTime: 600000, // 10 minutes total
  batchSize: 3, // Process 3 websites at a time
}
```

### **AI Model Configuration**
- **Model**: phi3 (optimized for JSON responses)
- **Temperature**: 0.1 (for consistent results)
- **Context Window**: 2048 tokens
- **Response Length**: Limited to 500 tokens

## 🔧 Advanced Features

### **Robust JSON Parsing**
The application includes a multi-layer JSON parsing system:

1. **Direct Parsing**: Attempts standard JSON.parse()
2. **Library Repair**: Uses jsonrepair for automatic fixes
3. **Manual Fixes**: Regex-based corrections for common AI issues
4. **Key-Value Extraction**: Fallback pattern matching
5. **Content Analysis**: Final fallback using text analysis

### **Error Handling**
- **Timeout Management**: 10-minute total timeout with retries
- **Network Resilience**: Exponential backoff for failed requests
- **Graceful Degradation**: Falls back to demo mode if AI unavailable
- **Detailed Logging**: Comprehensive error reporting

### **Performance Optimizations**
- **Parallel Processing**: Batch processing for efficiency
- **Memory Management**: Limited context windows and response lengths
- **Caching**: Intelligent request caching and deduplication
- **Progress Tracking**: Real-time status updates

## 📊 Audit Categories

The tool analyzes websites across multiple categories:

- **Adult Content**: Age verification popups, birth date inputs
- **Firearms**: License verification, government ID requirements
- **Alcohol**: Age gates, ID verification for alcohol sales
- **Gambling**: Credit card verification, 18+ requirements
- **Vaping**: Age restrictions for nicotine products
- **Social Media**: Terms of service age requirements

## 🚨 Troubleshooting

### **Common Issues**

**Ollama Not Available**
```
Error: Ollama service not available
```
**Solution**: Ensure Ollama is running with `ollama serve`

**Timeout Errors**
```
Audit timed out after 10 minutes
```
**Solution**: Check network connectivity and Ollama performance

**JSON Parsing Errors**
```
SyntaxError: Expected double-quoted property name
```
**Solution**: The application automatically handles these with fallback parsing

### **Performance Tips**
- Use smaller batches for large website lists
- Ensure stable internet connection
- Monitor Ollama resource usage
- Consider using demo mode for testing

## 🔒 Security Considerations

- **Local Processing**: All AI analysis runs locally via Ollama
- **No Data Storage**: Audit results are not permanently stored
- **Privacy Focused**: No website data is transmitted to external services
- **Secure File Handling**: Uploaded files are processed in memory

## 📈 Future Enhancements

- **Additional AI Models**: Support for other Ollama models
- **Enhanced Reporting**: PDF export and detailed analytics
- **Batch Scheduling**: Automated audit scheduling
- **API Integration**: REST API for external integrations
- **Mobile App**: React Native mobile application

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Ollama Team**: For the excellent local AI inference platform
- **Next.js Team**: For the powerful React framework
- **Tailwind CSS**: For the utility-first CSS framework
- **jsonrepair**: For robust JSON parsing capabilities

## 📞 Support

For issues, questions, or contributions:
- **GitHub Issues**: [Create an issue](https://github.com/YavinOwens/WebsiteAgeVerification_poc/issues)
- **Documentation**: Check the Help & Docs section in the application
- **Community**: Join our discussions for feature requests and bug reports

---

**Built with ❤️ for web security and compliance**
