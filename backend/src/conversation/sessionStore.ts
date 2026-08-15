import { AgentSession, AgentSessionOptions } from "./agentSession";

const sessions = new Map<string, AgentSession>();

export function createSession(opts: AgentSessionOptions): AgentSession {
  const session = new AgentSession(opts);
  sessions.set(opts.callId, session);
  return session;
}

export function getSession(callId: string): AgentSession | undefined {
  return sessions.get(callId);
}

export function destroySession(callId: string): void {
  sessions.delete(callId);
}
