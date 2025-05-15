import type { RequestHandler } from './$types';
import {
	PUBLIC_OPENROUTER_API_KEY,
	PUBLIC_OPENROUTER_API_URL,
	PUBLIC_RECRAFT_API_KEY,
	PUBLIC_CLOUDINARY_CLOUD_NAME,
	PUBLIC_CLOUDINARY_API_KEY,
	PUBLIC_CLOUDINARY_API_SECRET
} from '$env/static/public';
import { v2 as cloudinary } from 'cloudinary';
import { ChatOpenAI } from '@langchain/openai';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import type { UploadApiErrorResponse, UploadApiResponse } from 'cloudinary';

/**
 * POST endpoint to generate a cover image for a section
 * Uses a two-step process:
 * 1. Use GPT-4o to identify a symbolic representation from the summary
 * 2. Use GPT-4o to create an image prompt based on that symbol
 * 3. Use Recraft API to generate the image with risograph style
 */
export const POST: RequestHandler = async ({ request }) => {
	// Extract the markdown content from the request body
	const { summary } = await request.json();

	// Log the content to the console
	console.log('Content for cover image generation:', summary);

	try {
		// Step 1: Extract symbolic noun
		const model = new ChatOpenAI({
			openAIApiKey: PUBLIC_OPENROUTER_API_KEY,
			configuration: {
				baseURL: PUBLIC_OPENROUTER_API_URL
			},
			modelName: 'openai/gpt-4o',
			temperature: 0.7
		});

		// Get symbolic representation
		const symbolPrompt = ChatPromptTemplate.fromMessages([
			['system', 'You are a helpful assistant that identifies symbolic representations.'],
			[
				'user',
				`give one simple everyday non-technical layman symbolic representation noun that could represent the following:\n\n"""${summary}"""`
			]
		]);

		const symbolChain = symbolPrompt.pipe(model).pipe(new StringOutputParser());
		const symbol = await symbolChain.invoke({});

		console.log('Symbolic representation:', symbol);

		// Step 2: Generate image prompt
		// Generate image prompt
		const imagePromptTemplate = ChatPromptTemplate.fromMessages([
			['system', 'You are a helpful assistant that creates image generation prompts.'],
			[
				'user',
				`create prompt that would be fed in to an image generator that is going to generate a simple image of the noun you think is representative, it should be specific, precise, simple. Don't describe the style simply describe the object as it is to be in the image. Don't describe the scene, there should be exactly one simple thing. Tell it to use bright light pastel colors, don't describe styling any other way. Just output the prompt and nothing else.\n\nNoun: ${symbol}`
			]
		]);

		const promptChain = imagePromptTemplate.pipe(model).pipe(new StringOutputParser());
		const imagePrompt = await promptChain.invoke({});

		console.log('Image prompt:', imagePrompt);

		// Step 3: Generate image with Recraft
		const recraftResponse = await fetch(
			'https://external.api.recraft.ai/v1/images/generations',
			{
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${PUBLIC_RECRAFT_API_KEY}`
				},
				body: JSON.stringify({
					prompt: imagePrompt,
					n: 1,
					style: 'digital_illustration',
					substyle: 'pop_art'
				})
			}
		);

		if (!recraftResponse.ok) {
			throw new Error(`Recraft API error: ${recraftResponse.statusText}`);
		}

		const recraftData = await recraftResponse.json();
		const imageUrl = recraftData.data[0].url;

		console.log('Generated image URL from Recraft:', imageUrl);

		// Step 4: Fetch the image from Recraft URL
		const imageResponse = await fetch(imageUrl);
		const imageBuffer = await imageResponse.arrayBuffer();

		// Step 5: Upload to Cloudinary
		// Configure Cloudinary
		cloudinary.config({
			cloud_name: PUBLIC_CLOUDINARY_CLOUD_NAME,
			api_key: PUBLIC_CLOUDINARY_API_KEY,
			api_secret: PUBLIC_CLOUDINARY_API_SECRET
		});
		
		// Upload image to Cloudinary
		const uploadResult = await new Promise<UploadApiResponse>((resolve, reject) => {
			const uploadStream = cloudinary.uploader.upload_stream(
				{ folder: 'blog-cover-images' },
				(error: UploadApiErrorResponse | undefined, result?: UploadApiResponse) => {
					if (error) reject(error);
					else if (result) resolve(result);
					else reject(new Error('No result from Cloudinary upload'));
				}
			);

			// Convert ArrayBuffer to Buffer and pipe to upload stream
			const buffer = Buffer.from(imageBuffer);
			uploadStream.end(buffer);
		});

		// Get the permanent Cloudinary URL
		const permanentImageUrl = uploadResult.secure_url;

		console.log('Permanent Cloudinary URL:', permanentImageUrl);

		// Return the image URL
		return new Response(JSON.stringify({ imageUrl: permanentImageUrl }), {
			headers: {
				'Content-Type': 'application/json'
			}
		});
	} catch (error) {
		console.error('Error generating cover image:', error);
		const errorMessage = error instanceof Error ? error.message : String(error);
		return new Response(JSON.stringify({ error: errorMessage }), {
			status: 500,
			headers: {
				'Content-Type': 'application/json'
			}
		});
	}
};
