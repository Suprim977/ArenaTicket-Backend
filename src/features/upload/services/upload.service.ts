import path from 'path';
import { IUploadedFileResponse } from '../types/upload.types';

export class UploadService {
  buildFileResponse(file: Express.Multer.File): IUploadedFileResponse {
    const relativePath = path.relative(process.cwd(), file.path).replace(/\\/g, '/');

    return {
      fileName: file.filename,
      filePath: relativePath,
      fileUrl: `/${relativePath}`,
      mimeType: file.mimetype,
      size: file.size,
    };
  }
}