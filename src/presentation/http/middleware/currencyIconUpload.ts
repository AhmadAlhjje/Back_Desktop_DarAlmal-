import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import multer from 'multer';
import { ApplicationError } from '../../../application/errors/ApplicationError.js';

export const currencyIconDirectory = path.resolve(process.cwd(), 'uploads', 'currencies');
mkdirSync(currencyIconDirectory, { recursive: true });

const extensions: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

export const uploadCurrencyIcon = multer({
  storage: multer.diskStorage({
    destination: currencyIconDirectory,
    filename: (_req, file, done) => done(null, `${randomUUID()}${extensions[file.mimetype] ?? ''}`),
  }),
  limits: { fileSize: 2 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, done) => {
    if (!extensions[file.mimetype])
      return done(new ApplicationError('INVALID_CURRENCY_ICON', 'Only JPG, PNG, or WEBP images are allowed', 422));
    done(null, true);
  },
}).single('icon');
