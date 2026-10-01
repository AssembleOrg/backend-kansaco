import { SubmissionService } from './submission.service';
import { ContactSubmission } from './submission.entity';
import { SubmissionType } from './submission.enum';

describe('SubmissionService.pushToErp', () => {
  const submission = {
    id: 7,
    tipo: SubmissionType.MAYORISTA,
    nombre: 'Test',
    email: 'a@b.com',
    telefono: null,
    mensaje: null,
    payload: { afip: 'MONOTRIBUTO' },
  } as unknown as ContactSubmission;

  const push = (s: SubmissionService) =>
    (s as unknown as { pushToErp(x: ContactSubmission): Promise<void> }).pushToErp(
      submission,
    );
  const res = (status: number) =>
    ({ ok: status < 300, status, text: async () => '' }) as Response;

  let service: SubmissionService;
  let fetchMock: jest.Mock;

  beforeEach(() => {
    service = new SubmissionService({} as never);
    fetchMock = jest.fn();
    global.fetch = fetchMock;
    // sin esperas reales entre reintentos
    jest
      .spyOn(global, 'setTimeout')
      .mockImplementation(((fn: () => void) => fn()) as never);
    process.env.ERP_WEBFORM_URL = 'http://erp/web-form';
    process.env.ERP_WEBFORM_SECRET = 's3cret';
  });

  afterEach(() => {
    jest.restoreAllMocks();
    delete process.env.ERP_WEBFORM_URL;
    delete process.env.ERP_WEBFORM_SECRET;
  });

  it('no hace nada si falta la config', async () => {
    delete process.env.ERP_WEBFORM_SECRET;
    await push(service);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('manda el secret y el id, y reintenta ante 5xx hasta que responde ok', async () => {
    fetchMock.mockResolvedValueOnce(res(502)).mockResolvedValueOnce(res(200));
    await push(service);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [, init] = fetchMock.mock.calls[0];
    expect(init.headers['x-webform-secret']).toBe('s3cret');
    expect(JSON.parse(init.body).submissionId).toBe(7);
  });

  it('no reintenta ante 4xx', async () => {
    fetchMock.mockResolvedValue(res(401));
    await push(service);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('corta a los 3 intentos si el ERP no responde, sin tirar error', async () => {
    fetchMock.mockRejectedValue(new Error('ECONNREFUSED'));
    await expect(push(service)).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});
