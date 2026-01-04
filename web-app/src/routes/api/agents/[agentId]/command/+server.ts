import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ params, request, cookies }) => {
	const { agentId } = params;
	
	// Check authentication
	const session = cookies.get('session');
	if (!session) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const { command, params: commandParams } = await request.json();

	// TODO: Send command to agent via WebSocket
	// const wsServer = getWebSocketServer();
	// wsServer.sendToAgent(agentId, {
	//   type: 'execute_command',
	//   command,
	//   params: commandParams
	// });

	console.log(`Sending command to agent ${agentId}:`, command, commandParams);

	// TODO: Log command to database
	// await prisma.agentAction.create({
	//   data: {
	//     agentId,
	//     action: command,
	//     parameters: commandParams,
	//     status: 'PENDING',
	//     triggeredBy: session.userId
	//   }
	// });

	return json({ 
		success: true,
		message: `Command ${command} sent to agent ${agentId}` 
	});
};
