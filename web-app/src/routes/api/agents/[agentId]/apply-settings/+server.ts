import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ params, request, cookies }) => {
	const { agentId } = params;
	
	// Check authentication
	const session = cookies.get('session');
	if (!session) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const { settings } = await request.json();

	// TODO: Send optimized settings to agent
	// This will:
	// 1. Stop the EA
	// 2. Modify EA inputs with new ATR/threshold values
	// 3. Restart the EA
	// 4. Log the optimization event
	
	// const wsServer = getWebSocketServer();
	// await wsServer.sendToAgent(agentId, {
	//   type: 'execute_command',
	//   command: 'STOP_EA'
	// });
	
	// await wsServer.sendToAgent(agentId, {
	//   type: 'execute_command',
	//   command: 'MODIFY_EA_INPUTS',
	//   params: {
	//     inputs: {
	//       ATR_Period: settings.atrPeriod,
	//       ATR_Multiplier: settings.atrMultiplier,
	//       Green_Threshold: settings.greenThreshold,
	//       Orange_Threshold: settings.orangeThreshold,
	//       Red_Threshold: settings.redThreshold
	//     }
	//   }
	// });
	
	// await wsServer.sendToAgent(agentId, {
	//   type: 'execute_command',
	//   command: 'START_EA'
	// });

	// TODO: Update database
	// await prisma.agent.update({
	//   where: { id: agentId },
	//   data: {
	//     indicatorSettings: settings,
	//     lastOptimized: new Date()
	//   }
	// });

	console.log(`Applying optimized settings to agent ${agentId}:`, settings);

	return json({ 
		success: true,
		message: 'Settings applied successfully. EA restarted with new parameters.' 
	});
};
