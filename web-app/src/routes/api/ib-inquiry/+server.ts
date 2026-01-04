import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import fs from 'fs';
import path from 'path';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const data = await request.json();
		
		// Validate required fields
		if (!data.name || !data.email || !data.company || !data.phone) {
			return json({ error: 'Missing required fields' }, { status: 400 });
		}
		
		// Create inquiries directory if it doesn't exist
		const dataDir = path.join(process.cwd(), 'data');
		if (!fs.existsSync(dataDir)) {
			fs.mkdirSync(dataDir, { recursive: true });
		}
		
		const inquiriesPath = path.join(dataDir, 'ib-inquiries.json');
		
		// Load existing inquiries
		let inquiries: any[] = [];
		if (fs.existsSync(inquiriesPath)) {
			const fileContent = fs.readFileSync(inquiriesPath, 'utf-8');
			inquiries = JSON.parse(fileContent);
		}
		
		// Add new inquiry with timestamp
		const newInquiry = {
			id: Date.now().toString(),
			timestamp: new Date().toISOString(),
			...data,
			status: 'pending'
		};
		
		inquiries.push(newInquiry);
		
		// Save back to file
		fs.writeFileSync(inquiriesPath, JSON.stringify(inquiries, null, 2));
		
		// TODO: Send email notification to admin
		// TODO: Send confirmation email to applicant
		
		return json({ 
			success: true, 
			message: 'Application received successfully',
			inquiryId: newInquiry.id
		});
		
	} catch (error) {
		console.error('Error saving IB inquiry:', error);
		return json({ error: 'Failed to process application' }, { status: 500 });
	}
};
