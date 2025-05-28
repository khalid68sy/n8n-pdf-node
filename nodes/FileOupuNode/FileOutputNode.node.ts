import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
} from 'n8n-workflow';

import { writeFile, appendFile, mkdir } from 'fs/promises';
import { dirname, join } from 'path';
import { existsSync } from 'fs';

export class FileOutputNode implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'File Output',
		name: 'fileOutputNode',
		group: ['output'],
		version: 1,
		description: 'Saves content to a file',
		defaults: {
			name: 'File Output',
		},
		inputs: ['main'],
		outputs: ['main'],
		properties: [
			{
				displayName: 'Output Path',
				name: 'outputPath',
				type: 'string',
				default: '/tmp',
				description: 'Directory path where the file should be saved',
				required: true,
			},
			{
				displayName: 'File Name',
				name: 'fileName',
				type: 'string',
				default: 'summary_{{timestamp}}.txt',
				description: 'Name of the output file. Use {{timestamp}} for dynamic naming.',
				required: true,
			},
			{
				displayName: 'File Format',
				name: 'fileFormat',
				type: 'options',
				options: [
					{
						name: 'Text',
						value: 'txt',
						description: 'Plain text file',
					},
					{
						name: 'Markdown',
						value: 'md',
						description: 'Markdown formatted file',
					},
					{
						name: 'JSON',
						value: 'json',
						description: 'JSON formatted file',
					},
				],
				default: 'txt',
				description: 'Format of the output file',
			},
			{
				displayName: 'Content Field',
				name: 'contentField',
				type: 'string',
				default: 'summary',
				description: 'Field from the input data to save as content',
				required: true,
			},
			{
				displayName: 'Append to File',
				name: 'appendToFile',
				type: 'boolean',
				default: false,
				description: 'Whether to append to an existing file instead of overwriting',
			},
			{
				displayName: 'Create Directory if Missing',
				name: 'createDirectory',
				type: 'boolean',
				default: true,
				description: 'Whether to create the output directory if it does not exist',
			},
			{
				displayName: 'Include Timestamp in Content',
				name: 'includeTimestamp',
				type: 'boolean',
				default: false,
				description: 'Whether to include a timestamp in the file content',
			},
			{
				displayName: 'Include Metadata',
				name: 'includeMetadata',
				type: 'boolean',
				default: false,
				description: 'Whether to include metadata about the source in the file',
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
				const outputPath = this.getNodeParameter('outputPath', itemIndex) as string;
				const fileName = this.getNodeParameter('fileName', itemIndex) as string;
				const fileFormat = this.getNodeParameter('fileFormat', itemIndex) as string;
				const contentField = this.getNodeParameter('contentField', itemIndex) as string;
				const appendToFile = this.getNodeParameter('appendToFile', itemIndex) as boolean;
				const createDirectory = this.getNodeParameter('createDirectory', itemIndex) as boolean;
				const includeTimestamp = this.getNodeParameter('includeTimestamp', itemIndex) as boolean;
				const includeMetadata = this.getNodeParameter('includeMetadata', itemIndex) as boolean;

				// Get the input data
				const inputItem = items[itemIndex];
				
				// Get the content to save
				let content = '';
				if (contentField && inputItem.json[contentField] !== undefined) {
					content = inputItem.json[contentField];
				} else {
					throw new NodeOperationError(
						this.getNode(),
						`Content field "${contentField}" not found in input data`
					);
				}

				// Replace timestamp placeholder in file name
				const timestamp = Date.now();
				const formattedFileName = fileName.replace('{{timestamp}}', timestamp.toString());
				
				// Ensure file has the correct extension
				let finalFileName = formattedFileName;
				if (!finalFileName.endsWith(`.${fileFormat}`)) {
					finalFileName = `${finalFileName}.${fileFormat}`;
				}

				// Construct the full file path
				const fullPath = join(outputPath, finalFileName);
				
				// Ensure the directory exists if createDirectory is true
				if (createDirectory) {
					const dirPath = dirname(fullPath);
					if (!existsSync(dirPath)) {
						try {
							await mkdir(dirPath, { recursive: true });
						} catch (error) {
							throw new NodeOperationError(
								this.getNode(),
								`Failed to create directory: ${error.message}`
							);
						}
					}
				}

				// Format the content based on file format
				let formattedContent = content;
				
				if (fileFormat === 'json') {
					// If the content is already an object, stringify it
					if (typeof content === 'object') {
						formattedContent = JSON.stringify(content, null, 2);
					} else {
						// Try to parse as JSON, if it fails, wrap it in a JSON object
						try {
							JSON.parse(content);
							formattedContent = content;
						} catch (error) {
							formattedContent = JSON.stringify({ content }, null, 2);
						}
					}
				} else if (fileFormat === 'md') {
					// Add markdown formatting if needed
					if (includeTimestamp) {
						const date = new Date(timestamp);
						formattedContent = `# Summary - ${date.toLocaleString()}\n\n${content}`;
					} else {
						formattedContent = `# Summary\n\n${content}`;
					}
					
					if (includeMetadata && inputItem.json.modelInfo) {
						formattedContent += '\n\n## Metadata\n\n';
						formattedContent += `- Model: ${inputItem.json.modelInfo.model || 'Unknown'}\n`;
						formattedContent += `- Processing Time: ${inputItem.json.modelInfo.total_duration || 'Unknown'}\n`;
					}
				} else {
					// Plain text format
					if (includeTimestamp) {
						const date = new Date(timestamp);
						formattedContent = `Summary - ${date.toLocaleString()}\n\n${content}`;
					}
					
					if (includeMetadata && inputItem.json.modelInfo) {
						formattedContent += '\n\nMetadata:\n';
						formattedContent += `Model: ${inputItem.json.modelInfo.model || 'Unknown'}\n`;
						formattedContent += `Processing Time: ${inputItem.json.modelInfo.total_duration || 'Unknown'}\n`;
					}
				}

				// Write the content to the file
				try {
					if (appendToFile) {
						await appendFile(fullPath, formattedContent);
					} else {
						await writeFile(fullPath, formattedContent);
					}
				} catch (error) {
					throw new NodeOperationError(
						this.getNode(),
						`Failed to write to file: ${error.message}`
					);
				}

				// Create output item
				const newItem: INodeExecutionData = {
					json: {
						filePath: fullPath,
						fileName: finalFileName,
						fileFormat,
						timestamp,
						success: true,
					},
				};

				// Preserve binary data if it exists
				if (inputItem.binary) {
					newItem.binary = inputItem.binary;
				}

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
