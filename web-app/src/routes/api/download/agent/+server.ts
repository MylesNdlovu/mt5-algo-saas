import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

export const GET: RequestHandler = async () => {
	// Path to the compiled C# agent executable
	const agentPath = join(process.cwd(), '..', 'csharp-agent', 'MT5AgentAPI', 'bin', 'Release', 'net6.0', 'MT5Agent.exe');
	
	// Check if the agent exe exists
	if (!existsSync(agentPath)) {
		throw error(404, {
			message: 'Agent executable not found. Please build the C# agent first using: cd csharp-agent/MT5AgentAPI && dotnet build -c Release'
		});
	}

	try {
		// Read the exe file
		const fileBuffer = readFileSync(agentPath);
		
		// Return the file as a download
		return new Response(fileBuffer, {
			headers: {
				'Content-Type': 'application/octet-stream',
				'Content-Disposition': 'attachment; filename="SCALPERIUM-MT5-Agent.exe"',
				'Content-Length': fileBuffer.length.toString()
			}
		});
	} catch (err) {
		console.error('Failed to read agent executable:', err);
		throw error(500, 'Failed to download agent executable');
	}
};
