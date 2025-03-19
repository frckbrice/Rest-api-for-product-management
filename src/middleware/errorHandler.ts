import { Request, Response, NextFunction } from "express";
import AppError from "../errors/customErrors";

const errorHandler = (err: AppError, req: Request, res: Response, next: NextFunction): void => {
  // If the error is not operational, convert it to an operational error
  if (!err.isOperational) {
    err = new AppError("An unexpected error occurred", 500);
  }

  res.status(err.statusCode).json({
    status: err.status,
    message: err.message,
  });
};

export default errorHandler;
