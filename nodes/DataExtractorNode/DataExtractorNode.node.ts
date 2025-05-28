import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
} from 'n8n-workflow';

export class DataExtractorNode implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Data Extractor',
		name: 'dataExtractorNode',
		group: ['transform'],
		version: 1,
		description: 'Extracts structured data from PDF text content',
		defaults: {
			name: 'Data Extractor',
		},
		inputs: ['main'],
		outputs: ['main'],
		properties: [
			{
				displayName: 'Extraction Rules',
				name: 'extractionRules',
				type: 'json',
				default: '{\n  "title": {\n    "pattern": "Title:\\s*(.+)",\n    "type": "string"\n  },\n  "date": {\n    "pattern": "Date:\\s*(\\d{2}/\\d{2}/\\d{4})",\n    "type": "date"\n  },\n  "amount": {\n    "pattern": "Amount:\\s*\\$(\\d+\\.\\d{2})",\n    "type": "number"\n  }\n}',
				description: 'JSON object defining extraction patterns using regular expressions',
				typeOptions: {
					rows: 8,
				},
			},
			{
				displayName: 'Output Format',
				name: 'outputFormat',
				type: 'options',
				options: [
					{
						name: 'JSON',
						value: 'json',
						description: 'Output as JSON object',
					},
					{
						name: 'Key-Value Pairs',
						value: 'keyValue',
						description: 'Output as simple key-value pairs',
					},
				],
				default: 'json',
				description: 'Format for the extracted data',
			},
			{
				displayName: 'Include Raw Text',
				name: 'includeRawText',
				type: 'boolean',
				default: false,
				description: 'Whether to include the original raw text in the output',
			},
			{
				displayName: 'Include Extraction Metadata',
				name: 'includeExtractionMetadata',
				type: 'boolean',
				default: true,
				description: 'Whether to include metadata about the extraction process',
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
				const extractionRulesJson = this.getNodeParameter('extractionRules', itemIndex) as string;
				const outputFormat = this.getNodeParameter('outputFormat', itemIndex) as string;
				const includeRawText = this.getNodeParameter('includeRawText', itemIndex) as boolean;
				const includeExtractionMetadata = this.getNodeParameter('includeExtractionMetadata', itemIndex) as boolean;

				// Get the input text from the previous node
				const inputItem = items[itemIndex];
				const text = inputItem.json.text || '';

				if (!text) {
					throw new NodeOperationError(this.getNode(), 'No text content found in input');
				}

				// Parse extraction rules
				let extractionRules;
				try {
					extractionRules = typeof extractionRulesJson === 'string' 
						? JSON.parse(extractionRulesJson) 
						: extractionRulesJson;
				} catch (error) {
					throw new NodeOperationError(
						this.getNode(),
						`Invalid extraction rules JSON: ${error.message}`
					);
				}

				// Extract data based on rules
				const extractedData = {};
				const extractionMetadata = {
					totalRules: Object.keys(extractionRules).length,
					matchedRules: 0,
					processingTime: 0,
				};

				const startTime = Date.now();

				// Apply each extraction rule
				for (const [key, rule] of Object.entries(extractionRules)) {
					const { pattern, type } = rule as { pattern: string; type: string };
					
					try {
						const regex = new RegExp(pattern);
						const match = regex.exec(text);
						
						if (match && match[1]) {
							// Convert the value based on the specified type
							let value = match[1].trim();
							
							if (type === 'number') {
								value = parseFloat(value);
							} else if (type === 'boolean') {
								value = value.toLowerCase() === 'true' || value === '1';
							} else if (type === 'date') {
								// Keep as string for now, can be parsed later if needed
							}
							
							extractedData[key] = value;
							extractionMetadata.matchedRules++;
						}
					} catch (error) {
						// Log the error but continue with other rules
						console.error(`Error applying rule for key "${key}": ${error.message}`);
					}
				}

				extractionMetadata.processingTime = Date.now() - startTime;

				// Prepare output based on format
				let outputData;
				if (outputFormat === 'json') {
					outputData = extractedData;
				} else if (outputFormat === 'keyValue') {
					outputData = {};
					for (const [key, value] of Object.entries(extractedData)) {
						outputData[key] = value;
					}
				}

				// Create output item
				const newItem: INodeExecutionData = {
					json: {
						...outputData,
						...(includeRawText ? { rawText: text } : {}),
						...(includeExtractionMetadata ? { extractionMetadata } : {}),
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
