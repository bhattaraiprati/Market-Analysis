import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryService } from './cloudinary.service';

describe('CloudinaryService', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('uses the configured timeout and retries transient upload failures', async () => {
    const config: Record<string, string> = {
      CLOUDINARY_UPLOAD_TIMEOUT_MS: '123456',
      CLOUDINARY_UPLOAD_MAX_ATTEMPTS: '3',
      CLOUDINARY_UPLOAD_RETRY_DELAY_MS: '1',
    };
    const service = new CloudinaryService({
      get: jest.fn((key: string) => config[key]),
    } as unknown as ConfigService);
    let attempt = 0;
    const uploadStream = jest
      .spyOn(cloudinary.uploader, 'upload_stream')
      .mockImplementation((options: any, callback?: any): any => ({
        end: () => {
          attempt += 1;
          if (attempt === 1) {
            callback?.({
              http_code: 499,
              name: 'TimeoutError',
              message: 'Request Timeout',
            });
          } else {
            callback?.(undefined, {
              public_id: 'knowledge-base/file.pdf',
              secure_url: 'https://res.cloudinary.com/test/file.pdf',
            });
          }
        },
      }));

    const result = await service.uploadBuffer(Buffer.from('pdf'), {
      resourceType: 'raw',
      publicId: 'file.pdf',
    });

    expect(result.public_id).toBe('knowledge-base/file.pdf');
    expect(uploadStream).toHaveBeenCalledTimes(2);
    expect(uploadStream).toHaveBeenCalledWith(
      expect.objectContaining({
        timeout: 123456,
        overwrite: true,
        public_id: 'file.pdf',
      }),
      expect.any(Function),
    );
  });

  it('does not retry permanent Cloudinary validation errors', async () => {
    const service = new CloudinaryService({
      get: jest.fn((key: string) =>
        key === 'CLOUDINARY_UPLOAD_RETRY_DELAY_MS' ? '1' : undefined,
      ),
    } as unknown as ConfigService);
    const uploadStream = jest
      .spyOn(cloudinary.uploader, 'upload_stream')
      .mockImplementation((_options: any, callback?: any): any => ({
        end: () =>
          callback?.({
            http_code: 400,
            message: 'Invalid upload parameters',
          }),
      }));

    await expect(
      service.uploadBuffer(Buffer.from('pdf')),
    ).rejects.toMatchObject({ http_code: 400 });
    expect(uploadStream).toHaveBeenCalledTimes(1);
  });
});
