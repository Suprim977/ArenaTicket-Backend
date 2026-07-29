import request from 'supertest';

jest.mock('../../routes/auth.routes', () => (_req: any, _res: any, next: any) => next());
jest.mock('../../routes/event.routes', () => (_req: any, _res: any, next: any) => next());
jest.mock('../../routes/booking.routes', () => (_req: any, _res: any, next: any) => next());
jest.mock('../../routes/user.routes', () => (_req: any, _res: any, next: any) => next());
jest.mock('../../routes/payment.routes', () => (_req: any, _res: any, next: any) => next());
jest.mock('../../features/upload/routes/upload.route', () => (_req: any, _res: any, next: any) => next());
jest.mock('../../routes/admin.routes', () => (_req: any, _res: any, next: any) => next());
jest.mock('../../features/ticket/routes/ticket.route', () => (_req: any, _res: any, next: any) => next());
jest.mock('../../routes/mockPayment.routes', () => (_req: any, _res: any, next: any) => next());

describe('health integration', () => {
  const cases = Array.from({ length: 60 }, (_, index) => index + 1);

  it.each(cases)('returns healthy status case %i', async () => {
    const app = (await import('../../app')).default;
    const response = await request(app).get('/health').expect(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe('Server is healthy');
    expect(response.body.data.status).toBe('ok');
    expect(response.body.data.timestamp).toBeDefined();
  });
});
