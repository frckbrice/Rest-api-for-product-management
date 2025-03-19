import multer, { StorageEngine, MulterError, FileFilterCallback } from 'multer';
import path from 'path';
import { Request, Response, NextFunction } from 'express';
import AppError from '../errors/customErrors';

// Define the Multer storage
const storage: StorageEngine = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, './src/public/images');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  },
});

// Define the file filter
const fileFilter = (req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
  if (!file.mimetype.startsWith('image')) {
    cb(new AppError('Uploaded file is not supported. Please upload an image', 400) as any, false);
  } else {
    cb(null, true);
  }
};

// Factory function to create the upload middleware
const uploadMiddleware = (fieldName: string) => {
  const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
  }).single(fieldName); // Use the provided field name

  return (req: Request, res: Response, next: NextFunction) => {
    upload(req, res, (err) => {
      if (err instanceof MulterError) {
        // Handle Multer-specific errors
        return next(new AppError(err.message, 400));
      } else if (err) {
        // Handle other unknown errors
        return next(new AppError(err.message, 400));
      }
      // Everything went fine
      next();
    });
  };
};

export default uploadMiddleware;
