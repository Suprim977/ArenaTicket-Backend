import { sendSuccess } from '../../utils/response';

describe('response utils', () => {
  it('sends a 200 success response by default', () => {
    const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    sendSuccess(res, { ok: true }, 'Done');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true, message: 'Done', data: { ok: true } });
  });

  it('sends a custom status response', () => {
    const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    sendSuccess(res, null, 'Created', 201);
    expect(res.status).toHaveBeenCalledWith(201);
  });
});
