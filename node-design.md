# N8N PDF Processing Node Design

## Architecture Overview

This document outlines the design for a custom n8n workflow that includes nodes for PDF reading, data extraction, LLM summarization via Ollama, and file output.

## 1. PDF Reading Node

### Purpose
The PDF Reading Node will read a PDF file from a local path and convert its content to text format for further processing.

### Design Approach
We will create a custom node that leverages the existing n8n infrastructure for file handling while adding specialized PDF processing capabilities.

### Node Structure
- **Name**: `PDFReaderNode`
- **Type**: Action node
- **Input**: File path parameter
- **Output**: PDF content as text in JSON format

### Key Components
1. **Node Base File**: `PDFReaderNode.node.ts`
   - Contains the main node class and execution logic
   - Implements the `INodeType` interface

2. **Node Metadata**: `PDFReaderNode.node.json`
   - Contains node description, version, and other metadata

3. **Icon File**: `pdfReader.svg`
   - Visual representation of the node in the n8n interface

### Parameters
- `filePath`: String input for the path to the PDF file
- `extractionMethod`: Dropdown to select between different extraction methods:
  - `popplerUtils` (default): Uses poppler-utils for extraction
  - `textOnly`: Simple text extraction
  - `withLayout`: Attempts to preserve document layout

### Implementation Strategy
- Use the `child_process` module to execute poppler-utils commands
- Implement error handling for file not found, permission issues, etc.
- Return the extracted text as a JSON object with metadata

## 2. Data Extraction Node

### Purpose
The Data Extraction Node will process the raw PDF text and extract structured data based on configurable patterns or rules.

### Design Approach
This node will use regular expressions and text processing techniques to identify and extract key information from the PDF text.

### Node Structure
- **Name**: `DataExtractorNode`
- **Type**: Action node
- **Input**: PDF text content
- **Output**: Structured data in JSON format

### Key Components
1. **Node Base File**: `DataExtractorNode.node.ts`
2. **Node Metadata**: `DataExtractorNode.node.json`
3. **Icon File**: `dataExtractor.svg`

### Parameters
- `extractionRules`: JSON object defining extraction patterns
- `outputFormat`: Format for the extracted data (JSON, CSV, etc.)
- `includeMetadata`: Boolean to include document metadata

### Implementation Strategy
- Parse input text using configurable extraction rules
- Support for regular expressions and pattern matching
- Output structured data in the specified format

## 3. LLM Summarization Node (Ollama Integration)

### Purpose
The LLM Summarization Node will send the extracted data to Ollama for summarization and receive the summarized content.

### Design Approach
This node will integrate with the Ollama API to send requests and process responses.

### Node Structure
- **Name**: `OllamaSummarizerNode`
- **Type**: Action node
- **Input**: Structured data from the Data Extraction Node
- **Output**: Summarized content

### Key Components
1. **Node Base File**: `OllamaSummarizerNode.node.ts`
2. **Node Metadata**: `OllamaSummarizerNode.node.json`
3. **Icon File**: `ollamaSummarizer.svg`
4. **Credentials File**: `OllamaApi.credentials.ts` (if needed)

### Parameters
- `ollamaEndpoint`: URL of the Ollama API (default: `http://localhost:11434`)
- `model`: LLM model to use (e.g., `llama3`, `mistral`, etc.)
- `promptTemplate`: Template for constructing the prompt
- `temperature`: Controls randomness (0.0-1.0)
- `maxTokens`: Maximum tokens in the response

### Implementation Strategy
- Use HTTP requests to communicate with the Ollama API
- Format the request according to Ollama API specifications
- Process and return the summarized content

## 4. File Output Node

### Purpose
The File Output Node will save the summarized content to a file at a specified location.

### Design Approach
This node will leverage n8n's file handling capabilities to write the summarized content to a file.

### Node Structure
- **Name**: `FileOutputNode`
- **Type**: Action node
- **Input**: Summarized content
- **Output**: File path and status information

### Key Components
1. **Node Base File**: `FileOutputNode.node.ts`
2. **Node Metadata**: `FileOutputNode.node.json`
3. **Icon File**: `fileOutput.svg`

### Parameters
- `outputPath`: Path where the file should be saved
- `fileName`: Name of the output file
- `fileFormat`: Format of the output file (txt, md, json, etc.)
- `appendToFile`: Boolean to append or overwrite existing file

### Implementation Strategy
- Use Node.js file system operations to write content to file
- Implement error handling for file system operations
- Return status information about the write operation

## Integration and Data Flow

1. **PDF Reading Node** reads the PDF file and extracts text content
2. **Data Extraction Node** processes the text and extracts structured data
3. **LLM Summarization Node** sends the data to Ollama and receives summarized content
4. **File Output Node** saves the summarized content to a file

## Error Handling Strategy

- Each node will implement comprehensive error handling
- Errors will be propagated through the workflow with descriptive messages
- Retry mechanisms will be implemented for API calls to Ollama
- File operations will include proper permission and existence checks

## Testing Strategy

- Unit tests for each node's core functionality
- Integration tests for the complete workflow
- Edge case testing with various PDF formats and sizes
- Performance testing with large documents

## Deployment and Distribution

- Package as a custom n8n node module
- Include detailed installation and usage documentation
- Provide example workflows for common use cases
