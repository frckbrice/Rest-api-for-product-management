import User from '../models/user';
import { hashSync, compare } from 'bcryptjs'
import { v2 as cloudinary } from 'cloudinary';
import { NextFunction, Request, Response } from 'express';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// get a user data
export const getAllUserData = async (req: any, res: Response) => {

  try {
    let users: any = await User.findAll({});
    if (!users?.length) {
      return res.status(400).json({ message: "No users found" });
    }
    // remove password field from output
    const userWithOutPasswaord = users.map((user: any) => {
      user.password = ''
      return user
    })

    res.status(200).json(userWithOutPasswaord);
  }
  catch (err: any) {
    res.status(500).json({ message: err.message })
  }

}


// get a user data
export const getUserData = async (req: Request, res: Response) => {
  // var id = req.userData.UserId;
  const id = req.params.userId;

  try {
    let user: any = await User.findOne({ where: { id: id } });
    if (!user) {
      return res.status(401).json({ message: "No such user found" });
    }
    // remove password field from output
    user.password = ''
    user = user.toJSON();

    res.status(200).json(user);
  }
  catch (err: any) {
    res.status(500).json({ message: err.message })
  }

}

// update a user data
// export const updateUser = async (req: any, res: Response, next: any) => {
//   req.file = { /** used for testing  uploadMiddleware('profileImage'),*/
//     path: "https://randomuser.me/api/portraits/men/1.jpg",
//     originalname: 'profile.jpg',
//     mimetype: 'image/jpeg',
//     size: 12345
//   };
//   try {
//     let userId = req.params.userId

//     // check if the user exists
//     let user = await User.findOne({ where: { id: userId } })
//     if (!user) {
//       return res.status(404).json({ message: "No such user found" });
//     }

//     // upload file to buket storage
//     if (req.file) {
//       let cloudinary_image_uplaod = await cloudinary.uploader.upload(req.file.path)
//       // saving the imagine url of the cloudinary to our db
//       req.body.imageUrl = cloudinary_image_uplaod.secure_url;
//     }

//     if (req.body.address) {
//       // updating ship address array as well
//       let updateShipAddress = JSON.parse(user?.shipAddress)
//       const index: number = updateShipAddress.findIndex((obj: any) => obj.id === req.body.addressID);
//       if (index !== -1) {
//         updateShipAddress[index]['address'] = req.body.address;
//       }
//       if (user) {
//         user.shipAddress = updateShipAddress
//       }

//       await user?.save()
//     }

//     let updatedUserData = req.body
//     updatedUserData.updatedAt = Date.now()
//     // check first whether the previous password match with entered previous password
//     updatedUserData.password && (updatedUserData.password = hashSync(updatedUserData.password, 10))
//     // password chanegs===> logged out the user and ask to logged in again

//     await User.update(updatedUserData, { where: { id: userId } })
//     const response = await User.findOne({ where: { id: userId } })
//     res.status(200).json({ message: 'Profile has been successfully updated', userData: response })

//   }
//   catch (err) {
//     // res.status(500).json({message: err.message})
//     next(err)

//   }

// }


// Update a user's data
export const updateUser = async (req: Request | any, res: Response, next: NextFunction) => {
  const userId = req.params.userId;
  // req.file = { // Mock file for testing (remove in production)
  //   path: "https://randomuser.me/api/portraits/men/1.jpg",
  //   originalname: 'profile.jpg',
  //   mimetype: 'image/jpeg',
  //   size: 12345
  // };

  try {
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (req.file) {
      const cloudinaryUpload = await cloudinary.uploader.upload(req.file.path);
      req.body.imageUrl = cloudinaryUpload.secure_url;
    }

    const updatedUserData: any = { ...req.body, updatedAt: new Date() };

    if (req.body.address && req.body.addressID) {
      let shipAddress = [];
      if (typeof user?.shipAddress === 'string') {
        updatedUserData.shipAddress = JSON.parse(user.shipAddress || '[]');
      } else {
        shipAddress = user?.shipAddress;
      }
      const addressIndex = Array.isArray(shipAddress) && shipAddress?.findIndex((addr: any) => addr.id === req.body.addressID);

      if (addressIndex !== -1) {
        shipAddress[addressIndex as number].address = req.body.address;
        updatedUserData.shipAddress = JSON.stringify(shipAddress);
      }
    }

    if (updatedUserData.password) {
      updatedUserData.password = hashSync(updatedUserData.password, 10);
    }

    await User.update(updatedUserData, { where: { id: userId } });

    const updatedUser = await User.findByPk(userId, { attributes: { exclude: ['password'] } });
    return res.status(200).json({
      message: 'Profile updated successfully',
      userData: updatedUser,
    });

  } catch (err) {
    console.error('Error updating user:', err);
    next(err);
  }
};

// delete a user
export const deleteUser = async (req: Request, res: Response) => {
  try {

    let userId = req.params.userId
    // parseInt(userId) != req.userData.UserId && res.status(404).json({message: "You are not authorized for this, please log in into using your id"}) 

    // check first if the user exists
    const existingUser = await User.findOne({ where: { id: userId } })
    if (!existingUser) {
      return res.status(404).json({ message: "No such user found" });
    }
    await User.destroy({ where: { id: userId } })
    res.status(200).send('user deleted')

  }
  catch (err: any) {
    res.status(500).json({ message: err.message })
  }
}



// update password
export const updatePassword = async (req: Request, res: Response, next: any) => {


  const { password, userId, oldPassword } = req.body



  if (password === "") {
    return res.status(400).json({
      status: "FAILED",
      massage: "Empty input fields",
    });
  }

  if (password.length < 8) {
    return res.status(400).json({
      status: "FAILED",
      massage: "Password must be at least 8 characters ",
    });
  }



  try {
    let userData = await User.findOne({ where: { id: userId } });
    if (oldPassword) {
      let verifyPassword = await compare(oldPassword, userData?.password as string)
      if (!verifyPassword) { return res.status(403).json({ message: 'Current Password is Incorrect. Please enter the correct current password' }) }

    }

    let hashedPassword = hashSync(password, 10)
    if (userData) {
      userData.password = hashedPassword
      userData.updatedAt = Date.now()
      await User.update(userData, { where: { id: userId } })
      res.status(200).json({ message: 'Password successfully updated' })
    }
    else {
      res.status(204).json({ message: 'No Content Found or user not exist' })

    }

  }

  catch (err) {
    next(err)
  }

}

export const updateShipAddress = async (req: Request, res: Response, next: any) => {
  const { userId } = req.params

  try {
    const response = await User.update({
      shipAddress: req.body
    }, { where: { id: userId } })

    let userData = await User.findOne({ where: { id: userId } })

    res.status(200).json({
      message: "successfull",
      updateResponse: response,
      data: userData
    })

  }
  catch (err) {
    next(err)
  }
}

export const addExpoPushNotificationToken = async (req: Request, res: Response, next: any) => {
  const { userId } = req.params
  const { expoPushToken } = req.body

  try {

    await User.update({ expoPushToken }, { where: { id: userId } });

    res.status(200).json({ message: 'Push token saved successfully' });

  } catch (error) {
    next(error)
  }
}
