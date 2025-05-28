# N8N PDF Processing Node Requirements

## Overview
This document outlines the requirements for creating a custom n8n node that can read PDF files from a local computer, extract data, pass it to an LLM (Ollama) for summarization, and save the results to a file.

## N8N Custom Node Development Requirements

### Prerequisites
- JavaScript/TypeScript knowledge
- Node.js and npm installed
- Git for version control
- Understanding of n8n workflows and data structures

### Node Structure
- Custom nodes in n8n require specific file structure:
  - Base node file (TypeScript)
  - Node metadata (JSON)
  - Icon file (SVG preferred)
  - Credentials file (if needed)

### Development Environment
- n8n provides a starter repository for node development
- Local development environment with n8n installed for testing

## Local File Access in N8N

### Read/Write Files from Disk Node
- n8n has a built-in "Read/Write Files from Disk" node for local file access
- This node is only available in self-hosted n8n instances (not on n8n Cloud)
- Can read files from the machine where n8n is running

### Binary Data Handling
- n8n uses a binary data structure for file handling
- Files are passed between nodes as binary data objects
- Binary data can be converted to/from other formats as needed

## PDF Reading Capabilities

### Existing Solutions
- n8n has existing nodes for PDF reading and extraction
- Community discussions indicate successful PDF processing workflows
- PDF extraction can be done using poppler-utils on the backend

### Requirements for Custom PDF Node
- Must accept file path as input
- Should read PDF content using appropriate libraries
- Must handle binary data properly
- Should support error handling for invalid files

## Ollama API Integration

### API Endpoints
- Ollama provides a REST API for local LLM interaction
- Main endpoint for text generation: POST /api/generate
- Chat completion endpoint: POST /api/chat

### API Parameters
- Model selection
- Prompt/input text
- Temperature and other generation parameters
- Support for streaming responses

### Integration Requirements
- HTTP requests to local Ollama instance
- JSON parsing of responses
- Error handling for API failures
- Configuration options for model selection

## File Output Requirements
- Must support writing summarized content to a file
- Should allow configuration of output file path
- Must handle file system permissions appropriately

## Complete Workflow Requirements

1. **PDF Reading Node**
   - Input: Local file path to PDF
   - Output: PDF content as text

2. **Data Extraction Node**
   - Input: PDF text content
   - Output: Structured data extracted from PDF

3. **LLM Summarization Node**
   - Input: Structured data from PDF
   - Integration: Ollama API
   - Output: Summarized content

4. **File Output Node**
   - Input: Summarized content
   - Output: File with summarized content saved to specified location

## Technical Constraints
- Must work with self-hosted n8n instances
- Must support local Ollama installation
- Should minimize dependencies
- Should follow n8n best practices for node development
