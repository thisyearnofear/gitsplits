import http from 'http';
import { ZodError, ZodSchema } from 'zod';

import {
  RepoAnalyzeRequest,
  RepoInsightRequest,
  VerificationCheckRequest,
  VerificationStoreRequest,
  ReputationEvaluateRequest,
  SplitGetRequest,
  SplitCreateRequest,
  SplitUpdateRequest,
  PayoutDistributeRequest,
  PayoutPendingRequest,
  PendingListRequest,
  AttestDistributionRequest,
} from './schemas';

import { analyzeRepo, insightRepo } from './handlers/repo';
import { checkVerification, storeVerification } from './handlers/verification';
import { evaluateReputation } from './handlers/reputation';
import { getSplit, createSplit, updateSplit } from './handlers/split';
import { distributePayout, storePendingPayout } from './handlers/payout';
import { listPending } from './handlers/pending';
import { attestDistribution } from './handlers/attest';

type Handler = (body: unknown) => Promise<unknown>;

function makeHandler<S extends ZodSchema>(schema: S, fn: (parsed: any) => Promise<unknown>): Handler {
  return async (body: unknown) => {
    const parsed = schema.parse(body);
    return await fn(parsed);
  };
}

const routes: Record<string, Handler> = {
  'POST /v1/repo/analyze': makeHandler(RepoAnalyzeRequest, analyzeRepo),
  'POST /v1/repo/insight': makeHandler(RepoInsightRequest, insightRepo),
  'POST /v1/verification/check': makeHandler(VerificationCheckRequest, checkVerification),
  'POST /v1/verification/store': makeHandler(VerificationStoreRequest, storeVerification),
  'POST /v1/reputation/evaluate': makeHandler(ReputationEvaluateRequest, evaluateReputation),
  'POST /v1/split/get': makeHandler(SplitGetRequest, getSplit),
  'POST /v1/split/create': makeHandler(SplitCreateRequest, createSplit),
  'POST /v1/split/update': makeHandler(SplitUpdateRequest, updateSplit),
  'POST /v1/payout/distribute': makeHandler(PayoutDistributeRequest, distributePayout),
  'POST /v1/payout/pending': makeHandler(PayoutPendingRequest, storePendingPayout),
  'POST /v1/pending/list': makeHandler(PendingListRequest, listPending),
  'POST /v1/attest/distribution': makeHandler(AttestDistributionRequest, attestDistribution),
};

function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) {
        reject(Object.assign(new Error('Request body too large'), { statusCode: 413 }));
        req.destroy();
      }
    });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

function isAuthorized(req: http.IncomingMessage): boolean {
  const expected = process.env.AGENT_SERVER_API_KEY;
  if (!expected) return true;
  const provided = req.headers['x-agent-api-key'];
  return typeof provided === 'string' && provided === expected;
}

function send(res: http.ServerResponse, status: number, payload: unknown) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(payload));
}

export function isV1Path(pathname: string): boolean {
  return pathname.startsWith('/v1/');
}

export async function handleV1Request(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  pathname: string
): Promise<void> {
  if (!isAuthorized(req)) {
    return send(res, 401, { error: 'Unauthorized' });
  }

  const method = (req.method || 'GET').toUpperCase();
  const key = `${method} ${pathname}`;
  const handler = routes[key];

  if (!handler) {
    return send(res, 404, { error: 'Not Found', path: pathname });
  }

  if (method !== 'POST') {
    return send(res, 405, { error: 'Method Not Allowed' });
  }

  let raw: string;
  try {
    raw = await readBody(req);
  } catch (err: any) {
    return send(res, err.statusCode || 400, { error: err.message || 'Invalid body' });
  }

  let body: unknown;
  try {
    body = raw ? JSON.parse(raw) : {};
  } catch {
    return send(res, 400, { error: 'Invalid JSON body' });
  }

  try {
    const result = await handler(body);
    return send(res, 200, result);
  } catch (err: any) {
    if (err instanceof ZodError) {
      return send(res, 400, {
        error: 'Validation failed',
        issues: err.issues.map((i) => ({
          path: i.path.join('.'),
          message: i.message,
          code: i.code,
        })),
      });
    }
    const status = err?.statusCode && Number.isInteger(err.statusCode) ? err.statusCode : 500;
    return send(res, status, {
      error: err?.message || 'Internal error',
      code: err?.code,
    });
  }
}
