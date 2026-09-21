import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import multer from 'multer';
import { ApplicationError } from '../../../application/errors/ApplicationError.js';

/** لوغو المكتب من لوحة التحكم (قرار المستخدم 2026-09-21): صورة واحدة ≤ 2MB تحت uploads/offices. */
export const officeLogoDirectory = path.resolve(process.cwd(), 'uploads', 'offices');
mkdirSync(officeLogoDirectory, { recursive: true });

const extensions: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

export const uploadOfficeLogo = multer({
  storage: multer.diskStorage({
    destination: officeLogoDirectory,
    filename: (req, file, done) => done(null, `office-${req.params.id}-${randomUUID()}${extensions[file.mimetype] ?? ''}`),
  }),
  limits: { fileSize: 2 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, done) => {
    if (!extensions[file.mimetype])
      return done(new ApplicationError('INVALID_OFFICE_LOGO', 'Only JPG, PNG, or WEBP images are allowed', 422));
    done(null, true);
  },
}).single('logo');
