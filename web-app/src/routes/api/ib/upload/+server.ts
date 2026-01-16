import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { put } from '@vercel/blob';

/**
 * POST /api/ib/upload
 * Upload documents for IB registration (public endpoint)
 * Used for: company registration, ID copy, KYC documents
 */
export const POST: RequestHandler = async ({ request }) => {
	try {
		const formData = await request.formData();
		const file = formData.get('file') as File | null;
		const type = formData.get('type') as string; // 'company', 'id', 'kyc'
		const tempId = formData.get('tempId') as string; // Temporary ID for grouping files

		if (!file) {
			return json({ success: false, error: 'No file provided' }, { status: 400 });
		}

		if (!type || !['company', 'id', 'kyc'].includes(type)) {
			return json({ success: false, error: 'Invalid document type' }, { status: 400 });
		}

		// Validate file size (10MB max for documents)
		const maxSize = 10 * 1024 * 1024;
		if (file.size > maxSize) {
			return json(
				{ success: false, error: 'File too large. Maximum size is 10MB' },
				{ status: 400 }
			);
		}

		// Validate file type
		const allowedTypes = [
			'application/pdf',
			'image/png',
			'image/jpeg',
			'image/jpg'
		];

		if (!allowedTypes.includes(file.type)) {
			return json(
				{ success: false, error: 'Invalid file type. Allowed: PDF, PNG, JPG' },
				{ status: 400 }
			);
		}

		// Generate filename
		const ext = file.name.split('.').pop() || 'pdf';
		const timestamp = Date.now();
		const filename = `ib-reg-${type}-${tempId || timestamp}-${timestamp}.${ext}`;

		// Upload to Vercel Blob
		const blob = await put(filename, file, {
			access: 'public',
			addRandomSuffix: true
		});

		return json({
			success: true,
			url: blob.url,
			filename: filename,
			size: file.size,
			type: file.type
		});
	} catch (error) {
		console.error('[IB Upload] Error:', error);

		// Check if it's a Vercel Blob configuration error
		if (error instanceof Error && error.message.includes('BLOB')) {
			return json(
				{
					success: false,
					error: 'File storage not configured. Please contact support.'
				},
				{ status: 500 }
			);
		}

		return json({ success: false, error: 'Failed to upload file' }, { status: 500 });
	}
};
