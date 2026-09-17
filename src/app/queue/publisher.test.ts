import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  getNextTask, 
  markTaskAsPublished, 
  approveQueueTask, 
  markTaskAsPrepared 
} from './actions';
import { 
  selectNextTask, 
  canTransition, 
  isTerminalStatus, 
} from '@/lib/queue/status';

// Mock Supabase
const mockUpdate = vi.fn();
const mockEq = vi.fn();
const mockSelect = vi.fn();
const mockIn = vi.fn();
const mockLte = vi.fn();
const mockNeq = vi.fn();
const mockSingle = vi.fn();

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: vi.fn(() => ({
    from: vi.fn(() => ({
      update: mockUpdate,
      select: mockSelect,
    })),
  }))
}));

describe('Publisher Workstation Logic & Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock chains
    mockUpdate.mockReturnValue({ eq: mockEq });
    mockEq.mockReturnValue({ select: vi.fn().mockReturnValue({ single: mockSingle }) });
    mockSingle.mockResolvedValue({ data: {}, error: null });

    mockSelect.mockReturnValue({ in: mockIn, eq: mockEq });
    mockIn.mockReturnValue({ lte: mockLte });
    mockLte.mockReturnValue({ neq: mockNeq });
    mockNeq.mockResolvedValue({ data: [], error: null });
  });

  it('markTaskAsPublished should update status, published_at, url and notes atomically', async () => {
    mockEq.mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { id: 'task-123', status: 'Published' },
          error: null
        })
      })
    });

    const res = await markTaskAsPublished('task-123', 'http://fb.com', 'All good');

    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
      status: 'Published',
      facebook_post_url: 'http://fb.com',
      publication_notes: 'All good'
    }));
    expect(res.success).toBe(true);
  });

  it('approveQueueTask should set status to Approved and record approved_at', async () => {
    mockSelect.mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: { approved_at: null }, error: null })
      })
    });
    mockEq.mockResolvedValue({ error: null });

    const res = await approveQueueTask('task-123');

    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
      status: 'Approved',
      approved_at: expect.any(String),
    }));
    expect(res.success).toBe(true);
  });

  it('markTaskAsPrepared should set prepared_at idempotently', async () => {
    mockSelect.mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: { prepared_at: null, status: 'Draft' }, error: null })
      })
    });
    mockEq.mockResolvedValue({ error: null });

    const res = await markTaskAsPrepared('task-123');

    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
      prepared_at: expect.any(String),
      status: 'Ready',
    }));
    expect(res.success).toBe(true);
  });
});

describe('State Machine & Transitions', () => {
  it('should allow valid forward transitions', () => {
    expect(canTransition('Draft', 'Planned')).toBe(true);
    expect(canTransition('Planned', 'Ready')).toBe(true);
    expect(canTransition('Ready', 'Approved')).toBe(true);
    expect(canTransition('Approved', 'Today')).toBe(true);
    expect(canTransition('Today', 'Published')).toBe(true);
  });

  it('should allow skipping and cancellation branches', () => {
    expect(canTransition('Ready', 'Skipped')).toBe(true);
    expect(canTransition('Approved', 'Skipped')).toBe(true);
    expect(canTransition('Today', 'Skipped')).toBe(true);
    expect(canTransition('Draft', 'Cancelled')).toBe(true);
  });

  it('should treat Published, Skipped, and Cancelled as terminal states', () => {
    expect(isTerminalStatus('Published')).toBe(true);
    expect(isTerminalStatus('Skipped')).toBe(true);
    expect(isTerminalStatus('Cancelled')).toBe(true);

    expect(canTransition('Published', 'Ready')).toBe(false);
    expect(canTransition('Skipped', 'Today')).toBe(false);
    expect(canTransition('Cancelled', 'Planned')).toBe(false);
  });
});

describe('getNextTask() & selectNextTask() Requirements', () => {

  const pastTime1 = new Date(Date.now() - 3600000).toISOString();
  const pastTime2 = new Date(Date.now() - 1800000).toISOString();

  // Caso 1: Una tarea Ready existe -> debe ser seleccionada.
  it('Caso 1: Una tarea Ready existe -> debe ser seleccionada', () => {
    const tasks = [
      { id: 'task-1', status: 'Ready', priority: 'Medium', scheduled_for: pastTime1 }
    ];
    const result = selectNextTask(tasks, 'task-current');
    expect(result?.id).toBe('task-1');
  });

  // Caso 2: Una tarea Approved existe -> debe ser seleccionada.
  it('Caso 2: Una tarea Approved existe -> debe ser seleccionada', () => {
    const tasks = [
      { id: 'task-2', status: 'Approved', priority: 'Medium', scheduled_for: pastTime1 }
    ];
    const result = selectNextTask(tasks, 'task-current');
    expect(result?.id).toBe('task-2');
  });

  // Caso 3: Una tarea Today existe -> debe ser seleccionada.
  it('Caso 3: Una tarea Today existe -> debe ser seleccionada', () => {
    const tasks = [
      { id: 'task-3', status: 'Today', priority: 'Medium', scheduled_for: pastTime1 }
    ];
    const result = selectNextTask(tasks, 'task-current');
    expect(result?.id).toBe('task-3');
  });

  // Caso 4: Solo existe una tarea Published -> debe regresar null.
  it('Caso 4: Solo existe una tarea Published -> debe regresar null', () => {
    const tasks = [
      { id: 'task-pub', status: 'Published', priority: 'High', scheduled_for: pastTime1 }
    ];
    const result = selectNextTask(tasks, 'task-current');
    expect(result).toBeNull();
  });

  // Caso 5: Solo existe Skipped -> debe regresar null.
  it('Caso 5: Solo existe Skipped -> debe regresar null', () => {
    const tasks = [
      { id: 'task-skip', status: 'Skipped', priority: 'High', scheduled_for: pastTime1 }
    ];
    const result = selectNextTask(tasks, 'task-current');
    expect(result).toBeNull();
  });

  // Caso 6: Existen varias tareas -> debe elegir primero High, luego Medium, luego Low.
  it('Caso 6: Existen varias tareas -> debe elegir primero High, luego Medium, luego Low', () => {
    const tasks = [
      { id: 'task-low', status: 'Ready', priority: 'Low', scheduled_for: pastTime1 },
      { id: 'task-high', status: 'Ready', priority: 'High', scheduled_for: pastTime2 },
      { id: 'task-med', status: 'Ready', priority: 'Medium', scheduled_for: pastTime1 },
    ];
    const result = selectNextTask(tasks, 'task-current');
    expect(result?.id).toBe('task-high');

    // Without High, choose Medium
    const withoutHigh = tasks.filter(t => t.id !== 'task-high');
    expect(selectNextTask(withoutHigh, 'task-current')?.id).toBe('task-med');

    // Without Medium, choose Low
    const withoutMed = withoutHigh.filter(t => t.id !== 'task-med');
    expect(selectNextTask(withoutMed, 'task-current')?.id).toBe('task-low');
  });

  // Caso 7: Dos tareas tienen misma prioridad -> elegir la de menor scheduled_for.
  it('Caso 7: Dos tareas tienen misma prioridad -> elegir la de menor scheduled_for', () => {
    const tasks = [
      { id: 'task-later', status: 'Ready', priority: 'High', scheduled_for: pastTime2 },
      { id: 'task-earlier', status: 'Ready', priority: 'High', scheduled_for: pastTime1 },
    ];
    const result = selectNextTask(tasks, 'task-current');
    expect(result?.id).toBe('task-earlier');
  });

  // Caso 8: La siguiente tarea es la tarea actual -> excluirla.
  it('Caso 8: La siguiente tarea es la tarea actual -> excluirla', () => {
    const tasks = [
      { id: 'task-current', status: 'Ready', priority: 'High', scheduled_for: pastTime1 },
      { id: 'task-other', status: 'Ready', priority: 'Medium', scheduled_for: pastTime2 },
    ];
    const result = selectNextTask(tasks, 'task-current');
    expect(result?.id).toBe('task-other');
  });

  // Caso 9: Existe Pending -> no utilizarlo porque no es un estado válido.
  it('Caso 9: Existe Pending -> no utilizarlo porque no es un estado válido', () => {
    const tasks = [
      { id: 'task-pending', status: 'Pending', priority: 'High', scheduled_for: pastTime1 }
    ];
    const result = selectNextTask(tasks, 'task-current');
    expect(result).toBeNull();
  });

  // Integration test with getNextTask using Supabase mock
  it('getNextTask server action delegates to selectNextTask with DB results', async () => {
    mockSelect.mockReturnValue({ in: mockIn });
    mockIn.mockReturnValue({ lte: mockLte });
    mockLte.mockReturnValue({ neq: mockNeq });
    mockNeq.mockResolvedValue({
      data: [
        { id: 'task-candidate-1', status: 'Approved', priority: 'High', scheduled_for: pastTime1 }
      ],
      error: null
    });

    const result = await getNextTask('task-current');
    expect(result).toBe('task-candidate-1');
  });
});
