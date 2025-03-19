import User from '../models/user';
import Role from '../models/role';
import UserOTPCode from '../models/userotpcode';
import { hashSync, compare } from 'bcryptjs'
import { randomInt } from 'crypto';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import { v2 as cloudinary } from 'cloudinary';
import { v4 as uuidv4 } from 'uuid';
import { OAuth2Client } from 'google-auth-library';
import axios from 'axios';
import { NextFunction, Request, Response } from 'express';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const googleClient = new OAuth2Client(process.env.GMAIL_AUTH_CLIENTID);

// Utility function for generating OTP
const generateOTP = () => randomInt(1000, 9999).toString();

// Utility function for sending OTP
const sendOTP = async (email: string, otp: string, phone: string) => {
  console.log("\n\n sending email: ", email)
  if (email) {
    const transporter = nodemailer.createTransport({
      service: process.env.FOOD_HOUSE_PROVIDER,
      host: process.env.FOOD_HOUSE_HOST,
      port: 587,
      secure: false,
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });

    const mailOptions = {
      from: `Food App <foodhousecmr@gmail.com>`,
      to: email,
      subject: 'Verify Your Email',
      html: `
        <h1>Food App</h1>
        <p>Hello ${email},</p>
        <p>Enter <b>${otp}</b> in the app to verify your email address and complete verification:</p>
        <p>This code <b>expires in 10 minutes</b>.</p>
        <p>If you did not request this, please ignore this email.</p>
        <p>Thanks,<br>Food App Team</p>
      `,
    };

    await transporter.sendMail(mailOptions);
  }

  if (phone) {
    const data = {
      user: 'husseinleong@gmail.com',
      password: 'nexah2024',
      senderid: 'food house',
      sms: `food house. Your OTP is ${otp}, valid for 10 minutes only.`,
      mobiles: phone,
    };

    const config = {
      method: 'post',
      url: 'https://smsvas.com/bulk/public/index.php/api/v1/sendsms',
      headers: {
        'Content-Type': 'application/json',
      },
      data: JSON.stringify(data),
    };

    await axios.request(config);
  }
};
// Verify Phone and Handle Registration
export const verifyPhone = async (req: Request, res: Response) => {
  const { phoneNum, password, country, email, userRole } = req.body;

  // Input validation
  if (!email || !password) {
    return res.status(400).json({ status: 'FAILED', message: 'Empty input fields' });
  }

  if (password.length < 8) {
    return res.status(400).json({ status: 'FAILED', message: 'Password must be at least 8 characters' });
  }

  if (!/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(email)) {
    return res.status(400).json({ status: 'FAILED', message: 'Invalid email entered' });
  }

  const validRoles = ['buyer', 'farmer'];
  if (!userRole || !validRoles.includes(userRole)) {
    return res.status(400).json({
      status: 'FAILED',
      message: `Invalid role: ${userRole}. Valid roles are: ${validRoles.join(', ')}`,
    });
  }

  try {
    // Check if user already exists
    const userExists = await User.findOne({ where: { email } });
    if (userExists) {
      return res.status(400).json({ message: 'This email is already registered.' });
    }

    // Find or create role
    let role = await Role.findOne({ where: { roleName: userRole } });
    if (!role) {
      role = await Role.create({ roleName: userRole as string });
    }

    // Hash password
    const hashedPassword = hashSync(password.trim(), 10);

    // Create user
    const user = await User.create({
      roleId: role.id,
      email,
      password: hashedPassword,
      country,
      phoneNum,
      firstName: '',
      lastName: '',
      imageUrl: '',
      address: '',
      googleId: '',
      verifiedUser: false,
      vip: false,
      facebookId: ''
    });

    // Generate and store OTP
    const otp = generateOTP();
    const hashedOtp = hashSync(otp, 10);

    if (!user) return res.status(500).json({ message: 'Failed to create user during registration!!' });

    // OTP object
    let otpObj;
    try {
      otpObj = await UserOTPCode.create({
        userId: user.id,
        otp: hashedOtp,
        expiredAt: Date.now() + 10 * 60 * 1000, // 10 minutes expiry
      });
    } catch (error) {
      console.error("Error creating OTP object in Database:", error);
      return res
        .status(500)
        .json({ message: "Failed to create OTP in the database" });
    }

    //send OTP message
    try {
      if (!otpObj)
        return res.status(500).json({ message: 'Failed to create OTP object in database' });
      // Send OTP via email and/or SMS
      await sendOTP(email, otp, phoneNum);
    } catch (error) {
      console.error('Error sending OTP:', error);
      return res.status(500).json({ message: 'Failed to send OTP' });
    }

    // Return success response
    return res.status(200).json({
      message: 'OTP sent successfully, please verify the OTP',
      email: user.email,
      phoneNum: user.phoneNum,
      userID: user.id,
    });
  } catch (e: any) {
    return res.status(500).json({ message: e.message });
  }
};

// Register User
export const register_user = async (req: any, res: Response, next: any) => {
  req.file = { // Mock file for testing (remove in production)
    path: "https://randomuser.me/api/portraits/men/1.jpg",
    originalname: 'profile.jpg',
    mimetype: 'image/jpeg',
    size: 12345
  };
  const { userId } = req.params;
  let { firstName, lastName, address, expoPushToken } = req.body;
  console.log("\n\n req.body", req.body)
  firstName = firstName.trim();
  lastName = lastName.trim();

  const shippAddress = [
    {
      id: uuidv4(),
      title: 'Home',
      address,
      default: true,
    },
  ];

  try {
    if (req.file) {
      const cloudinaryImageUpload = await cloudinary.uploader.upload(req.file.path);
      req.body.imageUrl = cloudinaryImageUpload.secure_url;
    }

    await User.update(
      {
        firstName,
        lastName,
        address,
        imageUrl: req.body.imageUrl,
        shipAddress: JSON.stringify(shippAddress),  // stringify the address array 
        expoPushToken,
        updatedAt: Date.now(),
      },
      { where: { id: userId } }
    );

    return res.status(200).json({ message: 'User successfully registered' });
  } catch (err) {
    next(err);
  }
};

// Verify OTP
export const verifyOtp = async (req: Request, res: Response) => {
  const { email, otp } = req.body;

  try {
    const currentUser = await User.findOne({ where: { email } });
    if (!currentUser) {
      return res.status(401).json({ message: 'The User does not exist. Please sign up!' });
    }

    const getOtp = await UserOTPCode.findOne({ where: { userId: currentUser.id } });
    if (!getOtp) {
      return res.status(404).json({ message: 'Server Error! Please Try Again Later by signing up.' });
    }

    const { expiredAt } = getOtp;
    if (expiredAt < Date.now()) {
      await UserOTPCode.destroy({ where: { userId: currentUser.id } });
      return res.status(404).json({ message: 'Code has expired. Please request again' });
    }

    const validOtp = await compare(otp, getOtp.otp);
    if (validOtp) {
      await UserOTPCode.destroy({ where: { userId: currentUser.id } });
      await User.update({ verifiedUser: true }, { where: { email } });

      currentUser.password = null;
      return res.status(200).json({ message: 'Successfully verified!', userId: currentUser.id });
    } else {
      return res.status(403).json({ message: 'Wrong OTP' });
    }
  } catch (err: any) {
    return res.status(500).json({ message: 'Internal Server Error!', error: err.message });
  }
};

// Login
export const logIn = async (req: Request, res: Response) => {
  // const { email, password } = req.query as any
  const { email, password } = req.body as any
  console.log("inside log in route: ", email, password)
  try {

    const user = await User.findOne({
      where: { email },
      include: [
        {
          model: Role,
          attributes: ['roleName'],
        },
      ],
    });

    if (!user) {
      return res.status(403).json({ message: 'No user exists for this email address' });
    }

    const verifyPassword = await compare(password, user.password as string);
    if (!verifyPassword) {
      return res.status(403).json({ message: 'Incorrect Password' });
    }

    const token = jwt.sign({
      UserId: user.id,
      email: user.email
    },
      process.env.JWT_SECRET as string,
      { expiresIn: '1h' }
    );
    const refreshToken = jwt.sign({
      UserId: user.id,
      email: user.email
    },
      process.env.JWT_SECRET_REFRESH as string,
      { expiresIn: '7d' }
    );
    user.password = null;

    res.status(200).json({ message: 'Authentication Successful', token, refreshToken, userData: user });
  } catch (err: any) {
    console.log(err)
    res.status(500).json({ error: 'error', message: err.message });
  }
};

// Refresh Token
export const refreshToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;


    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: 'You are either not logged in or your session has expired' });
    }

    // Extract the token
    const token = authHeader.split(" ")[1];

    // Verify and decode the token
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET_REFRESH as string) as jwt.JwtPayload;

    if (!decodedToken.exp) {
      return res.status(403).json({ auth: false, message: "Token does not have an expiration time" });
    }

    /** 
     * we do not need to check this since the refresh token has longer expiration time than the access token
     * making this check may be always not expired.
     *  */

    // Check if token is expired 
    // if (decodedToken.exp * 1000 < Date.now()) {
    //   return res.status(401).json({ auth: false, message: 'Your session has expired.' });
    // }

    // Generate a new access token
    const accessToken = jwt.sign(
      { UserId: decodedToken.UserId, email: decodedToken.email },
      process.env.JWT_SECRET as string,
      { expiresIn: '1h' }
    );

    return res.status(200).json({ message: 'Token refreshed successfully', token: accessToken });

  } catch (error) {
    console.error(`Failed to refresh token: ${error}`);
    // Handle invalid token error
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ message: 'Invalid token, please login again' });
    }

    next(error);
  }
};



// Auth Handler (Google and Facebook Auth)
export const authHandler = async (req: Request, res: Response, next: NextFunction) => {
  const { googleToken, facebookToken } = req.body;

  try {
    if (!googleToken && !facebookToken) {
      return res.status(400).json({ message: 'Missing authentication token' });
    }

    // Ensure the 'buyer' role exists
    let role = await Role.findOne({ where: { roleName: 'buyer' } });
    if (!role) {
      role = await Role.create({ roleName: 'buyer' });
    }

    let user;

    // Google Authentication
    if (googleToken) {
      const ticket = await googleClient.verifyIdToken({
        idToken: googleToken,
        audience: process.env.GMAIL_AUTH_CLIENTID,
      });

      const payload = ticket.getPayload();
      if (!payload) {
        return res.status(401).json({ message: 'Invalid Google token' });
      }

      const { sub: googleId, email, given_name: firstName, family_name: lastName, picture: imageUrl } = payload;

      user = await User.findOne({ where: { email } });

      if (user) {
        if (!user.googleId) {
          user.googleId = googleId;
          await user.save();
        } else if (user.googleId !== googleId) {
          return res.status(400).json({ message: 'Please use your exact email ID to sign in' });
        }
      } else {
        user = await User.create({
          googleId,
          email: <string>email,
          firstName: <string>firstName,
          lastName: <string>lastName,
          imageUrl: <string>imageUrl,
          roleId: role.id,
          shipAddress: [],
          address: '',
          phoneNum: Number(''),
          country: '',
          vip: false,
          verifiedUser: false,
          facebookId: '',
        });
      }
    }

    // Facebook Authentication
    else if (facebookToken) {
      const response = await axios.get(
        `https://graph.facebook.com/me?access_token=${facebookToken}&fields=id,name,email,picture`
      );

      const { id: facebookId, name, email } = response.data;

      if (!email) {
        return res.status(400).json({ message: 'Facebook account must have an email' });
      }

      let [firstName, lastName] = name.split(' ');
      lastName = lastName || ''; // Handle cases where last name is missing

      user = await User.findOne({ where: { email } });

      if (user) {
        if (!user.facebookId) {
          user.facebookId = facebookId;
          await user.save();
        } else if (user.facebookId !== facebookId) {
          return res.status(400).json({ message: 'Please use your exact email ID to sign in' });
        }
      } else {
        user = await User.create({
          facebookId,
          email,
          firstName,
          lastName,
          roleId: role.id,
          country: '',
          address: '',
          shipAddress: [],
          googleId: '',
          imageUrl: '',
          vip: false,
          verifiedUser: false,
          phoneNum: Number(''),
        });
      }
    }

    if (!user) {
      return res.status(500).json({ message: 'User creation failed. Please try again.' });
    }

    // Generate JWT Token
    const token = jwt.sign(
      { UserId: user.id, email: user.email, roleId: user.roleId },
      process.env.JWT_SECRET as string,
      { expiresIn: '1h' }
    );

    return res.status(200).json({
      message: 'User logged in successfully',
      token,
      user,
    });
  } catch (err) {
    next(err);
  }
};




// send new OTP
export const sendNewOTP = async (req: Request, res: Response, next: any) => {

  let { email } = req.body
  if (!email)
    return res.status(400).json({ message: 'Email is required' });

  try {
    const user: any = await User.findOne({ where: { email: email } })
    if (!user)
      return res.status(400).json({ message: "This email is not registered. Please enter the email with which you have registered your account!" })

    var code = generateOTP();

    // send OTP message
    try {
      await sendOTP(email, code, user?.phoneNum);
    } catch (error) {
      console.error("Error creating OTP object:", error);
      return res
        .status(500)
        .json({ message: "Failed to create OTP in the database" });
    }

    // saving otp to the database
    let hashedOtp = hashSync(code, 10);
    let otpObj;
    try {
      otpObj = await UserOTPCode.create({
        userId: user.id,
        otp: hashedOtp,
        expiredAt: Date.now() + 10 * 60 * 1000, // 10 minutes expiry
      });
      if (!otpObj)
        return res.status(500).json({ message: "Failed to create OTP in the database" })
    } catch (error) {
      console.error('Error creating OTP object:', error);
      return res.status(500).json({ message: 'Failed to create OTP in the database' });
    }

    // return result
    return res.status(200).json({ message: 'OTP sent succesfully, please verify the otp', userID: user.id, email: user.email })
  }
  catch (err: any) {
    console.error(` OTP error: ${err.message}`);
    next(err);
  }

}

