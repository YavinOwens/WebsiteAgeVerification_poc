'use client';

export default function HelpPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Help & Documentation
          </h1>
          <p className="text-lg text-gray-600">
            Learn how to format your files for the age verification audit
          </p>
        </div>

        {/* File Format Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">
            Supported File Formats
          </h2>
          
          <div className="space-y-8">
            {/* Text Files */}
            <div>
              <h3 className="text-xl font-medium text-gray-900 mb-4">Text Files (.txt)</h3>
              <p className="text-gray-600 mb-4">
                Simple text files with one website URL per line. This is the easiest format for quick uploads.
              </p>
              
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <h4 className="font-medium text-gray-900 mb-2">Format:</h4>
                <div className="bg-white border rounded-md p-4 font-mono text-sm overflow-x-auto">
                  https://www.example.com<br />
                  https://www.test.com<br />
                  https://www.demo.org<br />
                  https://www.sample.net
                </div>
              </div>

              <div className="bg-blue-50 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">Requirements:</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• One URL per line</li>
                  <li>• Include http:// or https:// protocol</li>
                  <li>• No empty lines or extra spaces</li>
                  <li>• Maximum 1000 URLs per file</li>
                </ul>
              </div>
            </div>

            {/* CSV Files */}
            <div>
              <h3 className="text-xl font-medium text-gray-900 mb-4">CSV Files (.csv)</h3>
              <p className="text-gray-600 mb-4">
                Structured data files that allow you to include additional information like website names and categories.
              </p>
              
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <h4 className="font-medium text-gray-900 mb-2">Format:</h4>
                <div className="bg-white border rounded-md p-4 font-mono text-sm overflow-x-auto">
                  url,name,category<br />
                  https://www.example.com,Example Site,General<br />
                  https://www.test.com,Test Website,Testing<br />
                  https://www.demo.org,Demo Site,Demo<br />
                  https://www.sample.net,Sample Website,Sample
                </div>
              </div>

              <div className="bg-green-50 rounded-lg p-4 mb-4">
                <h4 className="font-medium text-green-900 mb-2">CSV Headers:</h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-green-100">
                      <tr>
                        <th className="px-4 py-2 text-left font-medium text-green-900">Column</th>
                        <th className="px-4 py-2 text-left font-medium text-green-900">Required</th>
                        <th className="px-4 py-2 text-left font-medium text-green-900">Description</th>
                        <th className="px-4 py-2 text-left font-medium text-green-900">Example</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-green-200">
                      <tr>
                        <td className="px-4 py-2 font-medium text-green-900">url</td>
                        <td className="px-4 py-2">
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                            Required
                          </span>
                        </td>
                        <td className="px-4 py-2 text-green-800">Website URL to audit</td>
                        <td className="px-4 py-2 font-mono text-green-800">https://www.example.com</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2 font-medium text-green-900">name</td>
                        <td className="px-4 py-2">
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                            Optional
                          </span>
                        </td>
                        <td className="px-4 py-2 text-green-800">Display name for the website</td>
                        <td className="px-4 py-2 font-mono text-green-800">Example Site</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2 font-medium text-green-900">category</td>
                        <td className="px-4 py-2">
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                            Optional
                          </span>
                        </td>
                        <td className="px-4 py-2 text-green-800">Category or type of website</td>
                        <td className="px-4 py-2 font-mono text-green-800">Gaming</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-yellow-50 rounded-lg p-4">
                <h4 className="font-medium text-yellow-900 mb-2">CSV Requirements:</h4>
                <ul className="text-sm text-yellow-800 space-y-1">
                  <li>• First row must contain headers</li>
                  <li>• Values separated by commas</li>
                  <li>• Include http:// or https:// protocol in URLs</li>
                  <li>• No empty lines between data rows</li>
                  <li>• Maximum 1000 rows per file</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Sample Files Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">
            Sample Files
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3">Sample CSV File</h3>
              <p className="text-gray-600 mb-3">
                Download our sample CSV file to see the correct format:
              </p>
              <a
                href="/sample-websites.csv"
                download
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Download Sample CSV
              </a>
            </div>
            
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3">Create Your Own</h3>
              <p className="text-gray-600 mb-3">
                Use any text editor or spreadsheet software to create your files:
              </p>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Microsoft Excel</li>
                <li>• Google Sheets</li>
                <li>• Notepad (for .txt files)</li>
                <li>• VS Code</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Tips Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">
            Tips & Best Practices
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3">File Preparation</h3>
              <ul className="text-sm text-gray-600 space-y-2">
                <li>• Verify all URLs are accessible before uploading</li>
                <li>• Remove any duplicate URLs</li>
                <li>• Ensure URLs include the correct protocol (http:// or https://)</li>
                <li>• Test your file format with a small sample first</li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3">Common Issues</h3>
              <ul className="text-sm text-gray-600 space-y-2">
                <li>• Missing http:// or https:// in URLs</li>
                <li>• Extra spaces or empty lines</li>
                <li>• Special characters in CSV that need escaping</li>
                <li>• File size too large (max 5MB)</li>
              </ul>
            </div>
          </div>
        </div>


      </div>
    </div>
  );
} 