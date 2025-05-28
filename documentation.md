# N8N PDF Processing Node Documentation

## Overview

This package provides a set of custom n8n nodes that enable a complete workflow for:
1. Reading PDF files from your local computer
2. Extracting structured data from the PDF content
3. Summarizing the extracted data using Ollama (local LLM)
4. Saving the summarized content to a file

## Requirements

### System Requirements
- n8n (self-hosted instance)
- Node.js and npm
- poppler-utils (for PDF text extraction)
- Ollama running locally

### Ollama Setup
Ensure Ollama is installed and running on your machine. By default, Ollama runs on `http://localhost:11434`.

## Installation

1. Clone this repository to your local machine:
```bash
git clone https://github.com/yourusername/n8n-pdf-node.git
cd n8n-pdf-node
```

2. Install dependencies:
```bash
npm install
```

3. Build the package:
```bash
npm run build
```

4. Link the package to your n8n installation:
```bash
npm link
cd /path/to/n8n
npm link n8n-pdf-node
```

5. Restart n8n to load the custom nodes.

## Nodes Overview

### 1. PDF Reader Node

**Purpose**: Reads a PDF file from a local path and extracts its text content.

**Parameters**:
- **File Path**: Absolute path to the PDF file
- **Extraction Method**: Method to use for extracting text (poppler-utils recommended)
- **Include Metadata**: Whether to include PDF metadata in the output
- **Page Range**: Range of pages to extract (e.g., "1-5" or "all")

**Output**:
- Text content of the PDF
- Metadata (if requested)

### 2. Data Extractor Node

**Purpose**: Extracts structured data from PDF text content using regular expressions.

**Parameters**:
- **Extraction Rules**: JSON object defining extraction patterns using regular expressions
- **Output Format**: Format for the extracted data (JSON or Key-Value Pairs)
- **Include Raw Text**: Whether to include the original raw text in the output
- **Include Extraction Metadata**: Whether to include metadata about the extraction process

**Output**:
- Structured data extracted from the PDF text
- Extraction metadata (if requested)

### 3. Ollama Summarizer Node

**Purpose**: Sends extracted data to Ollama for summarization.

**Parameters**:
- **Ollama API Endpoint**: URL of the Ollama API (default: http://localhost:11434)
- **Model**: LLM model to use (e.g., llama3, mistral)
- **API Method**: Ollama API method to use (generate or chat)
- **Prompt Template**: Template for constructing the prompt
- **Temperature**: Controls randomness in the output (0.0-1.0)
- **Max Tokens**: Maximum tokens in the response
- **Include Input Data**: Whether to include the input data in the output
- **Include Model Info**: Whether to include model information in the output

**Output**:
- Summarized content
- Model information (if requested)

### 4. File Output Node

**Purpose**: Saves the summarized content to a file.

**Parameters**:
- **Output Path**: Directory path where the file should be saved
- **File Name**: Name of the output file (supports {{timestamp}} placeholder)
- **File Format**: Format of the output file (txt, md, json)
- **Content Field**: Field from the input data to save as content
- **Append to File**: Whether to append to an existing file instead of overwriting
- **Create Directory if Missing**: Whether to create the output directory if it does not exist
- **Include Timestamp in Content**: Whether to include a timestamp in the file content
- **Include Metadata**: Whether to include metadata about the source in the file

**Output**:
- File path and status information

## Example Workflow

1. **Start**: Configure the PDF Reader Node with the path to your PDF file
2. **Extract**: Connect to the Data Extractor Node and configure extraction rules
3. **Summarize**: Connect to the Ollama Summarizer Node and select your preferred model
4. **Save**: Connect to the File Output Node and specify where to save the summary

## Troubleshooting

### PDF Reader Issues
- Ensure poppler-utils is installed on your system
- Verify the PDF file exists and is accessible
- Check file permissions

### Ollama Integration Issues
- Verify Ollama is running (`curl http://localhost:11434/api/version`)
- Ensure the specified model is available in your Ollama installation
- Check network connectivity if using a remote Ollama instance

### File Output Issues
- Verify write permissions for the output directory
- Ensure the directory exists or enable "Create Directory if Missing"

## Development

### Project Structure
```
n8n-pdf-node/
├── nodes/
│   ├── PDFReaderNode/
│   │   ├── PDFReaderNode.node.ts
│   │   └── PDFReaderNode.node.json
│   ├── DataExtractorNode/
│   │   ├── DataExtractorNode.node.ts
│   │   └── DataExtractorNode.node.json
│   ├── OllamaSummarizerNode/
│   │   ├── OllamaSummarizerNode.node.ts
│   │   └── OllamaSummarizerNode.node.json
│   └── FileOutputNode/
│       ├── FileOutputNode.node.ts
│       └── FileOutputNode.node.json
└── package.json
```

### Building from Source
```bash
npm install
npm run build
```

## License
MIT
