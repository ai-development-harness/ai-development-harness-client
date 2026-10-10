import type {
  AccountSummary,
  Admission,
  ExecutionRequest,
  HarnessAuthority,
  NativeExecution,
  NativeResult,
  NativeRuntimeAdapter,
  PermissionBroker,
  RuntimeCapability,
  RuntimeEvent,
  RuntimeId,
  SupportState,
} from './contracts';
import { NativeSessionUnavailable } from './contracts';

export type BridgeResult =
  | NativeResult
  | { status: 'blocked'; reasonCode: string };

export interface BridgeOptions {
  authority: HarnessAuthority;
  adapters: Readonly<Record<RuntimeId, NativeRuntimeAdapter>>;
}

export interface ExecuteOptions {
  signal: AbortSignal;
  onEvent: (event: RuntimeEvent) => void;
  onPermission?: PermissionBroker;
}

function blocked(reasonCode: string): BridgeResult {
  return { status: 'blocked', reasonCode };
}

function acceptable(
  admission: Admission,
  request: ExecutionRequest,
  avoidNativeReuse: boolean,
): admission is Extract<Admission, { status: 'allowed' }> {
  if (admission.status !== 'allowed') return false;
  if (
    admission.runtimeId !== request.runtimeId ||
    admission.projectRoot !== request.projectRoot ||
    !admission.executionId.trim() ||
    !admission.prompt.trim()
  ) {
    return false;
  }

  // Runtime mismatch is NEVER a prerequisite for a new canonical command.
  // A resume plan, however, may only reuse a handle of the same provider
  // and identical project root. We never translate Claude IDs into Codex.
  if (admission.nativeAction === 'resume') {
    const handle = admission.nativeHandle;
    if (
      avoidNativeReuse ||
      !handle ||
      handle.runtimeId !== request.runtimeId ||
      handle.projectRoot !== request.projectRoot ||
      !handle.sessionId.trim()
    ) {
      return false;
    }
  }
  return admission.nativeAction === 'start' || admission.nativeAction === 'resume';
}

/**
 * Безопасный bridge поверх подтверждённой Harness authority.
 *
 * Не выполняет CTS, не угадывает resume из истории модели и не запускается из
 * main.ts до готовности STEP-002 (platform containment / security admission).
 */
export class RuntimeBridge {
  private readonly authority: HarnessAuthority;
  private readonly adapters: Readonly<Record<RuntimeId, NativeRuntimeAdapter>>;

  constructor(options: BridgeOptions) {
    this.authority = options.authority;
    this.adapters = options.adapters;
    for (const runtimeId of ['claude', 'codex'] as const) {
      if (options.adapters[runtimeId]?.runtimeId !== runtimeId) {
        throw new TypeError('runtime adapter identity mismatch');
      }
    }
  }

  async account(runtimeId: RuntimeId): Promise<AccountSummary> {
    return this.adapters[runtimeId].getAccount();
  }

  async capabilities(
    runtimeId: RuntimeId,
  ): Promise<Readonly<Record<RuntimeCapability, SupportState>>> {
    return this.adapters[runtimeId].getCapabilities();
  }

  async execute(
    request: ExecutionRequest,
    options: ExecuteOptions,
  ): Promise<BridgeResult> {
    // Canonical decision MUST be obtained before any native adapter invocation.
    // No implicit provider switch even if account/capability is unavailable.
    const admission = await this.authority.prepare(request, {
      avoidNativeReuse: false,
    });
    if (admission.status === 'blocked') return blocked(admission.reasonCode);
    if (!acceptable(admission, request, false)) return blocked('INVALID_HARNESS_ADMISSION');
    if (options.signal.aborted) return { status: 'interrupted' };

    const adapter = this.adapters[request.runtimeId];
    const capabilities = await adapter.getCapabilities();
    for (const name of admission.requiredCapabilities ?? []) {
      if (capabilities[name] !== 'native' && capabilities[name] !== 'synthesized') {
        return blocked('REQUIRED_CAPABILITY_UNAVAILABLE');
      }
    }

    // Native provider events may only describe execution telemetry; they are
    // never interpreted as CTS transitions or durable project state.
    const emit: NativeExecution['emit'] = (event) => {
      if (
        event.runtimeId !== request.runtimeId ||
        event.executionId !== admission.executionId
      ) {
        return;
      }
      options.onEvent(event);
    };
    const requestPermission: PermissionBroker =
      options.onPermission ?? (async () => 'deny');

    const executeNative = (
      approved: Extract<Admission, { status: 'allowed' }>,
    ) => adapter.execute({
      executionId: approved.executionId,
      projectRoot: approved.projectRoot,
      prompt: approved.prompt,
      nativeSessionId: approved.nativeAction === 'resume'
        ? approved.nativeHandle?.sessionId
        : undefined,
      signal: options.signal,
      emit,
      requestPermission,
    });

    try {
      return await executeNative(admission);
    } catch (error) {
      if (
        !(error instanceof NativeSessionUnavailable) ||
        admission.nativeAction !== 'resume' ||
        options.signal.aborted
      ) {
        return options.signal.aborted
          ? { status: 'interrupted' }
          : { status: 'failed', reasonCode: 'NATIVE_RUNTIME_FAILED' };
      }

      // A missing native session means NO turn/query has started. Re-query
      // Harness authority, never retry unsafe side effects based on SDK errors.
      const fresh = await this.authority.prepare(request, {
        avoidNativeReuse: true,
      });
      if (fresh.status === 'blocked') return blocked(fresh.reasonCode);
      if (!acceptable(fresh, request, true) || fresh.nativeAction !== 'start') {
        return blocked('CANONICAL_REENTRY_UNPROVEN');
      }
      if (
        fresh.executionId !== admission.executionId ||
        options.signal.aborted
      ) {
        return blocked('EXECUTION_CHANGED_DURING_REENTRY');
      }
      for (const name of fresh.requiredCapabilities ?? []) {
        if (capabilities[name] !== 'native' && capabilities[name] !== 'synthesized') {
          return blocked('REQUIRED_CAPABILITY_UNAVAILABLE');
        }
      }
      try {
        return await executeNative(fresh);
      } catch {
        return options.signal.aborted
          ? { status: 'interrupted' }
          : { status: 'failed', reasonCode: 'NATIVE_RUNTIME_FAILED' };
      }
    }
  }
}
