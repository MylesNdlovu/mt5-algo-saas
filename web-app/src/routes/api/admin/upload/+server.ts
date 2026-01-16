import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { put } from '@vercel/blob';
import { getSessionUser, isAdmin } from '$lib/server/auth';

/**
 * POST /api/admin/upload
 * Upload files (logo, favicon, documents) for IB partners
 * Admin only - returns the URL of the uploaded file
 */
export const POST: RequestHandler = async ({ request, cookies }) => {
	const sessionUser = getSessionUser(cookies);

	if (!sessionUser || !isAdmin(sessionUser)) {
		return json({ success: false, error: 'Admin access required' }, { status: 403 });
	}

	try {
		const formData = await request.formData();
		const file = formData.get('file') as File | null;
		const type = formData.get('type') as string; // 'logo', 'favicon', 'document'
		const partnerId = formData.get('partnerId') as string;

		if (!file) {
			return json({ success: false, error: 'No file provided' }, { status: 400 });
		}

		if (!type || !['logo', 'favicon', 'document', 'kyc', 'id'].includes(type)) {
			return json({ success: false, error: 'Invalid file type' }, { status: 400 });
		}

		// Validate file size
		const maxSizes: Record<string, number> = {
			logo: 2 * 1024 * 1024, // 2MB
			favicon: 100 * 1024, // 100KB
			document: 10 * 1024 * 1024, // 10MB
			kyc: 10 * 1024 * 1024, // 10MB
			id: 5 * 1024 * 1024 // 5MB
		};

		if (file.size > maxSizes[type]) {
			return json(
				{
					success: false,
					error: `File too large. Max size for ${type}: ${maxSizes[type] / 1024 / 1024}MB`
				},
				{ status: 400 }
			);
		}

		// Validate file type
		const allowedTypes: Record<string, string[]> = {
			logo: ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'],
			favicon: ['image/png', 'image/x-icon', 'image/vnd.microsoft.icon', 'image/ico'],
			document: ['application/pdf', 'image/png', 'image/jpeg'],
			kyc: ['application/pdf', 'image/png', 'image/jpeg'],
			id: ['application/pdf', 'image/png', 'image/jpeg']
		};

		if (!allowedTypes[type].includes(file.type)) {
			return json(
				{
					success: false,
					error: `Invalid file type. Allowed: ${allowedTypes[type].join(', ')}`
				},
				{ status: 400 }
			);
		}

		// Generate unique filename
		const ext = file.name.split('.').pop() || 'png';
		const timestamp = Date.now();
		const filename = `ib-${partnerId || 'temp'}-${type}-${timestamp}.${ext}`;

		// Upload to Vercel Blob
		const blob = await put(filename, file, {
			access: 'public',
			addRandomSuffix: false
		});

		return json({
			success: true,
			url: blob.url,
			filename: filename,
			size: file.size,
			type: file.type
		});
	} catch (error) {
		console.error('[Admin Upload] Error:', error);

		// Check if it's a Vercel Blob configuration error
		if (error instanceof Error && error.message.includes('BLOB')) {
			return json(
				{
					success: false,
					error: 'File storage not configured. Please set up BLOB_READ_WRITE_TOKEN in environment variables.'
				},
				{ status: 500 }
			);
		}

		return json({ success: false, error: 'Failed to upload file' }, { status: 500 });
	}
};
