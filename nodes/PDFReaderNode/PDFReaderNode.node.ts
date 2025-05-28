import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
} from 'n8n-workflow';

import { exec } from 'child_process';
import { promisify } from 'util';
import { existsSync } from 'fs';
import { join } from 'path';

const execPromise = promisify(exec);

export class PDFReaderNode implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'PDF Reader',
		name: 'pdfReaderNode',
		group: ['transform'],
		version: 1,
		description: 'Reads PDF files and extracts text content',
		defaults: {
			name: 'PDF Reader',
		},
		inputs: ['main'],
		outputs: ['main'],
		properties: [
			{
				displayName: 'File Path',
				name: 'filePath',
				type: 'string',
				default: '',
				placeholder: '/path/to/document.pdf',
				description: 'Path to the PDF file to read',
				required: true,
			},
			{
				displayName: 'Extraction Method',
				name: 'extractionMethod',
				type: 'options',
				options: [
					{
						name: 'Poppler Utils (pdftotext)',
						value: 'popplerUtils',
						description: 'Uses poppler-utils for extraction (recommended)',
					},
					{
						name: 'Text Only',
						value: 'textOnly',
						description: 'Simple text extraction without layout preservation',
					},
					{
						name: 'With Layout',
						value: 'withLayout',
						description: 'Attempts to preserve document layout',
					},
				],
				default: 'popplerUtils',
				description: 'Method to use for extracting text from PDF',
			},
			{
				displayName: 'Include Metadata',
				name: 'includeMetadata',
				type: 'boolean',
				default: true,
				description: 'Whether to include PDF metadata in the output',
			},
			{
				displayName: 'Page Range',
				name: 'pageRange',
				type: 'string',
				default: 'all',
				description: 'Range of pages to extract (e.g., "1-5" or "all")',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		// Process each item
		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			try {
				// Get parameters
				const filePath = this.getNodeParameter('filePath', itemIndex) as string;
				const extractionMethod = this.getNodeParameter('extractionMethod', itemIndex) as string;
				const includeMetadata = this.getNodeParameter('includeMetadata', itemIndex) as boolean;
				const pageRange = this.getNodeParameter('pageRange', itemIndex) as string;

				// Validate file path
				if (!filePath) {
					throw new NodeOperationError(this.getNode(), 'File path is required');
				}

				// Check if file exists
				if (!existsSync(filePath)) {
					throw new NodeOperationError(this.getNode(), `File not found: ${filePath}`);
				}

				// Extract text based on the selected method
				let extractedText = '';
				let metadata = {};

				if (extractionMethod === 'popplerUtils') {
					// Construct pdftotext command based on parameters
					let command = 'pdftotext';
					
					// Add layout option if needed
					if (extractionMethod === 'withLayout') {
						command += ' -layout';
					}
					
					// Add page range if specified and not 'all'
					if (pageRange && pageRange !== 'all') {
						command += ` -f ${pageRange.split('-')[0]} -l ${pageRange.split('-')[1]}`;
					}
					
					// Add input and output paths
					// Use a temporary file for the output
					const tempOutputPath = `/tmp/pdf_extract_${Date.now()}.txt`;
					command += ` "${filePath}" "${tempOutputPath}"`;
					
					try {
						// Execute the command
						await execPromise(command);
						
						// Read the output file
						const { stdout: catOutput } = await execPromise(`cat "${tempOutputPath}"`);
						extractedText = catOutput;
						
						// Clean up the temporary file
						await execPromise(`rm "${tempOutputPath}"`);
					} catch (error) {
						throw new NodeOperationError(
							this.getNode(),
							`Error extracting text from PDF: ${error.message}`
						);
					}
				} else {
					// For other methods, we would implement alternative extraction approaches
					// This is a placeholder for future implementation
					throw new NodeOperationError(
						this.getNode(),
						`Extraction method '${extractionMethod}' is not implemented yet. Please use 'popplerUtils'.`
					);
				}

				// Get metadata if requested
				if (includeMetadata) {
					try {
						const { stdout: pdfInfoOutput } = await execPromise(`pdfinfo "${filePath}"`);
						
						// Parse pdfinfo output into a structured object
						const metadataLines = pdfInfoOutput.split('\n');
						metadataLines.forEach(line => {
							const separatorIndex = line.indexOf(':');
							if (separatorIndex !== -1) {
								const key = line.substring(0, separatorIndex).trim();
								const value = line.substring(separatorIndex + 1).trim();
								metadata[key] = value;
							}
						});
					} catch (error) {
						// Don't fail if metadata extraction fails
						metadata = { error: `Failed to extract metadata: ${error.message}` };
					}
				}

				// Create output item
				const newItem: INodeExecutionData = {
					json: {
						filePath,
						extractionMethod,
						text: extractedText,
						metadata: includeMetadata ? metadata : undefined,
						pageRange,
						success: true,
					},
				};

				returnData.push(newItem);
			} catch (error) {
				// Handle errors
				if (this.continueOnFail()) {
					returnData.push({
						json: {
							error: error.message,
							success: false,
						},
					});
					continue;
				}
				throw error;
			}
		}

		return [returnData];
	}
}
