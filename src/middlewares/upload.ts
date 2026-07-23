import { Request } from 'express';
import multer, { FileFilterCallback } from 'multer';
import fs from 'fs';
import path from 'path';
import { AppError } from './errorHandler';

const ensureDirectory = (directoryPath: string): void => {
  if (!fs.existsSync(directoryPath)) {
    fs.mkdirSync(directoryPath, { recursive: true });
  }
};

const getUploadDirectory = (fieldName: string): string => {
  if (fieldName === 'banner') {
    return path.join(process.cwd(), 'uploads', 'tournaments');
  }

  return path.join(process.cwd(), 'uploads', 'users');
};

const storage = multer.diskStorage({
  destination: (_req: Request, file: Express.Multer.File, cb) => {
    const uploadDirectory = getUploadDirectory(file.fieldname);
    ensureDirectory(uploadDirectory);
    cb(null, uploadDirectory);
  },
  filename: (_req: Request, file: Express.Multer.File, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname).toLowerCase()}`);
  },
});

const fileFilter = (_req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
  const allowedExtensions = ['.jpeg', '.jpg', '.png', '.webp'];
  const fileExtension = path.extname(file.originalname).toLowerCase();

  if (allowedMimeTypes.includes(file.mimetype) && allowedExtensions.includes(fileExtension)) {
    cb(null, true);
    return;
  }

  cb(new AppError('Only JPG, JPEG, PNG, and WEBP image files are allowed', 400));
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});
