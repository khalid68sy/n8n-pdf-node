import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
} from 'n8n-workflow';

import axios from 'axios';

export class OllamaSummarizerNode implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Ollama Summarizer',
		name: 'ollamaSummarizerNode',
		group: ['transform'],
		version: 1,
		description: 'Summarizes text using Ollama LLM',
		defaults: {
			name: 'Ollama Summarizer',
		},
		inputs: ['main'],
		outputs: ['main'],
		properties: [
			{
				displayName: 'Ollama API Endpoint',
				name: 'ollamaEndpoint',
				type: 'string',
				default: 'http://localhost:11434',
				description: 'URL of the Ollama API',
				required: true,
			},
			{
				displayName: 'Model',
				name: 'model',
				type: 'string',
				default: 'llama3',
				description: 'LLM model to use for summarization',
				required: true,
			},
			{
				displayName: 'API Method',
				name: 'apiMethod',
				type: 'options',
				options: [
					{
						name: 'Generate',
						value: 'generate',
						description: 'Use the /api/generate endpoint',
					},
					{
						name: 'Chat',
						value: 'chat',
						description: 'Use the /api/chat endpoint',
					},
				],
				default: 'generate',
				description: 'Ollama API method to use',
			},
			{
				displayName: 'Prompt Template',
				name: 'promptTemplate',
				type: 'string',
				default: 'Please summarize the following document content in a concise manner:\n\n{{data}}',
				description: 'Template for constructing the prompt. Use {{data}} as placeholder for the input data.',
				typeOptions: {
					rows: 4,
				},
			},
			{
				displayName: 'Temperature',
				name: 'temperature',
				type: 'number',
				default: 0.7,
				description: 'Controls randomness in the output (0.0-1.0)',
				typeOptions: {
					minValue: 0,
					maxValue: 1,
				},
			},
			{
				displayName: 'Max Tokens',
				name: 'maxTokens',
				type: 'number',
				default: 500,
				description: 'Maximum number of tokens in the response',
				typeOptions: {
					minValue: 1,
				},
			},
			{
				displayName: 'Include Input Data',
				name: 'includeInputData',
				type: 'boolean',
				default: false,
				description: 'Whether to include the input data in the output',
			},
			{
				displayName: 'Include Model Info',
				name: 'includeModelInfo',
				type: 'boolean',
				default: true,
				description: 'Whether to include model information in the output',
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
				const ollamaEndpoint = this.getNodeParameter('ollamaEndpoint', itemIndex) as string;
				const model = this.getNodeParameter('model', itemIndex) as string;
				const apiMethod = this.getNodeParameter('apiMethod', itemIndex) as string;
				const promptTemplate = this.getNodeParameter('promptTemplate', itemIndex) as string;
				const temperature = this.getNodeParameter('temperature', itemIndex) as number;
				const maxTokens = this.getNodeParameter('maxTokens', itemIndex) as number;
				const includeInputData = this.getNodeParameter('includeInputData', itemIndex) as boolean;
				const includeModelInfo = this.getNodeParameter('includeModelInfo', itemIndex) as boolean;

				// Get the input data from the previous node
				const inputItem = items[itemIndex];
				
				// Prepare the data to be summarized
				let dataToSummarize = '';
				
				// If the input is structured data, convert it to a string representation
				if (typeof inputItem.json === 'object') {
					// Remove any metadata or raw text to focus on the extracted data
					const { extractionMetadata, rawText, success, ...extractedData } = inputItem.json;
					
					// Convert the extracted data to a string
					dataToSummarize = JSON.stringify(extractedData, null, 2);
				} else if (inputItem.json.text) {
					// If there's a text property, use that
					dataToSummarize = inputItem.json.text;
				} else {
					// Fallback to stringifying the entire input
					dataToSummarize = JSON.stringify(inputItem.json, null, 2);
				}

				// Replace the placeholder in the prompt template
				const prompt = promptTemplate.replace('{{data}}', dataToSummarize);

				// Prepare the API request
				let apiUrl = `${ollamaEndpoint}/api/${apiMethod}`;
				let requestData;

				if (apiMethod === 'generate') {
					requestData = {
						model,
						prompt,
						temperature,
						max_tokens: maxTokens,
						stream: false,
					};
				} else if (apiMethod === 'chat') {
					requestData = {
						model,
						messages: [
							{
								role: 'user',
								content: prompt,
							},
						],
						temperature,
						max_tokens: maxTokens,
						stream: false,
					};
				}

				// Make the API request to Ollama
				let response;
				try {
					response = await axios.post(apiUrl, requestData);
				} catch (error) {
					throw new NodeOperationError(
						this.getNode(),
						`Error calling Ollama API: ${error.message}`
					);
				}

				// Extract the summary from the response
				let summary = '';
				let modelInfo = {};

				if (apiMethod === 'generate') {
					summary = response.data.response;
					modelInfo = {
						model: response.data.model,
						total_duration: response.data.total_duration,
						load_duration: response.data.load_duration,
						prompt_eval_count: response.data.prompt_eval_count,
						prompt_eval_duration: response.data.prompt_eval_duration,
						eval_count: response.data.eval_count,
						eval_duration: response.data.eval_duration,
					};
				} else if (apiMethod === 'chat') {
					summary = response.data.message.content;
					modelInfo = {
						model: response.data.model,
						total_duration: response.data.total_duration,
						load_duration: response.data.load_duration,
						prompt_eval_count: response.data.prompt_eval_count,
						prompt_eval_duration: response.data.prompt_eval_duration,
						eval_count: response.data.eval_count,
						eval_duration: response.data.eval_duration,
					};
				}

				// Create output item
				const newItem: INodeExecutionData = {
					json: {
						summary,
						...(includeModelInfo ? { modelInfo } : {}),
						...(includeInputData ? { inputData: dataToSummarize } : {}),
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
