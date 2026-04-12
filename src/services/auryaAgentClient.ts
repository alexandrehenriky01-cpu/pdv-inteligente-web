import axios from "axios";

export interface AuryaAgentRequest {
  prompt: string;
  modulo: string;
}

export async function callAuryaAgent(request: AuryaAgentRequest) {
  const response = await axios.post("/api/ai/agent", request);

  return response.data;
}