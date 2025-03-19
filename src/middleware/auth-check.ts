import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";

interface AuthenticatedRequest extends Request {
  userData?: JwtPayload | string;
}

const authCheck = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {

  try {
    // Check if authorization header is present
    if (!req.headers.authorization) {
      res.status(404).json({ message: "You are either not logged in or your session has expired" });
      return;
    }

    // Extract the token from the authorization header
    const token = req.headers.authorization.split(" ")[1];

    // Verify the token
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET as string) as JwtPayload;

    // Check if the token is expired
    if (decodedToken.exp && decodedToken.exp < Date.now() / 1000) {
      res.status(401).json({ auth: false, message: "Your session has expired" });
      return;
    }

    // Attach decoded token data to the request object
    req.userData = decodedToken;

    // Verify the userId parameter matches the token's user ID, if applicable
    if (req.params.userId && req.params.userId !== decodedToken.UserId) {
      res.status(404).json({ message: "You are not authorized for this, please log in using your account" });
      return;
    }

    // Proceed to the next middleware or route handler
    next();
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

export default authCheck;
