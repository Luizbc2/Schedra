import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";
import type { NextFunction, Request, RequestHandler, Response } from "express";

type RequestContext = {
  requestId: string;
  userId?: number;
  organizationId?: number;
  sessionId?: number;
  membershipId?: number;
  organizationRole?: string;
};

const storage = new AsyncLocalStorage<RequestContext>();

export const requestContextMiddleware: RequestHandler = (request, response, next) => {
  const suppliedRequestId = request.header("x-request-id")?.trim();
  const requestId = suppliedRequestId && /^[a-zA-Z0-9._:-]{1,128}$/.test(suppliedRequestId)
    ? suppliedRequestId : randomUUID();
  response.setHeader("x-request-id", requestId);
  storage.run({ requestId }, next);
};

export const getRequestContext = (): RequestContext | undefined => storage.getStore();

export const runWithRequestContext = <T>(
  context: Omit<RequestContext, "requestId"> & { requestId?: string },
  callback: () => T,
): T => storage.run({ requestId: context.requestId ?? randomUUID(), ...context }, callback);

export const setRequestActor = (
  actor: Pick<RequestContext, "userId" | "organizationId" | "sessionId" | "membershipId" | "organizationRole">,
): void => {
  const context = storage.getStore();

  if (context) {
    Object.assign(context, actor);
  }
};

export const asyncHandler = (
  handler: (request: Request, response: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler => (request, response, next) => {
  void handler(request, response, next).catch(next);
};
